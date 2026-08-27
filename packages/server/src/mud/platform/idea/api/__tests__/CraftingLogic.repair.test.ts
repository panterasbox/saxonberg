/**
 * CraftingLogic.repair — the deficit-priced reverse-craft: cost ∝
 * (1 − condition) (doubled broken), metal wants forge-grade heat, soft
 * goods a `mending` tool, stock drawn from the gather walk (glob
 * partial-debit / discrete donor within the 2× overshoot rule), and the
 * restore is ceiling-free — immediately reversing the wear producers
 * (`hasCapability`, the covering-stack read, the delivery scale all see
 * the restored condition).
 */

import "../../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CraftingApi } from '../../../../api/crafting';
import { StuffApi } from '../../../../api/stuff';
import { ContainmentApi } from '../../../../api/containment';
import { ExecutionContextApi } from '../../../../api/execution-context';
import { WorldClockApi } from '../../../../api/worldclock';
import { PersistenceManager } from '../../../../../backend/PersistenceManager';
import { Quantity } from '../../../../lib/quantity';
import Material from '../../../../lib/material/Material';
import Thing from '../../../../lib/stuff/Thing';
import Scrap from '../../../thing/Scrap';
import Forge from '../../../thing/Forge';
import Weapon from '../../../thing/equipment/Weapon';
import Armor from '../../../thing/equipment/Armor';
import ToolItem from '../../../thing/ToolItem';
import RecipeCatalogue from '../../RecipeCatalogue';
import { Reserve } from '../../../../lib/reserve';
import { Idea } from '../../../../lib/stuff/Idea';
import { ContainerMixin } from '../../../../lib/spatial/Container';
import { ContainableMixin } from '../../../../lib/spatial/Containable';
import { Stuff } from '../../../../lib/stuff/Stuff';
import type { RepairOutcome } from '../../../../api/crafting';
import {
  makeStuff,
  makeStuffAtPath,
} from '../../../../lib/security/__tests__/test-setup';

class TestRoom extends ContainerMixin(Idea) {
  static _mixinName = 'TestRoomRepair';
}
class TestSmith extends ContainerMixin(ContainableMixin(Idea)) {
  static _mixinName = 'TestSmithRepair';
}

const IRON = '/stuff/idea/material/_test/rp-iron';
const LEATHER = '/stuff/idea/material/_test/rp-leather';

let room: TestRoom;
let smith: TestSmith;

function registerMaterial(path: string, name: string, tags: string[]): Material {
  return makeStuffAtPath(() => {
    const m = new Material();
    m.setName(name);
    m.setTags(tags);
    return m;
  }, path) as unknown as Material;
}

function mat(path: string): Material {
  return StuffApi.findByTemplatePath<Material>(path) as unknown as Material;
}

function makeHotForge(): Forge {
  return makeStuff(() => {
    const f = new Forge();
    f.setBurnTemperatureK(1300); // ≥ the 900 K metal-repair gate
    f.setReserve(
      new Reserve(
        'fuel',
        Quantity.of(100, '%'),
        Quantity.of(100, '%'),
        'combustion',
        null,
      ),
    );
    return f;
  });
}

function makeIronScrap(units: number): Scrap {
  const s = makeStuff(() => new Scrap());
  s.setMass(Quantity.of(Scrap.UNIT_KG, 'kg'));
  s.setMaterial(mat(IRON));
  s.setQuantity(units);
  return s;
}

function makeKnife(condition: number): Weapon {
  const w = makeStuff(() => new Weapon());
  w.setMaterial(mat(IRON));
  w.setMass(Quantity.of(0.5, 'kg'));
  w.setCondition(condition);
  return w;
}

/** The graded face of a composed host (the mixin surface via cast). */
function graded(x: Stuff): { setGradeBand(b: string): void; getGradeBand(): string } {
  return x as unknown as { setGradeBand(b: string): void; getGradeBand(): string };
}

async function repairAs(item: Stuff): Promise<RepairOutcome> {
  return ExecutionContextApi.runRoot(null, 'test', () => {
    ExecutionContextApi.tagActingAuthor(smith);
    return CraftingApi.repair({ item });
  }) as unknown as Promise<RepairOutcome>;
}

