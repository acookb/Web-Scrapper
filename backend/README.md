# Backend: Web Scraper API and worker

NestJS service with a hexagonal module layout, Prisma persistence and a BullMQ worker. See the root [README](../README.md) for architecture, scraping rules, resilience, setup and testing.

```bash
npm run start:dev          # HTTP API (docs on /docs)
npm run start:worker:dev   # queue worker
npm test                   # unit tests
npm run test:e2e           # HTTP tests (Supertest, mocked ports)
npm run test:integration   # PostgreSQL + Redis integration tests
npm run test:cov           # all suites with coverage thresholds
npm run lint
```
