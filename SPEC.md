# SPEC

## 1. Project Name

```txt
dbdocgen
```

## 2. Purpose

`dbdocgen` is a CLI and npm package for generating database documentation automatically from a database schema.

The tool reads a SQL schema file or, in future versions, a live database connection. It generates database documentation outputs such as Excel Data Dictionary, ER Diagram, Markdown documents, Word document, and static HTML documentation.

Backend source code can be scanned by AI to enrich descriptions and business context, but the database schema remains the single source of truth.

## 3. Problem Statement

Many projects have incomplete or outdated database documentation.

Common problems:

```txt
- table purpose is unclear
- column meaning is undocumented
- foreign keys are hard to understand
- ER diagrams are missing or outdated
- Excel DB definition files are manually maintained
- source code contains business meaning but is not reflected in DB documents
- new developers, QC, BA, and BrSE need time to understand the DB
```

The tool aims to reduce manual documentation effort and make DB documentation reproducible.

## 4. Core Concept

```txt
Database schema / live DB = Single Source of Truth
Backend source code       = Optional context enrichment
AI                        = Context and description generator
Generated outputs         = Documentation artifacts
```

## 5. Single Source of Truth Rule

The database schema is the only source of truth for database facts.

The following fields must always come from database schema or live DB introspection:

```txt
- table name
- column name
- data type
- nullable
- default value
- primary key
- foreign key
- indexes
- unique constraints
- check constraints
- table comments
- column comments
```

Backend source code and AI must never override these facts.

If source code conflicts with DB schema, the tool must:

```txt
1. keep the DB schema value
2. add a review TODO
3. record the conflict as a warning
```

## 6. MVP Scope

### Required Input

```txt
schema.sql
```

### Optional Input

```txt
backend source code directory
```

### MVP Outputs

```txt
- Excel Data Dictionary
- Mermaid ER Diagram
- ER Diagram PNG/SVG if renderer is available
- Markdown documentation
- Word documentation
- Static HTML documentation
```

### MVP AI Provider

```txt
9router via OpenAI-compatible API
```

### Explicitly Excluded from MVP

```txt
- OpenAPI file parsing
- API endpoint to table mapping
- deterministic source code parser per framework
- live database connection
- web UI
```

OpenAPI support can be added later as an optional plugin.

## 7. User Stories

### US-001: Generate DB documents from schema SQL

As a developer, I want to generate DB documents from `schema.sql` so that I can quickly create database documentation.

Acceptance Criteria:

```txt
Given schema.sql exists
When I run dbdocgen generate
Then the tool generates Excel, Markdown, Diagram, Word, and HTML outputs
```

### US-002: Generate documentation without AI

As a developer, I want to generate deterministic DB documentation without AI so that I can use the tool in restricted environments.

Acceptance Criteria:

```txt
Given --no-ai is provided
When I run dbdocgen generate
Then no AI request is executed
And documents are generated using only DB schema facts
```

### US-003: Enrich documentation using backend source code

As a developer, I want AI to scan backend source code and enrich table/column descriptions so that the generated documentation contains business context.

Acceptance Criteria:

```txt
Given source directory is configured
And AI is enabled
When I run dbdocgen generate
Then the tool scans relevant source files
And AI generates table/column descriptions
And every AI-generated description includes source, confidence, and needsReview
```

### US-004: Customize AI rules

As a developer, I want to customize AI rules by editing Markdown prompt files so that I can adapt the generated documentation to my project style.

Acceptance Criteria:

```txt
Given .ai/rules exists
When dbdocgen runs
Then custom rules are loaded
And custom rules override built-in default rules
```

### US-005: Use 9router as AI provider

As a developer, I want to use 9router as the MVP AI provider so that I can route requests to my preferred model.

Acceptance Criteria:

```txt
Given ai.provider is 9router
And ai.baseURL is configured
When AI enrichment runs
Then the tool sends requests through the OpenAI-compatible API
```

## 8. Functional Requirements

## FR-001: CLI Command

