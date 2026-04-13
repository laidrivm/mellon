FROM oven/bun:1-slim

WORKDIR /app

COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile --production --ignore-scripts || bun install --production --ignore-scripts

COPY src ./src

USER bun

CMD ["bun", "src/index.ts"]
