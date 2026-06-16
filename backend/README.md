# Utter Backend

This is the server-side API application for **Utter.In**, a modern language learning and tutoring platform. Built with **Node.js**, **TypeScript**, and **Express.js**, the server follows **Clean/Onion Architecture** principles to ensure modularity, clear separation of concerns, and ease of maintainability.

---

## 🏗️ Architectural Structure

The codebase is organized into four main layers:

1. **Presentation Layer (`src/presentation/`)**
   - **Controllers**: Handle incoming HTTP requests, validate requests using DTOs, delegate execution to use cases, and return responses.
   - **Routes**: Define endpoints and apply route-specific middlewares (e.g., authentication, role verification).

2. **Application Layer (`src/application/`)**
   - **Use Cases**: Contain application-specific business logic (e.g., booking sessions, generating quizzes, checking answers).
   - **DTOs (`dtos/`)**: Data Transfer Objects defining the structure of request input payloads.
   - **Mappers (`mappers/`)**: Reformat entity objects into secure, clean response payloads.
   - **Interfaces**: Define contracts for use cases, repositories, and services to enable dependency inversion.

3. **Domain Layer (`src/domain/`)**
   - **Entities**: core enterprise business models (e.g., `User`, `Tutor`, `Booking`, `Quiz`, `Wallet`) free from database or framework dependencies.

4. **Infrastructure Layer (`src/infrastructure/`)**
   - **Databases**: MongoDB connection setup and Mongoose schemas/models.
   - **Repositories**: Mongoose-based database query implementations.
   - **Strategies**: Passport.js authentication strategies (e.g., Google OAuth 2.0).
   - **Services**: Implementations of external services (e.g., Socket.io for messaging, Razorpay for payments, AWS S3 for uploads, Gemini AI API for quizzes).

---

## 🚀 Key Features

* **Multi-Role Authentication**: JWT-based credentials login, refresh token rotation, OTP verification for email verification/password resets, and Google OAuth 2.0 login.
* **Onboarding & Verification**: Complete profile setups for both students and tutors, with admin-facing audit workflows to approve certifications and languages.
* **Session Scheduling & Bookings**: Integrated calendars to schedule classes. Includes real-time booking validation.
* **Integrated Payments & Digital Wallet**: Native payment workflow via **Razorpay** checkout and a localized **Wallet** ledger for refund handling and quick bookings.
* **Real-Time Direct Messaging**: **Socket.io** integration for instant messaging with status updates, search functionality, message edit/delete features, and typing indicators.
* **Gamified Language Quizzes**: Custom quiz generation with correct-answer validation, difficulty modes, history logs, and a peer leaderboard.
* **Robust Logging**: Winston-powered log rotation to write request and system logs locally.

---

## 🛠️ Prerequisites

Make sure you have the following installed:
- [Node.js](https://nodejs.org/) (v18 or higher)
- [MongoDB](https://www.mongodb.com/) (Local or Atlas database URI)
- [Redis](https://redis.io/) (Used for rate-limiting, session synchronization, and locking)

---

## ⚙️ Environment Variables Setup

Create a `.env` file in the root of the `backend` directory. Fill in the values based on this template:

```env
NODE_ENV=development
PORT=5000

# Databases
MONGO_CONNECTION_URI=your_mongodb_connection_uri
REDIS_URL=redis_url

# Mail (Nodemailer)
NODEMAILER_USER=your_email@gmail.com
NODEMAILER_PASS=your_app_password
NODEMAILER_HOST=smtp.gmail.com
NODEMAILER_PORT=587

# Security & JWT Tokens
JWT_ALGORITHM=HS256
ACCESS_TOKEN_SECRET=your_jwt_access_secret
REFRESH_TOKEN_SECRET=your_jwt_refresh_secret
RESET_TOKEN_SECRET=your_jwt_reset_secret
ACCESS_TOKEN_AGE=900000        # 15 minutes
REFRESH_TOKEN_AGE=604800000    # 7 days
RESET_TOKEN_AGE=120000         # 2 minutes
OTP_AGE=60000                  # 1 minute

# Google OAuth
GOOGLE_CLIENT_ID=google_client_id
GOOGLE_CLIENT_SECRET=google_client_secret
GOOGLE_USER_CALLBACK_URL=http://localhost:5000/api/user/auth/google/callback
GOOGLE_TUTOR_CALLBACK_URL=http://localhost:5000/api/tutor/auth/google/callback

# Client Configurations
FRONTEND_URL=http://localhost:3000
COOKIE_DOMAIN=

# AWS S3 Storage
AWS_REGION=ap-south-1
AWS_BUCKET=your_s3_bucket_name
AWS_ACCESS_KEY_ID=your_aws_key_id
AWS_SECRET_ACCESS_KEY=your_aws_secret_key

# Payment Gateway (Razorpay)
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_secret

# AI Quiz Generation
GEMINI_API_KEY=your_gemini_api_key

# Threshold limits
CALL_JOIN_THRESHOLD_MINUTES=0
SESSION_COMPLETION_THRESHOLD_MINUTES=1
```

---

## 🏁 How to Run

### 1. Install Dependencies
```bash
npm install
```

### 2. Run in Development Mode
Starts the server with hot-reloading (`ts-node-dev`) and files linter:
```bash
npm run dev
```

### 3. Build & Run in Production
Compile the TypeScript code to JavaScript inside the `dist` directory, then start the server:
```bash
npm run build
npm start
```

### 4. Code Quality & Formatting
Run ESLint to check for code violations:
```bash
npm run lint
```
Automatically fix lint errors:
```bash
npm run lint:fix
```
Verify type-checking:
```bash
npm run check
```
