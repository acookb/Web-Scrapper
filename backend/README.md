# Backend — Web Scraper API

NestJS service with hexagonal/DDD module layout, Prisma persistence, and BullMQ workers.

See the root [README.md](../README.md) for full setup, Docker, and testing instructions.

## Useful scripts

```bash
npm run start:dev          # HTTP API
npm run start:worker:dev   # background worker
npm test                   # unit tests
npm run test:e2e           # Supertest integration tests
npx prisma migrate deploy  # apply migrations
```
