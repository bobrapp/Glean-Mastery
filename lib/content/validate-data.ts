import fs from "node:fs";
import Ajv from "ajv";
import addFormats from "ajv-formats";

type Check = { schema: string; data: string; optional?: boolean };

const CHECKS: Check[] = [
  { schema: "schema/tips.schema.json", data: "data/tips.json" },
  { schema: "schema/leaders.schema.json", data: "data/leaders.json" },
  { schema: "schema/projects.schema.json", data: "data/projects.json" },
];

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

let failures = 0;

for (const check of CHECKS) {
  if (!fs.existsSync(check.data)) {
    if (check.optional) continue;
    console.error(`\u274C Missing data file: ${check.data}`);
    failures++;
    continue;
  }
  if (!fs.existsSync(check.schema)) {
    console.error(`\u274C Missing schema file: ${check.schema}`);
    failures++;
    continue;
  }

  const schema = JSON.parse(fs.readFileSync(check.schema, "utf8"));
  const data = JSON.parse(fs.readFileSync(check.data, "utf8"));
  const validate = ajv.compile(schema);

  if (validate(data)) {
    console.log(`\u2705 ${check.data} valid against ${check.schema}`);
  } else {
    failures++;
    console.error(`\u274C ${check.data} failed validation:`);
    for (const err of validate.errors ?? []) {
      console.error(`   - ${err.instancePath || "(root)"} ${err.message}`);
    }
  }
}

if (failures > 0) {
  console.error(`\n${failures} data validation failure(s).`);
  process.exit(1);
}
console.log("\nAll data files passed schema validation.");
