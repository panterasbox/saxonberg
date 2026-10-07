/**
 * ⭐⭐ The chandlery — **one recipe, two fats**, asserted on the rows.
 *
 * The thing to protect here is an ABSENCE. `recipes/candle.yaml` authors
 * no `outputMaterial` and no `outputAppearance`, and welding either back
 * on would collapse the pack to the state it replaced: a candle that is
 * always wax, whatever you dipped it in. An absence is exactly what a
 * future edit removes without noticing, so it gets a test with its
 * reasoning attached.
 *
 * The arithmetic of the derivation itself is pinned in the kernel, in
 * `CraftingLogic.dipped.test.ts` — one pot of wax and one of tallow
 * through the real resolve. This file is about the content.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import YAML from 'yaml';
import Candle from '../thing/Candle';
import Lamp from '@saxonberg/server/mud/platform/thing/Lamp';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { makeStuff } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';

const HERE = dirname(fileURLToPath(import.meta.url));
const PACK = join(HERE, '..', '..');
const PACKS = join(PACK, '..');

interface RecipeDoc {
  recipeId: string;
  discipline?: string;
  difficulty?: string;
  outputMaterial?: string;
  outputAppearance?: string;
  outputTemplate?: string;
  outputApplication?: string;
  requiresHeatK?: number;
  inputSlots?: { slot: string; category: string; kind?: string; measureL?: number }[];
}

function recipe(id: string): RecipeDoc {
  return YAML.parse(
    readFileSync(join(PACK, 'content', 'recipes', `${id}.yaml`), 'utf8'),
  ) as RecipeDoc;
}

/** Tags on a material row, found across the packs. */
function rowTags(path: string): string[] {
  const rel = `${path.replace(/^\//, '')}.yaml`;
  for (const pack of readdirSync(PACKS)) {
    const candidate = join(PACKS, pack, 'content', rel);
    try {
      if (!statSync(candidate).isFile()) continue;
    } catch {
      continue;
    }
    const doc = YAML.parse(readFileSync(candidate, 'utf8')) as {
      data?: { tags?: string[] };
    };
    return doc.data?.tags ?? [];
  }
  throw new Error(`no row at ${path}`);
}

/** Does any pack still ship a row at this path? */
function rowExists(path: string): boolean {
  const rel = `${path.replace(/^\//, '')}.yaml`;
  for (const pack of readdirSync(PACKS)) {
    try {
      if (statSync(join(PACKS, pack, 'content', rel)).isFile()) return true;
    } catch {
      // not this pack
    }
  }
  return false;
}

describe('one recipe, and the empty outputMaterial IS the feature', () => {
  const candle = recipe('candle');

  it('⚠⚠ authors NO outputMaterial — the single most important line', () => {
    // Welding a material back on is the one edit that undoes the pack.
    expect(candle.outputMaterial).toBe('');
  });

  it('⚠ and no outputAppearance either', () => {
    // `Candle` builds the description off the material. An authored
    // appearance would override it and both candles would read alike.
    expect(candle.outputAppearance).toBeUndefined();
  });

  it('⭐⭐ matches `candle-stock`, which BOTH fats carry', () => {
    expect(candle.inputSlots?.[0]!.category).toBe('candle-stock');
    expect(rowTags('/stuff/idea/material/organic/beeswax')).toContain(
      'candle-stock',
    );
    expect(rowTags('/trade/cooking/idea/material/tallow')).toContain(
      'candle-stock',
    );
  });

  it('⚠⚠ and does NOT match `fat` — you cannot dip out of the frying pan', () => {
    // `fat` is the cooking MEDIUM tag. A recipe matching it would admit
    // every cooking fat in the game, and D3 has just finished making
    // sure raw suet does not carry it.
    expect(candle.inputSlots?.[0]!.category).not.toBe('fat');
  });

  it('⭐⭐ is UNGATED — the one made thing a person with no trade can make', () => {
    // `canMake` returns true when either is absent, so a player with no
    // Discipline at all can dip a candle. Deliberate: dipping a wick in
    // fat is not a skill, and a gate whose key does not exist is a lock.
    expect(candle.discipline).toBeUndefined();
    expect(candle.difficulty).toBeUndefined();
  });

  it('takes bulk, not an item — the pot is where the two fats meet', () => {
    // ⚠ Asserted, not asserted-away: `?.[0]!` tells the compiler to stop
    // worrying and tells a reader nothing. If the recipe has no slots
    // this test should SAY so rather than fail on a property of
    // undefined two lines down.
    const [slot] = candle.inputSlots ?? [];
    expect(slot, 'the candle recipe must declare an input slot').toBeDefined();
    if (!slot) return;
    expect(slot.kind ?? 'bulk').toBe('bulk');
    expect(slot.measureL).toBeGreaterThan(0);
  });

  it('⭐ needs a hot pot, which clears both fats\' melting points', () => {
    // Beeswax melts at 335 K and tallow at 320 K. You cannot dip a candle
    // out of a cold pot of set tallow, and this is the honest gate.
    expect(candle.requiresHeatK).toBeGreaterThan(335);
  });
});

