/**
 * check-combat-dynamics — the combat hook-grammar lint lock.
 *
 * The combat engine branches on **physics** (slots, containment, vitals,
 * construction — the substrate every fight rides) and never on a specific
 * dynamic ("is this weapon energized?", "is this creature venomous?").
 * Dynamics come through the CombatReactive hook grammar — see
 * docs/subsystems/combat-hooks.md. This lint locks the migration in: it
 * scans the two homes a dynamics barnacle could leak into — the engine
 * (`obj/api/CombatLogic.ts`) and the combat substrate (`lib/combat/*.ts`,
 * tests excluded) — and flags any `MixinApi.is<Predicate>` narrowing not on
 * the physics allowlist below. (`lib/electricity` et al. are *consumers* of
 * the grammar, out of scope by design.)
 *
 * Comments are stripped before matching (the real tree names retired
 * predicates in doc prose — `MixinApi.isX` in `CombatReactive.ts`);
 * string literals are scanned as code (the sibling scripts' pragmatic
 * text-scan posture — none exist in the tree).
 *
 * Standalone script, not an ESLint rule, for the same reason as
 * `check-gate-strings` (ESLint 8 legacy config can't load a local rule
 * without `--rulesdir`). CI-gating. The pure `scanCombatDynamics` scan is
 * unit-tested in `scripts/__tests__/check-combat-dynamics.test.ts`.
 */

import { readdirSync, readFileSync, statSync } from "fs";
import { fileURLToPath, pathToFileURL } from "url";
import { dirname, join, relative, resolve } from "path";

const EXIT_ON_FINDINGS = true; // CI-gating

const here = dirname(fileURLToPath(import.meta.url));
const SERVER_ROOT = join(here, "..");
const MUD_ROOT = join(SERVER_ROOT, "src", "mud");

/**
 * The physics allowlist — every `MixinApi.is<Predicate>` narrowing the
 * engine may hold. Substrate predicates (slots, containment, vitals,
 * construction, party, senses…) plus the drain's consequence narrowing
 * (`isMetabolic`/`isReserved`/`isDurable` — the toxin/reserve/wear arms)
 * and `isWearable` (`coveringGearAt` mirrors `resolveCoveringStack`'s
 * item selection). Adding a predicate here is a deliberate edit with a
 * one-line reason in review — a *dynamic* predicate (isEnergized,
 * isVenomous, …) is never physics; it belongs behind a hook.
 *
 * `isGraded`/`isKeen` joined with the crafting-branches build: the
 * instrument-delivery scale + wear-on-use read the weapon's *quality
 * axes* (grade × condition × edge — `isDurable`'s siblings, the same
 * substrate the covering stack already folds), not a capability — the
 * materials-response quality model, not a dynamic.
 */
export const COMBAT_DYNAMICS_ALLOWLIST: ReadonlySet<string> = new Set([
  "isCombatReactive",
  "isCombatant",
  "isConstructed",
  "isContainable",
  "isContainer",
  // The bum's rush (`fight rush`) — a control-win OUTCOME, not a blow —
  // throws a grappled body through an exit and leaves it sprawled: it
  // resolves the exit off the room (`isExitable`) and reposes the loser
  // (`isPosed`). Combat already moves bodies (isContainable/isContainer);
  // relocating one through a door and dropping it prone is the same
  // rationale, not a new blood-and-poise dynamic.
  "isExitable",
  "isPosed",
  "isDurable",
  "isGraded",
  "isKeen",
  "isEngaged",
  "isHasInteractive",
  "isLoadBearing",
  "isMetabolic",
  "isOrganism",
  "isPartyMember",
  "isReserved",
  "isSensor",
  "isSlottable",
  "isSlotted",
  "isTangible",
  "isVitals",
  "isVocal",
  "isWearable",
  "isWieldable",
]);

export interface Finding {
  file: string;
  line: number;
  predicate: string;
  text: string;
  message: string;
}

/**
 * Blank out line and block comments, preserving line structure (and
 * leaving string-literal content in place — a `//` inside a string is not
 * a comment, and a predicate inside a string still flags).
 */