beforeEach(async () => {
  StuffApi.clearAll();
  const pm = PersistenceManager.get();
  vi.spyOn(pm, 'isConnected').mockReturnValue(true);
  vi.spyOn(pm, 'find').mockImplementation(async () => [] as never);
  WorldClockApi._setNowProviderForTesting(() => 1000);
  registerMaterial(IRON, 'iron', ['metal', 'ferrous']);
  registerMaterial(LEATHER, 'leather', ['organic', 'leather', 'hide']);
  const catalogue = makeStuffAtPath(
    () => new RecipeCatalogue(),
    '/platform/idea/RecipeCatalogue',
  );
  await catalogue.warm();
  room = makeStuff(() => new TestRoom());
  smith = makeStuff(() => new TestSmith());
  ContainmentApi.move(smith, room);
});

afterEach(() => {
  vi.restoreAllMocks();
  WorldClockApi._resetForTesting();
});

describe('CraftingLogic.repair', () => {
  it('prices the deficit: cost = mass × (1−condition) × costFactor, debited from a glob', async () => {
    ContainmentApi.move(makeHotForge(), room);
    const scrap = makeIronScrap(10);
    ContainmentApi.move(scrap, room);
    const knife = makeKnife(0.5);
    ContainmentApi.move(knife, room);

    const outcome = await repairAs(knife);
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    // 0.5 kg × 0.5 deficit × 0.6 = 0.15 kg — 2 scrap units (0.1 each).
    expect(outcome.costKg).toBeCloseTo(0.15, 9);
    expect(outcome.conditionBefore).toBeCloseTo(0.5, 9);
    expect(knife.getCondition()).toBe(1); // ceiling-free
    expect(scrap.getQuantity()).toBe(8); // partial-mass debit
  });

  it('metal at a cold forge declines insufficient-heat', async () => {
    const scrap = makeIronScrap(10);
    ContainmentApi.move(scrap, room);
    const knife = makeKnife(0.5);
    ContainmentApi.move(knife, room);
    const outcome = await repairAs(knife);
    expect(outcome).toMatchObject({
      ok: false,
      reason: 'insufficient-heat',
      detail: '900',
    });
  });

  it('soft goods want a mending tool + same-tag stock (a whole donor within 2×)', async () => {
    const jerkin = makeStuff(() => new Armor());
    jerkin.setMaterial(mat(LEATHER));
    jerkin.setMass(Quantity.of(4, 'kg'));
    jerkin.setCondition(0.5);
    ContainmentApi.move(jerkin, room);
    const hide = makeStuff(() => new Thing());
    hide.setMaterial(mat(LEATHER));
    hide.setMass(Quantity.of(2, 'kg'));
    ContainmentApi.move(hide, room);

    // Without the mending kit → missing-tool. The whetstone is NOT it.
    const bare = await repairAs(jerkin);
    expect(bare).toMatchObject({ ok: false, reason: 'missing-tool', detail: 'mending' });

    const kit = makeStuff(() => new ToolItem());
    kit.setCapabilities(['mending']);
    ContainmentApi.move(kit, room);
    const outcome = await repairAs(jerkin);
    expect(outcome.ok).toBe(true);
    // Need = 4 × 0.5 × 0.6 = 1.2 kg; the 2 kg hide is within 2× — consumed whole.
    expect(hide.isDestroyed()).toBe(true);
    expect(jerkin.getCondition()).toBe(1);
  });

  it('a control-bearing mender floors the repaired grade; never lowers it', async () => {
    const machine = makeStuff(() => new ToolItem());
    machine.setCapabilities([{ kind: 'mending', rate: 3, control: 'fine' }]);
    ContainmentApi.move(machine, room);
    const hide = makeStuff(() => new Thing());
    hide.setMaterial(mat(LEATHER));
    hide.setMass(Quantity.of(2, 'kg'));
    ContainmentApi.move(hide, room);

    // A shabby jerkin comes out floored at the machine's band.
    const jerkin = makeStuff(() => new Armor());
    jerkin.setMaterial(mat(LEATHER));
    jerkin.setMass(Quantity.of(4, 'kg'));
    jerkin.setCondition(0.5);
    graded(jerkin).setGradeBand('poor');
    ContainmentApi.move(jerkin, room);
    expect((await repairAs(jerkin)).ok).toBe(true);
    expect(graded(jerkin).getGradeBand()).toBe('fine');

    // A masterful piece is never lowered by a fine machine.
    const heirloom = makeStuff(() => new Armor());
    heirloom.setMaterial(mat(LEATHER));
    heirloom.setMass(Quantity.of(4, 'kg'));
    heirloom.setCondition(0.5);
    graded(heirloom).setGradeBand('masterful');
    ContainmentApi.move(heirloom, room);
    const hide2 = makeStuff(() => new Thing());
    hide2.setMaterial(mat(LEATHER));
    hide2.setMass(Quantity.of(2, 'kg'));
    ContainmentApi.move(hide2, room);
    expect((await repairAs(heirloom)).ok).toBe(true);
    expect(graded(heirloom).getGradeBand()).toBe('masterful');
  });

  it('a plain (control-less) mender leaves the grade untouched', async () => {
    const kit = makeStuff(() => new ToolItem());
    kit.setCapabilities(['mending']);
    ContainmentApi.move(kit, room);
    const hide = makeStuff(() => new Thing());
    hide.setMaterial(mat(LEATHER));
    hide.setMass(Quantity.of(2, 'kg'));
    ContainmentApi.move(hide, room);
    const jerkin = makeStuff(() => new Armor());
    jerkin.setMaterial(mat(LEATHER));
    jerkin.setMass(Quantity.of(4, 'kg'));
    jerkin.setCondition(0.5);
    graded(jerkin).setGradeBand('poor');
    ContainmentApi.move(jerkin, room);
    expect((await repairAs(jerkin)).ok).toBe(true);
    expect(graded(jerkin).getGradeBand()).toBe('poor');
  });

  it('broken doubles the material term', async () => {
    ContainmentApi.move(makeHotForge(), room);
    const scrap = makeIronScrap(10);
    ContainmentApi.move(scrap, room);
    const wreck = makeKnife(0.05); // broken (≤ 0.1)
    ContainmentApi.move(wreck, room);

    const outcome = await repairAs(wreck);
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    // 0.5 × 0.95 × 0.6 × 2 = 0.57 kg → 6 units.
    expect(outcome.costKg).toBeCloseTo(0.57, 9);
    expect(scrap.getQuantity()).toBe(4);
    expect(wreck.getCondition()).toBe(1);
    expect(wreck.isBroken()).toBe(false);
  });

  it('declines insufficient-input when the stock cannot cover the need', async () => {
    ContainmentApi.move(makeHotForge(), room);
    ContainmentApi.move(makeIronScrap(1), room); // 0.1 kg < the 0.15 need
    const knife = makeKnife(0.5);
    ContainmentApi.move(knife, room);
    const outcome = await repairAs(knife);
    expect(outcome).toMatchObject({
      ok: false,
      reason: 'insufficient-input',
      detail: 'metal',
    });
    expect(knife.getCondition()).toBeCloseTo(0.5, 9); // nothing consumed/moved
  });

  it('the restored condition immediately reverses the wear producers', async () => {
    ContainmentApi.move(makeHotForge(), room);
    ContainmentApi.move(makeIronScrap(10), room);
    const shaker = makeStuff(() => new ToolItem());
    shaker.setCapabilities(['shaker']);
    shaker.setMaterial(mat(IRON));
    shaker.setMass(Quantity.of(0.3, 'kg'));
    shaker.setCondition(0.05); // broken — offers nothing
    ContainmentApi.move(shaker, room);
    expect(shaker.hasCapability('shaker')).toBe(false);

    const outcome = await repairAs(shaker);
    expect(outcome.ok).toBe(true);
    expect(shaker.hasCapability('shaker')).toBe(true); // capability restored
  });
});
