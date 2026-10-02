/**
 * ⭐⭐ **Who fills a player body's memory, and when — the three facts that
 * let `Avatar.enter`'s `hydrateBeliefs()` call be deleted.**
 *
 * W5 gave `BeliefStoreMixin` a declared `hydrationSource`, driven by the
 * clone pipeline at mint. `Avatar.enter` had been calling
 * `hydrateBeliefs()` since the belief store shipped. For one wave both
 * ran, and the MR flagged it as a redundancy to tidy later.
 *
 * Reviewed 2026-10-02 and deleted instead — but ⚠ **the failure mode if
 * the premise is wrong is the silent one.** `adjustRegard` is a
 * read-modify-write off the in-memory map with a write-through to Mongo:
 * a body entered with an unfilled map answers `regardFor → 0`, the next
 * nudge computes `0 + 1`, and a stored `12` is overwritten by a `1`. Not
 * "you see strangers for a session" — *your relationships get overwritten
 * with values derived from zero.* So the premise is pinned here as three
 * separate facts rather than argued in a commit message:
 *
 *   **F1** the pipeline runs a declared source at mint, AFTER the identity
 *          stamp (so `viewerKey` can see it) — `hydration-source.test.ts`
 *          owns the ordering; the identity case is here;
 *   **F2** a real `PrimaryAvatar` is a `viewerKey` ROW 2 host — persistable
 *          but not key-explicit, identity ≠ templatePath — so its source
 *          reads the collection instead of skipping;
 *   **F3** the map is cleared ONLY on destruct, so any `enter` on a body
 *          the pipeline did not just mint finds it already populated.
 *
 * F1 ∧ F2 ∧ F3 ⇒ at every `enter`, the beliefs are there. Break any one
 * of these and the deletion is wrong; that is why they are three tests and
 * not one.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BeliefStoreMixin, REGARD } from '../BeliefStore';
import BeliefDocument from '../BeliefDocument';
import Avatar from '../../../platform/agent/PrimaryAvatar';
import { Idea } from '../../stuff/Idea';
import { StuffApi } from '../../../api/stuff';
import { MixinApi } from '../../../api/mixin';
import { PersistenceManager } from '../../../../backend/PersistenceManager';
import {
  makeStuffAtPath,
  withRootContext,
} from '../../security/__tests__/test-setup';

/** The `beliefs` collection, in memory. */
let rows: Record<string, unknown>[] = [];

function installStore(): void {
  const pm = PersistenceManager.get();
  vi.spyOn(pm, 'isConnected').mockReturnValue(true);
  vi.spyOn(pm, 'find').mockImplementation(
    async (_c: string, q: Record<string, unknown>) =>
      rows.filter((r) =>
        Object.entries(q).every(([k, v]) => r[k] === v),
      ) as never,
  );
  vi.spyOn(pm, 'save').mockImplementation(async () => 'id-1');
}

/** A stored opinion for `viewerId` about `referent`. */
function storedRegard(viewerId: string, referent: string, regard: number): void {
  rows.push({
    _id: `b${rows.length + 1}`,
    viewerId,
    realm: REGARD,
    referent,
    payload: { regard },
    knownAs: null,
  });
}

class Viewer extends BeliefStoreMixin(Idea) {}

