# Build stage - use Alpine for smaller image
FROM oven/bun:canary-slim AS build

WORKDIR /app

# Copy package files first for better layer caching
COPY package.json bun.lock ./

# Install dependencies (including dev deps for build)
RUN bun install --frozen-lockfile

# Copy only files needed for build
COPY src ./src
COPY build.ts tsconfig.json ./

# Run build directly (skip type-check - should be done in CI)
RUN bun build.ts

# Production stage - minimal Alpine image
FROM oven/bun:1-alpine AS production

WORKDIR /app

# Copy package files
COPY package.json bun.lock ./

# Install production dependencies only
RUN bun install --frozen-lockfile --production --ignore-scripts

# Copy built output from build stage
COPY --from=build /app/dist ./dist

# Non-root user for security
USER bun

EXPOSE 3000

# Run the production server
CMD ["bun", "run", "prod"]