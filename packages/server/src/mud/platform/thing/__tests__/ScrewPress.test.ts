/**
 * ⭐ The screw press (ceramics S16, D25): one LOAD, from a weight or a screw.
 *
 *   - a hoop on the press bed is loaded by the screw (`Mould.loadN`), and a
 *     cheese pressed far past a stone's reach comes out firmer;
 *   - a tile mould charged with clay is pressed the turn the screw beats
 *     the clay's stiffness, and the tile — holding its own shape — comes
 *     straight out (shape-and-release);
 *   - `turn back` slackens it.
 */
import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Good from '../../../lib/stuff/Good';
import Material from '../../../lib/material/Material';
import ScrewPress from '../ScrewPress';
import { MouldMixin } from '../../../lib/mould/Mould';
import { DurableMixin } from '../../../lib/material/Durable';
import { CraftedMixin } from '../../../lib/craft/Crafted';
import { ThermalMixin } from '../../../lib/thermal/Thermal';
import { BulkableMixin } from '../../../lib/bulk/Bulkable';
import { ContainerMixin } from '../../../lib/spatial/Container';
import { PlacingMixin } from '../../../lib/spatial/Placing';
import { WaterActivityMixin } from '../../../lib/material/WaterActivity';
import { CompositionMixin } from '../../../lib/material/Composition';
import { Quantity } from '../../../lib/quantity';
import { StuffApi } from '../../../api/stuff';
import { ContainmentApi } from '../../../api/containment';
import { WorldClockApi } from '../../../api/worldclock';
import { BiomeApi } from '../../../api/biome';
import { makeStuff, makeStuffAtPath, stampTemplatePathForTest } from '../../../lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../../lib/persistence/__tests__/quantity-marshaller-test-helpers';
import '../../idea/WorldClockRegistry';

class TestHoop extends PlacingMixin(
  MouldMixin(DurableMixin(CraftedMixin(ThermalMixin(BulkableMixin(ContainerMixin(Good)))))),
) {
  static _mixinName = 'TestPressHoop';
}
class TestRoom extends ContainerMixin(Good) {
  static _mixinName = 'TestPressRoom';
}
class TestClay extends CompositionMixin(WaterActivityMixin(Good)) {
  static _mixinName = 'TestPressClay';
}
class TestTile extends WaterActivityMixin(Good) {
  static _mixinName = 'TestPressTile';
}

const CURD = '/stuff/idea/material/_press/curd';
const CHEESE = '/stuff/idea/material/_press/cheese';
const CLAY = '/stuff/idea/material/_press/clay';
const WHEEL = '/stuff/thing/_press/wheel';
const TILE = '/stuff/thing/_press/tile';

let now = 1_000_000;
const setNow = (s: number): void => {
  now = 1_000_000 + s;
};

function material(path: string, setup: (m: Material) => void): Material {
  const found = StuffApi.findByTemplatePath<Material>(path);
  if (found) return found;
  return makeStuffAtPath(() => {
    const m = new Material();
    m.setName(path.split('/').pop()!);
    m.setDensity(Quantity.of(1000, 'kg/m³'));
    m.setSpecificHeat(Quantity.of(4186, 'J/(kg·K)'));
    setup(m);
    return m;
  }, path) as unknown as Material;
}

function mats(): void {
  material(CHEESE, () => {});
  material(CURD, (m) => {
    m.setNutrientAmounts({ fat: 60000, protein: 60000, water: 800000 });
    m.setDrainSetting({ days: 0.5, becomes: CHEESE, moisture: { unloaded: 0.8, loaded: 0.55 }, loadRef: 2 });
  });
  material(CLAY, (m) => m.setDensity(Quantity.of(1800, 'kg/m³')));
}

function hoopWithCurd(litres: number): TestHoop {
  const h = makeStuff(() => new TestHoop());
  h.setCastTemplate(WHEEL);
  const b = h as unknown as {
    interiorBulk: boolean;
    setInteriorCapacity(q: Quantity<'L'>): void;
    setBulkMaterial(a: 'interior', m: Material): void;
    setBulkAmount(a: 'interior', q: Quantity<'L'>): void;
    setStampedTemperatureK(k: number): void;
    setLastAmbientK(k: number): void;
  };
  b.interiorBulk = true;
  b.setInteriorCapacity(Quantity.of(4, 'L'));
  b.setBulkMaterial('interior', StuffApi.findByTemplatePath<Material>(CURD)!);
  b.setBulkAmount('interior', Quantity.of(litres, 'L'));
  b.setStampedTemperatureK(290);
  b.setLastAmbientK(290);
  return h;
}

