/**
 * The conferring kind paces the step: a capability entry's `rate`
 * divides the engaged duration of the verbs that kind confers — the
 * anvil paces `hammer` (the striking hammer is a requirement, never a
 * pacer), the `mending` instrument paces the engaged `repair` (the
 * sewing machine's ≈ base/3 acceptance timing), honest in both
 * directions (a flimsy rate-0.5 kit is *slower*), clamped so data
 * can't zero a duration, and rate-1 when the instrument isn't a tool.
 */

import "@saxonberg/server/test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import HammerController from '../HammerController';
import HeatController from '@saxonberg/server/mud/platform/idea/cmd/crafting/HeatController';
import RepairController from '@saxonberg/server/mud/platform/idea/cmd/crafting/RepairController';
import { SchedulerApi } from '@saxonberg/server/mud/api/scheduler';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { ExecutionContextApi } from '@saxonberg/server/mud/api/execution-context';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import Material from '@saxonberg/server/mud/lib/material/Material';
import Ingot from '@saxonberg/server/mud/platform/thing/Ingot';
import ToolItem from '@saxonberg/server/mud/platform/thing/ToolItem';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { CapabilitySpec } from '@saxonberg/server/mud/lib/craft/ToolCapability';
import {
  TestActor,
  IRON,
  standUpBranchHarness,
  makeContext,
  ref,
  completeStep,
  makeLitForge,
  makeTool,
  makeStock,
} from '@saxonberg/server/mud/platform/idea/cmd/crafting/__tests__/branch-fixtures';
import {
  makeStuff,
  makeStuffAtPath,
} from '@saxonberg/server/mud/lib/security/__tests__/test-setup';

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

function makeSpecTool(spec: string | CapabilitySpec): ToolItem {
  const t = makeStuff(() => new ToolItem());
  t.setCapabilities([spec]);
  return t;
}

function makeHotIngot(): Ingot {
  const i = makeStuff(() => new Ingot());
  i.setMass(Quantity.of(0.5, 'kg'));
  i.setMaterial(
    StuffApi.findByTemplatePath<Material>(IRON) as unknown as Material,
  );
  i.noteHeat(1000);
  return i;
}

beforeEach(async () => {
  await standUpBranchHarness();
  room = makeStuff(() => new TestActor());
  actor = makeStuffAtPath(() => new TestActor(), `/platform/agent/Avatar/pacer-${seq++}`);
  ContainmentApi.move(actor, room);
});

afterEach(() => {
  SchedulerApi._clearAllForTesting();
  WorldClockApi._resetForTesting();
  vi.restoreAllMocks();
});

async function hammerWith(anvil: ToolItem, ingot: Ingot): Promise<void> {
  ContainmentApi.move(makeTool('striking'), actor);
  ContainmentApi.move(anvil, room);
  ContainmentApi.move(ingot, room);
  await executeAs(actor, () =>
    makeStuff(() => new HammerController()).execute(
      { target: ref(ingot, 'ingot') } as never,
      makeContext(actor, room, 'hammer ingot'),
    ),
  );
}

function banked(ingot: Ingot): boolean {
  return ingot.getContributions().some((c) => c.kind === 'item');
}

describe('rate paces the conferring kind', () => {
  it('a rate-3 anvil completes hammer at base/3 — and not before', async () => {
    const ingot = makeHotIngot();
    await hammerWith(makeSpecTool({ kind: 'anvil', rate: 3 }), ingot);
    await completeStep(1600); // 5000/3 ≈ 1667 — not yet
    expect(banked(ingot)).toBe(false);
    await completeStep(100); // past 1667
    expect(banked(ingot)).toBe(true);
  });

  it('a rate-0.5 anvil is honestly slower than base', async () => {
    const ingot = makeHotIngot();
    await hammerWith(makeSpecTool({ kind: 'anvil', rate: 0.5 }), ingot);
    await completeStep(5000); // the base duration — not enough
    expect(banked(ingot)).toBe(false);
    await completeStep(5100); // 5000/0.5 = 10000
    expect(banked(ingot)).toBe(true);
  });

  it('an out-of-band authored rate paces at the clamp (10×)', async () => {
    const ingot = makeHotIngot();
    await hammerWith(makeSpecTool({ kind: 'anvil', rate: 50 }), ingot);
    await completeStep(510); // 5000/10 = 500, never 5000/50
    expect(banked(ingot)).toBe(true);
  });

  it('a plain (string-authored) anvil paces at base', async () => {
    const ingot = makeHotIngot();
    await hammerWith(makeSpecTool('anvil'), ingot);
    await completeStep(4900);
    expect(banked(ingot)).toBe(false);
    await completeStep(200);
    expect(banked(ingot)).toBe(true);
  });

  it('a non-tool instrument (the ingot under heat) paces at base', async () => {
    const ingot = makeHotIngot();
    ContainmentApi.move(makeLitForge(false), room);
    ContainmentApi.move(ingot, room);
    const before = ingot.getHeatedToK();
    await executeAs(actor, () =>
      makeStuff(() => new HeatController()).execute(
        { target: ref(ingot, 'ingot') } as never,
        makeContext(actor, room, 'heat ingot'),
      ),
    );
    await completeStep(3900); // HEAT_MS 4000 — not yet
    expect(ingot.getHeatedToK()).toBe(before);
    await completeStep(200);
    expect(ingot.getHeatedToK()).toBeGreaterThan(before);
  });
});

