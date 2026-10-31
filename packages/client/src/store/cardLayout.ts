/**
 * ⭐⭐ Where each card goes in the card area (client-surface D5/D9) — a
 * pure function of the cards, the column count and how many cards a
 * column holds, so it is deterministic and stateless on the client.
 *
 * **One list underneath, two kinds of card in it.** A PLACED card has a
 * position (units, from the server); a FLOWING card has only a time.
 *
 * - **One column is a feed**: placed cards stack first as a stable
 *   header, flowing cards run below by time, newest at the bottom.
 * - **Two or more is a workspace**: placed cards hold their slots;
 *   flowing cards fill the shortest column. A placed card whose column
 *   does not fit folds into the last column, in (col, row) order — so
 *   narrowing and widening again returns every placed card to its slot.
 * - **No columns** (narrow): the area is a glance strip of chips.
 *
 * **Running out of room**, stopping at the first that works: a column
 * compresses (CSS); then the stalest flowing card that is unpinned and
 * fills no role and owes nothing is DISPLACED to the Recent trail, saying
 * which command displaced it; when everything left is protected the area
 * OVERFLOWS and scrolls as one surface.
 */

import type { CardState } from "./cardFeedSlice";

export interface TrailChip {
  card: CardState;
  /** Why it is on the trail: a close reason, or `displaced by <cmd>`. */
  reason: string;
}

export interface CardArrangement {
  /** The columns, left to right. A feed is one column. */
  columns: CardState[][];
  /** No columns fit: every card as a chip. */
  glance: CardState[];
  /** The Recent trail — what the system shrank, newest first. */
  trail: TrailChip[];
  /** Everything left is protected and still does not fit. */
  overflow: boolean;
}

/** Touch order: the last time the card was opened or re-run. */
export function touchOf(card: CardState): number {
  return card.touchedAt ?? card.openedAt;
}

/** A card the system may never displace. */
export function isProtected(card: CardState): boolean {
  return (
    card.placed !== undefined ||
    card.pinned ||
    card.role !== undefined ||
    card.promptId !== undefined
  );
}

export function arrangeCards(
  cards: readonly CardState[],
  units: number,
  capacityPerColumn: number,
): CardArrangement {
  const husks = cards
    .filter((c) => c.closed !== undefined)
    .sort((a, b) => b.openedAt - a.openedAt)
    .map((card) => ({ card, reason: card.closed ?? "" }));
  const live = cards.filter((c) => c.closed === undefined);

  if (units <= 0) {
    return {
      columns: [],
      glance: [...live].sort((a, b) => touchOf(b) - touchOf(a)),
      trail: husks,
      overflow: false,
    };
  }

  const n = Math.max(1, Math.floor(units));
  const placed = live
    .filter((c) => c.placed !== undefined)
    .sort((a, b) => a.placed!.col - b.placed!.col || a.placed!.row - b.placed!.row);
  let flowing = live
    .filter((c) => c.placed === undefined)
    .sort((a, b) => touchOf(a) - touchOf(b));

  // ⭐ Displace before laying out: the stalest unprotected flowing card
  // goes to the trail, until everything fits or only protected ones are
  // left.
  const capacity = Math.max(1, capacityPerColumn) * n;
  const displaced: TrailChip[] = [];
  const newest = flowing[flowing.length - 1];
  while (placed.length + flowing.length > capacity) {
    const victim = flowing.find((c) => !isProtected(c) && c !== newest);
    if (!victim) break;
    flowing = flowing.filter((c) => c !== victim);
    displaced.push({
      card: victim,
      reason: newest ? `displaced by ${newest.key}` : "displaced",
    });
  }
  const trail = [...displaced.reverse(), ...husks];

  if (n === 1) {
    const column = [...placed, ...flowing];
    return { columns: [column], glance: [], trail, overflow: column.length > capacity };
  }

  const columns: CardState[][] = Array.from({ length: n }, () => []);
  for (const c of placed) {
    const col = Math.min(c.placed!.col, n - 1);
    columns[col]!.push(c);
  }
  for (const c of flowing) {
    let target = 0;
    for (let i = 1; i < n; i++) {
      if (columns[i]!.length < columns[target]!.length) target = i;
    }
    columns[target]!.push(c);
  }
  const overflow = columns.some((col) => col.length > capacityPerColumn);
  return { columns, glance: [], trail, overflow };
}
