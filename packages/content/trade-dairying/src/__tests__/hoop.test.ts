/**
 * ⭐ The cheese hoop is a MOULD (dairy D9): curd poured into it sets in its
 * shape by draining, faster and drier under a press stone, and the wheel
 * stays IN the hoop until it is taken out. One wheel row; the set stamps
 * what the curd became and what the milk was.
 */
import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Hoop from '../thing/Hoop';
import Wheel from '../thing/Wheel';
import Good from '@saxonberg/server/mud/lib/stuff/Good';
import { Idea } from '@saxonberg/server/mud/lib/stuff/Idea';
import { ContainerMixin } from '@saxonberg/server/mud/lib/spatial/Container';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import { makeStuff } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import type Material from '@saxonberg/server/mud/lib/material/Material';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import { MAT, readRow } from './rows';
import { standUp, tearDown, at, vessel, DAY } from './world';

class TestRoom extends ContainerMixin(Idea) {
  static _mixinName = 'DairyHoopTestRoom';
}

const WHEEL_ROW = '/trade/dairying/thing/wheel';
const mat = (p: string): Material => StuffApi.findByTemplatePath<Material>(p)!;

let cloned: string[] = [];

/** The hoop as its row authors it, standing in a room, filled with curd. */
function hoop(curdPath: string, litres: number): { hoop: Hoop; room: TestRoom } {
  const d = readRow('/trade/dairying/thing/hoop').data as Record<string, unknown>;
  const room = makeStuff(() => new TestRoom());
  const h = vessel(() => new Hoop(), Number(d.interiorCapacity), 288, {
    material: mat(curdPath),
    litres,
  });
  h.setCastTemplate(String(d.castTemplate));
  h.setDiscipline(String(d.discipline));
  h.setBulkPayload('interior', {
    ...(h.getBulkPayload('interior') ?? {}),
    madeFrom: MAT.eweMilk,
    maker: '/platform/agent/Avatar/cheesemaker',
  });
  ContainmentApi.move(h, room);
  h.reconcileSetting(); // the set's clock starts at the fill
  return { hoop: h, room };
}

function weigh(on: Hoop, room: TestRoom, kg: number): void {
  const stone = makeStuff(() => new Good());
  stone.setMass(Quantity.of(kg, 'kg'));
  ContainmentApi.move(stone, room);
  ContainmentApi.place(stone, 'on', on);
}

async function settle(): Promise<void> {
  for (let i = 0; i < 5; i++) await new Promise((r) => setTimeout(r, 0));
}

function wheelIn(h: Hoop): Wheel | null {
  const found = h.getContents().find((c) => c instanceof Wheel);
  return (found as unknown as Wheel) ?? null;
}

/** ⚠ Read raw — the biome read behind `getWaterState` has no air in a unit room. */
const moisture = (w: Wheel): number => (w as unknown as { _moisture: number })._moisture;

describe('the cheese hoop', () => {
  beforeEach(async () => {
    await standUp();
    cloned = [];
    vi.spyOn(StuffApi, 'clone').mockImplementation((async (path: string) => {
      cloned.push(path);
      // The wheel row authors a placeholder material the set overwrites.
      const w = makeStuff(() => new Wheel());
      w.setMaterial(mat(MAT.softCheese));
      return w;
    }) as unknown as typeof StuffApi.clone);
  });
  afterEach(tearDown);

  it('pressed firm curd sets in a quarter-day into a dry hard wheel IN the hoop', async () => {
    at(0);
    const { hoop: h, room } = hoop(MAT.firmCurd, 2);
    weigh(h, room, 12);
    expect(h.loadKg()).toBeCloseTo(12, 6);
    at(0.2 * DAY);
    h.getContents();
    await settle();
    expect(wheelIn(h)).toBeNull();
    expect(h.setState()).toBe('setting');
    at(0.26 * DAY);
    h.getContents();
    await settle();
    expect(cloned).toEqual([WHEEL_ROW]);
    const w = wheelIn(h)!;
    expect(w).not.toBeNull();
    expect(w.getMaterial()?.getTemplatePath()).toBe(MAT.hardCheese);
    expect(moisture(w)).toBeCloseTo(0.55, 2);
    expect(w.getMadeFrom()).toBe(MAT.eweMilk);
    expect(w.getMaker()).toBe('/platform/agent/Avatar/cheesemaker');
    // 2 L of curd at 1030 kg/m³, less the water the press drove out.
    expect(w.getMass().rawValue()).toBeCloseTo(2.06 * (1 - 0.45 * 0.7), 2);
    expect(h.setState()).toBe('set');
    expect(h.getCondition()).toBeCloseTo(0.99, 6);
  });

  it('soft curd left unweighted takes the whole half-day and stays wet', async () => {
    at(0);
    const { hoop: h } = hoop(MAT.softCurd, 2);
    at(0.3 * DAY);
    h.getContents();
    await settle();
    expect(wheelIn(h)).toBeNull();
    at(0.51 * DAY);
    h.getContents();
    await settle();
    const w = wheelIn(h)!;
    expect(w.getMaterial()?.getTemplatePath()).toBe(MAT.softCheese);
    expect(moisture(w)).toBeCloseTo(0.9, 2);
  });

  it('the fill decides the size', async () => {
    at(0);
    const big = hoop(MAT.firmCurd, 2);
    const small = hoop(MAT.firmCurd, 1);
    at(0.51 * DAY);
    big.hoop.getContents();
    small.hoop.getContents();
    await settle();
    const ratio =
      wheelIn(small.hoop)!.getMass().rawValue() / wheelIn(big.hoop)!.getMass().rawValue();
    expect(ratio).toBeCloseTo(0.5, 3);
  });

  it('the wheel comes out of the hoop', async () => {
    at(0);
    const { hoop: h, room } = hoop(MAT.firmCurd, 1);
    at(0.51 * DAY);
    h.getContents();
    await settle();
    const w = wheelIn(h)!;
    ContainmentApi.move(w, room);
    expect(wheelIn(h)).toBeNull();
    expect((w as unknown as Stuff & { getContainer(): Stuff | null }).getContainer()).toBe(room);
  });
});
