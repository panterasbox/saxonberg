/**
 * What the medium CARRIES — the contents substrate.
 *
 * ⭐⭐ The identity tag says what the medium IS; the contents say what is
 * in it, as litres per litre keyed by Material template path. The two are
 * independent on purpose: a room full of smoke still reads `air`, because
 * that is what is actually true of a room full of smoke.
 *
 * ⭐ And the whole derivation replaces an authored `%` `'air'` Reserve
 * that seven rows carried and four could not hold (the applier drops a
 * persistent-field key whose mixin is not in the chain), so a quarter of
 * the rooms that meant to be dangerous never were, silently.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import CartesianZone from '../../../platform/idea/location/CartesianZone';
import CartesianLocation from '../../location/CartesianLocation';
import { SkyExposedBiome } from '../../../platform/idea/SkyExposedBiome';
import Exit from '../../boundary/Exit';
import { BiomeApi } from '../../../api/biome';
import { StuffApi } from '../../../api/stuff';
import { WorldClockApi } from '../../../api/worldclock';
import Door from '../../../platform/thing/Door';
import WorldClockRegistry from '../../../platform/idea/WorldClockRegistry';
import { TemplatePaths } from '../../paths';
import type { Stuff } from '../../stuff/Stuff';
import type { Container } from '../../spatial/Container';
import {
  makeStuff,
  makeStuffAtPath,
} from '../../security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';

const SMOKE = '/stuff/idea/material/gas/smoke';
const CO2 = '/stuff/idea/material/gas/carbon-dioxide';

let seq = 0;

function room(zone: CartesianZone, x: number): CartesianLocation {
  const r = makeStuff(() => new CartesianLocation());
  r.setShortDescription(`contents-room-${x}`);
  zone.addLocation(r, x, 0, 0);
  return r;
}

function openYard(zone: CartesianZone, x: number): CartesianLocation {
  const r = room(zone, x);
  seq += 1;
  r.setBiome(
    makeStuffAtPath(
      () => new SkyExposedBiome(),
      `/stuff/idea/biome/_test/contents-yard-${seq}`,
    ) as unknown as SkyExposedBiome,
  );
  return r;
}

function contentsOf(r: CartesianLocation): Record<string, number> {
  const out: Record<string, number> = {};
  for (const c of BiomeApi.resolveAtmosphereContentsFor(
    r as unknown as Stuff & Container,
  )) {
    out[c.type] = c.amount;
  }
  return out;
}

/** Advance game time. Scale 1 → real-ms == game-ms. */
function advanceGameSeconds(s: number): void {
  WorldClockApi._advanceForTesting(s * 1000);
}

