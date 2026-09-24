/**
 * ⭐⭐ **Salt has three sources, and this file is the wiring that makes that
 * one good rather than three.**
 *
 * A face you cut (capital and labour) · pans the sun works (patience, and rain
 * sets you back) · brine you boil (fast, and the fuel is what the charcoal
 * burner also wants). One good, three cost structures, and **where a person
 * lives decides which one they use** — which is only true if all three end in
 * the same material, and a row's typo would make it silently not.
 *
 * ⚠ So this test reads the shipped ROWS rather than the mechanism. The
 * arithmetic is the kernel's (`lib/maturation/__tests__/Evaporative.test.ts`
 * pins the concentrate/dilute/finish/boil behaviour on a synthetic profile);
 * what only a pack test can see is whether the profile's `inputCategory`
 * actually matches the tag the sea water carries, and whether the three
 * sources name one path.
 *
 * ⭐ The class of failure it guards is the one this repo keeps paying for: a
 * citation that resolves to nothing, failing closed and silent. A profile
 * whose `inputCategory` matched no material would simply never start, and the
 * pan would sit full of brine forever with nothing to say why.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import YAML from 'yaml';

const PACK = fileURLToPath(new URL('../../', import.meta.url));
const BASE = fileURLToPath(new URL('../../../base-library/', import.meta.url));

function row(absPath: string): Record<string, unknown> {
  return YAML.parse(readFileSync(absPath, 'utf8')) as Record<string, unknown>;
}
function data(absPath: string): Record<string, unknown> {
  return (row(absPath).data ?? {}) as Record<string, unknown>;
}

const SALT_MATERIAL = '/stuff/idea/material/food/salt';

describe('the brine profile is wired to the water it evaporates', () => {
  const profile = data(
    `${PACK}content/trade/quarrying/idea/maturation/brine.yaml`,
  );
  const seaWater = data(
    `${BASE}content/stuff/idea/material/bulk/salt-water.yaml`,
  );

  it('⭐⭐ its `inputCategory` is a tag the sea water ACTUALLY carries', () => {
    // The failure this guards is silent: a profile whose input category
    // matched nothing would never start, and the pan would sit full of brine
    // forever with nothing anywhere to say why.
    const tags = (seaWater.tags ?? []) as string[];
    expect(tags).toContain(profile.inputCategory);
  });

  it('it is the EVAPORATIVE mechanism, and it authors no flora', () => {
    expect(profile.mechanism).toBe('evaporative');
    // ⚠⚠ No strain, no wild strain, no spontaneous lag — nothing lives in a
    // salt pan. Before this build the strain gate silently froze every
    // profile that authored none (retting and bleaching both), so this
    // absence is load-bearing rather than incidental.
    expect(profile.strain).toBeUndefined();
    expect(profile.wildStrain).toBeUndefined();
    expect(profile.spontaneousLagDays).toBeUndefined();
  });

  it('⭐ the batch SHRINKS — `productFraction` is well under one', () => {
    // Sea water is a few per cent salt. The number is a ROW, which is what
    // lets a brine spring be stronger and say so.
    expect(profile.productFraction).toBeGreaterThan(0);
    expect(profile.productFraction).toBeLessThan(0.5);
  });

  it('⚠ a frozen pan STALLS rather than reading as *starting*', () => {
    // The distinction the grain chain paid for: three different states used to
    // share one sentence, and *move it somewhere warmer* could not be told
    // from *wait* or from *throw it away*.
    expect(profile.stallBelowK).toBe(273);
    // …and there IS one way to ruin one: boiled dry and burnt.
    expect(profile.damageAboveK).toBeGreaterThan(373);
  });
});

describe('⭐⭐ all three sources end in the SAME salt', () => {
  it('the pan', () => {
    const profile = data(
      `${PACK}content/trade/quarrying/idea/maturation/brine.yaml`,
    );
    expect(profile.productMaterial).toBe(SALT_MATERIAL);
  });

  it('the face — the halite band `wins:` the material, as BULK', () => {
    // ⭐ A material path rather than a row path, which is what says *bulk into
    // a vessel*: rock salt is shovelled into something you carry, exactly as
    // pan salt ends up in the pan. One shape, so `cure` never learns which
    // source its salt came from.
    const column = data(
      `${fileURLToPath(new URL('../../../rejection/', import.meta.url))}content/world/terminus/rejection/idea/deposit/quarry-hill.yaml`,
    );
    const bands = (column.stratigraphy ?? []) as Array<Record<string, string>>;
    const halite = bands.find((b) => b.host?.includes('halite'));
    expect(halite).toBeDefined();
    expect(halite!.wins).toBe(SALT_MATERIAL);
    // ⚠ And it is recognised as bulk by the `/idea/material/` infix, which is
    // the discriminator the working reads. If the path shape changed, this is
    // the assertion that would notice.
    expect(halite!.wins).toContain('/idea/material/');
  });

  it('…and the kitchen is a CUSTOMER of it, not its owner', () => {
    // Salt moved to the commons because a quarry wins it and the sea makes it.
    // The sack in a kitchen names the commons path now.
    const sack = data(
      `${fileURLToPath(new URL('../../../trade-cooking/', import.meta.url))}content/trade/cooking/thing/salt-sack.yaml`,
    );
    expect(sack.interiorMaterial).toBe(SALT_MATERIAL);
  });
});

describe('the two apparatuses are ROWS, and neither is a class', () => {
  it('⭐ the pan is a `Vat` standing open — a covered pan does not work', () => {
    const pan = row(`${PACK}content/trade/quarrying/thing/salt-pan.yaml`);
    expect(pan.class).toBe('/platform/thing/Vat');
    const d = (pan.data ?? {}) as Record<string, unknown>;
    expect(d.open).toBe(true);
    expect(d.closure).toBe('none');
    expect(d.interiorBulk).toBe(true);
  });

  it('⭐⭐ the brine hearth is an `Oven`, and that IS the coupling', () => {
    // `Oven` already composes `ContainerMixin`, so the pan goes IN the hearth,
    // and `ThermalMixin.heatSourceK()` already reads a thing's container for a
    // lit furnace. So brine over a fire reads the fire's temperature with no
    // new class, no new coupling and no new verb.
    const hearth = row(`${PACK}content/trade/quarrying/thing/brine-hearth.yaml`);
    expect(hearth.class).toBe('/platform/thing/Oven');
    const d = (hearth.data ?? {}) as Record<string, unknown>;
    // ⚠ Modest on purpose: hot enough to boil hard, nowhere near a kiln. A
    // brine hearth cannot burn lime, and saying so costs one number.
    expect(d.burnTemperatureK).toBeGreaterThan(373);
    expect(d.burnTemperatureK).toBeLessThan(900);
  });
});