function press(perTurn: number): ScrewPress {
  const p = makeStuff(() => new ScrewPress());
  p.setNewtonsPerTurn(perTurn);
  p.setMaxTurns(8);
  return p;
}

async function settle(): Promise<void> {
  for (let i = 0; i < 5; i++) await new Promise((r) => setTimeout(r, 0));
}

function moistureOf(s: unknown): number {
  return (s as { _moisture: number })._moisture;
}

describe('the screw press (ceramics S16)', () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    WorldClockApi._resetForTesting();
    setNow(0);
    WorldClockApi._setNowProviderForTesting(() => now);
    WorldClockApi.setScale(1000);
    mats();
    // A bare unit room has no biome: the clay's water reads against 50 %.
    vi.spyOn(BiomeApi, 'localHumidityFor').mockReturnValue(50 as never);
    vi.spyOn(StuffApi, 'clone').mockImplementation((async (path: string) => {
      const c = path === TILE ? makeStuff(() => new TestTile()) : makeStuff(() => new TestTile());
      stampTemplatePathForTest(c, path);
      return c;
    }) as unknown as typeof StuffApi.clone);
  });
  afterEach(() => {
    vi.restoreAllMocks();
    WorldClockApi._resetForTesting();
  });

  it('⭐ a hoop on the bed is loaded by the screw, and the cheese comes out firmer than a stone made it', async () => {
    const actor = makeStuff(() => new TestRoom());
    const room = makeStuff(() => new TestRoom());
    // The stone: a weight of the reference load exactly — `moisture.loaded`.
    const stoned = hoopWithCurd(2);
    ContainmentApi.move(stoned, room);
    const stone = makeStuff(() => new Good());
    stone.setMass(Quantity.of(2 * 2.06 * 0.995, 'kg'));
    ContainmentApi.move(stone, room);
    ContainmentApi.move(stone, stoned, 'on');

    const pressed = hoopWithCurd(2);
    const p = press(400);
    ContainmentApi.move(p, room);
    ContainmentApi.move(pressed, room);
    ContainmentApi.move(pressed, p, 'on');
    for (let i = 0; i < 6; i++) await p.turnBy(actor, false);
    expect(pressed.loadN()).toBeCloseTo(6 * 400, 6);

    stoned.reconcileSetting();
    pressed.reconcileSetting();
    setNow(0.26 * 86_400);
    stoned.getContents();
    pressed.getContents();
    await settle();
    const fromStone = stoned.getContents()[0];
    const fromPress = pressed.getContents()[0];
    expect(fromStone).toBeDefined();
    expect(fromPress).toBeDefined();
    expect(moistureOf(fromStone)).toBeCloseTo(0.55, 2);
    expect(moistureOf(fromPress)).toBeLessThan(moistureOf(fromStone) - 0.05);
  });

  it('⭐ a tile charge releases the turn the screw beats its stiffness — and comes out of the mould', async () => {
    const actor = makeStuff(() => new TestRoom());
    const room = makeStuff(() => new TestRoom());
    const mould = makeStuff(() => new TestHoop());
    mould.setCastTemplate(TILE);
    mould.setPressKind('press');
    const b = mould as unknown as { interiorBulk: boolean; setInteriorCapacity(q: Quantity<'L'>): void };
    b.interiorBulk = true;
    b.setInteriorCapacity(Quantity.of(0.8, 'L'));
    const p = press(1500);
    ContainmentApi.move(p, room);
    ContainmentApi.move(mould, room);
    ContainmentApi.move(mould, p, 'on');
    const clay = makeStuff(() => new TestClay());
    clay.setMaterial(StuffApi.findByTemplatePath<Material>(CLAY)!);
    clay.setMass(Quantity.of(1.4, 'kg'));
    clay.setWaterState({ moisture: 0.25, solute: 0 });
    ContainmentApi.move(clay, mould);

    // One turn: 1500 N against 1.4 kg × 2000 × 0.75² ≈ 1575 N — not yet.
    const first = await p.turnBy(actor, false);
    expect(first.ok).toBe(true);
    expect(clay.isDestroyed()).toBe(false);
    // Two: it goes.
    await p.turnBy(actor, false);
    await settle();
    expect(clay.isDestroyed()).toBe(true);
    const tile = room.getContents().find((c) => c.getTemplatePath() === TILE);
    expect(tile).toBeDefined();
    expect(mould.getContents()).toHaveLength(0);

    const back = await p.turnBy(actor, true);
    expect(back.ok).toBe(true);
    expect(p.pressForceN()).toBe(0);
  });
});
