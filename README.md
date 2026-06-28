# dbdocgen

Generate database documentation from SQL schema files.

`dbdocgen` parses a SQL schema (DDL), normalizes it into a structured metadata model, and exports documentation in multiple formats — Excel, Markdown, HTML, Mermaid ER diagram, and Word — from a single CLI command or programmatic API.

The database schema is the **single source of truth**. All table names, column types, constraints, and relationships come directly from the parsed SQL file.

## Features

- Parse `schema.sql` (PostgreSQL, MySQL/MariaDB primary support)
- Export to 5 formats: Excel, Markdown, HTML, Mermaid, Word
- A5:SQL-style layout: per-table definition tables with metadata headers
- Excel workbook with **Overview** sheet (summary + hyperlinks) and one sheet per table
- HTML with **index page** and per-table detail pages (PK/FK highlighting)
- Localized output labels: English (`en`) and Japanese (`jp`)
- Timestamped output directory per run (`./output/db_doc_gen_{yymmddhhmm}`)
- Step-by-step progress logging during generation
- Config file support via [cosmiconfig](https://github.com/cosmiconfig/cosmiconfig)
- Programmatic API for integration into CI or custom tooling

## Requirements

- Node.js >= 20
- pnpm (for development)

## Installation

```bash
# Global install
npm install -g @cuongph.dev/dbdocgen

# Project dev dependency
pnpm add -D @cuongph.dev/dbdocgen
```

## Quick Start

```bash
# 1. Create a config file
dbdocgen init

# 2. Edit dbdocgen.config.json — set your schema path

# 3. Generate documentation (output → ./output/db_doc_gen_{yymmddhhmm})
dbdocgen generate

# Or pass options directly
dbdocgen generate --schema ./database/schema.sql --out ./output
```

### Development (from source)

```bash
git clone <repo>
cd db_document_tool
pnpm install
pnpm dev generate --schema ./database/schema.sql
```

## CLI Reference

### `generate`

Generate database documentation from a SQL schema file.

```bash
dbdocgen generate [options]
```

| Option | Description |
| ------ | ----------- |
| `--schema <path>` | Path to the SQL schema file (default: from config or `./schema.sql`) |
| `--out <path>` | Parent output directory (default: `./output`; each run creates `db_doc_gen_{yymmddhhmm}` inside) |
| `--format <list>` | Comma-separated formats: `excel`, `markdown`, `html`, `diagram`, `word` (default: all) |
| `--config <path>` | Config file path (default: auto-detected) |

**Progress output example:**

```
[dbdocgen] Loading configuration...
[dbdocgen] Configuration loaded
  schema: ./database/schema.sql
  outputParent: ./output
  outDir: ./output/db_doc_gen_2606281947
  formats: excel, markdown, html, diagram, word
  language: en
[dbdocgen] Reading schema file
[dbdocgen] Parsing schema
  dialect: auto-detect
[dbdocgen] Schema parsed
  tables: 53
  warnings: 1
  dialect: mysql
[dbdocgen] Exporting excel output
...
[dbdocgen] Generation complete
```

### `init`

Create a default `dbdocgen.config.json` in the current directory.

```bash
dbdocgen init
dbdocgen init --force   # overwrite existing config
```

### `validate`

Parse and validate a SQL schema file without generating documentation.

```bash
dbdocgen validate
dbdocgen validate --schema ./database/schema.sql
```

### `clean`

Remove the output directory.

```bash
dbdocgen clean --out ./output
```

### `config show`

Print the resolved configuration (merges config file + CLI defaults).

```bash
dbdocgen config show
dbdocgen config show --config ./custom.config.json
```

### `config validate`

Validate the config file against the schema.

```bash
dbdocgen config validate
```

### `info`

Show version and supported features.

```bash
dbdocgen info
```

## Configuration

dbdocgen discovers config files automatically via cosmiconfig. Supported names (in project root):

| File | Format |
| ---- | ------ |
| `dbdocgen.config.json` | JSON |
| `dbdocgen.config.js` | JavaScript (ESM) |
| `.dbdocgenrc` | JSON or YAML |

CLI options override config file values.

### Example `dbdocgen.config.json`

```json
{
  "schema": "./database/schema.sql",
  "dialect": "mysql",
  "output": {
    "formats": ["excel", "markdown", "html", "diagram", "word"],
    "language": "en"
  }
}
```

### Config fields

| Field | Type | Default | Description |
| ----- | ---- | ------- | ----------- |
| `schema` | `string` | `"./schema.sql"` | Path to the SQL schema file |
| `dialect` | `string` | auto-detected | SQL dialect hint: `postgres`, `mysql`, `mariadb`, `sqlite`, `mssql` |
| `output.formats` | `string[]` | all formats | Which output formats to generate |
| `output.language` | `string` | `"en"` | Label language: `en` or `jp` |
| `outDir` | `string` | `"./output"` | Parent folder for generated runs (`{outDir}/db_doc_gen_{yymmddhhmm}`) |

## Output Structure

Each `generate` run writes to a dedicated directory:

```
output/db_doc_gen_2606281947/
├── database_dictionary.xlsx    # Excel — Overview + ER Diagram + one sheet per table
├── database_document.docx      # Word document (all tables + ER diagram)
├── er_diagram.mmd              # Mermaid ER diagram (when `diagram` format is enabled)
├── er_diagram.png              # PNG preview of ER diagram (excel/word/markdown/html)
├── ER_DIAGRAM.md               # Standalone Mermaid ER diagram (markdown format)
├── tables/
│   ├── users.md                # Per-table Markdown
│   └── orders.md
└── html/
    ├── index.html              # Table list with links
    ├── er-diagram.html         # Interactive Mermaid ER diagram page
    └── tables/
        ├── users.html          # Per-table HTML
        └── orders.html
```

### Output formats

| Format | Output file(s) | Description |
| ------ | -------------- | ----------- |
| `excel` | `database_dictionary.xlsx`, `er_diagram.png` | A5:SQL-style workbook with **Overview**, **ER Diagram** sheet (PNG + Mermaid source), and per-table sheets |
| `markdown` | `tables/<name>.md`, `ER_DIAGRAM.md` | Per-table Markdown + standalone Mermaid ER diagram file |
| `html` | `html/index.html`, `html/er-diagram.html`, `html/tables/<name>.html` | Index page, interactive Mermaid ER page, and per-table pages |
| `diagram` | `er_diagram.mmd` | Mermaid `erDiagram` source only |
| `word` | `database_document.docx`, `er_diagram.png` | Word document with overview, ER diagram section (PNG), and all tables |

### A5:SQL-style column definition

All text exporters (Excel, Markdown, HTML, Word) use the same ten-column definition table:

| Physical Name | Logical Name | Type | Size | Required | Default Value | Min | Max | Unique | Notes |
| ------------- | ------------ | ---- | ---- | -------- | ------------- | --- | --- | ------ | ----- |
| `id` | | `bigint` | | Yes | `-` | | | No | PK |
| `email` | | `varchar(255)` | `255` | Yes | `-` | | | Yes | |
| `age` | | `int` | | Yes | `-` | `0` | `150` | No | CHECK |

- **Size** — length/precision from the column type (e.g. `varchar(128)` → `128`, `numeric(12,2)` → `12,2`)
- **Min / Max** — extracted from `CHECK` constraints when possible
- **Unique** — column-level `UNIQUE`, table `UNIQUE` constraints, and `UNIQUE` indexes
- **Notes** — PK/FK markers, composite unique labels, CHECK expressions, comments

Column headers are localized based on `output.language` (e.g. Japanese: 物理名 | 論理名 | 型 | 桁数 | 必須 | デフォルト値 | 最小値 | 最大値 | 一意 | 備考).

### Excel workbook layout

**Overview sheet**

- Title bar with document name
- Summary: dialect, table count, relationship count
- Table list with columns: `#`, Table, Logical Name, Columns, Primary Key, Foreign Keys, Indexes
- Hyperlinks from table names to their detail sheets
- Auto-filter enabled on the table list

**ER Diagram sheet**

- Title bar with ER diagram heading
- Embedded PNG preview (ELK layered layout + orthogonal edge routing; also written as `er_diagram.png`)
- Mermaid source block for copy/paste into Mermaid-compatible tools

**Per-table sheet**

- Title bar with table physical name
- `← Overview` back-link
- Metadata block: physical name, logical name, column count, PK, FK, indexes
- Column definition table with PK rows highlighted (yellow) and FK rows (blue)
- PK/FK markers in the Notes column

### HTML layout

- `html/index.html` — summary cards + sortable table list with links to each table and ER diagram
- `html/er-diagram.html` — interactive Mermaid ER diagram with **pan, zoom, fit, reset** controls
- `html/tables/<name>.html` — metadata, column table, PK/FK row highlighting, back link to index

### ER diagram embedding

When you generate `excel`, `html`, `markdown`, or `word` output, an ER diagram is embedded automatically — you do not need to enable the `diagram` format separately.

| Output | ER diagram location |
| ------ | ------------------- |
| Excel | **ER Diagram** worksheet (ELK orthogonal PNG + Mermaid source text) |
| HTML | `html/er-diagram.html` (linked from index) |
| Markdown | `ER_DIAGRAM.md` (fenced `mermaid` block) |
| Word | ER Diagram section after overview (PNG + Mermaid source) |

The standalone `diagram` format still writes `er_diagram.mmd` for tooling that consumes raw Mermaid files.

### Output languages

| Language | Config value | Notes |
| -------- | ------------ | ----- |
| English | `"en"` (default) | All labels in English |
| Japanese | `"jp"` | Column headers and metadata labels in Japanese |

Set via config or ensure `output.language` is set before generation:

```json
{ "output": { "language": "jp" } }
```

### Logical names and comments

**Logical Name** and **Notes** columns reflect SQL `COMMENT` annotations from the schema. If your schema has no comments, these fields show `(none)`.

To populate them, add comments in your DDL:

```sql
CREATE TABLE users (
  id   BIGINT NOT NULL COMMENT 'User ID',
  name VARCHAR(255) COMMENT 'Display name'
) COMMENT='Application users';
```

## Programmatic API

```ts
import { generateDbDocs } from "@cuongph.dev/dbdocgen";

const doc = await generateDbDocs({
  schema: "./database/schema.sql",
  outDir: "./docs/db",
  dialect: "mysql",          // optional — auto-detected if omitted
  output: {
    formats: ["excel", "markdown", "html", "diagram", "word"],
    language: "en"
  },
  onProgress: (event) => {
    console.log(event.step, event.message, event.detail);
  }
});

console.log(doc.tables);    // TableDoc[]
console.log(doc.warnings);  // WarningDoc[]
```

### Exported symbols

```ts
import {
  generateDbDocs,
  parseSqlSchema,
  loadConfig,
  exportExcelDictionary,
  exportMarkdownDocs,
  exportHtmlDocs,
  exportMermaidDiagram,
  exportWordDocument,
  renderMermaid,
  databaseDocSchema,
  version
} from "@cuongph.dev/dbdocgen";

import type {
  DbdocgenConfig,
  DatabaseDoc,
  TableDoc,
  ColumnDoc,
  GenerateDbDocsOptions,
  OutputFormat
} from "@cuongph.dev/dbdocgen";
```

### Use individual exporters

```ts
import { parseSqlSchema, exportExcelDictionary } from "@cuongph.dev/dbdocgen";
import { readFile } from "node:fs/promises";

const sql = await readFile("./schema.sql", "utf8");
const doc = await parseSqlSchema(sql, { dialect: "mysql" });

await exportExcelDictionary(doc, { outDir: "./out", language: "jp" });
```

## How It Works

```
schema.sql
    │
    ▼
 SQL Parser (node-sql-parser)
    │
    ▼
 Normalized Metadata Model (DatabaseDoc)
    │
    ├──► Excel Exporter   → database_dictionary.xlsx
    ├──► Markdown Exporter → tables/*.md
    ├──► HTML Exporter    → html/index.html + html/tables/*.html
    ├──► Mermaid Exporter  → er_diagram.mmd
    └──► Word Exporter     → database_document.docx
```

### Metadata model

The internal `DatabaseDoc` structure contains:

- `dialect` — detected SQL dialect
- `tables[]` — table name, comment, columns, primary keys, foreign keys, indexes
- `relationships[]` — FK relationships derived from schema
- `indexes[]` — standalone index definitions
- `warnings[]` — parser limitations, unsupported syntax

Schema facts (names, types, constraints) are never modified after parsing.

## Tech Stack

| Layer | Technology |
| ----- | ---------- |
| Language | TypeScript |
| Runtime | Node.js >= 20 |
| Package manager | pnpm |
| Build | tsup (ESM + CJS) |
| CLI | commander |
| Config | cosmiconfig |
| Validation | zod |
| SQL parser | node-sql-parser |
| Excel | exceljs |
| Word | docx |
| Tests | vitest |
| Lint / format | eslint, prettier |

## Project Structure

```
src/
├── cli/index.ts              # CLI entry point
├── core/
│   ├── config/               # Config schema, loader, defaults
│   ├── model/                # DatabaseDoc types + Zod validation
│   └── pipeline/             # generateDbDocs orchestration
├── parsers/sql/              # SQL parser + normalizer
├── exporters/
│   ├── excel/                # A5-style Excel workbook
│   ├── markdown/             # Per-table Markdown
│   ├── html/                 # Index + per-table HTML
│   ├── diagram/              # Mermaid ER diagram
│   ├── word/                 # Word document
│   └── shared/               # i18n output labels
└── index.ts                  # Public API barrel
```

## Development

```bash
pnpm install          # install dependencies
pnpm dev generate     # run CLI from source (tsx)
pnpm test             # run tests
pnpm typecheck        # TypeScript check
pnpm build            # build dist/
pnpm lint             # eslint
pnpm format           # prettier
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full guide on contributing and publishing to npm.

## Limitations

| Limitation | Notes |
| ---------- | ----- |
| Static SQL only | No live database connection |
| Single schema file | No multi-file glob support yet |
| Dialect coverage | PostgreSQL and MySQL/MariaDB are primary targets |
| No incremental gen | Each run regenerates all output files |
| No web UI | Outputs are static files |
| Comments required for logical names | Logical Name fields need SQL `COMMENT` annotations |

## Roadmap

| Version | Planned |
| ------- | ------- |
| v0.3 | Live DB introspection |
| v0.4 | Framework-specific source plugins |
| v0.5 | Optional OpenAPI plugin |
| v1.0 | Stable plugin API, npm public release |

## License

MIT
