const express = require("express"); // Express framework
const { Pool } = require("pg"); // PostgreSQL client
const jwt = require("jsonwebtoken"); // JSON Web Token library
require("dotenv").config(); // Load environment variables from .env file
const redis = require("redis");
const rateLimit = require("express-rate-limit"); // Rate limiting middleware
const amqp = require("amqplib"); // RabbitMQ client

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
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit to 100 requests per window
    message: {
      status: "error",
      message: "Too many requests, please try again later.",
    },
  })
);

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

// RabbitMQ connection setup
let channel, connection;
const RABBITMQ_URL = process.env.RABBITMQ_URL || "amqp://localhost";
const QUEUE = "order_created";

async function connectRabbitMQ(retries = 10, delay = 5000) {
  for (let i = 0; i < retries; i++) {
    try {
      connection = await amqp.connect(RABBITMQ_URL);
      channel = await connection.createChannel();
      await channel.assertQueue(QUEUE);
      console.log("Connected to RabbitMQ");
      return;
    } catch (err) {
      console.error(
        `Failed to connect to RabbitMQ (attempt ${i + 1}/${retries}):`,
        err.message
      );
      if (i < retries - 1) {
        await new Promise((res) => setTimeout(res, delay));
      } else {
        console.error("All attempts to connect to RabbitMQ failed. Exiting...");
        process.exit(1);
      }
    }
  }
}
connectRabbitMQ();

// Create an order
app.post("/orders", authenticateToken, async (req, res) => {
  const { book_id, quantity } = req.body;
  if (!book_id || !quantity)
    return res.status(400).json({ status: "error", message: "Missing fields" });
  try {
    const result = await pool.query(
      "INSERT INTO orders (user_id, book_id, quantity) VALUES ($1, $2, $3) RETURNING *",
      [req.user.id, book_id, quantity]
    );
    // Send message to RabbitMQ after order is created
    if (channel) {
      const orderMsg = JSON.stringify({
        order: result.rows[0],
        event: "order_created",
        timestamp: new Date().toISOString(),
      });
      channel.sendToQueue(QUEUE, Buffer.from(orderMsg));
    }
    res.status(201).json({ status: "success", data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ status: "error", message: "Server error" });
  }
});

// Get orders
app.get("/orders", authenticateToken, async (req, res) => {
  try {
    const cacheKey = `orders:user:${req.user.id}`;
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      return res.json({ status: "success", data: JSON.parse(cached) });
    }
    const result = await pool.query("SELECT * FROM orders WHERE user_id = $1", [
      req.user.id,
    ]);
    await redisClient.setEx(cacheKey, 3600, JSON.stringify(result.rows));
    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ status: "error", message: "No orders found for this user" });
    }
    res.json({ status: "success", data: result.rows });
  } catch (err) {
    res.status(500).json({ status: "error", message: "Server error" });
  }
});

const PORT = process.env.BOOKS_PORT || 3002;
app.listen(PORT, () => console.log(`Orders service running on port ${PORT}`));
