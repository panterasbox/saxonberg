/**
 * Fouled water (watershed W8/W10) — **the shipped material that closes
 * the counterplay ladder**, read from its own authored row.
 *
 * The claim is that the whole toxin route needed **no new machinery**:
 * `Material.toxicity` and the metabolism clearance path already ship, so
 * fouled water is a material carrying a `ToxinTag` and the water it
 * boils into is one that does not.
 *
 * ⚠ And it is what gives `Material.purifiedByBoiling` a consumer in
 * shipped content. A field nothing authors is a field nothing proves.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import YAML from 'yaml';

const packRow = (pack: string, rel: string): Record<string, unknown> =>
  YAML.parse(
    readFileSync(
      fileURLToPath(new URL(`../../../${pack}/content/${rel}`, import.meta.url)),
      'utf8',
    ),
  ) as Record<string, unknown>;

const FOULED = packRow('water', 'stuff/idea/material/bulk/fouled-water.yaml');
const CLEAN = packRow('base-library', 'stuff/idea/material/bulk/water.yaml');

const data = (row: Record<string, unknown>): Record<string, unknown> =>
  row.data as Record<string, unknown>;

describe('the shipped fouled water', () => {
  it('carries a toxin through the SHIPPED metabolism route, and nothing new', () => {
    const toxicity = data(FOULED).toxicity as Array<{
      type: string;
      amount: number;
    }>;
    expect(toxicity).toHaveLength(1);
    expect(toxicity[0]!.type).toBe('dysentery');
    expect(toxicity[0]!.amount).toBeGreaterThan(0);
    // Water's own row carries none — that contrast IS the mechanism.
    expect(data(CLEAN).toxicity).toBeUndefined();
  });

  it('⭐ boiling it names plain water — held a minute at the boil, it IS water', () => {
    expect(data(FOULED).purifiedByBoiling).toBe(
      '/stuff/idea/material/bulk/water',
    );
    // …and the water it becomes declares no further counterpart, so
    // boiling clean water is a non-event rather than a loop.
    expect(data(CLEAN).purifiedByBoiling).toBeUndefined();
  });

  it('it is DRINKABLE — the dose is the consequence, not a refusal', () => {
    const tags = data(FOULED).tags as string[];
    expect(tags).toContain('drinkable');
    // ⚠ It keeps the `water` IDENTITY tag too. Nothing about fouled
    // water announces itself, which is the entire reason the intake's
    // POSITION is what matters.
    expect(tags).toContain('water');
    // A `Water`: its kind composes Edibility (the kind is the fact).
    expect(FOULED.class).toBe('/platform/idea/material/Water');
  });

  it('it boils at the same temperature as water — it IS water, dirtier', () => {
    expect(data(FOULED).boilingPoint).toBe(data(CLEAN).boilingPoint);
    expect(data(FOULED).density).toBe(data(CLEAN).density);
  });
});

describe('⭐ a draught of it makes you ill — and the illness runs its course', () => {
  const DYSENTERY = data(packRow('platform', 'platform/idea/Condition/metabolism/dysentery.yaml'));
  const behavior = DYSENTERY.toxinBehavior as {
    absorptionRate: number;
    clearanceRate: number;
    potency: number;
    bands: Array<{ threshold: number; severity: number }>;
  };
  const dose = (data(FOULED).toxicity as Array<{ type: string; amount: number }>)[0]!.amount;

  /** Minute steps of the body's own law: absorb from the gut, clear zero-order. */
  function course(draughts: number, minutes: number): { peak: number; illMin: number } {
    let pool = dose * draughts;
    let burden = 0;
    let peak = 0;
    let illMin = 0;
    for (let m = 0; m < minutes; m++) {
      const absorbed = Math.min(pool, behavior.absorptionRate);
      pool -= absorbed;
      burden += (absorbed * behavior.potency) / 70;
      burden = Math.max(0, burden - behavior.clearanceRate);
      peak = Math.max(peak, burden);
      if (burden >= behavior.bands[0]!.threshold) illMin++;
    }
    return { peak, illMin };
  }

  it('one draught crosses the first band, and stays ill for days', () => {
    const { peak, illMin } = course(1, 14 * 24 * 60);
    expect(peak).toBeGreaterThanOrEqual(behavior.bands[0]!.threshold);
    expect(illMin / (24 * 60)).toBeGreaterThan(1);
  });

  it('three draughts reach the second band', () => {
    expect(course(3, 14 * 24 * 60).peak).toBeGreaterThanOrEqual(behavior.bands[1]!.threshold);
  });

  it('and it clears: two weeks on, one draught has run its course', () => {
    let pool = dose;
    let burden = 0;
    for (let m = 0; m < 14 * 24 * 60; m++) {
      const absorbed = Math.min(pool, behavior.absorptionRate);
      pool -= absorbed;
      burden = Math.max(0, burden + (absorbed * behavior.potency) / 70 - behavior.clearanceRate);
    }
    expect(burden).toBe(0);
  });
});
