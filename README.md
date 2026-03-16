# Unilevel Commission System

This repo holds a lightweight Unilevel commission tracker built with vanilla Node.js/Express serving a collection of static distributor/admin dashboards. The goal is to keep the experience simple yet extendable: the backend provides placeholder API routes for authentication, user info, commissions, and settings, while the `public/` folder hosts the distributor experience (dashboard, downlines tree, commissions, notifications, profile) plus an admin shell.

## Tech stack

- **Runtime:** Node.js + Express
- **Routing/middleware:** `src/routes/{auth,users,commissions,settings}` + `src/middleware/auth`
- **Data layer:** `src/db/connection.js` contains in-memory seeds; `db/schema.sql` documents a relational schema for future migration to MySQL/Postgres.
- **Static UI:** Plain HTML/CSS/JS under `public/` plus script utilities in `public/js/`.

## Getting started

1. Install dependencies:

```bash
npm install
```

2. Create your environment file:

```bash
copy .env.example .env
```

3. (Optional) If you’re using MySQL, create a database and run the schema in `db/schema.sql`.

4. Run in development mode:

```bash
npm run dev
```

3. Open http://localhost:3000 in a browser. Use the seeded credentials from `db/schema.sql`/`src/db/connection.js`, e.g. `distributor@example.com` / `password`.

### Environment

Environment variables (dotenv already loaded in `server.js`):

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `3000` | TCP port binding for Express |
| `JWT_SECRET` | `change-me` | Signing secret for login tokens |
| `JWT_EXPIRES_IN` | `1h` | Token expiration |

Create a `.env` (or use `.env.example`) as needed to override these.

## Project structure

- `server.js`: Express entry point, static asset hosting, and route mounting.
- `src/routes/`: API endpoints under `/api`.  
  - `auth.js`: login (issues JWT).  
  - `users.js`: `/api/users/me` plus placeholder admin list.  
  - `commissions.js` & `settings.js`: guarded by authentication and role checks.
- `src/middleware/auth.js`: JWT validation + role-check helper.
- `src/db/connection.js`: temporary user list & lookup helpers.
- `public/`: distributor & admin UI.
  - `public/distributor/`: fully self-contained single-file pages (`dashboard.html`, `my-downlines.html`, `my-commissions.html`, `notifications.html`, `profile.html`) that share sidebar/navigator logic plus inline scripts for stats, filtering, sorting, and toast feedback.
  - `public/js/`: shared scripts (`tree.js`, `utils.js`) consumed by older sample pages.
  - `public/css/custom.css`: baseline styles referenced by legacy distributor landing pages.
- `db/schema.sql`: normalized schema for users, purchases, commissions, settings, plus seed data.

## Distributor experience

Each distributor page now uses a consistent sidebar (Dashboard, Downlines, Commission History, Notifications, Profile + red Logout button) and implements `confirmLogout(event)` to redirect to `../index.html`. Key behaviors:

- **Dashboard:** hero stat cards, canvas chart rendering logic, recent activity table, and responsive nav state.
- **My Downlines:** sortable table, search filter, per-downline commission calculations, and avatar colors.
- **Commission History:** sortable monthly breakdown table with badges and totals.
- **Notifications:** grouped unread/earlier lists, mark-as-read behavior, toast to confirm actions, and nav badge/dot updates.
- **Profile:** forms for personal info, password, bank details, validation feedback, password strength meter, and toast notifications.

## Admin experience

`public/admin/` mirrors the dashboard-first pattern; see `dashboard.html` plus accompanying scripts in `public/js/`. Admin-specific utilities (menu builder, distributor table, etc.) remain static for now.

## API contract (placeholder)

| Route | Description | Auth |
| --- | --- | --- |
| `POST /api/auth/login` | Returns JWT + user payload from `src/db/connection.js` | Public |
| `GET /api/users/me` | Returns authenticated user info | Requires JWT |
| `GET /api/users` | Admin-only placeholder | Requires `admin` role |
| `GET /api/commissions` | Returns fake commission list | Requires JWT |
| `GET /api/settings` | Returns sample settings | Requires JWT + `admin` |

Authentication flows rely on the `Authorization: Bearer <token>` header and `src/middleware/auth.js`.

## Database schema

`db/schema.sql` defines:

- `users`: admin/distributor accounts with sponsor relationships, indexed for email/sponsor lookups.
- `purchases`: monthly volume per user/period.
- `commissions`: pre-calculated earnings with status (`pending`, `approved`, `paid`).
- `settings`: global commission configuration, including structured JSON percent rules.

## Working on the project

1. **Adding data-backed APIs:** replace `src/db/connection.js` with a real database client (MySQL/Postgres) and implement migrations using `db/schema.sql` as reference.
2. **Refining distributor UI:** break single-file pages into templated components (e.g., via a build tool) once you add authentication/session management.
3. **Testing ideas:** no automated suite yet; add Jest/Mocha for backend logic and a simple Puppeteer/Playwright check for key UI flows once the stack matures.

## Deployment recommendations

- Serve `server.js` on Node 18+.
- Point `PORT` to the desired binding or rely on runtime injection (platform-specific).
- For static asset caching, consider placing `public/` behind a CDN and use the Express server only for the API.
- Store `JWT_SECRET` securely (Vault/Env) when deploying to production.

## Troubleshooting

- `Error: Missing auth token` — ensure the client sets `Authorization` header.
- `EADDRINUSE` on startup — `server.js` already retries on the next port.
- `index.html` loads blank? check browser console: the repo currently serves static pages; refresh your build after editing the single-file HTML assets.
