/**
 * Unit tests for the canned brains' decision logic. Each brain is a
 * stateless strategy: given a `BrainContext`, it emits through the
 * context's helpers. We drive `act()` with a fake context whose
 * `say`/`emote`/`emoteFree` are spies, so brain logic is tested without
 * a live host. Movement brains (wanders/patrols/shifts) guard on the
 * host's mixins and no-op against a plain fake host — their traversal is
 * covered in Behaved.test.ts with a real host.
 */

import { describe, it, expect, vi } from 'vitest';
import type { BrainContext, BrainStatics } from '../brain';
import { brain as idles } from '../idles';
import { brain as randomChatter } from '../random-chatter';
import { brain as greets } from '../greets';
import { brain as reacts } from '../reacts';
import { brain as wanders } from '../wanders';
import { brain as patrols } from '../patrols';
import { brain as shifts } from '../shifts';
import type { Stuff } from '../../stuff/Stuff';

function fakeCtx(
  config: Record<string, unknown>,
  perceived?: BrainContext['perceived']
): BrainContext & {
  say: ReturnType<typeof vi.fn>;
  emote: ReturnType<typeof vi.fn>;
  emoteFree: ReturnType<typeof vi.fn>;
} {
  const host = { stuffId: 'host-1' } as unknown as Stuff;
  return {
    host,
    config,
    state: {},
    perceived,
    trigger: { source: 'cadence', raw: 'cadence:1s' },
    say: vi.fn(),
    emote: vi.fn(async () => undefined),
    emoteFree: vi.fn(),
  };
}

describe('idles brain', () => {
  it('samples a say entry from the pool', () => {
    const ctx = fakeCtx({ pool: [{ kind: 'say', value: 'hi' }] });
    void idles.act(ctx);
    expect(ctx.say).toHaveBeenCalledWith('hi');
  });

  it('samples an emote entry', () => {
    const ctx = fakeCtx({ pool: [{ kind: 'emote', value: 'wave' }] });
    void idles.act(ctx);
    expect(ctx.emote).toHaveBeenCalledWith('wave');
  });

  it('defaults unknown kind to a free-form emote', () => {
    const ctx = fakeCtx({ pool: [{ value: 'polishes a glass' }] });
    void idles.act(ctx);
    expect(ctx.emoteFree).toHaveBeenCalledWith('polishes a glass');
  });

  it('no-ops on an empty pool', () => {
    const ctx = fakeCtx({ pool: [] });
    void idles.act(ctx);
    expect(ctx.say).not.toHaveBeenCalled();
    expect(ctx.emoteFree).not.toHaveBeenCalled();
  });

  it('declares the label and no slot claims', () => {
    expect(idles.label).toBe('idles');
    expect((idles as BrainStatics).claims).toBeUndefined();
  });
});

describe('random-chatter brain', () => {
  it('says a line from the list and claims voice', () => {
    const ctx = fakeCtx({ lines: ['nice weather'] });
    randomChatter.act(ctx);
    expect(ctx.say).toHaveBeenCalledWith('nice weather');
    expect(randomChatter.claims).toEqual(['voice']);
  });

  it('no-ops with no lines', () => {
    const ctx = fakeCtx({ lines: [] });
    randomChatter.act(ctx);
    expect(ctx.say).not.toHaveBeenCalled();
  });
});

describe('greets brain', () => {
  it('greets the arriving subject and claims attention', () => {
    const subject = { stuffId: 'player-1' } as unknown as Stuff;
    const ctx = fakeCtx(
      { lines: ['welcome in'] },
      { frame: { topic: 'world.narration.movement' } as never, subject }
    );
    greets.act(ctx);
    expect(ctx.say).toHaveBeenCalledWith('welcome in', subject);
    expect(greets.claims).toEqual(['attention']);
  });
});

describe('reacts brain', () => {
  it('emotes back at the perceived actor', () => {
    const subject = { stuffId: 'player-1' } as unknown as Stuff;
    const ctx = fakeCtx(
      { reactions: [{ emote: 'nod' }] },
      { frame: { topic: 'world.expression.emote' } as never, subject }
    );
    void reacts.act(ctx);
    expect(ctx.emote).toHaveBeenCalledWith('nod', subject);
  });

  it('falls back to a spoken response', () => {
    const ctx = fakeCtx(
      { reactions: [{ respond: 'ha!' }] },
      { frame: {} as never, subject: { stuffId: 'p' } as unknown as Stuff }
    );
    void reacts.act(ctx);
    expect(ctx.say).toHaveBeenCalledWith('ha!', expect.anything());
  });
});

describe('movement brains guard on host mixins', () => {
  it('wanders no-ops against a non-Mobile host', async () => {
    const ctx = fakeCtx({ avoid: [] });
    await wanders.act(ctx);
    expect(wanders.claims).toEqual(['body']);
    expect(wanders.requiresFree).toEqual(['attention']);
  });

  it('patrols no-ops against a non-Mobile host', async () => {
    const ctx = fakeCtx({ route: ['north'] });
    await patrols.act(ctx);
    expect(patrols.requiresFree).toEqual(['attention']);
  });

  it('shifts is not presence-gated and no-ops without Mobile', () => {
    const ctx = fakeCtx({ schedule: [] });
    shifts.act(ctx);
    expect(shifts.presenceGated).toBe(false);
  });
});
