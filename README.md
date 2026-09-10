Expense Tracker

A full-stack web application designed to help you manage and track daily expenses for personal and professional projects. Keep track of where your money is going and make informed financial decisions.

Features

Track daily expenses and organize them by category
Create and manage project-specific budgets
View detailed expense reports and analytics
Secure user authentication with JWT tokens
Responsive web interface for desktop and mobile devices
PostgreSQL database for reliable data storage

Tech Stack

Frontend: React with TypeScript, Vite, Tailwind CSS
Backend: Spring Boot with Java 21, Spring Security, Spring Data JPA
Database: PostgreSQL
Authentication: JWT (JSON Web Tokens)

Prerequisites

Before you get started, make sure you have installed:

Node.js (version 18 or higher)
Java JDK 21 or higher
PostgreSQL (version 12 or higher)
Maven (for building the backend)

Project Structure

The project is organized into two main directories:

expense-tracker/       Frontend React application
Backend/              Spring Boot backend API

Getting Started

1. Clone the Repository

git clone https://github.com/saiganesh5/Expense-tracker.git
cd Expense-tracker

2. Set Up the Backend

Navigate to the backend directory:

cd Backend/expensetracker

Create a .env file in the Backend/expensetracker directory with the following configuration:

SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/expensetracker
SPRING_DATASOURCE_USERNAME=postgres
SPRING_DATASOURCE_PASSWORD=your_postgres_password
APP_JWT_SECRET=your_base64_encoded_256_bit_jwt_secret
APP_JWT_EXPIRATION_MS=86400000
PORT=8080
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000

Replace your_postgres_password with your PostgreSQL password and generate a proper JWT secret.

Build and run the backend:

mvn clean install
mvn spring-boot:run

The backend will start on http://localhost:8080

3. Set Up the Frontend

In a new terminal, navigate to the frontend directory:

cd expense-tracker

Install dependencies:

npm install

Create a .env file in the expense-tracker directory:

VITE_API_URL=http://localhost:8080

Start the development server:

npm run dev

The frontend will be available at http://localhost:5173

4. Database Setup

Before running the application, ensure PostgreSQL is running and create the database:

Open PostgreSQL terminal and run:

CREATE DATABASE expensetracker;

The Spring Boot application will automatically create the necessary tables on first run.

Running the Application

Once both the frontend and backend are running:

Open your browser and navigate to http://localhost:5173
Log in or create a new account
Start tracking your expenses

Available Commands

Frontend:

npm run dev         Start development server
npm run build       Build for production
npm run lint        Run code linter
npm run preview     Preview production build

Backend:

mvn clean install   Install dependencies and build
mvn spring-boot:run Run the application
mvn test           Run unit tests

Deployment

For production deployment:

Set environment variables for your hosting platform
Build the frontend: npm run build
Build the backend: mvn clean install
Deploy the frontend to a static hosting service
Deploy the backend to a Java-compatible platform

Troubleshooting

Port 8080 already in use: Change the PORT environment variable in .env
Database connection error: Verify PostgreSQL is running and credentials are correct
CORS errors: Check CORS_ALLOWED_ORIGINS in backend configuration matches your frontend URL
Node modules issues: Delete node_modules folder and run npm install again

License

This project is open source and available on GitHub.

Contributing

Contributions are welcome. Please feel free to submit pull requests or open issues for bugs and feature requests.

Questions or Issues

If you encounter any issues or have questions, please open an issue on the GitHub repository.
