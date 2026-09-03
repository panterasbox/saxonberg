/**
 * Fisticuffs content invariant (the bar-fight build): every humanoid
 * species row in the shipped `homo` clade declares the mass-scaled blunt
 * fist, so a disarmed or bare-handed person can always brawl. A
 * content-shape test (the libations-annexes precedent — read the pack
 * yaml directly), scoped to the `hominidae/homo` directory: the
 * `tutor-bot` construct and every beast are deliberately out of scope
 * (a robot throwing hands is a separate design question).
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";

const HOMO = fileURLToPath(
  new URL(
    "../../../../../../content/species-and-names/content/stuff/idea/" +
      "species/animalia/chordata/mammalia/primates/hominidae/homo/",
    import.meta.url,
  ),
);

interface Fist {
  key?: string;
  channel?: string;
  massScaled?: boolean;
}
interface SpeciesRow {
  data?: { sentient?: boolean; naturalAttacks?: Fist[] };
}

describe("fisticuffs — the humanoid clade carries the mass-scaled fist", () => {
  const files = readdirSync(HOMO).filter((f) => f.endsWith(".yaml"));

  it("finds the shipped homo rows", () => {
    expect(files.length).toBeGreaterThanOrEqual(16);
  });

  for (const file of files) {
    it(`${file} declares a mass-scaled blunt fist`, () => {
      const row = parse(readFileSync(HOMO + file, "utf8")) as SpeciesRow;
      const attacks = row.data?.naturalAttacks ?? [];
      const fist = attacks.find((a) => a.key === "fist");
      expect(fist, `${file} has a fist natural attack`).toBeDefined();
      expect(fist!.channel).toBe("blunt");
      expect(fist!.massScaled).toBe(true);
    });
  }
});
