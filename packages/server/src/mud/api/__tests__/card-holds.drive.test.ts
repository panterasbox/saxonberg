/**
 * Card lifetime, **driven** — not hand-refreshed.
 *
 * ⭐⭐ **This is the `card-holds-need-their-wake` lesson, written as a
 * suite.** Eleven green tests once missed an immortal card because
 * every one of them called `refreshForInteractive` by hand: a hold is
 * only evaluated when its subscription re-resolves, and a subscription
 * only re-resolves when something marks it dirty. A test that marks it
 * dirty itself proves the *evaluator* and proves nothing at all about
 * the *wake* — and the wake is the half that was broken.
 *
 * So every assertion here changes the WORLD (someone walks out, you
 * walk out, a thing is dropped) and then drains the scheduler. Nothing
 * calls a refresh.
 *
 * The requirement states the property as a pair, and it is asserted as
 * one: *a card held by `present` disappears when the subject leaves,
 * and one held by `unanswered` does not, until answered.* The second
 * half is what makes the first half mean something — a mechanism that
 * released everything would pass the first assertion alone.
 */

import '../../../test-bootstrap';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MqlSubscriptionApi } from '../mql-subscription';
import { PromptApi } from '../prompt';
import { StuffApi } from '../stuff';
import { ShadowApi } from '../shadow';
import { ContainmentApi } from '../containment';
import EventRegistry from '../../obj/EventRegistry';
import Interactive from '../../obj/Interactive';
import Avatar from '../../obj/Avatar';
import Location from '../../lib/stuff/Location';
import Prop from '../../obj/Prop';
import { Stuff } from '../../lib/stuff/Stuff';
import { EventApi } from '../event';
import { ConnectionApi } from '../connection';
import type { CardReleaseReason } from '@saxonberg/types';

interface Harness {
  interactive: Interactive;
  avatar: Avatar;
  here: Location;
  there: Location;
  envelopes: { type?: string; subscriptionId?: string; reason?: string }[];
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

  const here = await StuffApi.create(() => new Location());
  const there = await StuffApi.create(() => new Location());
  const avatar = await StuffApi.create(() => new Avatar());
  avatar.setName('Alice');
  ContainmentApi.move(avatar, here);
  const interactive = await StuffApi.create(
    () => new Interactive('sock-1', 'sess-1', { _id: 'u1' } as never),
  );
  ConnectionApi.transfer(interactive, avatar);

  const envelopes: Harness['envelopes'] = [];
  vi.spyOn(avatar, 'onEnvelope').mockImplementation((tpl) => {
    envelopes.push(tpl as unknown as Harness['envelopes'][number]);
  });
  return { interactive, avatar, here, there, envelopes };
}

/** Every release envelope seen so far, as `(subscriptionId, reason)`. */
function releases(h: Harness): Array<[string, CardReleaseReason]> {
  return h.envelopes
    .filter((e) => e.type === 'mql-subscription-released')
    .map((e) => [e.subscriptionId!, e.reason as CardReleaseReason]);
}

/** Let the batched re-resolve run, exactly as production would. */
async function settle(): Promise<void> {
  await MqlSubscriptionApi._drainScheduledForTesting();
}

beforeEach(() => {
  // ⚠ Restore FIRST. One case stubs `PromptApi.isPending`, and a spy
  // leaking into the next case makes an `unanswered` card look immortal
  // — which is the exact bug this file exists to catch, arriving as a
  // false positive instead of a real one.
  vi.restoreAllMocks();
  StuffApi.clearAll();
  ShadowApi._clearAllForTesting();
  EventApi._clearAllForTesting();
  MqlSubscriptionApi._clearAllForTesting();
});

