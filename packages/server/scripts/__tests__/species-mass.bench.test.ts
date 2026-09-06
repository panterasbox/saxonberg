/**
 * species-mass bench — the shipped-species size table, snapshotted.
 *
 * ## Why this is a gym bench and not a unit test
 *
 * The other two gym benches drive whole fights; this one drives
 * **numbers that four subsystems already read**. Before the textiles
 * build every playable species inherited `biped`'s 70 kg, so a halfling
 * and a dragonborn carried the same weight, punched with the same
 * energy, ate the same and cooled at the same rate. Giving each species
 * its own mass therefore MOVES LIVE NUMBERS in combat, encumbrance,
 * metabolism and thermal at once.
 *
 * ⚠ **A green `pnpm test:gym` proves the ENGINE did not move** — the
 * other two benches drive *synthetic* body plans with explicit
 * `baseMass`, so they are blind to a shipped-row change by
 * construction. This file is the run that matters: it is the diff of
 * the shipped species, printed and snapshotted, so *"any movement is
 * recorded"* is a committed artifact rather than a promise.
 *
 * ## What it reads
 *
 * The authored rows (and the char-gen roster, so the species list is
 * never a second copy), then the REAL readers over a real `Character` —
 * `Creature.getMass()` (which resolves species → plan),
 * `LoadBearing.getCarryCapacity()`, `Thermal.getTau()`, metabolism's
 * linear mass factor, and `NaturalAttack.deriveProfile`. Nothing is
 * re-derived here; if a reader changes, this table moves.
 */

import "../../src/test-bootstrap";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import YAML from "yaml";
import {
  makeStuff,
  stampTemplatePathForTest,
} from "../../src/mud/lib/security/__tests__/test-setup";
import { installV1QuantityMarshallers } from "../../src/mud/lib/persistence/__tests__/quantity-marshaller-test-helpers";
import { Character } from "../../src/mud/lib/character/Character";
import Species from "../../src/mud/platform/idea/species/Species";
import BodyPlan from "../../src/mud/platform/idea/species/BodyPlan";
import { NaturalAttack } from "../../src/mud/lib/combat/NaturalAttack";
import { StuffApi } from "../../src/mud/api/stuff";

const here = dirname(fileURLToPath(import.meta.url));
const SPECIES_ROOT = join(
  here, "..", "..", "..", "content", "species-and-names",
  "content", "stuff", "idea", "species",
);
const HOMO = join(
  SPECIES_ROOT, "animalia", "chordata", "mammalia",
  "primates", "hominidae", "homo",
);
const CHARGEN = join(here, "..", "..", "src", "mud", "config", "char-gen.yaml");

/** Metabolism's reference mass — basal scales linearly off it. */
const METABOLIC_REFERENCE_MASS_KG = 70;

interface Authored {
  key: string;
  baseMass: number;
  stature: number;
}

function readData(file: string): Record<string, unknown> {
  const doc = YAML.parse(readFileSync(file, "utf-8")) as {
    data?: Record<string, unknown>;
  };
  return doc.data ?? {};
}

/** The ten playable species, read off the char-gen roster, not a list here. */
function playable(): Authored[] {
  const roster = YAML.parse(readFileSync(CHARGEN, "utf-8")) as {
    species?: Array<{ key: string; path: string }>;
  };
  return (roster.species ?? []).map((entry) => {
    const leaf = entry.path.split("/").pop()!;
    const data = readData(join(HOMO, `${leaf}.yaml`));
    return {
      key: entry.key,
      baseMass: Number(data.baseMass ?? 0),
      stature: Number(data.stature ?? 0),
    };
  });
}

const PLAN = readData(join(SPECIES_ROOT, "BodyPlan", "biped.yaml"));

/** A real biped plan carrying the SHIPPED reference numbers. */
function bipedPlan(suffix: string): BodyPlan {
  const plan = makeStuff(() => new BodyPlan());
  plan.setName(`biped${suffix}`);
  plan.setBaseMass(Number(PLAN.baseMass ?? 0));
  plan.setBaseStature(Number(PLAN.baseStature ?? 0));
  stampTemplatePathForTest(plan, `/stuff/idea/species/BodyPlan/bench${suffix}`);
  return plan;
}

function speciesOf(row: Authored, suffix: string): Species {
  const s = makeStuff(() => new Species());
  s.setBodyPlan(bipedPlan(suffix));
  if (row.baseMass > 0) s.setBaseMass(row.baseMass);
  if (row.stature > 0) s.setStature(row.stature);
  stampTemplatePathForTest(s, `/stuff/idea/species/bench/${row.key}${suffix}`);
  return s;
}

interface Reading {
  species: string;
  massKg: number;
  statureM: number;
  girthIndex: number;
  carryCapacityKg: number;
  basalFactor: number;
  tauKs: number;
  fistScale: number;
  largeBody: boolean;
}

