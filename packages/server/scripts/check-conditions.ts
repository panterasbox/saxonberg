/**
 * check-conditions — the authored-condition value gate.
 *
 * ⭐⭐ **The failure this exists to stop is the one the consequence build
 * was written to end, reintroduced by its own new surface.**
 *
 * Since the eight-arm unification a `Condition` row declares **how its
 * stage advances** (`progression.law`) and **what carrying it does**
 * (`signature`). Both are free-text-ish in YAML, and both fail closed and
 * silent when they are wrong:
 *
 *   - a **misspelled or missing `law`** falls through the arm's switch and
 *     the condition never progresses at all — the row is authored, warmed,
 *     afflicted, read, and inert;
 *   - a `signature` entry with an **unknown `kind`** is skipped by the
 *     interpreter;
 *   - a `vital` effect naming a **sign that does not exist** is a no-op —
 *     ⚠ and a *deliberate* no-op is a real feature (a bloodless clade
 *     absorbs a bleed, D22), which is exactly why an accidental one has
 *     to be caught here rather than at runtime: the two are
 *     indistinguishable in play.
 *
 * `lint:unconsumed-seams` counts fields nothing reads; this counts fields
 * whose VALUE nothing can read. Same failure class, other end.
 *
 * A `progression: null` row is fine and common: five shipped rows have a
 * driver outside the condition collection that owns their clock (the
 * metabolic collapse gate, respiration's `spo2`, thermal's temperature).
 * What is refused is a progression block with no law, or a law that is
 * not one of the four.
 */

import { readdirSync, readFileSync, statSync, existsSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";
import YAML from "yaml";

const EXIT_ON_FINDINGS = true; // CI-gating
const CONDITION_CLASS = "/platform/idea/Condition";
const EFFECT_KINDS = ["vital", "reserve", "capability", "expression"];

const CONTENT_DIR = fileURLToPath(new URL("../../content", import.meta.url));
const SRC = fileURLToPath(new URL("../src", import.meta.url));

/**
 * ⭐ Both vocabularies are READ OUT OF THEIR SOURCE, by text, rather than
 * imported or copied.
 *
 * Imported is impossible: pulling `Vitals.ts` into a script drags the
 * whole mudlib decorator machinery in and dies at module load. Copied is
 * how a gate silently stops matching — the `lint:blessed-bands` lesson.
 * Reading the `as const` literal keeps one source of truth and makes a
 * vocabulary change need no edit here.
 */
function vocabulary(relPath: string, name: string): string[] {
  const src = readFileSync(join(SRC, relPath), "utf8");
  const m = new RegExp(
    `(?:export )?const ${name}(?::[^=]*)? = \\[([^\\]]*)\\]`,
  ).exec(src);
  if (!m?.[1]) {
    throw new Error(
      `check-conditions: could not read ${name} from ${relPath} — the gate ` +
        `would silently pass. Fix the reader.`,
    );
  }
  return [...m[1].matchAll(/['"]([^'"]+)['"]/g)].map((x) => x[1]!);
}

const PROGRESSION_LAWS = vocabulary(
  "mud/platform/idea/Condition.ts",
  "PROGRESSION_LAWS",
);
const VITAL_SIGNS = vocabulary("mud/lib/vitals/Vitals.ts", "VITAL_SIGNS");

function* walkYaml(dir: string): Generator<string> {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const e of entries) {
    const p = join(dir, e);
    let st;
    try {
      st = statSync(p);
    } catch {
      continue;
    }
    if (st.isDirectory()) {
      if (e === "node_modules" || e === "dist") continue;
      yield* walkYaml(p);
    } else if (e.endsWith(".yaml") || e.endsWith(".yml")) {
      yield p;
    }
  }
}

