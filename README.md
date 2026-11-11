# Web Scraper

A user submits the URL of a web page; the system scrapes it **in the background**, stores the page title and every `<a>` link it contains, and lets the user browse the scraped pages and their links.

- **Backend:** NestJS API + BullMQ worker, PostgreSQL (Prisma), Redis
- **Frontend:** React + Vite + Tailwind CSS

## Contents

- [Quick start (Docker)](#quick-start-docker)
- [Requirements coverage](#requirements-coverage)
- [Architecture](#architecture)
- [Design decisions](#design-decisions)
- [Running locally without Docker](#running-locally-without-docker)
- [Testing](#testing)
- [API reference](#api-reference)
- [Configuration](#configuration)
- [Tools used](#tools-used)

## Quick start (Docker)

Requirements: Docker with Docker Compose v2.

```bash
docker compose up --build
```

| Service    | URL                                                    |
| ---------- | ------------------------------------------------------ |
| Frontend   | http://localhost:8081                                  |
| API        | http://localhost:3001                                  |
| PostgreSQL | `localhost:5432` (user `scraper`, password `scraper`)  |
| Redis      | `localhost:6379`                                       |

The API container applies the database migrations on start-up. The `worker` container runs from the same image and is the only process that consumes scrape jobs.

Try it: open the frontend, submit `https://news.ycombinator.com`, and watch the row change from **in progress** to its link count (the list refreshes every 3 seconds while any page is being processed). Click the page name to see its links.

If a host port is already taken, change the left-hand side of the `ports` mapping in [`docker-compose.yml`](docker-compose.yml). If you change the API port, also change the frontend build argument `VITE_API_BASE_URL`.

## Requirements coverage

| Requirement | Implementation |
| --- | --- |
| List of scraped pages with the number of links found | `GET /pages` and the landing page table (*Name / Total links*) |
| Details of a page's links: URL and name | `GET /pages/:id/links` and the details page (*Name / URL*) |
| Add a URL; scrape all links and store them | `POST /pages` creates the page and enqueues a job; the worker scrapes it with Axios + Cheerio and stores the links in PostgreSQL |
| `href` is the link, the body is the name | `html-link-extractor.ts` |
| Bodies that are not plain text: keep a portion of the HTML | Image-only links store their inner HTML, truncated to 500 characters (see [Design decisions](#design-decisions)) |
| The `<title>` is the page name | Falls back to the URL when the document has no title |
| Some pages take longer to scrape | Scraping runs asynchronously in a separate worker; the API responds immediately |
| Only `<a>` tags; JavaScript links can be ignored | Every `a[href]` is kept except `javascript:` pseudo-links |
| *Nice to have:* pagination of pages and links | Both endpoints and both views (*Previous 1 2 3 Next*) |
| *Nice to have:* see pages currently being processed | Status `IN_PROGRESS` is shown as **in progress**; failed pages are shown as **failed** |
| Include all tools used in the README | [Tools used](#tools-used) |

## Architecture

```mermaid
flowchart LR
  Browser["React SPA"] -->|"HTTP"| Api["NestJS API"]
  Api -->|"insert page IN_PROGRESS"| Db[(PostgreSQL)]
  Api -->|"enqueue job"| Redis[(Redis / BullMQ)]
  Redis --> Worker["NestJS worker"]
  Worker -->|"GET page"| Web["Target website"]
  Worker -->|"store title + links"| Db
```

1. `POST /pages` validates the URL, stores the page with status `IN_PROGRESS`, enqueues a job and returns `201` straight away.
2. The worker downloads the page, extracts the title and links, and stores them in a single transaction (status `COMPLETED`).
3. Failures are retried with exponential back-off (3 attempts). After the last attempt the page is stored as `FAILED` with the error message.
4. The frontend polls while any visible page is still in progress.

### Backend layers

The scraping feature is one NestJS module organised as a hexagonal architecture. Dependencies point inwards: the domain does not know about NestJS HTTP, Prisma, BullMQ or Axios.

```
backend/src/
├── core.module.ts            # Configuration + Redis connection (shared)
├── app.module.ts / main.ts   # HTTP API entry point
├── worker.module.ts / worker.ts  # Queue worker entry point
├── shared/pagination.ts
└── modules/scraping/
    ├── domain/               # Entities, PageUrl value object, errors, ports
    ├── application/          # Use cases + queue port
    ├── infrastructure/
    │   ├── persistence/      # Prisma repositories (adapters)
    │   ├── scraper/          # Axios download + Cheerio parsing (adapter)
    │   └── queue/            # BullMQ producer and processor (adapters)
    ├── presentation/         # Controller, DTOs, response mappers, error filter
    ├── scraping.module.ts         # Used by the API (produces jobs)
    └── scraping-worker.module.ts  # Used by the worker (consumes jobs)
```

| Use case | Responsibility |
| --- | --- |
| `CreateScrapeJobUseCase` | Validate the URL, persist the page as in progress, enqueue it |
| `ProcessScrapeUseCase` | Scrape the page; store the result, or rethrow so the queue retries, or mark it as failed on the last attempt |
| `ListPagesUseCase` | Paginated list of pages, newest first |
| `ListPageLinksUseCase` | A page and a paginated list of its links |

Domain errors (`InvalidUrlError`, `PageNotFoundError`) are translated to `400` / `404` by `DomainExceptionFilter`. Any other error, for example a database outage, stays a `500`.

### Frontend

```
frontend/src/
├── api/pagesApi.ts           # Typed HTTP client
├── hooks/usePolledQuery.ts   # Fetch + poll while a condition holds
├── components/               # UrlForm, PageTable, LinkTable, Pagination, DataTable
├── pages/                    # LandingPage, PageDetails
└── utils/pagination.ts
```

## Design decisions

- **Link name.** The visible text of the anchor, with whitespace collapsed. When the anchor has no text (for example an image-only link), its inner HTML is stored instead, such as `<img src="logo.png">`, which matches the wireframe. Names are truncated to 500 characters. The frontend renders them as text, so stored HTML is never injected into the page.
- **Which links are counted.** Every `<a>` with an `href` attribute, in document order, including `#anchors`, `mailto:` and `tel:`. Only `javascript:` pseudo-links are skipped, because the scope excludes links created through JavaScript. Relative URLs are resolved against the final URL after redirects, and against `<base href>` when present.
- **Stable pagination.** Each link stores its `position` in the document, and links are paginated by it. Pages are ordered by creation date, newest first.
- **Separate worker.** The API only produces jobs; the worker only consumes them. Slow scrapes therefore never block HTTP requests, and the worker can be scaled independently.
- **Idempotent processing.** The job id is the page id, and storing a result replaces any previously stored links, so a retried job cannot duplicate links.
- **Not in scope.** Authentication, deduplicating identical URLs, and rendering JavaScript-heavy pages (that would need a headless browser).

## Running locally without Docker

Requirements: Node.js 22+, plus PostgreSQL 16 and Redis 7. The simplest way to get the databases is to start only them with Compose:

```bash
docker compose up -d postgres redis
```

### Backend

```bash
cd backend
cp .env.example .env
npm install
npx prisma migrate deploy
npm run start:dev          # API on http://localhost:3000
npm run start:worker:dev   # in a second terminal: the worker that scrapes pages
```

Without the worker running, pages stay **in progress**.

### Frontend

```bash
cd frontend
cp .env.example .env       # VITE_API_BASE_URL=http://localhost:3000
npm install
npm run dev                # http://localhost:5173
```

## Testing

| Suite | Command | Needs | What it covers |
| --- | --- | --- | --- |
| Backend unit | `cd backend && npm test` | nothing | Use cases with mocked ports, URL value object, HTML parsing, Axios adapter (mocked Axios), BullMQ adapter and processor retry logic, pagination helpers |
| Backend HTTP | `cd backend && npm run test:e2e` | nothing | Supertest against the real controller, validation, error filter and use cases, with mocked repositories and queue: status codes, payloads, pagination |
| Backend integration | `cd backend && npm run test:integration` | PostgreSQL + Redis | Prisma repositories against a real database; the full flow over HTTP, Redis, worker and PostgreSQL, scraping a local fixture server, including retries ending in `FAILED` |
| Frontend | `cd frontend && npm test` | nothing | Vitest + React Testing Library: tables, pagination, loading/in-progress/failed states, form behaviour, polling hook, API client, both pages |

To run the integration tests, start the databases first:

```bash
docker compose up -d postgres redis
cd backend
npm run test:integration
```

The integration tests use a separate database, `scraper_test`, which is created and migrated automatically. They also use a unique queue prefix, so they never interfere with a running API or worker. Set `TEST_DATABASE_URL` to use a different database.

Other useful commands:

```bash
cd backend
npm run test:all       # unit + HTTP + integration
npm run test:cov       # unit tests with coverage report
npm run lint           # ESLint (type-aware)
npm run format:check   # Prettier

cd frontend
npm run lint           # oxlint
npm run build          # type-check + production build
```

## API reference

| Method | Path | Description |
| --- | --- | --- |
| `POST` | `/pages` | Body `{ "url": "https://..." }`. Returns `201` with the page in status `IN_PROGRESS` |
| `GET` | `/pages?page=1&limit=10` | Paginated pages, newest first |
| `GET` | `/pages/:id/links?page=1&limit=10` | The page plus a paginated list of its links |

`limit` must be between 1 and 100 (default 10). Example response for `GET /pages`:

```json
{
  "data": [
    {
      "id": "4b14f48e-abfb-4252-ae28-8a3564efb0c5",
      "url": "https://news.ycombinator.com/",
      "title": "Hacker News",
      "status": "COMPLETED",
      "linkCount": 229,
      "errorMessage": null,
      "createdAt": "2024-11-11T01:47:14.010Z",
      "updatedAt": "2024-11-11T01:47:14.597Z"
    }
  ],
  "meta": { "total": 1, "page": 1, "limit": 10, "totalPages": 1 }
}
```

`status` is one of `IN_PROGRESS`, `COMPLETED` or `FAILED`. Errors use Nest's format, for example `{ "statusCode": 400, "message": "Invalid URL", "error": "InvalidUrlError" }`.

## Configuration

Backend (`backend/.env`):

| Variable | Default | Description |
| --- | --- | --- |
| `DATABASE_URL` | – | PostgreSQL connection string |
| `REDIS_HOST` / `REDIS_PORT` | `localhost` / `6379` | Redis used by BullMQ |
| `PORT` | `3000` | API port |
| `QUEUE_PREFIX` | `bull` | BullMQ key prefix |
| `CORS_ORIGIN` | any origin | Comma-separated list of allowed origins |
| `TEST_DATABASE_URL` | `postgresql://scraper:scraper@localhost:5432/scraper_test` | Database used by the integration tests |

Frontend (`frontend/.env`):

| Variable | Default | Description |
| --- | --- | --- |
| `VITE_API_BASE_URL` | `http://localhost:3000` | API base URL, baked in at build time |

## Tools used

**Backend:** Node.js 22, TypeScript, NestJS 11, BullMQ + ioredis, Prisma 5, PostgreSQL 16, Redis 7, Axios, Cheerio, class-validator / class-transformer.

**Frontend:** React 19, Vite 8, React Router 7, Tailwind CSS 4.

**Testing and quality:** Jest, ts-jest, Supertest, Vitest, React Testing Library, user-event, jsdom, ESLint with typescript-eslint, Prettier, oxlint.

**Infrastructure:** Docker, Docker Compose, Nginx (serves the frontend build).

**Development process:** [Cursor](https://cursor.com), an AI-assisted code editor, with its AI agent used for scaffolding, implementation, tests and documentation. All output was reviewed, run and verified locally. Git and GitHub were used for version control.
