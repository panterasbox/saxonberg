/**
 * CraftingLogic.repair — the deficit-priced reverse-craft: cost ∝
 * (1 − condition) (doubled broken), metal wants forge-grade heat, soft
 * goods a `mending` tool, stock drawn from the gather walk (stack
 * partial-debit / discrete donor within the 2× overshoot rule), and the
 * restore is ceiling-free — immediately reversing the wear producers
 * (`hasCapability`, the covering-stack read, the delivery scale all see
 * the restored condition).
 */

import "../../../../../test-bootstrap";
import { chargeHot } from '../../../../lib/fire/__tests__/burner-fuel';
import type { Burner } from '../../../../lib/fire/Burner';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CraftingApi } from '../../../../api/crafting';
import { StuffApi } from '../../../../api/stuff';
import { ContainmentApi } from '../../../../api/containment';
import { ExecutionContextApi } from '../../../../api/execution-context';
import { WorldClockApi } from '../../../../api/worldclock';
import { PersistenceManager } from '../../../../../backend/PersistenceManager';
import { Quantity } from '../../../../lib/quantity';
import Material from '../../../../lib/material/Material';
import Good from '../../../../lib/stuff/Good';
import Scrap from '../../../thing/Scrap';
import Forge from '../../../thing/Forge';
import Weapon from '../../../thing/equipment/Weapon';
import Garment from '../../../thing/equipment/Garment';
import { MaintainableMixin } from '../../../../lib/structure/Maintainable';
import Tool from '../../../thing/Tool';
import Wood from '../../material/Wood';
import { AssembledMixin } from '../../../../lib/craft/Assembled';
import { DurableMixin } from '../../../../lib/material/Durable';
import { BulkableMixin } from '../../../../lib/bulk/Bulkable';
import { ScheduleApi } from '../../../../api/schedule';
import { PerceptionApi } from '../../../../api/perception';
import RecipeCatalogue from '../../RecipeCatalogue';
import { Reserve } from '../../../../lib/reserve/Reserved';
import { Idea } from '../../../../lib/stuff/Idea';
import { ContainerMixin } from '../../../../lib/spatial/Container';
import { ThermalMixin } from '../../../../lib/thermal/Thermal';
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
class TestSmith extends ThermalMixin(ContainerMixin(ContainableMixin(Idea))) {
  static _mixinName = 'TestSmithRepair';
}
/** A cask: made of parts, durable, holds liquid (a Good, so Faced). */
class RefireCask extends AssembledMixin(DurableMixin(BulkableMixin(Good))) {
  static _mixinName = 'RepairTestRefireCask';
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
    // ⭐ A charge in the bed, not a percentage of nothing.
    chargeHot(f as unknown as Stuff & Burner, 40);
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
  it('prices the deficit: cost = mass × (1−condition) × costFactor, debited from a stack', async () => {
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
    const jerkin = makeStuff(() => new Garment());
    jerkin.setMaterial(mat(LEATHER));
    jerkin.setMass(Quantity.of(4, 'kg'));
    jerkin.setCondition(0.5);
    ContainmentApi.move(jerkin, room);
    const hide = makeStuff(() => new Good());
    hide.setMaterial(mat(LEATHER));
    hide.setMass(Quantity.of(2, 'kg'));
    ContainmentApi.move(hide, room);

    // Without the mending kit → missing-tool. The whetstone is NOT it.
    const bare = await repairAs(jerkin);
    expect(bare).toMatchObject({ ok: false, reason: 'missing-tool', detail: 'mending' });

    const kit = makeStuff(() => new Tool());
    kit.setCapabilities(['mending']);
    ContainmentApi.move(kit, room);
    const outcome = await repairAs(jerkin);
    expect(outcome.ok).toBe(true);
    // Need = 4 × 0.5 × 0.6 = 1.2 kg; the 2 kg hide is within 2× — consumed whole.
    expect(hide.isDestroyed()).toBe(true);
    expect(jerkin.getCondition()).toBe(1);
  });

