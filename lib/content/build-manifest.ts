import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const SOURCES_PATH = "data/sources.json";
const WEEKS_DIR = "content/weeks";
const OUT_PATH = "data/content-manifest.json";

if (!fs.existsSync(SOURCES_PATH)) {
  console.error(`❌ Missing ${SOURCES_PATH}`);
  process.exit(1);
}

if (!fs.existsSync(WEEKS_DIR)) {
  console.error(`❌ Missing ${WEEKS_DIR}`);
  process.exit(1);
}

const sources = JSON.parse(fs.readFileSync(SOURCES_PATH, "utf8"));

function readJsonOr(file: string, fallback: any): any {
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : fallback;
}

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? walk(p) : p.endsWith(".mdx") ? [p] : [];
  });
}

const generated_at = new Date().toISOString();

const days = walk(WEEKS_DIR)
  .map((file) => {
    const raw = fs.readFileSync(file, "utf8");
    const { data } = matter(raw);
    const refs = Array.isArray(data.references) ? data.references : [];
    const source_ids = [
      ...refs.map((r: any) => r?.source_id).filter(Boolean),
      data.case_study?.source_id,
      data.working_example?.verified_against,
    ].filter(Boolean);

    const caseSrc = sources[data.case_study?.source_id] ?? null;

    // Strip the frontmatter block, then look for a fenced code block in the body.
    const body = raw.replace(/^---\n[\s\S]*?\n---\n/, "");

    return {
      file,
      week: data.week,
      day: data.day,
      level: data.level,
      title: data.title,
      theme: data.theme,
      status: data.status,
      nist_rmf: data.nist_rmf ?? [],
      quiz_ref: data.quiz_ref ?? null,
      source_ids,
      case_study_type: caseSrc?.type ?? null,
      has_verify_marker: /\[verify\]/.test(raw),
      declares_working_example: Boolean(data.working_example),
      has_example_code: body.includes("```"),
      has_video_summary: Boolean(data.video_summary && String(data.video_summary).trim()),
    };
  })
  .sort((a, b) => (a.week - b.week) || (a.day - b.day));

// Registry summaries — minimal projections the OPA gate needs to enforce
// consent and verification on anything marked published.
const tipsData = readJsonOr("data/tips.json", { tips: [] });
const leadersData = readJsonOr("data/leaders.json", { leaders: [] });
const projectsData = readJsonOr("data/projects.json", { projects: [] });

const leaders = (leadersData.leaders ?? []).map((l: any) => ({
  id: l.id,
  status: l.status,
  consent_to_list: l.consent_to_list ?? false,
}));
const projects = (projectsData.projects ?? []).map((p: any) => ({
  id: p.id,
  status: p.status,
  consent_to_list: p.consent_to_list ?? false,
}));
const tips = (tipsData.tips ?? []).map((t: any) => ({
  id: t.id,
  status: t.status,
  has_code_ref: Boolean(t.code_ref),
  verified_against: t.verified_against ?? null,
}));

const manifest = {
  schema_version: "1.1.0",
  generated_at,
  totals: {
    days: days.length,
    published_days: days.filter((d) => d.status === "published").length,
    verified_days: days.filter((d) => d.status === "verified").length,
    draft_days: days.filter((d) => d.status === "draft").length,
  },
  days,
  registries: { leaders, projects, tips },
};

fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
fs.writeFileSync(OUT_PATH, JSON.stringify(manifest, null, 2) + "\n", "utf8");
console.log(`✅ Wrote ${OUT_PATH} (${days.length} days)`);
