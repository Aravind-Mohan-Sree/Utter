# Utter Frontend

This is the client-side user interface application for **Utter.In**, built with **Next.js** (App Router), **React**, **Redux Toolkit**, and **TailwindCSS v4**. The application interfaces with the **Utter Backend API** to provide students, tutors, and administrators with a responsive, modern language-learning platform.

---

## 🏗️ Project Architecture

The client application structure inside `src/` is organized as follows:

* **`src/app/`**: Next.js Pages and Layout Router configuration.
  - **`(auth)/`**: Pages handling credentials entry, forgot passwords, and email verification.
  - **`(main)/`**: Protected route categories including `(admin)/`, `(tutor)/`, `(user)/`, and `(shared)/` dashboards and settings.
* **`src/components/`**: Modular, reusable UI components (e.g., buttons, modals, input elements, profile widgets).
* **`src/features/`**: Redux state slices separating local state logic for authentication, user profiles, tutors, and quizzes.
* **`src/store/`**: Configuration for Redux Toolkit store combined with Redux Persist for local storage persistence.
* **`src/services/`**: API request hooks/functions (using Axios) and PeerJS/Socket configuration.
* **`src/styles/`**: Global stylesheets configuring Tailwind CSS v4 directives.
* **`src/validations/`**: Client-side validation schemas using Zod.

---

## 🚀 Key Client Features

* **Role-Based Portals**: Custom interface paths tailored specifically for Admin controls, Tutor schedules, and Student workflows.
* **Live Calling & Video Sessions**: P2P web calling integration leveraging **PeerJS** alongside Socket-based handshakes for active classrooms.
* **Interactive Quizzes**: Beautiful, responsive assessment screens featuring countdown timers, grading animations, scoring matrices, and local leaderboard tables.
* **Tutor Booking & Calendars**: Custom tutor listings with filters, time-slot selection boards, and session booking checkouts.
* **Secure File Uploads with Cropping**: Integrated **React Easy Crop** interface for uploading polished profile banners and verified tutor certifications.
* **Rich Messaging Interface**: Messaging panels supporting emoji pickers, chat filters, message actions (edit/delete), and online indicators.
* **Responsive UI/UX**: Hand-crafted layouts styled using Tailwind CSS v4, complete with toast alerts (via **Sonner**) and responsive modals.

---

## 🛠️ Prerequisites

Ensure you have the following installed locally:
- [Node.js](https://nodejs.org/) (v18 or higher)
- [npm](https://www.npmjs.com/) (or pnpm / yarn / bun)

---

## ⚙️ Environment Variables Setup

Create a `.env` file in the root of the `frontend` directory. Add the following variables (adjust them to match your backend endpoints):

```env
# Backend API Base URL
NEXT_PUBLIC_BASE_URL=http://localhost:5000/api

# Google OAuth Redirect Entrypoints
NEXT_PUBLIC_GOOGLE_USER_URL=http://localhost:5000/api/user/auth/google
NEXT_PUBLIC_GOOGLE_TUTOR_URL=http://localhost:5000/api/tutor/auth/google

# S3 File Storage CDN
NEXT_PUBLIC_S3_OBJECT_URL=https://utter-web-app.s3.ap-south-2.amazonaws.com

# Razorpay Checkout Public Key
NEXT_PUBLIC_RAZORPAY_KEY_ID=your_razorpay_public_key_id
```

---

## 🏁 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Start the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser to view the application.

### 3. Build & Export for Production
Create an optimized production build:
```bash
npm run build
```

Start the production server:
```bash
npm run start
```

### 4. Code Quality & Linting
Run ESLint to check for stylistic errors:
```bash
npm run lint
```
Automatically fix linting issues:
```bash
npm run lint:fix
```
