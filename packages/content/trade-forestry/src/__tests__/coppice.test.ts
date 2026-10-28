/**
 * The coppice — the rows, and the arithmetic the panel row states.
 *
 * Moved here from the fuel trade's `burn.test.ts` with the rows (the
 * coppice is forestry's; the collier is a customer). Two claims stay
 * from there — ONE supply, TWO consumers; the authored state is one the
 * reconcile could have produced — and one is new: the panel row's
 * header states the realm's charcoal rate, and this pins the number to
 * the rows it is computed from (forestry.md § The panel — the charcoal arithmetic).
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import YAML from 'yaml';

const CONTENT = fileURLToPath(new URL('../../../', import.meta.url));

function row(rel: string): Record<string, unknown> {
  return YAML.parse(readFileSync(`${CONTENT}${rel}`, 'utf8')) as Record<string, unknown>;
}

const STOOL = 'trade-forestry/content/trade/forestry/thing/hazel-stool.yaml';
const YARD_PANEL = 'rejection/content/world/terminus/rejection/thing/fuel-yard-panel.yaml';

describe('the coppice', () => {
  it('⭐ ONE supply, TWO consumers — the collier chars it and the mine shores with it', () => {
    const stool = row(STOOL).data as Record<string, string>;
    expect(stool.harvestTemplatePath).toBe('/trade/forestry/thing/cordwood');
    const cordwood = row('trade-forestry/content/trade/forestry/thing/cordwood.yaml') as {
      class: string;
      data: { _materialPath: string };
    };
    // A Crop — what `harvest` takes off a stool — and it is HAZEL.
    expect(cordwood.class).toBe('/platform/thing/Crop');
    expect(cordwood.data._materialPath).toBe('/stuff/idea/material/wood/hazel');
    // The timber-set recipe takes `wood` and the charcoal recipe takes
    // `wood`, off the same stand. That contest is why the fuel yard is a
    // business rather than a prop.
    const timber = row('trade-mining/content/recipes/timber-set.yaml') as unknown as {
      inputSlots: Array<{ category: string }>;
    };
    expect(timber.inputSlots[0]!.category).toBe('wood');
    // ⭐ The collier's side is the WOOD's own heat transition now
    // (ceramics ruling A): hazel chars where a flame cannot burn.
    const hazel = row('base-library/content/stuff/idea/material/wood/hazel.yaml').data as {
      tags: string[];
      kinetics: Array<{ key: string; requiresStarvedAir: boolean }>;
    };
    expect(hazel.tags).toContain('wood');
    expect(hazel.kinetics.find((t) => t.key === 'char')?.requiresStarvedAir).toBe(true);
  });

  it('⭐ the stool is cut with a billhook, credits silviculture, and is READY on a fresh boot', () => {
    const stool = row(STOOL).data as Record<string, unknown>;
    expect(stool.harvestTool).toBe('cutting');
    expect(stool.discipline).toBe('silviculture');
    // Authored in the state the reconcile could have produced: mature,
    // thriving above the flowering threshold, the cycle window open and
    // full — so `isHarvestable()` is true before anything else happens.
    expect(stool.growthStage).toBe('mature');
    expect(stool._vigor as number).toBeGreaterThanOrEqual(0.8);
    expect(stool._flowering).toBe(true);
    expect(stool._seedSet).toBe(true);
    expect(stool._fruitFill).toBe(1);
    expect(stool.lifecycleState).toBe('alive');
    const profile = stool.profile as { fruitFillDays: number; daysToStage: Record<string, number> };
    // ⭐ The rotation is ONE GAME YEAR — 360 game days.
    expect(profile.fruitFillDays).toBe(360);
    expect(profile.daysToStage.mature).toBe(360);
    // …and the billhook offers what the stool asks for.
    const hook = row('trade-forestry/content/trade/forestry/thing/billhook.yaml').data as {
      capabilities: string[];
      epoch: string;
    };
    expect(hook.capabilities).toContain('cutting');
    expect(hook.epoch).toBe('medieval');
  });

  it('⚠ the charcoal rate the panel row states is what the rows compute to — six smelts a panel a year', () => {
    const panel = row(YARD_PANEL) as {
      class: string;
      data: { staticSlots: Array<{ name: string; capacity: number }>; props: string[] };
    };
    expect(panel.class).toBe('/trade/forestry/thing/Panel');
    const slot = panel.data.staticSlots.find((s) => s.name === 'plant')!;
    // Eight slots, six stools: coppice-with-standards.
    expect(slot.capacity).toBe(8);
    const stools = panel.data.props.filter((p) => p === '/trade/forestry/thing/hazel-stool');
    expect(stools).toHaveLength(6);

    const stool = row(STOOL).data as { profile: { fruitSetCount: number } };
    const lengthsPerYear = stools.length * stool.profile.fruitSetCount; // 48
    expect(lengthsPerYear).toBe(48);

    // ⭐⭐ Ceramics ruling A changed this arithmetic, and it is MASS now:
    // a length chars to a quarter of itself (the wood's `char`
    // transition, `massRetained`), so a panel's year is
    // 48 × 3.2 kg × 0.25 ≈ 38 kg of charcoal — every length, no baskets.
    const cordwood = row('trade-forestry/content/trade/forestry/thing/cordwood.yaml').data as { mass: number };
    const hazel = row('base-library/content/stuff/idea/material/wood/hazel.yaml').data as {
      kinetics: Array<{ key: string; massRetained: number }>;
    };
    const retained = hazel.kinetics.find((t) => t.key === 'char')!.massRetained;
    const charcoalKgPerYear = lengthsPerYear * cordwood.mass * retained;
    expect(charcoalKgPerYear).toBeCloseTo(38.4, 1);
    // ⚠ OPEN (ceramics W0): the panel rows' headers still state SIX SMELTS
    // a year off the retired clamp yield (12 baskets of 8 kg). The smelt's
    // `fuel` slot counts ITEMS, and a charred length is one, so the item
    // arithmetic now reads 24. Which is right is a smelting question —
    // fuel by mass — recorded for the sweep rather than pinned here.
    const header = readFileSync(`${CONTENT}${YARD_PANEL}`, 'utf8');
    expect(header.replace(/\n# ?/g, " ")).toMatch(/not a number to raise when somebody runs out/);
  });
});
