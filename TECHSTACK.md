# TECHSTACK

## 1. Product Overview

`dbdocgen` is an npm package and CLI tool that generates database documentation from a SQL schema file.

The database schema is the single source of truth. The tool parses schema files and exports documentation in multiple formats.

## 2. Core Principle

```txt
Database schema = Single Source of Truth
Exporters       = Document generators
```

The tool must never allow any post-processing step to override database schema facts.

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

## 3. Tech Stack

### Language

```txt
TypeScript
```

Reasons:

```txt
- Best fit for npm package distribution
- Good CLI ecosystem
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

Reasons:

```txt
- Simple TypeScript build
- Supports ESM/CJS output
- Good for npm libraries and CLIs
```

### CLI Framework

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

```txt
node-sql-parser
```

Optional dialect-specific parsers (future):

```txt
pgsql-ast-parser
pg-query-parser
```

### Supported Dialects for MVP

```txt
PostgreSQL
MySQL / MariaDB
```

SQLite and SQL Server can be added later.

## 5. Exporters

### Excel

Library:

```txt
exceljs
```

Output:

```txt
database_dictionary.xlsx
```

Format: A5:SQL-style — one sheet per table with metadata header rows and a six-column definition table.

### Mermaid ER Diagram

```txt
er_diagram.mmd
```

No external renderer dependency in MVP. Future optional renderers:

```txt
@mermaid-js/mermaid-cli
```

### Markdown

Output:

```txt
tables/*.md
```

Format: per-table files, A5:SQL-style metadata and six-column definition table.

### Word

Library:

```txt
docx
```

Output:

```txt
database_document.docx
```

Format: A5:SQL-style metadata and column definition tables.

### HTML

Output:

```txt
html/tables/*.html
```

Format: per-table static HTML files with A5-style metadata, six-column definition table, and self-contained CSS.

## 6. Output Label i18n

All column headers and metadata labels are localized via a central `output-labels` module.

Supported languages:

```txt
en  English (default)
vi  Vietnamese
jp  Japanese
```

## 7. Testing

### Unit Test

```txt
vitest
```

### Test Fixtures

```txt
fixtures/
  postgres/basic-schema.sql
  mysql/basic-schema.sql
```

### Test Targets

```txt
- SQL parser
- metadata normalization
- Excel exporter
- Mermaid exporter
- Markdown exporter
- Word exporter
- HTML exporter
- config loader
- output labels (i18n)
```

## 8. Lint / Format

```txt
eslint
prettier
```

## 9. Release / Versioning

```txt
changesets
```

Used for:

```txt
- version bump
- changelog
- npm publish workflow
```

## 10. Package Structure

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
│   ├── exporters/
│   │   ├── excel/
│   │   ├── diagram/
│   │   ├── markdown/
│   │   ├── word/
│   │   ├── html/
│   │   └── shared/        # output-labels, sanitize, etc.
│   └── index.ts
├── fixtures/
├── tests/
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
@dbdocgen/exporter-markdown
@dbdocgen/exporter-html
@dbdocgen/exporter-word
```

## 11. CLI Design

### Generate documentation (timestamped output)

```bash
dbdocgen generate --schema ./database/schema.sql
```

### Generate with explicit output directory

```bash
dbdocgen generate --schema ./database/schema.sql --out ./docs/db
```

### Generate selective formats

```bash
dbdocgen generate \
  --schema ./database/schema.sql \
  --format excel,markdown,diagram
```

### Other commands

```bash
dbdocgen init                   # Create default config
dbdocgen validate               # Validate schema file
dbdocgen clean                  # Clean output directory
dbdocgen config show            # Show resolved config
dbdocgen config validate        # Validate config file
dbdocgen info                   # Show version and supported features
```

## 12. Programmatic API

```ts
import { generateDbDocs } from "dbdocgen";

const doc = await generateDbDocs({
  schema: "./database/schema.sql",
  outDir: "./docs/db",
  output: {
    formats: ["excel", "markdown", "html", "diagram", "word"],
    language: "en"
  }
});

console.log(doc.tables);    // Array of TableDoc
console.log(doc.warnings);  // Array of WarningDoc
```

## 13. MVP Scope

### Included

```txt
- schema.sql input
- PostgreSQL/MySQL basic DDL parsing
- normalized database metadata model
- Excel Data Dictionary export (A5 style)
- Mermaid ERD export
- Markdown export (per-table, A5 style)
- static HTML export (per-table, A5 style)
- Word export (A5 style)
- i18n output labels (en, vi, jp)
- timestamped output directory
- config file support (cosmiconfig)
```

### Excluded from MVP

```txt
- AI enrichment
- backend source code scanning
- OpenAPI parser
- live DB introspection
- web UI
- advanced lineage analysis
```

## 14. Future Roadmap

```txt
v0.1: schema.sql -> Excel + Mermaid + Markdown
v0.2: static HTML + Word + i18n labels
v0.3: live DB introspection
v0.4: framework-specific source plugins
v0.5: optional OpenAPI plugin
v1.0: stable plugin API and npm public release
```
