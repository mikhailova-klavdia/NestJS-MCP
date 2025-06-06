# NestJS Practice App

A modular NestJS application demonstrating integration with LLMs (via LangChain + Ollama), Git repository tooling, RAG (Retrieval-Augmented Generation), and PostgreSQL using TypeORM. This starter project is fully dockerized and ready for local development and further extension.

## Table of Contents

- [Features](#features)
- [Configuration](#configuration)
- [Running the App](#running-the-app)
- [Modules Overview](#modules-overview)
- [API Endpoints](#api-endpoints)

## Features

- **Git Tools**: Clone and process Git repositories through a REST endpoint.
- **RAG**: Retrieval-Augmented Generation with similarity search over documents.
- **PostgreSQL**: TypeORM-based data persistence, ready for migrations.

## Configuration

The application uses `@nestjs/config`. Required environment variables:

```dotenv
# ───────── PostgreSQL (TypeORM) ─────────
POSTGRES_HOST=         # e.g. "localhost" or "postgres" (in Docker)
POSTGRES_PORT=5433     # default mapped port (see docker-compose.yml)
POSTGRES_USER=root     # database username
POSTGRES_PASSWORD=root # database password
POSTGRES_DB=test       # database name

# ─────────── Redis (BullMQ) ────────────
REDIS_HOST=            # e.g. "localhost" or "redis" (in Docker)
REDIS_PORT=6379        # default Redis port

# ─── LLM Provider (Ollama / LangChain) ──
MODEL_NAME=            # any ollama embedding model
OLLAMA_HOST=http://localhost:11434   # Ollama server URL (default)

# ─────────── App Settings ───────────────
PORT=3000              # NestJS server port (default: 3000)
```

## Running the App

- **Install all packages**:

  ```bash
  npm install
  ```

- **Run the docker-compose**:

  ```bash
  docker-compose up -d
  ```

- **Development mode** with hot reload:

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

**Generate coverage report for e2e test**

```bash
npm run test:cov:e2e
```

Produces a coverage report in the `coverage/` directory.

**Generate coverage report for unit test**

```bash
npm run test:cov:unit
```

Produces a coverage report in the `coverage/` directory.

## Modules Overview

- **Git Module** (`src/modules/git`): `GitController` and `GitService` for cloning and processing repos.
- **Identifiers Module** (`src/modules/identifiers`): Analyzes AST of the project, and extracts code nodes.
- **MCP Module** (`src/modules/mcp`): JSON-RPC tools over MCP protocol.
- **Project Module** (`src/modules/project`): CRUD API for `Project` entity.
- **RAG Module** (`src/modules/rag`): Implements retrieval-augmented generation and similarity search.
- **Data Module** (`src/data.module.ts`): Configures TypeORM and Postgres connection.


## API Endpoints

Below is a summary of the main REST endpoints. All paths assume the server is running on `http://localhost:3000` (or whatever `PORT` you’ve configured), with a global prefix of `/api`.

| Module      | Method | Path                       | Description                                                                                                   |
| ----------- | ------ | -------------------------- | ------------------------------------------------------------------------------------------------------------- |
| **Git**     | POST   | `/api/git/process`         | Stream a Git repository, extract identifiers and edges, and return the new project record.                    |
| **Git**     | POST   | `/api/git/clone`           | Clone a Git repository, extract identifiers and edges, and return the new project record.                     |
| **Git**     | PATCH  | `/api/git/:projectId/poll` | Trigger a manual “poll” for an existing project by its ID. Returns a success message once queued.             |
| **Project** | GET    | `/api/projects`            | List all saved project records (`ProjectEntity`).                                                             |
| **Project** | GET    | `/api/projects/:id`        | Retrieve a single project by its numeric ID.                                                                  |
| **Project** | POST   | `/api/projects`            | Create a new project record (metadata only).                                                                  |
| **Project** | PATCH  | `/api/projects/:id`        | Update an existing project’s metadata (name, description, repoUrl, localPath).                                |
| **Project** | DELETE | `/api/projects/:id`        | Delete a project by ID. Returns HTTP 204 No Content.                                                          |
| **RAG**     | POST   | `/api/rag/query`           | Run a similarity search over stored embeddings for a given project and return a context-aware LLM response.   |


### Example: Clone a Repository

**Request**

```bash
curl -X POST http://localhost:3000/api/git/clone \
  -H "Content-Type: application/json" \
  -d '{
    "repoUrl": "https://github.com/example/somerepo.git",
    "name": "MyRepo",
  }'
```


---

### Example: RAG Query

**Request**

```bash
curl -X POST http://localhost:3000/api/rag/query \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Explain the authentication flow in this codebase.",
    "projectId": 42,
    "topN": 5,
    "depth": 0
  }'
```