describe('⭐ the pair the requirement states', () => {
  it('`present` releases when they leave; `unanswered` does not', async () => {
    const h = await setup();

    // A person in the room, and a question you owe a reply to.
    const bob = await StuffApi.create(() => new Avatar());
    bob.setName('Bob');
    ContainmentApi.move(bob, h.here);

    MqlSubscriptionApi.handleSubscribe({
      interactive: h.interactive,
      subscriptionId: 'about-bob',
      query: 'peers',
      cardinality: 'many',
      fields: 'ref',
      hold: 'present',
    });
    // ⚠ Stubbed BEFORE the subscribe. A card's hold is evaluated at
    // open as well as on every re-resolve — a card that opens
    // already-lapsed must not paint once first — so a prompt that is
    // not pending yet releases immediately and the pair below would be
    // asserting nothing.
    vi.spyOn(PromptApi, 'isPending').mockReturnValue(true);
    MqlSubscriptionApi.handleSubscribe({
      interactive: h.interactive,
      subscriptionId: 'a-question',
      query: 'peers',
      cardinality: 'many',
      fields: 'ref',
      hold: 'unanswered',
      holdSubject: 'prompt-1',
    });

    // ── Bob walks out. Nothing here refreshes anything. ──
    ContainmentApi.move(bob, h.there);
    await settle();

    const seen = releases(h);
    expect(seen.map(([id]) => id)).toContain('about-bob');
    expect(seen.find(([id]) => id === 'about-bob')?.[1]).toBe('departed');

    // ⭐ …and the question is still owed, so its card is still open.
    expect(seen.map(([id]) => id)).not.toContain('a-question');
  });

  it('⭐⭐ the `unanswered` card goes when the question is ANSWERED', async () => {
    const h = await setup();
    const bob = await StuffApi.create(() => new Avatar());
    bob.setName('Bob');
    ContainmentApi.move(bob, h.here);

    /*
     * ⚠⚠ Driven through the REAL prompt lifecycle, and that is the whole
     * point of this case.
     *
     * `HOLD_WAKES_ON` declares that `unanswered` needs no location
     * dependency because "the prompt's own resolution is what wakes it"
     * — and until this build nothing poked the subscription registry
     * when a prompt settled. The card was **immortal**: the player
     * answered, the card stayed, and nothing about it looked broken.
     *
     * A test that stubbed `isPending` and then moved something else in
     * the room would have gone green against the broken code, because
     * the movement would have supplied the wake the prompt never did.
     * So nothing moves here.
     */
    const answered = PromptApi.choice(h.interactive, 'Which first?', [
      { response: 'axle', label: 'axle' },
      { response: 'rim', label: 'rim' },
    ]);
    const pushed = h.envelopes.find((e) => e.type === 'prompt') as
      | { promptId?: string }
      | undefined;
    expect(pushed?.promptId).toBeTruthy();
    const promptId = pushed!.promptId!;

    MqlSubscriptionApi.handleSubscribe({
      interactive: h.interactive,
      subscriptionId: 'a-question',
      query: 'peers',
      cardinality: 'many',
      fields: 'ref',
      hold: 'unanswered',
      holdSubject: promptId,
    });
    await settle();
    expect(releases(h).map(([id]) => id)).not.toContain('a-question');

    PromptApi.handleResponse(h.interactive, { promptId, response: 'axle' });
    await answered;
    await settle();

    expect(releases(h)).toContainEqual(['a-question', 'answered']);
  });
});

describe('the spatial holds', () => {
  it('`here` releases when YOU leave, naming the reason `left`', async () => {
    const h = await setup();
    const bob = await StuffApi.create(() => new Avatar());
    bob.setName('Bob');
    ContainmentApi.move(bob, h.here);

    MqlSubscriptionApi.handleSubscribe({
      interactive: h.interactive,
      subscriptionId: 'the-room',
      query: 'peers',
      cardinality: 'many',
      fields: 'ref',
      hold: 'here',
    });

    ContainmentApi.move(h.avatar, h.there);
    await settle();

    expect(releases(h)).toContainEqual(['the-room', 'left']);
  });

  it('`carried` releases when the thing is put down', async () => {
    const h = await setup();
    const pack = await StuffApi.create(() => new Prop());
    ContainmentApi.move(pack, h.avatar);

    MqlSubscriptionApi.handleSubscribe({
      interactive: h.interactive,
      subscriptionId: 'the-pack',
      query: 'inventory',
      cardinality: 'many',
      fields: 'ref',
      hold: 'carried',
    });

    ContainmentApi.move(pack, h.here);
    await settle();

    expect(releases(h)).toContainEqual(['the-pack', 'dropped']);
  });
});

describe('⭐ a pinned card does not leave at all', () => {
  it('survives the release of its hold condition', async () => {
    const h = await setup();
    const bob = await StuffApi.create(() => new Avatar());
    bob.setName('Bob');
    ContainmentApi.move(bob, h.here);

    MqlSubscriptionApi.handleSubscribe({
      interactive: h.interactive,
      subscriptionId: 'about-bob',
      query: 'peers',
      cardinality: 'many',
      fields: 'ref',
      hold: 'present',
    });
    MqlSubscriptionApi.setCardPinned(h.interactive, 'about-bob', true);
    await settle();

    ContainmentApi.move(bob, h.there);
    await settle();

    expect(releases(h).map(([id]) => id)).not.toContain('about-bob');
  });

  it('a dismiss drops one whose condition still holds, with a reason', async () => {
    const h = await setup();
    const bob = await StuffApi.create(() => new Avatar());
    bob.setName('Bob');
    ContainmentApi.move(bob, h.here);

    MqlSubscriptionApi.handleSubscribe({
      interactive: h.interactive,
      subscriptionId: 'about-bob',
      query: 'peers',
      cardinality: 'many',
      fields: 'ref',
      hold: 'present',
    });
    // ⚠ Bob has not moved. Pinning is an override on the five
    // conditions in BOTH directions — a sixth condition could only ever
    // keep a card, never dismiss one.
    MqlSubscriptionApi.setCardPinned(h.interactive, 'about-bob', false);
    await settle();

    expect(releases(h)).toContainEqual(['about-bob', 'dismissed']);
  });
});

