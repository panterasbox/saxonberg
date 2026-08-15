/**
 * The card set — a subscription carrying a **hold condition**.
 *
 * Acceptance criterion 10: all five holds, each including the RELEASE
 * path, plus a manual pin overriding in BOTH directions. Criterion 11:
 * this rides the existing subscription registry, so a card is a
 * subscription with a lifetime rule and there is no second registry to
 * assert against — the test that would have found one is the count
 * check at the bottom.
 *
 * ⭐ `unanswered` is first because it is the one the design leans on
 * (*nothing that is still actionable ever leaves*) and the one whose
 * subject is a pending COMMAND rather than a Stuff. A shape derived
 * from the four spatial holds would not have fitted it.
 */

import "../../../test-bootstrap";
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MqlSubscriptionApi } from '../mql-subscription';
import { PromptApi } from '../prompt';
import { EventApi } from '../event';
import { StuffApi } from '../stuff';
import { ShadowApi } from '../shadow';
import { ContainmentApi } from '../containment';
import { Stuff } from '../../lib/stuff/Stuff';
import EventRegistry from '../../obj/EventRegistry';
import Interactive from '../../obj/Interactive';
import Avatar from '../../obj/Avatar';
import { ConnectionApi } from '../connection';
import Thing from '../../lib/stuff/Thing';
import Location from '../../lib/stuff/Location';
import type { CardHold, CardReleaseReason } from '@saxonberg/types';

interface CapturedEnvelope {
  type: string;
  [k: string]: unknown;
}

interface Harness {
  interactive: Interactive;
  avatar: Avatar;
  location: Location;
  elsewhere: Location;
  envelopes: CapturedEnvelope[];
}

async function bootRegistry(): Promise<void> {
  const reg = await StuffApi.create(() => {
    const r = new EventRegistry();
    Stuff._stampTemplatePath(r, '/obj/EventRegistry');
    return r;
  });
  StuffApi.unregister(reg);
  StuffApi.register(reg);
  EventApi._setRegistryForTesting(reg);
}

async function setup(): Promise<Harness> {
  await bootRegistry();
  const location = await StuffApi.create(() => new Location());
  const elsewhere = await StuffApi.create(() => new Location());
  const avatar = await StuffApi.create(() => new Avatar());
  avatar.setName('Alice');
  ContainmentApi.move(avatar, location);

  const interactive = await StuffApi.create(
    () => new Interactive('sock-1', 'sess-1', { _id: 'u1' } as never),
  );
  ConnectionApi.transfer(interactive, avatar);

  const envelopes: CapturedEnvelope[] = [];
  vi.spyOn(avatar, 'onEnvelope').mockImplementation((tpl) => {
    envelopes.push(tpl as unknown as CapturedEnvelope);
  });
  return { interactive, avatar, location, elsewhere, envelopes };
}

/** The release envelope for `id`, if the card was released. */
function releaseOf(
  envelopes: CapturedEnvelope[],
  id: string,
): { hold: CardHold; reason: CardReleaseReason } | undefined {
  const e = envelopes.find(
    (x) => x.type === 'mql-subscription-released' && x.subscriptionId === id,
  );
  return e as unknown as
    | { hold: CardHold; reason: CardReleaseReason }
    | undefined;
}

function isOpen(interactive: Interactive, id: string): boolean {
  return MqlSubscriptionApi.listCards(interactive).some(
    (p) => p.subscriptionId === id,
  );
}

