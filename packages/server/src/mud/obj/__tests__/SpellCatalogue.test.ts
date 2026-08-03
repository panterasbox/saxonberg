/**
 * SpellCatalogue — the warmed spell roster: descriptor projection,
 * closed-union effect validation (the governing invariant's structural
 * half — an unbacked effect is dropped, never executed), the byCell
 * lookup, and the AUTHORED roster seeds (every seed parses, every grid
 * address resolves to a Phase-1 Discipline seed, ids unique).
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { readFileSync, readdirSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import YAML from "yaml";
import SpellCatalogue from "../SpellCatalogue";
import Spell from "../magic/Spell";
import { MagicEffects } from "../../lib/magic/Effect";
import { MagicGrid } from "../../lib/magic/Grid";
import { CompetenceBand } from "../../lib/advancement/CompetenceBand";
import { Template } from "../../lib/stuff/Template";
import { makeStuff } from "../../lib/security/__tests__/test-setup";

const __filename = fileURLToPath(import.meta.url);
const SPELL_SEEDS_DIR = join(dirname(__filename), "../../seeds/obj/magic/Spell");
const DISCIPLINE_SEEDS_DIR = join(
  dirname(__filename),
  "../../seeds/obj/Discipline",
);

type Loose = Record<string, unknown>;

function stubSpellTemplates(seeds: Loose[]): void {
  vi.spyOn(Template, "findDescendants").mockImplementation(
    async (): Promise<Template[]> => {
      return seeds.map((seed) => ({
        path: `${Spell.TEMPLATE_PATH_PREFIX}${String(seed.spellId)}`,
        data: seed,
      })) as unknown as Template[];
    },
  );
}

async function warmCatalogue(seeds: Loose[]): Promise<SpellCatalogue> {
  stubSpellTemplates(seeds);
  const cat = makeStuff(() => new SpellCatalogue());
  await cat.postRegister();
  return cat;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("SpellCatalogue — warm + lookup", () => {
  it("warms descriptors keyed on spellId, with derived family", async () => {
    const cat = await warmCatalogue([
      {
        spellId: "test-bolt",
        name: "Test Bolt",
        verb: "create",
        noun: "fire",
        requiredBand: "novice",
        cost: 20,
        castSeconds: 3,
        targeting: "any",
        effects: [{ kind: "inject-channel", channel: "heat", energy: 2 }],
      },
      {
        spellId: "test-light",
        verb: "create",
        noun: "light",
        targeting: "none",
        effects: [{ kind: "emit-field", field: "light" }],
      },
    ]);
    const bolt = cat.getSpell("test-bolt")!;
    expect(bolt.family).toBe("impulse");
    expect(bolt.cost).toBe(20);
    const light = cat.getSpell("test-light")!;
    expect(light.family).toBe("modifier");
    expect(light.name).toBe("test-light"); // name defaults to id
    expect(cat.spellsAtCell("create", "fire").map((s) => s.spellId)).toEqual([
      "test-bolt",
    ]);
  });

  it("drops a spell whose effect fails the closed union — the invariant", async () => {
    const cat = await warmCatalogue([
      {
        spellId: "gain-levels",
        verb: "create",
        noun: "arcana",
        effects: [{ kind: "gain-levels", amount: 5 }],
      },
      {
        spellId: "bad-address",
        verb: "summon",
        noun: "fire",
        effects: [{ kind: "emit-field", field: "light" }],
      },
      {
        spellId: "no-effects",
        verb: "create",
        noun: "fire",
        effects: [],
      },
    ]);
    expect(cat.getSpell("gain-levels")).toBeNull();
    expect(cat.getSpell("bad-address")).toBeNull();
    expect(cat.getSpell("no-effects")).toBeNull();
    expect(cat.allSpells()).toHaveLength(0);
  });
});

describe("the authored roster seeds", () => {
  function loadSpellSeeds(): Map<string, Loose> {
    const byId = new Map<string, Loose>();
    for (const file of readdirSync(SPELL_SEEDS_DIR)) {
      if (!file.endsWith(".yaml")) continue;
      const seed = YAML.parse(
        readFileSync(join(SPELL_SEEDS_DIR, file), "utf-8"),
      ) as { class: string; data?: Loose };
      expect(seed.class, `${file} wrong class`).toBe("/obj/magic/Spell");
      const id = seed.data?.spellId as string | undefined;
      expect(id, `${file} missing spellId`).toBeTruthy();
      expect(byId.has(id!), `duplicate spellId ${id}`).toBe(false);
      byId.set(id!, seed.data!);
    }
    return byId;
  }

  it("every authored spell parses, addresses a real cell, and validates", () => {
    const disciplineKeys = new Set(
      readdirSync(DISCIPLINE_SEEDS_DIR)
        .filter((f) => f.endsWith(".yaml"))
        .map(
          (f) =>
            (
              YAML.parse(
                readFileSync(join(DISCIPLINE_SEEDS_DIR, f), "utf-8"),
              ) as { data?: { key?: string } }
            ).data?.key,
        ),
    );
    const byId = loadSpellSeeds();
    expect(byId.size).toBeGreaterThanOrEqual(9);
    for (const [id, data] of byId) {
      expect(MagicGrid.isVerb(data.verb), `${id} bad verb`).toBe(true);
      expect(MagicGrid.isNoun(data.noun), `${id} bad noun`).toBe(true);
      // the two axes must be seeded Disciplines (the cast credits both)
      expect(disciplineKeys.has(`magic-${data.verb}`), `${id} verb leaf`).toBe(true);
      expect(disciplineKeys.has(`magic-${data.noun}`), `${id} noun leaf`).toBe(true);
      expect(
        CompetenceBand.isBand(data.requiredBand),
        `${id} bad requiredBand`,
      ).toBe(true);
      const effects = data.effects as unknown[];
      expect(Array.isArray(effects) && effects.length > 0, `${id} effects`).toBe(
        true,
      );
      for (const e of effects) {
        expect(() => MagicEffects.validate(e), `${id} effect`).not.toThrow();
      }
    }
  });

  it("the roster covers the required cells (one per primitive)", () => {
    const byId = loadSpellSeeds();
    const cells = new Set(
      [...byId.values()].map((d) => `${d.verb}·${d.noun}`),
    );
    for (const cell of [
      "create·fire",
      "create·lightning",
      "control·body",
      "destroy·mind",
      "create·light",
      "create·water",
      "create·sense",
      "destroy·arcana",
      "perceive·arcana",
    ]) {
      expect(cells.has(cell), `missing cell ${cell}`).toBe(true);
    }
  });
});
