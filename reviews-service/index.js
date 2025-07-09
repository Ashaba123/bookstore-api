const express = require("express");// Express framework
const { Pool } = require("pg");// PostgreSQL client
const jwt = require("jsonwebtoken");// JSON Web Token library
require("dotenv").config();// Load environment variables from .env file
const rateLimit = require('express-rate-limit');// Rate limiting middleware
const redis = require('redis'); 

const app = express(); 
app.use(express.json()); // middleware to parse JSON bodies

// Database connection
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

//Rate limiting middleware to prevent abuse
app.use(rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit to 100 requests per window
  message: { status: 'error', message: 'Too many requests, please try again later.' }
}));

// Middleware to verify JWT
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Get token from Authorization header
  if (!token) return res.status(401).json({ error: "Access denied" });

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: "Invalid token" });
    req.user = user;
    next(); // Pass the user info to the next middleware
  });
};

// Redis connection
const redisClient = redis.createClient({ url: process.env.REDIS_URL });
redisClient.connect().catch(console.error);



// Create a review
app.post('/reviews', authenticateToken, async (req, res) => {
  const { book_id, rating, comment } = req.body;
  if (!book_id || !rating) return res.status(400).json({ status: 'error', message: 'Missing fields' });
  try {
    const result = await pool.query(
      'INSERT INTO reviews (user_id, book_id, rating, comment) VALUES ($1, $2, $3, $4) RETURNING *',
      [req.user.id, book_id, rating, comment || '']
    );
    res.status(201).json({ status: 'success', data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Server error' });
  }
});

// Get reviews for a book
app.get('/reviews/:book_id', async (req, res) => {
  try {
    const cacheKey = `reviews:book:${req.params.book_id}`;
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      return res.json({ status: 'success', data: JSON.parse(cached) });
    }
    const result = await pool.query('SELECT * FROM reviews WHERE book_id = $1', [req.params.book_id]);
    await redisClient.setEx(cacheKey, 3600, JSON.stringify(result.rows));
    if (result.rows.length === 0) { 
      return res.status(404).json({ status: 'error', message: 'No reviews found for this book' });
    }
    res.json({ status: 'success', data: result.rows });
  } catch (err) {
    
    res.status(500).json({ status: 'error', message: 'Server error' });
  }
});

const PORT = process.env.BOOKS_PORT || 3003;
app.listen(PORT, () => console.log(`Reviews service running on port ${PORT}`));
