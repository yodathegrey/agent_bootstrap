FROM node:22-alpine AS base

# Install python3 for skill execution
RUN apk add --no-cache python3 py3-pip

# Create non-root user for runtime
RUN addgroup -S nexus && adduser -S nexus -G nexus

WORKDIR /app

# Copy built artifacts
COPY dist/ ./dist/
COPY package.json ./

# Install production dependencies only
RUN npm install --omit=dev --ignore-scripts && \
    npm cache clean --force

# Switch to non-root user
USER nexus

# No ports exposed - runtime makes outbound-only gRPC connections
# Health is reported via heartbeats to the hub

CMD ["node", "dist/main.js"]