  it('⭐ a cracked pot is RIVETED — sound in condition, a hidden dunt found, the staples show (ceramics)', async () => {
    const CLAY = '/stuff/idea/material/_test/rp-earthenware';
    registerMaterial(CLAY, 'earthenware', ['ceramic', 'fired', 'brittle']);
    const bowl = makeStuff(() => new Tool());
    bowl.setMaterial(mat(CLAY));
    bowl.setMass(Quantity.of(0.6, 'kg'));
    bowl.setLongDescription('A bowl.');
    bowl.addFlaw('dunt', false);
    ContainmentApi.move(bowl, room);

    // No kit: the crack is named and the cure with it.
    const bare = await repairAs(bowl);
    expect(bare).toMatchObject({ ok: false, reason: 'missing-tool', detail: 'mending' });

    const kit = makeStuff(() => new Tool());
    kit.setCapabilities(['mending']);
    ContainmentApi.move(kit, room);
    const outcome = await repairAs(bowl);
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.mended.map((x) => x.kind)).toEqual(['riveted']);
    expect(bowl.getFlaws()[0]).toMatchObject({ kind: 'dunt', visible: true, mended: 'riveted' });
    expect(bowl.getMarkupLong(bowl as never, {})).toMatch(/riveted across a crack/);
    // Riveted once is riveted: there is nothing more to mend.
    expect(await repairAs(bowl)).toMatchObject({ ok: false });
  });

  it('⭐⭐ a hole is PATCHED with stock of the hull\'s own material and its tool (matter-model-overlaps D8)', async () => {
    const OAK = '/stuff/idea/material/_test/rp-oak';
    registerMaterial(OAK, 'oak', ['wood', 'organic']);
    const hull = makeStuff(() => new Tool());
    hull.setMaterial(mat(OAK));
    hull.setMass(Quantity.of(120, 'kg'));
    hull.setLongDescription('A boat.');
    hull.addFlaw('holed', true);
    ContainmentApi.move(hull, room);
    const plank = makeStuff(() => new Good());
    plank.setMaterial(mat(OAK));
    plank.setMass(Quantity.of(3, 'kg'));
    ContainmentApi.move(plank, room);
    // No edge: the hole is named, and the cure with it.
    expect(await repairAs(hull)).toMatchObject({ ok: false, reason: 'missing-tool', detail: 'cutting' });
    const adze = makeStuff(() => new Tool());
    adze.setCapabilities(['cutting']);
    ContainmentApi.move(adze, room);
    const outcome = await repairAs(hull);
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.mended.map((x) => x.kind)).toEqual(['patched']);
    // `crafting.repair.patchKg` 2 kg of oak: the 3 kg plank is within 2×, consumed whole.
    expect(plank.isDestroyed()).toBe(true);
    expect(hull.getFlaws()[0]).toMatchObject({ kind: 'holed', mended: 'patched' });
    expect(hull.flawLeakLPerHour(0.25, 4.5)).toBe(0);
    expect(hull.getMarkupLong(hull as never, {})).toMatch(/hole in it has been patched/);
  });

  it('⛔ a hull that authors no material REFUSES the patch — never whatever is at hand (D8)', async () => {
    const hull = makeStuff(() => new Tool());
    hull.setMass(Quantity.of(120, 'kg'));
    hull.addFlaw('holed', true);
    ContainmentApi.move(hull, room);
    const kit = makeStuff(() => new Tool());
    kit.setCapabilities(['mending', 'cutting']);
    ContainmentApi.move(kit, room);
    expect(hull.patchMaterial()).toBeNull();
    expect(await repairAs(hull)).toMatchObject({ ok: false, reason: 'no-hull-material' });
  });

  it('⭐ a fabric kept by upkeep is never wear-mended by `repair` — that is `maintain`\'s (D8)', async () => {
    const LEATHER2 = mat(LEATHER);
    class Kept extends MaintainableMixin(Garment) {
      static _mixinName = 'RepairTestKept';
    }
    const roof = makeStuff(() => new Kept());
    roof.setMaterial(LEATHER2);
    roof.setMass(Quantity.of(4, 'kg'));
    roof.setCondition(0.5);
    ContainmentApi.move(roof, room);
    const kit = makeStuff(() => new Tool());
    kit.setCapabilities(['mending']);
    ContainmentApi.move(kit, room);
    const hide = makeStuff(() => new Good());
    hide.setMaterial(LEATHER2);
    hide.setMass(Quantity.of(2, 'kg'));
    ContainmentApi.move(hide, room);
    expect(await repairAs(roof)).toMatchObject({ ok: false, detail: 'nothing-to-repair' });
    expect(roof.getCondition()).toBe(0.5);
  });

  it('⭐⭐ a SPENT cask is re-fired at the repair\'s real completion — a scheduler root, the gate admits CraftingLogic (D11)', async () => {
    // The rung's `refireFace` is gated `FromModule(CraftingLogic)`; the repair
    // runs at the engagement's completion, a fresh scheduled root with no
    // command frame. This drives it through that root, not a test shim.
    ContainmentApi.move(makeHotForge(), room);
    for (const a of ['/base-library/aromas/oak', '/base-library/aromas/char']) {
      PerceptionApi.aromas().remember(a, { threshold: 1 }, null);
    }
    const oak = makeStuffAtPath(() => {
      const w = new Wood();
      w.setName('rp-oak');
      w.setTags(['wood']);
      w.setDensity(Quantity.of(750, 'kg/m³'));
      w.setWaterAbsorptionCapacity(Quantity.of(28, '%'));
      void w.setImparts([{ type: '/base-library/aromas/oak', amount: 15 }]);
      return w;
    }, '/stuff/idea/material/_test/rp-oak');
    const charred = makeStuffAtPath(() => {
      const w = new Wood();
      w.setName('rp-charred-oak');
      w.setTags(['wood', 'char']);
      w.setDensity(Quantity.of(750, 'kg/m³'));
      w.setWaterAbsorptionCapacity(Quantity.of(28, '%'));
      void w.setImparts([{ type: '/base-library/aromas/char', amount: 120 }]);
      return w;
    }, '/stuff/idea/material/_test/rp-charred-oak');
    const cask = makeStuff(() => new RefireCask());
    cask.setMaterial(oak);
    cask.setMass(Quantity.of(20, 'kg'));
    await cask.setBill({
      parts: [{ part: 'stave', template: '/x/thing/stave', count: 30, role: 'structural' }],
      refire: charred.getTemplatePath()!,
    });
    cask.recordAssembly(
      [{ part: 'stave', template: '/x/thing/stave', count: 30, plural: 'staves', role: 'structural',
        material: oak.getTemplatePath()!, grade: 'fair', condition: 1, failed: 0, makers: [] }],
      [],
    );
    await cask.setCoats({ inside: [{ material: charred.getTemplatePath()!, thicknessM: 0.002, state: 'set', spent: 1 }] });
    expect(cask.wallGiveLeft('inside')).toBe(0);
    ContainmentApi.move(cask, room);
    const shave = makeStuff(() => new Tool());
    shave.setCapabilities(['shaving']);
    ContainmentApi.move(shave, smith);

    const out = await new Promise<RepairOutcome>((resolve, reject) => {
      ScheduleApi.schedule(0, () => {
        ExecutionContextApi.tagActingAuthor(smith);
        CraftingApi.repair({ item: cask }).then(resolve, reject);
      });
    });
    expect(out.ok, JSON.stringify(out)).toBe(true);
    // Shaved back to clean wood and charred afresh: the give is whole again.
    expect(cask.wallGiveLeft('inside')).toBe(1);
    expect(cask.getCoats('inside')[0]?.material).toBe(charred.getTemplatePath());
  });

  it('a control-bearing mender floors the repaired grade; never lowers it', async () => {
    const machine = makeStuff(() => new Tool());
    machine.setCapabilities([{ kind: 'mending', rate: 3, control: 'fine' }]);
    ContainmentApi.move(machine, room);
    const hide = makeStuff(() => new Good());
    hide.setMaterial(mat(LEATHER));
    hide.setMass(Quantity.of(2, 'kg'));
    ContainmentApi.move(hide, room);

    // A shabby jerkin comes out floored at the machine's band.
    const jerkin = makeStuff(() => new Garment());
    jerkin.setMaterial(mat(LEATHER));
    jerkin.setMass(Quantity.of(4, 'kg'));
    jerkin.setCondition(0.5);
    graded(jerkin).setGradeBand('poor');
    ContainmentApi.move(jerkin, room);
    expect((await repairAs(jerkin)).ok).toBe(true);
    expect(graded(jerkin).getGradeBand()).toBe('fine');

    // A masterful piece is never lowered by a fine machine.
    const heirloom = makeStuff(() => new Garment());
    heirloom.setMaterial(mat(LEATHER));
    heirloom.setMass(Quantity.of(4, 'kg'));
    heirloom.setCondition(0.5);
    graded(heirloom).setGradeBand('masterful');
    ContainmentApi.move(heirloom, room);
    const hide2 = makeStuff(() => new Good());
    hide2.setMaterial(mat(LEATHER));
    hide2.setMass(Quantity.of(2, 'kg'));
    ContainmentApi.move(hide2, room);
    expect((await repairAs(heirloom)).ok).toBe(true);
    expect(graded(heirloom).getGradeBand()).toBe('masterful');
  });

  it('a plain (control-less) mender leaves the grade untouched', async () => {
    const kit = makeStuff(() => new Tool());
    kit.setCapabilities(['mending']);
    ContainmentApi.move(kit, room);
    const hide = makeStuff(() => new Good());
    hide.setMaterial(mat(LEATHER));
    hide.setMass(Quantity.of(2, 'kg'));
    ContainmentApi.move(hide, room);
    const jerkin = makeStuff(() => new Garment());
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
    const shaker = makeStuff(() => new Tool());
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
