/**
 * The card catalogue — the server owns what a card IS, not just what it
 * is called.
 *
 * ⭐⭐ **Why this exists.** A `subscriptionId` is a client-minted
 * `nanoid`: a transport handle that dies on reconnect. It can name a
 * card for the length of one socket and nothing longer. So anything
 * durable that refers to a card — a saved arrangement, a pin, a future
 * authored layout — needed an identity the server issues, and there
 * wasn't one.
 *
 * The visible symptom was `cockpit layout save`, which wrote
 * `cards: []` and reported "saved". Not laziness: it was the only
 * honest thing that code could write, because the only id a card had
 * would have been garbage a reconnect later. **The bug was upstream of
 * the bug.**
 *
 * ⚠ The second half — that a named card's SHAPE comes from the server —
 * is the part that matters beyond arrangements. `InspectionCard.tsx`
 * used to send `query: "$focus"`, putting MQL in a `.tsx` file. The
 * client is not allowed to re-derive server semantics, and a card's
 * query is one.
 */

import '../../../test-bootstrap';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MqlSubscriptionApi } from '../mql-subscription';
import { MqlApi } from '../mql';
import { StuffApi } from '../stuff';
import { ShadowApi } from '../shadow';
import { ContainmentApi } from '../containment';
import { CARDS } from '../../lib/connection/Cards';
import { CARD_IDS } from '@saxonberg/types';
import EventRegistry from '../../obj/EventRegistry';
import Interactive from '../../obj/Interactive';
import Avatar from '../../obj/Avatar';
import Location from '../../lib/stuff/Location';
import { Stuff } from '../../lib/stuff/Stuff';
import { EventApi } from '../event';
import { ConnectionApi } from '../connection';
import { RenownApi } from '../renown';
import RenownStanding, {
  COMPACT_WIDE,
} from '../../lib/standing/RenownStanding';
import { makeStuffAtPath } from '../../lib/security/__tests__/test-setup';

interface Harness {
  interactive: Interactive;
  avatar: Avatar;
  location: Location;
  envelopes: { type?: string }[];
}

async function setup(): Promise<Harness> {
  const reg = await StuffApi.create(() => {
    const r = new EventRegistry();
    Stuff._stampTemplatePath(r, '/obj/EventRegistry');
    return r;
  });
  StuffApi.unregister(reg);
  StuffApi.register(reg);
  EventApi._setRegistryForTesting(reg);

  const location = await StuffApi.create(() => new Location());
  const avatar = await StuffApi.create(() => new Avatar());
  avatar.setName('Alice');
  ContainmentApi.move(avatar, location);
  const interactive = await StuffApi.create(
    () => new Interactive('sock-1', 'sess-1', { _id: 'u1' } as never),
  );
  ConnectionApi.transfer(interactive, avatar);

  const envelopes: { type?: string }[] = [];
  vi.spyOn(avatar, 'onEnvelope').mockImplementation((tpl) => {
    envelopes.push(tpl as unknown as { type?: string });
  });
  return { interactive, avatar, location, envelopes };
}

/**
 * A second harness for the `self` card's durable half: the avatar
 * carries a `/obj/Avatar/<id>` template stamp, which is what
 * `standingSubject` and every `durableKey` return. Constructed
 * synchronously — a durable-stamped Avatar through the clone pipeline
 * would try to materialize from `holder_snapshots`, and none of this is
 * about persistence.
 */
async function setupDurable(
  templatePath: string,
): Promise<Harness & { subject: string }> {
  const reg = await StuffApi.create(() => {
    const r = new EventRegistry();
    Stuff._stampTemplatePath(r, '/obj/EventRegistry');
    return r;
  });
  StuffApi.unregister(reg);
  StuffApi.register(reg);
  EventApi._setRegistryForTesting(reg);

  const location = await StuffApi.create(() => new Location());
  const avatar = makeStuffAtPath(() => new Avatar(), templatePath);
  avatar.setName('Alice');
  ContainmentApi.move(avatar, location);
  const interactive = await StuffApi.create(
    () => new Interactive('sock-1', 'sess-1', { _id: 'u1' } as never),
  );
  ConnectionApi.transfer(interactive, avatar);

  const envelopes: { type?: string }[] = [];
  vi.spyOn(avatar, 'onEnvelope').mockImplementation((tpl) => {
    envelopes.push(tpl as unknown as { type?: string });
  });
  return {
    interactive,
    avatar,
    location,
    envelopes,
    subject: templatePath,
  };
}

