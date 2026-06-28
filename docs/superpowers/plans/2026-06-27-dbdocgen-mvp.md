# dbdocgen MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `dbdocgen`, a TypeScript npm package and CLI that generates database documentation from `schema.sql`, with deterministic outputs first and optional AI enrichment through 9router later.

**Architecture:** Start as one package with clear plugin boundaries: parser, normalized metadata model, source scanner, enricher, exporters, CLI, and programmatic API. Database schema facts remain immutable after parsing; source code and AI may only add descriptions, review TODOs, and warnings.

**Tech Stack:** TypeScript, Node.js >= 20, pnpm, tsup, commander, cosmiconfig, zod, node-sql-parser, exceljs, docx, openai, vitest, eslint, prettier, changesets.

---

## File Structure

Create the project as a single package:

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
  core/warnings.ts
  parsers/sql/sql-parser.ts
  parsers/sql/sql-normalizer.ts
  source-scanner/scanner.ts
  source-scanner/matcher.ts
  ai/cache/file-cache.ts
  ai/enrichers/schema-enricher.ts
  ai/providers/openai-compatible.ts
  ai/rules/default-rules.ts
  ai/rules/rule-loader.ts
  ai/schemas/ai-response.ts
  exporters/excel/excel-exporter.ts
  exporters/diagram/mermaid-exporter.ts
  exporters/markdown/markdown-exporter.ts
  exporters/html/html-exporter.ts
  exporters/word/word-exporter.ts
  index.ts
fixtures/
  postgres/basic-schema.sql
  mysql/basic-schema.sql
  source/typescript-sample/src/order.service.ts
tests/
  config/loader.test.ts
  model/validation.test.ts
  parsers/sql-parser.test.ts
  source-scanner/scanner.test.ts
  ai/ai-response.test.ts
  ai/rule-loader.test.ts
  ai/file-cache.test.ts
  exporters/excel-exporter.test.ts
  exporters/mermaid-exporter.test.ts
  exporters/markdown-exporter.test.ts
  exporters/html-exporter.test.ts
  exporters/word-exporter.test.ts
  pipeline/generate-db-docs.test.ts
```

## Task 1: Project Scaffold

**Files:**

- Create: `package.json`
- Create: `tsconfig.json`
- Create: `tsup.config.ts`
- Create: `vitest.config.ts`
- Create: `eslint.config.js`
- Create: `.prettierrc`
- Create: `.gitignore`
- Create: `src/index.ts`

- [ ] **Step 1: Initialize package metadata**

Create `package.json`:

```json
{
  "name": "dbdocgen",
  "version": "0.1.0",
  "description": "Generate database documentation from SQL schema files.",
  "type": "module",
  "bin": {
    "dbdocgen": "./dist/cli/index.js"
  },
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "require": "./dist/index.cjs"
    }
  },
  "files": ["dist"],
  "scripts": {
    "build": "tsup",
    "dev": "tsx src/cli/index.ts",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "eslint .",
    "format": "prettier --write .",
    "typecheck": "tsc --noEmit"
  },
  "engines": {
    "node": ">=20"
  },
  "dependencies": {
    "commander": "latest",
    "cosmiconfig": "latest",
    "docx": "latest",
    "exceljs": "latest",
    "fast-glob": "latest",
    "node-sql-parser": "latest",
    "openai": "latest",
    "zod": "latest"
  },
  "devDependencies": {
    "@types/node": "latest",
    "@typescript-eslint/eslint-plugin": "latest",
    "@typescript-eslint/parser": "latest",
    "eslint": "latest",
    "prettier": "latest",
    "tsup": "latest",
    "tsx": "latest",
    "typescript": "latest",
    "vitest": "latest"
  }
}
```

- [ ] **Step 2: Install dependencies**

Run: `pnpm install`

Expected: `pnpm-lock.yaml` is created and install exits with code 0.

- [ ] **Step 3: Add TypeScript config**

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "outDir": "dist",
    "rootDir": "src",
    "types": ["node", "vitest/globals"]
  },
  "include": ["src", "tests", "fixtures"],
  "exclude": ["dist", "node_modules"]
}
```

- [ ] **Step 4: Add build and test configs**

Create `tsup.config.ts`:

```ts
import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/cli/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  clean: true,
  target: "node20",
  splitting: false
});
```

Create `vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["tests/**/*.test.ts"]
  }
});
```

- [ ] **Step 5: Add lint and format configs**

Create `eslint.config.js`:

```js
import tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";

export default [
  {
    ignores: ["dist/**", "node_modules/**", "coverage/**"]
  },
  {
    files: ["**/*.ts"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        sourceType: "module"
      }
    },
    plugins: {
      "@typescript-eslint": tsPlugin
    },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_" }
      ],
      "@typescript-eslint/consistent-type-imports": "error"
    }
  }
];
```

Create `.prettierrc`:

```json
{
  "semi": true,
  "singleQuote": false,
  "trailingComma": "none"
}
```

Create `.gitignore`:

```txt
node_modules/
dist/
coverage/
.env
.env.*
docs/db/
.dbdocgen-cache/
```

- [ ] **Step 6: Add initial public API**

Create `src/index.ts`:

```ts
export const version = "0.1.0";
```

- [ ] **Step 7: Verify scaffold**

Run: `pnpm typecheck && pnpm test && pnpm build`

Expected: all commands pass.

- [ ] **Step 8: Commit**

```bash
git add package.json pnpm-lock.yaml tsconfig.json tsup.config.ts vitest.config.ts eslint.config.js .prettierrc .gitignore src/index.ts
git commit -m "chore: scaffold dbdocgen package"
```

## Task 2: Normalized Metadata Model

**Files:**

- Create: `src/core/model/database-doc.ts`
- Create: `src/core/model/validation.ts`
- Create: `src/core/warnings.ts`
- Test: `tests/model/validation.test.ts`
- Modify: `src/index.ts`

- [ ] **Step 1: Write model validation tests**

Create `tests/model/validation.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { databaseDocSchema } from "../../src/core/model/validation";

describe("databaseDocSchema", () => {
  it("accepts a valid database document", () => {
    const result = databaseDocSchema.safeParse({
      dialect: "postgres",
      tables: [
        {
          name: "users",
          columns: [
            {
              name: "id",
              type: "integer",
              nullable: false,
              isPrimaryKey: true,
              isForeignKey: false
            }
          ],
          primaryKeys: ["id"],
          foreignKeys: [],
          indexes: [],
          reviewTodos: []
        }
      ],
      relationships: [],
      indexes: [],
      warnings: []
    });

    expect(result.success).toBe(true);
  });

  it("rejects AI descriptions without confidence", () => {
    const result = databaseDocSchema.safeParse({
      dialect: "postgres",
      tables: [
        {
          name: "orders",
          description: {
            value: "Stores orders.",
            source: "ai",
            needsReview: true
          },
          columns: [],
          primaryKeys: [],
          foreignKeys: [],
          indexes: [],
          reviewTodos: []
        }
      ],
      relationships: [],
      indexes: [],
      warnings: []
    });

    expect(result.success).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run tests/model/validation.test.ts`

Expected: FAIL because `src/core/model/validation.ts` does not exist.

- [ ] **Step 3: Add model types**

Create `src/core/model/database-doc.ts`:

