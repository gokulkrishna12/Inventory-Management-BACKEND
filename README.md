# Enterprise Inventory & POS System - Backend API

A production-ready, highly secure RESTful API built with Node.js, Express, and MongoDB. This system powers a Point of Sale (POS) and inventory management platform, featuring role-based access control (RBAC), automated audit logging, and comprehensive API documentation.

## 🚀 Core Features
*   **True MVC Architecture:** Strict separation of Models, Controllers, and Routes with a centralized global error-handling middleware.
*   **Advanced Security:** Configured with `helmet` for HTTP header protection, `express-rate-limit` to prevent brute-force attacks, and `bcrypt` for secure password hashing.
*   **Role-Based Access Control (RBAC):** JWT-based authentication explicitly separating `admin` and `staff` permissions across routes.
*   **Automated Audit Trail:** A dedicated `StockTransaction` model tracks all inventory movements (IN/OUT, timestamp, exact user).
*   **Advanced MongoDB Querying:** Server-side pagination, search filtering, sorting, and relational `.populate()` linking between Products, Categories, and Suppliers.
*   **Automated Testing:** Full unit testing suite built with Jest and Supertest running on an in-memory database.
*   **Interactive Documentation:** Auto-generated API documentation using Swagger UI.

## 🛠️ Tech Stack
*   **Runtime:** Node.js
*   **Framework:** Express.js
*   **Database:** MongoDB Atlas & Mongoose
*   **Security:** JSON Web Tokens (JWT), Bcrypt, Helmet, Express Rate Limit
*   **Testing:** Jest, Supertest, MongoDB Memory Server
*   **Documentation:** Swagger UI (YAML)

## 📦 Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone [https://github.com/gokulkrishna12/Inventory-Management-BACKEND.git](https://github.com/gokulkrishna12/Inventory-Management-BACKEND.git)
   cd Inventory-Management-BACKEND
Install dependencies:

Bash
npm install
Environment Variables:
Create a .env file in the root directory:

Code snippet
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_super_secret_key
NODE_ENV=development
Seed the Database (Optional):
Wipe the database and load default Admin/Staff users and dummy products.

Bash
node seeder.js
Start the Server:

Bash
# Development mode (nodemon)
npm run dev

# Production mode
npm start
🧪 Testing
Run the automated test suite. The tests spin up an isolated mongodb-memory-server to ensure your live database remains unaffected.

Bash
npm test
📚 API Documentation
Once the server is running, view the interactive Swagger documentation at:
http://localhost:5000/api-docs

Developed by Gokul Krishna