describe('AtmosphericMixin — what the medium carries', () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    WorldClockApi._resetForTesting();
    WorldClockApi.setScale(1);
    // ⚠ The decay is reconcile-on-read over GAME time, and the clock read
    // returns null when no registry is minted — so without this the
    // contents never decay and the test would pass vacuously in the one
    // direction and fail in the other.
    if (!StuffApi.findByTemplatePath(TemplatePaths.worldClockRegistry)) {
      makeStuffAtPath(
        () => new WorldClockRegistry(),
        TemplatePaths.worldClockRegistry,
      );
    }
  });
  afterEach(() => {
    WorldClockApi._resetForTesting();
    StuffApi.clearAll();
  });

  it('litres go in as a fraction of the scope volume, and the air share falls', () => {
    const zone = makeStuff(() => new CartesianZone());
    const r = room(zone, 0); // 3 m cells → 27 m³ → 27 000 L
    expect(r.getVolume()?.rawValue()).toBe(27);
    expect(r.airShare()).toBe(1);

    const accepted = r.addAtmosphereContent(SMOKE, 2700);
    expect(accepted).toBeCloseTo(2700);
    expect(contentsOf(r)[SMOKE]).toBeCloseTo(0.1); // a tenth of the room
    expect(r.airShare()).toBeCloseTo(0.9);
  });

  it('⭐ the identity tag is untouched — a smoky room is still a room full of air', () => {
    const zone = makeStuff(() => new CartesianZone());
    const r = room(zone, 0);
    r.addAtmosphereContent(SMOKE, 5000);
    expect((r as unknown as { _atmosphere: string | null })._atmosphere)
      .toBeNull();
  });

  it('two substances sum, and the fill is clamped at the volume', () => {
    const zone = makeStuff(() => new CartesianZone());
    const r = room(zone, 0);
    r.addAtmosphereContent(SMOKE, 13500); // half
    r.addAtmosphereContent(CO2, 13500); // the other half
    expect(r.airShare()).toBeCloseTo(0);
    // No headroom left: a third fire puts nothing in.
    expect(r.addAtmosphereContent(SMOKE, 1000)).toBe(0);
    expect(r.airShare()).toBeCloseTo(0);
  });

  it('⭐ under the sky nothing accumulates — that is where it goes', () => {
    const zone = makeStuff(() => new CartesianZone());
    const yard = openYard(zone, 0);
    expect(yard.airChangesPerHour()).toBe(Infinity);
    expect(yard.addAtmosphereContent(SMOKE, 10000)).toBe(0);
    expect(yard.airShare()).toBe(1);
  });

  it('a scope with no derivable volume is not a place and accepts nothing', () => {
    const r = makeStuff(() => new CartesianLocation()); // no zone, no extent
    expect(r.getVolume()).toBeNull();
    expect(r.addAtmosphereContent(SMOKE, 10000)).toBe(0);
    expect(r.airShare()).toBe(1);
  });

  describe('air changes per hour — derived from the openings', () => {
    it('a shut box leaks and nothing more', () => {
      const zone = makeStuff(() => new CartesianZone());
      expect(room(zone, 0).airChangesPerHour()).toBeCloseTo(0.1);
    });

    it('a doorway into another room is an INTERIOR opening', async () => {
      const zone = makeStuff(() => new CartesianZone());
      const a = room(zone, 0);
      const b = room(zone, 1);
      await a.addExit(
        makeStuff(
          () => new Exit({ direction: 'east', source: a, destination: b }),
        ),
      );
      expect(a.airChangesPerHour()).toBeCloseTo(1.1); // 1 interior + leak
      // ⚠ and it is NOT an exterior opening — the envelope's own count,
      // which is deliberately room-to-outside only, still reads zero.
      expect(a.openExteriorOpenings()).toBe(0);
    });

    it('⭐ a doorway onto the outside is worth four times as much', async () => {
      const zone = makeStuff(() => new CartesianZone());
      const a = room(zone, 0);
      const out = openYard(zone, 1);
      await a.addExit(
        makeStuff(
          () => new Exit({ direction: 'out', source: a, destination: out }),
        ),
      );
      expect(a.airChangesPerHour()).toBeCloseTo(4.1);
      expect(a.openExteriorOpenings()).toBe(1);
    });

    it('a SHUT door is not an opening', async () => {
      const zone = makeStuff(() => new CartesianZone());
      const a = room(zone, 0);
      const out = openYard(zone, 1);
      const exit = makeStuff(
        () => new Exit({ direction: 'out', source: a, destination: out }),
      );
      const door = makeStuff(() => new Door());
      door.setOpen(false);
      exit.setDoor(door);
      await a.addExit(exit);
      expect(a.airChangesPerHour()).toBeCloseTo(0.1);
      door.setOpen(true);
      expect(a.airChangesPerHour()).toBeCloseTo(4.1); // ⭐ opening it airs it
    });
  });

  it('⭐ the contents decay on read at the scope’s own rate', async () => {
    const zone = makeStuff(() => new CartesianZone());
    const a = room(zone, 0);
    const out = openYard(zone, 1);
    await a.addExit(
      makeStuff(
        () => new Exit({ direction: 'out', source: a, destination: out }),
      ),
    );
    a.addAtmosphereContent(SMOKE, 2700);
    const before = contentsOf(a)[SMOKE] ?? 0;
    expect(before).toBeCloseTo(0.1);

    // One hour of game time at ~4.1 air changes: e^-4.1 ≈ 0.0166 of it left.
    advanceGameSeconds(3600);
    const after = contentsOf(a)[SMOKE] ?? 0;
    expect(after).toBeLessThan(before * 0.05);
  });

  describe('standing amounts — a derived write-through', () => {
    it('never decay, because the thing feeding them is still feeding them', () => {
      const zone = makeStuff(() => new CartesianZone());
      const r = room(zone, 0);
      r.setAtmosphereStanding(SMOKE, 0.2);
      expect(contentsOf(r)[SMOKE]).toBeCloseTo(0.2);
      advanceGameSeconds(7200);
      expect(contentsOf(r)[SMOKE]).toBeCloseTo(0.2);
    });

    it('⭐ drawing one off suppresses it, and it ramps back', () => {
      const zone = makeStuff(() => new CartesianZone());
      const r = room(zone, 0);
      r.setAtmosphereStanding(SMOKE, 0.2);
      const drawn = r.drawAtmosphereContent(SMOKE, 27000 * 0.2);
      expect(drawn).toBeCloseTo(27000 * 0.2);
      expect(contentsOf(r)[SMOKE] ?? 0).toBe(0);

      // The seam recomputes it every read; the ramp is what holds it down.
      r.setAtmosphereStanding(SMOKE, 0.2);
      expect(contentsOf(r)[SMOKE] ?? 0).toBe(0);
      advanceGameSeconds(3600); // half the rebuild window
      r.setAtmosphereStanding(SMOKE, 0.2);
      expect(contentsOf(r)[SMOKE]).toBeCloseTo(0.1, 1);
      advanceGameSeconds(3600); // the rest of it
      r.setAtmosphereStanding(SMOKE, 0.2);
      expect(contentsOf(r)[SMOKE]).toBeCloseTo(0.2);
    });
  });

  it('⭐ breathability is the tag AND the share', () => {
    expect(BiomeApi.isBreathableMixture('air', [])).toBe(true);
    expect(BiomeApi.isBreathableMixture('water', [])).toBe(false);
    // ⚠ The threshold is a DISPLACEMENT figure: 0.76 air share leaves
    // about 16 % oxygen, which is where a person starts labouring. 20 %
    // exhaust is still breathable; 30 % is not.
    //
    // ⭐ It is NOT a toxicity figure, and the difference is load-bearing:
    // a first pass set it near 0.95 by reasoning from CO2 being dangerous
    // at 5 %, and that broke firedamp — a heading holding 14 % methane
    // read as unbreathable, so the canary would have reacted to the one
    // damp whose whole design is that the bird is answering a different
    // question.
    expect(
      BiomeApi.isBreathableMixture('air', [{ type: CO2, amount: 0.2 }]),
    ).toBe(true);
    expect(
      BiomeApi.isBreathableMixture('air', [{ type: CO2, amount: 0.3 }]),
    ).toBe(false);
    // ⚠ The share-only read does NOT consult the air-breather table —
    // asking it again would tell a fish it cannot breathe water.
    expect(BiomeApi.hasBreathableShare([])).toBe(true);
    expect(
      BiomeApi.hasBreathableShare([{ type: CO2, amount: 0.3 }]),
    ).toBe(false);
  });
});
