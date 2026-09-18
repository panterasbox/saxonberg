/**
 * The baking trade's rows and the chain they sit in (docs/vocations.md § baker).
 *
 * Reads the YAML rather than cloning: what regresses here is the
 * authoring contract, and a clone wants a live DB and a hydrator.
 *
 * ⭐⭐ The claim that matters most is the LAST group: **five links carry
 * an extraction from a millstone to a plate, and every one of them fails
 * closed and silent.** A composition dropped anywhere produces a white
 * loaf from wholemeal flour with no error. Two of the five are kernel
 * seams (tested there); the two content ones are pinned here.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import YAML from 'yaml';

const here = dirname(fileURLToPath(import.meta.url));
const PACK = join(here, '..', '..');
const BAKING = join(PACK, 'content', 'trade', 'baking');
const MATS = join(PACK, 'content', 'stuff', 'idea', 'material', 'food');
const RECIPES = join(PACK, 'content', 'recipes');

function row(file: string): Record<string, unknown> {
  const doc = YAML.parse(readFileSync(file, 'utf-8')) as {
    class?: string;
    data?: Record<string, unknown>;
  };
  return { __class: doc.class, ...(doc.data ?? {}) };
}
function recipe(name: string): Record<string, unknown> {
  return YAML.parse(
    readFileSync(join(RECIPES, `${name}.yaml`), 'utf-8'),
  ) as Record<string, unknown>;
}

describe('the five materials, and why there are exactly five', () => {
  it('dough, proofed, collapsed, bread, levain', () => {
    for (const m of [
      'dough',
      'proofed-dough',
      'collapsed-dough',
      'bread',
      'levain',
    ]) {
      expect(existsSync(join(MATS, `${m}.yaml`)), m).toBe(true);
    }
  });

  it('⭐⭐ ONE bread row — no wholemeal twin, no white twin', () => {
    // ⚠ The eight-material shape is gone deliberately. What makes one
    // loaf different from another is its COMPOSITION, carried from the
    // mill; a material per band would make two extractions a hundredth
    // apart produce byte-identical objects.
    expect(existsSync(join(MATS, 'wholemeal-bread.yaml'))).toBe(false);
    expect(existsSync(join(MATS, 'white-bread.yaml'))).toBe(false);
    expect(existsSync(join(MATS, 'brown-bread.yaml'))).toBe(false);
  });

  it('⭐ the `bread` tag is what lint:doneness reads', () => {
    // Any row made of matter tagged `bread` must be on a class that can
    // STALE. A loaf on bare `Provision` would spoil and never go hard —
    // silently, and `lint:perishable` cannot see it because such a row
    // PASSES that gate.
    expect((row(join(MATS, 'bread.yaml')).tags as string[])).toContain('bread');
  });

  it('every dough state is perishable — a wet dough goes off fast', () => {
    for (const m of ['dough', 'proofed-dough', 'collapsed-dough', 'bread', 'levain']) {
      const d = row(join(MATS, `${m}.yaml`));
      expect(d.spoilActivationEnergy, m).toBeGreaterThan(0);
      expect(d.waterActivity, m).toBeGreaterThan(0.6);
    }
  });
});

describe('⭐ the proof is a real ferment on the shipped substrate', () => {
  const profile = () =>
    row(join(BAKING, 'idea', 'maturation', 'bread-dough.yaml'));

  it('it rides MaturationProfile, matching the dough by TAG', () => {
    expect(profile().__class).toBe('/platform/idea/maturation/MaturationProfile');
    expect(profile().inputCategory).toBe('dough');
    expect((row(join(MATS, 'dough.yaml')).tags as string[])).toContain('dough');
  });

  it('⭐⭐ the cloth is the decision — wild flora if you leave it OFF', () => {
    // `spontaneousLagDays: 1` plus `Vat`'s Sealable face: open and the
    // air takes it in a day, closed and you must pitch from a crock. The
    // choice between the slow free leaven and the fast bought one is
    // made by whether you covered the bowl, and nobody explains it.
    expect(profile().spontaneousLagDays).toBe(1);
    expect(profile().wildStrain).toBe('sourdough');
  });

  it('⭐ THREE failures, and each has to read differently', () => {
    const p = profile();
    // cold HOLDS it (recoverable) …
    expect(p.stallBelowK).toBeGreaterThan(280);
    // … a scald KILLS it (not recoverable) …
    expect(p.killK).toBeGreaterThan(p.damageAboveK as number);
    // … and forgetting it turns it.
    expect(p.turnedMaterial).toBe(
      '/stuff/idea/material/food/collapsed-dough',
    );
    expect(p.turnDays).toBeLessThan(1);
  });

  it('bread throws no lees — there is no sediment to rack off a dough', () => {
    expect(profile().leesFraction).toBe(0);
  });

  it('the levain is a CULTURE and needier than a barm', () => {
    const l = row(join(BAKING, 'idea', 'maturation', 'levain-culture.yaml'));
    expect(l.kind).toBe('culture');
    expect(l.strain).toBe('sourdough');
    // A sourdough starter is famously needier than the brewer's twelve
    // days — a baker who goes away for a week comes back to a dead crock.
    expect(l.starveDays).toBeLessThan(12);
  });
});

describe('the recipes', () => {
  it('⭐ dough is a BY-HAND build — flour, water, salt', () => {
    const d = recipe('dough');
    const slots = d.inputSlots as Array<Record<string, unknown>>;
    expect(slots.map((s) => s.category).sort()).toEqual(
      ['flour', 'salt', 'water'].sort(),
    );
    // ⚠ `category: flour` matches EITHER cereal by tag. A barley dough
    // is buildable and comes out flat — nothing refuses it; the physics
    // is the refusal.
    expect(d.outputMaterial).toBe('/stuff/idea/material/food/dough');
    expect(d.outputTemplate).toBe('/trade/baking/thing/dough-trough');
  });

  it('⭐⭐ the loaf is a BULK-ONLY TANGIBLE — the kernel used to throw', () => {
    const l = recipe('lean-loaf');
    const slots = l.inputSlots as Array<Record<string, unknown>>;
    expect(l.outputApplication).toBe('tangible');
    // No item input anywhere: a loaf is baked out of a wet thing in a
    // trough, which no tangible recipe before this one was.
    expect(slots.every((s) => s.kind !== 'item')).toBe(true);
    expect(l.outputMaterial).toBe('/stuff/idea/material/food/bread');
  });

  it('⭐ the loaf wants PROOFED dough — the step is enforced by absence', () => {
    // A baker who skips the proof has nothing to bake. Not a check: the
    // recipe's input simply does not exist yet.
    const slots = recipe('lean-loaf').inputSlots as Array<
      Record<string, unknown>
    >;
    expect(slots[0]!.category).toBe('proofed-dough');
  });

  it('⭐ and the flatbread wants RAW dough — the fork that needs nothing', () => {
    const f = recipe('flatbread');
    const slots = f.inputSlots as Array<Record<string, unknown>>;
    expect(slots[0]!.category).toBe('dough');
    // No culture, no waiting, no gluten. It is what you make with barley
    // flour, or with no starter, or with no time — a real food rather
    // than a failure state.
    expect(f.holdS as number).toBeLessThan(recipe('lean-loaf').holdS as number);
  });

  it('⭐⭐ both baking recipes state a CEILING — you can burn bread', () => {
    for (const id of ['lean-loaf', 'flatbread']) {
      const r = recipe(id);
      expect(r.maxHeatK, id).toBeGreaterThan(r.requiresHeatK as number);
    }
  });
});

describe('the rows', () => {
  it('every loaf row is a `Loaf`, so every loaf can stale', () => {
    for (const l of ['lean-loaf', 'white-loaf', 'flatbread']) {
      expect(row(join(BAKING, 'thing', `${l}.yaml`)).__class, l).toBe(
        '/trade/baking/thing/Loaf',
      );
    }
  });

  it('⭐⭐ ONLY the white loaf authors a composition, and it is a BAKER’S LINE', () => {
    // An NPC counter must be able to stock two loaves priced apart on
    // day one, before any player has milled anything. That is what this
    // row is for.
    const white = row(join(BAKING, 'thing', 'white-loaf.yaml'));
    const parts = white.composition as Array<Record<string, unknown>>;
    expect(Array.isArray(parts)).toBe(true);
    expect(parts.length).toBe(2);

    // ⚠ And the lean loaf authors NONE. A player's loaf comes out of the
    // chain carrying whatever the miller decided; this row does not
    // presume to say, and "not knowing what you are made of" is not the
    // same as "being pale".
    expect(row(join(BAKING, 'thing', 'lean-loaf.yaml')).composition).toBeUndefined();
  });

  it('⚠ nothing anywhere reads a `white` band', () => {
    // There is no `white` in any vocabulary the engine consults. The
    // row's keywords are how a person says it; the mechanism is
    // continuous underneath.
    const white = row(join(BAKING, 'thing', 'white-loaf.yaml'));
    expect(white._materialPath).toBe('/stuff/idea/material/food/bread');
    expect(row(join(BAKING, 'thing', 'lean-loaf.yaml'))._materialPath).toBe(
      white._materialPath,
    );
  });

  it('the trough is a build vessel AND a ferment vessel', () => {
    expect(row(join(BAKING, 'thing', 'dough-trough.yaml')).__class).toBe(
      '/trade/baking/thing/DoughTrough',
    );
    expect(row(join(BAKING, 'thing', 'starter-crock.yaml')).__class).toBe(
      '/platform/thing/Vat',
    );
  });
});

describe('the two concepts', () => {
  it('⭐ `retrogradation` states all THREE storage conditions', () => {
    // AC 19: a reader must be able to predict the bread box before ever
    // putting a loaf in one.
    const body = String(
      row(join(BAKING, 'idea', 'HelpConcept', 'retrogradation.yaml')).body,
    ).toLowerCase();
    expect(body).toContain('counter');
    expect(body).toContain('cold');
    expect(body).toContain('frozen');
    expect(body).toContain('oven');
    // …and says the two clocks point OPPOSITE ways.
    expect(body).toContain('fastest');
    expect(body).toContain('backwards');
  });

  it('⭐ `gluten` explains why barley cannot make a loaf', () => {
    const body = String(
      row(join(BAKING, 'idea', 'HelpConcept', 'gluten.yaml')).body,
    ).toLowerCase();
    expect(body).toContain('barley');
    expect(body).toContain('sheet');
    expect(body).toContain('flat');
  });

  it('both are HelpConcept rows, harvested by class', () => {
    for (const k of ['gluten', 'retrogradation']) {
      const c = row(join(BAKING, 'idea', 'HelpConcept', `${k}.yaml`));
      expect(c.__class).toBe('/platform/idea/HelpConcept');
      expect(c.key).toBe(k);
    }
  });
});

describe('the Discipline', () => {
  it('⭐ baking SPECIALIZES cooking — a cook can follow a recipe', () => {
    const d = row(join(BAKING, 'idea', 'Discipline', 'baking.yaml'));
    expect(d.__class).toBe('/platform/idea/Discipline');
    expect(d.key).toBe('baking');
    expect(d.specializes).toBe('cooking');
    expect(d.synergizes).toContain('milling');
  });
});
