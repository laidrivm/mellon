# Start with the official Bun image
FROM oven/bun:latest AS base

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json bun.lock* ./

# Install all dependencies (including dev for build)
RUN bun install --frozen-lockfile

# Copy source files
COPY src ./src
COPY tsconfig.json biome.json build.ts ./

# Build the application
RUN bun run build

# Production stage
FROM oven/bun:latest AS production

WORKDIR /app

# Copy package files and install production deps only
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile --production

# Copy built files
COPY --from=base /app/dist ./dist

# Expose the port
EXPOSE 3000

# Run the built server
CMD ["bun", "run", "start"]