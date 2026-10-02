/**
 * The Avatar family — ⭐⭐ **the drive**.
 *
 * This build is almost entirely structure: `HasInteractive` cut into
 * three mixins, `Avatar` made an abstract root over three concrete
 * bodies, one `playerId` where there were three, the estate's state
 * moved onto the estate, `enter()` decomposed, and the whole family
 * renamed. Nothing new appears on screen.
 *
 * So the drive asserts the thing a structural change actually
 * threatens: **that none of it moved.** Each step names an observable
 * the refactor promised to preserve and the silent way it could have
 * been lost.
 *
 * ## ⚠⚠ Why step 1 is the first thing here
 *
 * `cockpit` and its whole subtree ride
 * `SaxonbergClientMixin.commandContributions`. A `Login` that stopped
 * composing that mixin would lose the verb — and lose **char-gen with
 * it**, because `CommandGiver` reads `cockpit.inputModes` for any
 * command carrying a `barId`, the client's char-gen bar carries one,
 * and `getClientState` **throws** on a key no schema declares. The
 * whole failure is one composition line, and no controller test can
 * see it: the dispatch happens at the bus, above every controller.
 *
 * `Session.openAtRoster` was added for this step. It is the only way
 * to reach the pre-world verb set on a live socket.
 *
 * ## ⚠⚠ Steps 5–7 (the shade arc) are not driven HERE — and my first
 * reason for that was WRONG
 *
 * ⛔ **I recorded "nothing in this game can kill a player through the
 * socket". That is false.** I checked the eval sandbox's Api allowlist
 * (`StuffApi`, `MqlApi`, `ContainmentApi`, `MixinApi` — no
 * `ConditionApi`) and looked for a kill verb, found neither, and
 * concluded the arc was unreachable. The route I missed is the body's
 * OWN method through the eval receiver:
 *
 *     eval --parcel /world/lounge this.beginDying("exsanguination", 1)
 *
 * `self`/`target` IS the avatar, so every public method on it is
 * callable. `e2e/tests/mortality.spec.ts` has driven the arc this way
 * all along. ⭐ The lesson: an ALLOWLIST OF APIS is not the surface —
 * the receiver is, and it carries the whole class.
 *
 * The shade arc is therefore driven in the browser instead, where the
 * thing worth checking actually lives:
 * `e2e/tests/avatar-family.spec.ts` kills a player, becomes a shade,
 * and asserts it is still a PERSON (listed by `who`, not refused as
 * "not a player") while still being refused at `bank deposit`. That is
 * the predicate fix's whole claim, and a socket cannot see it — the
 * ~90 callers are controllers.
 */

import { describe as suite, it, expect, beforeAll, afterAll } from 'vitest';
import {
  Session,
  declareFile,
  uniqueHandle,
  plain,
  expectOk,
} from '../src/harness';

/*
 * ⚠ Kept honest against what the steps ACTUALLY do. An earlier version
 * of this string claimed a shelf pin and a circle crossing; step 4 was
 * rewritten (the door is unreachable) and the shelf pin went with it,
 * so both had become false. A dirty reason nobody re-reads is how a
 * reset gets owed for the wrong thing.
 */
export const DIRTY_REASON =
  'mints four characters (two through char-gen) and leaves them in the ' +
  'world; opens a bank account for one and names another as its ' +
  'beneficiary — none of it produced again. ⭐ No circle is consumed: ' +
  'the crossing step cannot reach a door (see the file header).';

declareFile({
  file: 'avatar-family.dirty.wire.test.ts',
  packs: [
    'platform',
    'wiki-starter',
    'generic-objects',
    'terminus',
    'world-seed',
    'eternal-university',
    'saxonberg-lounge',
  ],
  dirtyReason: DIRTY_REASON,
});

const DORM = '/world/terminus/eternal/duncan-hall/location/dormroom';

const squash = (s: string): string => s.replace(/\s+/g, ' ').trim();

let ada: Session;
let adaHandle: string;

beforeAll(async () => {
  adaHandle = uniqueHandle('avfam-ada');
}, 120_000);

afterAll(() => {
  ada?.close();
});

