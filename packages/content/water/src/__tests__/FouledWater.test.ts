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
    expect(data(CLEAN).toxicity).toEqual([]);
  });

  it('⭐ boiling it names plain water, so `boil` is an answer and not a gesture', () => {
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
    expect(data(FOULED).edibility).toBe(true);
  });

  it('it boils at the same temperature as water — it IS water, dirtier', () => {
    expect(data(FOULED).boilingPoint).toBe(data(CLEAN).boilingPoint);
    expect(data(FOULED).density).toBe(data(CLEAN).density);
  });
});
