# Contributing & Publishing Guide

Thank you for contributing to `@cuongph.dev/dbdocgen`.

This document covers local development, pull request expectations, and how to publish a new version to npm.

## Prerequisites

- Node.js >= 20
- pnpm (recommended) or npm
- Git

```bash
node -v   # v20+
pnpm -v
```

## Local Setup

```bash
git clone https://github.com/cuongph-dev-work/sql_documentation_tool.git
cd sql_documentation_tool
pnpm install
```

`pnpm install` runs `prepare`, which builds `dist/` and marks the CLI as executable.

### Verify everything works

```bash
pnpm typecheck
pnpm test
pnpm dev generate --schema fixtures/postgres/basic-schema.sql --out /tmp/dbdocgen-test
```

## Development Workflow

### 1. Create a branch

```bash
git checkout -b feat/short-description
# or: fix/, docs/, chore/
```

### 2. Make changes

Project layout:

```
src/
├── cli/           # Commander.js CLI
├── core/          # config, model, pipeline
├── parsers/sql/   # SQL parser + normalizer
└── exporters/     # excel, markdown, html, diagram, word
tests/             # vitest — mirror src/ structure
fixtures/          # sample SQL schemas for tests
```

Guidelines:

- Keep changes focused — one concern per PR.
- Match existing code style (TypeScript strict, ESM).
- Add or update tests when changing behavior.
- Update `README.md` if CLI options, config, or output format change.
- Do not commit generated output (`output/`, `docs/db/`) or local config secrets.

### 3. Run checks before committing

```bash
pnpm typecheck
pnpm test
pnpm lint
pnpm format        # auto-fix formatting
pnpm build         # ensure dist builds cleanly
```

All of `typecheck`, `test`, and `build` must pass.

### 4. Commit

Use clear commit messages:

```
feat: add timestamped output directory
fix: correct Excel internal hyperlinks
docs: update README install instructions
test: cover HTML index page export
```

### 5. Open a Pull Request

PR checklist:

- [ ] `pnpm typecheck` passes
- [ ] `pnpm test` passes
- [ ] `pnpm build` succeeds
- [ ] README updated (if user-facing behavior changed)
- [ ] No unrelated files in the diff

Describe **what** changed and **why**. Include sample CLI output or screenshots for exporter/UI changes when helpful.

## Code Conventions

| Area | Convention |
| ---- | ---------- |
| Language | TypeScript, `"strict": true` |
| Modules | ESM (`import` / `export`) |
| Config validation | Zod schemas in `src/core/config/schema.ts` |
| Output labels | Centralized in `src/exporters/shared/output-labels.ts` |
| Tests | Vitest, files under `tests/**/*.test.ts` |
| CLI | Commander.js in `src/cli/index.ts` |

## Publishing to npm

Package name: **`@cuongph.dev/dbdocgen`** (public scoped package).

Only maintainers with npm publish access should follow this section.

### Prerequisites

```bash
npm login
npm whoami
```

Ensure you have publish rights to the `@cuongph.dev` scope.

### Versioning (SemVer)

| Bump | When |
| ---- | ---- |
| `patch` | Bug fixes, no API change (`0.1.0` → `0.1.1`) |
| `minor` | New features, backward compatible (`0.1.0` → `0.2.0`) |
| `major` | Breaking CLI/config/API changes (`0.1.0` → `1.0.0`) |

Update version in `package.json`:

```bash
# example: patch release
npm version patch   # updates package.json + git tag
# or edit version manually
```

### Pre-publish checklist

- [ ] All changes merged to `main`
- [ ] `pnpm typecheck` passes
- [ ] `pnpm test` passes
- [ ] `pnpm build` produces fresh `dist/`
- [ ] `README.md` reflects current CLI and config
- [ ] Version bumped in `package.json`
- [ ] CHANGELOG or release notes prepared (if applicable)

`prepublishOnly` in `package.json` automatically runs `test` + `typecheck` before publish.

### Publish

```bash
pnpm build
pnpm publish --access public
```

For first publish or if scope access was not set:

```bash
pnpm publish --access public --no-git-checks
```

> Use `--no-git-checks` only when you intentionally publish with a dirty working tree (not recommended).

### Post-publish verification

```bash
# Install globally from npm
npm install -g @cuongph.dev/dbdocgen

# Verify CLI
dbdocgen info
dbdocgen generate --schema fixtures/postgres/basic-schema.sql --out /tmp/dbdocgen-verify

# Verify programmatic import
node -e "import('@cuongph.dev/dbdocgen').then(m => console.log(m.version))"
```

### Tag the release on GitHub

```bash
git tag v0.1.0
git push origin v0.1.0
```

Create a GitHub Release from the tag with a short summary of changes.

## Reporting Issues

Open an issue at:

https://github.com/cuongph-dev-work/sql_documentation_tool/issues

Include:

- Node.js version (`node -v`)
- `dbdocgen` version (`dbdocgen info` or `package.json`)
- SQL dialect (PostgreSQL / MySQL)
- Minimal schema snippet or command that reproduces the problem
- Full error output or unexpected file content

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