function stripComments(source: string): string {
  type State = "code" | "line" | "block" | "single" | "double" | "template";
  let state: State = "code";
  let out = "";
  for (let i = 0; i < source.length; i++) {
    const ch = source[i]!;
    const next = source[i + 1];
    switch (state) {
      case "code":
        if (ch === "/" && next === "/") {
          state = "line";
          out += "  ";
          i++;
        } else if (ch === "/" && next === "*") {
          state = "block";
          out += "  ";
          i++;
        } else {
          if (ch === '"') state = "double";
          else if (ch === "'") state = "single";
          else if (ch === "`") state = "template";
          out += ch;
        }
        break;
      case "line":
        if (ch === "\n") {
          state = "code";
          out += ch;
        } else {
          out += " ";
        }
        break;
      case "block":
        if (ch === "*" && next === "/") {
          state = "code";
          out += "  ";
          i++;
        } else {
          out += ch === "\n" ? ch : " ";
        }
        break;
      case "single":
      case "double":
      case "template":
        out += ch;
        if (ch === "\\" && next !== undefined) {
          out += next;
          i++;
        } else if (
          (state === "single" && ch === "'") ||
          (state === "double" && ch === '"') ||
          (state === "template" && ch === "`")
        ) {
          state = "code";
        }
        break;
    }
  }
  return out;
}

const PREDICATE = /\bMixinApi\.(is[A-Za-z0-9_]*)/g;

/** The pure scan: every non-allowlisted `MixinApi.is<Predicate>` in the
 * given source (comments stripped) is a finding. */
export function scanCombatDynamics(source: string, file: string): Finding[] {
  const findings: Finding[] = [];
  const codeLines = stripComments(source).split("\n");
  const rawLines = source.split("\n");
  for (let i = 0; i < codeLines.length; i++) {
    for (const m of codeLines[i]!.matchAll(PREDICATE)) {
      const predicate = m[1]!;
      if (COMBAT_DYNAMICS_ALLOWLIST.has(predicate)) continue;
      findings.push({
        file,
        line: i + 1,
        predicate,
        text: (rawLines[i] ?? "").trim().slice(0, 100),
        message:
          `MixinApi.${predicate} is not combat physics — dynamics come ` +
          `through the CombatReactive hooks (see ` +
          `docs/subsystems/combat-hooks.md)`,
      });
    }
  }
  return findings;
}

/** The scan scope: the engine + the combat substrate, tests excluded. */
export function combatDynamicsScope(): string[] {
  const files = [join(MUD_ROOT, "platform", "idea", "api", "CombatLogic.ts")];
  const combatDir = join(MUD_ROOT, "lib", "combat");
  for (const name of readdirSync(combatDir)) {
    const full = join(combatDir, name);
    if (!statSync(full).isFile()) continue; // skips __tests__/
    if (!name.endsWith(".ts") || name.endsWith(".d.ts")) continue;
    if (name.endsWith(".test.ts")) continue;
    files.push(full);
  }
  return files;
}

/** The live-tree scan — main()'s body and the unit test's self-regression. */
export function collectLiveFindings(): Finding[] {
  const findings: Finding[] = [];
  for (const file of combatDynamicsScope()) {
    findings.push(...scanCombatDynamics(readFileSync(file, "utf8"), file));
  }
  return findings;
}

function main(): void {
  const scope = combatDynamicsScope();
  const findings = collectLiveFindings();

  if (findings.length === 0) {
    console.log(
      `check-combat-dynamics: the engine branches only on physics ` +
        `(${scope.length} files scanned; ` +
        `${COMBAT_DYNAMICS_ALLOWLIST.size} predicates allowlisted).`,
    );
    return;
  }

  console.warn(
    `\n[lint — ${EXIT_ON_FINDINGS ? "ERROR" : "WARN"}] ${findings.length} ` +
      `dynamics predicate(s) in the combat engine:`,
  );
  for (const f of findings) {
    console.warn(
      `  ${relative(SERVER_ROOT, f.file)}:${f.line}  ${f.text}\n` +
        `    ${f.message}`,
    );
  }
  if (EXIT_ON_FINDINGS) process.exit(1);
}

// Run only when invoked as a script — the unit test imports the pure scan
// (the combat-gym precedent: an imported script doesn't self-execute).
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  main();
}
