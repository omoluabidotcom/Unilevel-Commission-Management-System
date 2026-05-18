# Unilevel Commission Management System

Live Application: https://unilevel-commission-management-system.onrender.com/

A production-style unilevel commission platform built with Node.js, Express, MySQL, and static admin/distributor dashboards.
It supports authentication, profile management, purchases, downline visibility, commission generation, and settings management.

## What This Project Does

This system provides:

- Admin workflows:
  - Manage users and distributors
  - Record purchases
  - View all commissions
  - Generate monthly commissions for a specific period
  - Manage system settings
  - View and manage notifications
- Distributor workflows:
  - Login and view dashboard data
  - View own commissions
  - View direct downline users and purchases
  - Update profile, password, photo, bank details, and next-of-kin details
  - View notifications

## Live URL

- App: https://unilevel-commission-management-system.onrender.com/
- Health check: https://unilevel-commission-management-system.onrender.com/health

## Tech Stack

- Backend: Node.js + Express
- Database: MySQL
- Auth: JWT Bearer tokens
- Password hashing: bcrypt and bcryptjs
- Frontend: HTML, CSS, vanilla JavaScript
- Runtime config: dotenv

## Project Structure

- `server.js`: Express entry point, middleware, static files, API route mounting, health route
- `src/db/connection.js`: MySQL data access layer and commission generation database operations
- `src/middleware/auth.js`: JWT authentication and role-based authorization
- `src/routes/auth.js`: login and registration
- `src/routes/users.js`: user CRUD, current user profile, downlines
- `src/routes/commissions.js`: commission listing and monthly generation
- `src/routes/purchases.js`: purchase listing and creation
- `src/routes/settings.js`: public/admin settings APIs
- `src/routes/notifications.js`: notifications APIs
- `src/routes/profile.js`: profile, password, photo, bank, next-of-kin APIs
- `db/schema.sql`: baseline SQL schema and seed users
- `scripts/backfill-commissions.js`: historical commission generation utility
- `test/commission-generation.test.js`: service logic tests
- `test/commissions-route.test.js`: route behavior tests

## Prerequisites

- Node.js 18+ recommended
- MySQL 8+ recommended
- npm

## Environment Variables

Required for DB-backed runtime:

- `PORT` (optional, default is platform-provided or 3000 locally)
- `JWT_SECRET`
- `JWT_EXPIRES_IN` (optional, default 1h)
- `DB_HOST`
- `DB_PORT` (optional, default 3306)
- `DB_USER`
- `DB_PASSWORD`
- `DB_NAME`

Example values:

```env
PORT=3000
JWT_SECRET=change-this-in-production
JWT_EXPIRES_IN=1h
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=yourpassword
DB_NAME=unilevel_db
```

## Local Development Setup

1. Install dependencies

```bash
npm install
```

2. Configure environment variables

Create a `.env` file in the project root and set DB and JWT values.

3. Initialize database

Run SQL from `db/schema.sql` on your MySQL database.

4. Start development server

```bash
npm run dev
```

5. Start production mode locally

```bash
npm start
```

6. Run tests

```bash
npm test
```

## Database Setup Notes for Render

If your Render database name is `unilevel_db`, ensure the app uses:

- `DB_NAME=unilevel_db`

If you import `db/schema.sql`, make sure tables are created in the same DB your app points to.
If needed, remove or adjust the `CREATE DATABASE` and `USE` statements before running SQL.

## API Summary

Base path: `/api`

- Public routes:
  - `POST /api/auth/login`
  - `POST /api/auth/register`
  - `GET /api/settings/public`
  - `GET /health`
- Authenticated routes:
  - `GET /api/users/me`
  - `GET /api/users/me/downlines`
  - `GET /api/purchases/me`
  - `GET /api/purchases/my-downlines`
  - `GET /api/commissions/me`
  - `GET /api/profile`
  - `PUT /api/profile`
  - `PUT /api/profile/password`
  - `PUT /api/profile/photo`
  - `DELETE /api/profile/photo`
  - `PUT /api/profile/bank`
  - `PUT /api/profile/next-of-kin`
- Admin-only routes:
  - `GET /api/users`
  - `POST /api/users`
  - `PUT /api/users/:id`
  - `DELETE /api/users/:id`
  - `GET /api/purchases`
  - `POST /api/purchases`
  - `GET /api/purchases/distributors`
  - `GET /api/commissions`
  - `POST /api/commissions/generate-month`
  - `GET /api/settings`
  - `PUT /api/settings`
  - `GET /api/notifications`
  - `POST /api/notifications/:id/read`
  - `POST /api/notifications/read-all`

Auth format:

- `Authorization: Bearer <your-jwt-token>`

## Commission Generation Behavior

Monthly generation endpoint:

- `POST /api/commissions/generate-month`

Request body:

```json
{
  "period": "YYYY-MM"
}
```

High-level rules:

- Reads settings and commission percentage
- Scans distributor purchases for the requested month
- Applies eligibility threshold from settings
- Inserts or updates pending commission records
- Preserves approved/paid records from overwrite

## Deployment

Render web service configuration:

- Build command: `npm install`
- Start command: `node server.js`
- Environment: Node
- Add required DB and JWT environment variables

Post-deploy checks:

1. Open `/health`
2. Login with seed admin
3. Open admin pages that call users, purchases, commissions, settings APIs
4. Verify database tables and columns match runtime expectations

## Troubleshooting

Common issue: Missing auth token

- Cause: Request sent without `Authorization` header.
- Fix: Send Bearer token from login response.

## Security Notes

- Change `JWT_SECRET` in production
- Do not use default seed passwords in production
- Restrict CORS origins for production
- Use HTTPS in all environments
