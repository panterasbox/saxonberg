/**
 * CmsSession bridge — resolves the session's loaded Avatar and runs the
 * op inside a `runRoot` frame.
 *
 * `User.findById` and `PlayerApi.findAvatarByPlayerId` are stubbed (no
 * Mongo, no live world); we assert (1) the resolved actor identity and
 * (2) that `fn` runs under a Root frame so downstream `@CallSecurity`
 * gates resolve.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import type { Request } from 'express';
import { CmsSession } from '../CmsSession';
import { User } from '../../mud/lib/identity/User';
import { PlayerApi } from '../../mud/api/player';
import {
  ExecutionContextApi,
  FrameKind,
} from '../../mud/api/execution-context';
import type Avatar from '../../mud/obj/Avatar';

/** Build a minimal Request carrying a passport session principal. */
function reqWithUser(userId: string | null): Request {
  return {
    session: userId
      ? { passport: { user: { id: userId } } }
      : ({} as Record<string, unknown>),
  } as unknown as Request;
}

/** A fake User with the given owned playerIds. */
function fakeUser(playerIds: string[]): User {
  const u = new User();
  u.playerIds = playerIds;
  return u;
}

describe('CmsSession.runAsSessionPlayer', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('resolves the session Avatar and runs fn under a Root frame', async () => {
    const avatar = { _marker: 'avatar' } as unknown as Avatar;
    vi.spyOn(User, 'findById').mockResolvedValue(fakeUser(['p-1']));
    vi.spyOn(PlayerApi, 'findAvatarByPlayerId').mockImplementation((pid) =>
      pid === 'p-1' ? avatar : undefined
    );

    let seenActor: unknown = undefined;
    let rootSeen = false;
    const out = await CmsSession.runAsSessionPlayer(
      reqWithUser('u-1'),
      'cms.test',
      async () => {
        // The fn gets NO actor argument — it derives the acting principal
        // from context (the bridge stamped it via tagActingAuthor).
        seenActor = ExecutionContextApi.getActingAuthor();
        rootSeen =
          ExecutionContextApi.findFrame(FrameKind.Root) !== null;
        return 'ok';
      }
    );

    expect(out).toBe('ok');
    expect(seenActor).toBe(avatar);
    expect(rootSeen).toBe(true);
    expect(PlayerApi.findAvatarByPlayerId).toHaveBeenCalledWith('p-1');
  });

  it('resolves actor=null when no Avatar is loaded for the user', async () => {
    vi.spyOn(User, 'findById').mockResolvedValue(fakeUser(['p-1']));
    vi.spyOn(PlayerApi, 'findAvatarByPlayerId').mockReturnValue(undefined);

    const actor = await CmsSession.runAsSessionPlayer(
      reqWithUser('u-1'),
      'cms.test',
      async () => ExecutionContextApi.getActingAuthor()
    );
    expect(actor).toBeNull();
  });

  it('resolves actor=null when the session is unauthenticated', async () => {
    const findById = vi.spyOn(User, 'findById');
    const actor = await CmsSession.runAsSessionPlayer(
      reqWithUser(null),
      'cms.test',
      async () => ExecutionContextApi.getActingAuthor()
    );
    expect(actor).toBeNull();
    expect(findById).not.toHaveBeenCalled();
  });

  it('resolves actor=null for an anonymous (guest) principal', async () => {
    const findById = vi.spyOn(User, 'findById');
    const actor = await CmsSession.runAsSessionPlayer(
      reqWithUser(`${User.ANONYMOUS_PREFIX}abc`),
      'cms.test',
      async () => ExecutionContextApi.getActingAuthor()
    );
    expect(actor).toBeNull();
    expect(findById).not.toHaveBeenCalled();
  });

  it('picks the first owned playerId that has a loaded Avatar', async () => {
    const avatar = { _marker: 'second' } as unknown as Avatar;
    vi.spyOn(User, 'findById').mockResolvedValue(fakeUser(['p-1', 'p-2']));
    vi.spyOn(PlayerApi, 'findAvatarByPlayerId').mockImplementation((pid) =>
      pid === 'p-2' ? avatar : undefined
    );

    const actor = await CmsSession.runAsSessionPlayer(
      reqWithUser('u-1'),
      'cms.test',
      async () => ExecutionContextApi.getActingAuthor()
    );
    expect(actor).toBe(avatar);
  });
});
