# Bookstore API

## Overview

Bookstore API is a microservices-based Node.js project for managing users, books, orders, and reviews in a bookstore. Each service is independent, with its own code, dependencies, and Dockerfile. The project uses Docker Compose to run all services together, including PostgreSQL, Redis, and RabbitMQ.

## Features

- **User Management**: Register and login users with secure password hashing.
- **Book Management**: CRUD operations for books (create, read, update, delete) with Redis caching.
- **Order Management**: Create and retrieve orders for authenticated users. Integrates with RabbitMQ for messaging and includes retry logic for RabbitMQ startup.
- **Review System**: Add and retrieve reviews for books.
- **Security**: JWT-based authentication, rate limiting, and secure password storage.
- **Logging**: Winston logging for debugging and monitoring (users-service).
- **Testing**: Jest and Supertest for automated tests (users-service).

## Prerequisites

- **Docker** and **Docker Compose** (recommended way to run the project)
- (For development only) Node.js 14.18.0+ and npm if you want to run a service outside Docker

## Project Structure

``
bookstore-api/
  books-service/
  orders-service/
  reviews-service/
  users-service/
  docker-compose.yml
  README.md

``

- Each `*-service` folder is a standalone Node.js microservice with its own `package.json` and `Dockerfile`.
- `docker-compose.yml` orchestrates all services and dependencies.

## Installation & Setup

1. **Clone the Repository**

   ```bash
   git clone <repository-url>
   cd bookstore-api
   ```

2. **Create a .env file in the root directory**

   ```env
   DB_USER=your_db_user
   DB_PASSWORD=your_db_password
   DB_NAME=your_db_name
   JWT_SECRET=your_jwt_secret

   ```

   - These variables are used by Docker Compose to configure all services.

3. **Run All Services with Docker Compose**

   ```bash
   docker-compose up --build

   ```

   - This will build and start all microservices, plus PostgreSQL, Redis, and RabbitMQ.
   - The Orders Service will retry connecting to RabbitMQ until it is ready.

4. **Access the APIs**
   - Users Service:      [http://localhost:3000](http://localhost:3000)
   - Books Service:      [http://localhost:3001](http://localhost:3001)
   - Orders Service:     [http://localhost:3002](http://localhost:3002)
   - Reviews Service:    [http://localhost:300]
   - RabbitMQ UI:        [http://localhost:15672] (user: guest, pass: guest)

## API Endpoints (per service)

### users-service

- `POST /signup` — Register a new user
- `POST /login` — Login and receive a JWT
- `GET /` — Welcome message

### books-service

- `GET /books` — List all books
- `GET /books/:id` — Get a book by ID
- `POST /books` — Create a new book
- (Add PUT/DELETE for full CRUD as needed)

### orders-service

- `POST /orders` — Create an order (Requires JWT)
- `GET /orders` — List orders for authenticated user (Requires JWT)

### reviews-service

- `POST /reviews` — Add a review for a book (Requires JWT)
- `GET /reviews/:book_id` — List reviews for a book

## Security & Middleware

- **JWT Authentication**: Protects sensitive endpoints
- **Rate Limiting**: Prevents abuse (100 requests per 15 minutes)
- **Password Hashing**: Uses bcryptjs for secure password storage
- **Logging**: Winston for request and error logging (users-service)

## Testing

- The `users-service` includes automated tests using Jest and Supertest:

  ```bash
  cd users-service
  npm test
  ```

- Other services can be similarly configured for testing by adding Jest and Supertest to their dependencies.

## Dependencies

Each service manages its own dependencies in its own `package.json` file. Key dependencies include:

- express, pg, jsonwebtoken, bcryptjs, dotenv, winston, express-rate-limit, amqplib (orders-service), redis
- Jest and Supertest (for testing, users-service)

## License

ISC
