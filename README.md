# Bookstore API

## Overview
The Bookstore API is a Node.js-based RESTful API for managing a bookstore's users, books, orders, and reviews. It uses Express.js for routing, PostgreSQL for data storage, and includes features like user authentication with JWT, password hashing with bcrypt, rate limiting, and logging with Winston. The API is tested using Jest and Supertest.

## Features
- **User Management**: Register and login users with secure password hashing.
- **Book Management**: CRUD operations for books (create, read, update, delete).
- **Order Management**: Create and retrieve orders for authenticated users.
- **Review System**: Add and retrieve reviews for books.
- **Security**: JWT-based authentication, rate limiting, and secure password storage.
- **Logging**: Comprehensive logging with Winston for debugging and monitoring.
- **Testing**: Automated tests with Jest and Supertest to ensure reliability.
- **Deployment**:Render.

## Prerequisites
- **Node.js**: Version 14.18.0 or higher.
- **PostgreSQL**: A running PostgreSQL database.
- **npm**: Package manager for installing dependencies.

## Installation
1. **Clone the Repository**:
   ```bash
   git clone <repository-url>
   cd bookstore-api
   ```
2. **Install Dependencies**:
   ```bash
   npm install
   ```
3. **Configure Environment Variables**:
   Create a `.env` file in the root directory with the following variables:
   ```env
   DB_USER=your_db_user
   DB_PASSWORD=your_db_password
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=your_db_name
   JWT_SECRET=your_jwt_secret
   NODE_ENV=development
   PORT=3000
   ```
4. **Set Up the Database**:
   Ensure your PostgreSQL database is running and has the following tables:
   ```sql
   CREATE TABLE users (
     id SERIAL PRIMARY KEY,
     username VARCHAR(255) UNIQUE NOT NULL,
     password VARCHAR(255) NOT NULL
   );
   CREATE TABLE books (
     id SERIAL PRIMARY KEY,
     title VARCHAR(255) NOT NULL,
     author VARCHAR(255) NOT NULL,
     price NUMERIC(10,2) NOT NULL
   );
   CREATE TABLE orders (
     id SERIAL PRIMARY KEY,
     user_id INTEGER REFERENCES users(id),
     book_id INTEGER REFERENCES books(id),
     quantity INTEGER NOT NULL
   );
   CREATE TABLE reviews (
     id SERIAL PRIMARY KEY,
     user_id INTEGER REFERENCES users(id),
     book_id INTEGER REFERENCES books(id),
     rating INTEGER NOT NULL,
     comment TEXT
   );
   ```

## Running the API
Start the server with:
```bash
npm start
```
The API will run on `http://localhost:3000` by default.

## API Endpoints

### Authentication
- `POST /signup` — Register a new user. `{ username, password }`
- `POST /login` — Login and receive a JWT. `{ username, password }`

### Books
- `GET /books` — List all books.
- `GET /books/:id` — Get a book by ID.
- `POST /books` — Create a new book. (Requires JWT)
- `PUT /books/:id` — Update a book. (Requires JWT)
- `DELETE /books/:id` — Delete a book. (Requires JWT)

### Orders
- `POST /orders` — Create an order. (Requires JWT)
- `GET /orders` — List orders for authenticated user. (Requires JWT)

### Reviews
- `POST /reviews` — Add a review for a book. (Requires JWT)
- `GET /reviews/:book_id` — List reviews for a book.

### Misc
- `GET /` — Welcome message.

## Security & Middleware
- **JWT Authentication**: Protects sensitive endpoints.
- **Rate Limiting**: Prevents abuse (100 requests per 15 minutes).
- **Password Hashing**: Uses bcryptjs for secure password storage.
- **Logging**: Uses Winston for request and error logging.

## Testing
Run tests with:
```bash
npm test
```
Tests are located in the `tests/` directory and use Jest and Supertest to cover authentication, books, orders, and reviews endpoints.

## Dependencies
- express
- pg
- jsonwebtoken
- bcryptjs
- dotenv
- winston
- express-rate-limit
- jest (dev)
- supertest (dev)

## License
ISC

   
   
