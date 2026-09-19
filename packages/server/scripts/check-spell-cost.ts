/**
 * check-spell-cost — ⭐⭐ **the gate that keeps a spell's price honest.**
 *
 * `docs/arcane-science.md` rule 1: magic **moves and rearranges**; it does
 * not manufacture energy. Rule 6: the efficiency of a working is `η ≤ 1`.
 * Neither had a reader anywhere, and the flagship spell violated both by a
 * factor of **forty-five**: firebolt authored `cost: 20` (20 kJ committed)
 * against `joules: 900000` delivered. A wand that returns 45× what it
 * costs is a free power plant, and the world's own published science says
 * it cannot exist.
 *
 * ⚠⚠ **Channel-aware, never a flat `η ≤ 1`.** That is the whole design of
 * this script, and getting it wrong would have been worse than no gate:
 *
 *   - **delivery** — an `inject-channel` effect with `joules` on a channel
 *     that DEPOSITS energy (`heat` today). Require
 *     `joules ≤ cost × 1000 × η(channel)` at the most efficient band. η
 *     comes from the price list, carried below beside its doc citation.
 *   - **cooling** — `channel: cold`. **Not an η check.** A coefficient of
 *     performance above 1 is what a heat pump *means*: moving 100 kJ out
 *     of something near ambient costs ~14 kJ of work, and calling that
 *     "η = 7" would be a category error. What is required instead is that
 *     the row **declares a lift** — `costModel: {kind: heat-pump}` — so
 *     its price is computed from the temperature difference rather than
 *     authored flat. Rule 4: *cooling has no fixed price*, and a
 *     flat-cost cold spell is itself the physics error.
 *   - **rows with no `joules`** are outside the gate's jurisdiction.
 *     Twelve of the thirteen shipped spells declare none, and `energy` is
 *     an abstract covering-fold token, not a quantity of anything — it is
 *     not checked, and pretending it could be would be the dimensional
 *     mistake this gate exists to prevent.
 *
 * The census-then-ratchet shape (`check-does-nothing` / `check-condition-arms`
 * precedent): a standalone walk over every `Spell`-class row in every pack,
 * with a CEILING that may fall and may never rise. It joins `lint:family`
 * by being a `lint:*` script in `package.json` — there is no list to edit.
 *
 *   tsx scripts/check-spell-cost.ts           # gate (exits non-zero over)
 *   tsx scripts/check-spell-cost.ts --list    # every row and its verdict
 */

