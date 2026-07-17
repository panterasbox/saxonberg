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

import { readdirSync, statSync, readFileSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";
import YAML from "yaml";
import {
  WeaponProfile,
  type WeaponProfileInputs,
} from "../src/mud/lib/combat/WeaponProfile";
import { Construction } from "../src/mud/lib/material/Construction";

const EXIT_ON_FINDINGS = true; // CI-gating
const WEAPON_CLASS = "/lib/equipment/Weapon";

const SEEDS_DIR = fileURLToPath(new URL("../src/mud/seeds", import.meta.url));

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

function main(): void {
  const findings: string[] = [];
  let weapons = 0;

  for (const file of walkYaml(SEEDS_DIR)) {
    let doc: { class?: string; data?: Record<string, unknown> };
    try {
      doc = YAML.parse(readFileSync(file, "utf8")) ?? {};
    } catch {
      continue; // not our concern — a malformed seed is another lint's job
    }
    if (doc.class !== WEAPON_CLASS) continue;
    weapons++;
    const profile = WeaponProfile.derive(inputsFromSeed(doc.data ?? {}));
    if (profile.isInert()) {
      findings.push(
        `${file.replace(SEEDS_DIR, "seeds")}: derives an INERT WeaponProfile ` +
          `(no delivery form — check 'constructionForm')`,
      );
    }
  }

  if (findings.length === 0) {
    console.log(
      `check-inert-weapon: all ${weapons} weapon seed(s) derive a real playstyle.`,
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