function round(n: number, places = 2): number {
  const f = 10 ** places;
  return Math.round(n * f) / f;
}

describe("shipped species — the size table through the real readers", () => {
  beforeEach(() => installV1QuantityMarshallers());
  afterEach(() => StuffApi.clearAll());

  it("prints and pins the per-species derived table", () => {
    const readings: Reading[] = [];
    let i = 0;
    for (const row of playable()) {
      const suffix = `-${i++}`;
      const species = speciesOf(row, suffix);
      const body = makeStuff(() => new Character());
      body.setSpecies(species);

      // Every one of these is a REAL reader. `getMass()` lazily seeds
      // from the species; the rest read `getMass()` and inherit it.
      const massKg = body.getMass().rawValue();
      const carry = body.getCarryCapacity().rawValue();
      const tau = body.getTau().rawValue();
      const statureM = species.getStature();

      // The hint-less natural profile — the ONLY place the largeBody
      // threshold bites, and the reason the table stops at 125 kg.
      const profile = NaturalAttack.deriveProfile(
        { key: "fist", channel: "blunt" },
        species,
      );
      const neutral =
        profile.tempoFactor === 1 &&
        profile.poiseDamageFactor === 1 &&
        profile.overextendFactor === 1 &&
        profile.reachRank === 0;

      readings.push({
        species: row.key,
        massKg: round(massKg),
        statureM: round(statureM),
        girthIndex: round(Math.sqrt(massKg / statureM)),
        carryCapacityKg: round(carry),
        basalFactor: round(massKg / METABOLIC_REFERENCE_MASS_KG),
        tauKs: round(tau / 1000),
        // The mass-scaled fist's input, against the shipped 70 kg ref.
        fistScale: round(Math.min(2.5, Math.max(0.5, massKg / 70))),
        largeBody: !neutral,
      });
    }

    // Printed so the MR description can quote it verbatim.
    const header =
      "species        mass   stature  girth  carry   basal   tau(ks)  fist  large";
    const lines = readings.map(
      (r) =>
        `${r.species.padEnd(13)} ${String(r.massKg).padStart(5)}  ` +
        `${String(r.statureM).padStart(6)}  ${String(r.girthIndex).padStart(5)}  ` +
        `${String(r.carryCapacityKg).padStart(5)}  ${String(r.basalFactor).padStart(5)}  ` +
        `${String(r.tauKs).padStart(7)}  ${String(r.fistScale).padStart(4)}  ` +
        `${r.largeBody ? "YES" : "no"}`,
    );
    console.info(`\n${header}\n${lines.join("\n")}\n`);

    expect(readings).toMatchSnapshot();
  });

  it("⚠ every playable species stays UNDER the largeBody threshold", () => {
    // The one balance cliff the size table could have walked off:
    // `combat.natural.largeBodyMassKg` is 150, and above it a hint-less
    // natural attack stops being the neutral quadruple and starts
    // deriving an effective-limb profile — i.e. ogre reach. The
    // dragonborn is the closest at 125, deliberately.
    let i = 0;
    for (const row of playable()) {
      const species = speciesOf(row, `-lb-${i++}`);
      const profile = NaturalAttack.deriveProfile(
        { key: "fist", channel: "blunt" },
        species,
      );
      expect(profile.tempoFactor, row.key).toBe(1);
      expect(profile.reachRank, row.key).toBe(0);
    }
  });

  it("⭐ size is PAID FOR — mass orders carry and thermal alike", () => {
    // Not a balance knob but a consequence: the same number drives all
    // of them, so a bigger body carries more, eats more and cools
    // slower. Do not 'balance' this away; incomparability is the point.
    const rows = playable().slice().sort((a, b) => a.baseMass - b.baseMass);
    let i = 0;
    const derived = rows.map((row) => {
      const body = makeStuff(() => new Character());
      body.setSpecies(speciesOf(row, `-o-${i++}`));
      return {
        key: row.key,
        carry: body.getCarryCapacity().rawValue(),
        tau: body.getTau().rawValue(),
      };
    });
    for (let n = 1; n < derived.length; n++) {
      expect(derived[n]!.carry, derived[n]!.key).toBeGreaterThan(
        derived[n - 1]!.carry,
      );
      expect(derived[n]!.tau, derived[n]!.key).toBeGreaterThan(
        derived[n - 1]!.tau,
      );
    }
  });

  it("a species authoring nothing still inherits the plan", () => {
    const bare = makeStuff(() => new Species());
    bare.setBodyPlan(bipedPlan("-bare"));
    stampTemplatePathForTest(bare, "/stuff/idea/species/bench/bare");
    expect(bare.getBaseMass()).toBe(Number(PLAN.baseMass));
    expect(bare.getStature()).toBe(Number(PLAN.baseStature));
  });
});