import { readdirSync, readFileSync, statSync, existsSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";
import { parse } from "yaml";

const CONTENT_DIR = fileURLToPath(new URL("../../content", import.meta.url));
const SPELL_CLASS = "/platform/idea/magic/Spell";

/**
 * ⭐ **The price list, as code, with its citation.**
 *
 * `docs/arcane-science.md` § the price list gives the efficiency ceiling
 * for each delivery channel — the fraction of committed mana that can
 * arrive as useful energy at the target. `heat` is 1.0 because raising a
 * thing's temperature is the one conversion with no intermediate step to
 * lose anything in; anything that has to do mechanical work on the way
 * will be lower.
 *
 * ⚠ A channel absent from this table is **not** checked. That is
 * deliberate: a new depositing channel should have its ceiling argued in
 * the doc and added here, not silently inherit somebody else's number.
 *
 * → A later build may lift this into an authored row so the wiki and the
 *   gate read one source (`capability-magic-slate`).
 */
const DELIVERY_EFFICIENCY: Record<string, number> = {
  heat: 1.0,
};

/** Channels whose price is a LIFT, not an efficiency — see the header. */
const COOLING_CHANNELS = new Set(["cold"]);

/**
 * ⭐ Today's violation count. **May fall; may never rise.** The same wave
 * that created this gate drove it to 0 by correcting firebolt; it is
 * pinned there so the next 45× spell fails CI instead of shipping.
 */
const CEILING = 0;

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

/** The largest value an authored scalar-or-band-array can take. */
function peak(value: unknown): number | null {
  if (typeof value === "number") return value;
  if (Array.isArray(value)) {
    const nums = value.filter((v): v is number => typeof v === "number");
    return nums.length > 0 ? Math.max(...nums) : null;
  }
  return null;
}

/**
 * Every finding in one authored spell row. Pure — exported for the test.
 *
 * ⚠ An `export function` in a script, which the export-discipline rule
 * would normally refuse. Scripts are not `src/mud/**`; the precedent is
 * `check-conditions.ts`'s `findingsIn`, and the reason is the same: a
 * gate whose decision function cannot be unit-tested is a gate nobody can
 * prove works, and gates that ship broken and silently pass are a
 * documented failure in this repo.
 */
export function findingsIn(
  file: string,
  doc: { class?: string; data?: Record<string, unknown> },
): string[] {
  if (doc.class !== SPELL_CLASS) return [];
  const data = doc.data ?? {};
  const out: string[] = [];

  const cost = typeof data.cost === "number" ? data.cost : 0;
  const costModel = data.costModel as { kind?: string } | undefined;
  const effects = Array.isArray(data.effects) ? data.effects : [];

  for (const raw of effects) {
    const e = raw as Record<string, unknown>;
    if (e.kind !== "inject-channel") continue;
    const channel = typeof e.channel === "string" ? e.channel : "";

    // ── cooling: a LIFT, not an efficiency ──────────────────────────
    if (COOLING_CHANNELS.has(channel)) {
      if (costModel?.kind !== "heat-pump") {
        out.push(
          `${file}: a '${channel}' effect with a FLAT cost — cooling has ` +
            `no fixed price (arcane-science rule 4). Its cost depends on ` +
            `the temperature difference it works across, so the row must ` +
            `declare 'costModel: {kind: heat-pump}'.`,
        );
      }
      continue;
    }

    // ── delivery: η ≤ the channel's ceiling ─────────────────────────
    const joules = peak(e.joules);
    if (joules === null) continue; // nothing dimensional to check
    const eta = DELIVERY_EFFICIENCY[channel];
    if (eta === undefined) continue; // channel has no argued ceiling yet
    const ceilingJ = cost * 1000 * eta;
    if (joules > ceilingJ) {
      const ratio = cost > 0 ? (joules / (cost * 1000)).toFixed(1) : "∞";
      out.push(
        `${file}: a '${channel}' effect delivers ${joules} J against ` +
          `cost ${cost} τ (${cost * 1000} J committed) — η ≈ ${ratio}, ` +
          `over the ceiling ${eta}. Magic moves energy; it does not make ` +
          `it (arcane-science rules 1 and 6). Either lower 'joules' or ` +
          `raise 'cost' to at least ${Math.ceil(joules / 1000 / eta)}.`,
      );
    }
  }
  return out;
}

function main(): void {
  const list = process.argv.includes("--list");
  if (!existsSync(CONTENT_DIR)) {
    console.log("check-spell-cost: no content directory — nothing to check.");
    return;
  }

  const findings: string[] = [];
  let rows = 0;
  const seen: string[] = [];

  for (const file of walkYaml(CONTENT_DIR)) {
    let doc: { class?: string; data?: Record<string, unknown> };
    try {
      doc = parse(readFileSync(file, "utf8")) as typeof doc;
    } catch {
      continue;
    }
    if (doc?.class !== SPELL_CLASS) continue;
    rows++;
    const rel = file.replace(CONTENT_DIR, "content");
    const rowFindings = findingsIn(rel, doc);
    findings.push(...rowFindings);
    if (list) {
      const name = String(doc.data?.spellId ?? doc.data?.name ?? rel);
      seen.push(
        `  ${rowFindings.length > 0 ? "✖" : "✔"}  ${name}` +
          (rowFindings.length > 0 ? `  (${rowFindings.length})` : ""),
      );
    }
  }

  if (list) {
    console.log(`spell rows — ${rows} found\n`);
    for (const line of seen) console.log(line);
    console.log("");
  }

  if (findings.length > CEILING) {
    console.warn(
      `\n✖ lint:spell-cost — ${findings.length} spell(s) price energy ` +
        `they cannot pay for; the ceiling is ${CEILING}.\n`,
    );
    for (const f of findings) console.warn(`  ${f}`);
    console.warn(
      `\n  The price list is docs/arcane-science.md. A spell that returns ` +
        `more than it commits is a free power plant, which the world's own ` +
        `published science forbids — so this is a CONTENT fix, never a ` +
        `raise of the ceiling in this file.\n`,
    );
    process.exit(1);
  }

  if (findings.length < CEILING) {
    console.log(
      `✔ lint:spell-cost — ${findings.length} (ceiling ${CEILING}); the ` +
        `ratchet can fall to ${findings.length}. Lower CEILING in this file.`,
    );
    return;
  }
  console.log(
    `✔ lint:spell-cost — ${rows} spell row(s); ${findings.length} priced ` +
      `over the ceiling (limit ${CEILING}).`,
  );
}

const invokedDirectly =
  process.argv[1] !== undefined &&
  process.argv[1].endsWith("check-spell-cost.ts");
if (invokedDirectly) main();
