/**
 * Avatar.enter — the news-ticker window on the session-establish payload.
 *
 * Bulletins have no presence event to hang a snapshot on, so the welcome
 * `system.connection.established` payload is the delivery seam (exactly as
 * `topicCatalogue` is). This asserts `enter()` folds the live ticker window
 * (projected to `BulletinRow[]` via `BulletinApi.toRow`) into
 * `ConnectionEstablishedPayload.bulletinWindow`.
 *
 * Mirrors the enter-test harness in `Avatar.test.ts`: getContainer /
 * startAutoSave / EventApi.emit / MessageApi.scene are stubbed; the scene
 * spy captures the `.payload()` argument. `BulletinApi.recent` is stubbed so
 * the window has a known row independent of a live board.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Avatar from '../Avatar';
import Interactive from '../Interactive';
import { Bulletin } from '../../lib/bulletin/Bulletin';
import { BulletinApi } from '../../api/bulletin';
import { makeStuff } from '../../lib/security/__tests__/test-setup';
import type { ConnectionEstablishedPayload } from '@saxonberg/types';

function makeAvatar(playerId: string): Avatar {
  const a = makeStuff(() => new Avatar());
  a.setPlayerId(playerId);
  return a;
}

function fakeInteractive(): unknown {
  return {
    stuffId: 'ix-stuffId',
    getUser: vi.fn(),
    getUserId: () => 'user-1',
    getSocketId: () => 'sock-1',
    getSessionId: () => 'sess-1',
  };
}

function makeBulletin(id: string): Bulletin {
  const b = new Bulletin();
  b.bulletinId = id;
  b.realm = 'ooc';
  b.kind = 'changelog';
  b.headline = 'Server up';
  b.body = 'patch notes';
  b.author = '/obj/Avatar/staff';
  b.publishedAt = 1234;
  b.pinned = true;
  return b;
}

let captured: ConnectionEstablishedPayload | null;

beforeEach(async () => {
  captured = null;
  const { MessageApi } = await import('../../api/message');
  const { EventApi } = await import('../../api/event');
  const send = vi.fn();
  vi.spyOn(MessageApi, 'scene').mockImplementation(
    () =>
      ({
        topic: () => ({
          toSelf: () => ({
            payload: (p: ConnectionEstablishedPayload) => {
              captured = p;
              return { send };
            },
            send,
          }),
        }),
      }) as never
  );
  vi.spyOn(EventApi, 'emit').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Avatar.enter — bulletinWindow', () => {
  it('folds the projected ticker window into the welcome payload', async () => {
    vi.spyOn(BulletinApi, 'recent').mockReturnValue([makeBulletin('b1')]);

    const avatar = makeAvatar('enter-bw');
    vi.spyOn(avatar, 'getContainer').mockReturnValue({
      stuffId: 's',
      getPresentation: () => 'somewhere',
      getTemplatePath: () => null,
    } as never);
    vi.spyOn(avatar, 'startAutoSave').mockImplementation(() => {});

    await avatar.enter(fakeInteractive() as unknown as Interactive);

    expect(captured).not.toBeNull();
    expect(Array.isArray(captured!.bulletinWindow)).toBe(true);
    expect(captured!.bulletinWindow).toHaveLength(1);
    const row = captured!.bulletinWindow[0]!;
    expect(row.bulletinId).toBe('b1');
    expect(row.headline).toBe('Server up');
    expect(row.realm).toBe('ooc');
    expect(row.kind).toBe('changelog');
    expect(row.pinned).toBe(true);
    expect(row.author).toBe('/obj/Avatar/staff');
    expect(row.publishedAt).toBe(1234);
  });

  it('carries an empty window when nothing is published', async () => {
    vi.spyOn(BulletinApi, 'recent').mockReturnValue([]);

    const avatar = makeAvatar('enter-bw-empty');
    vi.spyOn(avatar, 'getContainer').mockReturnValue({
      stuffId: 's',
      getPresentation: () => 'somewhere',
      getTemplatePath: () => null,
    } as never);
    vi.spyOn(avatar, 'startAutoSave').mockImplementation(() => {});

    await avatar.enter(fakeInteractive() as unknown as Interactive);

    expect(captured).not.toBeNull();
    expect(captured!.bulletinWindow).toEqual([]);
  });
});
