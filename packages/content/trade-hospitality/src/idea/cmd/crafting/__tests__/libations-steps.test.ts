/**
 * The bar's two new hand steps:
 *
 *   - `wash <glass>` — needs water in reach; tips the dregs and whatever
 *     was in the glass, clears the ice, and clears the soil mark so the
 *     pool will claim it again;
 *   - `muddle` — needs a muddler in reach; records `muddled` on the build.
 *
 * Synthetic fixtures (the branch harness).
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import WashController from '@saxonberg/server/mud/platform/idea/cmd/crafting/WashController';
import MuddleController from '../MuddleController';
import { SchedulerApi } from '@saxonberg/server/mud/api/scheduler';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { BulkableApi } from '@saxonberg/server/mud/api/bulk';
import { ExecutionContextApi } from '@saxonberg/server/mud/api/execution-context';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import Material from '@saxonberg/server/mud/lib/material/Material';
import Thing from '@saxonberg/server/mud/lib/stuff/Thing';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import CraftedDrink from '@saxonberg/server/mud/platform/thing/CraftedDrink';
import Receptacle from '@saxonberg/server/mud/platform/thing/Receptacle';
import CocktailShaker from '@saxonberg/server/mud/platform/thing/CocktailShaker';
import ToolItem from '@saxonberg/server/mud/platform/thing/ToolItem';
import {
  TestActor,
  makeContext,
  ref,
  completeStep,
  standUpBranchHarness,
} from '@saxonberg/server/mud/platform/idea/cmd/crafting/__tests__/branch-fixtures';
import {
  makeStuff,
  makeStuffAtPath,
} from '@saxonberg/server/mud/lib/security/__tests__/test-setup';

const WATER = '/stuff/idea/material/_test/steps/water';
const BLEND = '/stuff/idea/material/_test/steps/blend';
const OLIVE = '/stuff/idea/material/_test/steps/olive';
const RUM = '/stuff/idea/material/_test/steps/rum';

async function executeAs(who: Stuff, fn: () => void | Promise<void>): Promise<void> {
  await ExecutionContextApi.runRoot(null, 'test', async () => {
    ExecutionContextApi.tagActingAuthor(who);
    await fn();
  });
}

function material(path: string, name: string, tags: string[]): Material {
  return makeStuffAtPath(() => {
    const m = new Material();
    m.setName(name);
    m.setTags(tags);
    m.setKeywords([name]);
    return m;
  }, path);
}

/** A used coupe: half a drink in it, an olive, ice, soiled. */
function makeUsedCoupe(): CraftedDrink {
  const g = makeStuff(() => new CraftedDrink());
  (g as unknown as { interiorBulk: boolean }).interiorBulk = true;
  g.setInteriorCapacity(Quantity.of(0.3, 'L'));
  (g as unknown as { interiorMaterial: string }).interiorMaterial = BLEND;
  g.setInteriorAmount(Quantity.of(0.05, 'L'));
  (g as unknown as { soiled: boolean }).soiled = true;
  g.setIce(0.05, 'cubes');
  return g;
}

function makeWaterSource(): Receptacle {
  const b = makeStuff(() => new Receptacle());
  (b as unknown as { interiorBulk: boolean }).interiorBulk = true;
  (b as unknown as { interiorMaterial: string }).interiorMaterial = WATER;
  b.setInteriorCapacity(Quantity.of(50, 'L'));
  b.setInteriorAmount(Quantity.of(50, 'L'));
  return b;
}

let seq = 0;
let room: TestActor;
let actor: TestActor;

beforeEach(async () => {
  await standUpBranchHarness();
  material(WATER, 'water', ['liquid']);
  material(BLEND, 'mixed drink', ['cocktail']);
  material(OLIVE, 'olive', ['olive']);
  material(RUM, 'rum', ['rum']);
  room = makeStuff(() => new TestActor());
  actor = makeStuffAtPath(() => new TestActor(), `/platform/agent/Avatar/keeper-${seq++}`);
  ContainmentApi.move(actor, room);
});

