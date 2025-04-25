# Start with the official Bun image
FROM oven/bun:latest AS base

# Set working directory
WORKDIR /app

# Copy package.json and bun.lockb (if exists)
COPY package*.json bun.lockb* ./

# Install dependencies
RUN bun install --frozen-lockfile --production

# Copy the rest of the application
COPY . .

# Expose the port your app runs on
EXPOSE 3000

# Command to run in production mode
CMD ["bun", "run", "start"]