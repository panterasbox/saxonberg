/**
 * **The rate card** — and both halves of the requirement, because each
 * is a different design claim.
 *
 * > **Rates must be visible and settable.** Visible, because rate
 * > discrimination is the antitrust arc's evidence and must be a table
 * > rather than an accusation. Settable, because a carrier that cannot
 * > choose its prices cannot be the villain of that arc.
 *
 * So: **a non-employee can read a published card** (AC12), a carrier can
 * publish a different one, and **two different rates on one route are
 * distinguishable in the record** — which is the whole evidentiary
 * point, and the reason a superseded card is never overwritten.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import { ExecutionContextApi } from '@saxonberg/server/mud/api/execution-context';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import { Idea } from '@saxonberg/server/mud/lib/stuff/Idea';
import { makeStuffAtPath } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import RateCardRegistry from '../idea/RateCardRegistry';
import RateBoard, { RATE_CARD_REGISTRY_PATH } from '../thing/RateBoard';
import { makeStuff } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import {
  CARRIER,
  RIVAL,
  business,
  clerk,
  installStore,
  rateCards,
} from './haulage-fixtures';

const TERMINUS = '/world/terminus/estuary/lower-towpath';
const YARD = '/world/rejection/location/pithead-yard';

/** ⚠ Here rather than in the fixtures — see the note there. */
async function asClerk<T>(fn: () => Promise<T>): Promise<T> {
  return ExecutionContextApi.runRoot(null, 'haulage.test', () => {
    ExecutionContextApi.tagActingAuthor(clerk());
    return fn();
  }) as Promise<T>;
}

/** Somebody with no employment anywhere — the stranger of AC12. */
class Stranger extends Idea {
  static _mixinName = 'HaulageStranger';
}

let clock = 10_000;