/** The first result envelope's single record, for a `one` card. */
function firstRecord(
  envelopes: { type?: string }[],
): Record<string, unknown> | undefined {
  const result = envelopes.find(
    (e) => e.type === 'mql-subscription-result',
  ) as { result?: Record<string, unknown>[] } | undefined;
  return result?.result?.[0];
}

describe('the card catalogue', () => {
  beforeEach(() => {
    StuffApi.clearAll();
    ShadowApi._clearAllForTesting();
    EventApi._clearAllForTesting();
    MqlSubscriptionApi._clearAllForTesting();
    RenownStanding._resetForTesting();
  });

  /*
   * ⚠ The vocabulary and the definitions must not drift. Two lists that
   * have to agree is one list too many, so this asserts they are in
   * fact one: every advertised name resolves to a definition, and the
   * catalogue advertises nothing extra.
   */
  it('every advertised CardId has a definition, and vice versa', () => {
    expect(Object.keys(CARDS).sort()).toEqual([...CARD_IDS].sort());
    for (const id of CARD_IDS) {
      const def = CARDS[id];
      expect(def, `${id} has no definition`).toBeDefined();
      expect(def.query.length, `${id} has an empty query`).toBeGreaterThan(0);
      expect(def.label.length, `${id} has no label`).toBeGreaterThan(0);
    }
  });

  /*
   * ⭐ The dependency flag is declared beside the query that needs it.
   * A `$focus` card that does not wake on focus changes is a surface
   * that silently stops updating — and nothing about it looks broken,
   * which is exactly how the immortal `here` card survived eleven green
   * tests.
   */
  it('declares a wake dependency for each query that needs one', () => {
    expect(CARDS.inspect.query).toBe('$focus');
    expect(CARDS.inspect.focusDependent).toBe(true);
    expect(CARDS.location.query).toBe('here');
    expect(CARDS.location.locationDependent).toBe(true);
  });

  it('opens a named card using the SERVER definition', async () => {
    const h = await setup();
    MqlSubscriptionApi.handleSubscribe({
      interactive: h.interactive,
      subscriptionId: 'sub-1',
      card: 'location',
    });
    // It opened with NO query supplied by the caller, and it is listed
    // as a card under its durable name even though it has no hold.
    const cards = MqlSubscriptionApi.listCards(h.interactive);
    const mine = cards.find((p) => p.subscriptionId === 'sub-1');
    expect(mine, 'a named card must be listed as one').toBeDefined();
    expect(mine!.cardId).toBe('location');
    expect(mine!.hold).toBeUndefined();

    expect(h.envelopes.length).toBeGreaterThan(0);
    const first = h.envelopes[0] as { type?: string; error?: string };
    expect(first.type).not.toBe('mql-subscription-error');
  });

  /*
   * ⚠⚠ An unknown name is an ERROR, never a fallback to whatever the
   * caller passed. Falling back would let a client open an arbitrary
   * subscription by misspelling a card — reopening the exact hole the
   * catalogue closes.
   */
  it('refuses an unknown card name rather than falling back', async () => {
    const h = await setup();
    MqlSubscriptionApi.handleSubscribe({
      interactive: h.interactive,
      subscriptionId: 'sub-bogus',
      card: 'nope' as never,
      // A caller trying to smuggle a query past the catalogue.
      query: 'here',
      cardinality: 'one',
    });
    const err = h.envelopes.find(
      (e) => (e as { type?: string }).type === 'mql-subscription-error',
    ) as { detail?: string; reason?: string } | undefined;
    expect(err, 'expected an error envelope').toBeDefined();
    expect(JSON.stringify(err)).toMatch(/unknown card/);
  });

  /*
   * ⭐⭐ THE regression, and the reason the catalogue exists.
   *
   * `cockpit layout save` wrote `cards: []` and said "saved". The name
   * appeared in `list`; recalling it restored nothing; no code path
   * anywhere ever filled the array. A test asserting only that the name
   * was stored passed the whole time — which is why this one asserts
   * the CONTENTS.
   */
  it('a saved arrangement captures the open cards by durable name', async () => {
    const h = await setup();
    MqlSubscriptionApi.handleSubscribe({
      interactive: h.interactive,
      subscriptionId: 'sub-a',
      card: 'inspect',
      // ⚠ Ignored — a named card's lifetime comes from the catalogue,
      // and neither shipped card carries one. Passing it here proves
      // the caller cannot bolt a lifetime onto a server-owned card.
      hold: 'carried',
    });
    MqlSubscriptionApi.handleSubscribe({
      interactive: h.interactive,
      subscriptionId: 'sub-b',
      card: 'location',
    });

    const open = MqlSubscriptionApi.listCards(h.interactive);
    const ids = open.map((p) => p.cardId).sort();
    expect(ids).toEqual(['inspect', 'location']);

    // ⚠ And the durable half: the names survive a reconnect BECAUSE
    // they are not the subscriptionIds. Assert they are in fact
    // different things, or this test would pass against the old design.
    for (const p of open) {
      expect(p.cardId).not.toBe(p.subscriptionId);
      // The caller's `hold` was discarded: the catalogue defines none.
      expect(p.hold).toBeUndefined();
    }
  });

  /*
   * ⚠ A held subscription opened by SHAPE rather than by name has no
   * durable identity, so it reports none — and an arrangement skips it
   * rather than storing a `nanoid` that will be garbage tomorrow.
   */
  it('a card opened by shape reports no durable name', async () => {
    const h = await setup();
    MqlSubscriptionApi.handleSubscribe({
      interactive: h.interactive,
      subscriptionId: 'sub-adhoc',
      query: 'here',
      cardinality: 'one',
      hold: 'here',
    });
    const open = MqlSubscriptionApi.listCards(h.interactive);
    expect(open.length).toBe(1);
    expect(open[0]!.cardId).toBeUndefined();
  });
});

