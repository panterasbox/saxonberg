/**
 * ⭐ The ONE `cut` (storage-and-ice W7, D16): a kernel verb over a cut-plan
 * protocol. The controller resolves who plans — the target when it is
 * `Cuttable`, else a bound tool that is a `CutPlanner` and knows the
 * target, else (for a bare word) the room's floor — and either engages the
 * plan's step or declines in the planner's words. It names no pack class.
 */

import '../../../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import CutController from '../CutController';
import Good from '../../../../thing/Good';
import Location from '../../../../../lib/stuff/Location';
import { StuffApi } from '../../../../../api/stuff';
import { ContainmentApi } from '../../../../../api/containment';
import { Mml } from '../../../../../api/mml';
import type { CutRequest } from '../../../../../lib/craft/Cuttable';
import type { CommandContext } from '../../../../../api/command';
import type { Stuff } from '../../../../../lib/stuff/Stuff';
import { makeStuff } from '../../../../../lib/security/__tests__/test-setup';
import { TestActor, makeContext, ref, many } from './branch-fixtures';

let made: string[] = [];

class Block extends Good {
  public async cutPlan(req: CutRequest) {
    if (req.tools.length === 0) {
      return { ok: false as const, reason: 'no-saw', line: Mml.compose`You need a saw.` };
    }
    return {
      ok: true as const,
      durationMs: 50,
      effortW: 100,
      beginSelf: Mml.compose`You saw.`,
      onComplete: () => {
        made.push('block');
      },
    };
  }
}
class Bolt extends Good {}
class Shears extends Good {
  public async cutPlanFor(target: Stuff, _req: CutRequest) {
    if (!(target instanceof Bolt)) return null;
    return {
      ok: true as const,
      durationMs: 50,
      effortW: 100,
      beginSelf: Mml.compose`You chalk a pattern.`,
      onComplete: () => {
        made.push('pieces');
      },
    };
  }
}

function rejected(ctx: CommandContext): string | null {
  const note = ctx.getNotes().find((n) => n.kind === 'controller-rejected');
  return note ? (note as unknown as { reason: string }).reason : null;
}

let room: Location;
let actor: TestActor;

beforeEach(() => {
  StuffApi.clearAll();
  made = [];
  room = makeStuff(() => new Location());
  actor = makeStuff(() => new TestActor());
  ContainmentApi.move(actor as never, room as never);
});

afterEach(() => {
  vi.restoreAllMocks();
});

async function run(model: Record<string, unknown>): Promise<CommandContext> {
  const ctx = makeContext(actor as unknown as Stuff, room as unknown as Stuff, 'cut');
  await makeStuff(() => new CutController()).execute(model as never, ctx);
  return ctx;
}

describe('one cut — the planner decides', () => {
  it('⭐ a Cuttable target plans its own cut', async () => {
    const block = makeStuff(() => new Block());
    const ctx = await run({ target: ref(block as unknown as Stuff, 'block'), tools: many(makeStuff(() => new Good()) as unknown as Stuff) });
    expect(rejected(ctx)).toBeNull();
    expect(made).toEqual(['block']);
  });

  it('a Cuttable target refuses in its own words', async () => {
    const block = makeStuff(() => new Block());
    const ctx = await run({ target: ref(block as unknown as Stuff, 'block'), tools: many() });
    expect(rejected(ctx)).toBe('no-saw');
    expect(made).toEqual([]);
  });

  it('⭐ a tool that knows the target plans it (the shears and the bolt)', async () => {
    const bolt = makeStuff(() => new Bolt());
    const ctx = await run({ target: ref(bolt as unknown as Stuff, 'bolt'), tools: many(makeStuff(() => new Shears()) as unknown as Stuff) });
    expect(rejected(ctx)).toBeNull();
    expect(made).toEqual(['pieces']);
  });

  it('nothing in reach knows how to cut it → declined', async () => {
    const stone = makeStuff(() => new Good());
    const ctx = await run({ target: ref(stone as unknown as Stuff, 'stone'), tools: many(makeStuff(() => new Shears()) as unknown as Stuff) });
    expect(rejected(ctx)).toBe('no-cutter');
  });

  it('a bare word asks the floor underfoot, and with no floor to ask it is "Cut what?"', async () => {
    const floorPlan = vi.fn(async () => ({
      ok: true as const,
      durationMs: 50,
      effortW: 100,
      beginSelf: Mml.compose`You cut a hole.`,
      onComplete: () => {
        made.push('hole');
      },
    }));
    vi.spyOn(room, 'getFloor').mockReturnValue({ cutPlan: floorPlan } as never);
    const ctx = await run({ target: ref(null, 'hole'), tools: many() });
    expect(rejected(ctx)).toBeNull();
    expect(floorPlan).toHaveBeenCalledWith(expect.objectContaining({ raw: 'hole' }));
    expect(made).toEqual(['hole']);
    vi.restoreAllMocks();
    const none = await run({ target: ref(null, ''), tools: many() });
    expect(rejected(none)).toBe('no-target');
  });
});
