# StockMento

StockMento is a full-stack learning and paper-trading platform for the Pakistan Stock Exchange (PSX). It combines a structured learning management system, interactive trading labs, and a real-time stock-market simulator in one application.

> StockMento is an educational simulator. It does not place orders on a real exchange and should not be treated as financial advice.

## Features

### Learner experience

- Email registration with one-time-password (OTP) verification
- JWT-based sign-in, refresh sessions, password reset, and profile management
- Published course catalog with enrollment and withdrawal
- Section-based courses with text, video, quiz, and lab lessons
- Lesson completion, course progress, learning streaks, and recent activity
- Database-backed lab catalog with task progress and attempt status

### PSX simulator

- Lazily created paper-trading accounts with virtual PKR balances
- Live tick delivery through Redis and Socket.IO
- Market, limit, and stop-limit buy/sell orders
- Cash locking, holdings, open orders, trade history, and realized/unrealized P&L
- Intraday chart data and daily leaderboard rankings
- Automatic processing of pending orders as market ticks arrive

### Administration

- Separate role-protected administrator sign-in
- Course, section, and lesson creation and editing
- Lesson reordering and support for text, video, quiz, and linked-lab content
- Lab publishing controls
- Dashboard analytics for users, courses, enrollments, and completion

## Architecture

```text
Next.js web application
        |
        | REST + authenticated Socket.IO
        v
NestJS API -------------------- Redis
        |                         ^
        | Prisma                  | ticks / market events
        v                         |
PostgreSQL             Playwright PSX collector
```

The PostgreSQL data model is separated into four schemas:

| Schema | Responsibility |
| --- | --- |
| `core` | Learner identities, profiles, memberships, OTPs, and password resets |
| `admin` | Administrator identities |
| `lms` | Courses, lessons, quizzes, labs, enrollments, and progress |
| `sim` | Simulator accounts, stocks, orders, trades, holdings, and leaderboards |

## Technology Stack

| Area | Technologies |
| --- | --- |
| Frontend | Next.js 16, React 18, TypeScript, Tailwind CSS 4, Radix UI |
| Backend | NestJS 11, TypeScript, Prisma 6, Passport/JWT, Socket.IO |
| Data | PostgreSQL, Redis 7 |
| Market-data collector | Python 3, Playwright, Chromium, MessagePack |
| Tooling | npm workspaces, ESLint, Jest |

## Repository Structure

```text
.
|-- backend/                  # NestJS API, Prisma schema, migrations, and seed
|-- frontend/                 # Next.js application and reusable UI components
|-- wss_playwright_server/    # PSX WebSocket collector and Linux service files
|-- Simulator_Dependencies/   # Redis image and auxiliary market-data utilities
|-- package.json              # Workspace-level development scripts
`-- tsconfig.json             # TypeScript project references
```

## Prerequisites

Install the following before running the project:

- Node.js 20.9 or newer (required by Next.js 16)
- npm
- PostgreSQL
- Redis, or Docker with Docker Compose to run the included Redis service
- SMTP credentials for registration verification and password-reset emails

The live PSX collector is optional for general LMS development, but it is required for live simulator ticks. Its automated service installer targets a Linux host with `systemd`, Python 3, and `python3-venv`.

## Local Setup

### 1. Install dependencies

From the repository root:

```bash
npm ci
```

The root lockfile covers both npm workspaces: `frontend` and `backend`.

### 2. Prepare PostgreSQL

Create an application database and a separate shadow database. Prisma uses the shadow database when running development migrations.

The existing migrations use the `uuid-ossp` and `citext` PostgreSQL extensions. The following is an example for `psql`; change the role name and password for your environment and run it as a PostgreSQL administrator:

```sql
CREATE ROLE stockmento_user WITH LOGIN PASSWORD 'replace-with-a-strong-password';
CREATE DATABASE stockmento OWNER stockmento_user;
CREATE DATABASE stockmento_shadow OWNER stockmento_user;

\connect stockmento
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS citext;

\connect stockmento_shadow
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS citext;
```

You may use existing databases and credentials instead, provided both databases are accessible and contain those extensions.

### 3. Configure the backend

Create `backend/.env`. Environment files are ignored by Git and must not be committed.

```dotenv
NODE_ENV=development
PORT=3001
FRONTEND_URL=http://localhost:3000

DATABASE_URL=postgresql://stockmento_user:replace-with-a-strong-password@localhost:5432/stockmento?schema=public
SHADOW_DATABASE_URL=postgresql://stockmento_user:replace-with-a-strong-password@localhost:5432/stockmento_shadow?schema=public

JWT_ACCESS_SECRET=replace-with-a-long-random-secret
JWT_REFRESH_SECRET=replace-with-a-different-long-random-secret
JWT_ACCESS_EXPIRES=900
JWT_REFRESH_EXPIRES=2592000

MAIL_HOST=smtp.example.com
MAIL_PORT=587
MAIL_SECURE=false
MAIL_USER=your-smtp-username
MAIL_PASS=your-smtp-password
MAIL_FROM="StockMento <no-reply@example.com>"