The tool must provide a CLI command:

```bash
dbdocgen generate
```

Supported options:

```txt
--schema <path>
--source <path>
--out <path>
--format <formats>
--ai
--no-ai
--ai-provider <provider>
--ai-base-url <url>
--ai-model <model>
--config <path>
```

## FR-002: Config File

The tool must support a config file.

Supported names:

```txt
dbdocgen.config.ts
dbdocgen.config.js
dbdocgen.config.json
.dbdocgenrc
```

Example:

```ts
import { defineConfig } from "dbdocgen";

export default defineConfig({
  schema: "./database/schema.sql",
  outDir: "./docs/db",

  context: {
    source: {
      enabled: true,
      rootDir: "./src",
      include: [
        "**/*.ts",
        "**/*.js",
        "**/*.rb",
        "**/*.php",
        "**/*.py",
        "**/*.java"
      ],
      exclude: [
        "**/node_modules/**",
        "**/dist/**",
        "**/build/**",
        "**/.next/**",
        "**/coverage/**",
        "**/.git/**"
      ]
    }
  },

  ai: {
    enabled: true,
    provider: "9router",
    baseURL: "http://localhost:20128/v1",
    apiKeyEnv: "NINE_ROUTER_API_KEY",
    model: "openai/gpt-4.1-mini",
    temperature: 0.2,
    maxTokens: 6000,
    rulesDir: "./.ai/rules"
  },

  output: {
    formats: ["excel", "markdown", "html", "diagram", "word"],
    language: "vi"
  }
});
```

## FR-003: SQL Schema Parser

The tool must parse `schema.sql` and extract:

```txt
- tables
- columns
- data types
- nullable
- default values
- primary keys
- foreign keys
- indexes
- unique constraints
- check constraints
- table comments
- column comments
```

## FR-004: Normalized Metadata Model

The tool must convert parsed DB schema to a normalized internal model.

Example:

```ts
type DatabaseDoc = {
  dialect: "postgres" | "mysql" | "mariadb" | "sqlite" | "mssql" | "unknown";
  tables: TableDoc[];
  relationships: RelationshipDoc[];
  indexes: IndexDoc[];
  warnings: WarningDoc[];
};

type TableDoc = {
  name: string;
  schema?: string;
  comment?: string;
  description?: EnrichedText;
  columns: ColumnDoc[];
  primaryKeys: string[];
  foreignKeys: ForeignKeyDoc[];
  indexes: IndexDoc[];
  reviewTodos: ReviewTodo[];
};

type ColumnDoc = {
  name: string;
  type: string;
  nullable: boolean;
  defaultValue?: string;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  comment?: string;
  description?: EnrichedText;
};

type EnrichedText = {
  value: string;
  source: "db_comment" | "backend_source" | "ai";
  confidence: "high" | "medium" | "low";
  needsReview: boolean;
};
```

## FR-005: Source Code Scanner

The tool must optionally scan backend source code.

The scanner must:

```txt
- walk the configured source directory
- include files matching include patterns
- exclude files matching exclude patterns
- identify files likely related to DB tables
- chunk large files
- prepare compact context for AI
```

The scanner should prioritize:

```txt
- entity files
- model files
- repository files
- service files
- controller files
- DTO files
- enum files
- constant files
- migration files
- raw SQL files
```

## FR-006: AI Enrichment

When AI is enabled, the tool must enrich DB documentation using source code context.

AI may generate:

```txt
- table purpose
- business description
- column description
- enum/status meaning
- source usage notes
- potential missing relation suggestions
- review TODOs
```

AI must not modify:

```txt
- table name
- column name
- type
- nullable
- default value
- PK
- FK
- index
- constraint
```

## FR-007: AI Rules

AI prompts and behavior rules must be configurable from Markdown files.

Default files:

```txt
.ai/rules/system.md
.ai/rules/source-scan.md
.ai/rules/table-enrich.md
.ai/rules/column-enrich.md
.ai/rules/relationship-review.md
```

