/**
 * ⭐⭐⭐ Nose to tail — the parts of an animal nobody would pay for
 * separately, turned into the dearest thing on the counter.
 *
 * A sausage takes the TRIM a good hand's offcuts leave, the FAT nobody
 * wants on a plate, and a CASING scraped out of the gut: three things
 * that were waste a build ago. That is what makes a whole animal worth
 * killing, and it is why the chain closes here rather than extending.
 *
 * ⚠ These read the shipped ROWS and RECIPES rather than standing up a
 * craft: what is being pinned is what the content CLAIMS — which slots
 * ask for what, and which lines cannot collide.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import YAML from 'yaml';

interface Slot {
  slot: string;
  category: string;
  kind?: string;
  count?: number;
  measureL?: number;
}
interface RecipeRow {
  recipeId: string;
  discipline?: string;
  inputSlots: Slot[];
  outputTemplate?: string;
  medium?: string;
  holdS?: number;
}

function recipe(id: string): RecipeRow {
  const file = fileURLToPath(
    new URL(`../../content/recipes/${id}.yaml`, import.meta.url),
  );
  return YAML.parse(readFileSync(file, 'utf8')) as RecipeRow;
}

function row(rel: string): { data: Record<string, unknown> } {
  const file = fileURLToPath(new URL(rel, import.meta.url));
  return YAML.parse(readFileSync(file, 'utf8')) as {
    data: Record<string, unknown>;
  };
}

const cats = (r: RecipeRow): string[] => r.inputSlots.map((s) => s.category);

describe('⭐⭐ the chain closes: gut → casing → sausage', () => {
  it('a casing is scraped from OFFAL and water', () => {
    const r = recipe('scrape-casing');
    expect(cats(r)).toContain('offal');
    expect(cats(r)).toContain('water');
    expect(r.outputTemplate).toBe('/trade/cooking/thing/casing');
  });

  it('⭐⭐⭐ a sausage asks for MEAT, FAT and a CASING — and nothing else', () => {
    const r = recipe('sausage');
    expect(cats(r).sort()).toEqual(['casing', 'fat', 'meat']);
  });

  it('⚠⚠ and the sausage does NOT ask for offal — the dog loaf is safe', () => {
    // The two goods want different things off the same animal. If the
    // sausage took offal it would compete with the bakery's cheapest
    // line, and the price gap that makes the loaf a class signal would
    // close for a reason nobody designed.
    expect(cats(recipe('sausage'))).not.toContain('offal');
  });

  it('⚠ a casing is still NOT CLEAN — it carries the gut\'s own clock', () => {
    const gutMat = row('../../../base-library/content/stuff/idea/material/food/gut.yaml');
    const casing = row('../../content/trade/cooking/idea/material/casing.yaml');
    // Scraping makes gut USABLE, never safe. Both spoil far faster than
    // flesh (80000), and the casing is no better than the gut by much.
    expect(gutMat.data.spoilActivationEnergy).toBeLessThan(80000);
    expect(casing.data.spoilActivationEnergy).toBeLessThan(80000);
  });
});

describe('⭐ blood → pudding, if you came prepared', () => {
  it('a pudding asks for BLOOD, fat, grain and a casing', () => {
    expect(cats(recipe('black-pudding')).sort()).toEqual(
      ['blood', 'casing', 'fat', 'grain'].sort(),
    );
  });

  it('⭐⭐ and it is a long WET cook, so the cooking law applies to it', () => {
    const r = recipe('black-pudding');
    expect(r.medium).toBe('water');
    // ⚠ Over the braise threshold — a pudding is simmered until it sets,
    // so stewing a loin into one is as wasteful as stewing it anywhere.
    expect(r.holdS!).toBeGreaterThanOrEqual(7200 - 1800);
  });

  it('the blood slot is BULK — it is poured, not carried', () => {
    const blood = recipe('black-pudding').inputSlots.find(
      (s) => s.category === 'blood',
    )!;
    expect(blood.kind).toBe('bulk');
    expect(blood.measureL).toBeGreaterThan(0);
  });
});

describe('⚠ lard is not suet, and the chandler can tell', () => {
  it('leaf fat is a COOKING fat and is NOT tagged tallow', () => {
    const leaf = row(
      '../../../trade-ranching/content/stuff/idea/material/food/leaf-fat.yaml',
    );
    const tags = leaf.data.tags as string[];
    expect(tags).toContain('cooking-fat');
    // ⭐ So the chandler's dip refuses a pig's fat by TAG arithmetic, with
    // nothing anywhere checking for a pig.
    expect(tags).not.toContain('tallow');
  });
});

describe('⭐⭐ a joint costs more than trim', () => {
  it('the general store prices a loin well above stew meat', () => {
    const counter = row(
      '../../../terminus/content/world/terminus/general-store/counter.yaml',
    );
    const prices = counter.data.prices as Record<string, number>;
    const joint = prices['/trade/cooking/thing/cut-loin'];
    const trim = prices['/stuff/thing/items/stew-meat'];
    // ⚠ Asserted present before compared: a missing price would otherwise
    // read as `undefined > undefined` and pass as a nothing.
    expect(typeof joint, 'the store must price a joint').toBe('number');
    expect(typeof trim, 'the store must price trim').toBe('number');
    expect(joint!).toBeGreaterThan(trim!);
    // ⭐⭐⭐ The butchery chain's whole economic argument in one place: the
    // same animal is worth several times as much cut well, which is why a
    // butcher is worth paying.
    expect(joint! / trim!).toBeGreaterThanOrEqual(3);
  });

  it('⭐ and it sells the tools the depth needs', () => {
    const prices = (
      row('../../../terminus/content/world/terminus/general-store/counter.yaml')
        .data.prices as Record<string, number>
    );
    expect(prices['/trade/cooking/thing/meat-saw']).toBeGreaterThan(0);
    expect(prices['/trade/cooking/thing/cleaver']).toBeGreaterThan(0);
  });
});
