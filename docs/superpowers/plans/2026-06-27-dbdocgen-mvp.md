# dbdocgen MVP Implementation Plan

> **Status:** Completed MVP — v0.2 delivered. Tasks 8-11 (source scanner, AI enrichment, AI cache) were descoped.

**Goal:** Build `dbdocgen`, a TypeScript npm package and CLI that generates database documentation from `schema.sql`, with deterministic, reproducible outputs in multiple formats (Excel, Markdown, HTML, Mermaid, Word).

**Architecture:** Single package with clear plugin boundaries: parser, normalized metadata model, exporters, CLI, and programmatic API. Database schema facts are immutable after parsing.

**Tech Stack:** TypeScript, Node.js >= 20, pnpm, tsup, commander, cosmiconfig, zod, node-sql-parser, exceljs, docx, vitest, eslint, prettier, changesets.

---

## File Structure

```txt
package.json
pnpm-lock.yaml
tsconfig.json
tsup.config.ts
vitest.config.ts
eslint.config.js
.prettierrc
.gitignore
src/
  cli/index.ts
  core/config/defaults.ts
  core/config/loader.ts
  core/config/schema.ts
  core/model/database-doc.ts
  core/model/validation.ts
  core/pipeline/generate-db-docs.ts
  core/pipeline/plugin-types.ts
  core/sanitize.ts
  parsers/sql/sql-parser.ts
  parsers/sql/sql-normalizer.ts
  exporters/excel/excel-exporter.ts
  exporters/diagram/mermaid-exporter.ts
  exporters/markdown/markdown-exporter.ts
  exporters/html/html-exporter.ts
  exporters/word/word-exporter.ts
  exporters/shared/output-labels.ts
  index.ts
fixtures/
  postgres/basic-schema.sql
  mysql/basic-schema.sql
tests/
  config/loader.test.ts
  model/validation.test.ts
  parsers/sql-parser.test.ts
  exporters/excel-exporter.test.ts
  exporters/mermaid-exporter.test.ts
  exporters/markdown-exporter.test.ts
  exporters/html-exporter.test.ts
  exporters/word-exporter.test.ts
  pipeline/generate-db-docs.test.ts
```

## Task 1: Project Scaffold ✅

- [x] Initialize package metadata (`package.json`)
- [x] Install dependencies (`pnpm install`)
- [x] Add TypeScript config (`tsconfig.json`)
- [x] Add build and test configs (`tsup.config.ts`, `vitest.config.ts`)
- [x] Add lint and format configs (`eslint.config.js`, `.prettierrc`, `.gitignore`)
- [x] Add initial public API (`src/index.ts`)
- [x] Verify scaffold: `pnpm typecheck && pnpm test && pnpm build`

## Task 2: Normalized Metadata Model ✅

- [x] Define model types (`src/core/model/database-doc.ts`)
- [x] Add Zod schemas (`src/core/model/validation.ts`)
- [x] Add warnings helper (`src/core/warnings.ts`)
- [x] Export model API from `src/index.ts`
- [x] Tests: `tests/model/validation.test.ts`

## Task 3: Config Loader ✅

- [x] Define config schema (`src/core/config/schema.ts`)
  - `schema`, `output.formats`, `output.language` (`en` | `vi` | `jp`), `dialect`
- [x] Add defaults (`src/core/config/defaults.ts`)
- [x] Add loader with cosmiconfig discovery (`src/core/config/loader.ts`)
- [x] Export config API from `src/index.ts`
- [x] Tests: `tests/config/loader.test.ts`

## Task 4: SQL Parser and Normalizer ✅

- [x] Add SQL fixtures (`fixtures/postgres/basic-schema.sql`, `fixtures/mysql/basic-schema.sql`)
- [x] Implement parser wrapper (`src/parsers/sql/sql-parser.ts`)
- [x] Implement normalizer (`src/parsers/sql/sql-normalizer.ts`)
- [x] Export parser API from `src/index.ts`
- [x] Tests: `tests/parsers/sql-parser.test.ts`

## Task 5: Excel and Mermaid Exporters ✅

- [x] Implement Excel exporter — A5:SQL style, one sheet per table (`src/exporters/excel/excel-exporter.ts`)
- [x] Implement Mermaid exporter (`src/exporters/diagram/mermaid-exporter.ts`)
- [x] Export exporter APIs from `src/index.ts`
- [x] Tests: `tests/exporters/excel-exporter.test.ts`, `tests/exporters/mermaid-exporter.test.ts`

## Task 6: Pipeline and CLI ✅

- [x] Add plugin type contracts (`src/core/pipeline/plugin-types.ts`)
- [x] Add generation pipeline (`src/core/pipeline/generate-db-docs.ts`)
  - Step-by-step progress logging via `onProgress` callback
  - Timestamped output directory default: `./output/db_doc_gen_{yymmddhhmm}`
- [x] Add CLI (`src/cli/index.ts`)
  - Commands: `generate`, `init`, `validate`, `clean`, `config show`, `config validate`, `info`
- [x] Export pipeline API from `src/index.ts`
- [x] Tests: `tests/pipeline/generate-db-docs.test.ts`

## Task 7: Markdown, HTML, and Word Exporters ✅

- [x] Implement Markdown exporter — per-table files, A5:SQL style (`src/exporters/markdown/markdown-exporter.ts`)
- [x] Implement HTML exporter — per-table files, A5:SQL style (`src/exporters/html/html-exporter.ts`)
- [x] Implement Word exporter — A5:SQL style (`src/exporters/word/word-exporter.ts`)
- [x] Add i18n output labels module (`src/exporters/shared/output-labels.ts`)
  - Supports: `en` (default), `vi`, `jp`
- [x] Wire all exporters into pipeline
- [x] Export all exporter APIs from `src/index.ts`
- [x] Tests: `tests/exporters/markdown-exporter.test.ts`, `tests/exporters/html-exporter.test.ts`, `tests/exporters/word-exporter.test.ts`

## Task 8–11: Source Scanner and AI Enrichment — DESCOPED

These tasks were removed from scope. The tool generates deterministic documentation from SQL schema only. No AI enrichment, source scanning, or AI caching will be included in the current version.

Future roadmap items:
- v0.3: live DB introspection
- v0.4: framework-specific source plugins
- v0.5: optional OpenAPI plugin

## Task 12: Release Readiness ✅

- [x] README.md — documents install, CLI usage, config, output structure, programmatic API
- [x] README.md — full project documentation (replaces SPEC.md and TECHSTACK.md)
- [x] LICENSE (MIT)
- [x] `.github/workflows/ci.yml`
- [x] Final verification: `pnpm format && pnpm lint && pnpm typecheck && pnpm test && pnpm build`

## Output Directory Structure

```txt
output/db_doc_gen_2606281845/
├── database_dictionary.xlsx   # A5:SQL-style data dictionary
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

## Self-Review

**Spec coverage:** CLI, config loader, SQL parser, normalized metadata model, Excel (A5), Mermaid, Markdown (A5, per-table), HTML (A5, per-table), Word (A5), i18n labels (en/vi/jp), timestamped output, programmatic API, and tests.

**Intentional deferral:** Source scanner, AI enrichment, AI cache, AI rules, live DB connections, OpenAPI parsing, framework-specific analyzers, and web UI are deferred to future versions.

**Type consistency:** Core types, config names, pipeline options, and output format names are consistent across all tasks.