describe('the engaged repair', () => {
  const LEATHER = '/stuff/idea/material/_test/pace-leather';

  function registerLeather(): void {
    makeStuffAtPath(() => {
      const m = new Material();
      m.setName('leather');
      m.setTags(['leather', 'hide']);
      return m;
    }, LEATHER);
  }

  function makeWornJerkin(): ToolItem {
    const j = makeStuff(() => new ToolItem());
    j.setMass(Quantity.of(1, 'kg'));
    j.setMaterial(
      StuffApi.findByTemplatePath<Material>(LEATHER) as unknown as Material,
    );
    j.setCondition(0.5);
    return j;
  }


  async function repairWith(
    mender: ToolItem,
    jerkin: ToolItem,
  ): Promise<void> {
    ContainmentApi.move(mender, actor);
    ContainmentApi.move(jerkin, room);
    ContainmentApi.move(makeStock(LEATHER, 0.5), room);
    await executeAs(actor, () =>
      makeStuff(() => new RepairController()).execute(
        { item: ref(jerkin, 'jerkin') } as never,
        makeContext(actor, room, 'repair jerkin'),
      ),
    );
  }

  it('the rate-3 machine repairs in ≈ base/3 (the acceptance timing)', async () => {
    registerLeather();
    const jerkin = makeWornJerkin();
    await repairWith(
      makeSpecTool({ kind: 'mending', rate: 3, control: 'fine' }),
      jerkin,
    );
    await completeStep(1900); // 6000/3 = 2000 — not yet
    expect(jerkin.getCondition()).toBe(0.5);
    await completeStep(200);
    expect(jerkin.getCondition()).toBe(1); // repaired at completion
  });

  it('completion narrates even though the controller clone is destructed (the live shape)', async () => {
    registerLeather();
    const jerkin = makeWornJerkin();
    jerkin.setCondition(1); // nothing to repair — the decline path
    const kit = makeSpecTool('mending');
    ContainmentApi.move(kit, actor);
    ContainmentApi.move(jerkin, room);
    const scenes: string[] = [];
    const realScene = MessageApi.scene.bind(MessageApi);
    vi.spyOn(MessageApi, 'scene').mockImplementation(((g: never) => {
      const s = realScene(g);
      const realToSelf = s.toSelf.bind(s);
      s.toSelf = ((m: { toString(): string }) => {
        scenes.push(String(m));
        return realToSelf(m as never);
      }) as never;
      return s;
    }) as never);
    const controller = makeStuff(() => new RepairController());
    const ctx = makeContext(actor, room, 'repair jerkin');
    await executeAs(actor, () =>
      controller.execute({ item: ref(jerkin, 'jerkin') } as never, ctx),
    );
    // The dispatcher destructs the per-dispatch clone when execute
    // returns — a `this.<method>()` in onComplete would [inert] no-op
    // (antipatterns.md § Activity-completion closures). Reproduce it.
    StuffApi.destruct(controller);
    await completeStep(6100);
    expect(scenes.some((m) => /already sound/i.test(m))).toBe(true);
  });

  it('the plain kit repairs at the base duration', async () => {
    registerLeather();
    const jerkin = makeWornJerkin();
    await repairWith(makeSpecTool('mending'), jerkin);
    await completeStep(5900);
    expect(jerkin.getCondition()).toBe(0.5);
    await completeStep(200);
    expect(jerkin.getCondition()).toBe(1);
  });
});
