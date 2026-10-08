/**
 * check-boundary-roles — the gate behind `static boundaryRole`.
 *
 * ## What it is for
 *
 * The sandbox boundary's class-level exemption used to live in two
 * hand-maintained enumerations: twelve
 * `SecurityApi._registerBoundaryExemptBase(...)` calls planted from
 * `BootstrapManager.installFrameworkWiring`, and twenty-seven
 * template-path strings inside `api/security.ts`. ⚠⚠ Thirty-nine
 * entries, and by their own comments **every one was added after
 * something broke in production** — *"found live: the wire body was
 * refused `go` as 'not currently animate'"*, *"every one of these was a
 * verb that simply died inside a circle … a player standing in their
 * own circle could not read the rulebook."*
 *
 * The classes declare it now (`mud/lib/security/BoundaryRole.ts`). This
 * gate is the half that keeps the declaration honest.
 *
 * ## ⛔ What it deliberately does NOT check
 *
 * **That a `commons` declarer is immutable.** That is the criterion a
 * reviewer applies, and it is not derivable: `Material` declares 32
 * public `set*` methods because the `TemplateApplier` dispatches
 * through them, so scanning for mutators distinguishes nothing. The
 * other two limbs of the old prose justification fare no better —
 * *seeded* is true of half the world, and *"the PM policy table REFUSEs
 * writes to their rows"* is simply **false** (`Collections.Content` is
 * `sandbox: pass`, deliberately). A fourth candidate, *nobody can hold
 * title to it*, is false too: `/platform` and `/stuff` are both claimed
 * extents.
 *
 * ⭐ So membership is a judgment, and this gate holds the judgment's
 * GROWTH instead of pretending to compute it — census-then-ratchet
 * (`docs/lint-family.md`). Widening the boundary becomes a visible
 * reviewed act: the ceiling has to move in the same commit.
 *
 * ## What it checks
 *
 * 1. **Totality** — every `static boundaryRole` value is one the
 *    vocabulary declares. A misspelling would otherwise resolve to
 *    `place` and silently un-exempt a class.
 * 2. **The `commons` ceiling** — the census may fall, never rise.
 * 3. **No central list** — `api/security.ts` holds no exempt-base array
 *    and no exempt-template-path set, and nothing anywhere calls
 *    `_registerBoundaryExemptBase`. This is the ratchet that stops the
 *    patchwork growing back, which is the actual failure mode: the
 *    lists were not wrong, they were *unbounded*.
 * 4. **The vocabulary is read out of its own source**, by text — never
 *    copied here. Copying is how a gate silently stops matching (the
 *    `lint:blessed-bands` lesson).
 */

import { readFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { MUD, packSources, packSrcFiles } from "./pack-roots";

const EXIT_ON_FINDINGS = true; // CI-gating

const SECURITY = fileURLToPath(
  new URL("../src/mud/api/security.ts", import.meta.url),
);
const VOCAB = fileURLToPath(
  new URL("../src/mud/lib/security/BoundaryRole.ts", import.meta.url),
);

/**
 * ⚠ The measured ceiling on `commons` declarers. It may FALL, never
 * rise — a build that adds one lowers nothing and must raise this line
 * in the same commit, which is the whole point: the diff shows somebody
 * widened the sandbox boundary.
 */
export const COMMONS_CEILING = 24;

export interface RoleDeclaration {
  file: string;
  cls: string;
  role: string;
}

/** The legal values, read out of the vocabulary module's own source. */
export function legalRoles(): string[] {
  const src = readFileSync(VOCAB, "utf8");
  const m = /export type BoundaryRole =([^;]+);/.exec(src);
  if (!m) {
    throw new Error(
      "check-boundary-roles: could not read `export type BoundaryRole` out of " +
        "lib/security/BoundaryRole.ts — the gate's instrument is broken, " +
        "which is worse than a finding. Fix the parse, do not loosen it.",
    );
  }
  return [...m[1]!.matchAll(/'([a-z-]+)'/g)].map((x) => x[1]!);
}

/** Every `static boundaryRole` declaration in the kernel and every pack. */
export function scanDeclarations(): RoleDeclaration[] {
  const files: string[] = [...packSrcFiles(MUD)];
  for (const pack of packSources()) {
    if (existsSync(pack.srcDir)) files.push(...packSrcFiles(pack.srcDir));
  }
  const out: RoleDeclaration[] = [];
  for (const file of files) {
    if (file.includes("__tests__")) continue;
    const src = readFileSync(file, "utf8");
    if (!src.includes("boundaryRole")) continue;
    // Track the nearest preceding class name so a finding can name it.
    let cls = "(unknown)";
    for (const line of src.split("\n")) {
      const c = /\bclass\s+(\w+)/.exec(line);
      if (c) cls = c[1]!;
      const d = /static\s+boundaryRole[^=]*=\s*'([^']*)'/.exec(line);
      if (d) out.push({ file, cls, role: d[1]! });
    }
  }
  return out;
}

