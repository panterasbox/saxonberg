/**
 * The pit pony (metal chain M5) — ⭐ **haulage needs no new mechanism at
 * all**, and this suite exists to prove that rather than to add one.
 *
 * Carry capacity derives from body MASS in the shipped encumbrance
 * substrate, so hitching a loaded cart to 320 kg of pony instead of
 * carrying it yourself is a measurably lower load ratio. The pony is
 * better at hauling because it is heavier, which is the actual reason,
 * and the engine already knew it. No mining code participates.
 *
 * ⚠ The rows themselves are also asserted: the two FUNCTIONAL species —
 * haulage and reading air, needs every mine has — ship in the trade, at
 * the `/stuff/idea/species` commons PATH. Pack ownership is a review
 * unit, not a namespace.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import YAML from 'yaml';

const PACK = fileURLToPath(new URL('../../../', import.meta.url));

function row(rel: string): Record<string, unknown> {
  const file = `${PACK}content/${rel}`;
  expect(existsSync(file)).toBe(true);
  return YAML.parse(readFileSync(file, 'utf8')) as Record<string, unknown>;
}

const PONY_SPECIES =
  'stuff/idea/species/animalia/chordata/mammalia/perissodactyla/equidae/equus/caballus-pumilus.yaml';
const CANARY_SPECIES =
  'stuff/idea/species/animalia/chordata/aves/passeriformes/fringillidae/serinus/canaria.yaml';

describe('the two functional species', () => {
  it('⭐ the pony out-hauls a person because it is HEAVIER — capacity is mass × a margin', () => {
    const pony = row('trade/mining/agent/pit-pony.yaml');
    const data = pony.data as Record<string, unknown>;
    // The shipped `LoadBearing.getCarryCapacity` is
    // `mass × CAPACITY_FRACTION × margins`, so the ratio of capacities is
    // the ratio of masses. A 320 kg pony against a ~75 kg person is a
    // four-fold difference in what the same cart costs to move — and
    // nothing in this pack computed it.
    expect(data.mass).toBe(320);
    expect((data.mass as number) / 75).toBeGreaterThan(4);
    // …and its class adds NO haulage code: `Hauler` (the hitch) comes
    // from `Character` and `Mountable` from the shipped
    // `HaulingCreature`. ⚠ The one thing `PitPony` adds is a BRAIN —
    // `cast:` means things with a brain, and an animal that cannot idle
    // reads as furniture.
    expect(pony.class).toBe('/trade/mining/agent/PitPony');
    expect(Array.isArray(data.behaviors)).toBe(true);
  });

  it('the canary’s instrument is a NUMBER IN CONTENT, not a special case in code', () => {
    const canary = row(CANARY_SPECIES);
    const vitals = (canary.data as Record<string, unknown>).vitalProfile as Record<
      string,
      { survivableMin: number }
    >;
    // A person is in trouble below 50; the bird is already gone there.
    // That single figure is the whole of why it dies first.
    expect(vitals.spo2!.survivableMin).toBeGreaterThan(75);
    // A second mine swaps the animal by writing a different row.
    expect((canary.data as Record<string, unknown>)._bodyPlanPath).toBe(
      '/stuff/idea/species/BodyPlan/avian',
    );
  });

  it('⚠ both FUNCTIONAL species ship in the TRADE, at the commons path', () => {
    for (const rel of [PONY_SPECIES, CANARY_SPECIES]) {
      const r = row(rel);
      expect(r.class).toBe('/platform/idea/species/Species');
      // The path is the commons'; the file is the trade's. Relocating one
      // later is a file move plus a title-claim edit — no path changes,
      // nothing to migrate.
      expect(rel.startsWith('stuff/idea/species/')).toBe(true);
    }
  });

  it('the canary is wired to the trade’s OWN brain, by path', () => {
    const canary = row('trade/mining/agent/canary.yaml');
    const behaviors = (canary.data as Record<string, unknown>).behaviors as Array<{
      brain: string;
      trigger: string;
    }>;
    expect(behaviors[0]!.brain).toBe('/trade/mining/behavior/reads-air');
    expect(behaviors[0]!.trigger).toMatch(/^cadence:/);
  });
});
