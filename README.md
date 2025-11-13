# StockMento Monorepo

This repository hosts two separate apps:

- `frontend/` – Next.js UI (all previous `app/`, `components/`, `lib/`, etc.).
- `backend/` – NestJS API with Prisma, mailer, and seeding logic.

## Quick Start

```bash
# start Postgres 
docker start stockmento-db

# Backend API
cd backend
npm install           # first time only
npm run prisma:migrate
npm run prisma:seed
npm run start:dev

# Frontend in a new terminal
cd frontend
npm install           # first time only
npm run dev
```

## Useful Scripts

| Command | Description |
| --- | --- |
| `npm run prisma:generate` (backend) | Regenerate Prisma client |
| `npm run prisma:deploy` (backend) | Apply migrations in production |
| `npm run prisma:studio` (backend) | Inspect DB via Prisma Studio |
| `npm run lint` (frontend or backend) | Run ESLint in each app |

## Repo Layout

```
frontend/     # Next.js project 
backend/      # NestJS API + Prisma schema/seed

```

