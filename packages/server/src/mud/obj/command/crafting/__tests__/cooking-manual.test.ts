/**
 * The by-hand cooking path — add / stir / heat / plate over the cook pot
 * (the shaker's role at the hearth). Covers: the discrete-ingredient
 * `add` branch (consumes the item at completion, banks an
 * item-contribution — conservation at add-time); heat latches the
 * hearth's K on the pot; plate reverse-matches and fills the dish with
 * the recipe's authored food material at the portion; an off-spec build
 * mints the generic pot-luck.
 */

import "../../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import PourController from '../PourController';
import StirController from '../StirController';
import HeatController from '../HeatController';
import PlateController from '../PlateController';
import { SchedulerApi } from '../../../../api/scheduler';
import { WorldClockApi } from '../../../../api/worldclock';
import { ContainmentApi } from '../../../../api/containment';
import { BulkableApi } from '../../../../api/bulk';
import { ExecutionContextApi } from '../../../../api/execution-context';
import { Quantity } from '../../../../lib/quantity';
import CookPot from '../../../CookPot';
import CraftedDrink from '../../../../domain/lounge/CraftedDrink';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import {
  TestActor,
  VEG,
  MEAT,
  COOKED,
  standUpBranchHarness,
  makeContext,
  ref,
  completeStep,
  makeLitOven,
  makeStock,
} from './branch-fixtures';
import {
  makeStuff,
  makeStuffAtPath,
} from '../../../../lib/security/__tests__/test-setup';

/** Run a controller execute with `actor` tagged as the acting author. */
async function executeAs(
  who: Stuff,
  fn: () => void | Promise<void>,
): Promise<void> {
  await ExecutionContextApi.runRoot(null, 'test', async () => {
    ExecutionContextApi.tagActingAuthor(who);
    await fn();
  });
}

let seq = 0;
let room: TestActor;
let actor: TestActor;
let pot: CookPot;

function makeDish(): CraftedDrink {
  const d = makeStuff(() => new CraftedDrink());
  (d as unknown as { interiorBulk: boolean }).interiorBulk = true;
  d.setInteriorCapacity(Quantity.of(0.6, 'L'));
  return d;
}

async function addIngredient(item: Stuff): Promise<void> {
  await executeAs(actor, () =>
    makeStuff(() => new PourController()).execute(
      { spirit: ref(item, 'x'), vessel: ref(pot, 'pot') } as never,
      makeContext(actor, room, `add ${item.getPresentation()}`),
    ),
  );
  await completeStep(3000);
}

beforeEach(async () => {
  await standUpBranchHarness();
  room = makeStuff(() => new TestActor());
  actor = makeStuffAtPath(() => new TestActor(), `/obj/Avatar/cook-${seq++}`);
  ContainmentApi.move(actor, room);
  pot = makeStuff(() => new CookPot());
  ContainmentApi.move(pot, room);
});

afterEach(() => {
  SchedulerApi._clearAllForTesting();
  WorldClockApi._resetForTesting();
  vi.restoreAllMocks();
});

describe('the by-hand cooking path', () => {
  it('add consumes the ingredient at completion and banks an item-contribution', async () => {
    const veg = makeStock(VEG, 0.6);
    ContainmentApi.move(veg, room);

    await executeAs(actor, () =>
      makeStuff(() => new PourController()).execute(
        { spirit: ref(veg, 'veg'), vessel: ref(pot, 'pot') } as never,
        makeContext(actor, room, 'add vegetables'),
      ),
    );
    // Not at dispatch —
    expect(veg.isDestroyed()).toBe(false);
    expect(pot.isBuildEmpty()).toBe(true);
    await completeStep(3000);
    // — at completion: item consumed, contribution banked.
    expect(veg.isDestroyed()).toBe(true);
    const c = pot.getContributions();
    expect(c).toHaveLength(1);
    expect(c[0]).toMatchObject({ kind: 'item', count: 1, gradeBand: 'fair' });
    expect(c[0]!.tags).toContain('vegetable');
  });

  it('add/stir/heat/plate mints the stew at the authored portion', async () => {
    ContainmentApi.move(makeLitOven(), room); // 500 K ≥ the 373 K gate
    const dish = makeDish();
    ContainmentApi.move(dish, room);
    await addIngredient(makeStock(VEG, 0.6));
    await addIngredient(makeStock(VEG, 0.6));
    await addIngredient(makeStock(MEAT, 0.4));

    await executeAs(actor, () =>
      makeStuff(() => new StirController()).execute(
        { vessel: ref(pot, 'pot') } as never,
        makeContext(actor, room, 'stir pot'),
      ),
    );
    await completeStep(4000);

    await executeAs(actor, () =>
      makeStuff(() => new HeatController()).execute(
        { target: ref(pot, 'pot') } as never,
        makeContext(actor, room, 'heat pot'),
      ),
    );
    await completeStep(4000);
    expect(pot.getHeatedToK()).toBeCloseTo(500, 6);

    await executeAs(actor, () =>
      makeStuff(() => new PlateController()).execute(
        { vessel: ref(pot, 'pot'), dish: ref(dish, 'dish') } as never,
        makeContext(actor, room, 'plate pot into dish'),
      ),
    );
    await completeStep(2500);

    const slot = BulkableApi.slotFor(dish, undefined)!;
    // The DERIVED blend: the one generic cooked base + a per-instance
    // payload — identity from the recipe, macros summed from the inputs
    // (macros in = macros out: 2 veg × 17000 carb + 1 meat × 26000
    // protein). No per-dish material row exists.
    expect(slot.getMaterialPath()).toBe(COOKED);
    const payload = slot.getPayload()!;
    expect(payload.name).toBe('Hearty Stew');
    expect(payload.appearance).toMatch(/thick brown stew/);
    expect(payload.nutrientAmounts).toEqual({ carb: 34000, protein: 26000 });
    expect(payload.edible).toBe(true);
    expect(slot.getAmount().rawValue()).toBeCloseTo(0.4, 9); // the portion
    expect((dish as unknown as { getRecipe(): string }).getRecipe()).toBe(
      'hearty-stew',
    );
    expect(pot.isBuildEmpty()).toBe(true); // cleared by the mint
  });

  it('an off-spec build mints the generic pot-luck', async () => {
    ContainmentApi.move(makeLitOven(), room);
    const dish = makeDish();
    ContainmentApi.move(dish, room);
    await addIngredient(makeStock(VEG, 0.6)); // one veg — no recipe matches

    await executeAs(actor, () =>
      makeStuff(() => new HeatController()).execute(
        { target: ref(pot, 'pot') } as never,
        makeContext(actor, room, 'heat pot'),
      ),
    );
    await completeStep(4000);
    await executeAs(actor, () =>
      makeStuff(() => new PlateController()).execute(
        { vessel: ref(pot, 'pot'), dish: ref(dish, 'dish') } as never,
        makeContext(actor, room, 'plate pot into dish'),
      ),
    );
    await completeStep(2500);

    const slot = BulkableApi.slotFor(dish, undefined)!;
    // Off-spec still conserves: the generic base named by its own row,
    // the macros honestly summed from what actually went in.
    expect(slot.getMaterialPath()).toBe(COOKED);
    expect(slot.getPayload()!.name).toBe('cooked fare');
    expect(slot.getPayload()!.nutrientAmounts).toEqual({ carb: 17000 });
    expect(slot.getAmount().rawValue()).toBeGreaterThan(0);
    expect((dish as unknown as { getRecipe(): string }).getRecipe()).toBe('');
  });
});
