/**
 * ⭐⭐⭐ `lint:command-views` — **every command view validates against the
 * command schema, before anybody boots into it.**
 *
 * ## Why it ships first (controllers-are-io W0, D26)
 *
 * A view is a `command-view` DOCUMENT. The pack installer validates each
 * one at read (`PackLogic`'s `DOCUMENT_VALIDATORS` →
 * `CommandApi.validateCommandView`) and a single malformed view **fails
 * the whole pack** — so a sweep that touches hundreds of views (this
 * build's one-word and category sweeps) can break the platform install,
 * and once did. Until this gate the only reader was the boot.
 *
 * ## The two halves
 *
 * 1. **Schema (HARD, zero).** Every `cmd/**\/*.yaml` view under every pack's
 *    `content/` (the controller rows under `idea/cmd/` excluded, the shipped
 *    path rule) conforms to `src/mud/lib/command/command.schema.json`,
 *    compiled exactly as `commandSpecValidator()` compiles it (`ajv`,
 *    `allErrors: true`, `strict: false`), plus the one rule that validator
 *    adds by hand: every `opens_card` id is a real `CARD_IDS` entry.
 *    ⚠ The logic singleton cannot be imported by a script without booting
 *    the world (its module graph is the runtime), so the gate compiles the
 *    SAME schema file with the SAME options — the schema file is the one
 *    copy; the compile is two lines.
 * 2. **Category (WARNING until W6).** `category:` equals the view's
 *    `cmd/<category>/` directory (D24). No view carries `category:` yet,
 *    so this half reports a count and does not fail. W6 flips
 *    `CATEGORY_REQUIRED` and the half gates from then on. ⚠ The ten
 *    domain-local views (`world/<sphere>/<locality>/cmd/<verb>.yaml`) sit
 *    in NO category directory; they are reported on their own line,
 *    because "equal to its directory" has nothing to agree with there.
 */

import { readFileSync } from "fs";
import { dirname, join, relative, resolve, sep } from "path";
import { fileURLToPath, pathToFileURL } from "url";
import Ajv, { type ValidateFunction } from "ajv";
import YAML from "yaml";
import { CARD_IDS } from "@saxonberg/types";
import { CONTENT } from "./pack-roots";
import { allViews } from "./check-verb-collisions";

const HERE = dirname(fileURLToPath(import.meta.url));
const SCHEMA = join(HERE, "..", "src", "mud", "lib", "command", "command.schema.json");

/**
 * ⭐ The one switch W6 flips: `false` reports category disagreements as a
 * warning count; `true` fails on any.
 */
export const CATEGORY_REQUIRED = false;

let validator: ValidateFunction | null = null;

/** The schema compiled exactly as `CommandLogic.commandSpecValidator()` does. */
function compiled(): ValidateFunction {
  if (validator) return validator;
  const schema = JSON.parse(readFileSync(SCHEMA, "utf8")) as object;
  validator = new Ajv({ allErrors: true, strict: false }).compile(schema);
  return validator;
}

/** `null` when `view` conforms, else the error trail (the validator's own shape). */
export function schemaTrail(view: unknown): string | null {
  const validate = compiled();
  if (!validate(view)) {
    return (validate.errors ?? [])
      .map((e) => `  ${e.instancePath || "/"} ${e.message ?? ""}`)
      .join("\n");
  }
  const raw = (view as { opens_card?: unknown } | null)?.opens_card;
  const declared = raw === undefined ? [] : Array.isArray(raw) ? raw : [raw];
  for (const id of declared) {
    if (typeof id !== "string" || !(CARD_IDS as readonly string[]).includes(id)) {
      return `  /opens_card '${String(id)}' is not a card (known: ${CARD_IDS.join(", ")})`;
    }
  }
  return null;
}

/** The `cmd/<category>/` directory a view sits in, or null for a flat `cmd/<verb>.yaml`. */
export function categoryDirOf(file: string): string | null {
  const parts = file.split(sep);
  const at = parts.lastIndexOf("cmd");
  if (at < 0 || parts.length - at - 1 < 2) return null;
  return parts[at + 1] ?? null;
}

export interface ViewFinding {
  file: string;
  detail: string;
}

export interface ViewsReport {
  views: number;
  schema: ViewFinding[];
  /** `category:` missing or not equal to its directory. */
  category: ViewFinding[];
  /** Views in no `cmd/<category>/` directory. */
  noCategoryDir: ViewFinding[];
}

export function run(contentDir: string = CONTENT): ViewsReport {
  const files = allViews(contentDir);
  const report: ViewsReport = { views: files.length, schema: [], category: [], noCategoryDir: [] };
  for (const file of files) {
    const rel = relative(contentDir, file);
    let doc: unknown;
    try {
      doc = YAML.parse(readFileSync(file, "utf8"));
    } catch (e) {
      report.schema.push({ file: rel, detail: `  / does not parse: ${(e as Error).message}` });
      continue;
    }
    const trail = schemaTrail(doc);
    if (trail !== null) report.schema.push({ file: rel, detail: trail });
    const dir = categoryDirOf(file);
    const declared = (doc as { category?: unknown } | null)?.category;
    if (dir === null) {
      report.noCategoryDir.push({ file: rel, detail: "in no cmd/<category>/ directory" });
    } else if (declared !== dir) {
      report.category.push({
        file: rel,
        detail:
          declared === undefined
            ? `no category: (directory says '${dir}')`
            : `category: '${String(declared)}' but the directory says '${dir}'`,
      });
    }
  }
  return report;
}

function main(): void {
  const r = run();
  console.log(
    `check-command-views: ${r.views} view(s); schema ${r.schema.length} failure(s) (must be 0); ` +
      `category ${r.category.length} disagreement(s) + ${r.noCategoryDir.length} in no category ` +
      `directory (${CATEGORY_REQUIRED ? "REQUIRED" : "warning until W6"}).`,
  );
  let failed = false;
  if (r.schema.length > 0) {
    failed = true;
    console.error(
      `\ncheck-command-views: ✗ ${r.schema.length} view(s) do not conform to the command schema — ` +
        `the pack installer would refuse the WHOLE pack at boot:\n`,
    );
    for (const f of r.schema) console.error(`  ✗ ${f.file}\n${f.detail}`);
  }
  if (CATEGORY_REQUIRED && r.category.length + r.noCategoryDir.length > 0) {
    failed = true;
    console.error(`\ncheck-command-views: ✗ category: must equal the view's cmd/<category>/ directory:\n`);
    for (const f of [...r.category, ...r.noCategoryDir]) console.error(`  ✗ ${f.file}: ${f.detail}`);
  }
  if (failed) process.exit(1);
  console.log("check-command-views: ✔");
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main();
}