beforeEach(() => {
  rows = [];
  StuffApi.clearAll();
  installStore();
});
afterEach(() => {
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

describe('F2 — a real PrimaryAvatar is a `viewerKey` ROW 2 host', () => {
  it('⭐⭐ is persistable, NOT key-explicit, and identity ≠ templatePath', async () => {
    // These three properties are the *only* inputs `viewerKey` uses to
    // decide between "its beliefs live in the collection" (row 2 — read
    // at mint) and "it keeps its own record" / "memory only" (rows 1 and
    // 4 — skipped at mint). Asserted on the SHIPPED class, because a
    // stand-in composing `BeliefStoreMixin` would answer for itself and
    // not for an avatar.
    const body = makeStuffAtPath(
      () => new Avatar(),
      Avatar.ROW_TEMPLATE_PATH,
      Avatar.getTemplatePath('pid-row2'),
    );

    expect(MixinApi.isPersistable(body)).toBe(true);
    // ⚠ The one that would flip the answer: an explicit key means
    // multi-instance, which routes beliefs into the host's OWN record
    // (row 1) and makes the collection read a skip.
    expect(body.isPersistenceKeyExplicit()).toBe(false);
    // Row 2's test: a minted identity distinct from the shared seed row.
    expect(body.getIdentityPath()).not.toBe(body.getTemplatePath());
    expect(body.getIdentityPath()).toBe(Avatar.getTemplatePath('pid-row2'));
  });

  it('⭐ so its source HYDRATES rather than skipping', async () => {
    const body = makeStuffAtPath(
      () => new Avatar(),
      Avatar.ROW_TEMPLATE_PATH,
      Avatar.getTemplatePath('pid-row2b'),
    );
    const outcome = await Viewer.hydrateFromSource(body as never);
    expect(outcome.status).toBe('hydrated');
  });
});

describe('F1 (identity case) — the pipeline fills a minted-identity host at mint', () => {
  it('⭐⭐ a body with a stored opinion comes OUT of the pipeline holding it', async () => {
    const identity = '/platform/agent/Avatar/pid-mint';
    const subject = makeStuffAtPath(() => new Idea(), '/obj/npc/gus-mint');
    storedRegard(identity, subject.getIdentityPath()!, 12);

    // The real pipeline: `create` runs `#registerAndInit`, which runs the
    // source driver between the content step and `onCreate` — the same
    // call `clone` makes. The identity has to be on the host before the
    // driver runs, which is what `makeStuffAtPath`'s third argument gives
    // and what `clone` does via `asIdentityPath` BEFORE
    // `#registerAndInit` (api/stuff.ts).
    const body = makeStuffAtPath(
      () => new Viewer(),
      '/platform/agent/Avatar',
      identity,
    );
    // Drive the source exactly as the pipeline does.
    const outcome = await Viewer.hydrateFromSource(body as never);
    expect(outcome.status).toBe('hydrated');

    // ⬇ The assertion that can fail, and the one the deletion rests on.
    expect(body.regardFor(subject)).toBe(12);
  });

  it('⚠ and a body with NOTHING stored reads 0 — the honest empty', async () => {
    const subject = makeStuffAtPath(() => new Idea(), '/obj/npc/gus-empty');
    const body = makeStuffAtPath(
      () => new Viewer(),
      '/platform/agent/Avatar',
      '/platform/agent/Avatar/pid-empty',
    );
    await Viewer.hydrateFromSource(body as never);
    expect(body.regardFor(subject)).toBe(0);
  });
});

describe('F3 — the map is cleared ONLY on destruct', () => {
  it('⭐⭐ so a body the pipeline did not just mint still holds its memory', async () => {
    // This is the multiplexing / reconnect case, which is the whole
    // reason `enter` had the call: `PlayerLogic.loadAvatarsForUser`
    // REUSES a registered body rather than cloning it, so nothing mints
    // and nothing re-reads. The memory is there because it was never
    // taken away.
    const identity = '/platform/agent/Avatar/pid-reuse';
    const subject = makeStuffAtPath(() => new Idea(), '/obj/npc/gus-reuse');
    storedRegard(identity, subject.getIdentityPath()!, 7);

    const body = makeStuffAtPath(
      () => new Viewer(),
      '/platform/agent/Avatar',
      identity,
    );
    await Viewer.hydrateFromSource(body as never);
    expect(body.regardFor(subject)).toBe(7);

    // Everything short of destruct: the store goes away, a second
    // "session" attaches, nothing re-reads. The map is untouched.
    rows = [];
    expect(body.regardFor(subject)).toBe(7);
  });

  it('⚠ and `evictAndFlushBeliefs` is what empties it — the one caller is onDestruct', async () => {
    const identity = '/platform/agent/Avatar/pid-evict';
    const subject = makeStuffAtPath(() => new Idea(), '/obj/npc/gus-evict');
    storedRegard(identity, subject.getIdentityPath()!, 5);
    const body = makeStuffAtPath(
      () => new Viewer(),
      '/platform/agent/Avatar',
      identity,
    );
    await Viewer.hydrateFromSource(body as never);
    expect(body.regardFor(subject)).toBe(5);

    // ⭐ The ONLY production path that clears the map (grep
    // `clearBeliefs()`: one call site, inside this method, called once —
    // from `Avatar.onDestruct`). After it, a body would need a fresh
    // source read — which is exactly what a re-mint does.
    //
    // ⚠ Driven through the root-context seam because the method is
    // `SelfOnly`: in production its caller is the host's own
    // `onDestruct`, and a test calling it from outside is denied. That
    // gate is itself part of the fact being pinned — nothing but the host
    // can empty its own memory.
    await withRootContext(body, 'onDestruct', () =>
      body.evictAndFlushBeliefs(),
    );
    expect(body.regardFor(subject)).toBe(0);
  });
});

describe('⚠⚠ the failure mode the deletion risks, pinned so its shape is on record', () => {
  it('an UNFILLED map makes adjustRegard overwrite a stored opinion with a value derived from zero', async () => {
    const identity = '/platform/agent/Avatar/pid-loss';
    const subject = makeStuffAtPath(() => new Idea(), '/obj/npc/gus-loss');
    storedRegard(identity, subject.getIdentityPath()!, 12);

    const body = makeStuffAtPath(
      () => new Viewer(),
      '/platform/agent/Avatar',
      identity,
    );
    // ⚠ Deliberately NOT hydrated — this is the state F1–F3 exist to
    // prove unreachable.
    expect(body.regardFor(subject)).toBe(0);
    body.adjustRegard(subject, 1);

    // 12 became 1. This is why the premise got three tests instead of a
    // paragraph: the loss is silent, and `regardFor` was never wrong —
    // it answered honestly about a map nobody had filled.
    expect(body.regardFor(subject)).toBe(1);
  });
});