afterEach(() => {
  SchedulerApi._clearAllForTesting();
  WorldClockApi._resetForTesting();
  vi.restoreAllMocks();
});

describe('wash', () => {
  it('refuses with no water in reach, and never touches the glass', async () => {
    const coupe = makeUsedCoupe();
    ContainmentApi.move(coupe, room);
    const ctx = makeContext(actor, room, 'wash coupe');
    await executeAs(actor, () =>
      makeStuff(() => new WashController()).execute({ glass: ref(coupe, 'coupe') } as never, ctx),
    );
    expect(ctx.getNotes().some((n) => n.kind === 'controller-rejected' && n.reason === 'no-water')).toBe(true);
    await completeStep(3000);
    expect(coupe.isSoiled()).toBe(true);
    expect(coupe.getBulkAmount('interior').rawValue()).toBeGreaterThan(0);
  });

  it('with water in reach: tips the dregs and the garnish, clears the ice, and the glass is claimable again — at completion', async () => {
    const coupe = makeUsedCoupe();
    ContainmentApi.move(coupe, room);
    const olive = makeStuff(() => new Thing());
    olive.setMaterial(StuffApi.findByTemplatePath<Material>(OLIVE)!);
    ContainmentApi.move(olive, coupe);
    ContainmentApi.move(makeWaterSource(), room);

    await executeAs(actor, () =>
      makeStuff(() => new WashController()).execute(
        { glass: ref(coupe, 'coupe') } as never,
        makeContext(actor, room, 'wash coupe'),
      ),
    );
    // Not at dispatch —
    expect(coupe.isSoiled()).toBe(true);
    expect(olive.isDestroyed()).toBe(false);
    await completeStep(3000);
    // — at completion.
    expect(coupe.isSoiled()).toBe(false);
    expect(coupe.getBulkAmount('interior').rawValue()).toBe(0);
    expect(BulkableApi.slotFor(coupe, undefined)!.getMaterialPath()).toBeNull();
    expect(coupe.getIceKg()).toBe(0);
    expect(olive.isDestroyed()).toBe(true);
    expect(coupe.getContents()).toHaveLength(0);
    expect(coupe.isClaimable()).toBe(true);
  });
});

describe('muddle', () => {
  function makeRumBottle() {
    const b = makeStuff(() => new Receptacle());
    (b as unknown as { interiorBulk: boolean }).interiorBulk = true;
    (b as unknown as { interiorMaterial: string }).interiorMaterial = RUM;
    b.setInteriorCapacity(Quantity.of(1, 'L'));
    b.setInteriorAmount(Quantity.of(1, 'L'));
    return b;
  }

  it('declines without a muddler in reach; with one, records `muddled` at completion', async () => {
    const shaker = makeStuff(() => new CocktailShaker());
    ContainmentApi.move(shaker, room);
    shaker.addContribution({ category: 'rum', measureL: 0.05, gradeBand: 'fair' });
    void makeRumBottle;

    const noTool = makeContext(actor, room, 'muddle');
    await executeAs(actor, () =>
      makeStuff(() => new MuddleController()).execute({ vessel: ref(shaker, 'shaker') } as never, noTool),
    );
    expect(noTool.getNotes().some((n) => n.kind === 'controller-rejected' && n.reason === 'missing-tool')).toBe(true);
    expect(shaker.getBuildMethod()).toBeNull();

    const muddler = makeStuff(() => new ToolItem());
    muddler.setCapabilities(['muddler']);
    ContainmentApi.move(muddler, actor);
    await executeAs(actor, () =>
      makeStuff(() => new MuddleController()).execute(
        { vessel: ref(shaker, 'shaker') } as never,
        makeContext(actor, room, 'muddle'),
      ),
    );
    expect(shaker.getBuildMethod()).toBeNull();
    await completeStep(6000);
    expect(shaker.getBuildMethod()).toBe('muddled');
    expect(shaker.getCommandSources()).toContain('muddle');
  });
});
