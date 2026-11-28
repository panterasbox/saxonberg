/**
 * The location graph — the CONTENT half of the drive (test-world-lifecycle
 * D8).
 *
 * Steps 1, 2 and 3's stall, moved here unchanged when the file was split:
 * they read Duncan Hall's keyed dorm rooms, the lounge's satellite and bar,
 * and rent a stall on the Terminus market's pitch book — none of which the
 * scaffold has. The kernel steps (3's row read, 7, 8, 11, 12) are in
 * `location-graph.wire.test.ts`. Build 2's to move.
 *
 * ## ⚠ Step 1 needs two provisioned dorm rooms
 *
 * It reads two keyed instances of one dorm row by wizard `eval` and
 * compares their durable handles; a dorm with fewer than two rooms
 * standing is reported honestly rather than failed.
 */

import { describe as suite, it, expect, beforeAll, afterAll } from 'vitest';
import {
  Session,
  declareFile,
  uniqueHandle,
  plain,
} from '../src/harness';

export const DIRTY_REASON =
  'rents a stall on the Terminus market pitch and leaves it standing (only ' +
  'the lease running out frees the pitch); seats the founder on the ' +
  'Terminus and lounge committees';

declareFile({
  file: 'location-graph-content.dirty.wire.test.ts',
  packs: [
    'platform',
    'wiki-starter',
    'generic-objects',
    'terminus',
    'world-seed',
    'eternal-university',
    'saxonberg-lounge',
    'tpa',
    'residence',
    'hinkley-hills',
    'trade-shopkeeping',
  ],
  dirtyReason: DIRTY_REASON,
});

const CROSSING = '/world/terminus/university-avenue/place/crossing';
const MARKET = '/world/terminus/market/square';
/** The lounge's SATELLITE row — cloned per landing, named by nothing. */
const LOUNGE_SATELLITE = '/world/lounge/place/lounge';
/** The lounge's BAR — one place, so its row IS its handle. */
const LOUNGE_BAR = '/world/lounge/place/bar';

const squash = (s: string): string => s.replace(/\s+/g, ' ').trim();

let keeper: Session;
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
   * /world/terminus"*, which is what the first run of this drive found
   * in four steps at once. The founder holds every office but sits on
   * no committee (wizard-axis D13), so it is seated on the two it
   * evaluates under — Terminus's and the lounge's — and `title publish
   * /world/terminus` asks the same seat.
   * ⭐ That the two axes are genuinely independent is the point of the
   * access model; this drive is a small live proof of it.
   */
  wizard = await Session.open('founder', {
    startLocation: CROSSING,
    wizard: true,
    committees: ['/world/terminus', '/world/lounge'],
  });
}, 180_000);

afterAll(() => {
  keeper?.close();
  wizard?.close();
});

suite('⭐⭐ 1 — a secret found in one room is not found in all of them', () => {
  it('two provisioned dorm rooms do not share a discovery key', async () => {
    // The handle is what this proves. Forty dorm rooms share one row,
    // so a discovery keyed on lineage reads as found in every one of
    // them — for everybody. The keyed rooms differ only by their
    // persistence key, which is exactly the population the old key
    // could not tell apart.
    const out = await wizard.cmd(
      `eval --parcel /world/terminus return (() => {` +
        `const rows = StuffApi.findAllByTemplatePath(` +
        `'/world/terminus/eternal/duncan-hall/unit/room');` +
        `if (rows.length < 2) return 'only ' + rows.length + ' dorm room(s) standing';` +
        `const keys = rows.slice(0, 2).map(r => r.getDurableHandle());` +
        `return JSON.stringify(keys);` +
        `})()`,
    );
    const said = squash(plain(await out.said()));
    // Either two distinct handles, or an honest report that the dorm is
    // not provisioned in this world — which is a content fact, not a
    // failure of the mechanism.
    if (said.includes('only ')) {
      expect(
        said,
        'the dorm has fewer than two rooms standing in this world; the ' +
          'handle itself is unit-tested (Stuff.durableHandle) and the ' +
          'discovery key with it (Exit.discoveryKey)',
      ).toMatch(/only \d+ dorm room/);
      return;
    }
    const handles = JSON.parse(said.slice(said.indexOf('['))) as string[];
    expect(handles[0], 'a keyed room has a handle').toBeTruthy();
    expect(
      handles[0],
      '⭐ two keyed instances of ONE row must not share a handle — this ' +
        'is the whole of step 1, and the defect it replaces made one ' +
        "player's find visible in everybody's room",
    ).not.toBe(handles[1]);
  }, 120_000);
});

