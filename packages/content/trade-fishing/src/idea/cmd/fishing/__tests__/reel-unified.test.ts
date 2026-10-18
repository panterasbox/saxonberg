/**
 * ⭐ `reel` is ONE verb with two instruments (silk D6): with nothing bound
 * it is the fishing act it always was (AC 19); bound to something that
 * answers the `Reelable` shape it plans, engages and lands the subject's
 * own work, crediting the Discipline the SUBJECT names.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import YAML from 'yaml';
import Location from '@saxonberg/server/mud/lib/stuff/Location';
import Good from '@saxonberg/server/mud/platform/thing/Good';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { CommandContext } from '@saxonberg/server/mud/api/command';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { SchedulerApi } from '@saxonberg/server/mud/api/scheduler';
import { makeStuff } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import {
  TestActor,
  makeContext,
  completeStep,
  makeTool,
  standUpBranchHarness,
} from '@saxonberg/server/mud/platform/idea/cmd/crafting/__tests__/branch-fixtures';
import ReelController from '../ReelController';
import type { Reelable } from '../../../../lib/Reelable';

const VIEW = fileURLToPath(new URL('../../../../../content/trade/fishing/cmd/fishing/reel.yaml', import.meta.url));

class Reeler extends TestActor {}

/** Something that reels — the shape, and nothing about silk. */
class Spool extends Good implements Reelable {
  static _mixinName = 'ReelUnifiedTestSpool';
  public readonly reelable = true as const;
  public planned: Array<number | null> = [];
  public completed = 0;
  public refuse = false;
  async planReel(_by: Stuff, _tool: unknown, count: number | null) {
    this.planned.push(count);
    if (this.refuse) return { kind: 'refusal' as const, reason: 'not-ready', prose: 'It is not ready.' };
    return { kind: 'plan' as const, durationMs: 60_000, cost: 0, beginSelf: 'You begin.', token: 'tok' };
  }
  async completeReel() {
    this.completed += 1;
    return {
      self: 'You wind it off.',
      credit: { discipline: 'textiles', difficulty: 'standard' as const },
    };
  }
}

let room: Location;
let reeler: Reeler;
let sent: string[];

type Runnable = Stuff & { execute(model: never, ctx: CommandContext): unknown };
async function run(model: Record<string, unknown>): Promise<CommandContext> {
  const ctx = makeContext(reeler as unknown as Stuff, room as unknown as Stuff, 'reel');
  await makeStuff<Runnable>(() => new ReelController() as unknown as Runnable).execute(model as never, ctx);
  return ctx;
}
function rejected(ctx: CommandContext): string | null {
  const note = ctx.getNotes().find((n) => n.kind === 'controller-rejected');
  return note ? (note as unknown as { reason: string }).reason : null;
}

beforeEach(async () => {
  await standUpBranchHarness();
  sent = [];
  room = makeStuff(() => new Location());
  reeler = makeStuff(() => new Reeler());
  ContainmentApi.move(reeler as never, room as never);
  vi.spyOn(MessageApi, 'scene').mockImplementation(() => {
    const chain = {
      topic: () => chain,
      toSelf: (b: unknown) => {
        sent.push(String(b));
        return chain;
      },
      toPeers: () => chain,
      toTarget: () => chain,
      send: () => {},
    };
    return chain as never;
  });
});
afterEach(() => {
  SchedulerApi._clearAllForTesting();
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

describe('reel — one verb, two instruments', () => {
  it('⭐ AC 19 — nothing bound: the fishing act, unchanged', async () => {
    expect(rejected(await run({}))).toBe('no-line');
  });

  it('a bound target that does not reel is ignored — still the fishing act', async () => {
    const stone = makeStuff(() => new Good());
    expect(rejected(await run({ target: { stuff: stone, raw: 'stone' } }))).toBe('no-line');
  });

  it('⭐ a Reelable target: planned with the count, engaged, landed, credited', async () => {
    const spool = makeStuff(() => new Spool());
    const reel = makeTool('reeling');
    const credit = vi.spyOn(reeler, 'creditDeed').mockResolvedValue(undefined as never);
    const ctx = await run({
      target: { stuff: spool, raw: 'spool' },
      tool: { stuff: [reel], raw: '' },
      count: 6,
    });
    expect(rejected(ctx)).toBeNull();
    expect(spool.planned).toEqual([6]);
    await completeStep(120_000);
    expect(spool.completed).toBe(1);
    expect(sent.join(' ')).toMatch(/wind it off/);
    expect(credit).toHaveBeenCalledWith(expect.objectContaining({ discipline: 'textiles' }));
  });

  it("a refusal is the subject's own sentence", async () => {
    const spool = makeStuff(() => new Spool());
    spool.refuse = true;
    const ctx = await run({ target: { stuff: spool, raw: 'spool' } });
    expect(rejected(ctx)).toBe('not-ready');
    expect(sent.join(' ')).toMatch(/not ready/);
    expect(spool.completed).toBe(0);
  });

  it('the view: target is NOT greedy and takes any thing; the reel is declared', () => {
    const view = YAML.parse(readFileSync(VIEW, 'utf-8')) as {
      args: Array<{ name: string; greedy?: boolean; requires?: unknown; default?: string }>;
    };
    const target = view.args.find((a) => a.name === 'target')!;
    expect(target.greedy).toBeUndefined();
    expect(target.requires).toBe('any');
    const tool = view.args.find((a) => a.name === 'tool')!;
    expect(tool.default).toBe('reachable:[capability.reeling]');
  });
});
