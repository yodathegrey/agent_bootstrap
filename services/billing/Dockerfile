FROM node:20-alpine AS builder

RUN corepack enable && corepack prepare pnpm@9 --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile || pnpm install

COPY tsconfig.json nest-cli.json ./
COPY src/ ./src/

RUN pnpm run build

FROM node:20-alpine AS runner

RUN corepack enable && corepack prepare pnpm@9 --activate

WORKDIR /app

ENV NODE_ENV=production

COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile --prod || pnpm install --prod

COPY --from=builder /app/dist ./dist

EXPOSE 3003

USER node

CMD ["node", "dist/main.js"]
