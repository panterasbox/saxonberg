/**
 * ⭐ `hammer <blank> on <die>` (ceramics D14): the anvil the binder bound
 * may be a DIE — a `StrikingDieMixin` — and then the die,
 * not the forge's build, decides what the blow made. A plain anvil
 * answers nothing and the forging runs as ever (the other suites).
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import HammerController from '../HammerController';
import { SchedulerApi } from '@saxonberg/server/mud/api/scheduler';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { ExecutionContextApi } from '@saxonberg/server/mud/api/execution-context';
import { Mml } from '@saxonberg/server/mud/api/mml';
import Tool from '@saxonberg/server/mud/platform/thing/Tool';
import Good from '@saxonberg/server/mud/lib/stuff/Good';
import { StrikingDieMixin } from '@saxonberg/server/mud/lib/craft/StrikingDie';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import {
  TestActor,
  standUpBranchHarness,
  makeContext,
  ref,
  many,
  completeStep,
  makeTool,
} from '@saxonberg/server/mud/platform/idea/cmd/crafting/__tests__/branch-fixtures';
import { makeStuff, makeStuffAtPath } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';

/** A die: an anvil-capable tool that takes a blank's shape from a blow. */
class TestDie extends StrikingDieMixin(Tool) {
  public struck: { blank: string; blowJ: number }[] = [];
  public override async strikeWith(blank: Stuff, blowJ: number, _by: Stuff): Promise<Mml> {
    this.struck.push({ blank: blank.stuffId, blowJ });
    return Mml.compose`The die bites the blank.`;
  }
}

let room: TestActor;
let actor: TestActor;

beforeEach(async () => {
  await standUpBranchHarness();
  room = makeStuff(() => new TestActor());
  actor = makeStuffAtPath(() => new TestActor(), '/platform/agent/Avatar/die-striker');
  ContainmentApi.move(actor, room);
});

afterEach(() => {
  SchedulerApi._clearAllForTesting();
  WorldClockApi._resetForTesting();
});

describe('hammer on a die', () => {
  it('a bound die takes the blank from the blow; nothing is forged', async () => {
    const blank = makeStuff(() => new Good());
    const striker = makeTool('striking');
    const die = makeStuff(() => {
      const d = new TestDie();
      d.setCapabilities(['anvil']);
      return d;
    });
    for (const s of [blank, striker, die]) ContainmentApi.move(s, room);
    const ctx = makeContext(actor, room, 'hammer blank on die');
    await ExecutionContextApi.runRoot(null, 'test', async () => {
      ExecutionContextApi.tagActingAuthor(actor);
      await makeStuff(() => new HammerController()).execute(
        { target: ref(blank, 'blank'), striker: many(striker), anvil: many(die) } as never,
        ctx,
      );
    });
    expect(ctx.getNotes().some((n) => n.kind === 'controller-rejected')).toBe(false);
    await completeStep(5000);
    for (let i = 0; i < 4; i++) await new Promise<void>((r) => setTimeout(r, 0));
    expect(die.struck).toHaveLength(1);
    expect(die.struck[0]!.blank).toBe(blank.stuffId);
    expect(die.struck[0]!.blowJ).toBeGreaterThan(0);
  });
});
