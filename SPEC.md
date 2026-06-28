# SPEC

## 1. Project Name

```txt
dbdocgen
```

## 2. Purpose

`dbdocgen` is a CLI and npm package for generating database documentation automatically from a SQL schema file.

The tool reads a SQL schema file, parses its structure, and generates documentation outputs: Excel Data Dictionary, Mermaid ER Diagram, Markdown documents, Word document, and static HTML documentation.

## 3. Problem Statement

Many projects have incomplete or outdated database documentation.

Common problems:

```txt
- table purpose is unclear
- column meaning is undocumented
- foreign keys are hard to understand
- ER diagrams are missing or outdated
- Excel DB definition files are manually maintained
- new developers, QC, BA, and BrSE need time to understand the DB
```

The tool aims to reduce manual documentation effort and make DB documentation reproducible.

## 4. Core Concept

```txt
Database schema = Single Source of Truth
Generated outputs = Documentation artifacts
```

## 5. Single Source of Truth Rule

The database schema is the only source of truth for database facts.

The following fields always come from the database schema:

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

## 6. MVP Scope

### Required Input

```txt
schema.sql
```

### MVP Outputs

```txt
- Excel Data Dictionary
- Mermaid ER Diagram
- Markdown documentation (per-table files)
- Word documentation
- Static HTML documentation (per-table files)
```

### Explicitly Excluded from MVP

```txt
- AI enrichment
- backend source code scanning
- OpenAPI file parsing
- API endpoint to table mapping
- live database connection
- web UI
```

## 7. User Stories

### US-001: Generate DB documents from schema SQL

As a developer, I want to generate DB documents from `schema.sql` so that I can quickly create database documentation.

Acceptance Criteria:

```txt
Given schema.sql exists
When I run dbdocgen generate
Then the tool generates Excel, Markdown, Diagram, Word, and HTML outputs
```

### US-002: Select output formats

As a developer, I want to choose which output formats to generate so that I can tailor the outputs to my project's needs.

Acceptance Criteria:

```txt
Given --format excel,markdown is provided
When I run dbdocgen generate
Then only Excel and Markdown files are generated
```

### US-003: Localized output labels

As a developer, I want documentation labels to be in my language so that the generated documents are readable for my team.

Acceptance Criteria:

```txt
Given output.language is set to "vi"
When I run dbdocgen generate
Then all column headers and metadata labels in all output files are in Vietnamese
```

### US-004: Timestamped output directory

As a developer, I want each generate run to output to a new directory so that previous runs are not overwritten.

Acceptance Criteria:

```txt
Given --out is not provided
When I run dbdocgen generate
Then output is written to ./output/db_doc_gen_{yymmddhhmm}
```

### US-005: Create a default config file

As a developer, I want to create a default config file so that I can commit project-level settings to the repository.

Acceptance Criteria:

```txt
Given dbdocgen init is run
Then a default dbdocgen.config.json is created in the project root
```

## 8. Functional Requirements

### FR-001: CLI Commands

The tool must provide the following CLI commands:

```txt
dbdocgen generate    Generate documentation from schema
dbdocgen init        Create a default config file
dbdocgen validate    Validate a SQL schema file
dbdocgen clean       Clean an output directory
dbdocgen config show     Show resolved configuration
dbdocgen config validate Validate config file
dbdocgen info        Show supported features and version
```

#### `generate` options

```txt
--schema <path>    Path to the SQL schema file
--out <path>       Output directory (default: ./output/db_doc_gen_{yymmddhhmm})
--format <list>    Comma-separated output formats: excel, markdown, html, diagram, word
--config <path>    Config file path (default: auto-detected)
```

### FR-002: Config File

The tool must support a config file discovered via cosmiconfig.

Supported names:

```txt
dbdocgen.config.ts
dbdocgen.config.js
dbdocgen.config.json
.dbdocgenrc
```

Example:

```json
{
  "schema": "./database/schema.sql",
  "output": {
    "formats": ["excel", "markdown", "html", "diagram", "word"],
    "language": "en"
  }
}
```

Config fields:

```txt
schema             Path to the SQL schema file
dialect            Dialect hint: postgres, mysql, mariadb, sqlite (auto-detected if omitted)
output.formats     Which output formats to generate (default: all)
output.language    Label language: en (default), vi, jp
```

