# Mellon — Keep Your Secrets

A prototype of a local-first password manager. Built to support IAPMEI startup application №1561.

Stack:
- [Bun](https://bun.sh)
- [Prettier](https://prettier.io)
- [ESLint](https://eslint.org)
- [TypeScript](https://www.typescriptlang.org)
- [React](https://react.dev)
- [Normalize CSS](https://necolas.github.io/normalize.css)
- [Tailwind CSS](https://tailwindcss.com/)
  - [Prettier Plugin for Tailwind](https://github.com/tailwindlabs/prettier-plugin-tailwindcss)
  - [Bun Plugin for Tailwind](https://www.npmjs.com/package/bun-plugin-tailwind)
- [PouchDB](https://pouchdb.com/) — on a client
- [CouchDB](https://couchdb.apache.org/) — on a server side
- [Nano](https://github.com/apache/couchdb-nano) — to connect to CouchDB from server
- [Uuid.js](https://github.com/uuidjs/uuid) — to generate UUIDs v7 according to RFCs
-   [Docker](https://www.docker.com)
-   [Docker Compose](https://docs.docker.com/compose/)

## Development

To install dependencies:

```bash
bun install
```

To start a development server:

```bash
cp .env.example .env
bun db
bun dev
```

To run for production:

```bash
bun start
```
`build` currently doesn't work

## Docker

To build an image for local development:

```bash
docker build . -t mellon
```

To run in a container:
```bash
docker run -d \
  --name mellon-app \
  -p 3000:3000 \
  -v ./.env:/app/.env \
  mellon
```

To build an image for server shipment:

```bash
docker build --pull --platform linux/amd64 -t mellon . --tag your_resigtry_adress/mellon:latest
docker push your_resigtry_adress/mellon:latest
```

`docker-compose.yml` to run everything using `docker compose up -d`:
```yaml
services:
  mellon-app:
    image: your_resigtry_adress/mellon:latest
    container_name: mellon-app
    volumes:
      -./.env:/app/.env
    depends_on:
      - mellon-couchdb
    networks:
      - web-network
    restart: always

  mellon-couchdb:
    image: couchdb:latest
    container_name: mellon-couchdb
    environment:
      - COUCHDB_USER=your_admin_name
      - COUCHDB_PASSWORD=your_admin_password
      - COUCHDB_BIND_ADDRESS=0.0.0.0
      - COUCHDB_SECRET=your_secret_here
      - NODENAME=mellon-couchdb
    volumes:
      - couchdb-data:/opt/couchdb/data
      - ./local.ini:/opt/couchdb/etc/local.d/local.ini
    networks:
      - web-network
    restart: always

volumes:
  couchdb-data:

networks:
  web-network:
    external: true
```
