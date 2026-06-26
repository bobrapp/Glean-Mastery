# The 8-Week Curriculum — 56 days to Glean Mastery

The full build plan for "30 minutes a day to Glean mastery": **8 weeks × 7 days = 56
distinct, non-overlapping lessons**, level-laddered 200 → 500 and **front-loaded** toward
foundations. Each day is a 30-minute session (concept → lab → working example → quiz) and
carries a ~10-second `video_summary` for a short Gemini Veo clip.

Grounded in a verified pass over Glean's official product and developer surface (see
**Sources** and **Honesty flags** below). The existing 7 published days fold into this
map and are marked *(exists)*.

## Level bands (front-loaded)

| Weeks | Level | Audience |
| ----- | ----- | -------- |
| 1–3 | **200** | Foundations / no-coder |
| 4–6 | **300** | Power user |
| 7 | **400** | Builder / APIs |
| 8 | **500** | Pro-coder / agents / governance |

## Weeks 1–3 · Level 200 · Foundations

**Week 1 — searching with intent**
1. What enterprise search is & the Enterprise Graph — how Glean connects work across people, projects, teams.
2. Keyword vs. natural-language questions — pick the query mode that fits the answer you want.
3. Intent: fact vs. document vs. person — name the intent before you type. *(exists)*
4. Reading results & relevance — interpret ranking and snippets; tell intent-mismatch from ranking-mismatch.
5. The `type:` filter — narrow by document type.
6. The `app:` filter — scope a query to one connected system.
7. The `from:` / `from:me` filter — find documents by author or owner.

**Week 2 — time, place, and history**
1. `updated:` time filters (`today` / `past_week` / `past_month`) — bound results by recency.
2. `after:` / `before:` date ranges — precise quoted-date windows.
3. `in:` / `collection:` — search within a container or collection.
4. `my:history` — re-find what you've already seen.
5. Glean Assistant / Chat basics — ask a question, get a cited answer.
6. Verifying answers & citations — check the sources before you trust the answer.
7. Combining operators — stack filters for precision. *(refit of existing "operators" day)*

**Week 3 — built-in Skills & connected apps**
1. Consuming built-in Glean Skills — reusable instruction + tool packages.
2. Per-app search: Google Drive & Slack facets.
3. Per-app search: Jira (project, priority, assignee, sprint).
4. Per-app search: Confluence (space, author, label).
5. Per-app search: Salesforce (stage, amount, closedate).
6. Per-app search: GitHub/GitLab, Teams, Gong, Zendesk — round-up.
7. Foundations capstone — a real end-to-end search workflow (anchor: Confluent).

## Weeks 4–6 · Level 300 · Power user

**Week 4 — precision & saved workflows**
1. Operator-stacking mastery — narrow a noisy query one constraint at a time. *(exists)*
2. Facets vs. operators — when to click vs. type.
3. Ranking signals & trade-offs — how signals blend; what to test first. *(refit of existing day)*
4. Repeatable search recipes / saved views.
5. Cross-app investigation — trace one topic across systems via the graph.
6. Assistant 3.0 "Thinking mode" — when to invoke multi-step reasoning.
7. Prompts that route reliably — structure asks for consistent answers.

**Week 5 — authoring & routing Skills**
1. Author a Personal Skill (creator-only).
2. Skill anatomy — `SKILL.md`, templates, examples, scripts.
3. Skill routing — how Glean auto-selects a Skill (most reliable in Thinking mode).
4. Explicit invocation — by name and `/slash` commands.
5. Sharing Skills — promote a Personal Skill to a Shared Skill.
6. Skill quality & iteration — descriptions that route reliably.
7. Power-user capstone — a Skill that automates a recurring task.

