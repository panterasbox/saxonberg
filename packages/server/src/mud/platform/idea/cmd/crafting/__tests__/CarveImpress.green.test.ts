/**
 * ⭐ `carve` and `impress` on green ware (ceramics W4): the platform verbs
 * are dumb, and the leather-hard POT answers — a foot turned, a mark
 * pressed — and says itself when it is too soft or too dry.
 */

import '../../../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import CarveController from '../CarveController';
import ImpressController from '../ImpressController';
import Good from '../../../../../lib/stuff/Good';
import Material from '../../../../../lib/material/Material';
import { GreenwareMixin } from '../../../../../lib/material/Greenware';
import { WaterActivityMixin } from '../../../../../lib/material/WaterActivity';
import { ThermalMixin } from '../../../../../lib/thermal/Thermal';
import { CraftedMixin } from '../../../../../lib/craft/Crafted';
import { Quantity } from '../../../../../lib/quantity';
import { SchedulerApi } from '../../../../../api/scheduler';
import { WorldClockApi } from '../../../../../api/worldclock';
import { ContainmentApi } from '../../../../../api/containment';
import { ExecutionContextApi } from '../../../../../api/execution-context';
import type { CommandContext } from '../../../../../api/command';
import type { Stuff } from '../../../../../lib/stuff/Stuff';
import {
  TestActor,
  standUpBranchHarness,
  makeContext,
  ref,
  completeStep,
  makeTool,
} from './branch-fixtures';
import { makeStuff, makeStuffAtPath } from '../../../../../lib/security/__tests__/test-setup';

class Pot extends GreenwareMixin(WaterActivityMixin(ThermalMixin(CraftedMixin(Good)))) {
  static _mixinName = 'CarveImpressTestPot';
}

/** A potter's die: answers whose mark it presses. */
class TestStamp extends Good {
  public markIdentity(): string {
    return '/platform/agent/Avatar/potter';
  }
}

let room: TestActor;
let actor: TestActor;
let clay: Material;
let fired: Material;

function pot(moisture: number): Pot {
  return makeStuff(() => {
    const p = new Pot();
    p.setMass(Quantity.of(1, 'kg'));
    p.setMaterial(clay);
    p.setWaterState({ moisture, solute: 0 });
    return p;
  });
}

async function run(
  ctrl: { execute(m: never, c: CommandContext): Promise<void> | void },
  model: Record<string, unknown>,
  text: string,
): Promise<CommandContext> {
  const ctx = makeContext(actor, room, text);
  await ExecutionContextApi.runRoot(null, 'test', async () => {
    ExecutionContextApi.tagActingAuthor(actor);
    await ctrl.execute(model as never, ctx);
  });
  return ctx;
}

const refusal = (c: CommandContext): string | undefined =>
  (c.getNotes().find((n) => n.kind === 'controller-rejected') as { reason?: string } | undefined)?.reason;

beforeEach(async () => {
  await standUpBranchHarness();
  room = makeStuff(() => new TestActor());
  actor = makeStuffAtPath(() => new TestActor(), '/platform/agent/Avatar/potter');
  ContainmentApi.move(actor, room);
  clay = makeStuffAtPath(() => {
    const m = new Material();
    m.setName('test clay');
    m.setTags(['earth', 'plastic', 'clay']);
    return m;
  }, '/stuff/idea/material/_carve/clay') as unknown as Material;
  fired = makeStuffAtPath(() => {
    const m = new Material();
    m.setName('test terracotta');
    m.setTags(['ceramic', 'fired', 'brittle']);
    return m;
  }, '/stuff/idea/material/_carve/terracotta') as unknown as Material;
});

afterEach(() => {
  SchedulerApi._clearAllForTesting();
  WorldClockApi._resetForTesting();
});

describe('carve on a pot', () => {
  it('⭐ a foot turned on a leather-hard mug', async () => {
    const mug = pot(0.7);
    const knife = makeTool('cutting');
    ContainmentApi.move(knife, room);
    const ctx = await run(
      makeStuff(() => new CarveController()),
      { thing: { stuff: null, raw: 'foot' }, target: ref(mug, 'mug'), knife: ref(knife, 'knife') },
      'carve foot on mug',
    );
    expect(refusal(ctx)).toBeUndefined();
    await completeStep(4 * 60 * 1000);
    expect(mug.getGreenWork()).toContain('a turned foot');
    expect(mug.getMass().rawValue()).toBeLessThan(1);
  });

  it('bone-dry ware will not trim; plastic smears', async () => {
    const knife = makeTool('cutting');
    ContainmentApi.move(knife, room);
    for (const [m, why] of [[0.52, 'too-dry'], [1, 'too-soft']] as const) {
      const p = pot(m);
      const ctx = await run(
        makeStuff(() => new CarveController()),
        { thing: { stuff: null, raw: 'foot' }, target: ref(p, 'mug'), knife: ref(knife, 'knife') },
        'carve foot on mug',
      );
      expect(refusal(ctx)).toBe(why);
    }
  });
});

describe('impress a stamp', () => {
  it('⭐ a stamp on a leather-hard jug marks it — and the mark survives firing', async () => {
    const jug = pot(0.7);
    const stamp = makeStuff(() => new TestStamp());
    ContainmentApi.move(stamp, room);
    const ctx = await run(
      makeStuff(() => new ImpressController()),
      { pattern: ref(stamp as unknown as Stuff, 'stamp'), medium: ref(jug, 'jug') },
      'impress stamp on jug',
    );
    expect(refusal(ctx)).toBeUndefined();
    expect(jug.getMark()).toBe('/platform/agent/Avatar/potter');
    jug.setMaterial(fired);
    expect(jug.isGreen()).toBe(false);
    expect(jug.getMark()).toBe('/platform/agent/Avatar/potter');
  });

  it('bone-dry refuses the stamp; a thing that takes no impression is told so', async () => {
    const dry = pot(0.52);
    const stamp = makeStuff(() => new TestStamp());
    const rock = makeStuff(() => new Good());
    for (const s of [stamp, rock]) ContainmentApi.move(s, room);
    // ⚠ The pots stand nowhere: placed in the harness's bare room they
    // would read its biome chain, which this harness does not load.
    const a = await run(
      makeStuff(() => new ImpressController()),
      { pattern: ref(stamp as unknown as Stuff, 'stamp'), medium: ref(dry, 'jug') },
      'impress stamp on jug',
    );
    expect(refusal(a)).toBe('too-dry');
    expect(dry.getMark()).toBe('');
    const b = await run(
      makeStuff(() => new ImpressController()),
      { pattern: ref(stamp as unknown as Stuff, 'stamp'), medium: ref(rock, 'rock') },
      'impress stamp on rock',
    );
    expect(refusal(b)).toBe('not-impressible');
  });
});
