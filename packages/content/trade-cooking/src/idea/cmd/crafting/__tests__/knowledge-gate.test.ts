/**
 * The knowledge gate at the hearth — the cooking half of the generalized
 * knowledge ladder (the smithing half, and the Transcript assertions,
 * live with the smithing pack's `knowledge-ladder.test.ts`): `cook`
 * declines with `not-learned` until the deed is minted, then resolves on
 * matter, not knowledge.
 */

import "@saxonberg/server/test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import CookController from '../CookController';
import { SchedulerApi } from '@saxonberg/server/mud/api/scheduler';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { ExecutionContextApi } from '@saxonberg/server/mud/api/execution-context';
import { RecipeKnowledge } from '@saxonberg/server/mud/lib/script/RecipeKnowledge';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { CommandContext } from '@saxonberg/server/mud/api/command';
import {
  TestActor,
  standUpBranchHarness,
  makeContext,
} from '@saxonberg/server/mud/platform/idea/cmd/crafting/__tests__/branch-fixtures';
import {
  makeStuff,
  makeStuffAtPath,
} from '@saxonberg/server/mud/lib/security/__tests__/test-setup';

/** Run a controller execute with `who` tagged as the acting author. */
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
let builder: TestActor;
let bystander: TestActor;

function rejectedWith(ctx: CommandContext, reason: string): boolean {
  return ctx
    .getNotes()
    .some(
      (n) =>
        n.kind === 'controller-rejected' &&
        (n as { reason?: string }).reason === reason,
    );
}

beforeEach(async () => {
  await standUpBranchHarness();
  room = makeStuff(() => new TestActor());
  builder = makeStuffAtPath(() => new TestActor(), `/platform/agent/Avatar/lb-${seq++}`);
  bystander = makeStuffAtPath(() => new TestActor(), `/platform/agent/Avatar/lw-${seq++}`);
  ContainmentApi.move(builder, room);
  ContainmentApi.move(bystander, room);
});

afterEach(() => {
  SchedulerApi._clearAllForTesting();
  WorldClockApi._resetForTesting();
  vi.restoreAllMocks();
});

describe('the knowledge gate at the hearth', () => {
  it('the cooking one-shot rides the same deed gate', async () => {
    const declined = makeContext(builder, room, 'cook stew');
    await executeAs(builder, () =>
      makeStuff(() => new CookController()).execute(
        { dish: 'stew' } as never,
        declined,
      ),
    );
    expect(rejectedWith(declined, 'not-learned')).toBe(true);

    // With the deed minted (the by-hand mint's act), the gate opens —
    // the craft then resolves on its own merits (declines on matter, not
    // knowledge).
    await RecipeKnowledge.noteMade(builder, 'hearty-stew', 'Hearty Stew');
    const open = makeContext(builder, room, 'cook stew');
    await executeAs(builder, () =>
      makeStuff(() => new CookController()).execute(
        { dish: 'stew' } as never,
        open,
      ),
    );
    expect(rejectedWith(open, 'not-learned')).toBe(false);
  });
});
