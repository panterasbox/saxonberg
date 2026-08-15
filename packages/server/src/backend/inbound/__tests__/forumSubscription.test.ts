/**
 * The inbound `forum-subscribe` shape-check.
 *
 * ⚠⚠ **This file exists because the scope vocabulary had a second copy,
 * and adding a kind to the type did not add it here.**
 *
 * `subjects` was added to `ForumSubscriptionScope`, to the registry's
 * validation, to its projection and to its dependency index — and the
 * subject rail still rendered nothing, because this handler listed the
 * kinds *literally* and **returned silently** on anything else. The
 * client subscribed, the server dropped the message with no error
 * envelope, and the rail sat on its empty state reading
 *
 *     No subjects you can see yet.
 *
 * over four subjects that existed. Nothing failed. **The failure WAS the
 * silence** — an honest empty state is indistinguishable from a dropped
 * message, which is precisely what makes this class of bug survive.
 *
 * Found by driving. The fix derives the list from `FORUM_SCOPE_KINDS`;
 * this test is what stops it being re-hardcoded.
 */

import '../../../test-bootstrap';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FORUM_SCOPE_KINDS } from '@saxonberg/types';
import { ForumsApi } from '../../../mud/api/forums';
import { handleForumSubscribe } from '../forumSubscription';
import type { HandlerContext } from '../index';

const ctx = { interactive: {} } as unknown as HandlerContext;

function message(scope: unknown) {
  return {
    type: 'forum-subscribe',
    payload: { subscriptionId: 'sub-1', scope },
  } as never;
}

let subscribe: ReturnType<typeof vi.fn>;

beforeEach(() => {
  subscribe = vi.fn().mockResolvedValue(undefined);
  vi.spyOn(ForumsApi, 'handleSubscribe').mockImplementation(
    subscribe as never,
  );
});
afterEach(() => vi.restoreAllMocks());

describe('forum-subscribe scope admission', () => {
  it.each(FORUM_SCOPE_KINDS)('admits every declared kind — %s', (kind) => {
    handleForumSubscribe(ctx, message({ kind, id: '' }));
    expect(subscribe).toHaveBeenCalledTimes(1);
    expect(subscribe.mock.calls[0]![0]).toMatchObject({
      scope: { kind },
    });
  });

  it('⭐ admits EVERY kind the type declares, with none missing', () => {
    // The assertion that would have caught the original bug: not "does
    // it admit the four I remembered" but "does it admit the vocabulary".
    for (const kind of FORUM_SCOPE_KINDS) {
      subscribe.mockClear();
      handleForumSubscribe(ctx, message({ kind, id: '' }));
      expect(subscribe, `scope kind '${kind}' was dropped`).toHaveBeenCalled();
    }
  });

  it('still drops an unknown kind', () => {
    handleForumSubscribe(ctx, message({ kind: 'nonsense', id: '' }));
    expect(subscribe).not.toHaveBeenCalled();
  });

  it('still drops a malformed scope', () => {
    handleForumSubscribe(ctx, message(undefined));
    handleForumSubscribe(ctx, message({ kind: 'board' }));
    handleForumSubscribe(ctx, message({ kind: 'board', id: 7 }));
    expect(subscribe).not.toHaveBeenCalled();
  });
});
