/**
 * WhoController — the online roster render + filters. The roster source
 * (`PresenceApi.online`) and the per-row composer (`ProfileApi.composeRow`)
 * are stubbed; the emitted scene body is captured by stubbing
 * `MessageApi.scene` (the `StandingController` test precedent).
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import WhoController from '../WhoController';
import { PresenceApi } from '../../../../api/presence';
import { ProfileApi, type RosterRow } from '../../../../api/profile';
import { MessageApi } from '../../../../api/message';
import { Mml } from '../../../../api/mml';
import { StuffApi } from '../../../../api/stuff';
import { makeStuff } from '../../../../lib/security/__tests__/test-setup';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import type { CommandContext } from '../../../../api/command';

let captured: string;

function captureBody(): void {
  captured = '';
  vi.spyOn(MessageApi, 'scene').mockImplementation(() => {
    const b: Record<string, unknown> = {};
    b.topic = () => b;
    b.toSelf = (body: Mml) => {
      captured = body.toString();
      return b;
    };
    b.send = () => {};
    return b as never;
  });
}

function ctxFor(giver: Stuff): CommandContext {
  return { commandGiver: giver, note: vi.fn() } as unknown as CommandContext;
}

const ROWS: Record<string, RosterRow> = {
  mara: {
    handle: '/obj/Avatar/mara',
    header: 'Mara',
    country: 'Brazil',
    status: 'idle',
    recognized: true,
  },
  stranger: {
    handle: '/obj/Avatar/kenji',
    header: 'a tall stranger',
    country: 'Japan',
    recognized: false,
  },
};

function person(id: keyof typeof ROWS): Stuff {
  return { stuffId: id } as unknown as Stuff;
}

beforeEach(() => captureBody());
afterEach(() => {
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

describe('WhoController', () => {
  beforeEach(() => {
    vi.spyOn(PresenceApi, 'online').mockReturnValue([
      person('mara'),
      person('stranger'),
    ] as never);
    vi.spyOn(ProfileApi, 'composeRow').mockImplementation(
      async (_v, t) => ROWS[(t as { stuffId: keyof typeof ROWS }).stuffId]!
    );
  });

  it('lists every online person, lensed, with country and a notable status', async () => {
    const viewer = { stuffId: 'v1' } as unknown as Stuff;
    await makeStuff(() => new WhoController()).execute({} as never, ctxFor(viewer));
    expect(captured).toContain('Online — 2');
    expect(captured).toContain('Mara');
    expect(captured).toContain('Brazil');
    expect(captured).toContain('idle');
    expect(captured).toContain('a tall stranger');
    expect(captured).toContain('Japan');
  });

  it('--country narrows on the already-public country field', async () => {
    const viewer = { stuffId: 'v1' } as unknown as Stuff;
    await makeStuff(() => new WhoController()).execute(
      { country: 'brazil' } as never,
      ctxFor(viewer)
    );
    expect(captured).toContain('Mara');
    expect(captured).not.toContain('Japan');
  });
});
