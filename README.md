# NestJS Practice App

A modular NestJS application demonstrating integration with LLMs (via LangChain + Ollama), Git repository tooling, RAG (Retrieval-Augmented Generation), and PostgreSQL using TypeORM. This starter project is fully dockerized and ready for local development and further extension.

## Table of Contents

* [Features](#features)
* [Configuration](#configuration)
* [Running the App](#running-the-app)
* [Modules Overview](#modules-overview)
* [API Endpoints](#api-endpoints)


## Features

* **Git Tools**: Clone and process Git repositories through a REST endpoint.
* **RAG**: Retrieval-Augmented Generation with similarity search over documents.
* **PostgreSQL**: TypeORM-based data persistence, ready for migrations.


## Configuration

The application uses `@nestjs/config`. Required environment variables:

```dotenv
# postgres
POSTGRES_HOST=
POSTGRES_PORT=5433
POSTGRES_USER=
POSTGRES_PASSWORD=
POSTGRES_DB=

# redis
REDIS_HOST=
REDIS_PORT=6379

# LLM Provider configuration
MODEL_NAME=
OLLAMA_HOST=http://localhost:11434


```

## Running the App

* **Development mode** with hot reload:

  ```bash
  npm run start:dev
  ```


## Testing the App

**Run unit tests**

```bash
npm run test:unit
```

Executes Jest’s suite of utility and service-level tests. No external services (Redis, Postgres) are required.

**Run end-to-end tests**

```bash
npm run test:e2e
```

Executes the E2E test suite against your running application. Ensure Redis and PostgreSQL are up (e.g., via `docker-compose up -d`) before running.

**Run all tests (unit + E2E)**

```bash
npm run test
```

Runs both unit and end-to-end tests in a single command. Make sure any required Docker services are running.

**Generate coverage report**

```bash
npm run test:cov
```

Produces a coverage report in the `coverage/` directory.


## Modules Overview

* **Git Module** (`src/modules/git`): `GitController` and `GitService` for cloning and processing repos.
* **Identifiers Module** (`src/modules/identifiers`): Analyzes AST of the project, and extracts code nodes.
* **MCP Module** (`src/modules/mcp`): JSON-RPC tools over MCP protocol.
* **Project Module** (`src/modules/project`): CRUD API for `Project` entity.
* **RAG Module** (`src/modules/rag`): Implements retrieval-augmented generation and similarity search.
* **Data Module** (`src/data.module.ts`): Configures TypeORM and Postgres connection.

## API Endpoints

| Module  | Method | Path         | Description                                 |
| ------- | ------ | ------------ | ------------------------------------------- |
| Git     | POST   | `/api/git/clone` | Clone a Git repo and index files            |
| RAG     | POST   | `/api/rag/query` | Query documents with context                |
