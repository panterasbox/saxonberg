/**
 * The crafting lifecycle, end to end — the requirements' acceptance run:
 * a player at the smithy lights the forge, `forge knife` (declined cold,
 * succeeds hot), reads the profile off the *chosen ingot's* material,
 * wears it down (the combat producers are exercised in
 * CombatLogic.gearwear.test; here the same wear surfaces are driven
 * directly), `sharpen`s (keenness only), `repair`s (condition only — the
 * two axes independently observable), and finally `salvage`s it into
 * less metal than the ingot that made it. Driven through the REAL verbs
 * (Forge/Sharpen/Repair/Salvage controllers) over the shared branch
 * harness.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import ForgeController from '../obj/command/crafting/ForgeController';
import SharpenController from '../obj/command/crafting/SharpenController';
import RepairController from '../obj/command/crafting/RepairController';
import SalvageController from '../obj/command/crafting/SalvageController';
import { SchedulerApi } from '../api/scheduler';
import { WorldClockApi } from '../api/worldclock';
import { StuffApi } from '../api/stuff';
import { ContainmentApi } from '../api/containment';
import { ExecutionContextApi } from '../api/execution-context';
import { MixinApi } from '../api/mixin';
import { RecipeKnowledge } from '../lib/script/RecipeKnowledge';
import { Quantity } from '../lib/quantity';
import Material from '../lib/material/Material';
import Ingot from '../obj/Ingot';
import Casting from '../obj/Casting';
import Scrap from '../obj/Scrap';
import Weapon from '../lib/equipment/Weapon';
import Whetstone from '../lib/craft/Whetstone';
import { Construction } from '../lib/material/Construction';
import type { Stuff } from '../lib/stuff/Stuff';
import type { CommandContext } from '../api/command';
import {
  TestActor,
  IRON,
  KNIFE_T,
  standUpBranchHarness,
  makeContext,
  ref,
  completeStep,
  makeLitForge,
  makeTool,
} from '../obj/command/crafting/__tests__/branch-fixtures';
import { makeStuff, makeStuffAtPath } from '../lib/security/__tests__/test-setup';

async function executeAs(
  who: Stuff,
  fn: () => void | Promise<void>,
): Promise<void> {
  await ExecutionContextApi.runRoot(null, 'test', async () => {
    ExecutionContextApi.tagActingAuthor(who);
    await fn();
  });
}

function rejected(ctx: CommandContext): boolean {
  return ctx.getNotes().some((n) => n.kind === 'controller-rejected');
}

let room: TestActor;
let smith: TestActor;

beforeEach(async () => {
  await standUpBranchHarness();
  // The lifecycle's knife is a REAL Weapon (Keen + Crafted + Durable),
  // not the harness's minimal fixture.
  vi.mocked(StuffApi.clone).mockImplementation(async (path: string) => {
    if (path === KNIFE_T) {
      const w = makeStuff(() => new Weapon());
      w.setConstruction(Construction.of('bladed'));
      w.setLength(Quantity.of(0.2, 'm'));
      return w as never;
    }
    if (path === '/obj/Casting') return makeStuff(() => new Casting()) as never;
    if (path === '/obj/Scrap') return makeStuff(() => new Scrap()) as never;
    throw new Error(`unexpected clone ${path}`);
  });
  room = makeStuff(() => new TestActor());
  smith = makeStuffAtPath(() => new TestActor(), '/obj/Avatar/lifecycle-smith');
  ContainmentApi.move(smith, room);
});

afterEach(() => {
  SchedulerApi._clearAllForTesting();
  WorldClockApi._resetForTesting();
  vi.restoreAllMocks();
});

describe('the crafting lifecycle — craft → wield → wear → sharpen → repair → salvage', () => {
  it('walks the whole loop at the smithy', async () => {
    // The smith knows the craft (the ladder's earned-deed path is proven
    // in knowledge-ladder.test; this run starts past it).
    await RecipeKnowledge.noteMade(smith, 'belt-knife', 'Belt Knife');
    ContainmentApi.move(makeTool('striking'), room);
    ContainmentApi.move(makeTool('anvil'), room);
    const ingot = makeStuff(() => new Ingot());
    ingot.setMass(Quantity.of(0.5, 'kg'));
    ingot.setMaterial(
      StuffApi.findByTemplatePath<Material>(IRON) as unknown as Material,
    );
    ContainmentApi.move(ingot, room);

    // 1. Cold forge → a diegetic decline, not a throw.
    const cold = makeContext(smith, room, 'forge knife');
    await executeAs(smith, () =>
      makeStuff(() => new ForgeController()).execute(
        { item: 'knife' } as never,
        cold,
      ),
    );
    expect(rejected(cold)).toBe(true);

    // 2. Light the forge (lit + bellows → 2080 K ≥ the 1400 K gate) and
    // forge it.
    ContainmentApi.move(makeLitForge(true), room);
    const hot = makeContext(smith, room, 'forge knife');
    await executeAs(smith, () =>
      makeStuff(() => new ForgeController()).execute(
        { item: 'knife' } as never,
        hot,
      ),
    );
    expect(rejected(hot)).toBe(false);
    const knife = smith
      .getContents()
      .find((c): c is Weapon => c instanceof Weapon)!;
    expect(knife).toBeDefined();

    // 3. The profile derives from the CHOSEN ingot's material; the mark
    // carries the maker + recipe.
    expect(knife.getMaterial()?.getName()).toBe('iron');
    expect(knife.getMass().rawValue()).toBeCloseTo(0.5, 9);
    expect(ingot.isDestroyed()).toBe(true);
    expect(knife.getProfile().isInert()).toBe(false);
    expect(
      (knife as unknown as { getRecipe(): string }).getRecipe(),
    ).toBe('belt-knife');

    // 4. Use wears it down on BOTH axes (the combat producers that
    // drive these surfaces are proven in CombatLogic.gearwear.test).
    for (let i = 0; i < 5; i++) {
      knife.wear(0.1);
      knife.dull(0.14);
    }
    expect(knife.getCondition()).toBeCloseTo(0.5, 9);
    expect(knife.getKeennessBand()).toBe('dulled');

    // 5. Sharpen restores keenness ONLY (the ritual, not the smith).
    ContainmentApi.move(makeStuff(() => new Whetstone()), smith);
    const sharpenCtx = makeContext(smith, room, 'sharpen knife');
    await executeAs(smith, () =>
      makeStuff(() => new SharpenController()).execute(
        { blade: ref(knife, 'knife') } as never,
        sharpenCtx,
      ),
    );
    expect(rejected(sharpenCtx)).toBe(false);
    await completeStep(12000);
    expect(knife.getKeenness()).toBe(1);
    expect(knife.getCondition()).toBeCloseTo(0.5, 9); // untouched

    // 6. Repair restores condition ONLY — priced by the deficit, drawn
    // from reachable metal stock at the hot forge.
    const scrap = makeStuff(() => new Scrap());
    scrap.setMass(Quantity.of(Scrap.UNIT_KG, 'kg'));
    scrap.setMaterial(
      StuffApi.findByTemplatePath<Material>(IRON) as unknown as Material,
    );
    scrap.setQuantity(10);
    ContainmentApi.move(scrap, room);
    const repairCtx = makeContext(smith, room, 'repair knife');
    await executeAs(smith, () =>
      makeStuff(() => new RepairController()).execute(
        { item: ref(knife, 'knife') } as never,
        repairCtx,
      ),
    );
    expect(rejected(repairCtx)).toBe(false);
    await completeStep(6000); // repair is an engaged act (REPAIR_MS)
    expect(knife.getCondition()).toBe(1); // sound again
    expect(scrap.getQuantity()).toBeLessThan(10); // the material cost

    // 7. Salvage yields LESS metal than the ingot that made it — the
    // entropy sink closes the loop.
    const salvageCtx = makeContext(smith, room, 'salvage knife');
    await executeAs(smith, () =>
      makeStuff(() => new SalvageController()).execute(
        { item: ref(knife, 'knife') } as never,
        salvageCtx,
      ),
    );
    expect(rejected(salvageCtx)).toBe(false);
    expect(knife.isDestroyed()).toBe(true);
    const recovered = room
      .getContents()
      .find((c): c is Casting => c instanceof Casting)!;
    expect(recovered).toBeDefined();
    if (MixinApi.isTangible(recovered)) {
      const got = recovered.getMass().rawValue();
      expect(got).toBeGreaterThan(0);
      expect(got).toBeLessThan(0.5); // less than the ingot it began as
    }
  });
});