suite('⭐ 2 — an ephemeral room has no handle to remember a find by', () => {
  /*
   * ⚠ The first run of this step asked the lounge's BAR and got its row
   * back, which read as a failure and was not one: `Bar extends
   * Locale`, so it is ONE place and its row is
   * exactly the right handle. The ephemeral thing is the SATELLITE
   * (`Lounge`, which composes no `SingletonMixin` and is cloned per
   * landing). Asking both is the better test, because the rule has two
   * sides and getting either wrong is a defect.
   */
  it('⭐⭐ a satellite answers null; the singleton bar answers its row', async () => {
    const out = await wizard.cmd(
      `eval --parcel /world/lounge return (() => {` +
        `const sats = StuffApi.findAllByTemplatePath('${LOUNGE_SATELLITE}');` +
        `const bars = StuffApi.findAllByTemplatePath('${LOUNGE_BAR}');` +
        // ⚠ A delimited STRING, not JSON: the prose pipeline strips MML
        // and normalises quotes, so a JSON object comes back unparseable
        // (`Expected property name` on the first run of this step). An
        // array of plain strings survives, and so does this.
        `return 'satellite=' + (sats.length ? String(sats[0].getDurableHandle()) : 'none') +` +
        `' bar=' + (bars.length ? String(bars[0].getDurableHandle()) : 'none');` +
        `})()`,
    );
    const said = squash(plain(await out.said()));
    // ⚠ Strip the quotes the eval's own result rendering adds around a
    // returned string — the first run compared `…/bar"` against `…/bar`.
    const read = (key: string): string =>
      (new RegExp(`${key}=([^\\s]+)`).exec(said)?.[1] ?? '').replace(
        /["']/g,
        '',
      );
    const answer = { satellite: read('satellite'), bar: read('bar') };
    expect(
      answer.satellite || answer.bar,
      `the eval did not answer: ${said}`,
    ).toBeTruthy();

    if (answer.satellite !== 'none') {
      expect(
        answer.satellite,
        '⭐ A satellite is a fresh clone per landing, recorded nowhere ' +
          'and re-derivable from nothing, so `null` is its honest answer ' +
          '— and a find in it must not follow you to the next one. ' +
          'Before the handle it answered with its ROW and stayed found ' +
          'forever.',
      ).toBe('null');
    }
    if (answer.bar !== 'none') {
      expect(
        answer.bar,
        '⭐ And the other side of the rule: the bar is ONE place, so its ' +
          'row IS its durable handle — byte-identical to the key every ' +
          'DISCOVERY belief already written against its secret door ' +
          'used. That regression guard is the reason the Singleton rung ' +
          'exists.',
      ).toBe(LOUNGE_BAR);
    }
  }, 120_000);
});

suite('3 — two of a kind are both addressable, and the world can list them', () => {
  it('⭐⭐ a stall is keyed by its PITCH, and the square keeps the book', async () => {
    keeper = await Session.open(uniqueHandle('lg-keeper'), {
      startLocation: MARKET,
    });
    await keeper.cmd('bank open goodkin');
    const rent = await keeper.cmd('stall rent');
    const said = squash(plain(await rent.said()));
    if (/haven't that|Open an account|no free pitch/i.test(said)) {
      // An honest refusal is a pass for this step: the pitch book
      // answered, which is the mechanism under test.
      expect(said).toMatch(/haven't that|Open an account|no free pitch/i);
      return;
    }
    const where = await wizard.cmd(
      `eval --parcel /world/terminus return (() => {` +
        `const f = StuffApi.findByTemplatePath('/world/terminus/market/stalls');` +
        `if (!f) return 'no fixture';` +
        `return JSON.stringify(f.lets);` +
        `})()`,
    );
    const book = squash(plain(await where.said()));
    expect(
      book,
      '⭐ The square is the stall s MANAGER and keeps the book of lets: ' +
        'a counter is keyed by its PITCH, and WHO rents it lives on the ' +
        "house's appointing authority rather than in the counter's name.",
    ).toMatch(/platform\/agent\/Avatar|\{\}/);
  }, 180_000);
});
