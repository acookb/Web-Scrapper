# Web Scraper Technical Test

Full-stack asynchronous web scraper. Users submit a URL, the API enqueues a background job (BullMQ + Redis), a worker scrapes the page title and `<a>` links with Axios + Cheerio, and results are stored in PostgreSQL. The React frontend lists scraped pages (with live “in progress” status) and shows paginated link details.

## Architecture

```
frontend (React + Vite + Tailwind)
        │ HTTP
        ▼
backend API (NestJS)
        │ enqueue
        ▼
Redis (BullMQ) ──► Worker (NestJS ApplicationContext)
                        │
                        ▼
                   PostgreSQL (Prisma)
```

### Backend layering (pragmatic DDD / hexagonal)

| Layer | Responsibility |
| --- | --- |
| `domain/` | Entities (`ScrapedPage`, `Link`), `PageStatus`, repository & scraper ports |
| `application/` | Use cases: create job, process scrape, list pages, list links |
| `infrastructure/` | Prisma repositories, Axios/Cheerio scraper, BullMQ adapter & processor |
| `presentation/` | REST controllers + validation DTOs |

### REST API

| Method | Path | Description |
| --- | --- | --- |
| `POST` | `/pages` | Body `{ "url": "https://..." }` → creates page with status `IN_PROGRESS`, enqueues scrape, returns immediately |
| `GET` | `/pages?page=&limit=` | Paginated scraped pages |
| `GET` | `/pages/:id/links?page=&limit=` | Paginated links for a page |

Link “name” rules:

- Plain text anchors → trimmed text content
- Complex bodies (e.g. `<img>`) → HTML fragment, truncated to 500 characters

## Tools used

- **Node.js 22**, **TypeScript**
- **NestJS 11**, **BullMQ**, **ioredis**
- **Prisma 5** + **PostgreSQL 16**
- **Axios**, **Cheerio**
- **class-validator** / **class-transformer**
- **Jest** + **Supertest** (backend)
- **React 19**, **Vite 8**, **React Router**, **Tailwind CSS 4**
- **Vitest** + **React Testing Library** (frontend)
- **Docker Compose**, **Nginx** (frontend image)

## Project structure

```
.
├── backend/                 # NestJS API + worker
│   ├── prisma/
│   ├── src/modules/scraping/
│   └── test/
├── frontend/                # React SPA
├── docker-compose.yml
└── README.md
```

## Quick start with Docker Compose

Requirements: Docker + Docker Compose.

```bash
docker compose up --build
```

Services:

| Service | URL / port |
| --- | --- |
| Frontend | http://localhost:8081 |
| API | http://localhost:3001 |
| PostgreSQL | `localhost:5432` (`scraper` / `scraper` / db `scraper`) |
| Redis | `localhost:6379` |

The API container runs `prisma migrate deploy` on startup. The `worker` container shares the same image and runs `node dist/worker`.

## Local development (without Docker for the apps)

### 1. Infrastructure

Start only databases:

```bash
docker compose up -d postgres redis
```

### 2. Backend

```bash
cd backend
cp .env.example .env   # already present with local defaults
npm install
npx prisma generate
npx prisma migrate deploy
npm run start:dev      # API on http://localhost:3000
```

In another terminal (recommended for realistic async processing):

```bash
cd backend
npm run start:worker:dev
```

> Note: the API process also registers the BullMQ processor, so jobs will still run if you only start the API. The dedicated worker mirrors the production Compose layout.

Environment variables (`backend/.env`):

```env
DATABASE_URL=postgresql://scraper:scraper@localhost:5432/scraper?schema=public
REDIS_HOST=localhost
REDIS_PORT=6379
PORT=3000
```

### 3. Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Open http://localhost:5173. `VITE_API_BASE_URL` defaults to `http://localhost:3000`.

## Running tests

### Backend

```bash
cd backend
npm test            # unit tests (use cases + scraper with mocked Axios)
npm run test:e2e    # HTTP integration tests with Supertest (in-memory fakes)
```

### Frontend

```bash
cd frontend
npm test            # Vitest + React Testing Library
```

## Manual smoke test

1. Open the frontend.
2. Submit `https://example.com`.
3. The table should show **in progress**, then refresh (polling every 3s) to a link count.
4. Click the page name to open details and inspect Name / URL rows.

## Design notes for reviewers

- Creating a scrape job never blocks on HTTP fetches; work is deferred to BullMQ.
- Pagination is implemented for both page and link lists (API + UI).
- Failed scrapes are persisted with status `FAILED` and an error message.
- Domain ports keep use cases independent from Prisma/Axios/BullMQ for unit testing.

## License

UNLICENSED — technical assessment submission.
