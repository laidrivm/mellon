# Mellon — Keep Your Secrets

A prototype of a local-first password manager. Built to support IAPMEI startup application №1561.

Stack:
- [Bun](https://bun.sh)
- [Biome](https://biomejs.dev/)
- [Simple Git Hooks](https://github.com/toplenboren/simple-git-hooks)
- [TypeScript](https://www.typescriptlang.org)
- [React](https://react.dev)
- [Normalize CSS](https://necolas.github.io/normalize.css)
- [Tailwind CSS](https://tailwindcss.com/)
- [Bun Plugin for Tailwind](https://www.npmjs.com/package/bun-plugin-tailwind)
- [PouchDB](https://pouchdb.com/) — on a client
- [CouchDB](https://couchdb.apache.org/) — on a server side
- [Nano](https://github.com/apache/couchdb-nano) — to connect to CouchDB from server
- [Uuidv7](https://github.com/LiosK/uuidv7) — to generate UUIDs v7 according to RFCs
- [Docker](https://www.docker.com)
- [Docker Compose](https://docs.docker.com/compose/)
- [Playwright](https://playwright.dev/)

## Development

To install dependencies:

```bash
bun install
```

To start a development server:

```bash
cp .env.example .env
cp local.ini.example local.ini
bun docker:couch
bun dev
```

To run for production:

```bash
bun run build
bun prod
```

The pre-push hook runs the e2e suite, which needs that CouchDB: `bun docker:couch` starts it and creates the system databases, and `bun docker:stop` stops it.

To bypass the hooks, use `SKIP_SIMPLE_GIT_HOOKS=1 git commit` or `SKIP_SIMPLE_GIT_HOOKS=1 git push`.

## CouchDB

CORS set up:

```bash
cp local.ini.example local.ini
```

## Docker

To build an image for local development:

```bash
docker build . -t mellon
```
or
```bash
bun docker:build
```

To run in a container:
```bash
docker run -d \
  --name mellon-app \
  -p 3000:3000 \
  -v ./.env:/app/.env \
  mellon
```
or
```bash
bun docker:run
```

To build an image for server shipment:

```bash
docker build --pull --platform linux/amd64 -t mellon . --tag your_resigtry_adress/mellon:latest
docker push your_resigtry_adress/mellon:latest
```

Run everything using `docker-compose up -d --build`.