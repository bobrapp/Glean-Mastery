import fs from "node:fs";
import path from "node:path";
import Ajv, { type ValidateFunction } from "ajv";
import addFormats from "ajv-formats";
import matter from "gray-matter";

const SOURCES_PATH = "data/sources.json";
const WEEKS_DIR = "content/weeks";
const QUIZZES_DIR = "data/quizzes";

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

const errors: string[] = [];
const warnings: string[] = [];

function readJson(file: string): any {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

// ValidateFunction<any> so the type-guard call site keeps the input as `any`
// rather than narrowing it to `unknown` (the default generic).
function compile(schemaPath: string): ValidateFunction<any> {
  return ajv.compile(readJson(schemaPath));
}

/** Hard-fail when a verified/published item breaks integrity; warn while draft. */
function flag(status: string, msg: string): void {
  if (status === "verified" || status === "published") errors.push(msg);
  else warnings.push(`(draft) ${msg}`);
}

function ajvErrors(file: string, validate: ValidateFunction): void {
  for (const err of validate.errors ?? []) {
    errors.push(`${file} ${err.instancePath || "(root)"} ${err.message}`);
  }
}

// --- 0. Sources of truth -----------------------------------------------------
const sources: Record<string, any> = readJson(SOURCES_PATH);
const sourceIds = new Set(Object.keys(sources));

function checkSource(status: string, owner: string, id: unknown): void {
  if (typeof id === "string" && id.length > 0 && !sourceIds.has(id)) {
    flag(status, `${owner} references unknown source_id "${id}" (not in ${SOURCES_PATH})`);
  }
}

// --- 1. Registry schemas (tips / leaders / projects) -------------------------
const REGISTRY_CHECKS = [
  { schema: "schema/tips.schema.json", data: "data/tips.json" },
  { schema: "schema/leaders.schema.json", data: "data/leaders.json" },
  { schema: "schema/projects.schema.json", data: "data/projects.json" },
];

for (const check of REGISTRY_CHECKS) {
  const validate = compile(check.schema);
  const data = readJson(check.data);
  if (validate(data)) {
    console.log(`✅ ${check.data} valid against ${check.schema}`);
  } else {
    ajvErrors(check.data, validate);
  }
}

// --- 2. Quizzes: schema + answer-index range, build id index -----------------
const quizValidate = compile("schema/quiz.schema.json");
const quizIds = new Set<string>();

if (fs.existsSync(QUIZZES_DIR)) {
  for (const name of fs.readdirSync(QUIZZES_DIR).sort()) {
    if (!name.endsWith(".json")) continue;
    const file = path.join(QUIZZES_DIR, name);
    const quiz = readJson(file);
    if (quizValidate(quiz)) {
      quizIds.add(quiz.id);
      for (const q of quiz.questions ?? []) {
        if (q.type === "mc" && Array.isArray(q.options) && typeof q.answer_index === "number") {
          if (q.answer_index < 0 || q.answer_index >= q.options.length) {
            errors.push(`${file} question ${q.id}: answer_index ${q.answer_index} out of range (0..${q.options.length - 1})`);
          }
        }
      }
      console.log(`✅ ${file} valid against schema/quiz.schema.json`);
    } else {
      ajvErrors(file, quizValidate);
    }
  }
}

// --- 3. Curriculum days: frontmatter schema + referential integrity ----------
const dayValidate = compile("schema/day.schema.json");

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? walk(p) : p.endsWith(".mdx") ? [p] : [];
  });
}

if (fs.existsSync(WEEKS_DIR)) {
  for (const file of walk(WEEKS_DIR).sort()) {
    const { data } = matter(fs.readFileSync(file, "utf8"));
    if (!dayValidate(data)) {
      ajvErrors(file, dayValidate);
      continue; // frontmatter is malformed; skip ref checks for this file
    }
    const status: string = data.status;

    for (const ref of data.references ?? []) checkSource(status, `${file} references[]`, ref?.source_id);
    checkSource(status, `${file} case_study`, data.case_study?.source_id);
    checkSource(status, `${file} working_example`, data.working_example?.verified_against);

    if (data.quiz_ref && !quizIds.has(data.quiz_ref)) {
      flag(status, `${file} quiz_ref "${data.quiz_ref}" has no matching quiz in ${QUIZZES_DIR}`);
    }
  }
}

// --- 4. Tips referential integrity (steps_ref / code_ref / verified_against) -
const tips = readJson("data/tips.json");
for (const tip of tips.tips ?? []) {
  const status: string = tip.status;
  checkSource(status, `tip ${tip.id} verified_against`, tip.verified_against);
  for (const key of ["steps_ref", "code_ref"]) {
    const ref = tip[key];
    if (typeof ref === "string" && ref.length > 0 && !fs.existsSync(ref)) {
      flag(status, `tip ${tip.id} ${key} points to missing file "${ref}"`);
    }
  }
}

// --- Report ------------------------------------------------------------------
if (warnings.length > 0) {
  console.warn(`\n⚠️  ${warnings.length} warning(s) (draft content — not blocking):`);
  for (const w of warnings) console.warn(`   - ${w}`);
}

if (errors.length > 0) {
  console.error(`\n❌ ${errors.length} validation error(s):`);
  for (const e of errors) console.error(`   - ${e}`);
  process.exit(1);
}

console.log("\n✅ All schema and referential-integrity checks passed.");
