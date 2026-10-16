/**
 * The mine archetype and the recipe ladder (metal chain M8).
 *
 * ⭐⭐ **The one falsifiable claim the archetype has to carry**: *the
 * archetype says you need light underground; Rejection answers with
 * glowcap, another mine answers with oil lamps.* Same slot,
 * different world — which is only true if the slot ships with NO
 * DEFAULT, and that is asserted here rather than assumed.
 *
 * And the ladder: a recipe ships iff an act this build introduces demands
 * the object AND it fills a difficulty rung the branch lacks. The tiers
 * ARE the ladder a learner climbs, so the set is checked for shape —
 * something at the bottom that needs no heat and no station, and
 * something at the top that is genuinely hard.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import YAML from 'yaml';
import { Archetype } from '@saxonberg/server/mud/lib/archetype/Archetype';

const PACK = fileURLToPath(new URL('../../', import.meta.url));
const RECIPES = `${PACK}content/recipes/`;

interface RecipeRow {
  recipeId: string;
  discipline: string;
  difficulty: string;
  outputTemplate: string;
  requiresHeatK?: number;
  toolCapabilities?: string[];
  inputSlots?: Array<{ category: string }>;
}

function recipes(): RecipeRow[] {
  return readdirSync(RECIPES)
    .filter((f) => f.endsWith('.yaml'))
    .map((f) => YAML.parse(readFileSync(RECIPES + f, 'utf8')) as RecipeRow);
}

function archetype(): Archetype {
  return Archetype.fromData(
    YAML.parse(readFileSync(`${PACK}content/archetypes/mining.yaml`, 'utf8')) as Record<
      string,
      unknown
    >,
  );
}

describe('the mine archetype', () => {
  it('loads, and states every slot a working mine needs', () => {
    const a = archetype();
    expect(a.getArchetypeId()).toBe('mining');
    expect(a.getIndustry()).toBe('mining');
    expect(a.getCapabilities().map((c) => c.key).sort()).toEqual([
      'air', 'assay', 'haulage', 'light', 'support', 'survey', 'winning',
    ]);
  });

  it('⭐⭐ the LIGHT slot has NO DEFAULT — the divergence point, and the whole demonstration', () => {
    const light = archetype().getCapabilities().find((c) => c.key === 'light')!;
    expect(light.needs).toEqual({ lightLux: 20 });
    // ⚠ If this ever gains a default, the claim "Rejection answers with
    // glowcap, another mine answers with oil lamps" quietly becomes
    // "every mine answers with whatever the trade shipped."
    expect(light.default).toBeNull();
  });

  it('haulage and air ride `presence`, keyed on DISTINCT keywords', () => {
    const caps = archetype().getCapabilities();
    const haulage = caps.find((c) => c.key === 'haulage')!.needs;
    const air = caps.find((c) => c.key === 'air')!.needs;
    expect(haulage).toEqual({ presence: 'pony' });
    expect(air).toEqual({ presence: 'canary' });
    // ⚠ `presence` matches on KEYWORDS and matching is substring-prone;
    // a mine is dense in near-identical nouns, so the two must not be
    // prefixes of one another or of anything else the venue ships.
    expect('pony'.startsWith('canary')).toBe(false);
    expect('canary'.startsWith('pony')).toBe(false);
  });

  it('every default names a row this pack actually ships', () => {
    for (const slot of archetype().getCapabilities()) {
      if (!slot.default) continue;
      expect(slot.default.startsWith('/trade/mining/')).toBe(true);
      const rel = slot.default.replace('/trade/mining/', '');
      expect(existsSync(`${PACK}content/trade/mining/${rel}.yaml`)).toBe(true);
    }
  });

  it('describe() reports every authored slot, and the light row is visibly unfilled', () => {
    const rows = archetype().describe().rows;
    expect(rows.map((r) => r.key)).toContain('light');
    // ⚠ `industry: mining` means the tool/heat rows DERIVE from the
    // recipes at runtime; with no catalogue warmed here the authored
    // residue is all there is, which is the honest floor.
    expect(rows.find((r) => r.key === 'light')!.default).toBeNull();
  });
});

describe('the recipe ladder', () => {
  it('every recipe is on the mining discipline and outputs a row this pack ships', () => {
    for (const r of recipes()) {
      expect(r.discipline).toBe('mining');
      expect(r.outputTemplate.startsWith('/trade/mining/thing/')).toBe(true);
      const rel = r.outputTemplate.replace('/trade/mining/', '');
      expect(existsSync(`${PACK}content/trade/mining/${rel}.yaml`)).toBe(true);
    }
  });

  it('⭐ the tiers ARE the ladder: a by-hand bottom rung and a formidable top', () => {
    const rows = recipes();
    // The bottom: no heat, no station — a stick of wood and a knife.
    // (The pick haft was the other one; it is the woodworker's now —
    // assembly AC 18 — and carved under `carpentry`.)
    const bottom = rows.filter((r) => r.difficulty === 'easy' && !r.requiresHeatK);
    expect(bottom.map((r) => r.recipeId).sort()).toEqual(['timber-set']);
    // The top: the two instruments, and nothing else.
    const top = rows.filter((r) => r.difficulty === 'formidable');
    expect(top.map((r) => r.recipeId).sort()).toEqual(['assay-kit', 'miners-dial']);
    // …and the bands between. ⚠ `hard` was the pick head, which is the
    // SMITH's recipe now (assembly AC 18): the forging rung of a miner's
    // ladder is climbed at the anvil, under smithing, and a miner who
    // wants to make their own head learns that trade.
    const bands = new Set(rows.map((r) => r.difficulty));
    expect([...bands].sort()).toEqual(['easy', 'formidable', 'standard']);
  });

  it('⭐⭐ the chain closes on itself: the pick is ASSEMBLED from a smith\'s head and a woodworker\'s haft', () => {
    const rows = recipes();
    // ⭐ Neither half is the mining trade's to make any more (assembly AC
    // 18): the head is forged under smithing, the haft carved under
    // carpentry, and the miner fits them.
    expect(rows.find((r) => r.recipeId === 'pick-head')).toBeUndefined();
    expect(rows.find((r) => r.recipeId === 'pick-haft')).toBeUndefined();
    const pick = rows.find((r) => r.recipeId === 'pick')!;
    // ⭐ The pick itself is ASSEMBLED rather than forged — a head and a
    // haft fitted together — so it asks for `metal` and is right to: what
    // it wants is a head, and a head is made of whatever you forged it
    // from.
    expect(pick.inputSlots!.map((s) => s.category).sort()).toEqual(['metal', 'wood']);
    expect(pick.outputTemplate).toBe('/trade/mining/thing/pick');
    // …and the row's bill names the two trades' rows, at their homes.
    const row = YAML.parse(
      readFileSync(`${PACK}content/trade/mining/thing/pick.yaml`, 'utf8'),
    ) as { data: { bill: { parts: Array<{ part: string; template: string }> } } };
    const byPart = new Map(row.data.bill.parts.map((p) => [p.part, p.template]));
    expect(byPart.get('head')).toBe('/trade/smithing/thing/pick-head');
    expect(byPart.get('haft')).toBe('/trade/carpentry/thing/pick-haft');
  });

  it('⚠ the SAFETY tool sits low on the ladder, on purpose', () => {
    const bar = recipes().find((r) => r.recipeId === 'pinch-bar')!;
    // Safety equipment a beginner cannot make is safety equipment nobody
    // has. Barring down loose ground is how an attentive miner is never
    // hurt, so the bar must be within reach from the start.
    expect(bar.difficulty).toBe('easy');
  });

  it('every recipe an act of this build demands has a row, and none is speculative', () => {
    const ids = recipes().map((r) => r.recipeId).sort();
    expect(ids).toEqual([
      // (the billhook and the felling axe are the FORESTRY trade's since
      // the forestry build — the instruments ship with the trade that
      // affords the act, and the coppice is forestry's)
      // (the pick head and the pick haft are the SMITH's and the
      // WOODWORKER's since the assembly build — AC 18)
      'assay-kit', 'miners-dial', 'pick',
      'pinch-bar', 'shovel', 'sledge',
      'timber-set', 'tongs',
    ]);
  });
});
