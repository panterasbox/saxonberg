/**
 * StandingController — the self-view render. Asserts it surfaces the
 * influence BAND (register D6) and the qualitative participation/regard
 * lines, and that it leaks NO raw scalar (no digits) — the precise number
 * is reserved for the eventual ballot, never shown.
 *
 * The three faucet reads are stubbed; the emitted scene body is captured
 * by stubbing `MessageApi.scene`.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import StandingController from '../StandingController';
import { ConsumerApi } from '../../../../api/consumer';
import { RenownApi } from '../../../../api/renown';
import { InfluenceApi } from '../../../../api/influence';
import { Band } from '../../../../lib/standing/Band';
import { MessageApi } from '../../../../api/message';
import { Mml } from '../../../../api/mml';
import { Idea } from '../../../../lib/stuff/Idea';
import { StuffApi } from '../../../../api/stuff';
import {
  makeStuff,
  makeStuffAtPath,
} from '../../../../lib/security/__tests__/test-setup';
import type { CommandContext, CommandModel } from '../../../../api/command';

class Actor extends Idea {}

let captured: Mml | null;

function captureBody(): void {
  captured = null;
  vi.spyOn(MessageApi, 'scene').mockImplementation(() => {
    const b: Record<string, unknown> = {};
    b.topic = () => b;
    b.toSelf = (body: Mml) => {
      captured = body;
      return b;
    };
    b.send = () => {};
    return b as never;
  });
}

function ctxFor(actor: Idea): CommandContext {
  return { commandGiver: actor as never, note: vi.fn() } as unknown as CommandContext;
}

beforeEach(() => captureBody());
afterEach(() => {
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

describe('StandingController render', () => {
  it('shows the influence band and qualitative lines, with no raw scalar', async () => {
    vi.spyOn(ConsumerApi, 'participationOf').mockReturnValue(10);
    vi.spyOn(RenownApi, 'renownOf').mockReturnValue(2);
    vi.spyOn(InfluenceApi, 'bandOf').mockReturnValue(Band.of('established'));

    const actor = makeStuffAtPath(() => new Actor(), '/obj/Avatar/render');
    const ctrl = makeStuff(() => new StandingController());
    await ctrl.execute({} as CommandModel, ctxFor(actor));

    const body = captured!.toString();
    expect(body).toContain('established'); // the band
    expect(body).toContain('show up'); // positive participation line
    expect(body).toContain('regards you well'); // positive renown line
    // Register D6: a band, never a grindable number — no digits leak.
    expect(/\d/.test(body)).toBe(false);
  });

  it('reads the not-shown-up + no-view lines at zero', async () => {
    vi.spyOn(ConsumerApi, 'participationOf').mockReturnValue(0);
    vi.spyOn(RenownApi, 'renownOf').mockReturnValue(0);
    vi.spyOn(InfluenceApi, 'bandOf').mockReturnValue(Band.of('dormant'));

    const actor = makeStuffAtPath(() => new Actor(), '/obj/Avatar/zero');
    const ctrl = makeStuff(() => new StandingController());
    await ctrl.execute({} as CommandModel, ctxFor(actor));

    const body = captured!.toString();
    expect(body).toContain('dormant');
    expect(body).toContain('not yet shown up');
    expect(body).toContain('yet to form a view');
  });

  it('shows all three stocks (play / make / fund) as distinct bands', async () => {
    vi.spyOn(ConsumerApi, 'participationOf').mockReturnValue(3);
    vi.spyOn(RenownApi, 'renownOf').mockReturnValue(1);
    // Stock-aware: consumer (play) vs producer (make) read different bands.
    vi.spyOn(InfluenceApi, 'bandOf').mockImplementation((_id, stock) =>
      stock === 'producer' ? Band.of('pillar') : Band.of('familiar')
    );

    const actor = makeStuffAtPath(() => new Actor(), '/obj/Avatar/three');
    const ctrl = makeStuff(() => new StandingController());
    await ctrl.execute({} as CommandModel, ctxFor(actor));

    const body = captured!.toString();
    expect(body).toContain('Play');
    expect(body).toContain('familiar'); // consumer (play) band
    expect(body).toContain('Make');
    expect(body).toContain('pillar'); // producer (make) band
    expect(body).toContain('Fund');
    expect(body).toContain('not yet earnable'); // patron intake-gated
    expect(/\d/.test(body)).toBe(false); // still no raw scalar
  });
});