describe('melt-wax — a STEP of the dip, not a verb of its own', () => {
  const melt = recipe('melt-wax');

  it('⭐⭐⭐ `melt` is an ALIAS on `dip`, and ships no view of its own', () => {
    // It shipped as a second verb for one build, on the argument that the
    // pot has to be filled before anything can be dipped out of it. The
    // asymmetry between a liquid crock and a hard cake is real; the
    // second verb was not — it was the first STEP of the only act this
    // pack has, and the collision ladder's first rung is *unify*.
    const views = readdirSync(
      join(PACK, 'content', 'trade', 'chandlery', 'cmd', 'chandlery'),
    );
    expect(views).toEqual(['dip.yaml']);

    const dip = YAML.parse(
      readFileSync(
        join(PACK, 'content', 'trade', 'chandlery', 'cmd', 'chandlery', 'dip.yaml'),
        'utf8',
      ),
    ) as { verbs: string[]; args: { name: string }[] };
    expect(dip.verbs).toEqual(['dip', 'melt']);
    // ⚠ And the solid is declared FIRST. Positionals bind in declared
    // order, so with the pot ahead of it `dip the cake` hands the cake to
    // the pot — the defect the milling trade paid for with `mill wheat
    // 0.72`.
    expect(dip.args.map((a) => a.name)).toEqual(['solid', 'pot']);
  });

  it('⭐ authors its material, because melting changes nothing', () => {
    // Only the DIP derives, because only the dip has two possible
    // feedstocks. Melting wax yields wax.
    expect(melt.outputMaterial).toBe('/stuff/idea/material/organic/beeswax');
  });

  it('takes an item and fills bulk — a cake becomes a potful', () => {
    expect(melt.inputSlots?.[0]!.kind).toBe('item');
    expect(melt.outputApplication).toBe('bulk');
  });

  it('⚠ and TALLOW has no equivalent, deliberately', () => {
    // Rendered tallow leaves `render-tallow` as bulk in a crock and is
    // `pour`ed in by the shipped platform verb — so it satisfies the
    // candle slot on the first attempt and the melt leg never runs. The
    // asymmetry the two verbs were claiming is a code path that is simply
    // not taken. Shipping a `melt-tallow` row would be a recipe for a
    // step that is already a verb.
    const ids = readdirSync(join(PACK, 'content', 'recipes'));
    expect(ids).not.toContain('melt-tallow.yaml');
    expect(ids).toHaveLength(2);
  });
});

describe('the candle row', () => {
  const row = YAML.parse(
    readFileSync(
      join(PACK, 'content', 'trade', 'chandlery', 'thing', 'candle.yaml'),
      'utf8',
    ),
  ) as { class: string; data: Record<string, unknown> };

  it('⭐⭐ names THIS pack\'s class and authors no material', () => {
    expect(row.class).toBe('/trade/chandlery/thing/Candle');
    // ⚠ The dip stamps it. A row with a material would be a beeswax weld
    // wearing a different hat.
    expect(row.data['_materialPath']).toBeUndefined();
  });

  it('⚠ the stem is the BARE noun', () => {
    // `Candle.getShortDescription` puts the material in front of it, so
    // authoring "beeswax candle" would render "beeswax beeswax candle".
    expect(row.data['shortDescription']).toBe('candle');
  });

  it('ships cold and out', () => {
    // `lint:light-sources` refuses a Burner row that omits `lit:`, and a
    // candle that arrives burning is a candle nobody decided to light.
    expect(row.data['lit']).toBe(false);
  });

  it('⭐⭐ the old welded row is GONE, not shadowed', () => {
    // Two candle rows would mean the generic one still answers `look
    // candle` somewhere, with beeswax welded into it.
    expect(rowExists('/stuff/thing/candle')).toBe(false);
  });
});

describe('the class', () => {
  it('⭐ is a Lamp that smells', () => {
    const c = makeStuff(() => new Candle());
    expect(c instanceof Lamp).toBe(true);
    expect(MixinApi.isSmellSource(c as unknown as Stuff)).toBe(true);
    // A lantern is not. This is the one thing a candle has that a lantern
    // does not, and it is why a tallow candle was worth complaining about.
    expect(MixinApi.isSmellSource(makeStuff(() => new Lamp()) as unknown as Stuff)).toBe(
      false,
    );
  });

  it('⚠ a candle made of nothing in particular is still a candle', () => {
    // The row authors no material, so this is the state a candle minted
    // outside the dip is in. It must render rather than throw.
    const c = makeStuff(() => new Candle());
    c.setShortDescription('candle');
    expect(c.getShortDescription()).toBe('candle');
    expect(() => c.getLongDescription()).not.toThrow();
    // …and `adoptMaterialSmell` on it is a no-op rather than a crash.
    expect(() => c.adoptMaterialSmell()).not.toThrow();
    expect(c.getOdorIdentity()).toBe('');
  });
});