If custom rule files exist, they override built-in rules.

## FR-008: AI Response Format

AI responses must be valid JSON.

Example output:

```json
{
  "table": "orders",
  "purpose": "Stores customer order information.",
  "confidence": "medium",
  "businessNotes": [
    "Created when a user completes checkout.",
    "Related to order items and payment processing."
  ],
  "columnDescriptions": {
    "status": {
      "description": "Represents the order processing status.",
      "source": "backend_source",
      "confidence": "medium",
      "needsReview": true
    }
  },
  "reviewTodos": ["Confirm exact status values with business owner."]
}
```

The tool must validate AI output with Zod.

Invalid AI responses must be handled safely:

```txt
- retry if possible
- if retry fails, skip enrichment for that target
- add warning
- continue generating docs
```

## FR-009: AI Cache

The tool should cache AI responses.

Cache key should include:

```txt
- table name
- DB metadata hash
- related source context hash
- rules hash
- model name
```

Purpose:

```txt
- reduce token cost
- speed up repeated generation
- avoid unnecessary AI calls
```

## FR-010: Excel Export

The tool must generate an Excel file:

```txt
database_dictionary.xlsx
```

Recommended sheets:

```txt
01_Table_List
02_Column_Dictionary
03_Relationships
04_Indexes
05_Constraints
06_AI_Descriptions
07_Source_Context
08_Review_TODO
09_Warnings
```

### 01_Table_List

Columns:

```txt
Table
Schema
Comment
Description
Description Source
Confidence
Need Review
Column Count
PK
```

### 02_Column_Dictionary

Columns:

```txt
Table
Column
Type
Nullable
Default
PK
FK
Unique
Index
DB Comment
Description
Description Source
Confidence
Need Review
```

### 03_Relationships

Columns:

```txt
From Table
From Column
To Table
To Column
Constraint Name
Source
Need Review
```

### 08_Review_TODO

Columns:

```txt
Type
Target
Issue
Suggestion
Source
```

## FR-011: Diagram Export

The tool must generate Mermaid ER Diagram.

Output:

```txt
er_diagram.mmd
```

If diagram renderer is available, also generate:

```txt
er_diagram.svg
er_diagram.png
```

Diagram facts must come from database schema only.

AI may add notes but must not create actual FK lines unless marked as suggestion.

## FR-012: Markdown Export

The tool must generate Markdown documentation.

Output example:

```txt
DATABASE.md
tables/users.md
tables/orders.md
```

Each table document should include:

```txt
- table name
- purpose
- DB comment
- columns
- primary key
- foreign keys
- indexes
- relationships
- source context notes
- review TODOs
```

## FR-013: Word Export

The tool must generate:

```txt
database_document.docx
```

The Word document should include:

```txt
- overview
- table list
- table details
- relationships
- review TODOs
- warnings
```

## FR-014: HTML Export

The tool must generate static HTML documentation.

Output:

```txt
html/index.html
html/tables/*.html
```

HTML documentation should support:

```txt
- table list
- table detail pages
- relationship links
- search-friendly structure
- warnings/review TODO section
```

## FR-015: Warnings and Review TODOs

The tool must generate warnings and review TODOs for:

```txt
- source code conflicts with DB schema
- AI low-confidence descriptions
- possible missing relation inferred from naming
- unknown enum/status values
- parser limitations
- unsupported SQL syntax
```

## 9. Non-Functional Requirements

## NFR-001: Safety Against Hallucination

The tool must clearly separate:

```txt
- DB facts
- source-derived context
- AI-generated descriptions
- AI suggestions
```

Every generated description should have:

```txt
- source
- confidence
- needsReview
```

## NFR-002: Deterministic Base Output

The tool must be able to generate documentation without AI.

This output should be stable and reproducible for the same schema input.

## NFR-003: Extensibility

The tool should use plugin-like interfaces.

