# dbdocgen

Generate database documentation from SQL schema files.

Parse your SQL schema and export to Excel, Markdown, HTML, Mermaid diagrams,
and Word — all from a single CLI command.

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
# Generate with all formats (output goes to ./output/db_doc_gen_{yymmddhhmm})
dbdocgen generate --schema ./database/schema.sql

# Specify output directory
dbdocgen generate --schema ./database/schema.sql --out ./docs/db
```

## CLI Reference

### `generate`

```
dbdocgen generate [options]

Options:
  --schema <path>    Path to the SQL schema file (default: from config or ./schema.sql)
  --out <path>       Output directory (default: ./output/db_doc_gen_{yymmddhhmm})
  --format <list>    Comma-separated output formats:
                     excel, markdown, html, diagram, word
                     (default: all formats)
  --config <path>    Config file path (default: auto-detected)
  -h, --help         Display help
```

### Other commands

```
dbdocgen init                Create a default config file
dbdocgen validate            Validate a SQL schema file
dbdocgen clean               Clean an output directory
dbdocgen config show         Show resolved configuration
dbdocgen config validate     Validate config file
dbdocgen info                Show supported features
```

## Configuration

dbdocgen uses [cosmiconfig](https://github.com/cosmiconfig/cosmiconfig) for
auto-discovery. Supported config file names (in project root):

- `dbdocgen.config.json`
- `dbdocgen.config.js`
- `.dbdocgenrc`

### Example `dbdocgen.config.json`

```json
{
  "schema": "./database/schema.sql",
  "output": {
    "formats": ["excel", "markdown", "html", "diagram", "word"],
    "language": "en"
  }
}
```

### Config fields

| Field              | Type     | Default                    | Description                              |
| ------------------ | -------- | -------------------------- | ---------------------------------------- |
| `schema`           | string   | `"./schema.sql"`           | Path to the SQL schema file              |
| `dialect`          | string   | auto-detected              | `postgres`, `mysql`, `mariadb`, `sqlite` |
| `output.formats`   | string[] | all formats                | Which output formats to generate         |
| `output.language`  | string   | `"en"`                     | Label language: `en`, `jp`               |

## Output Structure

Each `generate` run creates a new timestamped directory:

```
output/db_doc_gen_2606281845/
├── database_dictionary.xlsx   # Excel data dictionary (A5:SQL style, one sheet per table)
├── database_document.docx     # Word document
├── er_diagram.mmd             # Mermaid ER diagram
├── tables/
│   ├── users.md               # Per-table Markdown
│   └── orders.md
└── html/
    └── tables/
        ├── users.html         # Per-table HTML
        └── orders.html
```

### Output Formats

| Format     | File(s)                         | Description                               |
| ---------- | ------------------------------- | ----------------------------------------- |
| `excel`    | `database_dictionary.xlsx`      | A5:SQL-style data dictionary              |
| `markdown` | `tables/*.md`                   | Per-table Markdown with metadata          |
| `html`     | `html/tables/*.html`            | Per-table HTML with styling               |
| `diagram`  | `er_diagram.mmd`                | Mermaid ER diagram                        |
| `word`     | `database_document.docx`        | Word document                             |

### Output Languages

Labels in all output formats (column headers, metadata fields) can be localized:

| Language | Config value |
| -------- | ------------ |
| English  | `"en"` (default) |
| Japanese | `"jp"` |

## Programmatic API

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

console.log(doc.tables);   // Array of TableDoc
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

## Limitations

- **No live database connection** — parses static SQL files only.
- **No OpenAPI/Swagger output** — formats are Excel, Markdown, HTML, Mermaid, Word.
- **No web UI** — outputs are static files.
- **Dialect support** — PostgreSQL and MySQL are primary. Others may parse but are not explicitly tested.
- **No incremental generation** — each run regenerates all output files.
- **Single entrypoint** — provide one SQL file (no multi-file glob support yet).

## License

MIT
