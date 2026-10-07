/**
 * ⭐⭐ `grind` — **bone's one sink, and the carcass chain's way back into
 * the ground.**
 *
 * A butchered animal gives bone, and nothing in the world could do
 * anything with it: the bone row's own prose promised *"ground it goes
 * back on the land"* and there was no way to grind it. The animal that
 * ate the field feeds it back at both ends now — the muck while it lived
 * and the bone when it did not.
 *
 * These are row assertions, deliberately. The arithmetic of the feed is
 * pinned in the kernel (`FeedVerb.test.ts`, the slow-amendment block) and
 * the crafting resolve is pinned by the suite at large; what can only go
 * wrong HERE is the content agreeing with itself — the recipe matching a
 * tag the material does not carry, or the output going somewhere the
 * `feed` branch cannot read.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import YAML from 'yaml';

const HERE = dirname(fileURLToPath(import.meta.url));
const PACK = join(HERE, '..', '..');
const PACKS = join(PACK, '..');

interface RecipeDoc {
  recipeId: string;
  discipline?: string;
  difficulty?: string;
  outputMaterial?: string;
  outputTemplate?: string;
  outputApplication?: string;
  outputPortionL?: number;
  toolCapabilities?: string[];
  inputSlots?: {
    slot: string;
    category: string;
    kind?: string;
    measureL?: number;
    count?: number;
  }[];
}

function recipeIn(pack: string, id: string): RecipeDoc {
  return YAML.parse(
    readFileSync(join(PACKS, pack, 'content', 'recipes', `${id}.yaml`), 'utf8'),
  ) as RecipeDoc;
}

/** The `data:` block of a row, found across the packs. */
function row(path: string): Record<string, unknown> {
  const rel = `${path.replace(/^\//, '')}.yaml`;
  for (const pack of readdirSync(PACKS)) {
    const candidate = join(PACKS, pack, 'content', rel);
    try {
      if (!statSync(candidate).isFile()) continue;
    } catch {
      continue;
    }
    const doc = YAML.parse(readFileSync(candidate, 'utf8')) as {
      data?: Record<string, unknown>;
    };
    return doc.data ?? {};
  }
  throw new Error(`no row at ${path}`);
}

function tags(path: string): string[] {
  return (row(path)['tags'] as string[] | undefined) ?? [];
}

describe('bone grinds, and what comes out feeds the ground', () => {
  const meal = recipeIn('trade-milling', 'bone-meal');

  it('⭐ takes BONE, matched on the material\'s own tag', () => {
    // ⚠ See the chandlery's twin: a missing slot should be a NAMED
    // failure, not a non-null assertion that defers the crash.
    const [slot] = meal.inputSlots ?? [];
    expect(slot, 'the bone-meal recipe must declare an input slot').toBeDefined();
    if (!slot) return;
    expect(slot.kind).toBe('item');
    expect(slot.category).toBe('bone');
    expect(tags('/stuff/idea/material/tissue/bone')).toContain('bone');
  });

  it('⭐⭐ needs STONES, so the capital decides your time and not your access', () => {
    // A hand quern carries `millstone` and so does a water mill — the
    // milling trade's own claim, applied to a second input.
    expect(meal.toolCapabilities).toContain('millstone');
  });

  it('⭐⭐ comes out as a SLOW AMENDMENT, which is what `feed` reads', () => {
    // ⚠ NOT phosphorus, and the bone row claimed it was. Soil holds
    // moisture, nitrogen, organic matter and structure; a fifth reserve
    // with one producer and one consumer would be a mechanism serving a
    // single row. `slow-amendment` credits ORGANIC MATTER instead, and
    // `Soil.addOrganicMatter` already passes a little straight to
    // nitrogen — exactly what ground bone does in a field.
    expect(meal.outputMaterial).toBe('/stuff/idea/material/mineral/bone-meal');
    expect(tags('/stuff/idea/material/mineral/bone-meal')).toContain(
      'slow-amendment',
    );
  });

  it('⚠ and NOT as `compost`, which would credit nitrogen instead', () => {
    // Both tags are on the row — `compost` because spent meal is
    // genuinely compostable — and `FeedController` checks
    // `slow-amendment` FIRST, so the amendment arm wins. The thing that
    // would break is the order, which the kernel test pins; what this
    // pins is that both words are deliberately present.
    const t = tags('/stuff/idea/material/mineral/bone-meal');
    expect(t).toContain('compost');
    expect(t).toContain('slow-amendment');
  });

  it('comes out as BULK in a vessel `feed` can draw from', () => {
    expect(meal.outputApplication).toBe('bulk');
    expect(meal.outputPortionL).toBeGreaterThan(0);
    expect(row(meal.outputTemplate!)['interiorBulk']).toBe(true);
  });

  it('⭐ is UNGATED — turning a handle is not a skill', () => {
    // The skill in this chain was the butchering.
    expect(meal.discipline).toBeUndefined();
    expect(meal.difficulty).toBeUndefined();
  });

  it('⚠ bone meal is NOT edible to a person', () => {
    expect(row('/stuff/idea/material/mineral/bone-meal')['edibility']).toBe(
      false,
    );
  });
});

