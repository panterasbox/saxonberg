/**
 * The dye stack and the wash/fade loop — plus the negative assertions
 * that keep the soiling seam a SEAM.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, afterEach } from 'vitest';
import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { DyedMixin } from '../Dyed';
import { Idea } from '../../stuff/Idea';
import Garment from '../../../platform/thing/equipment/Garment';
import { MixinApi } from '../../../api/mixin';
import { Mixins } from '../../mixin';
import { StuffApi } from '../../../api/stuff';
import { makeStuff } from '../../security/__tests__/test-setup';

class Cloth extends DyedMixin(Idea) {}

const MADDER = '/stuff/idea/material/dyestuff/madder';
const WELD = '/stuff/idea/material/dyestuff/weld';

function cloth(fastness: number, stack = [{ dyestuff: MADDER, mordant: 'alum', strength: 1 }]) {
  const c = makeStuff(() => new Cloth());
  c.setDyeStack(stack.map((a) => ({ ...a })));
  c.setFastness(fastness);
  return c;
}

describe('the application stack — never a colour word', () => {
  afterEach(() => StuffApi.clearAll());

  it('stores what was PUT ON, in order', () => {
    const c = cloth(0.8, []);
    c.applyDye({ dyestuff: WELD, mordant: 'alum', strength: 0.9 });
    c.applyDye({ dyestuff: MADDER, mordant: 'iron', strength: 0.6 });
    expect(c.getDyeStack().map((a) => a.dyestuff)).toEqual([WELD, MADDER]);
    // ⭐ Overdyeing is a second entry, not a table row. Blue over yellow
    // IS green, which is how green was actually made.
    expect(c.getDyeStack()).toHaveLength(2);
  });

  it('an undyed thing reads as no colour at all', () => {
    expect(cloth(0, []).getColorTag()).toBeNull();
  });

  it('refuses a malformed application', () => {
    const c = cloth(0.5, []);
    expect(() => c.setDyeStack([{ dyestuff: '', mordant: '', strength: 1 }])).toThrow(
      RangeError,
    );
    expect(() =>
      c.setDyeStack([{ dyestuff: MADDER, mordant: '', strength: 2 }]),
    ).toThrow(RangeError);
    expect(() => c.setFastness(-0.1)).toThrow(RangeError);
  });
});

describe('washing is what tests the craft', () => {
  afterEach(() => StuffApi.clearAll());

  it('⭐ washing decays fastness AND strips colour', () => {
    const c = cloth(0.9);
    const fastness = c.getFastness();
    const strength = c.getDyeStack()[0]!.strength;
    expect(c.launder()).toBe(true);
    expect(c.getFastness()).toBeLessThan(fastness);
    expect(c.getDyeStack()[0]!.strength).toBeLessThan(strength);
  });

  it('⭐⭐ a POOR mordant fades faster — that is the whole trade', () => {
    // Hue comes from the dyestuff; DURABILITY comes from the craft.
    // Competence in dyeing buys fastness, never a brighter colour, and
    // this is what makes that a mechanic rather than a claim.
    const good = cloth(0.9);
    const poor = cloth(0.2);
    good.launder();
    poor.launder();
    expect(good.getDyeStack()[0]!.strength).toBeGreaterThan(
      poor.getDyeStack()[0]!.strength,
    );
  });

  it('⚠ un-mordanted colour washes STRAIGHT OUT on the first launder', () => {
    // The missing failure mode: dye something without a mordant and it
    // does not hold. Real, nearly free, and it is the "something to be
    // bad at" every competence answer needs to be visible against.
    const unmordanted = cloth(0, [
      { dyestuff: MADDER, mordant: '', strength: 1 },
    ]);
    expect(unmordanted.getColorTag()).not.toBeNull();
    unmordanted.launder();
    expect(unmordanted.getColorTag()).toBeNull();
  });

  it('fading is DESATURATION — enough washes and it is undyed again', () => {
    const c = cloth(0.5);
    for (let i = 0; i < 20; i++) c.launder();
    expect(c.getColorTag()).toBeNull();
  });

  it('a well-bound colour survives many washes', () => {
    const c = cloth(0.95);
    for (let i = 0; i < 4; i++) c.launder();
    expect(c.getColorTag()).not.toBeNull();
  });

  it('laundering an undyed thing changes nothing and says so', () => {
    expect(cloth(0, []).launder()).toBe(false);
  });
});

describe('a Garment is dyeable, and undyed costs a shipped row nothing', () => {
  afterEach(() => StuffApi.clearAll());

  it('composes DyedMixin and starts undyed', () => {
    const g = makeStuff(() => new Garment());
    expect(MixinApi.isDyed(g)).toBe(true);
    expect(MixinApi.hasMixin(g, Mixins.Dyed)).toBe(true);
    expect(g.getDyeStack()).toEqual([]);
    expect(g.getColorTag()).toBeNull();
  });
});

/**
 * ⚠⚠ The negative half — what this build deliberately does NOT ship.
 *
 * Textiles owns the LAYERING model, so it answers *which layer takes
 * the stain* (`outermostAt`). It does not own the gauge, its bands, or
 * its attributed log — those are room-condition's, and a second gauge
 * would be a third parallel representation of one idea.
 */
describe('the soiling SEAM is a method, not a mechanism', () => {
  const here = dirname(fileURLToPath(import.meta.url));
  const MUD = join(here, '..', '..', '..');

  function walkTs(root: string): string[] {
    const out: string[] = [];
    const stack = [root];
    while (stack.length > 0) {
      const dir = stack.pop()!;
      for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        if (statSync(full).isDirectory()) stack.push(full);
        else if (entry.endsWith('.ts')) out.push(full);
      }
    }
    return out;
  }

  it('⚠ NO SoilableMixin ships from this build', () => {
    expect(existsSync(join(MUD, 'lib', 'material', 'Soilable.ts'))).toBe(false);
    expect(
      (Mixins as unknown as Record<string, string>).Soilable,
    ).toBeUndefined();
  });

  it('⚠⚠ NO `soil.*` event is registered', () => {
    /*
     * The plan originally added `Events.SoilDeposited` via `EventApi`.
     * Wrong three times over: room-condition's "attributed events" are
     * LEDGER RECORDS and `EventApi` is a broadcast bus, so an emit
     * would not feed the log it was meant to; NOTHING in this build
     * soils anything, so it would have zero emitters; and it would have
     * zero listeners by design. A soiling deposit has an actor, a
     * target garment and a body part — a LOCAL INTERACTION, and a local
     * interaction is a call, not a broadcast.
     */
    const events = readFileSync(join(MUD, 'lib', 'events.ts'), 'utf-8');
    expect(events).not.toMatch(/soil/i);
  });

  it("⚠ `CraftVessel.soiled` is untouched — two concepts, one word", () => {
    // `CraftVessel.soiled` is *is this vessel claimable for a fill* —
    // binary by necessity, owned by crafting. `Soilable` (elsewhere,
    // later) is *how well-kept is this*. Folding the first into the
    // second is the mistake this test exists to catch.
    const src = readFileSync(
      join(MUD, 'platform', 'thing', 'CraftVessel.ts'),
      'utf-8',
    );
    expect(src).toMatch(/soiled/);
    expect(src).not.toMatch(/SoilableMixin/);
  });

  it('nothing in the mudlib emits or listens for a soiling event', () => {
    const offenders = walkTs(MUD).filter((f) => {
      if (f.includes('__tests__')) return false;
      return /soil\.deposited|SoilDeposited/.test(readFileSync(f, 'utf-8'));
    });
    expect(offenders).toEqual([]);
  });
});
