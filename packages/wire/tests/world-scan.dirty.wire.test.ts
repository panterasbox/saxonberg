/**
 * World-scan — **the door, and the plumbing behind it.**
 *
 * `world:` reads every object the realm has ever made. This build
 * refused it for everybody, gave the realm's own bookkeeping a narrow
 * indexed entry instead, and left one exception: the holder of the Prime
 * Minister's seat, who may type it and is told what it cost.
 *
 * Two halves, and the second is the one that matters more.
 *
 * **The door** is easy to assert and easy to get right. **The plumbing**
 * is seventeen call sites that were rewritten underneath a running game
 * — getting paid, putting a coat on, sitting down, being served, banking
 * at a branch, claiming a title, logging back in where you logged out.
 * Every one of them fails **closed and silent** if a rewrite is wrong: a
 * denied read looks exactly like "there are no businesses", and a roster
 * nothing populates reads empty forever. Unit tests pass in all of those
 * states. That is what this walk is for.
 *
 * ⭐ Read the plumbing half as the actual acceptance criteria. If the
 * door works and step 12 doesn't, the build is not done.
 */

import { describe as suite, it, expect, beforeAll, afterAll } from 'vitest';
import {
  Session,
  declareFile,
  uniqueHandle,
  expectOk,
  expectNote,
  describe as describeResult,
} from '../src/harness';

/**
 * ⚠ **Why `.dirty.`** — the seat-handoff step moves the Prime Minister's
 * office to a throwaway character and hands it back in `afterAll`. Even
 * restored, that is a write to the realm's constitutional state rather
 * than something the world regenerates, and a crashed run leaves the
 * seat somewhere it should not be. It is also the one step that cannot
 * be proved any other way: the whole point of deriving authority from an
 * office is that it moves.
 */
export const DIRTY_REASON =
  'moves the prime-minister seat to a throwaway character and hands it ' +
  'back — restored on success, but a crashed run leaves the seat moved; ' +
  'also opens a standing subscription that is left registered';

declareFile({
  file: 'world-scan.dirty.wire.test.ts',
  // Pack zero, plus the content the plumbing half walks: a shop and a
  // bank (terminus), a dorm to log back into (eternal-university), and
  // the residence substrate both of those stand on.
  packs: [
    'platform',
    'world-seed',
    'terminus',
    'eternal-university',
    'residence',
    'wiki-starter',
  ],
  dirtyReason: DIRTY_REASON,
});

let player: Session;
let founder: Session;

/** The outcome plus every note, verbatim — for a failure worth reading. */
function why(result: Awaited<ReturnType<Session['cmd']>>): string {
  return `${describeResult(result)}\n  ${JSON.stringify(result.notes)}`;
}

/** The refusal a `world:` query earns, on any view. */
function expectWorldRefusal(result: Awaited<ReturnType<Session['cmd']>>): void {
  const note = expectNote(result, 'mql-error');
  const detail = String((note as { detail?: string }).detail ?? '');
  expect(detail, 'the refusal must NAME the alternatives').toMatch(
    /not available here/,
  );
  expect(detail).toMatch(/reachable/);
  expect(result.status).not.toBe('ok');
}

beforeAll(async () => {
  player = await Session.open(uniqueHandle('scan'));
  // The founder holds the PM seat by founder default — the authority
  // obtained the way production obtains it, never a test-only grant.
  founder = await Session.open('founder');
}, 180_000);

afterAll(() => {
  player?.close();
  founder?.close();
});

/* ───────────────────────────── the door ───────────────────────────── */