describe('card hold conditions', () => {
  beforeEach(() => {
    StuffApi.clearAll();
    ShadowApi._clearAllForTesting();
    EventApi._clearAllForTesting();
    MqlSubscriptionApi._clearAllForTesting();
    PromptApi._clearAllForTesting();
  });

  /* ───────────────────────── unanswered ───────────────────────── */

  describe('unanswered', () => {
    it('holds while a prompt is pending and releases once answered', async () => {
      const h = await setup();

      // A real pending prompt. The substrate mints the id, so read it
      // back off the emitted envelope rather than inventing one — a
      // test that made up an id would prove only that an unknown id
      // reads as "not pending".
      const answered = PromptApi.confirm(h.interactive, 'Really?');
      const promptEnvelope = h.envelopes.find((e) => e.type === 'prompt');
      const promptId = (promptEnvelope as { promptId?: string } | undefined)
        ?.promptId;
      expect(promptId).toBeTruthy();
      expect(PromptApi.isPending(h.interactive, promptId!)).toBe(true);

      MqlSubscriptionApi.handleSubscribe({
        interactive: h.interactive,
        subscriptionId: 'card-unanswered',
        query: 'here',
        cardinality: 'one',
        fields: 'ref',
        hold: 'unanswered',
        holdSubject: promptId!,
      });
      expect(isOpen(h.interactive, 'card-unanswered')).toBe(true);

      // A re-resolve while still pending must NOT release it.
      MqlSubscriptionApi.refreshForInteractive(h.interactive);
      await MqlSubscriptionApi._drainScheduledForTesting();
      expect(isOpen(h.interactive, 'card-unanswered')).toBe(true);
      expect(releaseOf(h.envelopes, 'card-unanswered')).toBeUndefined();

      // Answer it — now the card owes nothing and goes.
      PromptApi.handleResponse(h.interactive, {
        promptId: promptId!,
        response: 'yes',
      });
      await expect(answered).resolves.toBe(true);
      expect(PromptApi.isPending(h.interactive, promptId!)).toBe(false);

      MqlSubscriptionApi.refreshForInteractive(h.interactive);
      await MqlSubscriptionApi._drainScheduledForTesting();

      expect(isOpen(h.interactive, 'card-unanswered')).toBe(false);
      expect(releaseOf(h.envelopes, 'card-unanswered')).toMatchObject({
        hold: 'unanswered',
        reason: 'answered',
      });
    });
  });

  /* ─────────────────────────── here ───────────────────────────── */

  describe('here', () => {
    it('holds where it opened and releases when the viewer leaves', async () => {
      const h = await setup();
      MqlSubscriptionApi.handleSubscribe({
        interactive: h.interactive,
        subscriptionId: 'card-here',
        query: 'here',
        cardinality: 'one',
        fields: 'ref',
        hold: 'here',
      });

      MqlSubscriptionApi.refreshForInteractive(h.interactive);
      await MqlSubscriptionApi._drainScheduledForTesting();
      expect(isOpen(h.interactive, 'card-here')).toBe(true);

      ContainmentApi.move(h.avatar, h.elsewhere);
      MqlSubscriptionApi.refreshForInteractive(h.interactive);
      await MqlSubscriptionApi._drainScheduledForTesting();

      expect(isOpen(h.interactive, 'card-here')).toBe(false);
      expect(releaseOf(h.envelopes, 'card-here')).toMatchObject({
        hold: 'here',
        reason: 'left',
      });
    });
  });

  /* ────────────────────────── present ─────────────────────────── */

  describe('present', () => {
    it('holds while the subject shares the room and releases when it goes', async () => {
      const h = await setup();
      const bob = await StuffApi.create(() => new Avatar());
      bob.setName('Bob');
      ContainmentApi.move(bob, h.location);

      MqlSubscriptionApi.handleSubscribe({
        interactive: h.interactive,
        subscriptionId: 'card-present',
        query: 'peers',
        cardinality: 'many',
        fields: 'ref',
        hold: 'present',
      });

      MqlSubscriptionApi.refreshForInteractive(h.interactive);
      await MqlSubscriptionApi._drainScheduledForTesting();
      expect(isOpen(h.interactive, 'card-present')).toBe(true);

      ContainmentApi.move(bob, h.elsewhere);
      MqlSubscriptionApi.refreshForInteractive(h.interactive);
      await MqlSubscriptionApi._drainScheduledForTesting();

      expect(isOpen(h.interactive, 'card-present')).toBe(false);
      expect(releaseOf(h.envelopes, 'card-present')).toMatchObject({
        hold: 'present',
        reason: 'departed',
      });
    });
  });

  /* ────────────────────────── inReach ─────────────────────────── */

  describe('inReach', () => {
    it('holds while the subject is reachable and releases when it is not', async () => {
      const h = await setup();
      const lantern = await StuffApi.create(() => {
        const t = new Thing();
        t.setShortDescription('an iron lantern');
        return t;
      });
      ContainmentApi.move(lantern, h.location);

      MqlSubscriptionApi.handleSubscribe({
        interactive: h.interactive,
        subscriptionId: 'card-reach',
        query: 'reachable',
        cardinality: 'many',
        fields: 'ref',
        hold: 'inReach',
      });

      MqlSubscriptionApi.refreshForInteractive(h.interactive);
      await MqlSubscriptionApi._drainScheduledForTesting();
      expect(isOpen(h.interactive, 'card-reach')).toBe(true);

      ContainmentApi.move(lantern, h.elsewhere);
      MqlSubscriptionApi.refreshForInteractive(h.interactive);
      await MqlSubscriptionApi._drainScheduledForTesting();

      expect(isOpen(h.interactive, 'card-reach')).toBe(false);
      expect(releaseOf(h.envelopes, 'card-reach')).toMatchObject({
        hold: 'inReach',
        reason: 'out-of-reach',
      });
    });
  });

  /* ────────────────────────── carried ─────────────────────────── */

  describe('carried', () => {
    it('holds while carried and releases when dropped', async () => {
      const h = await setup();
      const coin = await StuffApi.create(() => {
        const t = new Thing();
        t.setShortDescription('a silver coin');
        return t;
      });
      ContainmentApi.move(coin, h.avatar);

      // Query the coin by keyword, not the `inventory` seed: the card's
      // subject must be the thing itself. (`inventory` resolves to the
      // holder, so a card keyed on it would have no subject at all.)
      MqlSubscriptionApi.handleSubscribe({
        interactive: h.interactive,
        subscriptionId: 'card-carried',
        query: 'coin',
        cardinality: 'many',
        fields: 'ref',
        hold: 'carried',
      });

      MqlSubscriptionApi.refreshForInteractive(h.interactive);
      await MqlSubscriptionApi._drainScheduledForTesting();
      expect(isOpen(h.interactive, 'card-carried')).toBe(true);

      ContainmentApi.move(coin, h.location);
      MqlSubscriptionApi.refreshForInteractive(h.interactive);
      await MqlSubscriptionApi._drainScheduledForTesting();

      expect(isOpen(h.interactive, 'card-carried')).toBe(false);
      expect(releaseOf(h.envelopes, 'card-carried')).toMatchObject({
        hold: 'carried',
        reason: 'dropped',
      });
    });
  });

  /* ──────────────────── the pin, both directions ───────────────── */

  describe('a manual pin overrides in both directions', () => {
    /*
     * Direction one: KEEP a card whose condition has lapsed. This is
     * the direction a "sixth hold condition" could also have done.
     */
    it('keeps a card whose hold has lapsed', async () => {
      const h = await setup();
      MqlSubscriptionApi.handleSubscribe({
        interactive: h.interactive,
        subscriptionId: 'card-pinned',
        query: 'here',
        cardinality: 'one',
        fields: 'ref',
        hold: 'here',
      });
      expect(
        MqlSubscriptionApi.setCardPinned(h.interactive, 'card-pinned', true),
      ).toBe(true);

      // Leaving would normally release a `here` card.
      ContainmentApi.move(h.avatar, h.elsewhere);
      MqlSubscriptionApi.refreshForInteractive(h.interactive);
      await MqlSubscriptionApi._drainScheduledForTesting();

      expect(isOpen(h.interactive, 'card-pinned')).toBe(true);
      expect(releaseOf(h.envelopes, 'card-pinned')).toBeUndefined();
    });

    /*
     * Direction two: DISMISS a card whose condition still holds. This
     * is the direction that proves the pin is an override rather than
     * another condition — a condition can only ever keep.
     */
    it('dismisses a card whose hold still holds', async () => {
      const h = await setup();
      MqlSubscriptionApi.handleSubscribe({
        interactive: h.interactive,
        subscriptionId: 'card-dismissed',
        query: 'here',
        cardinality: 'one',
        fields: 'ref',
        hold: 'here',
      });

      // The viewer has NOT moved — the condition is satisfied.
      expect(
        MqlSubscriptionApi.setCardPinned(
          h.interactive,
          'card-dismissed',
          false,
        ),
      ).toBe(true);
      await MqlSubscriptionApi._drainScheduledForTesting();

      expect(isOpen(h.interactive, 'card-dismissed')).toBe(false);
      expect(releaseOf(h.envelopes, 'card-dismissed')).toMatchObject({
        hold: 'here',
        reason: 'dismissed',
      });
    });

    it('hands the decision back on auto', async () => {
      const h = await setup();
      MqlSubscriptionApi.handleSubscribe({
        interactive: h.interactive,
        subscriptionId: 'card-auto',
        query: 'here',
        cardinality: 'one',
        fields: 'ref',
        hold: 'here',
      });
      MqlSubscriptionApi.setCardPinned(h.interactive, 'card-auto', true);
      ContainmentApi.move(h.avatar, h.elsewhere);
      await MqlSubscriptionApi._drainScheduledForTesting();
      expect(isOpen(h.interactive, 'card-auto')).toBe(true);

      // Back to the condition, which has already lapsed.
      MqlSubscriptionApi.setCardPinned(h.interactive, 'card-auto', null);
      await MqlSubscriptionApi._drainScheduledForTesting();
      expect(isOpen(h.interactive, 'card-auto')).toBe(false);
      expect(releaseOf(h.envelopes, 'card-auto')?.reason).toBe('left');
    });

    it('refuses to pin a subscription that is not a card', async () => {
      const h = await setup();
      MqlSubscriptionApi.handleSubscribe({
        interactive: h.interactive,
        subscriptionId: 'plain-sub',
        query: 'here',
        cardinality: 'one',
        fields: 'ref',
      });
      expect(
        MqlSubscriptionApi.setCardPinned(h.interactive, 'plain-sub', true),
      ).toBe(false);
      expect(MqlSubscriptionApi.listCards(h.interactive)).toEqual([]);
    });
  });

  /* ──────────────── the wake path, found by DRIVING ─────────────── */

  /*
   * ⚠⚠ **Every other test in this file calls `refreshForInteractive`
   * by hand, and that masked a real bug.**
   *
   * A hold is only evaluated when its subscription re-resolves, and a
   * subscription only re-resolves when something marks it dirty. A
   * `here` card is not `locationDependent` by default, so walking out
   * of the room woke nothing, the hold was never evaluated, and the
   * card was **immortal**. The suite was green throughout: the manual
   * refresh stood in for the wake that production would never do.
   *
   * Driving it live is what found it. This test is the guard, and it
   * deliberately does NOT refresh — the move alone must be enough.
   */
  it('releases on the MOVE ALONE, with no manual refresh', async () => {
    const h = await setup();
    MqlSubscriptionApi.handleSubscribe({
      interactive: h.interactive,
      subscriptionId: 'card-wake',
      query: 'here',
      cardinality: 'one',
      fields: 'ref',
      hold: 'here',
    });
    expect(isOpen(h.interactive, 'card-wake')).toBe(true);

    // The ONLY thing that happens is the walk. No refresh.
    ContainmentApi.move(h.avatar, h.elsewhere);
    await MqlSubscriptionApi._drainScheduledForTesting();

    expect(isOpen(h.interactive, 'card-wake')).toBe(false);
    expect(releaseOf(h.envelopes, 'card-wake')).toMatchObject({
      hold: 'here',
      reason: 'left',
    });
  });

  /* ───────────────────── one registry, N cards ─────────────────── */

  /*
   * Criterion 11. An N-card set is N subscriptions plus a lifetime
   * rule — so the cards are visible in the ordinary registry count,
   * and a second registry would show up here as cards that the
   * subscription registry does not know about.
   */
  it('lives in the one subscription registry', async () => {
    const h = await setup();
    for (const id of ['p1', 'p2', 'p3']) {
      MqlSubscriptionApi.handleSubscribe({
        interactive: h.interactive,
        subscriptionId: id,
        query: 'here',
        cardinality: 'one',
        fields: 'ref',
        hold: 'here',
      });
    }
    // Plus one ordinary, hold-less subscription.
    MqlSubscriptionApi.handleSubscribe({
      interactive: h.interactive,
      subscriptionId: 'plain',
      query: 'here',
      cardinality: 'one',
      fields: 'ref',
    });

    expect(MqlSubscriptionApi._getRegistrySizeForTesting()).toBe(4);
    expect(MqlSubscriptionApi.listCards(h.interactive)).toHaveLength(3);
  });
});