REDIS_URL=redis://localhost:6379/0
CORS_ORIGINS=http://localhost:3000

ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=replace-with-a-strong-admin-password
ADMIN_NAME=Administrator
```

Configuration notes:

- JWT expiry values are expressed in seconds.
- `MAIL_TRANSPORT` can be used instead of the individual SMTP settings when a transport URL is preferred.
- `ADMIN_EMAIL` plus either `ADMIN_PASSWORD` or `ADMIN_PASSWORD_HASH` is required only when running the admin seed.
- `ADMIN_AVATAR_URL` is optional; it defaults to `/avatars/avatar_admin.png`.
- Simulator tuning variables such as `SIM_INITIAL_CASH`, Redis channel names, retention limits, and leaderboard scheduling already have defaults in the backend.

### 4. Configure the frontend

Create `frontend/.env.local`:

```dotenv
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

`NEXT_PUBLIC_API_URL` is used for both REST requests and the Socket.IO connection. `NEXT_PUBLIC_SITE_URL` is used by site metadata.

### 5. Start Redis

To run only the Redis service supplied by this repository:

```bash
docker compose -f Simulator_Dependencies/docker-compose.yml up -d redis
```

Alternatively, start a local Redis instance on port `6379` and update `REDIS_URL` if necessary.

### 6. Apply migrations and generate the Prisma client

```bash
npm run prisma:generate --prefix backend
npm run prisma:migrate --prefix backend
```

The migrations create the application schemas and also populate the built-in lab catalog.

To create or update the initial administrator configured in `backend/.env`:

```bash
npm run prisma:seed --prefix backend
```

The seed is idempotent for the configured administrator. Courses are created through the administrator interface rather than by the seed script.

### 7. Start the application

Run the API and frontend in separate terminals from the repository root.

Terminal 1:

```bash
npm run backend:dev
```

Terminal 2:

```bash
npm run frontend:dev
```

Local endpoints:

| Service | URL |
| --- | --- |
| Web application | `http://localhost:3000` |
| Administrator sign-in | `http://localhost:3000/admin/login` |
| Backend API | `http://localhost:3001` |
| Health check | `http://localhost:3001/health` |

The health endpoint should return:

```text
StockMento API is running
```

## Live Market-data Collector

The backend subscribes to Redis for PSX ticks and market events. Without a publisher, the LMS remains usable but live simulator prices and automatic pending-order execution will not update.

For the current Playwright-based collector on a Linux server:

```bash
cd wss_playwright_server
sudo ./setup_wss_collector_playwright.sh
```

The installer creates a Python virtual environment under `/opt`, installs Playwright and Chromium, installs a `systemd` service, and connects to Redis at `redis://localhost:6379/0` by default.

Service management commands:

```bash
sudo ./setup_wss_collector_playwright.sh status
sudo ./setup_wss_collector_playwright.sh logs
sudo ./setup_wss_collector_playwright.sh restart
```

Collector and backend settings must agree on `REDIS_URL`, `REDIS_KEY_TEMPLATE`, and `REDIS_PUBSUB_CHANNEL`. The collector respects configured PSX market hours by default.

## Available Scripts

Run these commands from the repository root unless noted otherwise.

| Command | Purpose |
| --- | --- |
| `npm run frontend:dev` | Start the Next.js development server |
| `npm run backend:dev` | Start the NestJS API in watch mode |
| `npm run dev` | Start the frontend development server only |
| `npm run build --prefix frontend` | Create a production frontend build |
| `npm run build --prefix backend` | Compile the backend to `backend/dist` |
| `npm run frontend:lint` | Lint the frontend |
| `npm run backend:lint` | Lint and auto-fix backend TypeScript files |
| `npm run test --prefix backend` | Run backend unit tests |
| `npm run test:e2e --prefix backend` | Run backend end-to-end tests |
| `npm run prisma:generate --prefix backend` | Generate the Prisma client |
| `npm run prisma:migrate --prefix backend` | Apply migrations in development |
| `npm run prisma:deploy --prefix backend` | Apply existing migrations in production |
| `npm run prisma:seed --prefix backend` | Create or update the configured administrator |
| `npm run prisma:studio --prefix backend` | Open Prisma Studio |

## Production Build

Set production environment values, apply existing migrations, and build both applications:

```bash
npm ci
npm run prisma:generate --prefix backend
npm run prisma:deploy --prefix backend
npm run build --prefix backend
npm run build --prefix frontend
```

Start the compiled applications as separate processes:

```bash
npm run start:prod --prefix backend
npm run start --prefix frontend
```

In production, use HTTPS, strong independent JWT secrets, restricted database/Redis access, and explicit REST and WebSocket origins. Refresh cookies are marked secure when `NODE_ENV=production`.

## Troubleshooting

- **Migration reports a missing `uuid_generate_v4` function or `citext` type:** enable `uuid-ossp` and `citext` in both the application and shadow databases.
- **The API repeatedly reports Redis connection errors:** start Redis and verify `REDIS_URL`. The Socket.IO gateway subscribes during backend startup.
- **Browser requests or refresh cookies fail:** make sure `FRONTEND_URL`, `CORS_ORIGINS`, and `NEXT_PUBLIC_API_URL` match the URLs in use.
- **OTP or password-reset email fails:** verify the SMTP transport and sender settings in `backend/.env`.
- **The simulator opens without live prices:** verify that the collector is publishing to the same Redis URL, key template, and channel used by the backend.

## Verification Before Submission

Run the following checks after any code or configuration change:

```bash
npm run test --prefix backend
npm run build --prefix backend
npm run build --prefix frontend
```

Lint commands are also available, but note that the backend lint script includes ESLint's `--fix` option and can modify files.
