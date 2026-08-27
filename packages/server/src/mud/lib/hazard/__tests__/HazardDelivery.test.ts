/**
 * HazardDelivery — the pure `Channel × energy × site → InflictSpec`
 * value-object. Asserts: a mechanical channel yields an
 * `EnergyInflictSpec`; site selection is first-match over the mover's
 * anatomy (a non-matching selector → null, the graceful no-op); the
 * `shock` channel yields a `ShockInflictSpec` with the energy read as
 * amperes; `range` defaults to `'contact'`, round-trips, and now accepts
 * `'ranged'` — the seam the trap build reserved for the ranged one.
 * Deterministic — no RNG.
 */

import "../../../../test-bootstrap";
import { describe, it, expect } from 'vitest';
import { HazardDelivery } from '../HazardDelivery';
import { Creature } from '../../creature/Creature';
import Species from '../../../platform/idea/species/Species';
import BodyPlan from '../../../platform/idea/species/BodyPlan';
import {
  makeStuff,
  stampTemplatePathForTest,
} from '../../security/__tests__/test-setup';

let n = 0;

/** A biped with two feet — the site-selection subject. */
function footedBodyPlan(path: string): BodyPlan {
  const plan = makeStuff(() => new BodyPlan());
  plan.setName('demo-biped');
  plan.setBodyParts([
    { key: 'body.torso', parent: null, tissues: [] },
    { key: 'body.leg.left', parent: 'body.torso', tissues: [] },
    { key: 'body.leg.left.foot', parent: 'body.leg.left', tissues: [] },
    { key: 'body.leg.right', parent: 'body.torso', tissues: [] },
    { key: 'body.leg.right.foot', parent: 'body.leg.right', tissues: [] },
  ]);
  stampTemplatePathForTest(plan, path);
  return plan;
}

function mover(): Creature {
  n++; // a fresh identity per mover so stamped singleton paths never collide
  const c = makeStuff(() => new Creature());
  const species = makeStuff(() => new Species());
  species.setBodyPlan(footedBodyPlan(`/stuff/idea/species/BodyPlan/hazard-biped-${n}`));
  stampTemplatePathForTest(species, `/stuff/idea/species/hazard/biped-${n}`);
  c.setSpecies(species);
  stampTemplatePathForTest(c, `/obj/test/hazard-mover-${n}`);
  return c;
}

const FEET = ['body.leg.left.foot', 'body.leg.right.foot'];

describe('HazardDelivery — mechanical channel', () => {
  it('an edge delivery yields an EnergyInflictSpec at the first matching site', () => {
    const d = new HazardDelivery({ channel: 'edge', energy: 3, siteSelector: FEET });
    const spec = d.toInflictSpec(mover());
    expect(spec).not.toBeNull();
    expect(spec!.mechanism).toBe('edge');
    expect(spec!.site).toBe('body.leg.left.foot');
    expect((spec as { energy: number }).energy).toBe(3);
  });

  it('picks the first selector entry the mover actually has', () => {
    // A left-foot-less selector still lands on the right foot.
    const d = new HazardDelivery({
      channel: 'point',
      energy: 5,
      siteSelector: ['body.wing', 'body.leg.right.foot'],
    });
    expect(d.resolveSite(mover())).toBe('body.leg.right.foot');
  });

  it('returns null (no wound) when no selector site matches the anatomy', () => {
    const d = new HazardDelivery({
      channel: 'edge',
      energy: 3,
      siteSelector: ['body.wing', 'body.tail'],
    });
    expect(d.resolveSite(mover())).toBeNull();
    expect(d.toInflictSpec(mover())).toBeNull();
  });
});

describe('HazardDelivery — shock channel', () => {
  it('yields a ShockInflictSpec with the energy read as amperes', () => {
    const d = new HazardDelivery({ channel: 'shock', energy: 0.12, siteSelector: FEET });
    const spec = d.toInflictSpec(mover());
    expect(spec).not.toBeNull();
    expect(spec!.mechanism).toBe('shock');
    const current = (spec as { current: { rawValue(): number; unit: string } }).current;
    expect(current.rawValue()).toBeCloseTo(0.12);
    expect(current.unit).toBe('A');
  });
});

describe('HazardDelivery — the reserved range seam + toxin', () => {
  it('defaults range to contact and round-trips an explicit one', () => {
    expect(new HazardDelivery({ channel: 'edge', energy: 1, siteSelector: FEET }).range).toBe('contact');
    expect(
      new HazardDelivery({ channel: 'edge', energy: 1, siteSelector: FEET, range: 'contact' }).range,
    ).toBe('contact');
  });

  it('carries an optional toxin dose', () => {
    const plain = new HazardDelivery({ channel: 'point', energy: 2, siteSelector: FEET });
    expect(plain.hasToxin()).toBe(false);
    const poisoned = new HazardDelivery({
      channel: 'point',
      energy: 2,
      siteSelector: FEET,
      toxin: { type: 'venom', amount: 5 },
    });
    expect(poisoned.hasToxin()).toBe(true);
    expect(poisoned.getToxin()).toEqual({ type: 'venom', amount: 5 });
  });

  it('normalizes a plain authored object via from() and round-trips toJSON', () => {
    const opts = { channel: 'blunt' as const, energy: 4, siteSelector: FEET, range: 'contact' as const };
    const d = HazardDelivery.from(opts);
    expect(d).toBeInstanceOf(HazardDelivery);
    expect(HazardDelivery.from(d)).toBe(d); // an instance passes through
    expect(d.toJSON().channel).toBe('blunt');
    expect(d.toJSON().energy).toBe(4);
  });
});

describe('HazardDelivery — the ranged seam (P7)', () => {
  it("accepts 'ranged' and reports it", () => {
    const d = new HazardDelivery({
      channel: 'heat',
      energy: 40,
      siteSelector: ['body.torso'],
      range: 'ranged',
    });
    expect(d.range).toBe('ranged');
    expect(d.isRanged()).toBe(true);
  });

  it("still defaults to 'contact', which is not ranged", () => {
    const d = new HazardDelivery({
      channel: 'edge',
      energy: 10,
      siteSelector: ['body.torso'],
    });
    expect(d.range).toBe('contact');
    expect(d.isRanged()).toBe(false);
  });

  it("round-trips 'ranged' through serialization", () => {
    const d = new HazardDelivery({
      channel: 'heat',
      energy: 40,
      siteSelector: ['body.torso'],
      range: 'ranged',
    });
    const again = HazardDelivery.from(d.toJSON());
    expect(again.range).toBe('ranged');
    expect(again.isRanged()).toBe(true);
  });
});
