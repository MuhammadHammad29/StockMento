# Database Setup

This folder contains everything required to spin up the StockMento PostgreSQL instance that matches the ERD you provided.

## 1. Prerequisites

- Docker Desktop running locally (Windows/macOS/Linux).
- `docker compose` v2 (bundled with recent Docker Desktop builds).

## 2. Start PostgreSQL

```bash
# from the project root
docker compose -f db/docker-compose.yml up -d
```

Environment variables (with sensible defaults) can be overridden when you launch the stack:

```bash
POSTGRES_USER=stockmento \
POSTGRES_PASSWORD=supersecret \
POSTGRES_DB=stockmento \
POSTGRES_PORT=5433 \
docker compose -f db/docker-compose.yml up -d
```

The `schema.sql` file is mounted into the container and applied automatically the first time the database initializes, creating all schemas, tables, enums, and constraints that reflect the ERD.

## 3. Inspect / Connect

Once the container is healthy:

```bash
docker exec -it stockmento-postgres psql -U ${POSTGRES_USER:-stockmento} -d ${POSTGRES_DB:-stockmento}
```

From there you can run queries such as `\dn` (list schemas) or `\dt *.*` (list tables) to verify everything was created.

## 4. Applying Changes Later

The `schema.sql` script only runs automatically on the very first initialization. To apply updates after the database already exists, either:

- Run migrations via your preferred tool (recommended for production), or
- Manually execute the updated SQL: `psql -f db/schema.sql postgres://user:pass@localhost:5432/stockmento`

## 5. Shut Down

```bash
docker compose -f db/docker-compose.yml down
```

Add `-v` to the command if you also want to remove the persisted volume.
