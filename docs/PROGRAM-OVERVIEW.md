# 30 Minutes a Day to Glean Mastery

A structured, hands-on program that takes learners from no-code users to pro-coders, plus a curated community of the top Glean leaders and deployed projects worldwide.

## Promise

Every lesson is designed for a single focused 30-minute session: read, do a short lab, see a working example, and check understanding with a quiz.

## Level bands (200-500)

| Level | Audience | Outcome |
| ----- | -------- | ------- |
| 200 | No-coder / foundations | Search with intent, understand relevance, navigate results |
| 300 | Power user | Operators, filters, prompts, connectors, saved workflows |
| 400 | Builder | Glean APIs, typed clients, integrations into apps |
| 500 | Pro-coder | Agents, orchestration, governance, scale, evaluation |

## Daily lesson shape (30 minutes)

1. Concept (8-10 min) - read references from `data/sources.json`.
2. Lab (8 min) - a short hands-on exercise in the day's MDX body.
3. Working example (8 min) - runnable, documented code under `examples/`, mapped via `working_example.verified_against`.
4. Check + quiz (4-6 min) - `check_for_understanding` and a `quiz_ref`.

## Content building blocks

- **Curriculum days**: `content/weeks/NN/day-NN.mdx` with YAML frontmatter.
- **Quizzes**: `data/quizzes/week-NN.json`.
- **Tips & Tricks (target: 100)**: `data/tips.json` index + `content/tips/tip-NNN.mdx` steps + `examples/` code.
- **Top 100 Leaders**: `data/leaders.json` (consent-gated, see criteria doc).
- **Top 100 Projects**: `data/projects.json` (consent-gated, see criteria doc).
- **Sources of truth**: `data/sources.json`.

## Quality and automation

- `lib/content/build-manifest.ts` builds `data/content-manifest.json` from all MDX days.
- `lib/content/validate-data.ts` validates every registry against JSON Schemas in `schema/`.
- `policy/content_integrity.rego` (OPA) blocks any day marked `published` that still contains a `[verify]` marker or lacks a real case study mapping.
- `.github/workflows/content-ci.yml` runs the build + policy gate on every push and pull request, and commits the regenerated manifest back to the repo.

## Status lifecycle

`draft` -> `verified` -> `published`. Only `verified`/`published` content counts toward mastery. The OPA gate enforces that published content is clean.

## Roadmap

- Phase 1: Foundations (Weeks 1-3, level 200) - in place.
- Phase 2: Power user (level 300) - expand weeks.
- Phase 3: Builder (level 400) - APIs + integrations.
- Phase 4: Pro-coder (level 500) - agents, governance, scale.
- Continuous: grow Tips to 100; curate Leaders and Projects to 100 each.
