/**
 * ⭐⭐⭐ **The worked flame** — the content half of the kernel's worked-fire
 * answer, and the reason that answer is not a dead branch.
 *
 * `BurnerMixin.fuelSource()` is a protected hook whether or not this
 * pack ships a locus for it. Without one, the kernel would carry a
 * `worked` branch with nothing exercising it — this repo's
 * most-repeated failure — and the hook would have one implementer plus
 * dead code, which means it should not be a hook at all.
 *
 * ⭐ The whole thing is a 20-line class and two rows, on the glowlight
 * mote's exact shape: the emit-field executor clones whatever `locus:` a
 * row names and asks only `isLightSource` of it, so a `Burner`-composing
 * locus needs no kernel magic edit.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import YAML from 'yaml';
import WorkedFlame from '../thing/WorkedFlame';
import GlowlightMote from '../thing/GlowlightMote';
import CartesianZone from '@saxonberg/server/mud/platform/idea/location/CartesianZone';
import CartesianLocation from '@saxonberg/server/mud/lib/location/CartesianLocation';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { BiomeApi } from '@saxonberg/server/mud/api/biome';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { makeStuff } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '@saxonberg/server/mud/lib/persistence/__tests__/quantity-marshaller-test-helpers';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Container } from '@saxonberg/server/mud/lib/spatial/Container';

const HERE = dirname(fileURLToPath(import.meta.url));
const PACK = join(HERE, '..', '..');
const SMOKE = '/stuff/idea/material/gas/smoke';
const CO2 = '/stuff/idea/material/gas/carbon-dioxide';

function row(rel: string): Record<string, unknown> {
  return YAML.parse(readFileSync(join(PACK, 'content', rel), 'utf8')) as Record<
    string,
    unknown
  >;
}

describe('the worked flame', () => {
  let zone: CartesianZone;
  let cell: CartesianLocation;

  beforeEach(() => {
    installV1QuantityMarshallers();
    zone = makeStuff(() => new CartesianZone());
    cell = makeStuff(() => new CartesianLocation());
    cell.setExtent(2); // a sealed 8 m³ test cell
    zone.addLocation(cell, 0, 0, 0);
  });
  afterEach(() => StuffApi.clearAll());

  function flame(): WorkedFlame {
    const f = makeStuff(() => {
      const x = new WorkedFlame();
      x.setEmittedFlux(180);
      return x;
    }) as WorkedFlame;
    ContainmentApi.move(f as never, cell as never);
    return f;
  }

  function amountOf(path: string): number {
    const hit = BiomeApi.resolveAtmosphereContentsFor(
      cell as unknown as Stuff & Container,
    ).find((c) => c.type === path);
    return hit?.amount ?? 0;
  }

  it('⭐ it is a BURNER, which the glowlight deliberately is not', () => {
    const f = flame();
    expect(MixinApi.isBurner(f)).toBe(true);
    expect(MixinApi.isLightSource(f)).toBe(true);
    expect(MixinApi.isThermal(f)).toBe(true);
    // ⭐⭐ The carve, both sides. The glowlight's own docstring says
    // *"Light only, deliberately no heat — the sim decouples them"*; it
    // proves the decoupling on the light side and this proves it on the
    // heat side.
    const mote = makeStuff(() => new GlowlightMote());
    expect(MixinApi.isLightSource(mote)).toBe(true);
    expect(MixinApi.isBurner(mote)).toBe(false);
    expect(MixinApi.isThermal(mote)).toBe(false);
  });

  it('⭐ has nothing to stoke and nothing to run out of', () => {
    const f = flame();
    expect(f.fuelRemaining()).toBe(Infinity);
    const stone = makeStuff(() => new GlowlightMote());
    expect(f.stoke(stone as unknown as Stuff)).toEqual({
      ok: false,
      reason: 'no-bed',
    });
  });

  it('⭐⭐ makes NO smoke, and still spends the room’s air', () => {
    const f = flame();
    for (let i = 0; i < 40; i++) f.exhaustTick(30);
    // No matter in it, so nothing is incompletely burning.
    expect(amountOf(SMOKE)).toBe(0);
    // ⭐ But conservation is not something magic is exempt from: the
    // power has to come out of the air, which is what makes a worked
    // fire in a sealed cellar as dangerous as a real one.
    expect(amountOf(CO2)).toBeGreaterThan(0);
    expect(
      BiomeApi.airShareOf(
        BiomeApi.resolveAtmosphereContentsFor(
          cell as unknown as Stuff & Container,
        ),
      ),
    ).toBeLessThan(1);
  });

  it('⭐⭐ is DIM — the clean floor, so you can tell it by looking', () => {
    const f = flame();
    const flux = f.getEmittedFlux().rawValue();
    expect(flux).toBeGreaterThan(0);
    // 0.15 of the authored ceiling: `fire.light.cleanFloor`, because a
    // flame with no particles in it sheds very little light. A
    // solid-fuel fire of the same ceiling would read four times this.
    expect(flux).toBeLessThan(180 * 0.3);
  });

  it('⚠ its flame is NAKED — a working does not exempt you from firedamp', () => {
    expect(flame().isFlameEnclosed()).toBe(false);
  });

  it('its temperature is the vessel ceiling — no fuel to cap it', () => {
    // ⭐ The asymmetry with a real fire, stated: a real flame is capped
    // by what it is BURNING, and a worked one is whatever the working
    // says. That is what the spell's cost is paying for.
    expect(flame().getHeldTemperatureK()).toBeCloseTo(900, 0);
  });

  describe('the rows', () => {
    it('⭐ the spell names the locus, and the locus names the class', () => {
      const spell = row('stuff/idea/magic/Spell/conjure-flame.yaml')
        .data as Record<string, unknown>;
      expect(spell.verb).toBe('create');
      expect(spell.noun).toBe('fire');
      const effects = spell.effects as { kind: string; locus?: string }[];
      const emit = effects.find((e) => e.kind === 'emit-field');
      expect(emit, 'no emit-field effect').toBeDefined();
      expect(emit!.locus).toBe('/stuff/thing/magic/worked-flame');

      const locus = row('stuff/thing/magic/worked-flame.yaml');
      expect(locus.class).toBe('/arcane-library/thing/WorkedFlame');
      // ⚠ Lit on arrival, unlike every other Burner row in the game: a
      // conjured flame is conjured burning, and one that arrived cold
      // would be waiting for a match nobody has.
      expect((locus.data as { lit: boolean }).lit).toBe(true);
    });

    it('⚠ it costs more than a glowlight, and the physics is why', () => {
      const flameCost = (row('stuff/idea/magic/Spell/conjure-flame.yaml')
        .data as { cost: number }).cost;
      const lightCost = (row('stuff/idea/magic/Spell/glowlight.yaml')
        .data as { cost: number }).cost;
      // A glowlight is a field. This heats a room and breathes its air.
      expect(flameCost).toBeGreaterThan(lightCost);
    });
  });
});
