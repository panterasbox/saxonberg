/**
 * ⭐⭐ **A mode switch opens its arrangement's cards, server-side.**
 *
 * S3 shipped arrangements as **storage, not behaviour**: nothing opened
 * or closed a card on recall, on either side, so a saved workspace was
 * a name that did nothing. This suite is that behaviour, and the
 * property it pins is the one the requirement states — *switching mode
 * opens the arrangement's cards from the server, in one round trip,
 * with the client sending exactly one command.*
 *
 * ⚠ The client-sends-one-command half is structural rather than
 * asserted here: nothing in this path takes a card list from a caller.
 * What IS asserted is everything that would have to be true for the
 * client to get away with sending one — the set is resolved, the old
 * set is closed WITH A REASON, and an already-open card is left alone
 * rather than blanked and reopened.
 */

import '../../../test-bootstrap';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MqlSubscriptionApi } from '../mql-subscription';
import { StuffApi } from '../stuff';
import { ShadowApi } from '../shadow';
import { ContainmentApi } from '../containment';
import EventRegistry from '../../obj/EventRegistry';
import Interactive from '../../obj/Interactive';
import Avatar from '../../obj/Avatar';
import Location from '../../lib/stuff/Location';
import { Stuff } from '../../lib/stuff/Stuff';
import { EventApi } from '../event';
import { ConnectionApi } from '../connection';

interface Harness {
  interactive: Interactive;
  avatar: Avatar;
  here: Location;
  envelopes: Array<{
    type?: string;
    subscriptionId?: string;
    reason?: string;
    card?: string;
    hold?: string;
  }>;
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
  return { interactive, avatar, here, envelopes };
}

function openCardIds(h: Harness): string[] {
  const out: string[] = [];
  for (const p of MqlSubscriptionApi.listCards(h.interactive)) {
    if (p.cardId !== undefined) out.push(p.cardId);
  }
  return out;
}

beforeEach(() => {
  vi.restoreAllMocks();
  StuffApi.clearAll();
  ShadowApi._clearAllForTesting();
  EventApi._clearAllForTesting();
  MqlSubscriptionApi._clearAllForTesting();
});

describe('applying an arrangement', () => {
  it('⭐ opens the cards it names', async () => {
    const h = await setup();
    const result = MqlSubscriptionApi.applyArrangement(h.interactive, [
      'place',
    ]);
    expect(result.opened).toBe(1);
    expect(openCardIds(h)).toContain('place');
  });

  it('tells the client WHICH card, for a handle it never minted', async () => {
    const h = await setup();
    MqlSubscriptionApi.applyArrangement(h.interactive, ['place']);

    const result = h.envelopes.find(
      (e) => e.type === 'mql-subscription-result',
    );
    // ⚠ The subscriptionId is server-minted, so the client has no local
    // record of what it asked for. Without `card` and `hold` on the
    // envelope it could not know which body to draw or what words to
    // put in the header — and the whole one-round-trip design would
    // collapse back into a round trip per card.
    expect(result?.card).toBe('place');
    expect(result?.hold).toBe('here');
  });

  it('closes the cards it does NOT name, with a reason', async () => {
    const h = await setup();
    MqlSubscriptionApi.applyArrangement(h.interactive, ['place']);
    h.envelopes.length = 0;

    MqlSubscriptionApi.applyArrangement(h.interactive, []);

    expect(openCardIds(h)).not.toContain('place');
    const released = h.envelopes.find(
      (e) => e.type === 'mql-subscription-released',
    );
    // ⚠ `rearranged` — the workspace changed, not the world. Reusing
    // `departed` would tell the player somebody walked out, and a card
    // that vanishes with no reason at all reads as a bug.
    expect(released?.reason).toBe('rearranged');
  });

  it('⚠ leaves an already-open card ALONE rather than reopening it', async () => {
    const h = await setup();
    MqlSubscriptionApi.applyArrangement(h.interactive, ['place']);
    // Pin it — a pin is session state that a close-and-reopen would
    // silently discard.
    MqlSubscriptionApi.setCardPinned(h.interactive, 'place', true);
    h.envelopes.length = 0;

    const again = MqlSubscriptionApi.applyArrangement(h.interactive, ['place']);

    expect(again.opened).toBe(0);
    expect(again.closed).toBe(0);
    expect(
      h.envelopes.some((e) => e.type === 'mql-subscription-released'),
    ).toBe(false);
    expect(
      MqlSubscriptionApi.listCards(h.interactive).find(
        (p) => p.cardId === 'place',
      )?.pinned,
    ).toBe(true);
  });

  it('⚠ never opens a SUBJECT card from an arrangement', async () => {
    const h = await setup();
    // An arrangement is a statement about a WORKSPACE. "Keep the card
    // about Bob open" is a statement about a MOMENT — which is exactly
    // why the pin is session-scoped — and restoring it next week would
    // be restoring an answer to a question nobody is asking. It would
    // also have no subject to resolve.
    const result = MqlSubscriptionApi.applyArrangement(h.interactive, [
      'agent',
      'instrument',
      'manifest',
    ]);
    expect(result.opened).toBe(0);
    expect(openCardIds(h)).toEqual([]);
  });

  it('⚠ never closes a card opened by SHAPE', async () => {
    const h = await setup();
    // A hand-rolled subscription has no catalogue id, so no arrangement
    // ever claimed to describe it — closing it would be an arrangement
    // reaching past what it can name.
    MqlSubscriptionApi.handleSubscribe({
      interactive: h.interactive,
      subscriptionId: 'by-shape',
      query: 'here',
      cardinality: 'one',
      fields: 'ref',
      // A hold makes it a CARD — it just has no catalogue name, which
      // is the case this is about.
      hold: 'here',
    });
    MqlSubscriptionApi.applyArrangement(h.interactive, []);

    expect(
      MqlSubscriptionApi.listCards(h.interactive).some(
        (p) => p.subscriptionId === 'by-shape',
      ),
    ).toBe(true);
  });
});
