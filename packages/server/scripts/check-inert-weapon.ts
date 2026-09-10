/**
 * check-inert-weapon — weapon-playstyle legibility lint.
 *
 * The weapon-side sibling of `check-does-nothing` (the materials-response
 * lint): a seeded weapon must derive a **non-inert** {@link WeaponProfile} —
 * it must present a real delivery form, or it renders empty pips and could
 * never wound anyone (a mistyped `constructionForm`, an armor form on a
 * weapon, a placeholder that shipped). This walks every `Weapon`-class seed,
 * derives its profile from the authored shape, and flags any that is inert.
 *
 * A standalone WARN/ERROR script (the `check-does-nothing` / `check-gate-
 * strings` precedent) — the ESLint-8-legacy DX reason. The *check itself* is
 * the pure `WeaponProfile.isInert()` surface (fixture-tested in
 * `WeaponProfile.test.ts`); this script just walks the shipped roster.
 */

import { readdirSync, statSync, readFileSync, existsSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";
import YAML from "yaml";
import {
  WeaponProfile,
  type WeaponProfileInputs,
} from "../src/mud/lib/combat/WeaponProfile";
import { Construction } from "../src/mud/lib/material/Construction";

const EXIT_ON_FINDINGS = true; // CI-gating
const WEAPON_CLASS = "/platform/thing/equipment/Weapon";
const DISCIPLINE_CLASS = "/platform/idea/Discipline";

const SEEDS_DIR = fileURLToPath(new URL("../src/mud/seeds", import.meta.url));
const CONTENT_DIR = fileURLToPath(new URL("../../content", import.meta.url));

/** Every template root: each pack's `content/`, then the shrinking `seeds/`. */
function templateRoots(): string[] {
  const packs = existsSync(CONTENT_DIR)
    ? readdirSync(CONTENT_DIR)
        .map((p) => join(CONTENT_DIR, p, "content"))
        .filter((d) => existsSync(d))
    : [];
  return [...packs, ...(existsSync(SEEDS_DIR) ? [SEEDS_DIR] : [])];
}

function* walkYaml(dir: string): Generator<string> {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) yield* walkYaml(full);
    else if (st.isFile() && entry.endsWith(".yaml")) yield full;
  }
}

/** Build the profile inputs from a seed's `data` blob (shape only — the lint
 * never boots the world, so it reads dimensions + form + slot-claim count). */
function inputsFromSeed(data: Record<string, unknown>): WeaponProfileInputs {
  const form = typeof data.constructionForm === "string"
    ? data.constructionForm
    : "";
  const deliveryForm = Construction.isDeliveryForm(form) ? form : null;
  const claims = (data.slotClaims ?? {}) as Record<string, string[]>;
  let handSlots = 1;
  for (const slots of Object.values(claims)) {
    if (Array.isArray(slots) && slots.length > handSlots) handSlots = slots.length;
  }
  return {
    deliveryForm,
    massKg: typeof data.mass === "number" ? data.mass : 0,
    lengthM: typeof data.length === "number" ? data.length : 0,
    handSlots,
  };
}

/**
 * ⭐ Every Discipline key any shipped row declares. Read from the rows
 * rather than from a list in this file, so a new Discipline needs no edit
 * here (the derived-roster rule applied to content).
 */
function shippedDisciplineKeys(files: readonly string[]): Set<string> {
  const keys = new Set<string>();
  for (const file of files) {
    try {
      const doc = YAML.parse(readFileSync(file, "utf8")) ?? {};
      if (doc.class !== DISCIPLINE_CLASS) continue;
      const key = (doc.data ?? {}).key;
      if (typeof key === "string" && key) keys.add(key);
    } catch {
      continue;
    }
  }
  return keys;
}

const rel = (f: string): string =>
  f.replace(SEEDS_DIR, "seeds").replace(CONTENT_DIR, "content");

function main(): void {
  const findings: string[] = [];
  let weapons = 0;

  const files = templateRoots().flatMap((r) => [...walkYaml(r)]);
  // ⚠⚠ **The second silent failure a weapon row can have.** `exercises`
  // names the Disciplines fighting with this thing practises, and the
  // credit walk simply adds whatever it finds to the exercised set. A
  // typo names a Discipline that does not exist: the transcript gets a
  // row for it, `bandsFor` groups it, nothing ever resolves it, and the
  // author sees a weapon that "trains something" which no competence
  // read will ever surface. Closed and silent, exactly like an inert
  // profile — so it is checked in the same walk.
  const disciplines = shippedDisciplineKeys(files);
  for (const file of files) {
    let doc: { class?: string; data?: Record<string, unknown> };
    try {
      doc = YAML.parse(readFileSync(file, "utf8")) ?? {};
    } catch {
      continue; // not our concern — a malformed seed is another lint's job
    }
    if (doc.class !== WEAPON_CLASS) continue;
    weapons++;
    const exercises = (doc.data ?? {}).exercises;
    if (exercises !== undefined) {
      if (!Array.isArray(exercises)) {
        findings.push(
          `${rel(file)}: 'exercises' must be a list of Discipline keys`,
        );
      } else {
        for (const key of exercises) {
          if (typeof key !== "string" || !disciplines.has(key)) {
            findings.push(
              `${rel(file)}: exercises '${String(key)}' — no Discipline row ` +
                `declares that key (the credit would be written and never read)`,
            );
          }
        }
      }
    }
    const profile = WeaponProfile.derive(inputsFromSeed(doc.data ?? {}));
    if (profile.isInert()) {
      findings.push(
        `${rel(file)}: derives an INERT WeaponProfile ` +
          `(no delivery form — check 'constructionForm')`,
      );
    }
  }

  if (findings.length === 0) {
    console.log(
      `check-inert-weapon: all ${weapons} weapon seed(s) derive a real ` +
        `playstyle and name only real Disciplines ` +
        `(${disciplines.size} shipped).`,
    );
    return;
  }

  console.warn(
    `\n[lint — ${EXIT_ON_FINDINGS ? "ERROR" : "WARN"}] ${findings.length} ` +
      `inert weapon seed(s):`,
  );
  for (const f of findings) console.warn(`  ${f}`);
  if (EXIT_ON_FINDINGS) process.exit(1);
}

main();
