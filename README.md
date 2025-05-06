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
POSTGRES_PORT=5432
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
| Git     | POST   | `/git/clone` | Clone a Git repo and index files            |
| RAG     | POST   | `/rag/query` | Query documents with context                |
