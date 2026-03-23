# Build stage
FROM node:22-alpine AS builder

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml* ./

# Install dependencies
RUN pnpm install --frozen-lockfile || pnpm install

# Copy source and config
COPY tsconfig.json nest-cli.json ./
COPY src/ ./src/

# Build
RUN pnpm run build

# Runtime stage
FROM node:22-alpine AS runtime

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

ENV NODE_ENV=production

# Copy package files and install production deps only
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --prod --frozen-lockfile || pnpm install --prod

# Copy built output
COPY --from=builder /app/dist ./dist

EXPOSE 3000

CMD ["node", "dist/main"]
