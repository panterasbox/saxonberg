/**
 * ⭐ The wheel (dairy D9, D10): it ripens by its own temperature, it divides
 * with an EDGE (the kernel's `Splittable` shape), a wedge is the wheel
 * smaller, and the taste names the milk it was made from.
 */
import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Wheel from '../thing/Wheel';
import Provision from '@saxonberg/server/mud/platform/thing/Provision';
import Good from '@saxonberg/server/mud/lib/stuff/Good';
import { Idea } from '@saxonberg/server/mud/lib/stuff/Idea';
import { ContainerMixin } from '@saxonberg/server/mud/lib/spatial/Container';
import { ToolMixin } from '@saxonberg/server/mud/lib/craft/Tooled';
import { ConstructedMixin } from '@saxonberg/server/mud/lib/material/Constructed';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { Grade } from '@saxonberg/server/mud/lib/craft/Grade';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import { makeStuff } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import type Material from '@saxonberg/server/mud/lib/material/Material';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Tooled } from '@saxonberg/server/mud/lib/craft/Tooled';
import { MAT } from './rows';
import { standUp, tearDown, at, DAY } from './world';

class TestRoom extends ContainerMixin(Idea) {
  static _mixinName = 'DairyWheelTestRoom';
}
class TestTool extends ToolMixin(ConstructedMixin(Good)) {
  static _mixinName = 'DairyWheelTestTool';
}

const mat = (p: string): Material => StuffApi.findByTemplatePath<Material>(p)!;

function tool(form: string): Stuff & Tooled {
  const t = makeStuff(() => new TestTool());
  t.setConstructionForm(form);
  return t as unknown as Stuff & Tooled;
}

function wheel(materialPath: string): { wheel: Wheel; room: TestRoom } {
  const room = makeStuff(() => new TestRoom());
  const w = makeStuff(() => new Wheel());
  w.setGrade(Grade.of('fine')); // the band the hoop stamped, while idle
  w.setMaterial(mat(materialPath));
  w.setMass(Quantity.of(4, 'kg'));
  w.setMadeFrom(MAT.eweMilk);
  w.setStampedTemperatureK(284);
  w.setLastAmbientK(284);
  ContainmentApi.move(w, room);
  return { wheel: w, room };
}

describe('the wheel', () => {
  beforeEach(async () => {
    await standUp();
    vi.spyOn(StuffApi, 'clone').mockImplementation((async () =>
      makeStuff(() => new Provision())) as unknown as typeof StuffApi.clone);
  });
  afterEach(tearDown);

  it('a hard wheel ripens over a season, young first', () => {
    at(0);
    const { wheel: w } = wheel(MAT.hardCheese);
    expect(w.getRipeningPhase()).toBe('active');
    expect(w.getRipeningProfile()?.getKey()).toBe('hard-cheese');
    at(5 * DAY);
    expect(w.ripenessLine()).toMatch(/young/);
    at(40 * DAY);
    const mid = w.getRipeness();
    expect(mid).toBeGreaterThan(0.3);
    expect(w.ripenessLine()).toMatch(/coming on/);
    at(70 * DAY);
    expect(w.getRipeningPhase()).toBe('finished');
    expect(w.holdsSpoilage()).toBe(false);
  });

  it('it splits with an edge, and refuses without one', async () => {
    at(0);
    const { wheel: w } = wheel(MAT.hardCheese);
    const none = await w.planWork(w, null, null);
    expect(none.kind === 'refusal' && none.reason).toBe('no-edge');
    const blunt = await w.planWork(w, tool('hafted'), null);
    expect(blunt.kind === 'refusal' && blunt.reason).toBe('no-edge');
    const knife = await w.planWork(w, tool('bladed'), null);
    expect(knife.kind).toBe('plan');
  });

  it('a wedge is the wheel, smaller', async () => {
    at(0);
    const { wheel: w, room } = wheel(MAT.hardCheese);
    const res = await w.completeWork(w, tool('bladed'), null);
    expect(res.credit?.discipline).toBe('dairying');
    expect(w.getWedgesLeft()).toBe(7);
    expect(w.getMass().rawValue()).toBeCloseTo(3.5, 6);
    const wedge = room
      .getContents()
      .find((c) => c instanceof Provision && !(c instanceof Wheel)) as unknown as Provision;
    expect(wedge).toBeTruthy();
    expect(wedge.getMaterial()?.getTemplatePath()).toBe(MAT.hardCheese);
    expect(wedge.getMass().rawValue()).toBeCloseTo(0.5, 6);
    expect(wedge.getGradeBand()).toBe(w.getGradeBand());
  });

  it('the last wedge takes the wheel with it', async () => {
    at(0);
    const { wheel: w, room } = wheel(MAT.hardCheese);
    w.setWedgesPerWheel(1);
    const res = await w.completeWork(w, tool('bladed'), null);
    expect(res.self).toMatch(/last wedge/);
    expect(room.getContents().some((c) => c instanceof Wheel)).toBe(false);
    expect(room.getContents().some((c) => c instanceof Provision)).toBe(true);
  });

  it('the taste names the milk; a look does not', () => {
    at(0);
    const { wheel: w } = wheel(MAT.hardCheese);
    const aug = (Wheel as unknown as {
      markupAugmenters: Array<(t: string, h: Stuff, v: Stuff, o?: { filter?: string[] }) => string>;
    }).markupAugmenters[0]!;
    expect(aug('', w, w, { filter: ['taste'] })).toMatch(/made from ewe's milk/);
    expect(aug('', w, w)).toBe('');
    expect(aug('', w, w, { filter: ['smell'] })).toBe('');
  });
});