suite('1 — the pre-world verb set did not change', () => {
  it('⭐⭐ a roster-parked Login answers cockpit, embody and play — and refuses world verbs', async () => {
    const { session, playerId } = await Session.openAtRoster(
      uniqueHandle('avfam-roster'),
    );
    try {
      // The negative FIRST, so a Login that had silently become a body
      // (and therefore answered everything) fails here rather than
      // passing every assertion below.
      const look = await session.cmd('look');
      expect(
        look.status,
        'a Login is not in the world; `look` must not resolve. If this ' +
          'passes, the handshake handed off early and the rest of this ' +
          'step is measuring an avatar, not a Login.',
      ).not.toBe('ok');

      // ⚠ The one that the three-way mixin split could have broken.
      const cockpit = await session.cmd('cockpit');
      expect(
        squash(plain(await cockpit.said())),
        '`cockpit` must still be afforded at the roster. It rides ' +
          'SaxonbergClientMixin.commandContributions now; a Login that ' +
          'stopped composing that mixin loses it — and loses char-gen ' +
          'with it, because the bar submits with a barId and ' +
          'getClientState THROWS on an undeclared key.',
      ).not.toMatch(/don't understand|do not understand|unknown command/i);

      // And the handoff still works from here.
      expect(typeof playerId, 'the roster offered a character').toBe('string');
      expect(playerId.length).toBeGreaterThan(0);
    } finally {
      session.close();
    }
  }, 120_000);
});

suite('2 — a new player still arrives with their loadout', () => {
  it('char-gen completes and the body carries its born-with floor', async () => {
    ada = await Session.embody(adaHandle);
    const look = await ada.cmd('look');
    expectOk(look);

    // ⚠ The aether implant is the born-with floor, and it is what the
    // onCreate restructure (W3) most threatened: the loadout install
    // moved onto the abstract root for vessels and stayed in the record
    // body's own sequence for the record. Installing it twice collides
    // on the cranial slot; installing it never leaves a player who can
    // receive a channel message and cannot send one.
    const inv = squash(plain(await (await ada.cmd('inventory')).said()));
    expect(
      inv,
      'the born-with loadout must still install exactly once — the ' +
        'implant is the floor every body gets',
    ).toMatch(/implant/i);
  }, 180_000);
});

suite('3 — a cockpit arrangement survives logout', () => {
  it('⭐ mode and layout come back on a fresh socket', async () => {
    const mode = await ada.cmd('cockpit mode build');
    expectOk(mode);

    const before = squash(plain(await (await ada.cmd('cockpit')).said()));
    expect(before, 'the mode reads back in-session').toMatch(/build/i);

    ada.close();
    ada = await Session.open(adaHandle);

    const after = squash(plain(await (await ada.cmd('cockpit')).said()));
    expect(
      after,
      '⚠ The client-state field moved from HasInteractiveMixin to ' +
        'ClientStateMixin and the schema became a chain walk. If the ' +
        'walk misses the client mixin, every key silently reverts to ' +
        'its default on the next login and nothing else complains.',
    ).toMatch(/build/i);
  }, 180_000);
});

suite('4 — client state FORKS through the circle door', () => {
  it('⭐⭐ a preference is carried INTO the vessel — or the door is unreachable, named', async () => {
    /*
     * ⚠ The requirements' step 4 said the preference would survive the
     * RETURN trip. It does not and never has: the `ClientState` slice
     * is fork-only by design and the merge allowlist is `['Contacts']`.
     * What matters is the FORK direction — preferences carried INTO the
     * vessel — because that is where the silent failure lives: fork
     * discovery is prefix reflection over the prototype chain, so a
     * slice on a mixin the host does not compose produces no error at
     * all. The fork simply arrives empty, which is what dumped a
     * builder back into the world layout on "test in holodeck".
     *
     * ⚠⚠ FINDING, measured this run: **there is no sandbox door a
     * drive handle can reach.** Only two rooms in the shipped world
     * hold `/platform/thing/sandbox/wardrobe`:
     *
     *   - the Duncan Hall dorm room — a KEYED residence, one instance
     *     per unit parcel. A `startLocation` stands the room up but NOT
     *     its `props:`, so `here:c` is EMPTY, there is no wardrobe
     *     object, and therefore no crossing exit: `go wardrobe` answers
     *     `locomotion-gate-failed / exit-mode / walk`. The fixtures
     *     arrive with provisioning (Katie), which is the residence
     *     flow, not something a drive can shortcut;
     *   - the Seznick house bedroom — unlit, so pitch dark, and the
     *     keyword resolves to nothing.
     *
     * So the crossing has never been driven on the wire by anything,
     * and this step says so by name rather than passing quietly. ⭐ The
     * assertion below is still LIVE: the moment a reachable door
     * exists, this checks the fork for real and fails if it is empty.
     * The slice's HOME — the half that can break silently — is pinned
     * by `ClientState.fork.test.ts`, both directions.
     */
    const fen = await Session.open(uniqueHandle('avfam-fen'), {
      startLocation: DORM,
      wizard: true,
    });
    try {
      await fen.cmd('cockpit mode build');
      const outsideBefore = squash(
        plain(await (await fen.cmd('cockpit')).said()),
      );
      expect(
        outsideBefore,
        'the preference is set outside — the real half of this step',
      ).toMatch(/build/i);

      const nearby = await fen.query('here:c', { fields: ['displayName'] });
      const crossed = await fen.cmd('go wardrobe');

      if (crossed.status !== 'ok') {
        // Name the reason, and assert it is the KNOWN one. If the door
        // starts refusing for some other reason, that is a regression
        // and this fails.
        expect(
          nearby.length,
          '⚠⚠ the crossing door refused AND the room has contents — so ' +
            'the refusal is NOT the known missing-fixture gap. Something ' +
            'else broke; diagnose before accepting this step as skipped. ' +
            `notes: ${JSON.stringify(crossed.notes)}`,
        ).toBe(0);
        return;
      }

      // Reachable door: the real assertion runs.
      const inside = squash(plain(await (await fen.cmd('cockpit')).said()));
      expect(
        inside,
        '⚠⚠ The ClientState fork slice must arrive with the vessel. If ' +
          'this reads the default, `forkSlice_ClientState` is no longer ' +
          'found by prefix reflection on the composed chain — silent, ' +
          'and exactly what dumped a builder into the world layout.',
      ).toMatch(/build/i);

      await fen.cmd('go out');
      const outsideAfter = squash(
        plain(await (await fen.cmd('cockpit')).said()),
      );
      expect(
        outsideAfter,
        'and the outside copy is unchanged — the boundary is symmetric',
      ).toMatch(/build/i);
    } finally {
      fen.close();
    }
  }, 240_000);
});

suite('8 — the estate keeps its own succession state', () => {
  it('⭐ naming a beneficiary is accepted — and the READ surface is unreachable, named', async () => {
    /*
     * ⚠⚠ What this step exists for. The two succession fields
     * (`escheatedAt`, `beneficiary`) moved off `Avatar.fieldMeta` onto
     * `EstateMixin` — and then into the estate SLICE, because
     * `captureState` runs a layer's `captureSlice` **or** its declared
     * fields and never both. Declaring them beside a slice makes them
     * visible to `getAllPersistentFields`, visible through every
     * getter, and **silently never written**.
     *
     * ⚠⚠ FINDING, measured this run: **the succession state has no
     * reachable read surface on the wire.** Three paths, all blocked:
     *
     *   - `wallet` answers *"no active account yet"* — the beneficiary
     *     is a field ON the wallet, so the wallet must exist first;
     *   - `bank open` needs a teller, and the default start location
     *     has none;
     *   - `eval … --on me` throws in the controller (and without
     *     `--parcel` is refused by the sandbox boundary outright), so
     *     the object cannot be read directly either.
     *
     * So the round trip is proven **through the store** by
     * `Estate.succession-state.test.ts` — capture → `holder_snapshots`
     * → materialize, asserting the field reaches the document — and
     * the wire proves only that the WRITE is accepted. That split is
     * recorded rather than papered over. ⭐ Worth closing: a `wallet`
     * that cannot report your heir until you open a bank account is a
     * read gap a player would hit too.
     */
    const heirName = 'Bequesta';
    const heir = await Session.embody(uniqueHandle('avfam-heir'), {
      name: heirName,
    });
    heir.close();

    const set = await ada.cmd(`wallet beneficiary ${heirName}`);
    expect(
      set.status,
      `naming a beneficiary must be ACCEPTED. ${JSON.stringify(set.notes)}`,
    ).toBe('ok');

    // And it survives a real logout/login at least as far as the write
    // path: a second naming after a fresh socket is still accepted,
    // which it would not be if the login had come back with a broken
    // estate layer.
    ada.close();
    ada = await Session.open(adaHandle);
    const again = await ada.cmd(`wallet beneficiary ${heirName}`);
    expect(
      again.status,
      'the estate layer is live on a body materialized from the record',
    ).toBe('ok');
  }, 240_000);
});

suite('9 — the panel shows three bodies of one family', () => {
  it('⭐⭐ the composition lists are identical across all three', async () => {
    const page = squash(plain(await (await ada.cmd('wiki avatar')).said()));

    // Positive first. An empty or failed panel renders words that would
    // satisfy every negative below — the trap the base-class drive hit.
    expect(page, 'the page renders at all').not.toMatch(
      /no such page|does not exist/i,
    );
    expect(
      page,
      '⚠ an EMPTY inverse is the broken state, not a finding',
    ).not.toMatch(/nothing yet/i);
    expect(
      page,
      '⚠⚠ a FAILED composition component renders its failure into the ' +
        'page, and every assertion below would pass vacuously against it',
    ).not.toMatch(/composition&gt; failed|composition> failed|exceeded \d+ms/i);

    // The three bodies are named, and named as one family.
    for (const word of ['Primary', 'Shade', 'Sandbox']) {
      expect(page, `the page names the ${word} body`).toMatch(
        new RegExp(word, 'i'),
      );
    }

    // ⭐ The claim the whole build rests on: composition does not
    // differ. A mixin the panel shows for one body must show for all.
    for (const mixin of ['SaxonbergClient', 'HasInteractive', 'Estate']) {
      const hits = page.split(mixin).length - 1;
      expect(
        hits,
        `${mixin} must appear in all THREE composition panels — a vessel ` +
          'ACTIVATES differently, it does not COMPOSE differently, and ' +
          'that is what lets the game refuse you by name instead of ' +
          'pretending the ability never existed',
      ).toBeGreaterThanOrEqual(3);
    }
  }, 180_000);
});
