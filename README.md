# FixIt --- Home Service Platform

A full-stack home service booking platform that connects customers with
service technicians. Customers can discover technicians and request
services, technicians can manage assigned jobs, and administrators can
review and approve technician accounts.

## Features

### Customer

-   Register and sign in securely.
-   Browse available service technicians by service category and
    location.
-   View technician profiles and service charges.
-   Create service requests and track booking status.
-   Review completed services.

### Technician

-   Register and create a technician profile.
-   Manage profile and availability.
-   View incoming service requests and assigned jobs.
-   Accept jobs and update their progress.
-   Mark jobs as completed and view customer reviews.

### Administrator

-   Access a role-protected admin area.
-   Review pending technician registrations.
-   Approve or reject technician applications.

## Technology Stack

  Layer            Technologies
  ---------------- ---------------------------------------------------
  Frontend         React 19, Vite, React Router, Axios, Tailwind CSS
  Backend          Node.js, Express 5
  Database         MongoDB, Mongoose
  Authentication   JSON Web Tokens (JWT), bcryptjs
  Validation       Zod

## Project Structure

``` text
HomeServicePlatform/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── utils/
│   │   └── validators/
│   ├── package.json
│   └── server.js
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── api/
│   │   ├── components/
│   │   ├── context/
│   │   ├── hooks/
│   │   ├── layouts/
│   │   ├── pages/
│   │   ├── routes/
│   │   ├── services/
│   │   └── utils/
│   └── package.json
├── .gitignore
└── package.json
```

## Prerequisites

Install the following before running the project:

-   Node.js (LTS recommended)
-   npm
-   MongoDB database (local MongoDB or MongoDB Atlas)

## Getting Started

### 1. Clone the repository

``` bash
git clone https://github.com/DivyanshTech/HomeServicePlatform.git
cd HomeServicePlatform
```

### 2. Install dependencies

From the project root:

``` bash
npm run install:all
```

### 3. Configure environment variables

Create a file named `backend/.env`:

``` env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=replace_with_a_long_random_secret
CLIENT_URL=http://localhost:5173

ADMIN_NAME=FixIt Admin
ADMIN_PHONE=your_admin_phone
ADMIN_PASSWORD=use_a_strong_admin_password
ADMIN_CITY=Indore
ADMIN_LOCALITY=
```

Replace the example values with your own configuration. Do not commit
`.env` files or share database credentials, JWT secrets, or admin
passwords.

The frontend uses `http://localhost:5000/api` by default. If your
backend runs at a different URL, create `frontend/.env` and set:

``` env
VITE_API_URL=http://localhost:5000/api
```

### 4. Start the backend

Open a terminal at the project root:

``` bash
npm run dev:backend
```

The API starts on port `5000` by default. The health endpoint is:

``` text
http://localhost:5000/api/health
```

### 5. Start the frontend

Open a second terminal at the project root:

``` bash
npm run dev:frontend
```

Open the Vite URL shown in the terminal (normally
`http://localhost:5173`).

### 6. Create an administrator account

After configuring `backend/.env`, run this from the project root:

``` bash
npm run seed:admin
```

Use the configured admin phone number and password to sign in.

## Useful Commands

Run these from the project root:

  Command                     Purpose
  --------------------------- -------------------------------------------
  `npm run install:all`       Install backend and frontend dependencies
  `npm run dev:backend`       Start the backend in development mode
  `npm run dev:frontend`      Start the frontend development server
  `npm run seed:categories`   Seed service categories
  `npm run seed:admin`        Create or update the admin account

## API Overview

The backend exposes REST API routes under `/api`:

  Base route           Responsibility
  -------------------- -----------------------------------
  `/api/auth`          Registration and authentication
  `/api/users`         User account operations
  `/api/categories`    Service categories
  `/api/technicians`   Technician profiles and discovery
  `/api/bookings`      Service booking lifecycle
  `/api/admin`         Administrative operations
  `/api/health`        API health check

Protected endpoints require a valid JWT. Access to role-specific
operations is controlled by authentication and role middleware.

## Booking Lifecycle

A typical booking moves through these statuses:

``` text
pending → accepted → in_progress → completed
```

A booking may also be cancelled where the applicable business rules
permit it.

## Security Notes

-   Passwords are hashed using bcryptjs before storage.
-   JWTs are used to authenticate protected API requests.
-   Role-based middleware restricts customer, technician, and
    administrator operations.
-   Request data is validated on the backend.
-   Keep environment files and secrets out of source control.

## Current Scope

This repository contains the current FixIt application source code.
External integrations such as online payments, real-time messaging, and
email/SMS notifications are not described as implemented features.

## License

No open-source license has been specified for this project. All rights
remain with the project owner unless a license is added.
