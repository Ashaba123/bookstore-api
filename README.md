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

## Prerequisites
- **Node.js**: Version 14.18.0 or higher.
- **PostgreSQL**: A running PostgreSQL database.
- **npm**: Package manager for installing dependencies.

## Installation
1. **Clone the Repository**:
   ```bash
   git clone <repository-url>
   cd bookstore-api   
   
   
