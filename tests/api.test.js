const request = require("supertest");
const { app, pool } = require("../index");

beforeAll(async () => {
  // Clear existing data
  await pool.query("DELETE FROM reviews");
  await pool.query("DELETE FROM orders");
  await pool.query("DELETE FROM books");
  await pool.query("DELETE FROM users");

  // Register user
  await request(app)
    .post("/signup")
    .send({ username: "testuser", password: "testpassword" });

  // Login and store token
  const res = await request(app)
    .post("/login")
    .send({ username: "testuser", password: "testpassword" });

  token = res.body.token; // Store token for authenticated requests

  // Add a book (after login)
const bookRes = await request(app)
    .post("/books")
    .set("Authorization", `Bearer ${token}`)
    .send({ title: "Test Book", author: "Test Author", price: 9.99 });

    bookId = bookRes.body.id;
});

describe("Bookstore API", () => {
  it("GET / should return welcome message", async () => {
    const res = await request(app).get("/");
    expect(res.statusCode).toEqual(200);
    expect(res.text).toContain("Welcome to the Bookstore API!");
  });

  it("POST /login should authenticate user and return token", async () => {
    const res = await request(app)
      .post("/login")
      .send({ username: "testuser", password: "testpassword" });
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty("token");
  });

  it("POST /signup should create a new user", async () => {
    await pool.query("DELETE FROM users WHERE username = $1", ["newuser"]); // Clean up before test

    const res = await request(app)
      .post("/signup")
      .send({ username: "newuser", password: "newpassword" });
    expect(res.statusCode).toEqual(201);
    expect(res.body.status).toEqual("success");
    expect(res.body.data).toHaveProperty("id");
  });

  it("GET /books should return all books", async () => {
    const res = await request(app).get("/books");
    expect(res.statusCode).toEqual(200);
    expect(res.body.status).toEqual("success");
    expect(res.body.data).toBeInstanceOf(Array);
  });

  it("GET /books/:id should return a book by ID", async () => {
    const res = await request(app).get(`/books/${bookId}`); // Replace 1 with a valid book ID
    expect(res.statusCode).toEqual(200);
    expect(res.body.status).toEqual("success");
    expect(res.body.data).toHaveProperty("id");
  });

  it("POST /orders should create an order for authenticated user", async () => {
    const res = await request(app)
      .post("/orders")
      .set("Authorization", `Bearer ${token}`)
      .send({ book_id: bookId, quantity: 2 });
    expect(res.statusCode).toEqual(201);
    expect(res.body.status).toEqual("success");
    expect(res.body.data).toHaveProperty("user_id");
  });

  it("GET /orders should return orders for authenticated user", async () => {
    const res = await request(app)
      .get("/orders")
      .set("Authorization", `Bearer ${token}`);
    expect(res.statusCode).toEqual(200);
    expect(res.body.status).toEqual("success");
    expect(res.body.data).toBeInstanceOf(Array);
  });

  it("POST /reviews should create a review for authenticated user", async () => {
    const res = await request(app)
      .post("/reviews")
      .set("Authorization", `Bearer ${token}`)
      .send({ book_id: bookId, rating: 5, comment: "Great book!" });
    expect(res.statusCode).toEqual(201);
    expect(res.body.status).toEqual("success");
    expect(res.body.data).toHaveProperty("user_id");
  });
});

afterAll(async () => {
  await pool.end(); // close db connection
});