describe('the pin answers on the wire', () => {
  it('⚠ the KEEP direction emits, or the control looks broken', async () => {
    const h = await setup();
    const bob = await StuffApi.create(() => new Avatar());
    bob.setName('Bob');
    ContainmentApi.move(bob, h.here);

    MqlSubscriptionApi.handleSubscribe({
      interactive: h.interactive,
      subscriptionId: 'about-bob',
      query: 'peers',
      cardinality: 'many',
      fields: 'ref',
      hold: 'present',
    });
    const before = h.envelopes.length;

    MqlSubscriptionApi.setCardPinned(h.interactive, 'about-bob', true);

    // Nothing about the world changed, so the diff is empty and no
    // delta goes out — which is exactly why the pin needs its own
    // envelope. Without it the card's pin sits un-lit after a command
    // that succeeded.
    const after = h.envelopes.slice(before);
    const pinEnvelope = after.find(
      (e) => e.type === 'mql-subscription-result',
    ) as { pinned?: boolean | null } | undefined;
    expect(pinEnvelope?.pinned).toBe(true);
  });

  it('resolves a card by its CATALOGUE name, not just its handle', async () => {
    const h = await setup();
    const bob = await StuffApi.create(() => new Avatar());
    bob.setName('Bob');
    ContainmentApi.move(bob, h.here);

    MqlSubscriptionApi.handleSubscribe({
      interactive: h.interactive,
      subscriptionId: 'a-nanoid-nobody-can-type',
      card: 'place',
    });

    // `cockpit card list` prints the catalogue id, so `cockpit card pin
    // place` is the form the verb's own help shows. Looking up only the
    // handle answered "no open card 'place'" — a surface that names
    // things one way and accepts them another.
    expect(
      MqlSubscriptionApi.setCardPinned(h.interactive, 'place', true),
    ).toBe(true);
  });
});

describe('a subject card', () => {
  it('refuses to open without a subject rather than resolving nothing', async () => {
    const h = await setup();

    MqlSubscriptionApi.handleSubscribe({
      interactive: h.interactive,
      subscriptionId: 'no-subject',
      card: 'agent',
    });

    // ⚠ An empty resolve would release on the first drain and look
    // exactly like the feature working.
    const error = h.envelopes.find(
      (e) => e.type === 'mql-subscription-error',
    ) as { detail?: string } | undefined;
    expect(error).toBeDefined();
    expect(error!.detail).toMatch(/subject/i);
  });

  it('opens about the named Stuff, and the server owns the query', async () => {
    const h = await setup();
    const bob = await StuffApi.create(() => new Avatar());
    bob.setName('Bob');
    ContainmentApi.move(bob, h.here);

    MqlSubscriptionApi.handleSubscribe({
      interactive: h.interactive,
      subscriptionId: 'about-bob',
      card: 'agent',
      subject: bob.stuffId,
    });

    const result = h.envelopes.find(
      (e) => e.type === 'mql-subscription-result',
    ) as { result?: Array<{ stuffId?: string }>; card?: string } | undefined;
    expect(result?.result?.[0]?.stuffId).toBe(bob.stuffId);
    // ⭐ The catalogue name is echoed so a server-pushed card tells the
    // client which body to draw for a handle it never minted.
    expect(result?.card).toBe('agent');
  });

  it('⚠⚠ resolves nothing for a subject the viewer cannot PERCEIVE', async () => {
    const h = await setup();
    // Somebody in another room entirely. Their stuffId is a perfectly
    // ordinary string that has ridden past frames.
    const elsewhere = await StuffApi.create(() => new Avatar());
    elsewhere.setName('Carol');
    ContainmentApi.move(elsewhere, h.there);

    MqlSubscriptionApi.handleSubscribe({
      interactive: h.interactive,
      subscriptionId: 'peeping',
      card: 'agent',
      subject: elsewhere.stuffId,
    });

    /*
     * ⚠⚠ **Not one frame of it.** The obvious implementation — an
     * `#<stuffId>` seed in the catalogue's query — resolves with NO
     * perception gate, because `#id` is authoring-tier tooling. A card
     * built on it would be a peep-hole into every room in the game for
     * any player who had ever seen an id on a frame.
     *
     * The hold predicate is the scope gate, and it runs at OPEN as well
     * as on every re-resolve — so an out-of-scope subject never gets a
     * result envelope at all. Evaluating only on the re-resolve would
     * have leaked exactly one full `detail` projection first, which for
     * a client-named subject is the whole exploit.
     */
    expect(
      h.envelopes.some((e) => e.type === 'mql-subscription-result'),
      'an out-of-scope subject must not be projected even once',
    ).toBe(false);
    expect(releases(h).map(([id]) => id)).toContain('peeping');
  });

  it('fades when the subject walks out of perception', async () => {
    const h = await setup();
    const bob = await StuffApi.create(() => new Avatar());
    bob.setName('Bob');
    ContainmentApi.move(bob, h.here);

    MqlSubscriptionApi.handleSubscribe({
      interactive: h.interactive,
      subscriptionId: 'about-bob',
      card: 'agent',
      subject: bob.stuffId,
    });
    await settle();

    ContainmentApi.move(bob, h.there);
    await settle();

    // The gate is re-checked on every resolve, so losing sight of the
    // subject empties the list and the hold reads that as "gone".
    expect(releases(h).map(([id]) => id)).toContain('about-bob');
  });
});
