/**
 * ⭐⭐ The ONE icon map. Every icon the client draws is looked up here by a
 * name in OUR vocabulary — a card control, a branch, later a mixin or a
 * trade key — never imported at its call site.
 *
 * Why one table (iconography-slate; the owner's direction, 2026-10-31):
 * - drawing our own marks later is an edit to this table, not a sweep;
 * - an unmapped name falls back to a visible generic glyph, never to
 *   nothing (a missing icon is not information);
 * - the same names can serve the wiki's mixin pages and the overlay.
 *
 * Sources by role: CHROME and actions are line icons (Lucide, ISC). Domain
 * nouns (trades, materials, creatures) will be silhouettes (game-icons.net,
 * CC BY 3.0 — attribution owed when the first one lands) inside a fixed
 * frame, so a line glyph and a filled one never sit side by side unframed.
 */

import {
  Box,
  CircleHelp,
  Lightbulb,
  MapPin,
  Maximize2,
  Minimize2,
  PictureInPicture2,
  Pin,
  Square,
  User,
  X,
  type LucideIcon,
} from "lucide-react";

export const ICONS = {
  // ── card controls ─────────────────────────────────────────────
  "card.bigger": Maximize2,
  "card.smaller": Minimize2,
  "card.pin": Pin,
  "card.close": X,
  /** Pop a card out into its own window (broadcast-ready D13). */
  "card.popout": PictureInPicture2,
  /** A card in the tray with no kind of its own. */
  "card.tray": Square,
  // ── the four branches (placeholders until the marks are drawn) ─
  "kind.location": MapPin,
  "kind.agent": User,
  "kind.thing": Box,
  "kind.idea": Lightbulb,
} satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof ICONS;

/** What an unmapped name draws: visibly a placeholder, never blank. */
export const FALLBACK_ICON: LucideIcon = CircleHelp;
