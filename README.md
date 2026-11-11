# Web Scraper

[![CI](https://github.com/acookb/Web-Scrapper/actions/workflows/ci.yml/badge.svg)](https://github.com/acookb/Web-Scrapper/actions/workflows/ci.yml)

A user submits the URL of a web page; the system scrapes it **in the background**, stores the page title and every `<a>` link it contains, and lets the user browse the scraped pages and their links.

- **Backend:** NestJS API + BullMQ worker, PostgreSQL (Prisma), Redis
- **Frontend:** React + Vite + Tailwind CSS
- **Quality:** 193 automated tests (unit, HTTP, integration against real PostgreSQL and Redis, UI), coverage thresholds enforced in CI

## Contents

- [Quick start (Docker)](#quick-start-docker)
- [Requirements coverage](#requirements-coverage)
- [Architecture](#architecture)
- [Scraping rules](#scraping-rules)
- [Resilience](#resilience)
- [Security](#security)
- [Running locally without Docker](#running-locally-without-docker)
- [Testing](#testing)
- [API reference](#api-reference)
- [Configuration](#configuration)
- [Trade-offs](#trade-offs)
- [What I would do with more time](#what-i-would-do-with-more-time)
- [Tools used](#tools-used)

## Quick start (Docker)

Requirements: Docker with Docker Compose v2.

```bash
docker compose up --build
```

| Service    | URL                                                   |
| ---------- | ----------------------------------------------------- |
| Frontend   | http://localhost:8081                                 |
| API        | http://localhost:3001                                 |
| API docs   | http://localhost:3001/docs (OpenAPI / Swagger UI)      |
| Health     | http://localhost:3001/health                          |
| PostgreSQL | `localhost:5432` (user `scraper`, password `scraper`) |
| Redis      | `localhost:6379`                                      |

Start-up order is enforced by Compose: `migrate` applies the database migrations and exits, then `api` and `worker` start, and the `frontend` waits until the API reports healthy.

Try it: open the frontend, submit `https://news.ycombinator.com`, and watch the row change from **in progress** to its link count. The list refreshes every 3 seconds while a page is being processed. Click the page name to see its links.

If a host port is already taken, change the left-hand side of the `ports` mapping in [`docker-compose.yml`](docker-compose.yml). If you change the API port, also change the frontend build argument `VITE_API_BASE_URL` and the API's `CORS_ORIGIN`.

## Requirements coverage

| Requirement | Implementation |
| --- | --- |
| List of scraped pages with the number of links found | `GET /pages` and the landing page table (*Name / Total links*) |
| Details of a page's links: URL and name | `GET /pages/:id/links` and the details page (*Name / URL*) |
| Add a URL; scrape all links and store them | `POST /pages` stores the page and enqueues a job; the worker scrapes it with Axios + Cheerio and stores the links in PostgreSQL |
| `href` is the link, the body is the name | [`html-link-extractor.ts`](backend/src/modules/scraping/infrastructure/scraper/html-link-extractor.ts), [`link-name.ts`](backend/src/modules/scraping/infrastructure/scraper/link-name.ts) |
| A body that is not plain text: keep a portion of the HTML | A sanitized, well-formed HTML fragment of up to 500 characters (see [Scraping rules](#scraping-rules)) |
| The `<title>` is the page name | `<title>` of the document head; the URL is used when there is none |
| Some pages take longer than others | A separate worker scrapes several pages in parallel; the API answers immediately |
| Only `<a>` tags; JavaScript links can be ignored | Every `a[href]` is kept except `javascript:` pseudo-links |
| *Nice to have:* pagination of pages and links | Both endpoints and both views (*Previous 1 2 3 Next*); the page number is kept in the URL |
| *Nice to have:* see the pages being processed | `IN_PROGRESS` is shown as **in progress**, failures as **failed** with the reason |
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

The API and the worker are separate processes built from the same image (`node dist/main` and `node dist/worker`). The API only produces jobs and the worker only consumes them, so slow scrapes never block HTTP requests and the worker can be scaled on its own.

### Backend layers

The scraping feature follows a hexagonal (ports and adapters) layout. Dependencies point inwards: the domain and the use cases do not know about Nest HTTP, Prisma, BullMQ or Axios.

```
backend/src/
├── config/                    # Validated environment (fails fast on bad settings)
├── core.module.ts             # Configuration + Redis connection shared by API and worker
├── app.module.ts / main.ts    # HTTP API process
├── worker.module.ts / worker.ts  # Queue worker process
├── shared/pagination.ts
└── modules/
    ├── health/                # GET /health (PostgreSQL + Redis)
    └── scraping/
        ├── domain/            # Entities, PageUrl value object, errors, ports
        ├── application/       # Use cases, queue port, application errors
        ├── infrastructure/
        │   ├── persistence/   # Prisma repositories
        │   ├── scraper/       # Axios download, SSRF guard, Cheerio parsing
        │   └── queue/         # BullMQ producer, processor, stale-page reaper
        ├── presentation/      # Controller, DTOs, OpenAPI models, error filter
        ├── scraping.module.ts         # API side: produces jobs
        └── scraping-worker.module.ts  # Worker side: consumes jobs
```

| Use case | Responsibility |
| --- | --- |
| `CreateScrapeJobUseCase` | Validate the URL, store the page as in progress, enqueue it; if the queue is down, fail the page and answer `503` |
| `ProcessScrapeUseCase` | Scrape the page and store the result; rethrow retryable errors so the queue retries; fail the page on permanent errors or the last attempt |
| `MarkPageFailedUseCase` | Fail a page whose job died outside normal processing (e.g. a stalled job after a worker crash) |
| `FailStalePagesUseCase` | Safety net: fail pages that have been in progress for too long |
| `ListPagesUseCase` / `ListPageLinksUseCase` | Paginated reads |

Domain and application errors are translated to HTTP by `DomainExceptionFilter`: `InvalidUrlError` → `400`, `PageNotFoundError` → `404`, `ScrapeQueueUnavailableError` → `503`. Any other error, such as a database outage, stays a `500`.

### Frontend

```
frontend/src/
├── api/pagesApi.ts           # Typed HTTP client
├── hooks/usePolledQuery.ts   # Fetch, poll while needed, survive transient errors
├── hooks/usePageParam.ts     # Page number stored in ?page=
├── components/               # UrlForm, PageTable, LinkTable, Pagination, DataTable
├── pages/                    # LandingPage, PageDetails
└── utils/pagination.ts
```

## Scraping rules

- **Page name.** The text of the `<title>` in the document head, with whitespace collapsed. `<title>` elements inside inline SVG icons are ignored. If the page has no title, the URL is used.
- **Which links are stored.** Every `<a>` with an `href`, in document order, including `#anchors`, `mailto:` and `tel:`. Only `javascript:` pseudo-links are skipped (also when obfuscated, e.g. `java\tscript:`), since links created through JavaScript are out of scope. Relative URLs are resolved against the final URL after redirects, and against `<base href>` when present. Very long hrefs such as `data:` URIs are cut at 2048 characters.
- **Link name, text case.** The visible text of the body. `<br>` and block elements such as `<div>` become spaces, so `Hello<br>World` is stored as `Hello World`. Script and style contents are ignored, entities are decoded, and whitespace is collapsed. The name is cut at 500 characters.
- **Link name, HTML case.** When the body has no text (for example an image-only link), a portion of its inner HTML is stored, as in the wireframe: `<img src="logo.png" alt="Logo">`. The fragment is:
  - **sanitized:** `script`, `style`, `iframe`, `object` and `embed` are removed, as are `on*` event handlers and `javascript:` URLs;
  - **well-formed:** it is cut on node boundaries, never in the middle of a tag. If a single element is too long, its longest attribute values are shortened (`<img src="very-long…">`). An ellipsis marks dropped content.
- **Display.** The frontend renders names as text, so stored HTML is never injected into the page, and only `http(s)` URLs are clickable.

## Resilience

```mermaid
flowchart TD
  post["POST /pages"] --> insert["page IN_PROGRESS"]
  insert --> enqueue{"enqueued?"}
  enqueue -->|"no: Redis down"| failQ["FAILED + 503"]
  enqueue -->|yes| worker["worker, concurrency 5"]
  worker --> outcome{"result"}
  outcome -->|ok| done["COMPLETED"]
  outcome -->|"permanent: 4xx, not HTML, blocked, DNS"| failP["FAILED"]
  outcome -->|"retryable: timeout, 5xx, 429, reset"| retry{"attempts left?"}
  retry -->|yes| worker
  retry -->|no| failP
  stalled["worker crashed: job stalled"] --> failP
  reaper["reaper: in progress over 15 min"] --> failP
```

Every page ends in `COMPLETED` or `FAILED`; none stays **in progress** forever:

- **Retryable vs permanent errors.** Timeouts, connection resets, `5xx`, `408` and `429` are retried with exponential back-off (3 attempts). Other `4xx` responses, non-HTML content, blocked destinations, unknown hosts and oversized responses fail immediately with a clear message.
- **Parallel scraping.** The worker processes 5 pages at a time (`SCRAPE_CONCURRENCY`), so one slow site does not hold back the others. This is covered by an integration test.
- **Queue outage.** The producer does not buffer commands while Redis is down. `POST /pages` answers `503` within milliseconds and the page is stored as `FAILED`.
- **Worker crash.** BullMQ detects the stalled job and runs it again once the dead worker's lock expires (about a minute in practice). A job that finally fails outside the normal path is caught by the worker's `failed` event handler.
- **Safety net.** Every minute the worker fails pages that have been in progress longer than `STALE_PAGE_TIMEOUT_MINUTES` (15).
- **Idempotency.** The job id is the page id, and storing a result replaces the page's links in one transaction, so a retried job never duplicates links. Failing a page only applies to pages still in progress.
- **Encoding.** Pages are decoded with the charset from the `Content-Type` header or `<meta charset>`, so ISO-8859-1 and similar pages are not garbled.

## Security

- **SSRF protection.** The scraper only connects to public addresses. Loopback, private, link-local (including the cloud metadata endpoint `169.254.169.254`), CGNAT and IPv6 ULA ranges are refused. The check applies to IP literals, to every redirect hop (redirects are followed manually), and to the resolved address at connection time, which also defeats DNS rebinding. In Docker, this keeps the scraper away from `redis`, `postgres` and the API itself.
- **Limits.** 30 s timeout, 10 MB maximum response size, 5 redirects at most, and a rate limit on `POST /pages` (20 per minute per client by default).
- **HTTP hardening.** `helmet` security headers, an explicit CORS origin, strict input validation that rejects unknown fields, and security headers on the frontend's nginx.
- **Stored HTML.** Fragments are sanitized before storage and rendered as text by the frontend.
- **Containers.** Both images run as non-root users, and the API image contains production dependencies only.

## Running locally without Docker

Requirements: Node.js 22+ (see [`.nvmrc`](.nvmrc)), plus PostgreSQL 16 and Redis 7. The simplest way to get the databases is to start only them with Compose:

```bash
docker compose up -d postgres redis
```

### Backend

```bash
cd backend
cp .env.example .env
npm install
npx prisma migrate deploy
npm run start:dev          # API on http://localhost:3000, docs on /docs
npm run start:worker:dev   # in a second terminal: the worker that scrapes pages
```

Without the worker running, pages stay **in progress** until the stale-page timeout fails them.

### Frontend

```bash
cd frontend
cp .env.example .env       # VITE_API_BASE_URL=http://localhost:3000
npm install
npm run dev                # http://localhost:5173
```

## Testing

| Suite | Command | Needs | Tests | What it covers |
| --- | --- | --- | --- | --- |
| Backend unit | `cd backend && npm test` | nothing | 110 | Use cases with mocked ports; URL value object; HTML parsing (titles, relative URLs, `<br>`/block spacing, sanitization, well-formed truncation); scraper adapter with mocked Axios (redirects, SSRF, content types, charsets, error classification); SSRF guard; queue adapter, processor and reaper; configuration validation |
| Backend HTTP | `cd backend && npm run test:e2e` | nothing | 17 | Supertest against the real controller, validation, error filter, rate limiter and use cases, with mocked repositories and queue: `201/400/404/429/500/503`, pagination, security headers, OpenAPI document |
| Backend integration | `cd backend && npm run test:integration` | PostgreSQL + Redis | 18 | Prisma repositories on a real database; the API and the worker booted as separate processes, scraping a local fixture server: link pagination, slow vs fast pages in parallel, retries, permanent failures, `/health`; SSRF guard on real sockets |
| Frontend | `cd frontend && npm test` | nothing | 48 | Vitest + React Testing Library: tables, pagination, loading / in-progress / failed states, URL-based paging and Back navigation, form behaviour, polling hook, API client |

To run the integration tests, start the databases first:

```bash
docker compose up -d postgres redis
cd backend && npm run test:integration
```

The integration tests use a separate database, `scraper_test`, which is created and migrated automatically, and a unique queue prefix, so they never interfere with a running API or worker. Set `TEST_DATABASE_URL` to use another database.

**Coverage** is enforced by `npm run test:cov` in each project. The backend runs all three suites together and requires at least 95% statements, lines and functions and 80% branches; it currently reports about 98% statements, 100% functions and 82% branches. The branch threshold is lower because TypeScript's decorator metadata adds unreachable branches to every Nest constructor. The frontend requires 85% on every metric and currently reports about 96% statements and 89% branches.

**One command for everything** (lint, format, build, all suites with coverage), from the repository root:

```bash
npm run install:all
npm run verify
```

CI ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) runs the same checks on every push and pull request, with PostgreSQL and Redis as service containers, and also builds the Docker images.

## API reference

Interactive documentation: http://localhost:3001/docs (OpenAPI JSON at `/docs-json`).

| Method | Path | Description |
| --- | --- | --- |
| `POST` | `/pages` | Body `{ "url": "https://..." }`. Returns `201` with the page in status `IN_PROGRESS`; `400` for an invalid URL, `429` when rate-limited, `503` when the queue is unavailable |
| `GET` | `/pages?page=1&limit=10` | Paginated pages, newest first |
| `GET` | `/pages/:id/links?page=1&limit=10` | The page plus a paginated list of its links in document order; `404` for an unknown page |
| `GET` | `/health` | `200` when PostgreSQL and Redis are reachable, `503` otherwise |

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

`status` is one of `IN_PROGRESS`, `COMPLETED` or `FAILED`. Errors have the shape `{ "statusCode": 400, "message": "Invalid URL", "error": "InvalidUrlError" }`.

## Configuration

Backend (`backend/.env`, validated at start-up; an invalid value stops the process with a clear message):

| Variable | Default | Description |
| --- | --- | --- |
| `DATABASE_URL` | required | PostgreSQL connection string |
| `REDIS_HOST` / `REDIS_PORT` | `localhost` / `6379` | Redis used by BullMQ |
| `PORT` | `3000` | API port |
| `QUEUE_PREFIX` | `bull` | BullMQ key prefix |
| `CORS_ORIGIN` | any origin | Comma-separated list of allowed origins |
| `SCRAPE_CONCURRENCY` | `5` | Pages scraped in parallel by each worker (1–50) |
| `SCRAPE_ATTEMPTS` | `3` | Attempts for retryable failures |
| `SCRAPE_BACKOFF_MS` | `2000` | Base delay of the exponential back-off |
| `SCRAPER_TIMEOUT_MS` | `30000` | Timeout of each HTTP request |
| `SCRAPER_MAX_BYTES` | `10485760` | Maximum response size |
| `SCRAPER_ALLOW_PRIVATE_HOSTS` | `false` | Disables the SSRF guard; only for tests against local servers |
| `STALE_PAGE_TIMEOUT_MINUTES` | `15` | After this long, a page still in progress is failed |
| `THROTTLE_LIMIT` | `20` | `POST /pages` requests allowed per minute per client |
| `TEST_DATABASE_URL` | `postgresql://scraper:scraper@localhost:5432/scraper_test` | Database used by the integration tests |

Frontend (`frontend/.env`):

| Variable | Default | Description |
| --- | --- | --- |
| `VITE_API_BASE_URL` | `http://localhost:3000` | API base URL, baked in at build time |

## Trade-offs

- **Polling instead of push.** The UI polls every 3 seconds, and only while a visible page is in progress. It is simple, works through any proxy and needs no extra infrastructure. Server-sent events would update instantly, at the cost of connection handling in the API.
- **Offset pagination.** Simple and matches the numbered wireframe. New pages shift older ones between pages while you browse; cursor pagination would avoid that but cannot jump to page N.
- **Text first, HTML only when there is no text.** For `<a><img> Products</a>` the name is `Products`, which is the most readable choice. Image-only links keep their (sanitized) HTML, as the wireframe shows.
- **Every anchor counts.** Duplicate URLs and `#anchors` are all stored and counted, because the spec asks for all links in the page. Deduplication would be a one-line change but would change the totals.
- **Static HTML only.** Pages that build their links with JavaScript are not rendered (explicitly out of scope). Supporting them would need a headless browser in the worker.
- **In-memory rate limiting.** The limit is per API instance. Multiple replicas would need the Redis-backed throttler storage.

## What I would do with more time

- Server-sent events for live status updates instead of polling.
- A BullMQ dashboard (Bull Board) and structured JSON logs (pino) with request ids.
- Playwright end-to-end tests against the Docker stack.
- Respect `robots.txt` and per-domain rate limits.
- Deduplicate repeated submissions of the same URL within a time window (idempotency key).
- Cursor-based pagination for very large link lists.

## Tools used

**Backend:** Node.js 22, TypeScript, NestJS 11, BullMQ + ioredis, Prisma 5, PostgreSQL 16, Redis 7, Axios, Cheerio, encoding-sniffer, ipaddr.js, class-validator / class-transformer, @nestjs/terminus, @nestjs/swagger, @nestjs/throttler, helmet.

**Frontend:** React 19, Vite 8, React Router 7, Tailwind CSS 4.

**Testing and quality:** Jest, ts-jest, Supertest, Vitest, @vitest/coverage-v8, React Testing Library, user-event, jsdom, ESLint with typescript-eslint, Prettier, oxlint.

**Infrastructure:** Docker, Docker Compose, nginx (unprivileged image serving the frontend), GitHub Actions.

**Development process:** [Cursor](https://cursor.com), an AI-assisted code editor, with its AI agent used for scaffolding, implementation, tests, code review and documentation. All output was reviewed, run and verified locally, including manual failure testing against the Docker stack (Redis outage, worker crash, SSRF attempts). Git and GitHub for version control.
