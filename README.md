# Glean-Mastery

**30 minutes a day to Glean mastery** — a structured, hands-on curriculum (levels
200→500) plus curated community registries (Top 100 Leaders, Top 100 Projects) and a
growing library of 100 tips & tricks. Content is treated as data and gated by
policy-as-code, so "looks governed" and "is governed" stay the same thing.

→ Full program design: [`docs/PROGRAM-OVERVIEW.md`](docs/PROGRAM-OVERVIEW.md)

## Layout

| Path | What it holds |
| ---- | ------------- |
| `content/weeks/NN/day-NN.mdx` | Curriculum days — YAML frontmatter + lab body |
| `data/quizzes/week-NN.json` | Weekly quizzes (`quiz_ref` targets) |
| `data/tips.json` | Tips & tricks registry (target: 100) |
| `data/leaders.json` · `data/projects.json` | Consent-gated community registries |
| `data/sources.json` | Sources of truth that content verifies against |
| `data/content-manifest.json` | **Generated** — do not edit by hand |
| `schema/` | JSON Schemas: day frontmatter, quizzes, and each registry |
| `policy/content_integrity.rego` | OPA gate enforced in CI |
| `lib/content/` | Manifest builder + validator |

## Develop

```bash
npm install          # or: npm ci  (reproducible, uses package-lock.json)

npm run build:manifest   # regenerate data/content-manifest.json from the MDX days
npm run validate:data    # schema + referential-integrity checks
npm run typecheck        # tsc --noEmit over lib/
npm run validate         # build:manifest + validate:data
```

## How the gates work

1. **Schema validation** — every day's frontmatter, every quiz, and each registry
   are validated against the schemas in `schema/`. Structural problems fail hard.
2. **Referential integrity** — `validate:data` confirms that `source_id`, `quiz_ref`,
   `steps_ref`, and `code_ref` all resolve. Broken refs are **warnings while an item is
   `draft`** and become **hard errors once it is `verified`/`published`**.
3. **Policy gate (OPA)** — `policy/content_integrity.rego` blocks any published day that
   still contains `[verify]` or lacks a real case study, any published leader/project
   without `consent_to_list: true`, and any published tip that ships code without citing
   what it was `verified_against`.

CI (`.github/workflows/content-ci.yml`) runs all three on every push and PR, and commits
the regenerated manifest on push to `main`.

## Status lifecycle

`draft → verified → published`. Only `verified`/`published` content counts toward mastery,
and the gates above are what a piece of content must survive to be promoted.