describe('the dog loaf — offal\'s sink, and a manufactured feed', () => {
  const loaf = recipeIn('trade-baking', 'dog-loaf');

  it('⭐⭐ consumes OFFAL, which is twelve percent of every carcass', () => {
    // Edible, and nobody much wants to eat it. This is where it goes —
    // and ⚠ a manufactured good with a producer is a vocation where a
    // thrown scrap is not, which is why the chain does not stop at
    // *give the dog the offal*.
    const offal = loaf.inputSlots?.find((s) => s.category === 'offal');
    expect(offal).toBeDefined();
    expect(offal!.kind).toBe('item');
    expect(tags('/stuff/idea/material/food/offal')).toContain('offal');
  });

  it('⭐ and bone meal, bran and a cooking fat — four inputs, three chains', () => {
    const cats = (loaf.inputSlots ?? []).map((s) => s.category).sort();
    expect(cats).toEqual(['bone-meal', 'bran', 'cooking-fat', 'offal']);
  });

  it('⭐⭐ the fat slot is `cooking-fat`, so the chandler is a COMPETITOR', () => {
    // The same crock of rendered tallow can be fried in, dipped into, or
    // baked into a dog loaf. That competition is what gives a carcass's
    // fat line a price worth arguing about.
    expect(tags('/trade/cooking/idea/material/tallow')).toContain(
      'cooking-fat',
    );
    expect(tags('/trade/cooking/idea/material/tallow')).toContain(
      'candle-stock',
    );
  });

  it('⭐ the loaf carries `feed`, which is what the pets chain reads', () => {
    expect(tags('/stuff/idea/material/food/dog-bread')).toContain('feed');
  });

  it('⚠ and it IS edible — the game makes no class judgement', () => {
    // People ate horse-bread when it was the only bread they could
    // afford. Refusing it would be a judgement the world should be
    // making with a price instead.
    expect(row('/stuff/idea/material/food/dog-bread')['edibility']).toBe(true);
  });

  it('⚠⚠ authors no unrouted nutrient', () => {
    // `NUTRIENT_ROUTING` routes exactly six tags and an unrouted one is
    // SILENTLY IGNORED — authored nourishment that does nothing. `fibre`
    // was in the first draft of this row and is a material TAG, not a
    // thing a body banks.
    const ROUTED = ['water', 'carb', 'sugar', 'fat', 'protein', 'vitamin-c'];
    const nutrients =
      (row('/stuff/idea/material/food/dog-bread')['nutrients'] as string[]) ??
      [];
    expect(nutrients.length).toBeGreaterThan(0);
    for (const n of nutrients) expect(ROUTED).toContain(n);
  });

  it('⭐⭐ and the baker SELLS it, at half the cheapest people-bread', () => {
    // The fourth line is what makes the other three mean something: a
    // board listing dog bread at 1 beside white at 4 is saying something
    // about the town that nobody had to author.
    const counter = row('/world/terminus/market/thing/bread-counter');
    const prices = counter['prices'] as Record<string, number>;
    expect(prices['/trade/baking/thing/dog-loaf']).toBe(1);
    expect(prices['/trade/baking/thing/dog-loaf']).toBeLessThan(
      prices['/trade/baking/thing/lean-loaf']!,
    );
    const lines = counter['stockLines'] as { itemTemplatePath: string }[];
    expect(lines.map((l) => l.itemTemplatePath)).toContain(
      '/trade/baking/thing/dog-loaf',
    );
  });
});