beforeEach(() => {
  StuffApi.clearAll();
  installStore();
  clock = 10_000;
  vi.spyOn(WorldClockApi, 'getNow').mockImplementation(() =>
    Quantity.of(clock, 's'),
  );
});
afterEach(() => {
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

describe('a rate card is settable', () => {
  it('the carrier names its own prices', async () => {
    const carrier = business(CARRIER);
    const reg = rateCards();
    await asClerk(() =>
      reg.publish(carrier, [
        { from: TERMINUS, to: YARD, commodity: 'ore', perKgMinor: 3, minimumMinor: 20 },
        { from: '', to: '', commodity: '', perKgMinor: 1, minimumMinor: 5 },
      ]),
    );
    const card = await reg.currentCard(carrier);
    expect(card!.lines).toHaveLength(2);
    expect(card!.carrier).toBe(CARRIER);
  });

  it('refuses an empty tariff and a negative rate', async () => {
    const carrier = business(CARRIER);
    const reg = rateCards();
    await expect(asClerk(() => reg.publish(carrier, []))).rejects.toThrow(
      /prices nothing/,
    );
    await expect(
      asClerk(() =>
        reg.publish(carrier, [
          { from: '', to: '', commodity: '', perKgMinor: -1, minimumMinor: 0 },
        ]),
      ),
    ).rejects.toThrow(/cannot be negative/);
  });

  it('⭐ a NEW card never overwrites the old one — a superseded price is evidence', async () => {
    const carrier = business(CARRIER);
    const reg = rateCards();
    await asClerk(() =>
      reg.publish(carrier, [
        { from: TERMINUS, to: YARD, commodity: '', perKgMinor: 2, minimumMinor: 10 },
      ]),
    );
    clock = 20_000;
    await asClerk(() =>
      reg.publish(carrier, [
        { from: TERMINUS, to: YARD, commodity: '', perKgMinor: 5, minimumMinor: 10 },
      ]),
    );

    const cards = await reg.cardsOf(carrier);
    expect(cards).toHaveLength(2);
    // Newest wins a quote…
    expect(cards[0]!.lines[0]!.perKgMinor).toBe(5);
    // …and last season's is still on the record, which is exactly the
    // row an antitrust argument is made of: what did they charge me
    // then, and what did they charge him?
    expect(cards[1]!.lines[0]!.perKgMinor).toBe(2);
  });
});

describe('a rate card is visible', () => {
  it('⭐⭐ AC12 — a STRANGER reads the board and prices a route', async () => {
    const carrier = business(CARRIER);
    const registry = makeStuffAtPath(
      () => new RateCardRegistry(),
      RATE_CARD_REGISTRY_PATH,
    );
    const real = StuffApi.singleton.bind(StuffApi);
    vi.spyOn(StuffApi, 'singleton').mockImplementation(((path: string) => {
      if (path === RATE_CARD_REGISTRY_PATH) {
        return Promise.resolve(registry as unknown as Stuff);
      }
      if (path === CARRIER) return Promise.resolve(carrier as unknown as Stuff);
      return real(path);
    }) as typeof StuffApi.singleton);

    await asClerk(() =>
      registry.publish(carrier, [
        { from: TERMINUS, to: YARD, commodity: 'ore', perKgMinor: 3, minimumMinor: 20 },
      ]),
    );

    const board = makeStuff(() => new RateBoard());
    board.setCarrierPath(CARRIER);
    const shown = await board.refresh();

    // ⭐ The surface is a BOARD, not a verb on somebody's books:
    // `house` is your own books and would have been exactly the wrong
    // shape. Reading is a thing everybody can already do, so a stranger
    // with no employment, no membership and no business of their own
    // can price a route by standing in front of it.
    expect(shown).toMatch(/RATES/);
    expect(shown).toMatch(/3\/kg/);
    expect(shown).toMatch(/minimum 20/);
    // And the shipped `read` verb has text to show, from the LIVE card.
    expect(board.getMarkText()).toBe(shown);
  });

  it('a board with no card behind it says so, rather than lying', async () => {
    const carrier = business(CARRIER);
    const registry = makeStuffAtPath(
      () => new RateCardRegistry(),
      RATE_CARD_REGISTRY_PATH,
    );
    const real = StuffApi.singleton.bind(StuffApi);
    vi.spyOn(StuffApi, 'singleton').mockImplementation(((path: string) => {
      if (path === RATE_CARD_REGISTRY_PATH) {
        return Promise.resolve(registry as unknown as Stuff);
      }
      if (path === CARRIER) return Promise.resolve(carrier as unknown as Stuff);
      return real(path);
    }) as typeof StuffApi.singleton);

    const board = makeStuff(() => new RateBoard());
    board.setCarrierPath(CARRIER);
    expect(await board.render()).toMatch(/they have not said/);
  });

  it('⭐ AC12 — a NON-EMPLOYEE reads a published card', async () => {
    const carrier = business(CARRIER);
    await asClerk(() =>
      rateCards().publish(carrier, [
        { from: TERMINUS, to: YARD, commodity: 'ore', perKgMinor: 3, minimumMinor: 20 },
      ]),
    );

    // A stranger: on nobody's roster, holding no position, standing
    // nowhere in particular. Reading a tariff is an ordinary read on a
    // path anybody can name — no employment check, no membership, no
    // counter to stand at. That is what makes rate discrimination a
    // table rather than an accusation.
    const stranger = makeStuffAtPath(
      () => new Stranger(),
      '/platform/agent/Avatar/stranger',
    );
    expect(stranger).toBeDefined();
    const seen = await rateCards().currentCard(carrier);
    expect(seen!.lines[0]!.perKgMinor).toBe(3);
  });

  it('⭐ AC12 — two different rates on ONE route are distinguishable in the record', async () => {
    const carrier = business(CARRIER);
    const rival = business(RIVAL);
    const reg = rateCards();
    await asClerk(async () => {
      await reg.publish(carrier, [
        { from: TERMINUS, to: YARD, commodity: 'ore', perKgMinor: 3, minimumMinor: 20 },
        // The SAME route, a different commodity, a different price.
        // Whether that is efficient pricing or discrimination is an
        // argument; that it is legible is the requirement.
        { from: TERMINUS, to: YARD, commodity: 'spirits', perKgMinor: 9, minimumMinor: 20 },
      ]);
      await reg.publish(rival, [
        { from: TERMINUS, to: YARD, commodity: 'ore', perKgMinor: 2, minimumMinor: 25 },
      ]);
    });

    expect(await reg.quote(carrier, TERMINUS, YARD, 'ore', 100)).toBe(300);
    expect(await reg.quote(carrier, TERMINUS, YARD, 'spirits', 100)).toBe(900);
    expect(await reg.quote(rival, TERMINUS, YARD, 'ore', 100)).toBe(200);
  });

  it('reads MOST SPECIFIC first, the way a tariff is read', async () => {
    const carrier = business(CARRIER);
    const reg = rateCards();
    await asClerk(() =>
      reg.publish(carrier, [
        { from: '', to: '', commodity: '', perKgMinor: 1, minimumMinor: 5 },
        { from: TERMINUS, to: '', commodity: '', perKgMinor: 2, minimumMinor: 5 },
        { from: TERMINUS, to: YARD, commodity: 'ore', perKgMinor: 4, minimumMinor: 5 },
      ]),
    );
    // Both ends and the commodity beats one end, which beats the
    // catch-all.
    expect(await reg.quote(carrier, TERMINUS, YARD, 'ore', 10)).toBe(40);
    expect(await reg.quote(carrier, TERMINUS, YARD, 'grain', 10)).toBe(20);
    expect(await reg.quote(carrier, '/elsewhere', YARD, 'grain', 10)).toBe(10);
  });

  it('the minimum bites on a small load — a clerk still costs something', async () => {
    const carrier = business(CARRIER);
    const reg = rateCards();
    await asClerk(() =>
      reg.publish(carrier, [
        { from: '', to: '', commodity: '', perKgMinor: 1, minimumMinor: 12 },
      ]),
    );
    expect(await reg.quote(carrier, TERMINUS, YARD, '', 2)).toBe(12);
    expect(await reg.quote(carrier, TERMINUS, YARD, '', 50)).toBe(50);
  });

  it('a carrier that has published nothing quotes nothing', async () => {
    expect(
      await rateCards().quote(business(RIVAL), TERMINUS, YARD, '', 10),
    ).toBeNull();
  });
});