```ts
export type DatabaseDialect =
  | "postgres"
  | "mysql"
  | "mariadb"
  | "sqlite"
  | "mssql"
  | "unknown";

export type Confidence = "high" | "medium" | "low";

export type EnrichedText = {
  value: string;
  source: "db_comment" | "backend_source" | "ai";
  confidence: Confidence;
  needsReview: boolean;
};

export type WarningDoc = {
  code: string;
  message: string;
  target?: string;
  severity: "info" | "warning" | "error";
};

export type ReviewTodo = {
  type: "table" | "column" | "relationship" | "ai" | "parser";
  target: string;
  issue: string;
  suggestion?: string;
  source: "schema" | "backend_source" | "ai" | "parser";
};

export type ColumnDoc = {
  name: string;
  type: string;
  nullable: boolean;
  defaultValue?: string;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  comment?: string;
  description?: EnrichedText;
};

export type ForeignKeyDoc = {
  name?: string;
  columns: string[];
  referencedTable: string;
  referencedColumns: string[];
};

export type IndexDoc = {
  name: string;
  table: string;
  columns: string[];
  unique: boolean;
};

export type RelationshipDoc = {
  fromTable: string;
  fromColumn: string;
  toTable: string;
  toColumn: string;
  constraintName?: string;
  source: "schema" | "ai_suggestion";
  needsReview: boolean;
};

export type TableDoc = {
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

export type DatabaseDoc = {
  dialect: DatabaseDialect;
  tables: TableDoc[];
  relationships: RelationshipDoc[];
  indexes: IndexDoc[];
  warnings: WarningDoc[];
};
```

Create `src/core/warnings.ts`:

```ts
import type { WarningDoc } from "./model/database-doc";

export function createWarning(
  code: string,
  message: string,
  target?: string
): WarningDoc {
  return {
    code,
    message,
    target,
    severity: "warning"
  };
}
```

- [ ] **Step 4: Add Zod schemas**

Create `src/core/model/validation.ts`:

```ts
import { z } from "zod";

export const enrichedTextSchema = z.object({
  value: z.string().min(1),
  source: z.enum(["db_comment", "backend_source", "ai"]),
  confidence: z.enum(["high", "medium", "low"]),
  needsReview: z.boolean()
});

export const reviewTodoSchema = z.object({
  type: z.enum(["table", "column", "relationship", "ai", "parser"]),
  target: z.string().min(1),
  issue: z.string().min(1),
  suggestion: z.string().optional(),
  source: z.enum(["schema", "backend_source", "ai", "parser"])
});

export const columnDocSchema = z.object({
  name: z.string().min(1),
  type: z.string().min(1),
  nullable: z.boolean(),
  defaultValue: z.string().optional(),
  isPrimaryKey: z.boolean(),
  isForeignKey: z.boolean(),
  comment: z.string().optional(),
  description: enrichedTextSchema.optional()
});

export const foreignKeyDocSchema = z.object({
  name: z.string().optional(),
  columns: z.array(z.string().min(1)),
  referencedTable: z.string().min(1),
  referencedColumns: z.array(z.string().min(1))
});

export const indexDocSchema = z.object({
  name: z.string().min(1),
  table: z.string().min(1),
  columns: z.array(z.string().min(1)),
  unique: z.boolean()
});

export const relationshipDocSchema = z.object({
  fromTable: z.string().min(1),
  fromColumn: z.string().min(1),
  toTable: z.string().min(1),
  toColumn: z.string().min(1),
  constraintName: z.string().optional(),
  source: z.enum(["schema", "ai_suggestion"]),
  needsReview: z.boolean()
});

export const warningDocSchema = z.object({
  code: z.string().min(1),
  message: z.string().min(1),
  target: z.string().optional(),
  severity: z.enum(["info", "warning", "error"])
});

export const tableDocSchema = z.object({
  name: z.string().min(1),
  schema: z.string().optional(),
  comment: z.string().optional(),
  description: enrichedTextSchema.optional(),
  columns: z.array(columnDocSchema),
  primaryKeys: z.array(z.string()),
  foreignKeys: z.array(foreignKeyDocSchema),
  indexes: z.array(indexDocSchema),
  reviewTodos: z.array(reviewTodoSchema)
});

export const databaseDocSchema = z.object({
  dialect: z.enum([
    "postgres",
    "mysql",
    "mariadb",
    "sqlite",
    "mssql",
    "unknown"
  ]),
  tables: z.array(tableDocSchema),
  relationships: z.array(relationshipDocSchema),
  indexes: z.array(indexDocSchema),
  warnings: z.array(warningDocSchema)
});
```

- [ ] **Step 5: Export model API**

Modify `src/index.ts`:

```ts
export const version = "0.1.0";

export type {
  ColumnDoc,
  DatabaseDialect,
  DatabaseDoc,
  EnrichedText,
  ForeignKeyDoc,
  IndexDoc,
  RelationshipDoc,
  ReviewTodo,
  TableDoc,
  WarningDoc
} from "./core/model/database-doc";

export { databaseDocSchema } from "./core/model/validation";
```

- [ ] **Step 6: Verify model**

Run: `pnpm vitest run tests/model/validation.test.ts && pnpm typecheck`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/core/model src/core/warnings.ts src/index.ts tests/model/validation.test.ts
git commit -m "feat: add normalized database metadata model"
```

## Task 3: Config Loader

**Files:**

- Create: `src/core/config/defaults.ts`
- Create: `src/core/config/schema.ts`
- Create: `src/core/config/loader.ts`
- Test: `tests/config/loader.test.ts`
- Modify: `src/index.ts`

- [ ] **Step 1: Write config loader tests**

Create `tests/config/loader.test.ts`:

```ts
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { loadConfig } from "../../src/core/config/loader";

