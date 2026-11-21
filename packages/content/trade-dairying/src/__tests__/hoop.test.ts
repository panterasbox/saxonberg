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
import Place from '@saxonberg/server/mud/lib/stuff/Place';
import Floor from '@saxonberg/server/mud/platform/thing/Floor';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import { makeStuff, stampTemplatePathForTest } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import type Material from '@saxonberg/server/mud/lib/material/Material';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import { MAT, readRow } from './rows';
import { standUp, tearDown, vessel, DAY } from './world';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import { EventApi } from '@saxonberg/server/mud/api/event';
import EventRegistry from '@saxonberg/server/mud/platform/idea/EventRegistry';
import { Placements } from '@saxonberg/server/mud/lib/spatial/Placement';

class TestRoom extends Place {}

/** A room with a floor: a hoop on a bare board drains its whey onto it (D10). */
function floored(): TestRoom {
  const room = makeStuff(() => new TestRoom());
  const floor = makeStuff(() => new Floor());
  floor.surfaceBulk = true;
  floor.setSurfaceCapacity(Quantity.of(100, 'L'));
  room.addFixture(floor);
  return room;
}

const WHEEL_ROW = '/trade/dairying/thing/wheel';
const mat = (p: string): Material => StuffApi.findByTemplatePath<Material>(p)!;

let cloned: string[] = [];

/**
 * ⭐ The game clock, moved THROUGH the clock so the hoop's own wake fires
 * (crowded-rooms D8: a set finishes on its wake, never on a read). An
 * injected real clock at scale 1000 — one real ms is one game second.
 */
let realMs = 1_000_000;
let startS = 0;
function at(s: number): void {
  const target = startS + s;
  const by = target - WorldClockApi.getNow().rawValue();
  if (by > 0) WorldClockApi._advanceForTesting(by);
  realMs += Math.max(0, by);
}

/** The hoop as its row authors it, standing in a room, filled with curd. */
function hoop(curdPath: string, litres: number): { hoop: Hoop; room: TestRoom } {
  const d = readRow('/trade/dairying/thing/hoop').data as Record<string, unknown>;
  const room = floored();
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
  ContainmentApi.move(stone, on, Placements.ON);
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
    // The hoop's wake is a real clock schedule: drop the getNow spy and
    // drive the clock itself; a host-bound wake needs the event registry.
    vi.mocked(WorldClockApi.getNow).mockRestore();
    const events = await StuffApi.create(() => new EventRegistry());
    stampTemplatePathForTest(events, '/platform/idea/EventRegistry');
    EventApi._setRegistryForTesting(events);
    WorldClockApi._resetForTesting();
    realMs = 1_000_000;
    WorldClockApi._setNowProviderForTesting(() => realMs);
    WorldClockApi.setScale(1000);
    startS = WorldClockApi.getNow().rawValue();
    cloned = [];
    vi.spyOn(StuffApi, 'clone').mockImplementation((async (path: string) => {
      cloned.push(path);
      // The wheel row authors a placeholder material the set overwrites.
      const w = makeStuff(() => new Wheel());
      w.setMaterial(mat(MAT.softCheese));
      // A real clone carries its row's path, and `holdsCast` reads it.
      stampTemplatePathForTest(w, path);
      return w;
    }) as unknown as typeof StuffApi.clone);
  });
  afterEach(tearDown);

  it('pressed firm curd sets in a quarter-day into a dry hard wheel IN the hoop', async () => {
    at(0);
    const { hoop: h, room } = hoop(MAT.firmCurd, 2);
    weigh(h, room, 12);
    expect(h.loadN()).toBeCloseTo(12 * 9.81, 6);
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
    // ⭐ (ceramics W7) A load past the reference keeps firming the cheese,
    // as load^(−0.15): a 12 kg stone on a 2 L hoop is ~2.9× its reference,
    // so it presses a little drier than `moisture.loaded` (and a screw
    // press drier still).
    const r = 12 / (2.06 * 2);
    const m = 0.55 * Math.pow(r, -0.15);
    expect(moisture(w)).toBeCloseTo(m, 2);
    expect(w.getMadeFrom()).toBe(MAT.eweMilk);
    expect(w.getMaker()).toBe('/platform/agent/Avatar/cheesemaker');
    // 2 L of curd at 1030 kg/m³, less the water the press drove out.
    expect(w.getMass().rawValue()).toBeCloseTo(2.06 * (1 - (1 - m) * 0.7), 2);
    expect(h.setState()).toBe('set');
    expect(h.getCondition()).toBeCloseTo(0.99, 6);
    // ⭐ A hoop on a bare board drains its whey to the floor (the one drip,
    // matter-model-overlaps D10) — it no longer runs away to nowhere.
    const floor = room.getFloor() as unknown as Floor;
    expect(floor.getBulkMaterialPath('surface')).toBe(MAT.whey);
    expect(floor.getBulkAmount('surface').rawValue()).toBeGreaterThan(0);
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
