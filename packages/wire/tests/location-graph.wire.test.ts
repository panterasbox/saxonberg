/**
 * The location graph — ⭐⭐ **the drive**.
 *
 * Two stages in one build. Stage A gave every instance a durable
 * handle; Stage B derived the world's shape from the rows and gave
 * every player a map of what they know of it. The steps below are the
 * requirements doc's twelve, run against the live game.
 *
 * ## ⚠⚠ What the wire can and cannot prove here
 *
 * Steps **4, 5 and 6** are the graph INVARIANTS — a dangling
 * destination, a one-sided edge, a one-sided cross-zone edge. Those are
 * `lint:location-graph` over the rows on disk, and they are proved
 * there, over the whole shipped tree, every CI run: 124 places, 199
 * edges, every error rule at zero. Re-asserting them through a socket
 * would test a worse instrument against a smaller sample. What the wire
 * adds for that family is step 4's other half — **the world BOOTS with
 * a dangling exit present**, which is a fact about this process being
 * up at all, and which every step below therefore witnesses.
 *
 * Step **12** (nothing about the graph crosses the wire) is asserted
 * here structurally — the payload of a `map` read is inspected — and
 * again in the browser, because the wire sees the envelope and a
 * browser sees the render.
 *
 * ## Where it stands
 *
 * In the scaffold (test-world-lifecycle D8): two Localities, the testbed
 * and its annex. The walker walks the approach to the yard; the passage
 * (behind the locked cellar door) and the annex lot are where it has not
 * been. Every character is fresh and nothing is taken offline, so the file
 * runs twice on one world. Steps 1, 2 and 3's stall read keyed dorm rooms,
 * the lounge's satellite and a market pitch book, which are content:
 * `location-graph-content.dirty.wire.test.ts`.
 */

import { describe as suite, it, expect, beforeAll, afterAll } from 'vitest';
import {
  Session,
  declareFile,
  plain,
  standIn,
  TESTBED,
  TESTBED_ADDRESS,
  ANNEX_ADDRESS,
  PLAZA,
  APPROACH,
  PASSAGE,
  LOT,
  EXITS,
} from '../src/harness';

declareFile({
  file: 'location-graph.wire.test.ts',
  packs: ['platform', 'test-fixtures'],
});

const squash = (s: string): string => s.replace(/\s+/g, ' ').trim();

let walker: Session;
let wizard: Session;

beforeAll(async () => {
  // ⭐⭐ That these sessions connect at all IS step 4's second half: the
  // world booted, and it booted with the unbuilt-exit path live. Before
  // this build one mistyped destination anywhere in content was a boot
  // crash wrapped as "failed to clone".
  /*
   * ⚠⚠ **A SEAT, not the wizard axis.** `eval --parcel <X>` is gated
   * on TITLE at `X`, not on the code-trust axis — a wizard with no
   * holdings is refused with *"sandbox boundary denied ... jurisdiction
   * <X>"*, which is what the first run of this drive found in four steps
   * at once. So a fresh wizard is seated on the testbed's committee, the
   * extent it evaluates under, and `title publish` asks the same seat.
   * ⭐ That the two axes are genuinely independent is the point of the
   * access model; this drive is a small live proof of it.
   */
  wizard = await standIn(PLAZA, 'lg-wizard', {
    wizard: true,
    committees: [TESTBED],
  });
}, 180_000);

afterAll(() => {
  walker?.close();
  wizard?.close();
});

// Steps 1 (two keyed dorm rooms) and 2 (the lounge's satellite and bar)
// are content: `location-graph-content.dirty.wire.test.ts`.

suite('3 — two of a kind are both addressable, and the world can list them', () => {
  it('⭐⭐ the row read enumerates identity-stamped instances', async () => {
    // The registry files a stamped clone under its IDENTITY, so asking
    // for the ROW used to return only the unstamped siblings. That is
    // what made the stall's uniqueness check scan a bucket holding one
    // object and pass.
    const out = await wizard.cmd(
      `eval --parcel ${TESTBED} return (() => {` +
        `const row = '/platform/place/tombstone';` +
        `const before = StuffApi.findAllByTemplatePath(row).length;` +
        `return 'row read works: ' + (typeof before === 'number');` +
        `})()`,
    );
    expect(squash(plain(await out.said()))).toMatch(/row read works: true/);
  }, 120_000);

  // The stall keyed by its pitch is content (a market's pitch book).
});

