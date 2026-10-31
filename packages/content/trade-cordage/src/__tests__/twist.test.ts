/**
 * ⭐⭐ `twist` at the walk (cordage W3): yarn makes a strand, three strands a
 * rope — the stage is what you twist; more yarns make a thicker, stronger
 * rope; nothing is laid longer than the walk, and the refusal says why; the
 * rogue's yarn laid in a strand is in the rope, read by `analyze lay` and
 * not by `look` until the rope is cut.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import RopeJack from '../thing/RopeJack';
import TextileStock from '@saxonberg/content-trade-textiles/src/thing/TextileStock';
import Rope from '@saxonberg/server/mud/platform/thing/Rope';
import Location from '@saxonberg/server/mud/platform/location/Location';
import Material from '@saxonberg/server/mud/platform/idea/material/Material';
import { Character } from '@saxonberg/server/mud/lib/character/Character';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { ActPlan } from '@saxonberg/server/mud/lib/craft/ActPlan';
import { Grade } from '@saxonberg/server/mud/lib/craft/Grade';
import { makeStuff, makeStuffAtPath, seedKernelContentStore } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '@saxonberg/server/mud/lib/persistence/__tests__/quantity-marshaller-test-helpers';

class Body extends Character {}

let hemp: Material;

beforeEach(() => {
  StuffApi.clearAll();
  installV1QuantityMarshallers();
  seedKernelContentStore();
  hemp = makeStuffAtPath(() => new Material(), '/test/material/hemp-twist');
  hemp.setName('hemp');
  hemp.setToughness(Quantity.of(4, 'MJ/m³'));
  hemp.setDensity(Quantity.of(1480, 'kg/m³'));
  const realClone = StuffApi.clone.bind(StuffApi);
  vi.spyOn(StuffApi, 'clone').mockImplementation((async (path: string, ...rest: unknown[]) => {
    if (path === '/trade/cordage/thing/strand') {
      const s = makeStuff(() => new Rope());
      s.stage = 'strand';
      return s;
    }
    if (path === '/trade/cordage/thing/rope') return makeStuff(() => new Rope());
    return (realClone as (...a: unknown[]) => unknown)(path, ...rest);
  }) as unknown as typeof StuffApi.clone);
});

afterEach(() => {
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

function walk(extentM: number): { room: Location; jack: RopeJack; who: Body } {
  const room = makeStuffAtPath(() => new Location(), `/test/cordage/walk-${extentM}`);
  room.setExtent(extentM);
  const jack = makeStuff(() => new RopeJack());
  ContainmentApi.move(jack as never, room as never);
  const who = makeStuff(() => new Body());
  ContainmentApi.move(who as never, room as never);
  return { room, jack, who };
}

function yarn(who: Body, skeins: number): TextileStock {
  const y = makeStuff(() => new TextileStock());
  y.setMaterial(hemp);
  y.setMass(Quantity.of(0.4, 'kg'));
  y.setYarnCount(6);
  y.setQuantity(skeins);
  ContainmentApi.move(y as never, who as never);
  return y;
}

async function run(pending: ReturnType<RopeJack['twistPlan']>): Promise<ActPlan> {
  const plan = await pending;
  expect(plan.ok).toBe(true);
  await (plan as ActPlan).onComplete();
  return plan as ActPlan;
}

describe('twist at the walk (cordage D5)', () => {
  it('⭐ yarn makes a strand; three strands make a rope', async () => {
    const { jack, who } = walk(300);
    const y = yarn(who, 30);
    const actor = who as unknown as Stuff;
    for (let i = 0; i < 3; i++) {
      await run(jack.twistPlan(actor, [y as unknown as Stuff], { yarns: 40, length: '50', mark: i === 0 ? 'red' : null }));
    }
    const strands = who.getContents().filter((c): c is Rope => c instanceof Rope && c.getStage() === 'strand');
    expect(strands).toHaveLength(3);
    expect(strands.every((s) => s.getLengthM() === 50)).toBe(true);
    await run(jack.twistPlan(actor, strands as unknown as Stuff[], { yarns: null, length: null, mark: null }));
    const ropes = who.getContents().filter((c): c is Rope => c instanceof Rope);
    expect(ropes).toHaveLength(1);
    const rope = ropes[0]!;
    expect(rope.getStage()).toBe('rope');
    expect(rope.getLengthM()).toBe(50);
    expect(rope.getMarks()).toEqual(['red']);
    // The rogue's yarn is in the heart, not on the outside.
    expect(rope.describeRope().join(' ')).not.toMatch(/red/);
  });

  it('⭐ more yarns make a thicker strand, and a thicker rope holds more', async () => {
    const { jack, who } = walk(300);
    const y = yarn(who, 60);
    const actor = who as unknown as Stuff;
    await run(jack.twistPlan(actor, [y as unknown as Stuff], { yarns: 20, length: '20', mark: null }));
    await run(jack.twistPlan(actor, [y as unknown as Stuff], { yarns: 80, length: '20', mark: null }));
    const [thin, thick] = who.getContents().filter((c): c is Rope => c instanceof Rope);
    expect(thick!.getDiameterMm()).toBeCloseTo(thin!.getDiameterMm() * 2, 5);
    expect(thick!.breakingKg()).toBeCloseTo(thin!.breakingKg() * 4, 3);
  });

  it('⭐ nothing is laid longer than the walk, and the refusal says why', async () => {
    const { jack, who } = walk(300);
    const y = yarn(who, 30);
    const out = await jack.twistPlan(who as unknown as Stuff, [y as unknown as Stuff], { yarns: 40, length: '400 m', mark: null });
    expect(out).toMatchObject({ ok: false, reason: 'longer-than-walk' });
    expect(JSON.stringify(out)).toMatch(/The walk is 300 m long; a rope cannot be laid longer than it/);
  });

  it('too little yarn, or fewer than three strands, is refused in words', async () => {
    const { jack, who } = walk(300);
    const y = yarn(who, 1);
    const actor = who as unknown as Stuff;
    expect(await jack.twistPlan(actor, [y as unknown as Stuff], { yarns: 40, length: '300', mark: null })).toMatchObject({ ok: false, reason: 'not-enough-yarn' });
    await run(jack.twistPlan(actor, [y as unknown as Stuff], { yarns: 10, length: '10', mark: null }));
    const strand = who.getContents().find((c): c is Rope => c instanceof Rope)!;
    expect(await jack.twistPlan(actor, [strand as unknown as Stuff], { yarns: null, length: null, mark: null })).toMatchObject({ ok: false, reason: 'too-few-strands' });
  });

  it('⭐ a green hand lays unevenly: the rope keeps less and says so', async () => {
    const { jack, who } = walk(300);
    const y = yarn(who, 30);
    const actor = who as unknown as Stuff;
    for (let i = 0; i < 3; i++) await run(jack.twistPlan(actor, [y as unknown as Stuff], { yarns: 40, length: '20', mark: null }));
    const strands = who.getContents().filter((c): c is Rope => c instanceof Rope);
    await run(jack.twistPlan(actor, strands as unknown as Stuff[], { yarns: null, length: null, mark: null }));
    const rope = who.getContents().find((c): c is Rope => c instanceof Rope)!;
    expect(rope.getLayEvenness()).toBeCloseTo(0.8, 5);
    expect(rope.describeRope().join(' ')).toMatch(/hockles/);
    expect(rope.effectiveKg()).toBeCloseTo(rope.breakingKg() * 0.8, 3);
  });

  it('⭐ the weakest yarn sets the grade', async () => {
    const { jack, who } = walk(300);
    const y = yarn(who, 30);
    y.setGrade(Grade.of('poor'));
    await run(jack.twistPlan(who as unknown as Stuff, [y as unknown as Stuff], { yarns: 40, length: '20', mark: null }));
    const strand = who.getContents().find((c): c is Rope => c instanceof Rope)!;
    expect(strand.getGrade().getBand()).toBe('poor');
  });

  it('⭐ a hand at the wheel and the layer walks at full pace; alone, at half', async () => {
    const { room, jack, who } = walk(300);
    const y = yarn(who, 30);
    const actor = who as unknown as Stuff;
    const alone = await jack.twistPlan(actor, [y as unknown as Stuff], { yarns: 40, length: '20', mark: null });
    const mate = makeStuff(() => new Body());
    ContainmentApi.move(mate as never, room as never);
    jack._setWheelHand(mate as unknown as Stuff);
    const crewed = await jack.twistPlan(actor, [y as unknown as Stuff], { yarns: 40, length: '20', mark: null });
    expect((alone as ActPlan).durationMs).toBe((crewed as ActPlan).durationMs * 2);
    // Real work: twenty meters of a forty-yarn strand is a long while.
    expect((crewed as ActPlan).durationMs).toBeGreaterThanOrEqual(20 * 40_000);
  });
});
