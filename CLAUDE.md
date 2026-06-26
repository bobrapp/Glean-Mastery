# CLAUDE.md — house rules for Glean-Mastery

You are working in **Glean-Mastery**, the "30 minutes a day to Glean mastery"
curriculum (levels 200→500) plus community registries. It belongs to the AiGovOps
family (Bob Rapp, Ken Johnston). Read this before making changes.

The product is mediated by one master helper agent — **Jeeves** — described in
[`AGENTS.md`](AGENTS.md). These are the rules for *building* the repo; AGENTS.md is the
model for *interacting* with it. They share one principle.

> "Agents do the bureaucracy; humans hold the meaning — and humans hold the keys."

## The one rule that overrides everything: the irreversibility boundary

**Prepare and propose; the human makes the irreversible move.** Edit files, draft
lessons, run the validators, build the manifest, open branches and PRs — freely. But
**pause for Bob's (or Ken's) explicit approval** before anything irreversible, and never
do these autonomously:

- **publishing** content (`status → published`) or **merging to `main`**
- creating accounts, enrolling keys, entering credentials
- deleting data, force-pushing, or rewriting history
- changing access controls, sharing, or repo/account settings
- DNS / registrar / domain changes

When you reach such a step, stop, show exactly what you're about to do, and ask. Flag
risks plainly; never paper over a problem to seem agreeable. Bob values candor over
comfort.

## What this repo is

A content-as-data curriculum with a policy-as-code quality gate, so "looks governed" and
"is governed" stay the same thing.

```
content/weeks/NN/day-NN.mdx   ← curriculum days (frontmatter + lab + working example)
data/                          ← quizzes, tips, leaders, projects, sources of truth
data/content-manifest.json     ← GENERATED & gitignored (built by build:manifest / CI)
schema/                        ← JSON Schemas: day frontmatter, quizzes, registries
policy/content_integrity.rego  ← OPA gate enforced in CI
lib/content/                   ← manifest builder + validator
docs/PROGRAM-OVERVIEW.md        ← program design
.github/workflows/content-ci.yml ← typecheck → build → validate → OPA gate
```

## How to ship a change (branch → gate → PR → human merge)

1. Branch off `main`. Edit `content/` and/or `data/`. Keep claims honest: a day that
   declares a `working_example` must actually contain example code; sources must resolve.
2. Run the gate locally before proposing:
   - `npm run validate` (typecheck + schema + referential integrity)
   - the OPA gate: `opa eval --fail-defined --data policy/content_integrity.rego --input data/content-manifest.json "data.content.integrity.deny[x]"`
3. **Never commit `data/content-manifest.json`** — it's generated and gitignored; CI
   builds it fresh before the gate.
4. Open a PR. Show Bob the diff. **Ask before merging or publishing** — those are the
   `?` holds. On approval: merge; CI re-runs the gate on `main`.

## The status lifecycle

`draft → verified → published`. Only `verified`/`published` content counts toward
mastery. Referential-integrity breaks are **warnings while `draft`, hard errors once
`verified`/`published`**. The OPA gate blocks any published day that still has `[verify]`,
lacks a real case study, or declares a `working_example` with no example code — plus
consent rules for the leader/project registries.

## Design & voice conventions

- Write in prose, not bullet-soup; be precise and honest; don't overclaim. Keep the
  founders' voice.
- Each lesson is one focused 30-minute session: concept → lab → working example → quiz.
- Every lesson also carries a **~10-second Veo video summary** (`video_summary`, ~25–30
  words) suitable for a short Gemini Veo clip.
- Prefer **real, verifiable Glean sources** (glean.com, docs.glean.com,
  developers.glean.com). Never cite a capability you haven't confirmed exists.

## Safety hygiene

- Never commit secrets or API tokens; keep them in the shell session only.
- The registries are consent-gated: a leader/project may not be `published` without
  `consent_to_list: true` (enforced by the OPA gate).