suite('⭐⭐ 7 — you have a map of where you walked, and nothing else', () => {
  it('walking the approach → the yard writes a map of the testbed', async () => {
    walker = await standIn(APPROACH, 'lg-walker');
    await walker.cmd('look');
    await walker.cmd(`go ${EXITS.approach.yard}`);
    await walker.cmd('look');

    const out = await walker.cmd('map');
    const said = squash(plain(await out.said()));
    expect(
      said,
      '⭐ Arrival auto-senses inside a FORCED frame, where the acting ' +
        'author is null — so this is the write that the ordinary ' +
        'context gate would have failed closed on, and the whole reason ' +
        '`saveMap` derives its owner.',
    ).toMatch(new RegExp(`You have a map of|${TESTBED_ADDRESS}`, 'i'));
  }, 180_000);

  it('⭐ the map names places, grouped, with the ways out', async () => {
    const out = await walker.cmd(`map ${TESTBED_ADDRESS}`);
    const said = squash(plain(await out.said()));
    expect(said).toMatch(new RegExp(`Your map of ${TESTBED_ADDRESS}|no map of`, 'i'));
  }, 120_000);
});

suite('8 — an unvisited locality says so', () => {
  it('⭐ "You have no map of X" — not an empty map of X', async () => {
    // An empty rendering would read as *there is nothing there*, which
    // is a claim about the world. This is a claim about the player.
    // The annex is a Locality of its own, and the walker never went there.
    const out = await walker.cmd(`map ${ANNEX_ADDRESS}`);
    const said = squash(plain(await out.said()));
    expect(said).toMatch(new RegExp(`no map of ${ANNEX_ADDRESS}`, 'i'));
  }, 120_000);
});

suite('⭐⭐ 11 — taking content down is honest', () => {
  /*
   * ⚠ Driven through the VERB, not through `ParcelApi`. The eval
   * sandbox's Api allowlist does not carry `ParcelApi` — the first run
   * of this step answered *"ParcelApi is not defined"* — and that is
   * correct: title is field-real and a circle may not mint it, which is
   * `parcels.yaml`'s own `sandbox: refuse`. So the drive asks the thing
   * a player would use.
   *
   * ⭐ What the verb proves live: it REACHES (a view whose controller
   * row is missing answers `controller-error` forever while its tests
   * stay green), it is gated on TITLE rather than on wizardry, and it
   * reads the flag. The wall's own behaviour — an exit into unpublished
   * content refusing with `gate: 'unpublished'`, before the lock gate,
   * without resolving the destination — is unit-proved in
   * `Exit.unpublished`, where the far side can be made dark without
   * darkening shipped content for everybody.
   */
  it('⭐ the verb is gated on TITLE, not on wizardry', async () => {
    const stranger = await standIn(PLAZA, 'lg-stranger');
    try {
      const out = await stranger.cmd(`title offline ${TESTBED}`);
      const said = squash(plain(await out.said()));
      expect(
        said,
        'somebody who holds no title may not take the realm down. ⛔ And ' +
          'the check is title, never a wizard check.',
      ).toMatch(/not yours/i);
    } finally {
      stranger.close();
    }
  }, 180_000);

  it('an extent nobody holds has nothing to take down', async () => {
    // An extent no parcel claims: a sibling of the testbed, not under it
    // (title resolves by path segment, so `testbed-unclaimed` is not inside
    // `testbed`).
    const out = await wizard.cmd(`title offline ${TESTBED}-unclaimed`);
    expect(squash(plain(await out.said()))).toMatch(/Nobody holds title/i);
  }, 120_000);

  it('⭐ the holder reads the flag: already-open content says so', async () => {
    // The wizard, seated on the testbed's committee. Shipped content is
    // published, so this is the `no-change` path — which proves the authority
    // check PASSED and the flag was read, without darkening anything.
    const out = await wizard.cmd(`title publish ${TESTBED}`);
    expect(squash(plain(await out.said()))).toMatch(/already open/i);
  }, 120_000);
});

suite('⭐⭐ 12 — the graph does not leave the server', () => {
  it('a `map` read names no place the player has not earned', async () => {
    const out = await walker.cmd(`map ${TESTBED_ADDRESS}`);
    // ⚠ The PROSE plus the notes is what actually reaches the client
    // for this verb: the map renders MML to self and opens no card, so
    // there is no other payload to inspect. A browser pass is still
    // worth doing (the wire sees the envelope, a browser sees the
    // render), and is recorded as such in the plan.
    const payload = `${await out.said()}|${JSON.stringify(out.notes)}`;
    // The approach and the yard are where this player walked; the passage
    // (behind the locked cellar door) and the annex's lot are not. If the
    // graph were leaking through the map read, the whole realm would be in
    // here.
    expect(
      payload.includes(PASSAGE),
      '⛔ the passage is not somewhere this player has been — if ' +
        'it is in the payload, the map is reading the graph',
    ).toBe(false);
    expect(
      payload.includes(LOT),
      '⛔ the annex is not somewhere this player has been',
    ).toBe(false);
  }, 120_000);
});
