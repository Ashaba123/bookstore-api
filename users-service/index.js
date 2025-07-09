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