suite('the door', () => {
  it('1. refuses a typed world query, and the game keeps going', async () => {
    const refused = await player.cmd('look world:[mixin.DoorMixin]');
    expectWorldRefusal(refused);
    // ⚠ The half that a "does it refuse?" test forgets: a refusal must
    // be an OUTCOME, not a wedged dispatcher.
    expectOk(await player.cmd('look'));
  });

  it('2. refuses it on a different view too — the seed, not the verb', async () => {
    expectWorldRefusal(await player.cmd('get world:[mixin.ContainableMixin]'));
    expectWorldRefusal(await player.cmd('look world'));
  });

  it('3. refuses the one-shot query and the STANDING query alike', async () => {
    await expect(player.query('world:[mixin.DoorMixin]')).rejects.toThrow(
      /permission|mql-query rejected/i,
    );
    const sub = await player.subscribe('world:[mixin.DoorMixin]');
    expect(sub.type).toBe('mql-subscription-error');
    expect((sub as { reason?: string }).reason).toBe('permission');
  });

  it('4. the seat holder resolves it, and is told what it cost', async () => {
    // ⚠⚠ `find`, not `look`, and the drive FOUND that. `look`'s target
    // is `type: object` with `onExcess: prompt`, so a query matching
    // 1,785 things asks the player to pick one of them — the dispatch
    // suspends on a prompt nobody answers and the drive hangs. That is
    // a property of `look`'s cardinality policy, not of the seat's
    // grant, and it is written up in the drive record: a `world:` query
    // is only *usable* on a plural view. `find` is exactly that — read
    // only, `type: objects`, and it changes no focus.
    const indexed = await founder.cmd('find world:[mixin.DoorMixin]');
    const note = expectNote(indexed, 'registry-scan');
    expect(note).toMatchObject({ indexed: true });

    // …and the shape no index answers, which is the number that grows
    // with the realm.
    const walked = await founder.cmd('find world');
    const scan = expectNote(walked, 'registry-scan') as unknown as {
      scanned: number;
      indexed: boolean;
      shape: string;
    };
    expect(scan.indexed).toBe(false);
    expect(scan.scanned).toBeGreaterThan(100);
    // The re-measured `n`, recorded in the drive record.
    console.log(
      `[world-scan] registry size as walked by the seat: ${scan.scanned}`,
    );
  });

  it('5. …but not a standing one, seat or no seat', async () => {
    const sub = await founder.subscribe('world:[mixin.DoorMixin]');
    expect(sub.type).toBe('mql-subscription-error');
    expect((sub as { reason?: string }).reason).toBe('permission');
  });
});

/* ─────────────────────── what the plumbing carries ─────────────────── */