### FR-003: SQL Schema Parser

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

### FR-004: Normalized Metadata Model

The tool must convert parsed DB schema to a normalized internal model.

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
  columns: ColumnDoc[];
  primaryKeys: string[];
  foreignKeys: ForeignKeyDoc[];
  indexes: IndexDoc[];
};

type ColumnDoc = {
  name: string;
  type: string;
  nullable: boolean;
  defaultValue?: string;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  comment?: string;
};
```

### FR-005: Excel Export (A5:SQL style)

The tool must generate an Excel file:

```txt
database_dictionary.xlsx
```

Format: one sheet per table, A5:SQL-style layout.

Each sheet includes:

```txt
- metadata header rows (table name, comment, column count, PK)
- column definition table with columns:
  物理名 | 論理名 | 型 | 必須 | デフォルト値 | 備考
  (localized based on output.language)
```

### FR-006: Mermaid ER Diagram Export

The tool must generate a Mermaid ER diagram:

```txt
er_diagram.mmd
```

Diagram facts must come from database schema only.

### FR-007: Markdown Export (A5:SQL style)

The tool must generate per-table Markdown files:

```txt
tables/<tablename>.md
```

Each file includes A5-style metadata and a six-column definition table.

### FR-008: Word Export (A5:SQL style)

The tool must generate:

```txt
database_document.docx
```

The Word document includes all tables with A5-style metadata and column definition tables.

### FR-009: HTML Export (A5:SQL style)

The tool must generate per-table static HTML files:

```txt
html/tables/<tablename>.html
```

Each file includes A5-style metadata, a styled six-column definition table, and self-contained CSS.

### FR-010: Output Labels i18n

All output labels (column headers, metadata field names) must be localizable.

Supported languages:

```txt
en  English (default)
vi  Vietnamese
jp  Japanese
```

Label sets must be centralized in a shared `output-labels` module.

### FR-011: Warnings

The tool must collect and report warnings for:

```txt
- parser limitations
- unsupported SQL syntax
- exporter errors
```

Warnings are printed to stdout at the end of a generate run.

## 9. Non-Functional Requirements

### NFR-001: Deterministic Output

The tool must generate stable, reproducible documentation for the same schema input.

### NFR-002: Extensibility

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
```

### NFR-003: Failure Tolerance

If one exporter fails, the tool must report the error clearly and continue generating remaining formats.

### NFR-004: npm Friendly

The package must be publishable to npm and expose:

```txt
- CLI binary
- programmatic API
- TypeScript types
```

## 10. Output Directory Structure

Default output per run:

```txt
output/db_doc_gen_2606281845/
├── database_dictionary.xlsx
├── database_document.docx
├── er_diagram.mmd
├── tables/
│   ├── users.md
│   └── orders.md
└── html/
    └── tables/
        ├── users.html
        └── orders.html
```

## 11. Example CLI Usage

### Basic (auto timestamped output)

```bash
dbdocgen generate --schema ./database/schema.sql
```

### Explicit output directory

```bash
dbdocgen generate --schema ./database/schema.sql --out ./docs/db
```

### Selective formats

```bash
dbdocgen generate \
  --schema ./database/schema.sql \
  --format excel,markdown,diagram
```

### With config file

```bash
dbdocgen generate --config ./dbdocgen.config.json
```

## 12. Development Roadmap

### v0.1

```txt
- CLI base
- config loader
- schema.sql parser
- normalized metadata model
- Excel exporter (A5 style)
- Mermaid exporter
```

### v0.2

```txt
- Markdown exporter (per-table, A5 style)
- static HTML exporter (per-table, A5 style)
- Word exporter (A5 style)
- i18n output labels (en, vi, jp)
- timestamped output directory
```

### v0.3 (future)

```txt
- live DB introspection
- improved SQL dialect support
```

### v0.4 (future)

```txt
- framework-specific source plugins
- TypeORM/Prisma/Rails/Laravel analyzers
```

### v0.5 (future)

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

## 13. Final Design Decision

MVP input:

```txt
Required:
- schema.sql
```

MVP rule:

```txt
DB schema decides facts.
Outputs reflect exactly what the schema declares.
```
