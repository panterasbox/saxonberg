/**
 * DescribeApi - Presentation-layer utilities for describing objects
 *
 * Consolidates the "how do I render this Stuff as text for a human?" chain
 * so every caller gets the same answer. Today this is just getDisplayName();
 * future additions (short/long description helpers, article selection, list
 * formatting, etc.) should live here too.
 *
 * Usage:
 * ```typescript
 * const name = DescribeApi.getDisplayName(obj, 'something');
 * ```
 *
 * **v1 limitation — composed display names are NYI.** Real display
 * names are decorated: a wielded sword reads as `sword (wielded)`,
 * an NPC running a script reads as `Dave is tending bar`, a hooded
 * figure reads as `a tall figure in a black cloak` regardless of
 * the host's underlying shortDescription. Today
 * `getDisplayName` returns only the bare core string and every
 * surrounding decoration (state tags, shadow overrides, status
 * lines) lives in ad-hoc code paths — usually nowhere. Consumers
 * pulling decoration out of the core string is the structural gap;
 * `inventory`-style listings can't add `(wielded)` from any
 * standard surface.
 *
 * The planned shape (see roadmap.md → "Display-name composition"):
 * a `getDisplayParts(obj)` that returns `{ core, tags?, status?,
 * override? }` so consumers render selectively, plus a composed
 * form for the 95% case. MML-aware so the Markup-language
 * semantic tags (`<item>`, `<npc>`, `<player>`) land naturally.
 *
 * Until that work, controllers and validators that need a decorated
 * name compose it inline. The MQL branch landed several new callers
 * of `getDisplayName` (`canReach` / `mustBeContainable` /
 * `mustBeInInventory` / `mustBeInLocation` / `mustBeVisible` error
 * messages, controller summaries) — those all want the bare core
 * string and are fine with the current behavior; the gap shows up
 * on the verb side (`wield`, `wear`, status-line rendering).
 */

import type { Stuff } from '../lib/stuff/Stuff';
import { GrammarApi } from './grammar';
import { MixinApi } from './mixin';
import { SecurityApi } from './security';

/**
 * Presentation-layer API for describing objects.
 */
export class DescribeApi {
  /**
   * Resolve a human-readable display string for an object — the
   * casual register, what 95% of prose wants. Two-step resolution:
   *
   *   1. **`Named.name`** if present and non-empty — the object's
   *      *proper name* ("Alice", "Excalibur", "Town Square"). Most
   *      things don't have one.
   *   2. **`Visible.shortDescription`** if present and non-empty —
   *      the object's *visual identity* ("a heavy oak door", "a
   *      rusty sword"). Most things have one of these.
   *   3. The caller-supplied fallback.
   *
   * Named takes precedence so a Named-with-description renders by
   * its proper name in casual prose. Code that needs the formal
   * register calls `obj.getFullName()` when typed as Named. Future
   * registers (`getAddressForm`, social-graph-aware variants) will be
   * added as siblings here rather than overloading this function.
   *
   * @param obj - Object to render
   * @param fallback - Returned when neither Named.name nor
   *   Visible.shortDescription is available (default: `''`)
   */
  static getDisplayName(obj: Stuff, fallback: string = ''): string {
    if (MixinApi.isNamed(obj)) {
      const name = obj.getName();
      if (name) return name;
    }
    if (MixinApi.isVisible(obj)) {
      const short = obj.getShortDescription();
      if (short) return short;
    }
    return fallback;
  }

  /**
   * Count-aware display name. For a `Globbable` with `quantity > 1`
   * returns `"<count> <plural>"` (`"30 coins"`); for everything else
   * falls through to {@link getDisplayName}.
   *
   * Pluralization defers to {@link GrammarApi.pluralize}, which
   * respects host-side `getPluralForm()` overrides for irregulars
   * (`mouse` → `mice`).
   *
   * This is the v1 thin shim — controllers reach for it when
   * rendering quantity-bearing prose. `DescribeApi v2` (recognition
   * slate) will absorb the same shape into the composition pipeline
   * with viewer-side recognition / perception state. Until then,
   * keeping the seam here (rather than on `GlobbableApi`) keeps the
   * "presentation logic lives in DescribeApi" rule intact — see
   * CLAUDE.md "Module categories" + `docs/subsystems/glob.md` §
   * Display rendering.
   */
  static formatName(obj: Stuff, fallback: string = 'something'): string {
    const base = DescribeApi.getDisplayName(obj, fallback);
    if (!MixinApi.isGlobbable(obj)) return base;
    const n = obj.getQuantity();
    if (n === 1) return base;
    return `${n} ${GrammarApi.pluralize(obj, base)}`;
  }
}


SecurityApi.decorateApiClass(DescribeApi);