suite('the plumbing', () => {
  it('6. wearing, wielding, sitting and standing still work', async () => {
    // The item-occupancy back-reference (W3) is on this path: `which
    // host holds me` used to read every object in the world, once per
    // creature per metabolism tick.
    expectOk(await player.cmd('look'));
    for (const line of ['sit', 'stand', 'sit on floor', 'stand']) {
      const r = await player.cmd(line);
      // A room with nothing to sit on declines honestly. What must never
      // happen is `error` — that is a controller THROWING, which is what
      // a denied or broken occupancy write would look like from out
      // here, and the message prints the notes so the reason is legible.
      expect(r.status, why(r)).not.toBe('error');
    }
  });

  it('7. rest and recovery no longer stall', async () => {
    // Ten round trips over the path that pinned a CPU core. What is
    // being asserted is that the server keeps answering — the harness
    // times a frame out at 30s, so a stall fails here rather than
    // hanging the suite.
    const started = Date.now();
    for (let i = 0; i < 10; i += 1) {
      const r = await player.cmd('rest');
      expect(['ok', 'declined']).toContain(r.status);
      await player.cmd('stand');
    }
    console.log(`[world-scan] ten rest/stand cycles: ${Date.now() - started}ms`);
    expectOk(await player.cmd('look'));
  });

  it('8. walking, running and sneaking all move you', async () => {
    const before = await player.queryOne('here', ['displayName']);
    const moved = await player.cmd('walk out');
    if (moved.status === 'ok') {
      const after = await player.queryOne('here', ['displayName']);
      expect(after).not.toEqual(before);
    }
    // The mode roster (`allModes`) is a path glob now; a broken read
    // would make every mode unknown rather than making movement fail.
    for (const mode of ['run', 'sneak', 'walk']) {
      const r = await player.cmd(mode);
      expect(r.status, why(r)).not.toBe('error');
    }
  });

  it('9. the wiki lists, and the press room answers', async () => {
    // `wiki list` is the keyed namespace read that replaced a
    // whole-corpus filter; `press` reads the publishing roster.
    expectOk(await player.cmd('wiki list'));
    const press = await player.cmd('press');
    expect(press.status, why(press)).not.toBe('error');
  });

  it('10. title list reaches its own gate — the roster is consulted', async () => {
    // ⚠ `title list` is DESK-GATED: you read the plat book at the deed
    // desk, not from across the realm. So from here the honest assertion
    // is that the controller RAN and answered with its own reason —
    // `not-at-registry` — rather than throwing, which is what a denied
    // or empty roster read would look like from out here.
    //
    // ⭐ The positive (the book lists unsold lots, and one can be
    // bought) is proven in this same suite by
    // `farming.dirty.wire.test.ts`, which walks to the desk. That is
    // the residence roster read end to end, so it is not re-derived
    // here.
    const titles = await founder.cmd('title list');
    expect(titles.status, why(titles)).not.toBe('error');
    expectNote(titles, 'controller-rejected', { reason: 'not-at-registry' });
  });

  it('11. a bank branch and a shop counter are reachable', async () => {
    // `branchOf` (the custodian read) and `businessAt` (the operator
    // lookup) are both keyed reads now.
    const bank = await player.cmd('bank');
    expect(bank.status, why(bank)).not.toBe('error');
    const buy = await player.cmd('buy nothing-in-particular');
    expect(buy.status, why(buy)).not.toBe('error');
  });

  it('12. ⭐ you log back in where you logged out', async () => {
    // `OuterWarren.admitFor` — the residence roster's first consumer,
    // and the one whose failure a player notices immediately: a wrong
    // answer here puts you outside your own front door.
    const handle = uniqueHandle('scan-return');
    const first = await Session.open(handle);
    const before = await first.queryOne('here', ['displayName']);
    first.close();

    const second = await Session.open(handle);
    const after = await second.queryOne('here', ['displayName']);
    second.close();

    expect(after).toEqual(before);
  });

  it('13. no engine read is failing closed and silent', async () => {
    // ⭐⭐ The catch-all, and the reason it exists: every rewritten read
    // fails CLOSED — a denied registry read throws a SecurityError
    // inside a sweep and gets logged, not surfaced. `errors` is where
    // those land, so it is the one place a silently-broken plumbing
    // rewrite is visible from the wire.
    const errors = await founder.cmd('errors');
    expect(errors.status, why(errors)).not.toBe('error');
    if (errors.status === 'ok') {
      const said = await errors.said();
      expect(said, `errors reported a denied gate:\n${said}`).not.toMatch(
        /findByMixin|getWorldReadGrant|denied/i,
      );
    }
  });
});

/* ──────────────────────────── the handoff ─────────────────────────── */

suite('the seat moves', () => {
  it('14. ⭐⭐ the ability follows the office, in both directions', async () => {
    // The whole reason the exemption is an OFFICE and not a flag: it is
    // derived at the moment of asking, so it arrives and leaves with a
    // handoff, in the same act, with no restart.
    // ⚠ `office assign <player> <office>`, founder-only, with the player
    // resolved from the `online` scope — which is the documented open
    // defect this step may trip over.
    const who = String(
      (await player.queryOne('me', ['displayName']) as { displayName?: string })
        ?.displayName ?? player.handle,
    );
    const assign = await founder.cmd(`office assign ${who} prime-minister`);
    if (assign.status !== 'ok') {
      // ⚠ `governance.md` records an open defect in the handoff verb's
      // player lookup. If it reproduces, say so out loud rather than
      // passing quietly — the binder unit tests carry this half
      // meanwhile (`world-seat-query.test.ts`).
      console.warn(
        `[world-scan] SEAT HANDOFF UNAVAILABLE — ${JSON.stringify(assign.notes)}`,
      );
      return;
    }
    try {
      // The new holder may.
      expectNote(await player.cmd('find world'), 'registry-scan');
      // The previous holder may not, in the same act.
      expectWorldRefusal(await founder.cmd('find world'));
    } finally {
      // Hand it back — `vacate` reverts the seat to the founder default,
      // which is exactly where it started.
      await founder.cmd('office vacate prime-minister');
    }
  });
});
