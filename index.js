const express = require("express");// Express framework
const { Pool } = require("pg");// PostgreSQL client
const jwt = require("jsonwebtoken");// JSON Web Token library
const bcrypt = require("bcryptjs");// Password hashing library
require("dotenv").config();// Load environment variables from .env file
const winston = require('winston'); // Logging library
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

// Logger setup
const transports = [
  new winston.transports.Console()
];

if (process.env.NODE_ENV !== 'test') {
  transports.push(new winston.transports.File({ filename: 'combined.log' }));
}

const logger = winston.createLogger({
  level: 'info', 
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: transports,
});

// User signup
app.post("/signup", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: "Missing fields" });

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      "INSERT INTO users (username, password) VALUES ($1, $2) RETURNING id, username",
      [username, hashedPassword]
    );
    res.status(201).json({
      status: 'success',
      data: result.rows[0]
    });
  } catch (err) {
    logger.error(`Error during signup: ${err.message}`);
    res.status(400).json({ error: "Username exists or invalid data" });
  }
});

// User login
app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  try {
    const result = await pool.query("SELECT * FROM users WHERE username = $1", [
      username,
    ]);
    const user = result.rows[0];
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const token = jwt.sign(
      { id: user.id, username: user.username },
      process.env.JWT_SECRET,
      {
        expiresIn: "96h",
      }
    );
    res.json({ token });
  } catch (err) {
    logger.error( `Error during login: ${err.message}`);
    res.status(500).json({ error: "Server error" });
  }
});

// CRUD for books
app.get("/books", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM books");
    res.json({ status: "success", data: result.rows });
  } catch (err) {
   logger.error(`Error fetching books: ${err.message}`);
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/books/:id", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM books WHERE id = $1", [
      req.params.id,
    ]);
    if (result.rows.length === 0)
      return res.status(404).json({ error: "Book not found" });
    res.json({ status: "success", data: result.rows[0] });
  } catch (err) {
    logger.error(`Error fetching book: ${err.message}`);
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/books", authenticateToken, async (req, res) => {
  const { title, author, price } = req.body;
  if (!title || !author || !price)
    return res.status(400).json({ error: "Missing fields" });

  try {
    const result = await pool.query(
      "INSERT INTO books (title, author, price) VALUES ($1, $2, $3) RETURNING *",
      [title, author, price]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
   logger.error(`Error creating book: ${err.message}`);
    res.status(500).json({ error: "Server error" });
  }
});

app.put("/books/:id", authenticateToken, async (req, res) => {
  const { title, author, price } = req.body;
  try {
    const result = await pool.query(
      "UPDATE books SET title = $1, author = $2, price = $3 WHERE id = $4 RETURNING *",
      [title, author, price, req.params.id]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ error: "Book not found" });
    res.json(result.rows[0]);
  } catch (err) {
    logger.error(`Error updating book: ${err.message}`);
    res.status(500).json({ error: "Server error" });
  }
});

app.delete("/books/:id", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      "DELETE FROM books WHERE id = $1 RETURNING *",
      [req.params.id]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ error: "Book not found" });
    res.json({ message: "Book deleted" });
  } catch (err) {
    logger.error(`Error deleting book: ${err.message}`);
    res.status(500).json({ error: "Server error" });
  }
});

// Create an order
app.post('/orders', authenticateToken, async (req, res) => {
  const { book_id, quantity } = req.body;
  if (!book_id || !quantity) return res.status(400).json({ status: 'error', message: 'Missing fields' });
  try {
    const result = await pool.query(
      'INSERT INTO orders (user_id, book_id, quantity) VALUES ($1, $2, $3) RETURNING *',
      [req.user.id, book_id, quantity]
    );
    res.status(201).json({ status: 'success', data: result.rows[0] });
  } catch (err) {
    logger.error(`Error creating order: ${err.message}`);
    res.status(500).json({ status: 'error', message: 'Server error' });
  }
});

// Get user orders
app.get('/orders', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM orders WHERE user_id = $1', [req.user.id]);
    res.json({ status: 'success', data: result.rows });
  } catch (err) {
    logger.error(`Error fetching orders: ${err.message}`);
    res.status(500).json({ status: 'error', message: 'Server error' });
  }
});

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
    logger.error(`Error creating review: ${err.message}`);
    res.status(500).json({ status: 'error', message: 'Server error' });
  }
});

// Get reviews for a book
app.get('/reviews/:book_id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM reviews WHERE book_id = $1', [req.params.book_id]);
    res.json({ status: 'success', data: result.rows });
  } catch (err) {
    logger.error(`Error fetching reviews: ${err.message}`);
    res.status(500).json({ status: 'error', message: 'Server error' });
  }
});


const PORT = process.env.PORT || 3000;

// Start the server
if(require.main === module) {
 app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

module.exports = {app, pool}; // Export the app for testing
// This allows the app to be imported in tests without starting the server
// Now Jest/Supertest can use require('./index') without starting the server twice.

//home route
app.get("/", (req, res) => {
  res.send("Welcome to the Bookstore API!");
});

app.get("/favicon.ico", (req, res) => res.status(204));

// Error handling  for unhandled routes and unexpected errors
app.use((err, req, res, next) => {
  logger.error(err.stack);
  res.status(500).json({ status: 'error', message: 'Something went wrong!' });
});

// Logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url}`); // Log the request method and URL
  next();
});
