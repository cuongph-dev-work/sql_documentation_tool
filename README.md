# dbdocgen

Generate database documentation from SQL schema files.

Parse your SQL schema, enrich it with AI, and export to Excel, Markdown, HTML,
Mermaid diagrams, and Word — all from a single CLI command.

## Installation

```bash
# Global install
npm install -g dbdocgen

# Project dev dependency
pnpm add -D dbdocgen
```

Requires Node.js >= 20.

## Quick Start

```bash
dbdocgen generate --schema ./database/schema.sql --out ./docs/db
```

That's it. dbdocgen parses your schema, exports docs in all five formats, and
optionally enriches descriptions with AI.

## CLI Options

```
Usage: dbdocgen generate [options]

Options:
  --schema <path>          Path to the SQL schema file (required)
  --source <path>          Backend source directory for source-context scanning
  --out <path>             Output directory (default: "./docs/db")
  --format <formats>       Comma-separated output formats:
                           excel, markdown, html, diagram, word
                           (default: all formats)
  --ai                     Enable AI enrichment (default)
  --no-ai                  Disable AI enrichment
  --ai-provider <provider> AI provider: 9router, openai, openai-compatible
                           (default: "9router")
  --ai-base-url <url>      OpenAI-compatible base URL for custom providers
  --ai-model <model>       AI model to use (default: "openai/gpt-4.1-mini")
  --config <path>          Path to a config file (default: auto-detected)
  -h, --help               Display help for command
```

## Configuration File

dbdocgen uses [cosmiconfig](https://github.com/cosmiconfig/cosmiconfig) for
auto-discovery. Create any of these in your project root:

- `dbdocgen.config.js`
- `.dbdocgenrc` (JSON or YAML)
- `dbdocgen` key in `package.json`

### Example `dbdocgen.config.js`

```js
/** @type {import('dbdocgen').DbdocgenConfig} */
export default {
  schema: "./database/schema.sql",
  outDir: "./docs/db",
  output: {
    formats: ["excel", "markdown", "html", "diagram", "word"],
    language: "en"
  },
  ai: {
    enabled: true,
    provider: "9router",
    baseURL: "https://9router.ai/v1",
    apiKeyEnv: "NINE_ROUTER_API_KEY",
    model: "openai/gpt-4.1-mini",
    temperature: 0.2,
    maxTokens: 6000,
    rulesDir: "./.ai/rules"
  },
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
      exclude: ["**/node_modules/**", "**/dist/**", "**/build/**"]
    }
  }
};
```

## Output Structure

After running `dbdocgen generate`, the output directory contains:

```
docs/db/
├── database-dictionary.xlsx    # Excel data dictionary
├── database-docs.md            # Markdown documentation
├── database-docs.html          # Self-contained HTML docs
├── er-diagram.mmd              # Mermaid ER diagram source
└── database-docs.docx          # Word document
```

### Format Details

| Format   | File                       | Description                      |
| -------- | -------------------------- | -------------------------------- |
| excel    | `database-dictionary.xlsx` | Column-level data dictionary     |
| markdown | `database-docs.md`         | Full documentation in Markdown   |
| html     | `database-docs.html`       | Self-contained HTML with styling |
| diagram  | `er-diagram.mmd`           | Mermaid ER diagram               |
| word     | `database-docs.docx`       | Word document with tables        |

## Single Source of Truth

dbdocgen follows a strict **Single Source of Truth** rule:

> Facts extracted from your SQL schema (column names, types, constraints,
> foreign keys) are **never modified** by AI enrichment or any post-processing
> step.

The AI pipeline only enriches _descriptions_ and _comments_ — structural
metadata always reflects the exact schema you provided.

## AI Enrichment (Optional)

When enabled, dbdocgen calls an OpenAI-compatible API to enrich table and
column descriptions, suggest relationships, and add contextual notes.

### Setup

1. Set your API key:

```bash
export NINE_ROUTER_API_KEY="sk-..."
# or
export OPENAI_API_KEY="sk-..."
```

2. Run with AI enabled (default):

```bash
dbdocgen generate --schema ./database/schema.sql --ai
```

### Supported Providers

| Provider            | Description                                        |
| ------------------- | -------------------------------------------------- |
| `9router` (default) | Uses `NINE_ROUTER_API_KEY` env var                 |
| `openai`            | Uses `OPENAI_API_KEY` env var                      |
| `openai-compatible` | Any OpenAI-compatible endpoint via `--ai-base-url` |

### Custom Rules

Place `.md` rule files in `./.ai/rules/` (or configure via `rulesDir`) to
guide the AI enrichment with project-specific conventions.

### Source Context Scanning

Enable `context.source` in your config to scan backend source files for
references to database tables. The scanner feeds discovered context into the
AI enrichment pipeline for more accurate descriptions.

## Programmatic API

```ts
import { generateDbDocs } from "dbdocgen";

const doc = await generateDbDocs({
  schema: "./database/schema.sql",
  outDir: "./docs/db",
  output: {
    formats: ["excel", "markdown", "html", "diagram", "word"]
  },
  ai: {
    enabled: true,
    provider: "9router",
    apiKeyEnv: "NINE_ROUTER_API_KEY",
    model: "openai/gpt-4.1-mini",
    temperature: 0.2,
    maxTokens: 6000
  },
  context: {
    source: {
      enabled: true,
      rootDir: "./src"
    }
  }
});

console.log(doc.tables); // Array of TableDoc
console.log(doc.warnings); // Array of WarningDoc
```

### Exported Types

```ts
import type {
  DbdocgenConfig,
  DatabaseDoc,
  TableDoc,
  ColumnDoc,
  GenerateDbDocsOptions
} from "dbdocgen";
```

## Limitations and MVP Exclusions

- **No live database connection** — dbdocgen parses static SQL files only.
- **No OpenAPI/Swagger output** — documentation formats are Excel, Markdown,
  HTML, Mermaid, and Word.
- **No web UI** — outputs are static files.
- **Dialect support** — PostgreSQL and MySQL dialects are available. Others
  may parse but are not explicitly tested.
- **No incremental generation** — each run regenerates all output files.
- **No multi-file schema globs** (yet) — provide a single entrypoint SQL file.

## License

MIT