function main(): void {
  const findings: string[] = [];
  const legal = legalRoles();
  const decls = scanDeclarations();

  // 1 — totality
  for (const d of decls) {
    if (!legal.includes(d.role)) {
      findings.push(
        `${d.cls} (${d.file}) declares boundaryRole '${d.role}', which is not ` +
          `in the vocabulary [${legal.join(", ")}]. An unknown value resolves ` +
          `to 'place' and SILENTLY un-exempts the class.`,
      );
    }
  }

  // 2 — the commons ceiling
  const commons = decls.filter((d) => d.role === "commons");
  if (commons.length > COMMONS_CEILING) {
    findings.push(
      `${commons.length} classes declare boundaryRole 'commons'; the measured ` +
        `ceiling is ${COMMONS_CEILING}. Declaring one more WIDENS the sandbox ` +
        `boundary, so raise COMMONS_CEILING in the same commit and say in the ` +
        `message why this class is shared vocabulary nobody holds title to. ` +
        `The criterion: would minting a per-parcel copy of it be absurd?`,
    );
  }
  // ⚠ And a ceiling ABOVE the real count is a hole in the ratchet — this
  // family's documented failure mode. A build that removes a `commons`
  // declarer lowers this line in the same commit.
  if (commons.length < COMMONS_CEILING) {
    findings.push(
      `only ${commons.length} classes declare boundaryRole 'commons' but ` +
        `COMMONS_CEILING is ${COMMONS_CEILING} — a padded ceiling is a hole ` +
        `in the ratchet. Lower it to ${commons.length} in the same commit as ` +
        `the removal.`,
    );
  }

  // 3 — no central list may come back
  const sec = readFileSync(SECURITY, "utf8");
  for (const banned of [
    "#boundaryExemptBases",
    "BOUNDARY_EXEMPT_TEMPLATE_PATHS",
  ]) {
    if (sec.includes(banned)) {
      findings.push(
        `api/security.ts still holds \`${banned}\`. Class-level boundary ` +
          `exemption is DECLARED on the class (static boundaryRole); a central ` +
          `list is the thirty-nine-entry patchwork this gate exists to ` +
          `prevent returning.`,
      );
    }
  }
  const callers: string[] = [];
  const all: string[] = [...packSrcFiles(MUD)];
  const backend = fileURLToPath(new URL("../src/backend", import.meta.url));
  if (existsSync(backend)) all.push(...packSrcFiles(backend));
  for (const pack of packSources()) {
    if (existsSync(pack.srcDir)) all.push(...packSrcFiles(pack.srcDir));
  }
  for (const f of all) {
    const src = readFileSync(f, "utf8");
    // The gate's own prose names the retired call; skip comment-only hits.
    const hit = src
      .split("\n")
      .some(
        (l) =>
          l.includes("_registerBoundaryExemptBase(") &&
          !l.trimStart().startsWith("//") &&
          !l.trimStart().startsWith("*"),
      );
    if (hit) callers.push(f);
  }
  for (const f of callers) {
    findings.push(
      `${f} calls \`_registerBoundaryExemptBase\`. That registrar is retired — ` +
        `the class declares \`static boundaryRole\` instead, which arrives down ` +
        `the prototype chain the same way the base-instanceof list did.`,
    );
  }

  const byRole = new Map<string, number>();
  for (const d of decls) byRole.set(d.role, (byRole.get(d.role) ?? 0) + 1);

  if (findings.length === 0) {
    const census = [...byRole.entries()]
      .sort()
      .map(([r, n]) => `${r} ${n}`)
      .join(", ");
    console.log(
      `check-boundary-roles: ${decls.length} declaration(s) — ${census} ` +
        `(commons ceiling ${COMMONS_CEILING}); no central list.`,
    );
    return;
  }
  console.error(`check-boundary-roles: ${findings.length} finding(s)\n`);
  for (const f of findings) console.error(`  • ${f}\n`);
  if (EXIT_ON_FINDINGS) process.exit(1);
}

main();