/** Every finding in one authored condition row. Pure — exported for the test. */
export function findingsIn(
  file: string,
  doc: { class?: string; data?: Record<string, unknown> },
): string[] {
  if (doc.class !== CONDITION_CLASS) return [];
  const out: string[] = [];
  const data = doc.data ?? {};

  const prog = data.progression;
  if (prog !== undefined && prog !== null) {
    if (typeof prog !== "object") {
      out.push(`${file}: 'progression' must be a mapping or null`);
    } else {
      const law = (prog as Record<string, unknown>).law;
      if (law === undefined) {
        out.push(
          `${file}: 'progression' with no 'law' — the arm's switch falls ` +
            `through and this condition never progresses at all`,
        );
      } else if (!PROGRESSION_LAWS.includes(String(law))) {
        out.push(
          `${file}: progression.law '${String(law)}' is not one of ` +
            `${PROGRESSION_LAWS.join(" | ")} — silently inert`,
        );
      }
    }
  }

  const sig = data.signature;
  if (sig !== undefined && sig !== null) {
    if (!Array.isArray(sig)) {
      out.push(`${file}: 'signature' must be a list`);
    } else {
      for (const raw of sig) {
        const e = raw as Record<string, unknown>;
        if (!e || typeof e !== "object") {
          out.push(`${file}: a signature entry is not a mapping`);
          continue;
        }
        const kind = e.kind;
        if (!EFFECT_KINDS.includes(kind as string)) {
          out.push(
            `${file}: signature kind '${String(kind)}' is not one of ` +
              `${EFFECT_KINDS.join(" | ")} — the interpreter skips it`,
          );
          continue;
        }
        if (kind === "vital") {
          if (!VITAL_SIGNS.includes(String(e.sign))) {
            out.push(
              `${file}: signature names vital sign '${String(e.sign)}', ` +
                `which does not exist — indistinguishable in play from the ` +
                `DELIBERATE no-op a bloodless clade relies on`,
            );
          }
          if (typeof e.perHour !== "number") {
            out.push(
              `${file}: a 'vital' effect needs a numeric 'perHour' (a RATE — ` +
                `a bare delta has no meaning across an absence)`,
            );
          }
        }
        if (kind === "reserve" && typeof e.pctPerHour !== "number") {
          out.push(`${file}: a 'reserve' effect needs a numeric 'pctPerHour'`);
        }
        if (kind === "expression" && typeof e.bands !== "number") {
          out.push(`${file}: an 'expression' effect needs numeric 'bands'`);
        }
        if (kind === "capability" && e.disables !== "slots-at-site") {
          out.push(
            `${file}: a 'capability' effect must disable 'slots-at-site'`,
          );
        }
      }
    }
  }

  const res = data.resolution;
  if (res !== undefined && res !== null) {
    if (typeof res !== "object") {
      out.push(`${file}: 'resolution' must be a mapping or null`);
    } else if (typeof (res as Record<string, unknown>).by !== "string") {
      out.push(`${file}: 'resolution' needs a 'by' token`);
    }
  }

  return out;
}

function main(): void {
  if (!existsSync(CONTENT_DIR)) {
    console.log("check-conditions: no content tree; nothing to check.");
    return;
  }
  const findings: string[] = [];
  let rows = 0;
  for (const file of walkYaml(CONTENT_DIR)) {
    let doc: { class?: string; data?: Record<string, unknown> };
    try {
      doc = YAML.parse(readFileSync(file, "utf8")) ?? {};
    } catch {
      continue; // a malformed row is another lint's job
    }
    if (doc.class !== CONDITION_CLASS) continue;
    rows++;
    findings.push(...findingsIn(file.replace(CONTENT_DIR, "content"), doc));
  }

  if (findings.length === 0) {
    console.log(
      `check-conditions: all ${rows} condition row(s) declare a readable ` +
        `law and a readable signature.`,
    );
    return;
  }
  console.warn(
    `\n[lint — ${EXIT_ON_FINDINGS ? "ERROR" : "WARN"}] ${findings.length} ` +
      `unreadable condition value(s):`,
  );
  for (const f of findings) console.warn(`  ${f}`);
  if (EXIT_ON_FINDINGS) process.exit(1);
}

const invokedDirectly =
  process.argv[1] !== undefined &&
  process.argv[1].endsWith("check-conditions.ts");
if (invokedDirectly) main();
