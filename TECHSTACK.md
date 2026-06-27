# TECHSTACK

## 1. Product Overview

`dbdocgen` is an npm package and CLI tool that generates database documentation from a database schema.

The database schema is the single source of truth. Backend source code is used only as optional context for AI enrichment.

## 2. Core Principle

```txt
Database schema / live DB = Single Source of Truth
Backend source code       = Optional context enrichment
AI                        = Description/context generator
Exporters                 = Document generators
```

The tool must never allow AI or source code analysis to override database facts.

Database facts include:

```txt
- table name
- column name
- column type
- nullable
- default value
- primary key
- foreign key
- index
- unique constraint
- check constraint
- table comment
- column comment
```

## 3. Recommended Tech Stack

### Language

```txt
TypeScript
```

Reason:

```txt
- Best fit for npm package distribution
- Good CLI ecosystem
- Easy integration with Node.js backend projects
- Strong type system for normalized database metadata
- Easier plugin architecture
```

### Runtime

```txt
Node.js >= 20
```

### Package Manager

```txt
pnpm
```

### Build Tool

```txt
tsup
```

Reason:

```txt
- Simple TypeScript build
- Supports ESM/CJS output
- Good for npm libraries and CLIs
```

### CLI Framework

```txt
commander
```

Alternative:

```txt
yargs
```

Recommended MVP choice:

```txt
commander
```

### Config Loader

```txt
cosmiconfig
```

Supported config files:

```txt
dbdocgen.config.ts
dbdocgen.config.js
dbdocgen.config.json
.dbdocgenrc
```

### Schema Validation

```txt
zod
```

Used for:

```txt
- config validation
- AI response validation
- internal metadata model validation
```

## 4. SQL / Database Schema Parsing

### MVP Input

```txt
schema.sql
```

### Future Input

```txt
live database connection
```

### SQL Parser

Recommended:

```txt
node-sql-parser
```

Optional dialect-specific parsers:

```txt
pgsql-ast-parser
pg-query-parser
```

### Supported Dialects for MVP

Recommended MVP target:

```txt
PostgreSQL
MySQL / MariaDB
```

SQLite and SQL Server can be added later.

## 5. Backend Source Context Scanner

Backend source code is optional and used only to enrich context.

The source scanner should not be a deterministic framework parser in MVP. Instead, it should retrieve relevant source files and let AI summarize useful business context.

### Source Scanner Responsibilities

```txt
- scan source tree
- filter relevant files
- chunk source files
- find table-related context
- send compact context to AI
- receive structured JSON enrichment
```

### Recommended File Matching

General:

```txt
**/*entity*.*
**/*model*.*
**/*schema*.*
**/*repository*.*
**/*service*.*
**/*controller*.*
**/*dto*.*
**/*enum*.*
**/*constant*.*
**/migration*/**
**/migrations/**
```

Node.js / TypeScript:

```txt
**/*.ts
**/*.tsx
**/*.js
**/*.jsx
```

Ruby on Rails:

```txt
app/models/**
app/controllers/**
app/services/**
db/migrate/**
```

Laravel:

```txt
app/Models/**
app/Http/Controllers/**
app/Services/**
database/migrations/**
```

Python:

```txt
**/*.py
```

Java:

```txt
**/*.java
```

### Exclude Patterns

```txt
**/node_modules/**
**/dist/**
**/build/**
**/.next/**
**/coverage/**
**/.git/**
**/vendor/**
**/tmp/**
**/logs/**
```

## 6. AI Provider

### MVP Provider

```txt
9router
```

9router should be treated as an OpenAI-compatible provider.

### Provider Interface

The provider should be generic and OpenAI-compatible first.

```ts
type AiProviderConfig = {
  provider: "9router" | "openai" | "openai-compatible";
  baseURL?: string;
  apiKeyEnv: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
};
```

### OpenAI-Compatible Client

```ts
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env[config.ai.apiKeyEnv],
  baseURL: config.ai.baseURL,
});
```

### Example 9router Config

```ts
ai: {
  enabled: true,
  provider: "9router",
  baseURL: "http://localhost:20128/v1",
  apiKeyEnv: "NINE_ROUTER_API_KEY",
  model: "openai/gpt-4.1-mini",
  temperature: 0.2,
  maxTokens: 6000,
}
```

## 7. AI Rules / Prompt Config

AI rules must be stored outside source code so they can be edited without changing package code.

Recommended structure:

```txt
.ai/
  rules/
    system.md
    source-scan.md
    table-enrich.md
    column-enrich.md
    relationship-review.md
```

### Rule Loading

```txt
rulesDir: "./.ai/rules"
```

### Default Rules

The package should include default built-in rules.

If the user provides custom rules, custom rules override built-in rules.

## 8. Exporters