**Week 6 — the conversational agent builder (Beta)**
1. Intro to the vibe-code agent builder — build by chatting. **(Beta — flag status)**
2. Agent steps & instructions — iterate the plan conversationally.
3. The 100+ native actions (Slack/Microsoft/Salesforce/Jira/GitHub/Google). **(Beta)**
4. Scheduled triggers — run an agent on a schedule.
5. Looping over data — process a dataset step by step.
6. Versioning & lifecycle — version control for agents.
7. Power-user capstone 2 — ship a small scheduled agent (anchors: Zillow, Super.com).

## Week 7 · Level 400 · Builder / APIs
1. Developer Platform overview & typed clients (Python / TypeScript / Java / Go).
2. Authentication — OAuth vs. Glean-issued tokens (user-scoped vs. global); the gotchas.
3. The Search API — programmatic retrieval with a typed client. *(exists)*
4. The Chat API — grounded answers with citations and tool use.
5. Client vs. Indexing API — the split and what each is for.
6. The Indexing API — push datasources, documents, people, permissions.
7. The Web SDK — embed Chat / Autocomplete+Search / Modal / Sidebar / Recommendations.

## Week 8 · Level 500 · Pro / agents / governance
1. Agent run-modes — run on Glean, call via API, or expose as MCP.
2. The MCP endpoint — connect Glean as an MCP server.
3. IDE plugins — Glean in Claude Code and Cursor.
4. The agent toolkit — build with CrewAI / Google ADK / LangGraph / OpenAI.
5. Tool use & orchestration — multi-step, multi-tool agents with layered guardrails. *(exists ×2)*
6. The Governance API & agent governance — policy, permissions, compliance reporting.
7. Capstone — map controls to the NIST AI RMF (instructional) + agent evaluation (anchor: DBS scale).

## Honesty flags (carried from verification — do not lose these)

- **The 200→500 ladder is our instructional framing, not an official Glean certification.**
  No Glean Academy/cert path survived verification (one academy tutorial claim was refuted).
- **Week 6 features are Beta / Fall-'25-announcement-sourced** (vibe-code builder, 100+
  actions, triggers/looping/versioning). Each lesson must flag GA-vs-Beta and re-verify
  before a cohort ships.
- **NIST AI RMF mapping is instructional synthesis**, not a documented Glean crosswalk.
- **Do not reuse** the refuted Enterprise Graph "powers permissions-enforced search across
  100+ connectors" framing (killed in verification).
- **"No prompt engineering required"** is vendor framing — attribute it, don't assert it.

## Real case-study anchors (verified metrics, for `sources.json`)

- **Confluent** — 15,000+ hours saved monthly; 70%+ adoption; 500 agents in 6 weeks.
- **Zillow** — 1.5+ hrs/week saved per employee; 80% adoption across 7,000; 3,400 agents.
- **Super.com** — 17× ROI; ~20 min/day faster; 1,500+ hrs/month.
- **DBS** — 40,000+ employees; ~10% of work hours freed.

## Sources (verified primary, 2026-06-26)

- Search basics — https://docs.glean.com/user-guide/basics/how-to-search-in-glean
- Advanced filters — https://docs.glean.com/user-guide/advanced/advanced-search-filter
- Datasource filters — https://developers.glean.com/guides/search/datasource-filters
- Enterprise Graph — https://www.glean.com/product/enterprise-graph
- Assistant Skills — https://docs.glean.com/user-guide/assistant/skills
- Fall '25 launch (agentic engine, agent builder) — https://www.glean.com/blog/live-fall-25-main
- Developer Platform — https://developers.glean.com/
- API clients — https://developers.glean.com/libraries/api-clients
- Authentication — https://developers.glean.com/get-started/authentication
- Web SDK — https://developers.glean.com/libraries/web-sdk/overview
- MCP — https://docs.glean.com/administration/platform/mcp/about
- Customer stories — https://www.glean.com/resources/customer-stories

## Build order

One week per PR (7 days each), Week 1 first so the *shape* is reviewed before scaling ×8.
Every day ships with: a real working example, resolving `sources.json` entries, a matching
quiz, and a `video_summary` — all enforced by `npm run validate` + the OPA gate.
