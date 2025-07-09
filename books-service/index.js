const express = require("express");// Express framework
const { Pool } = require("pg");// PostgreSQL client
require("dotenv").config();// Load environment variables from .env file
const redis = require('redis'); // Redis client
const rateLimit = require('express-rate-limit');// Rate limiting middleware

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


// Redis connection
const redisClient = redis.createClient({ url: process.env.REDIS_URL });
redisClient.connect().catch(console.error);

// GET all books with caching
app.get('/books', async (req, res) => {
  try {
    const cacheKey = 'books:all';
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      return res.json({ status: 'success', data: JSON.parse(cached) });
    }
    const result = await pool.query('SELECT * FROM books');
    await redisClient.setEx(cacheKey, 3600, JSON.stringify(result.rows));
    res.json({ status: 'success', data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Server error' });
  }
});

// GET book by ID with caching
app.get('/books/:id', async (req, res) => {
  try {
    const cacheKey = `book:${req.params.id}`;
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      return res.json({ status: 'success', data: JSON.parse(cached) });
    }
    const result = await pool.query('SELECT * FROM books WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Book not found' });
    }
    await redisClient.setEx(cacheKey, 3600, JSON.stringify(result.rows[0]));
    res.json({ status: 'success', data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Server error' });
  }
});

// POST, PUT, DELETE endpoints remain similar to the intermediate phase
app.post('/books', async (req, res) => {
  const { title, author, price } = req.body;
  if (!title || !author || !price) {
    return res.status(400).json({ status: 'error', message: 'Missing fields' });
  }
  try {
    const result = await pool.query(
      'INSERT INTO books (title, author, price) VALUES ($1, $2, $3) RETURNING *',
      [title, author, price]
    );
    res.status(201).json({ status: 'success', data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Server error' });
  }
});

const PORT = process.env.BOOKS_PORT || 3001;
app.listen(PORT, () => console.log(`Books service running on port ${PORT}`));