### Excel

Library:

```txt
exceljs
```

Output:

```txt
database_dictionary.xlsx
```

### Diagram

Recommended MVP:

```txt
Mermaid ERD
```

Optional renderers:

```txt
@mermaid-js/mermaid-cli
Graphviz
PlantUML
```

Output:

```txt
er_diagram.mmd
er_diagram.svg
er_diagram.png
```

### Markdown

Approach:

```txt
template-based generator
```

Output:

```txt
tables/*.md
DATABASE.md
```

### Word

Library:

```txt
docx
```

Output:

```txt
database_document.docx
```

### HTML

MVP options:

```txt
static HTML generator
```

Future options:

```txt
VitePress
Docusaurus
MkDocs-compatible Markdown output
```

Recommended MVP:

```txt
Generate static HTML directly from normalized metadata and Markdown files.
```

## 9. Testing

### Unit Test

```txt
vitest
```

### Test Fixtures

```txt
fixtures/
  postgres/basic-schema.sql
  mysql/basic-schema.sql
  source/nestjs-sample/
  source/rails-sample/
```

### Test Targets

```txt
- SQL parser
- metadata normalization
- Excel exporter
- Mermaid exporter
- Markdown exporter
- AI response parser
- config loader
```

## 10. Lint / Format

```txt
eslint
prettier
```

## 11. Release / Versioning

```txt
changesets
```

Used for:

```txt
- version bump
- changelog
- npm publish workflow
```

## 12. Suggested Package Structure

MVP should start as one package.

```txt
dbdocgen/
├── src/
│   ├── cli/
│   ├── core/
│   │   ├── model/
│   │   ├── pipeline/
│   │   └── config/
│   ├── parsers/
│   │   └── sql/
│   ├── source-scanner/
│   ├── ai/
│   │   ├── providers/
│   │   ├── rules/
│   │   ├── prompts/
│   │   ├── schemas/
│   │   ├── cache/
│   │   └── enrichers/
│   ├── exporters/
│   │   ├── excel/
│   │   ├── diagram/
│   │   ├── markdown/
│   │   ├── word/
│   │   └── html/
│   └── index.ts
├── fixtures/
├── examples/
├── docs/
├── package.json
├── pnpm-lock.yaml
├── tsconfig.json
└── tsup.config.ts
```

Future package split:

```txt
@dbdocgen/core
@dbdocgen/cli
@dbdocgen/parser-sql
@dbdocgen/exporter-excel
@dbdocgen/exporter-diagram
@dbdocgen/exporter-html
@dbdocgen/ai-openai-compatible
```

## 13. CLI Design

### Generate Documentation

```bash
dbdocgen generate \
  --schema ./database/schema.sql \
  --source ./src \
  --out ./docs/db \
  --format excel,markdown,html,diagram,word \
  --ai
```

### Generate Without AI

```bash
dbdocgen generate \
  --schema ./database/schema.sql \
  --out ./docs/db \
  --no-ai
```

### Override AI Config

```bash
dbdocgen generate \
  --schema ./database/schema.sql \
  --source ./src \
  --ai \
  --ai-provider 9router \
  --ai-base-url http://localhost:20128/v1 \
  --ai-model openai/gpt-4.1-mini
```

## 14. Programmatic API

```ts
import { generateDbDocs } from "dbdocgen";

await generateDbDocs({
  schema: "./database/schema.sql",
  source: {
    enabled: true,
    rootDir: "./src",
  },
  outDir: "./docs/db",
  formats: ["excel", "markdown", "html", "diagram", "word"],
  ai: {
    enabled: true,
    provider: "9router",
    baseURL: "http://localhost:20128/v1",
    apiKeyEnv: "NINE_ROUTER_API_KEY",
    model: "openai/gpt-4.1-mini",
  },
});
```

## 15. Recommended MVP Scope

### Included

```txt
- schema.sql input
- PostgreSQL/MySQL basic DDL parsing
- normalized database metadata model
- Excel Data Dictionary export
- Mermaid ERD export
- Markdown export
- static HTML export
- AI enrichment from source code
- configurable AI rules
- 9router provider via OpenAI-compatible API
- AI cache
- Review TODO output
```

### Excluded from MVP

```txt
- OpenAPI parser
- deterministic framework-specific source parser
- live DB introspection
- web UI
- advanced lineage analysis
- automatic business glossary approval flow
```

## 16. Future Roadmap

```txt
v0.1: schema.sql -> Excel + Mermaid + Markdown
v0.2: static HTML + Word export
v0.3: AI source scanner with 9router
v0.4: AI cache + review TODO + confidence scoring
v0.5: live DB introspection
v0.6: framework-specific source plugins
v0.7: optional OpenAPI plugin
v1.0: stable plugin API and npm public release
```
