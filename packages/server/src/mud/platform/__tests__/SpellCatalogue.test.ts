/**
 * SpellCatalogue — the warmed spell roster: descriptor projection,
 * closed-union effect validation (the governing invariant's structural
 * half — an unbacked effect is dropped, never executed), the byCell
 * lookup, and the AUTHORED roster seeds (every seed parses, every grid
 * address resolves to a Phase-1 Discipline seed, ids unique).
 */

import "../../../test-bootstrap";
import { describe, it, expect, vi, afterEach } from "vitest";
import { readFileSync, readdirSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import YAML from "yaml";
import SpellCatalogue from "../idea/SpellCatalogue";
import Spell from "../idea/magic/Spell";
import { MagicEffects } from "../../lib/magic/Effect";
import { MagicGrid } from "../../lib/magic/Grid";
import { CompetenceBand } from "../../lib/advancement/CompetenceBand";
import { CastingProfiles } from "../../lib/magic/CastingProfile";
import { Template } from "../../lib/stuff/Template";
import { makeStuff } from "../../lib/security/__tests__/test-setup";
const SPELL_PATH_PREFIX = '/stuff/idea/magic/Spell/';
const SPELL_CLASS = '/platform/idea/magic/Spell';

const __filename = fileURLToPath(import.meta.url);
const SPELL_SEEDS_DIR = join(dirname(__filename), "../../../../../content/arcane-library/content/stuff/idea/magic/Spell");
const DISCIPLINE_SEEDS_DIR = join(
  dirname(__filename),
  "../../../../../content/arcana/content/system/arcana/idea/Discipline",
);

type Loose = Record<string, unknown>;

function stubSpellTemplates(seeds: Loose[]): void {
  vi.spyOn(Template, "findByClass").mockImplementation(
    async (): Promise<Template[]> => {
      return seeds.map((seed) => ({
        path: `${SPELL_PATH_PREFIX}${String(seed.spellId)}`,
        data: seed,
      })) as unknown as Template[];
    },
  );
}

/** Warm from explicit `[path, data]` pairs — the pack-collision shape. */
async function warmCatalogueAt(
  rows: [string, Loose][],
): Promise<SpellCatalogue> {
  vi.spyOn(Template, "findByClass").mockImplementation(
    async (): Promise<Template[]> =>
      rows.map(([path, data]) => ({ path, data })) as unknown as Template[],
  );
  const cat = makeStuff(() => new SpellCatalogue());
  await cat.postRegister();
  return cat;
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
  it("warms descriptors keyed on PATH, with derived family", async () => {
    const cat = await warmCatalogue([
      {
        spellId: "test-bolt",
        name: "Test Bolt",
        verb: "create",
        noun: "fire",
        cost: 20,
        castingProfile: { requiredBand: "novice", castSeconds: 3 },
        targeting: "any",
        effects: [{ kind: "inject-channel", channel: "heat", energy: 2 }],
      },
      {
        spellId: "test-light",
        verb: "create",
        noun: "light",
        targeting: "none",
        effects: [{ kind: "emit-field", field: "light", locus: "/stuff/thing/magic/glowlight-mote" }],
      },
    ]);
    const bolt = cat.getSpellAt("/stuff/idea/magic/Spell/test-bolt")!;
    expect(bolt.family).toBe("impulse");
    expect(bolt.cost).toBe(20);
    const light = cat.getSpellAt("/stuff/idea/magic/Spell/test-light")!;
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
        effects: [{ kind: "emit-field", field: "light", locus: "/stuff/thing/magic/glowlight-mote" }],
      },
      {
        spellId: "no-effects",
        verb: "create",
        noun: "fire",
        effects: [],
      },
    ]);
    expect(cat.getSpellNamed("gain-levels")).toBeNull();
    expect(cat.getSpellNamed("bad-address")).toBeNull();
    expect(cat.getSpellNamed("no-effects")).toBeNull();
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
      expect(seed.class, `${file} wrong class`).toBe("/platform/idea/magic/Spell");
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
      // The caster-assuming half lives on its own object (D3) — an item
      // trigger ignores the whole thing rather than two loose fields.
      expect(() => CastingProfiles.validate(data.castingProfile), `${id} profile`)
        .not.toThrow();
      expect(
        CompetenceBand.isBand(
          CastingProfiles.validate(data.castingProfile).requiredBand,
        ),
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

  it("two packs shipping the same NAME stay distinct — the collision case", async () => {
    // The bug this keying exists to prevent. Both rows are called
    // `firebolt`; keyed on the flat id the second loader silently won,
    // and every item in the world naming `firebolt` was repointed at it.
    const cat = await warmCatalogueAt([
      ["/stuff/idea/magic/Spell/firebolt", { spellId: "firebolt", name: "Core Firebolt",
        verb: "create", noun: "fire", cost: 20,
        effects: [{ kind: "inject-channel", channel: "heat", energy: 2 }] }],
      ["/pack/ember/Spell/firebolt", { spellId: "firebolt", name: "Ember Firebolt",
        verb: "create", noun: "fire", cost: 5,
        effects: [{ kind: "inject-channel", channel: "heat", energy: 9 }] }],
    ]);

    // Both survive, and a durable reference reaches exactly the one it names.
    expect(cat.allSpells()).toHaveLength(2);
    expect(cat.getSpellAt("/stuff/idea/magic/Spell/firebolt")!.name).toBe("Core Firebolt");
    expect(cat.getSpellAt("/pack/ember/Spell/firebolt")!.name).toBe("Ember Firebolt");

    // The short name is ambiguous, and says so rather than pretending.
    expect(cat.pathsNamed("firebolt")).toHaveLength(2);
    // A player typing it gets one — a disambiguation problem, not a
    // corrupted pointer, which is the whole distinction.
    expect(cat.getSpellNamed("firebolt")).not.toBeNull();

    // …and the descriptor carries its own key, so anything holding a
    // descriptor can store a reference that survives the collision.
    expect(cat.getSpellAt("/pack/ember/Spell/firebolt")!.path).toBe(
      "/pack/ember/Spell/firebolt",
    );
  });
});

describe('the locus rule (capability packs D3) — the row names what the effect conjures', () => {
  it('an emit-field row without locus: fails validation and is dropped by the catalogue', async () => {
    const cat = await warmCatalogue([
      {
        spellId: 'no-locus',
        name: 'No Locus',
        verb: 'create',
        noun: 'light',
        cost: 10,
        castingProfile: { requiredBand: 'novice', castSeconds: 2 },
        targeting: 'none',
        effects: [{ kind: 'emit-field', field: 'light' }],
      },
      {
        spellId: 'with-locus',
        name: 'With Locus',
        verb: 'create',
        noun: 'light',
        cost: 10,
        castingProfile: { requiredBand: 'novice', castSeconds: 2 },
        targeting: 'none',
        effects: [{ kind: 'emit-field', field: 'light', locus: '/stuff/thing/magic/glowlight-mote' }],
      },
    ]);
    expect(cat.getSpellNamed('no-locus')).toBeNull();
    expect(cat.getSpellNamed('with-locus')).not.toBeNull();
  });

  it('a shock inject-channel row without locus is dropped the same way', async () => {
    const cat = await warmCatalogue([
      {
        spellId: 'bare-spark',
        name: 'Bare Spark',
        verb: 'create',
        noun: 'lightning',
        cost: 25,
        castingProfile: { requiredBand: 'competent', castSeconds: 3 },
        targeting: 'any',
        effects: [{ kind: 'inject-channel', channel: 'shock', voltage: 240 }],
      },
    ]);
    expect(cat.getSpellNamed('bare-spark')).toBeNull();
  });
});
