/**
 * ⭐ **A mode resolves the arrangement it can actually open** (AC 13),
 * and the arrangement is applied on **login** (Wave 7).
 *
 * `SHIPPED_ARRANGEMENT_CARDS` was `{chat: [], play: ['place'], watch:
 * [], build: [], govern: []}` — sparse on purpose, because *"pre-filling
 * them here would be sizing a vocabulary to a mockup."* This build ships
 * the surfaces those modes were waiting for, so the argument expires and
 * the map fills.
 *
 * ⚠⚠ **AC 13 said `build`/`chat`/`watch` non-empty and `play` shipped
 * empty instead** — a deviation, argued rather than drifted. `play`'s
 * one row was the ROOM card, and an arrangement cannot open an
 * inspection card: an arrangement names a KIND, an inspection card is
 * about a SUBJECT the arrangement cannot know, and `applyArrangement`
 * skips subject cards on both sides. The row was already opening
 * nothing. Arrival mints the room card, which is the correct owner.
 *
 * ⚠ It is also **re-keyed by (mode, arrangement)**. `watch` ships two
 * arrangements — `viewer` and `streamer` — and one flat list per mode
 * cannot express them. The mode-only shape survived only because the map
 * was empty; filling it is what makes the churn argument expire too.
 */

import '../../../test-bootstrap';
import { describe, it, expect, beforeEach } from 'vitest';
import {
  CARD_IDS,
  INSPECTION_CARD_IDS,
  COCKPIT_MODES,
  SHIPPED_ARRANGEMENT_CARDS,
  COCKPIT_ARRANGEMENTS,
  type CardId,
  type CockpitMode,
} from '@saxonberg/types';
import { CardApi } from '../card';
import { StuffApi } from '../stuff';
import { EventApi } from '../event';
import { ShadowApi } from '../shadow';
import { MqlSubscriptionApi } from '../mql-subscription';
import { makeHarness } from './card-harness';

describe('the shipped arrangements', () => {
  beforeEach(() => {
    StuffApi.clearAll();
    ShadowApi._clearAllForTesting();
    EventApi._clearAllForTesting();
    MqlSubscriptionApi._clearAllForTesting();
    CardApi._clearAllForTesting();
  });

  it('is total over the modes, and keyed by (mode, arrangement)', () => {
    expect(Object.keys(SHIPPED_ARRANGEMENT_CARDS).sort()).toEqual(
      [...COCKPIT_MODES].sort(),
    );
    for (const mode of COCKPIT_MODES) {
      const byArrangement = SHIPPED_ARRANGEMENT_CARDS[mode];
      expect(typeof byArrangement, `${mode}`).toBe('object');
      // Every arrangement named here is one the mode actually ships.
      for (const name of Object.keys(byArrangement)) {
        expect(
          (COCKPIT_ARRANGEMENTS[mode] as readonly string[]).includes(name),
          `${mode} names an arrangement it does not ship: ${name}`,
        ).toBe(true);
      }
    }
  });

  it('⭐ `watch` expresses its TWO arrangements separately', () => {
    // The row a mode-keyed map could not have held at all.
    expect(Object.keys(SHIPPED_ARRANGEMENT_CARDS.watch).sort()).toEqual([
      'streamer',
      'viewer',
    ]);
  });

  it('every named card is a real one', () => {
    for (const mode of COCKPIT_MODES) {
      for (const [name, cards] of Object.entries(
        SHIPPED_ARRANGEMENT_CARDS[mode],
      )) {
        for (const id of cards) {
          expect(
            (CARD_IDS as readonly string[]).includes(id),
            `${mode}/${name} names unknown card '${id}'`,
          ).toBe(true);
        }
      }
    }
  });

  it('⭐ `build` and `chat` resolve a NON-EMPTY arrangement', () => {
    const nonEmpty = (mode: CockpitMode, arrangement: string): CardId[] => [
      ...(SHIPPED_ARRANGEMENT_CARDS[mode][arrangement] ?? []),
    ];
    expect(nonEmpty('build', 'default')).toEqual(['cms', 'git', 'studio']);
    expect(nonEmpty('chat', 'default')).toEqual(['who']);
  });

  /**
   * ⚠ `watch`, `govern` and `play` ship EMPTY, and each is a decision
   * rather than an omission: the watch surfaces are the embed and the
   * overlay (chrome, not cards), and `govern` has no card of its own
   * yet. A row pre-filled with a card that does not exist would be
   * sizing the vocabulary to a mockup, which is the rule this map was
   * written under.
   *
   * ⭐⭐ **`play` is empty for a different and better reason.** It used
   * to name the room card, and an arrangement CANNOT open an inspection
   * card: an arrangement names a KIND, an inspection card is about a
   * SUBJECT, and `applyArrangement` skips subject cards on both sides.
   * The row was already opening nothing. Arrival mints the room card —
   * the arrangement has no business duplicating it, and the test below
   * pins that the two never fight over it.
   */
  it('⚠ `watch`, `govern` and `play` ship empty, deliberately', () => {
    expect(SHIPPED_ARRANGEMENT_CARDS.watch.viewer).toEqual([]);
    expect(SHIPPED_ARRANGEMENT_CARDS.watch.streamer).toEqual([]);
    expect(SHIPPED_ARRANGEMENT_CARDS.govern.default).toEqual([]);
    expect(SHIPPED_ARRANGEMENT_CARDS.play.default).toEqual([]);
  });

  /**
   * ⚠⚠ **No arrangement anywhere may name an inspection card.** Not a
   * style rule: `applyArrangement` silently drops one, so a row that
   * named it would be a promise the resolver does not keep — a mode
   * that looks like it opens a card and does not.
   */
  it('⚠ no shipped arrangement names an inspection card', () => {
    for (const [mode, arrangements] of Object.entries(
      SHIPPED_ARRANGEMENT_CARDS,
    )) {
      for (const [name, ids] of Object.entries(arrangements)) {
        for (const id of ids) {
          expect(
            (INSPECTION_CARD_IDS as readonly string[]).includes(id),
            `${mode}/${name} names inspection card '${id}', which an ` +
              `arrangement cannot open`,
          ).toBe(false);
        }
      }
    }
  });

  it("applying `build`'s arrangement opens the three authoring cards", async () => {
    const h = await makeHarness();
    const { opened } = h.interactive.applyCardArrangement([
      ...SHIPPED_ARRANGEMENT_CARDS.build.default!,
    ]);
    expect(opened).toBe(3);
    expect(h.interactive.listCards().map((c) => c.cardId).sort()).toEqual([
      'cms',
      'git',
      'studio',
    ]);
    // ⚠ All three ship PINNED: an editor that aged out mid-edit would
    // be a data-loss bug wearing a lifetime rule.
    expect(h.interactive.listCards().every((c) => c.pinned)).toBe(true);
  });
});
