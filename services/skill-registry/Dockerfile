# Build stage
FROM node:22-alpine AS builder

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY services/skill-registry/package.json ./services/skill-registry/

RUN pnpm install --frozen-lockfile --filter @nexus/skill-registry

COPY services/skill-registry ./services/skill-registry

RUN pnpm --filter @nexus/skill-registry run build

# Runtime stage
FROM node:22-alpine

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY services/skill-registry/package.json ./services/skill-registry/

RUN pnpm install --frozen-lockfile --filter @nexus/skill-registry --prod

COPY --from=builder /app/services/skill-registry/dist ./services/skill-registry/dist

WORKDIR /app/services/skill-registry

EXPOSE 3002

USER node

CMD ["node", "dist/main.js"]
