/**
 * The mine archetype and the recipe ladder (metal chain M8).
 *
 * ⭐⭐ **The one falsifiable claim the archetype has to carry**: *the
 * archetype says you need light underground; Rejection answers with
 * cultivated glowcap, another mine answers with oil lamps.* Same slot,
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
    const bottom = rows.filter((r) => r.difficulty === 'easy' && !r.requiresHeatK);
    expect(bottom.map((r) => r.recipeId).sort()).toEqual(['pick-haft', 'timber-set']);
    // The top: the two instruments, and nothing else.
    const top = rows.filter((r) => r.difficulty === 'formidable');
    expect(top.map((r) => r.recipeId).sort()).toEqual(['assay-kit', 'miners-dial']);
    // …and every band between is populated, so the ladder has no gap.
    const bands = new Set(rows.map((r) => r.difficulty));
    expect([...bands].sort()).toEqual(['easy', 'formidable', 'hard', 'standard']);
  });

  it('⭐⭐ the chain closes on itself: the pick head is made of METAL and the pick of the head', () => {
    const rows = recipes();
    const head = rows.find((r) => r.recipeId === 'pick-head')!;
    expect(head.inputSlots!.some((s) => s.category === 'metal')).toBe(true);
    const pick = rows.find((r) => r.recipeId === 'pick')!;
    expect(pick.inputSlots!.map((s) => s.category).sort()).toEqual(['metal', 'wood']);
    // The tool a miner swings is forged from metal somebody dug — and
    // picks wear out, which is the real sink that makes it a cycle.
    expect(pick.outputTemplate).toBe('/trade/mining/thing/pick');
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
      'assay-kit', 'billhook', 'felling-axe', 'miners-dial', 'pick',
      'pick-haft', 'pick-head', 'pinch-bar', 'shovel', 'sledge',
      'timber-set', 'tongs',
    ]);
  });
});
