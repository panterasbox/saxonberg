/**
 * Avatar.enter — the news-ticker window on the session-establish payload.
 *
 * Releases have no presence event to hang a snapshot on, so the welcome
 * `session.link` payload is the delivery seam (exactly as
 * `topicCatalogue` is). This asserts `enter()` folds the live ticker window
 * (projected to `ReleaseRow[]` via `PressApi.toRow`) into
 * `ConnectionEstablishedPayload.releaseWindow`.
 *
 * Mirrors the enter-test harness in `Avatar.test.ts`: getContainer /
 * startAutoSave / EventApi.emit / MessageApi.scene are stubbed; the scene
 * spy captures the `.payload()` argument. `PressApi.recent` is stubbed so
 * the window has a known row independent of a live board.
 */

import "../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Avatar from '../agent/Avatar';
import Interactive from '../idea/Interactive';
import { Release } from '../../lib/press/Release';
import { PressApi } from '../../api/press';
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

function makeRelease(id: string): Release {
  return Release.of(`/compact/press/feed/${id}`, '/compact/press', {
    releaseId: id,
    kind: 'changelog',
    headline: 'Server up',
    body: 'patch notes',
    author: '/platform/agent/Avatar/staff',
    publishedAt: 1234,
    expiresAt: 0,
    pinned: true,
    retracted: false,
    visibility: null,
    source: '',
  });
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

describe('Avatar.enter — releaseWindow', () => {
  it('folds the projected ticker window into the welcome payload', async () => {
    vi.spyOn(PressApi, 'recent').mockReturnValue([makeRelease('b1')]);

    const avatar = makeAvatar('enter-bw');
    vi.spyOn(avatar, 'getContainer').mockReturnValue({
      stuffId: 's',
      getPresentation: () => 'somewhere',
      getTemplatePath: () => null,
      getIdentityPath: () => null,
    } as never);
    vi.spyOn(avatar, 'startAutoSave').mockImplementation(() => {});

    await avatar.enter(fakeInteractive() as unknown as Interactive);

    expect(captured).not.toBeNull();
    expect(Array.isArray(captured!.releaseWindow)).toBe(true);
    expect(captured!.releaseWindow).toHaveLength(1);
    const row = captured!.releaseWindow[0]!;
    expect(row.releaseId).toBe('b1');
    expect(row.headline).toBe('Server up');
    expect(row.realm).toBe('ooc');
    expect(row.kind).toBe('changelog');
    expect(row.pinned).toBe(true);
    expect(row.author).toBe('/platform/agent/Avatar/staff');
    expect(row.publishedAt).toBe(1234);
  });

  it('carries an empty window when nothing is published', async () => {
    vi.spyOn(PressApi, 'recent').mockReturnValue([]);

    const avatar = makeAvatar('enter-bw-empty');
    vi.spyOn(avatar, 'getContainer').mockReturnValue({
      stuffId: 's',
      getPresentation: () => 'somewhere',
      getTemplatePath: () => null,
      getIdentityPath: () => null,
    } as never);
    vi.spyOn(avatar, 'startAutoSave').mockImplementation(() => {});

    await avatar.enter(fakeInteractive() as unknown as Interactive);

    expect(captured).not.toBeNull();
    expect(captured!.releaseWindow).toEqual([]);
  });
});
