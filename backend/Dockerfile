# syntax=docker/dockerfile:1

FROM node:22-bookworm-slim AS base
WORKDIR /app
# Prisma's query engine needs OpenSSL.
RUN apt-get update -y \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

FROM base AS build
COPY package.json package-lock.json ./
COPY prisma ./prisma/
RUN npm ci
COPY . .
RUN npx prisma generate && npm run build

# One-off job that applies database migrations (needs the Prisma CLI).
FROM build AS migrate
CMD ["npx", "prisma", "migrate", "deploy"]

FROM base AS prod-deps
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma

# Default target: API (`node dist/main`) or worker (`node dist/worker`).
FROM base AS runtime
ENV NODE_ENV=production
COPY --from=prod-deps --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --chown=node:node package.json ./
USER node
EXPOSE 3000
CMD ["node", "dist/main"]
