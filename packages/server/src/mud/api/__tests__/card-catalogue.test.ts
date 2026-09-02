/**
 * The card catalogue's totality gate.
 *
 * ⭐ **A new card cannot ship without choosing its lifetime.** `CARDS`
 * is a `Record<CardId, CardDefinition>` with REQUIRED `pinnedByDefault`
 * and `live`, so the compiler refuses a row that omits either. These
 * tests cover what the compiler cannot: that the runtime list and the
 * type union agree, and that the count is what we think it is.
 *
 * ⚠ Every count is asserted as a NUMBER, not as `> 0`. A guard that can
 * pass by matching nothing is not a guard (testing.md check 1).
 */

import '../../../test-bootstrap';
import { describe, it, expect } from 'vitest';
import { CARD_IDS, INSPECTION_CARD_IDS, type CardId } from '@saxonberg/types';
import {
  CARDS,
  CARDS_BY_NAME,
  SHELF_SUBSCRIPTION,
} from '../../lib/connection/Cards';

describe('the card catalogue', () => {
  it('ships exactly eleven cards, and the list and the map agree', () => {
    expect(CARD_IDS.length).toBe(11);
    expect(Object.keys(CARDS).length).toBe(11);
    expect([...CARD_IDS].sort()).toEqual(Object.keys(CARDS).sort());
  });

  it('every row declares BOTH axes', () => {
    for (const id of CARD_IDS) {
      const def = CARDS[id];
      expect(typeof def.pinnedByDefault, `${id}.pinnedByDefault`).toBe(
        'boolean',
      );
      expect(typeof def.live, `${id}.live`).toBe('boolean');
      expect(def.command.length, `${id}.command`).toBeGreaterThan(0);
      expect(def.label.length, `${id}.label`).toBeGreaterThan(0);
    }
  });

  it('the two axes are independent — neither implies the other', () => {
    const pinnedAndStatic = CARD_IDS.filter(
      (id) => CARDS[id].pinnedByDefault && !CARDS[id].live,
    );
    const pinnedAndLive = CARD_IDS.filter(
      (id) => CARDS[id].pinnedByDefault && CARDS[id].live,
    );
    const unpinnedAndStatic = CARD_IDS.filter(
      (id) => !CARDS[id].pinnedByDefault && !CARDS[id].live,
    );
    // ⚠ `subject` is unpinned: with a card per thing you look at, an
    // inspection card that pinned itself would make "kept" meaningless
    // within a minute and put a floor under the sweep.
    expect(pinnedAndStatic.length).toBe(5);
    expect(pinnedAndLive.length).toBe(0);
    expect(unpinnedAndStatic.length).toBe(4);
    const unpinnedAndLive = CARD_IDS.filter(
      (id) => !CARDS[id].pinnedByDefault && CARDS[id].live,
    );
    expect(unpinnedAndLive).toEqual(['subject', 'stock']);
  });

  /**
   * ⚠ The liveness axis must ship EXERCISED. A catalogue where every row
   * is static leaves `live` a field nothing reads, and a declaration
   * nothing reads is indistinguishable from a broken one.
   */
  it('at least one row is live, and it is `subject` (the stock sheet joins it)', () => {
    const live = CARD_IDS.filter((id) => CARDS[id].live);
    expect(live).toEqual(['subject', 'stock']);
    // A live card's source must be MQL — there is nothing else to wake.
    expect(CARDS.subject.source.kind).toBe('mql');
    expect(CARDS.stock.source.kind).toBe('mql');
  });

  /**
   * ⚠⚠ **The catalogue may not grow a second inspection row.**
   *
   * `place` was one, and every difference it carried turned out to be a
   * lifetime or a layout decision rather than an identity: liveness is
   * decided by attention and layout by `StuffKind`. Two ids for one
   * concept is how a command view ends up declaring `opens_card:
   * [place, subject]` — *this verb opens one of two kinds of card* about
   * a target that is by construction exactly one kind of thing.
   */
  it('⚠ inspection is ONE card, whatever kind of thing you looked at', () => {
    const inspection = CARD_IDS.filter((id) => {
      const src = CARDS[id].source;
      return src.kind === 'mql' && src.needsSubject === true;
    });
    expect(inspection).toEqual(['subject']);
    expect(CARDS.subject.command).toBe('look <subject>');
  });

  it('the authoring cards declare they cannot degrade to prose', () => {
    const noProse = CARD_IDS.filter((id) => CARDS[id].noProse === true);
    expect(noProse.sort()).toEqual(['cms', 'git', 'prompt', 'studio']);
  });

  it('every payload row names a producer, and every producer is distinct', () => {
    const producers: string[] = [];
    for (const id of CARD_IDS) {
      const src = CARDS[id].source;
      if (src.kind === 'payload') producers.push(src.producer);
    }
    expect(producers.length).toBe(5);
    expect(new Set(producers).size).toBe(5);
  });

  it('exactly one row takes a subject, and it resolves behind the gate', () => {
    const needsSubject = CARD_IDS.filter((id) => {
      const src = CARDS[id].source;
      return src.kind === 'mql' && src.needsSubject === true;
    });
    /*
     * ⭐ ONE row takes a subject, and the four things you can inspect
     * are `StuffKind`s of that subject rather than four rows. It was
     * briefly two — a room card bound to the relative `here` followed
     * the viewer out of the room and rewrote itself, and binding it to
     * its subject made it identical to this one.
     */
    /*
     * ⭐⭐ **The client's `INSPECTION_CARD_IDS` and the catalogue's
     * `needsSubject` rows are the same set, and this is what keeps them
     * that way.** The feed's `Look` tab filters on the shared constant;
     * a new inspection card added here and not there would simply not
     * appear in the one tab that is about inspection.
     */
    expect([...needsSubject].sort()).toEqual([...INSPECTION_CARD_IDS].sort());
    /*
     * ⚠⚠ The query is the inert marker `$subject`, never an
     * `#<stuffId>` MQL seed. That seed is authoring-tier and ungated,
     * so a card built on it would answer for anything whose id the
     * viewer had ever seen on a frame.
     */
    const src = CARDS.subject.source;
    expect(src.kind === 'mql' && src.query).toBe('$subject');
    for (const id of CARD_IDS) {
      const s = CARDS[id].source;
      if (s.kind !== 'mql') continue;
      expect(s.query.startsWith('#'), `${id} must not seed on a raw id`).toBe(
        false,
      );
    }
  });

  it('CARDS_BY_NAME rejects a name that is not in the catalogue', () => {
    expect(CARDS_BY_NAME['who']).toBeDefined();
    expect(CARDS_BY_NAME['inspect']).toBeUndefined();
    expect(CARDS_BY_NAME['self']).toBeUndefined();
  });

  /**
   * ⭐⭐ `self` is the widget shelf's subscription and it is NOT a card:
   * it has no pinned-ness and no lifetime, and forcing it to declare
   * them would make the required-fields gate above meaningless.
   */
  it('the shelf subscription is not a card', () => {
    expect((CARD_IDS as readonly string[]).includes('self')).toBe(false);
    expect(SHELF_SUBSCRIPTION.query).toBe('me');
    expect(SHELF_SUBSCRIPTION.cardinality).toBe('one');
    expect(Array.isArray(SHELF_SUBSCRIPTION.fields)).toBe(true);
    expect(
      (SHELF_SUBSCRIPTION as unknown as Record<string, unknown>)
        .pinnedByDefault,
    ).toBeUndefined();
    expect(
      (SHELF_SUBSCRIPTION as unknown as Record<string, unknown>).live,
    ).toBeUndefined();
  });

  it('the retired chrome rows are gone from the vocabulary', () => {
    for (const retired of ['inspect', 'location', 'agent', 'instrument', 'manifest']) {
      expect(
        (CARD_IDS as readonly string[]).includes(retired),
        `${retired} should have been retired`,
      ).toBe(false);
    }
    // …and the union really is the eleven we expect, by name.
    expect([...CARD_IDS].sort()).toEqual(
      (
        [
          'cms',
          'git',
          'help',
          'news',
          'prompt',
          'stock',
          'studio',
          'subject',
          'survey',
          'who',
          'wiki',
        ] as CardId[]
      ).sort(),
    );
  });
});