describe("loadConfig", () => {
  it("merges CLI options over defaults", async () => {
    const config = await loadConfig({
      cwd: process.cwd(),
      cliOptions: {
        schema: "./database/schema.sql",
        outDir: "./docs/db",
        ai: false,
        formats: ["excel", "diagram"]
      }
    });

    expect(config.schema).toBe("./database/schema.sql");
    expect(config.outDir).toBe("./docs/db");
    expect(config.ai.enabled).toBe(false);
    expect(config.output.formats).toEqual(["excel", "diagram"]);
  });

  it("loads .dbdocgenrc and allows CLI override", async () => {
    const dir = await mkdtemp(join(tmpdir(), "dbdocgen-"));
    await writeFile(
      join(dir, ".dbdocgenrc"),
      JSON.stringify({
        schema: "./schema.sql",
        outDir: "./generated",
        ai: { enabled: true, model: "configured-model" }
      })
    );

    const config = await loadConfig({
      cwd: dir,
      cliOptions: {
        outDir: "./docs/db",
        ai: false
      }
    });

    expect(config.schema).toBe("./schema.sql");
    expect(config.outDir).toBe("./docs/db");
    expect(config.ai.enabled).toBe(false);
    expect(config.ai.model).toBe("configured-model");

    await rm(dir, { recursive: true, force: true });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run tests/config/loader.test.ts`

Expected: FAIL because config files do not exist.

- [ ] **Step 3: Add config schema and defaults**

Create `src/core/config/schema.ts`:

```ts
import { z } from "zod";

export const outputFormatSchema = z.enum([
  "excel",
  "markdown",
  "html",
  "diagram",
  "word"
]);

export const dbdocgenConfigSchema = z.object({
  schema: z.string().default("./schema.sql"),
  outDir: z.string().default("./docs/db"),
  context: z
    .object({
      source: z
        .object({
          enabled: z.boolean().default(false),
          rootDir: z.string().default("./src"),
          include: z
            .array(z.string())
            .default([
              "**/*.ts",
              "**/*.js",
              "**/*.rb",
              "**/*.php",
              "**/*.py",
              "**/*.java"
            ]),
          exclude: z
            .array(z.string())
            .default([
              "**/node_modules/**",
              "**/dist/**",
              "**/build/**",
              "**/.next/**",
              "**/coverage/**",
              "**/.git/**"
            ])
        })
        .default({})
    })
    .default({}),
  ai: z
    .object({
      enabled: z.boolean().default(true),
      provider: z
        .enum(["9router", "openai", "openai-compatible"])
        .default("9router"),
      baseURL: z.string().optional(),
      apiKeyEnv: z.string().default("NINE_ROUTER_API_KEY"),
      model: z.string().default("openai/gpt-4.1-mini"),
      temperature: z.number().default(0.2),
      maxTokens: z.number().int().positive().default(6000),
      rulesDir: z.string().default("./.ai/rules")
    })
    .default({}),
  output: z
    .object({
      formats: z
        .array(outputFormatSchema)
        .default(["excel", "markdown", "html", "diagram", "word"]),
      language: z.string().default("vi")
    })
    .default({})
});

export type OutputFormat = z.infer<typeof outputFormatSchema>;
export type DbdocgenConfig = z.infer<typeof dbdocgenConfigSchema>;
```

Create `src/core/config/defaults.ts`:

```ts
import { dbdocgenConfigSchema, type DbdocgenConfig } from "./schema";

export const defaultConfig: DbdocgenConfig = dbdocgenConfigSchema.parse({});
```

- [ ] **Step 4: Add loader**

Create `src/core/config/loader.ts`:

```ts
import { cosmiconfig } from "cosmiconfig";
import {
  dbdocgenConfigSchema,
  type DbdocgenConfig,
  type OutputFormat
} from "./schema";

export type CliConfigOptions = {
  schema?: string;
  source?: string;
  outDir?: string;
  formats?: OutputFormat[];
  ai?: boolean;
  aiProvider?: "9router" | "openai" | "openai-compatible";
  aiBaseUrl?: string;
  aiModel?: string;
  configPath?: string;
};

export type LoadConfigInput = {
  cwd: string;
  cliOptions: CliConfigOptions;
};

export async function loadConfig(
  input: LoadConfigInput
): Promise<DbdocgenConfig> {
  const explorer = cosmiconfig("dbdocgen", {
    searchPlaces: ["dbdocgen.config.js", "dbdocgen.config.json", ".dbdocgenrc"]
  });

  const result = input.cliOptions.configPath
    ? await explorer.load(input.cliOptions.configPath)
    : await explorer.search(input.cwd);

  const fileConfig = (result?.config ?? {}) as Partial<DbdocgenConfig>;
  const merged = mergeConfig(fileConfig, input.cliOptions);
  return dbdocgenConfigSchema.parse(merged);
}

function mergeConfig(
  fileConfig: Partial<DbdocgenConfig>,
  cli: CliConfigOptions
): Partial<DbdocgenConfig> {
  return {
    ...fileConfig,
    schema: cli.schema ?? fileConfig.schema,
    outDir: cli.outDir ?? fileConfig.outDir,
    context: {
      ...fileConfig.context,
      source: {
        ...fileConfig.context?.source,
        enabled: cli.source ? true : fileConfig.context?.source?.enabled,
        rootDir: cli.source ?? fileConfig.context?.source?.rootDir
      }
    },
    ai: {
      ...fileConfig.ai,
      enabled: cli.ai ?? fileConfig.ai?.enabled,
      provider: cli.aiProvider ?? fileConfig.ai?.provider,
      baseURL: cli.aiBaseUrl ?? fileConfig.ai?.baseURL,
      model: cli.aiModel ?? fileConfig.ai?.model
    },
    output: {
      ...fileConfig.output,
      formats: cli.formats ?? fileConfig.output?.formats
    }
  };
}
```

- [ ] **Step 5: Export config API**

Modify `src/index.ts`:

```ts
export const version = "0.1.0";

export type {
  ColumnDoc,
  DatabaseDialect,
  DatabaseDoc,
  EnrichedText,
  ForeignKeyDoc,
  IndexDoc,
  RelationshipDoc,
  ReviewTodo,
  TableDoc,
  WarningDoc
} from "./core/model/database-doc";

export { databaseDocSchema } from "./core/model/validation";
export { loadConfig } from "./core/config/loader";
export type { DbdocgenConfig, OutputFormat } from "./core/config/schema";
```

- [ ] **Step 6: Verify config**

Run: `pnpm vitest run tests/config/loader.test.ts && pnpm typecheck`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/core/config src/index.ts tests/config/loader.test.ts
git commit -m "feat: add dbdocgen config loader"
```

## Task 4: SQL Parser and Normalizer

**Files:**

- Create: `fixtures/postgres/basic-schema.sql`
- Create: `fixtures/mysql/basic-schema.sql`
- Create: `src/parsers/sql/sql-parser.ts`
- Create: `src/parsers/sql/sql-normalizer.ts`
- Test: `tests/parsers/sql-parser.test.ts`
- Modify: `src/index.ts`

- [ ] **Step 1: Add SQL fixtures**

Create `fixtures/postgres/basic-schema.sql`:

```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'pending',
  total_amount NUMERIC(12, 2) NOT NULL,
  CONSTRAINT fk_orders_user FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_orders_status ON orders(status);
```

Create `fixtures/mysql/basic-schema.sql`:

```sql
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'pending',
  total_amount DECIMAL(12, 2) NOT NULL,
  CONSTRAINT fk_orders_user FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_orders_status ON orders(status);
```

- [ ] **Step 2: Write parser tests**

Create `tests/parsers/sql-parser.test.ts`:

```ts
import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { parseSqlSchema } from "../../src/parsers/sql/sql-parser";

describe("parseSqlSchema", () => {
  it("parses PostgreSQL tables, columns, primary keys, foreign keys, and indexes", async () => {
    const sql = await readFile("fixtures/postgres/basic-schema.sql", "utf8");
    const doc = await parseSqlSchema(sql, { dialect: "postgres" });

    expect(doc.tables.map((table) => table.name)).toEqual(["users", "orders"]);
    expect(
      doc.tables.find((table) => table.name === "users")?.primaryKeys
    ).toEqual(["id"]);
    expect(
      doc.tables.find((table) => table.name === "orders")?.foreignKeys[0]
    ).toMatchObject({
      columns: ["user_id"],
      referencedTable: "users",
      referencedColumns: ["id"]
    });
    expect(doc.indexes).toContainEqual({
      name: "idx_orders_status",
      table: "orders",
      columns: ["status"],
      unique: false
    });
  });

  it("keeps parser warnings instead of throwing for unsupported statements", async () => {
    const doc = await parseSqlSchema(
      "CREATE TRIGGER ignored_trigger BEFORE INSERT ON users FOR EACH ROW SELECT 1;",
      {
        dialect: "postgres"
      }
    );

    expect(doc.warnings[0]?.code).toBe("UNSUPPORTED_SQL");
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm vitest run tests/parsers/sql-parser.test.ts`

Expected: FAIL because parser files do not exist.

- [ ] **Step 4: Implement parser wrapper**

Create `src/parsers/sql/sql-parser.ts`:

```ts
import { Parser } from "node-sql-parser";
import type {
  DatabaseDialect,
  DatabaseDoc
} from "../../core/model/database-doc";
import { createWarning } from "../../core/warnings";
import { normalizeSqlAst } from "./sql-normalizer";

export type ParseSqlSchemaOptions = {
  dialect?: DatabaseDialect;
};

export async function parseSqlSchema(
  sql: string,
  options: ParseSqlSchemaOptions = {}
): Promise<DatabaseDoc> {
  const dialect = options.dialect ?? "unknown";
  const parser = new Parser();

  try {
    const ast = parser.astify(sql, { database: mapDialect(dialect) });
    return normalizeSqlAst(ast, dialect);
  } catch (error) {
    return {
      dialect,
      tables: [],
      relationships: [],
      indexes: [],
      warnings: [
        createWarning(
          "UNSUPPORTED_SQL",
          error instanceof Error ? error.message : "Unsupported SQL syntax"
        )
      ]
    };
  }
}

function mapDialect(
  dialect: DatabaseDialect
): "postgresql" | "mysql" | undefined {
  if (dialect === "postgres") return "postgresql";
  if (dialect === "mysql" || dialect === "mariadb") return "mysql";
  return undefined;
}
```

- [ ] **Step 5: Implement normalizer**

Create `src/parsers/sql/sql-normalizer.ts`:

```ts
import type {
  DatabaseDialect,
  DatabaseDoc,
  IndexDoc,
  RelationshipDoc,
  TableDoc
} from "../../core/model/database-doc";

type AnyAst = Record<string, unknown>;

export function normalizeSqlAst(
  ast: unknown,
  dialect: DatabaseDialect
): DatabaseDoc {
  const statements = Array.isArray(ast) ? ast : [ast];
  const tables: TableDoc[] = [];
  const indexes: IndexDoc[] = [];
  const relationships: RelationshipDoc[] = [];

  for (const statement of statements as AnyAst[]) {
    if (statement.type === "create" && statement.keyword === "table") {
      const table = normalizeCreateTable(statement);
      tables.push(table);
      relationships.push(...relationshipsFromTable(table));
    }

    if (statement.type === "create" && statement.keyword === "index") {
      indexes.push(normalizeCreateIndex(statement));
    }
  }

  for (const index of indexes) {
    const table = tables.find((candidate) => candidate.name === index.table);
    table?.indexes.push(index);
  }

  return {
    dialect,
    tables,
    relationships,
    indexes,
    warnings: []
  };
}

function normalizeCreateTable(statement: AnyAst): TableDoc {
  const tableName = extractTableName(statement.table);
  const createDefinitions = Array.isArray(statement.create_definitions)
    ? (statement.create_definitions as AnyAst[])
    : [];

  const table: TableDoc = {
    name: tableName,
    columns: [],
    primaryKeys: [],
    foreignKeys: [],
    indexes: [],
    reviewTodos: []
  };

  for (const definition of createDefinitions) {
    if (definition.resource === "column") {
      const columnName = String(definition.column?.column ?? definition.column);
      const constraints = Array.isArray(definition.constraints)
        ? (definition.constraints as AnyAst[])
        : [];
      const isPrimaryKey = constraints.some(
        (constraint) => constraint.type === "primary key"
      );
      table.columns.push({
        name: columnName,
        type: normalizeType(definition.definition),
        nullable:
          !constraints.some((constraint) => constraint.type === "not null") &&
          !isPrimaryKey,
        defaultValue: extractDefault(constraints),
        isPrimaryKey,
        isForeignKey: false
      });
      if (isPrimaryKey) table.primaryKeys.push(columnName);
    }

    if (
      definition.resource === "constraint" &&
      definition.constraint_type === "primary key"
    ) {
      table.primaryKeys = extractColumnNames(definition.definition);
      for (const column of table.columns) {
        if (table.primaryKeys.includes(column.name)) column.isPrimaryKey = true;
      }
    }

    if (
      definition.resource === "constraint" &&
      definition.constraint_type === "foreign key"
    ) {
      const columns = extractColumnNames(definition.definition);
      const referencedTable = extractTableName(
        definition.reference_definition?.table
      );
      const referencedColumns = extractColumnNames(
        definition.reference_definition?.definition
      );
      table.foreignKeys.push({
        name:
          typeof definition.constraint === "string"
            ? definition.constraint
            : undefined,
        columns,
        referencedTable,
        referencedColumns
      });
      for (const column of table.columns) {
        if (columns.includes(column.name)) column.isForeignKey = true;
      }
    }
  }

  return table;
}

function normalizeCreateIndex(statement: AnyAst): IndexDoc {
  return {
    name: String(statement.index ?? statement.index_name ?? "unnamed_index"),
    table: extractTableName(statement.table),
    columns: extractColumnNames(statement.columns ?? statement.index_columns),
    unique: Boolean(statement.unique)
  };
}

function relationshipsFromTable(table: TableDoc): RelationshipDoc[] {
  return table.foreignKeys.flatMap((foreignKey) =>
    foreignKey.columns.map((column, index) => ({
      fromTable: table.name,
      fromColumn: column,
      toTable: foreignKey.referencedTable,
      toColumn:
        foreignKey.referencedColumns[index] ??
        foreignKey.referencedColumns[0] ??
        "id",
      constraintName: foreignKey.name,
      source: "schema" as const,
      needsReview: false
    }))
  );
}

function extractTableName(value: unknown): string {
  if (Array.isArray(value)) return extractTableName(value[0]);
  if (typeof value === "object" && value !== null) {
    const object = value as Record<string, unknown>;
    return String(object.table ?? object.tableName ?? object.name ?? "unknown");
  }
  return String(value ?? "unknown");
}

function extractColumnNames(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => {
    if (typeof item === "object" && item !== null) {
      const object = item as Record<string, unknown>;
      return String(object.column ?? object.name ?? object.value ?? "unknown");
    }
    return String(item);
  });
}

function normalizeType(value: unknown): string {
  if (typeof value === "object" && value !== null) {
    const object = value as Record<string, unknown>;
    return String(
      object.dataType ?? object.type ?? object.name ?? "unknown"
    ).toLowerCase();
  }
  return String(value ?? "unknown").toLowerCase();
}

function extractDefault(constraints: AnyAst[]): string | undefined {
  const defaultConstraint = constraints.find(
    (constraint) => constraint.type === "default"
  );
  if (!defaultConstraint) return undefined;
  return String(
    defaultConstraint.value?.value ?? defaultConstraint.value ?? ""
  );
}
```

- [ ] **Step 6: Export parser API**

Modify `src/index.ts`:

```ts
export const version = "0.1.0";

export type {
  ColumnDoc,
  DatabaseDialect,
  DatabaseDoc,
  EnrichedText,
  ForeignKeyDoc,
  IndexDoc,
  RelationshipDoc,
  ReviewTodo,
  TableDoc,
  WarningDoc
} from "./core/model/database-doc";

export { databaseDocSchema } from "./core/model/validation";
export { loadConfig } from "./core/config/loader";
export type { DbdocgenConfig, OutputFormat } from "./core/config/schema";
export { parseSqlSchema } from "./parsers/sql/sql-parser";
```

- [ ] **Step 7: Verify parser**

Run: `pnpm vitest run tests/parsers/sql-parser.test.ts && pnpm typecheck`

Expected: PASS. If `node-sql-parser` AST differs, inspect the AST in a temporary test and adjust `sql-normalizer.ts` until fixture tests pass.

- [ ] **Step 8: Commit**

```bash
git add fixtures src/parsers src/index.ts tests/parsers/sql-parser.test.ts
git commit -m "feat: parse SQL schema into normalized metadata"
```

## Task 5: Deterministic Exporters v0.1

**Files:**

- Create: `src/exporters/excel/excel-exporter.ts`
- Create: `src/exporters/diagram/mermaid-exporter.ts`
- Test: `tests/exporters/excel-exporter.test.ts`
- Test: `tests/exporters/mermaid-exporter.test.ts`
- Modify: `src/index.ts`

- [ ] **Step 1: Write Excel exporter test**

Create `tests/exporters/excel-exporter.test.ts`:

```ts
import { mkdtemp, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { exportExcelDictionary } from "../../src/exporters/excel/excel-exporter";
import type { DatabaseDoc } from "../../src/core/model/database-doc";

const doc: DatabaseDoc = {
  dialect: "postgres",
  tables: [
    {
      name: "users",
      columns: [
        {
          name: "id",
          type: "integer",
          nullable: false,
          isPrimaryKey: true,
          isForeignKey: false
        }
      ],
      primaryKeys: ["id"],
      foreignKeys: [],
      indexes: [],
      reviewTodos: []
    }
  ],
  relationships: [],
  indexes: [],
  warnings: []
};

describe("exportExcelDictionary", () => {
  it("writes database_dictionary.xlsx", async () => {
    const dir = await mkdtemp(join(tmpdir(), "dbdocgen-"));
    await exportExcelDictionary(doc, { outDir: dir });

    await expect(
      stat(join(dir, "database_dictionary.xlsx"))
    ).resolves.toMatchObject({ size: expect.any(Number) });
    await rm(dir, { recursive: true, force: true });
  });
});
```

- [ ] **Step 2: Write Mermaid exporter test**

Create `tests/exporters/mermaid-exporter.test.ts`:

```ts
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { exportMermaidDiagram } from "../../src/exporters/diagram/mermaid-exporter";
import type { DatabaseDoc } from "../../src/core/model/database-doc";

describe("exportMermaidDiagram", () => {
  it("writes schema-derived ERD only", async () => {
    const dir = await mkdtemp(join(tmpdir(), "dbdocgen-"));
    const doc: DatabaseDoc = {
      dialect: "postgres",
      tables: [
        {
          name: "users",
          columns: [
            {
              name: "id",
              type: "integer",
              nullable: false,
              isPrimaryKey: true,
              isForeignKey: false
            }
          ],
          primaryKeys: ["id"],
          foreignKeys: [],
          indexes: [],
          reviewTodos: []
        }
      ],
      relationships: [],
      indexes: [],
      warnings: []
    };

    await exportMermaidDiagram(doc, { outDir: dir });
    const content = await readFile(join(dir, "er_diagram.mmd"), "utf8");

    expect(content).toContain("erDiagram");
    expect(content).toContain("users");
    await rm(dir, { recursive: true, force: true });
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `pnpm vitest run tests/exporters/excel-exporter.test.ts tests/exporters/mermaid-exporter.test.ts`

Expected: FAIL because exporters do not exist.

- [ ] **Step 4: Implement Excel exporter**

Create `src/exporters/excel/excel-exporter.ts`:

```ts
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import ExcelJS from "exceljs";
import type { DatabaseDoc } from "../../core/model/database-doc";

export type ExportOptions = {
  outDir: string;
};

export async function exportExcelDictionary(
  doc: DatabaseDoc,
  options: ExportOptions
): Promise<void> {
  await mkdir(options.outDir, { recursive: true });
  const workbook = new ExcelJS.Workbook();

  const tableSheet = workbook.addWorksheet("01_Table_List");
  tableSheet.addRow([
    "Table",
    "Schema",
    "Comment",
    "Description",
    "Description Source",
    "Confidence",
    "Need Review",
    "Column Count",
    "PK"
  ]);
  for (const table of doc.tables) {
    tableSheet.addRow([
      table.name,
      table.schema ?? "",
      table.comment ?? "",
      table.description?.value ?? "",
      table.description?.source ?? "",
      table.description?.confidence ?? "",
      table.description?.needsReview ?? false,
      table.columns.length,
      table.primaryKeys.join(", ")
    ]);
  }

  const columnSheet = workbook.addWorksheet("02_Column_Dictionary");
  columnSheet.addRow([
    "Table",
    "Column",
    "Type",
    "Nullable",
    "Default",
    "PK",
    "FK",
    "DB Comment",
    "Description",
    "Description Source",
    "Confidence",
    "Need Review"
  ]);
  for (const table of doc.tables) {
    for (const column of table.columns) {
      columnSheet.addRow([
        table.name,
        column.name,
        column.type,
        column.nullable,
        column.defaultValue ?? "",
        column.isPrimaryKey,
        column.isForeignKey,
        column.comment ?? "",
        column.description?.value ?? "",
        column.description?.source ?? "",
        column.description?.confidence ?? "",
        column.description?.needsReview ?? false
      ]);
    }
  }

  const relationshipSheet = workbook.addWorksheet("03_Relationships");
  relationshipSheet.addRow([
    "From Table",
    "From Column",
    "To Table",
    "To Column",
    "Constraint Name",
    "Source",
    "Need Review"
  ]);
  for (const relationship of doc.relationships) {
    relationshipSheet.addRow([
      relationship.fromTable,
      relationship.fromColumn,
      relationship.toTable,
      relationship.toColumn,
      relationship.constraintName ?? "",
      relationship.source,
      relationship.needsReview
    ]);
  }

  const todoSheet = workbook.addWorksheet("08_Review_TODO");
  todoSheet.addRow(["Type", "Target", "Issue", "Suggestion", "Source"]);
  for (const table of doc.tables) {
    for (const todo of table.reviewTodos) {
      todoSheet.addRow([
        todo.type,
        todo.target,
        todo.issue,
        todo.suggestion ?? "",
        todo.source
      ]);
    }
  }

  const warningSheet = workbook.addWorksheet("09_Warnings");
  warningSheet.addRow(["Severity", "Code", "Target", "Message"]);
  for (const warning of doc.warnings) {
    warningSheet.addRow([
      warning.severity,
      warning.code,
      warning.target ?? "",
      warning.message
    ]);
  }

  await workbook.xlsx.writeFile(
    join(options.outDir, "database_dictionary.xlsx")
  );
}
```

- [ ] **Step 5: Implement Mermaid exporter**

Create `src/exporters/diagram/mermaid-exporter.ts`:

```ts
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { DatabaseDoc } from "../../core/model/database-doc";

export type DiagramExportOptions = {
  outDir: string;
};

export async function exportMermaidDiagram(
  doc: DatabaseDoc,
  options: DiagramExportOptions
): Promise<void> {
  await mkdir(options.outDir, { recursive: true });
  await writeFile(
    join(options.outDir, "er_diagram.mmd"),
    renderMermaid(doc),
    "utf8"
  );
}

export function renderMermaid(doc: DatabaseDoc): string {
  const lines = ["erDiagram"];

  for (const table of doc.tables) {
    lines.push(`  ${table.name} {`);
    for (const column of table.columns) {
      const markers = [
        column.isPrimaryKey ? "PK" : "",
        column.isForeignKey ? "FK" : ""
      ]
        .filter(Boolean)
        .join(" ");
      lines.push(
        `    ${sanitizeType(column.type)} ${column.name}${markers ? ` "${markers}"` : ""}`
      );
    }
    lines.push("  }");
  }

  for (const relationship of doc.relationships.filter(
    (item) => item.source === "schema"
  )) {
    lines.push(
      `  ${relationship.toTable} ||--o{ ${relationship.fromTable} : "${relationship.constraintName ?? relationship.fromColumn}"`
    );
  }

  return `${lines.join("\n")}\n`;
}

function sanitizeType(type: string): string {
  return type.replace(/[^a-zA-Z0-9_]/g, "_");
}
```

- [ ] **Step 6: Export deterministic exporters**

Modify `src/index.ts`:

```ts
export const version = "0.1.0";

export type {
  ColumnDoc,
  DatabaseDialect,
  DatabaseDoc,
  EnrichedText,
  ForeignKeyDoc,
  IndexDoc,
  RelationshipDoc,
  ReviewTodo,
  TableDoc,
  WarningDoc
} from "./core/model/database-doc";

export { databaseDocSchema } from "./core/model/validation";
export { loadConfig } from "./core/config/loader";
export type { DbdocgenConfig, OutputFormat } from "./core/config/schema";
export { parseSqlSchema } from "./parsers/sql/sql-parser";
export { exportExcelDictionary } from "./exporters/excel/excel-exporter";
export {
  exportMermaidDiagram,
  renderMermaid
} from "./exporters/diagram/mermaid-exporter";
```

- [ ] **Step 7: Verify deterministic exporters**

Run: `pnpm vitest run tests/exporters/excel-exporter.test.ts tests/exporters/mermaid-exporter.test.ts && pnpm typecheck`

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/exporters src/index.ts tests/exporters
git commit -m "feat: add Excel and Mermaid exporters"
```

## Task 6: Pipeline and CLI v0.1

**Files:**

- Create: `src/core/pipeline/plugin-types.ts`
- Create: `src/core/pipeline/generate-db-docs.ts`
- Create: `src/cli/index.ts`
- Test: `tests/pipeline/generate-db-docs.test.ts`
- Modify: `src/index.ts`

- [ ] **Step 1: Write pipeline test**

Create `tests/pipeline/generate-db-docs.test.ts`:

```ts
import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { generateDbDocs } from "../../src/core/pipeline/generate-db-docs";

describe("generateDbDocs", () => {
  it("generates deterministic v0.1 outputs without AI", async () => {
    const outDir = await mkdtemp(join(tmpdir(), "dbdocgen-out-"));

    await generateDbDocs({
      schema: "fixtures/postgres/basic-schema.sql",
      outDir,
      output: { formats: ["excel", "diagram"] },
      ai: { enabled: false }
    });

    await expect(readdir(outDir)).resolves.toEqual(
      expect.arrayContaining(["database_dictionary.xlsx", "er_diagram.mmd"])
    );
    await rm(outDir, { recursive: true, force: true });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run tests/pipeline/generate-db-docs.test.ts`

Expected: FAIL because pipeline does not exist.

- [ ] **Step 3: Add plugin type contracts**

Create `src/core/pipeline/plugin-types.ts`:

```ts
import type { DatabaseDoc } from "../model/database-doc";

export type ParserInput = {
  schemaPath: string;
};

export type ExportOptions = {
  outDir: string;
};

export interface ParserPlugin {
  name: string;
  parse(input: ParserInput): Promise<DatabaseDoc>;
}

export interface ExporterPlugin {
  name: string;
  export(doc: DatabaseDoc, options: ExportOptions): Promise<void>;
}

export interface EnricherPlugin {
  name: string;
  enrich(doc: DatabaseDoc): Promise<DatabaseDoc>;
}
```

- [ ] **Step 4: Add generation pipeline**

Create `src/core/pipeline/generate-db-docs.ts`:

```ts
import { readFile } from "node:fs/promises";
import type { OutputFormat } from "../config/schema";
import type { DatabaseDialect, DatabaseDoc } from "../model/database-doc";
import { exportMermaidDiagram } from "../../exporters/diagram/mermaid-exporter";
import { exportExcelDictionary } from "../../exporters/excel/excel-exporter";
import { parseSqlSchema } from "../../parsers/sql/sql-parser";

export type GenerateDbDocsOptions = {
  schema: string;
  outDir: string;
  dialect?: DatabaseDialect;
  output: {
    formats: OutputFormat[];
  };
  ai: {
    enabled: boolean;
  };
};

export async function generateDbDocs(
  options: GenerateDbDocsOptions
): Promise<DatabaseDoc> {
  const sql = await readFile(options.schema, "utf8");
  const doc = await parseSqlSchema(sql, {
    dialect: options.dialect ?? "postgres"
  });

  if (options.ai.enabled) {
    doc.warnings.push({
      code: "AI_NOT_IMPLEMENTED",
      message: "AI enrichment is planned for v0.3 and was skipped.",
      severity: "info"
    });
  }

  if (options.output.formats.includes("excel")) {
    await exportExcelDictionary(doc, { outDir: options.outDir });
  }

  if (options.output.formats.includes("diagram")) {
    await exportMermaidDiagram(doc, { outDir: options.outDir });
  }

  return doc;
}
```

- [ ] **Step 5: Add CLI**

Create `src/cli/index.ts`:

```ts
#!/usr/bin/env node
import { Command } from "commander";
import { loadConfig } from "../core/config/loader";
import { generateDbDocs } from "../core/pipeline/generate-db-docs";
import type { OutputFormat } from "../core/config/schema";

const program = new Command();

program
  .name("dbdocgen")
  .description("Generate database documentation from SQL schema files.")
  .version("0.1.0");

program
  .command("generate")
  .description("Generate database documentation")
  .option("--schema <path>", "Path to schema.sql")
  .option("--source <path>", "Backend source directory")
  .option("--out <path>", "Output directory")
  .option("--format <formats>", "Comma-separated output formats")
  .option("--ai", "Enable AI enrichment")
  .option("--no-ai", "Disable AI enrichment")
  .option("--ai-provider <provider>", "AI provider")
  .option("--ai-base-url <url>", "OpenAI-compatible base URL")
  .option("--ai-model <model>", "AI model")
  .option("--config <path>", "Config file path")
  .action(async (rawOptions) => {
    const config = await loadConfig({
      cwd: process.cwd(),
      cliOptions: {
        schema: rawOptions.schema,
        source: rawOptions.source,
        outDir: rawOptions.out,
        formats: parseFormats(rawOptions.format),
        ai: rawOptions.ai,
        aiProvider: rawOptions.aiProvider,
        aiBaseUrl: rawOptions.aiBaseUrl,
        aiModel: rawOptions.aiModel,
        configPath: rawOptions.config
      }
    });

    await generateDbDocs({
      schema: config.schema,
      outDir: config.outDir,
      output: { formats: config.output.formats },
      ai: { enabled: config.ai.enabled }
    });

    console.log(`Generated database documentation in ${config.outDir}`);
  });

program.parseAsync().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

function parseFormats(value?: string): OutputFormat[] | undefined {
  if (!value) return undefined;
  return value.split(",").map((item) => item.trim()) as OutputFormat[];
}
```

- [ ] **Step 6: Export pipeline API**

Modify `src/index.ts`:

```ts
export const version = "0.1.0";

export type {
  ColumnDoc,
  DatabaseDialect,
  DatabaseDoc,
  EnrichedText,
  ForeignKeyDoc,
  IndexDoc,
  RelationshipDoc,
  ReviewTodo,
  TableDoc,
  WarningDoc
} from "./core/model/database-doc";

export { databaseDocSchema } from "./core/model/validation";
export { loadConfig } from "./core/config/loader";
export type { DbdocgenConfig, OutputFormat } from "./core/config/schema";
export { generateDbDocs } from "./core/pipeline/generate-db-docs";
export type { GenerateDbDocsOptions } from "./core/pipeline/generate-db-docs";
export { parseSqlSchema } from "./parsers/sql/sql-parser";
export { exportExcelDictionary } from "./exporters/excel/excel-exporter";
export {
  exportMermaidDiagram,
  renderMermaid
} from "./exporters/diagram/mermaid-exporter";
```

- [ ] **Step 7: Verify CLI and pipeline**

Run: `pnpm vitest run tests/pipeline/generate-db-docs.test.ts && pnpm build`

Then run:

```bash
node dist/cli/index.js generate --schema fixtures/postgres/basic-schema.sql --out docs/db --format excel,diagram --no-ai
```

Expected: `docs/db/database_dictionary.xlsx` and `docs/db/er_diagram.mmd` exist.

- [ ] **Step 8: Commit**

```bash
git add src/core/pipeline src/cli src/index.ts tests/pipeline/generate-db-docs.test.ts docs/db
git commit -m "feat: add generate pipeline and CLI"
```

## Task 7: Markdown, HTML, and Word Exporters v0.2

**Files:**

- Create: `src/exporters/markdown/markdown-exporter.ts`
- Create: `src/exporters/html/html-exporter.ts`
- Create: `src/exporters/word/word-exporter.ts`
- Test: `tests/exporters/markdown-exporter.test.ts`
- Test: `tests/exporters/html-exporter.test.ts`
- Test: `tests/exporters/word-exporter.test.ts`
- Modify: `src/core/pipeline/generate-db-docs.ts`
- Modify: `src/index.ts`

- [ ] **Step 1: Write exporter tests**

Create tests that call each exporter with a one-table `DatabaseDoc` and assert these files exist:

```txt
DATABASE.md
tables/users.md
html/index.html
html/tables/users.html
database_document.docx
```

Expected table content for Markdown and HTML must include table name, columns, primary keys, foreign keys, review TODOs, and warnings.

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
pnpm vitest run tests/exporters/markdown-exporter.test.ts tests/exporters/html-exporter.test.ts tests/exporters/word-exporter.test.ts
```

Expected: FAIL because exporters do not exist.

- [ ] **Step 3: Implement Markdown exporter**

Implement `exportMarkdownDocs(doc, { outDir })` to create `DATABASE.md` and one file per table in `tables/`. Use deterministic string templates. Escape pipe characters inside table cells.

- [ ] **Step 4: Implement HTML exporter**

Implement `exportHtmlDocs(doc, { outDir })` to create `html/index.html` and `html/tables/*.html`. Keep it static, framework-free, and search-friendly with semantic headings and links.

- [ ] **Step 5: Implement Word exporter**

Implement `exportWordDocument(doc, { outDir })` using `docx`. Include overview, table list, table details, relationships, review TODOs, and warnings.

- [ ] **Step 6: Wire exporters into pipeline**

Modify `generateDbDocs` so `markdown`, `html`, and `word` formats call their exporters.

- [ ] **Step 7: Export public APIs**

Export the three new exporter functions from `src/index.ts`.

- [ ] **Step 8: Verify v0.2 outputs**

Run:

```bash
pnpm test && pnpm typecheck && pnpm build
node dist/cli/index.js generate --schema fixtures/postgres/basic-schema.sql --out docs/db --format excel,markdown,html,diagram,word --no-ai
```

Expected: all deterministic output files exist.

- [ ] **Step 9: Commit**

```bash
git add src/exporters src/core/pipeline/generate-db-docs.ts src/index.ts tests/exporters docs/db
git commit -m "feat: add markdown html and word exporters"
```

## Task 8: Source Scanner v0.3

**Files:**

- Create: `fixtures/source/typescript-sample/src/order.service.ts`
- Create: `src/source-scanner/matcher.ts`
- Create: `src/source-scanner/scanner.ts`
- Test: `tests/source-scanner/scanner.test.ts`
- Modify: `src/index.ts`

- [ ] **Step 1: Add source fixture**

Create `fixtures/source/typescript-sample/src/order.service.ts`:

```ts
export class OrderService {
  async completeCheckout(userId: number) {
    return {
      userId,
      status: "paid",
      totalAmount: 100
    };
  }
}
```

- [ ] **Step 2: Write scanner test**

Create `tests/source-scanner/scanner.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { scanSourceContext } from "../../src/source-scanner/scanner";

describe("scanSourceContext", () => {
  it("finds source files related to table names", async () => {
    const context = await scanSourceContext({
      rootDir: "fixtures/source/typescript-sample/src",
      include: ["**/*.ts"],
      exclude: [],
      tableNames: ["orders"]
    });

    expect(context.files[0]).toMatchObject({
      path: expect.stringContaining("order.service.ts")
    });
    expect(context.files[0]?.chunks[0]?.content).toContain("completeCheckout");
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm vitest run tests/source-scanner/scanner.test.ts`

Expected: FAIL because scanner files do not exist.

- [ ] **Step 4: Implement matcher**

Create `src/source-scanner/matcher.ts`:

```ts
export function isLikelyRelatedToTable(
  filePath: string,
  content: string,
  tableName: string
): boolean {
  const singular = tableName.endsWith("s") ? tableName.slice(0, -1) : tableName;
  const haystack = `${filePath}\n${content}`.toLowerCase();
  return (
    haystack.includes(tableName.toLowerCase()) ||
    haystack.includes(singular.toLowerCase())
  );
}
```

- [ ] **Step 5: Implement scanner**

Create `src/source-scanner/scanner.ts`:

```ts
import { readFile } from "node:fs/promises";
import fg from "fast-glob";
import { isLikelyRelatedToTable } from "./matcher";

export type SourceChunk = {
  content: string;
  startLine: number;
  endLine: number;
};

export type SourceContextFile = {
  path: string;
  relatedTables: string[];
  chunks: SourceChunk[];
};

export type SourceContext = {
  files: SourceContextFile[];
};

export type ScanSourceContextOptions = {
  rootDir: string;
  include: string[];
  exclude: string[];
  tableNames: string[];
  maxLinesPerChunk?: number;
};

export async function scanSourceContext(
  options: ScanSourceContextOptions
): Promise<SourceContext> {
  const paths = await fg(options.include, {
    cwd: options.rootDir,
    absolute: true,
    ignore: options.exclude
  });

  const files: SourceContextFile[] = [];

  for (const path of paths) {
    const content = await readFile(path, "utf8");
    const relatedTables = options.tableNames.filter((tableName) =>
      isLikelyRelatedToTable(path, content, tableName)
    );
    if (relatedTables.length === 0) continue;
    files.push({
      path,
      relatedTables,
      chunks: chunkContent(content, options.maxLinesPerChunk ?? 120)
    });
  }

  return { files };
}

function chunkContent(content: string, maxLines: number): SourceChunk[] {
  const lines = content.split("\n");
  const chunks: SourceChunk[] = [];
  for (let index = 0; index < lines.length; index += maxLines) {
    const chunkLines = lines.slice(index, index + maxLines);
    chunks.push({
      content: chunkLines.join("\n"),
      startLine: index + 1,
      endLine: index + chunkLines.length
    });
  }
  return chunks;
}
```

- [ ] **Step 6: Export scanner API**

Export `scanSourceContext` and source scanner types from `src/index.ts`.

- [ ] **Step 7: Verify scanner**

Run: `pnpm vitest run tests/source-scanner/scanner.test.ts && pnpm typecheck`

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add fixtures/source src/source-scanner src/index.ts tests/source-scanner/scanner.test.ts
git commit -m "feat: add generic source context scanner"
```

## Task 9: AI Rules and Response Validation v0.3

**Files:**

- Create: `src/ai/rules/default-rules.ts`
- Create: `src/ai/rules/rule-loader.ts`
- Create: `src/ai/schemas/ai-response.ts`
- Test: `tests/ai/rule-loader.test.ts`
- Test: `tests/ai/ai-response.test.ts`

- [ ] **Step 1: Write AI rule loader tests**

Create a test that writes `.ai/rules/table-enrich.md` in a temp directory and asserts it overrides the built-in default while missing rules fall back to defaults.

- [ ] **Step 2: Write AI response schema tests**

Create a test that accepts the SPEC example AI response and rejects responses where a column description lacks `source`, `confidence`, or `needsReview`.

- [ ] **Step 3: Run tests to verify they fail**

Run: `pnpm vitest run tests/ai/rule-loader.test.ts tests/ai/ai-response.test.ts`

Expected: FAIL because AI rule/schema files do not exist.

- [ ] **Step 4: Implement default rules**

Create defaults for `system.md`, `source-scan.md`, `table-enrich.md`, `column-enrich.md`, and `relationship-review.md` matching `SPEC.md`.

- [ ] **Step 5: Implement rule loader**

Implement `loadAiRules({ rulesDir })` to read custom Markdown files when present and fall back to defaults for missing files.

- [ ] **Step 6: Implement AI response schema**

Use Zod to validate:

```ts
{
  table: string;
  purpose?: string;
  confidence: "high" | "medium" | "low";
  businessNotes?: string[];
  columnDescriptions?: Record<string, {
    description: string;
    source: "backend_source" | "ai" | "db_comment";
    confidence: "high" | "medium" | "low";
    needsReview: boolean;
  }>;
  reviewTodos?: string[];
}
```

- [ ] **Step 7: Verify AI schemas**

Run: `pnpm vitest run tests/ai/rule-loader.test.ts tests/ai/ai-response.test.ts && pnpm typecheck`

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/ai/rules src/ai/schemas tests/ai
git commit -m "feat: add AI rules and response validation"
```

## Task 10: 9router OpenAI-Compatible Enrichment v0.3

**Files:**

- Create: `src/ai/providers/openai-compatible.ts`
- Create: `src/ai/enrichers/schema-enricher.ts`
- Test: `tests/ai/schema-enricher.test.ts`
- Modify: `src/core/pipeline/generate-db-docs.ts`
- Modify: `src/index.ts`

- [ ] **Step 1: Write enrichment test with fake provider**

Test that enrichment:

- adds table and column descriptions from validated AI JSON
- adds `needsReview: true` for low-confidence descriptions
- never changes table name, column name, type, nullable, PK, FK, index, or constraint facts
- adds warnings and continues when provider returns invalid JSON

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run tests/ai/schema-enricher.test.ts`

Expected: FAIL because enrichment files do not exist.

- [ ] **Step 3: Implement OpenAI-compatible provider**

Create a provider that uses:

```ts
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env[config.apiKeyEnv],
  baseURL: config.baseURL
});
```

Expose a method that accepts system/user prompt strings and returns text content from the first response choice.

- [ ] **Step 4: Implement schema enricher**

Implement `enrichDatabaseDoc(doc, sourceContext, rules, provider)` by enriching table-by-table. Clone schema facts before applying enrichment, apply only `description`, `reviewTodos`, and `warnings`, then assert immutable facts stayed equal.

- [ ] **Step 5: Wire enrichment into pipeline**

When `ai.enabled` is true:

- scan source context if configured
- load rules
- call 9router provider
- validate each response
- skip failed targets with warnings
- continue exporters

- [ ] **Step 6: Verify enrichment**

Run: `pnpm vitest run tests/ai/schema-enricher.test.ts tests/pipeline/generate-db-docs.test.ts && pnpm typecheck`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/ai/providers src/ai/enrichers src/core/pipeline/generate-db-docs.ts src/index.ts tests/ai/schema-enricher.test.ts
git commit -m "feat: add OpenAI-compatible AI enrichment"
```

## Task 11: AI Cache, Review TODOs, and Warning Report v0.4

**Files:**

- Create: `src/ai/cache/file-cache.ts`
- Test: `tests/ai/file-cache.test.ts`
- Modify: `src/ai/enrichers/schema-enricher.ts`
- Modify: all exporters as needed to include warnings and TODOs

- [ ] **Step 1: Write cache tests**

Test that cache key changes when table metadata, source context, rules, or model changes, and that cached response avoids provider call.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run tests/ai/file-cache.test.ts`

Expected: FAIL because cache does not exist.

- [ ] **Step 3: Implement file cache**

Store JSON responses under `.dbdocgen-cache/ai/<sha256>.json`. Key input must include table name, DB metadata hash, related source context hash, rules hash, and model name.

- [ ] **Step 4: Integrate cache into enrichment**

Read cache before provider call. Write only validated responses to cache.

- [ ] **Step 5: Ensure TODOs and warnings appear in every output**

Verify Excel, Markdown, HTML, and Word include review TODOs and warnings. Mermaid must remain schema-only except comments/notes that do not create relationship lines.

- [ ] **Step 6: Verify cache and report outputs**

Run: `pnpm test && pnpm typecheck && pnpm build`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/ai/cache src/ai/enrichers src/exporters tests/ai
git commit -m "feat: add AI cache and review reporting"
```

## Task 12: Release Readiness

**Files:**

- Create: `README.md`
- Create: `.changeset/initial-release.md`
- Modify: `package.json`

- [ ] **Step 1: Add README**

Document:

- install command
- CLI usage for basic, with source+AI, and `--no-ai`
- config file example
- output structure
- single-source-of-truth rule
- limitations and MVP exclusions

- [ ] **Step 2: Add changeset**

Create `.changeset/initial-release.md`:

```md
---
"dbdocgen": minor
---

Initial MVP for generating database documentation from SQL schema files.
```

- [ ] **Step 3: Final verification**

Run:

```bash
pnpm format
pnpm lint
pnpm typecheck
pnpm test
pnpm build
node dist/cli/index.js generate --schema fixtures/postgres/basic-schema.sql --out docs/db --format excel,markdown,html,diagram,word --no-ai
```

Expected: all commands pass and all deterministic docs are generated.

- [ ] **Step 4: Commit**

```bash
git add README.md .changeset package.json pnpm-lock.yaml docs/db
git commit -m "docs: prepare dbdocgen MVP release"
```

## Self-Review

**Spec coverage:** The plan covers CLI, config loader, SQL parser, normalized model, Excel, Mermaid, Markdown, HTML, Word, source scanner, AI rules, 9router-compatible provider, AI response validation, cache, warnings, review TODOs, npm package API, and tests.

**Intentional deferral:** Live database connections, OpenAPI parsing, framework-specific source analyzers, web UI, advanced lineage, and optional OpenAPI plugin stay outside MVP per `SPEC.md`.

**Placeholder scan:** Broad v0.2-v0.4 implementation tasks avoid fake code where exact implementation depends on earlier exporter/pipeline details, but each task still gives files, behavior, commands, and acceptance checks.

**Type consistency:** Core types, config names, pipeline options, and output format names are consistent across tasks.