/**
 * ⭐ **The `self` card** — the widget shelf's one subscription, and the
 * first card whose field set is an explicit list rather than an alias.
 *
 * Neither alias could serve it: `REF_FIELDS` and `DETAIL_FIELDS` are
 * object-DESCRIPTION sets (`displayName`, `contents`, `exits`), and
 * nothing in either carries a figure about the subject.
 */
describe('the self card', () => {
  const SUBJECT = '/obj/Avatar/shelf-tester';

  beforeEach(() => {
    StuffApi.clearAll();
    ShadowApi._clearAllForTesting();
    EventApi._clearAllForTesting();
    MqlSubscriptionApi._clearAllForTesting();
    RenownStanding._resetForTesting();
  });

  /*
   * ⭐⭐ `makeStanding` was held OFF this list until the account
   * roll-up existed, and this assertion is the other half of that
   * record: it is now ON, and it arrived with the arithmetic.
   *
   * The condition was never "does the server have a number" — it always
   * had one. It was that *Make* is an account-level stock whose account
   * arithmetic was unbuilt, so the value's LEVEL was wrong: a
   * per-character figure standing in for a per-person claim. What made
   * it renderable is the roll-up PLUS an honest absence — the field
   * returns `undefined` when an account cannot be resolved, and an
   * undefined field is omitted rather than filled in.
   */
  it('carries the four fields the shelf renders, makeStanding among them', () => {
    expect(CARDS.self.query).toBe('me');
    expect(CARDS.self.cardinality).toBe('one');
    expect(Array.isArray(CARDS.self.fields)).toBe(true);
    expect(CARDS.self.fields).toEqual([
      'playStanding',
      'makeStanding',
      'renown',
      'practisingCompetence',
    ]);
  });

  /*
   * ⚠ No dependency flag, deliberately: these figures wake through
   * `durableKey` pokes, and a flag nothing needs is churn dressed as
   * liveness.
   */
  it('declares no focus or location dependency', () => {
    expect(CARDS.self.focusDependent).toBeUndefined();
    expect(CARDS.self.locationDependent).toBeUndefined();
  });

  it('opens through the catalogue and projects the viewer own figures', async () => {
    const h = await setupDurable(SUBJECT);
    MqlSubscriptionApi.handleSubscribe({
      interactive: h.interactive,
      subscriptionId: 'sub-self',
      card: 'self',
    });

    const first = h.envelopes[0] as { type?: string };
    expect(first.type).not.toBe('mql-subscription-error');

    const rec = firstRecord(h.envelopes);
    expect(rec, 'the self card resolved no record').toBeDefined();
    expect(rec!.stuffId).toBe(h.avatar.stuffId);
    // A band NAME, not a serialized `Band` value object (D3).
    expect(typeof (rec!.playStanding as { band: unknown }).band).toBe(
      'string',
    );
    // ⭐ `makeStanding` is OMITTED here, and that is the honest path
    // working rather than the field being absent from the card: this
    // avatar has no `User` in hand, so the account cannot be resolved,
    // the read returns `undefined`, and `projectFields` drops it. The
    // client hatches. What must never appear is a per-character number
    // wearing an account-level label.
    expect(rec).not.toHaveProperty('makeStanding');
  });

  /*
   * ⚠ Self-only, enforced at the descriptor rather than by permission
   * logic on the card: `standingSubject` returns `undefined` for any
   * viewer who is not the subject, and `projectFields` omits an
   * `undefined` field. Asserted through the REAL card, because that is
   * the path a second player would actually take.
   */
  it('projects no standing for a viewer who is not the subject', async () => {
    const h = await setupDurable(SUBJECT);
    const other = makeStuffAtPath(
      () => new Avatar(),
      '/obj/Avatar/somebody-else',
    );
    other.setName('Bob');
    ContainmentApi.move(other, h.location);
    const otherInteractive = await StuffApi.create(
      () => new Interactive('sock-2', 'sess-2', { _id: 'u2' } as never),
    );
    ConnectionApi.transfer(otherInteractive, other);
    const otherEnvelopes: { type?: string }[] = [];
    vi.spyOn(other, 'onEnvelope').mockImplementation((tpl) => {
      otherEnvelopes.push(tpl as unknown as { type?: string });
    });

    MqlSubscriptionApi.handleSubscribe({
      interactive: otherInteractive,
      subscriptionId: 'sub-other',
      card: 'self',
    });

    const rec = firstRecord(otherEnvelopes);
    expect(rec, 'the other viewer resolved no record at all').toBeDefined();
    // `me` resolves to THEIR avatar, and their own standing is theirs to
    // see — what must not appear is the first avatar's.
    expect(rec!.stuffId).toBe(other.stuffId);
    expect(rec!.stuffId).not.toBe(h.avatar.stuffId);
  });

  /*
   * ⭐ **F1, verified before anything relies on it.** Everything about a
   * LIVE shelf rests on the durable index being built from the
   * SUBSCRIPTION'S field list — `deriveAndInstallDependencies` skips any
   * descriptor whose name is not in `sub.fields`, so a card naming its
   * fields explicitly had to be checked rather than assumed. If this
   * fails the shelf is a static snapshot and the client design changes.
   */
  it('⭐ a durable-subject poke re-resolves the card — the shelf is live', async () => {
    const h = await setupDurable(SUBJECT);
    MqlSubscriptionApi.handleSubscribe({
      interactive: h.interactive,
      subscriptionId: 'sub-self',
      card: 'self',
    });
    const spy = vi.spyOn(MqlApi, 'resolveOne');

    MqlSubscriptionApi.notifyDurableSubject(SUBJECT);
    await MqlSubscriptionApi._drainScheduledForTesting();

    // ⚠ `toHaveBeenCalled`, not a count: `practisingCompetence` reads a
    // self-healing derived cache whose background fold pokes the same
    // subject again when it lands, so one external poke legitimately
    // cascades. The count is an implementation detail of that cache;
    // that the poke ARRIVES is the claim. The negative control below is
    // what keeps this from being satisfied by the cascade alone.
    expect(
      spy,
      'the poke did not reach a card whose fields are an explicit list',
    ).toHaveBeenCalled();
    spy.mockRestore();
  });

  /*
   * The control: the index matches the exact durable key, so it is the
   * POKE that woke the card above and not merely the passage of time.
   */
  it('a poke on a different subject does not re-resolve the card', async () => {
    const h = await setupDurable(SUBJECT);
    MqlSubscriptionApi.handleSubscribe({
      interactive: h.interactive,
      subscriptionId: 'sub-self',
      card: 'self',
    });
    await MqlSubscriptionApi._drainScheduledForTesting();
    const spy = vi.spyOn(MqlApi, 'resolveOne');

    MqlSubscriptionApi.notifyDurableSubject('/obj/Avatar/somebody-else');
    await MqlSubscriptionApi._drainScheduledForTesting();

    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  /*
   * ⚠ F2: the differ compares field values with `deepEqual`, not by
   * identity — so a descriptor returning a freshly-built object on every
   * read does NOT produce a spurious delta. Two pokes with nothing
   * underneath them changed must yield no `update`.
   */
  it('two pokes with no underlying change emit no delta', async () => {
    const h = await setupDurable(SUBJECT);
    MqlSubscriptionApi.handleSubscribe({
      interactive: h.interactive,
      subscriptionId: 'sub-self',
      card: 'self',
    });
    h.envelopes.length = 0;

    MqlSubscriptionApi.notifyDurableSubject(SUBJECT);
    await MqlSubscriptionApi._drainScheduledForTesting();
    MqlSubscriptionApi.notifyDurableSubject(SUBJECT);
    await MqlSubscriptionApi._drainScheduledForTesting();

    const deltas = h.envelopes.filter(
      (e) => e.type === 'mql-subscription-delta',
    );
    expect(deltas).toHaveLength(0);
  });

  /*
   * ⭐⭐ **The distinction D4b exists for.** Without this pair the
   * ambiguity looks fixed while still being collapsed somewhere in the
   * chain: a fresh character's `RENOWN` would read a confident `0`
   * forever, and nothing would say which of the two facts it meant.
   */
  it('⭐ omits renown for an unmeasured scope, and carries a measured zero', async () => {
    const h = await setupDurable(SUBJECT);

    // Unmeasured: no row in the standing cache at all.
    MqlSubscriptionApi.handleSubscribe({
      interactive: h.interactive,
      subscriptionId: 'sub-unmeasured',
      card: 'self',
    });
    expect(firstRecord(h.envelopes)).not.toHaveProperty('renown');

    // Measured, and the answer is zero.
    RenownStanding.cached().set(
      RenownStanding.key(SUBJECT, COMPACT_WIDE),
      0,
    );
    h.envelopes.length = 0;
    MqlSubscriptionApi.handleSubscribe({
      interactive: h.interactive,
      subscriptionId: 'sub-measured',
      card: 'self',
    });
    expect(firstRecord(h.envelopes)!.renown).toEqual({ value: 0 });
  });

  /*
   * The Api-level half of the same distinction. `renownOf` keeps its
   * neutral-0 contract — five callers depend on it and every one of them
   * genuinely wants a number.
   */
  it('measuredRenownOf preserves the absence renownOf collapses', () => {
    expect(RenownApi.measuredRenownOf(SUBJECT)).toBeUndefined();
    expect(RenownApi.renownOf(SUBJECT)).toBe(0);

    RenownStanding.cached().set(
      RenownStanding.key(SUBJECT, COMPACT_WIDE),
      0,
    );
    expect(RenownApi.measuredRenownOf(SUBJECT)).toBe(0);
    expect(RenownApi.renownOf(SUBJECT)).toBe(0);

    RenownStanding.cached().set(
      RenownStanding.key(SUBJECT, COMPACT_WIDE),
      7,
    );
    expect(RenownApi.measuredRenownOf(SUBJECT)).toBe(7);
    expect(RenownApi.renownOf(SUBJECT)).toBe(7);
  });
});
