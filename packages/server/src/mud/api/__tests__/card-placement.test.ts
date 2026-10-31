/**
 * ⭐⭐ The registry owns placement (client-surface D4/D5/D8): every change
 * to a card's size, place, tray state or life is a command, reported by a
 * `card-arranged`; liveness follows attention (placed, pinned, or a role);
 * medium and full hold one card each; an arrangement records and restores
 * all of it in units.
 */

import '../../../test-bootstrap';
import { describe, it, expect, beforeEach } from 'vitest';
import { CardApi } from '../card';
import { StuffApi } from '../stuff';
import { EventApi } from '../event';
import { ShadowApi } from '../shadow';
import { MqlSubscriptionApi } from '../mql-subscription';
import { makeHarness, makeContext, type Harness } from './card-harness';
import Locale from '../../platform/location/Locale';

beforeEach(() => {
  StuffApi.clearAll();
  ShadowApi._clearAllForTesting();
  EventApi._clearAllForTesting();
  MqlSubscriptionApi._clearAllForTesting();
  CardApi._clearAllForTesting();
});

async function lookAtThing(h: Harness, name: string): Promise<string> {
  const t = await StuffApi.create(() => new Locale());
  t.setShortDescription(name);
  return CardApi.open(
    makeContext(h, { commandText: `look ${name}`, verbs: ['look'], opensCard: 'subject' }),
    'subject',
    { subjectId: t.stuffId },
  )!;
}

function openWho(h: Harness, text = 'who'): string {
  return CardApi.open(
    makeContext(h, { commandText: text, verbs: ['who'], opensCard: 'who' }),
    'who',
  )!;
}

const card = (h: Harness, id: string) => h.interactive.listCards().find((c) => c.instanceId === id)!;

describe('per-card liveness (D4)', () => {
  it('⭐ a flowing subject card is a SNAPSHOT; placing it subscribes; unplacing makes it a snapshot again', async () => {
    const h = await makeHarness();
    const id = await lookAtThing(h, 'stool');
    expect(card(h, id).live).toBe(false);
    const before = MqlSubscriptionApi._getRegistrySizeForTesting();

    expect(h.interactive.arrangeCard(id, 'place').refused).toBeNull();
    expect(card(h, id).live).toBe(true);
    expect(MqlSubscriptionApi._getRegistrySizeForTesting()).toBe(before + 1);
    const wake = h.ofType('card-touched').find((t) => t.instanceId === id && t.live === true);
    expect(wake?.result).toBeDefined();

    h.interactive.arrangeCard(id, 'unplace');
    expect(card(h, id).live).toBe(false);
    expect(MqlSubscriptionApi._getRegistrySizeForTesting()).toBe(before);
    const stamped = h.ofType('card-touched').find((t) => t.instanceId === id && t.live === false);
    expect(typeof stamped?.takenAt).toBe('number');
  });

  it('a pinned subject card keeps answering (B11)', async () => {
    const h = await makeHarness();
    const id = await lookAtThing(h, 'stool');
    h.interactive.setCardPinned(id, true);
    expect(card(h, id).live).toBe(true);
  });

  it('⭐ there is no placed-card cap (B1) — the screen is the limit', async () => {
    const h = await makeHarness();
    for (let i = 0; i < 15; i++) {
      const id = await lookAtThing(h, `thing-${i}`);
      expect(h.interactive.arrangeCard(id, 'place').refused).toBeNull();
    }
    expect(h.interactive.listCards().filter((c) => c.placed)).toHaveLength(15);
  });
});

describe('shape and place (D8)', () => {
  it('every action reports a card-arranged', async () => {
    const h = await makeHarness();
    const id = openWho(h);
    for (const action of ['grow', 'minimize', 'restore', 'place', 'unplace', 'shrink'] as const) {
      h.interactive.arrangeCard(id, action);
    }
    expect(h.ofType('card-arranged').filter((e) => e.instanceId === id)).toHaveLength(6);
  });

  it('⭐ medium holds ONE card: growing B returns A to the size it had', async () => {
    const h = await makeHarness();
    const a = openWho(h, 'who');
    const b = openWho(h, 'who --here');
    h.interactive.arrangeCard(a, 'grow');
    expect(card(h, a).size).toBe('medium');
    h.interactive.arrangeCard(b, 'grow');
    expect(card(h, b).size).toBe('medium');
    expect(card(h, a).size).toBe('unit');
  });

  it('⭐ move is INSERTION: the column\'s cards at or below shift down', async () => {
    const h = await makeHarness();
    const a = openWho(h, 'who');
    const b = openWho(h, 'who --here');
    h.interactive.arrangeCard(a, 'move', { col: 1, row: 0 });
    h.interactive.arrangeCard(b, 'move', { col: 1, row: 0 });
    expect(card(h, b).placed).toEqual({ col: 1, row: 0 });
    expect(card(h, a).placed).toEqual({ col: 1, row: 1 });
  });

  it('refuses by name: an unknown card, and closing or unplacing a role card', async () => {
    const h = await makeHarness();
    expect(h.interactive.arrangeCard('nope', 'grow').refused).toBe('unknown-card');
    const here = CardApi.open(
      makeContext(h, { commandText: 'look', verbs: ['look'], opensCard: 'subject' }),
      'subject',
      { subjectId: h.room.stuffId },
    )!;
    expect(card(h, here).role).toBe('here');
    expect(h.interactive.arrangeCard(here, 'close').refused).toBe('role-card');
    expect(h.interactive.arrangeCard(here, 'unplace').refused).toBe('role-card');
  });

  it('close closes it now, saying `dismissed`', async () => {
    const h = await makeHarness();
    const id = openWho(h);
    h.interactive.arrangeCard(id, 'close');
    expect(h.interactive.listCards()).toHaveLength(0);
    expect(h.ofType('card-closed')[0]!.reason).toBe('dismissed');
  });
});

describe('arrangements in units (D5)', () => {
  it('⭐ an arrangement restores size, place, tray and pin', async () => {
    const h = await makeHarness();
    h.interactive.applyCardArrangement([
      { cardId: 'who', size: 'medium', placed: { col: 2, row: 1 }, pinned: true },
      { cardId: 'news', minimized: true },
    ]);
    const cards = h.interactive.listCards();
    const who = cards.find((c) => c.cardId === 'who')!;
    const news = cards.find((c) => c.cardId === 'news')!;
    expect(who).toMatchObject({ size: 'medium', placed: { col: 2, row: 1 }, pinned: true });
    expect(news.minimized).toBe(true);
    expect(h.ofType('card-opened').find((e) => e.cardId === 'who')).toMatchObject({
      size: 'medium',
      placed: { col: 2, row: 1 },
    });
  });

  it('re-applying to a card already up re-shapes it in place', async () => {
    const h = await makeHarness();
    const id = openWho(h);
    h.interactive.applyCardArrangement([{ cardId: 'who', placed: { col: 0, row: 3 } }]);
    expect(card(h, id).placed).toEqual({ col: 0, row: 3 });
  });
});
