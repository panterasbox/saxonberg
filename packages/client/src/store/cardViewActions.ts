/**
 * cardViewActions — named views over the **card feed**, mirroring
 * `consoleActions` for the terminal.
 *
 * Each action mutates local `clientState` optimistically and emits one
 * `client-state-write` so the change persists across reconnect. The
 * store layer stays pure state; the IO boundary lives here.
 *
 * ## ⭐ `All` is the absence of a filter
 *
 * It is not a stored row and never has been. That is what makes it
 * locked and undeletable rather than merely *not currently deleted* —
 * and it is why deleting every view a player made is safe.
 *
 * ## ⚠⚠ The seeding clobber, and why there is nothing to seed
 *
 * `console.tabs` shipped a bug where an ABSENT key read as *first run*,
 * so a layout mounting before the connection payload landed wrote ship
 * defaults over the player's saved views. The fix there was to key the
 * seeding effect on `Array.isArray(clientState[...])`.
 *
 * ⭐ The card views close it one step earlier: **they ship no defaults
 * at all**. `All` is structural, and a player's views are theirs to
 * make — so there is no write to race, and the bug is absent by
 * construction rather than guarded against. `readViews` still
 * distinguishes *absent* from *empty*, because a caller that could not
 * tell them apart would reintroduce exactly the same question.
 */

import type { CardId, CardView } from "@saxonberg/types";
import { INSPECTION_CARD_IDS } from "@saxonberg/types";
import { useStore } from "./index";
import { websocketClient } from "../services/websocket";

const KEY_VIEWS = "cards.views";
const KEY_ACTIVE = "cards.activeView";

/** The structural view: everything, unfiltered, unstored, undeletable. */
export const ALL_CARDS = "All";

/**
 * ⭐⭐ **The second structural view: the things you have LOOKED at.**
 *
 * Named for the verb that makes them, so a player can connect the tab to
 * something they did. (`Stuff` is the engine's word for objects and a
 * room is not one; `Inspect` is not a verb anyone types.)
 *
 * ⚠ Structural like `All` — **not stored, not deletable, always there.**
 * Shipping it as a stored default would put a write on the connection
 * path, and that is exactly the seeding-clobber shape `console.tabs`
 * lost saved views to: a layout mounting before the payload lands reads
 * "no views", concludes *first run*, and writes ship defaults over what
 * is still in flight. Nothing is written, so there is nothing to race.
 */
export const LOOK_CARDS = "Look";

/** The structural views, in strip order. Neither is a stored row. */
export const STRUCTURAL_VIEWS: readonly string[] = [ALL_CARDS, LOOK_CARDS];

/**
 * The stored views, or `null` when the key has **not arrived yet**.
 *
 * ⚠ `null` and `[]` are different answers and callers must be able to
 * tell them apart: `[]` is *the player has no views*, `null` is *we do
 * not know yet*. Collapsing them is the shape the `console.tabs`
 * clobber took.
 */
export function readViews(): CardView[] | null {
  const raw = useStore.getState().clientState[KEY_VIEWS];
  return Array.isArray(raw) ? (raw as CardView[]) : null;
}

/** The stored views, treating "not yet arrived" as empty for rendering. */
export function getCardViews(): CardView[] {
  return readViews() ?? [];
}

/** The active view name; `All` when unset. */
export function getActiveCardView(): string {
  const raw = useStore.getState().clientState[KEY_ACTIVE];
  return typeof raw === "string" ? raw : ALL_CARDS;
}

function writeViews(views: CardView[]): void {
  useStore.getState().setLocalClientState(KEY_VIEWS, views);
  websocketClient.sendClientStateWrite(KEY_VIEWS, views);
}

function writeActive(name: string): void {
  useStore.getState().setLocalClientState(KEY_ACTIVE, name);
  websocketClient.sendClientStateWrite(KEY_ACTIVE, name);
}

/**
 * Create a view. Rejects an empty name, a duplicate, and the reserved
 * `All` — which would shadow the structural entry with a stored row
 * that could then be edited into a filter.
 */
export function addCardView(name: string, kinds: CardId[] = []): CardView[] {
  const trimmed = name.trim();
  const views = getCardViews();
  if (!trimmed || trimmed === ALL_CARDS) return views;
  if (views.some((v) => v.name === trimmed)) return views;
  const next = [...views, { name: trimmed, kinds }];
  writeViews(next);
  return next;
}

/** Rename in place. Refuses a collision and refuses to become `All`. */
export function renameCardView(from: string, to: string): CardView[] {
  const trimmed = to.trim();
  const views = getCardViews();
  if (!trimmed || trimmed === ALL_CARDS) return views;
  if (from === ALL_CARDS) return views;
  if (views.some((v) => v.name === trimmed)) return views;
  const next = views.map((v) =>
    v.name === from ? { ...v, name: trimmed } : v,
  );
  writeViews(next);
  if (getActiveCardView() === from) writeActive(trimmed);
  return next;
}

/** Set which kinds a view shows. */
export function setCardViewKinds(name: string, kinds: CardId[]): CardView[] {
  const views = getCardViews();
  if (name === ALL_CARDS) return views;
  const next = views.map((v) => (v.name === name ? { ...v, kinds } : v));
  writeViews(next);
  return next;
}

/**
 * Delete a view. ⚠ `All` cannot be deleted — not because it is
 * protected, but because it is not in this list to delete.
 */
export function deleteCardView(name: string): CardView[] {
  const views = getCardViews();
  if (name === ALL_CARDS) return views;
  const next = views.filter((v) => v.name !== name);
  if (next.length === views.length) return views;
  writeViews(next);
  // The player was standing in it; put them somewhere that exists.
  if (getActiveCardView() === name) writeActive(ALL_CARDS);
  return next;
}

/** Switch views. */
export function setActiveCardView(name: string): void {
  /*
   * ⚠ The guard admits the STRUCTURAL views as well as stored ones.
   * Checking only `ALL_CARDS` silently refused `Look` — the tab
   * highlighted nothing, the feed did not filter, and there was no
   * error anywhere, because a rejected write looks exactly like a
   * write that happened.
   */
  if (
    !STRUCTURAL_VIEWS.includes(name) &&
    !getCardViews().some((v) => v.name === name)
  ) {
    return;
  }
  writeActive(name);
}

/**
 * The kinds the active view shows, or `null` for **no filter at all**.
 *
 * ⚠ `null` rather than "every kind": a view listing every kind and the
 * absence of a filter look identical until a card kind is added, at
 * which point the enumerated one silently stops showing it.
 */
export function activeCardKinds(): ReadonlySet<CardId> | null {
  const active = getActiveCardView();
  if (active === ALL_CARDS) return null;
  // ⭐ The inspection grouping, derived from the shared constant rather
  // than re-listed here — a second list is a second thing to drift.
  if (active === LOOK_CARDS) return new Set(INSPECTION_CARD_IDS);
  const view = getCardViews().find((v) => v.name === active);
  if (!view) return null;
  return new Set(view.kinds);
}
