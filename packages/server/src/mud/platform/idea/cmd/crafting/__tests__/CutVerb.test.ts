/**
 * ⭐ The ONE `cut` (storage-and-ice W7, D16): a kernel verb over a cut-plan
 * protocol. The controller resolves who plans — the target when it is
 * `Cuttable`, else a bound tool that is a `CutPlanner` and knows the
 * target, else (for a bare word) the room's floor — and either engages the
 * plan's step or declines — the planner answers a reason and facts, the
 * controller words them (controllers-are-io D4). It names no pack class.
 */

import '../../../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import CutController from '../CutController';
import Good from '../../../../thing/Good';
import Place from '../../../../../lib/stuff/Place';
import { StuffApi } from '../../../../../api/stuff';
import { ContainmentApi } from '../../../../../api/containment';
import { MessageApi } from '../../../../../api/message';
import {
  CuttableMixin,
  type CutAnswer,
  type CutAnswerFor,
  type CutBegin,
  type CutRequest,
} from '../../../../../lib/craft/Cuttable';
import { CutPlannerMixin } from '../../../../../lib/craft/CutPlanner';
import type { CommandContext } from '../../../../../api/command';
import type { Stuff } from '../../../../../lib/stuff/Stuff';
import { makeStuff } from '../../../../../lib/security/__tests__/test-setup';
import { TestActor, makeContext, ref, many } from './branch-fixtures';

let made: string[] = [];

const BEGIN: CutBegin = { kind: 'ice', hole: false };

class Block extends CuttableMixin(Good) {
  public override async cutPlan(req: CutRequest): Promise<CutAnswer> {
    if (req.tools.length === 0) return { ok: false, verb: 'cut', reason: 'no-knife' };
    return {
      ok: true,
      verb: 'cut',
      durationMs: 50,
      effortW: 100,
      facts: BEGIN,
      onComplete: () => {
        made.push('block');
        return { ok: true, facts: { kind: 'gone' } };
      },
    };
  }
}
class Bolt extends Good {}
class Shears extends CutPlannerMixin(Good) {
  public override async cutPlanFor(target: Stuff, _req: CutRequest<'cut'>): Promise<CutAnswerFor<'cut'> | null> {
    if (!(target instanceof Bolt)) return null;
    return {
      ok: true,
      verb: 'cut',
      durationMs: 50,
      effortW: 100,
      facts: BEGIN,
      onComplete: () => {
        made.push('pieces');
        return { ok: true, facts: { kind: 'gone' } };
      },
    };
  }
}

function rejected(ctx: CommandContext): string | null {
  const note = ctx.getNotes().find((n) => n.kind === 'controller-rejected');
  return note ? (note as unknown as { reason: string }).reason : null;
}

let room: Place;
let actor: TestActor;

beforeEach(() => {
  StuffApi.clearAll();
  made = [];
  room = makeStuff(() => new Place());
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

  it('⭐ a Cuttable target refuses with a reason, and the controller words it (D4)', async () => {
    const block = makeStuff(() => new Block());
    const said: string[] = [];
    const chain = {
      topic: () => chain,
      toSelf: (m: unknown) => (said.push(String(m)), chain),
      toPeers: () => chain,
      send: () => undefined,
    };
    vi.spyOn(MessageApi, 'scene').mockReturnValue(chain as never);
    const ctx = await run({ target: ref(block as unknown as Stuff, 'block'), tools: many() });
    expect(rejected(ctx)).toBe('no-knife');
    expect(said.join(' ')).toMatch(/You need a knife to cut/);
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
    const floorPlan = vi.fn(async (): Promise<CutAnswer> => ({
      ok: true,
      verb: 'cut',
      durationMs: 50,
      effortW: 100,
      facts: { kind: 'ice', hole: true },
      onComplete: () => {
        made.push('hole');
        return { ok: true, facts: { kind: 'ice-hole' } };
      },
    }));
    class Floor extends CuttableMixin(Good) {}
    const floor = makeStuff(() => new Floor());
    vi.spyOn(floor, 'cutPlan').mockImplementation(floorPlan as never);
    vi.spyOn(room, 'getFloor').mockReturnValue(floor as never);
    const ctx = await run({ target: ref(null, 'hole'), tools: many() });
    expect(rejected(ctx)).toBeNull();
    expect(floorPlan).toHaveBeenCalledWith(expect.objectContaining({ raw: 'hole' }));
    expect(made).toEqual(['hole']);
    vi.restoreAllMocks();
    const none = await run({ target: ref(null, ''), tools: many() });
    expect(rejected(none)).toBe('no-target');
  });
});