```ts
interface ParserPlugin {
  name: string;
  parse(input: ParserInput): Promise<DatabaseDoc>;
}

interface ExporterPlugin {
  name: string;
  export(doc: DatabaseDoc, options: ExportOptions): Promise<void>;
}

interface EnricherPlugin {
  name: string;
  enrich(doc: DatabaseDoc, context: EnrichmentContext): Promise<DatabaseDoc>;
}
```

## NFR-004: Framework Agnostic MVP

The MVP must not depend on any specific backend framework.

Source scanning should be generic.

Framework-specific analyzers can be added later.

## NFR-005: Configurable Prompt Rules

Prompt/rule files must be editable by users.

Users should not need to modify package source code to change AI behavior.

## NFR-006: Failure Tolerance

If AI enrichment fails, the tool must still generate documentation from DB schema.

If one exporter fails, the tool should report the error clearly.

## NFR-007: npm Friendly

The package must be publishable to npm.

It should expose:

```txt
- CLI binary
- programmatic API
- TypeScript types
```

## 10. Output Directory Structure

Recommended output:

```txt
docs/db/
├── database_dictionary.xlsx
├── database_document.docx
├── DATABASE.md
├── er_diagram.mmd
├── er_diagram.svg
├── er_diagram.png
├── tables/
│   ├── users.md
│   └── orders.md
└── html/
    ├── index.html
    └── tables/
        ├── users.html
        └── orders.html
```

## 11. Example CLI Usage

### Basic

```bash
dbdocgen generate --schema ./database/schema.sql --out ./docs/db
```

### With Source Context and AI

```bash
dbdocgen generate \
  --schema ./database/schema.sql \
  --source ./src \
  --out ./docs/db \
  --format excel,markdown,html,diagram,word \
  --ai
```

### Without AI

```bash
dbdocgen generate \
  --schema ./database/schema.sql \
  --out ./docs/db \
  --no-ai
```

### With 9router Override

```bash
dbdocgen generate \
  --schema ./database/schema.sql \
  --source ./src \
  --ai \
  --ai-provider 9router \
  --ai-base-url http://localhost:20128/v1 \
  --ai-model openai/gpt-4.1-mini
```

## 12. Default AI Rules

### system.md

```md
You are a database documentation assistant.

Database schema is the single source of truth.

Use backend source code only as additional context.

Never override database facts:

- table name
- column name
- type
- nullable
- default value
- primary key
- foreign key
- index
- constraint

When unsure, set needsReview = true.
Return only valid JSON.
```

### table-enrich.md

```md
Analyze the provided table metadata and related source context.

Generate:

- table purpose
- business meaning
- important notes
- review TODOs

Do not invent facts.
Do not modify DB schema facts.
```

### column-enrich.md

```md
For each column, generate a concise business description.

Use priority:

1. DB comment
2. backend source context
3. naming convention inference

If inferred only from naming, confidence must be low or medium.
```

## 13. Development Roadmap

### v0.1

```txt
- CLI base
- config loader
- schema.sql parser
- normalized metadata model
- Excel exporter
- Mermaid exporter
```

### v0.2

```txt
- Markdown exporter
- static HTML exporter
- Word exporter
```

### v0.3

```txt
- source scanner
- AI rules loader
- 9router provider
- AI table/column enrichment
```

### v0.4

```txt
- AI cache
- confidence scoring
- review TODO output
- warning report
```

### v0.5

```txt
- live DB introspection
- improved SQL dialect support
```

### v0.6

```txt
- framework-specific source plugins
- TypeORM/Prisma/Rails/Laravel analyzers
```

### v0.7

```txt
- optional OpenAPI plugin
- API to table mapping
```

### v1.0

```txt
- stable CLI
- stable programmatic API
- stable plugin API
- public npm release
```

## 14. Final Design Decision

MVP should not include OpenAPI.

Final MVP input model:

```txt
Required:
- schema.sql

Optional:
- backend source directory
```

Final MVP rule:

```txt
DB schema decides facts.
Source code provides context.
AI writes descriptions.
Human reviews low-confidence parts.
```
