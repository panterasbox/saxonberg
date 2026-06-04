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
 * const name = DescribeApi.getDisplayName(obj);
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
import type { Containable } from '../lib/spatial/Containable';
import type { Surfaced } from '../lib/spatial/Surfaced';
import type { Sensor } from '../lib/message/Sensor';
import { GrammarApi } from './grammar';
import { MixinApi } from './mixin';
import { SecurityApi } from './security';

/**
 * Baked-in fallback for `getDisplayName` / `formatName` when the
 * target has no Named name and no Visible shortDescription. Callers
 * no longer pass their own fallback — presentation policy lives
 * here, not in every controller.
 */
const DEFAULT_DISPLAY_NAME = 'something';

/**
 * Output of {@link DescribeApi.groupContentsByResting}. Partitions a
 * `getContents()` snapshot into items that should render at the top
 * level and items that should render nested under a supporting
 * surface (when that surface is itself in the listing).
 *
 *   - `topLevel`: items with no supporting surface OR whose supporting
 *     surface is not in this listing (the cross-listing case is
 *     out-of-scope in v1; `placeOn`'s post-condition keeps the
 *     supporter and resting items co-located).
 *   - `byHost`: keyed by the Surfaced host's `stuffId`; arrays of
 *     items resting on that host.
 */
export interface RestingGrouping {
  topLevel: (Stuff & Containable)[];
  byHost: Map<string, (Stuff & Containable)[]>;
}

/**
 * Default count threshold for enumerated-vs-summarized rendering of
 * items resting on a surface. Three or fewer → enumerate. Four+ →
 * summarize. Exported as a constant so callers can opt out without
 * the magic number leaking across the codebase.
 */
export const SURFACE_ENUMERATE_THRESHOLD = 3;

/**
 * Presentation-layer API for describing objects.
 */
export class DescribeApi {
  /**
   * Resolve a human-readable display string for an object — the
   * casual register, what 95% of prose wants. Three-step resolution:
   *
   *   1. **`Named.name`** if present and non-empty — the object's
   *      *proper name* ("Alice", "Excalibur", "Town Square"). Most
   *      things don't have one.
   *   2. **`Visible.shortDescription`** if present and non-empty —
   *      the object's *visual identity* ("a heavy oak door", "a
   *      rusty sword"). Most things have one of these.
   *   3. The baked-in fallback (`'something'`).
   *
   * Named takes precedence so a Named-with-description renders by
   * its proper name in casual prose. Code that needs the formal
   * register calls `obj.getFullName()` when typed as Named. Future
   * registers (`getAddressForm`, social-graph-aware variants) will be
   * added as siblings here rather than overloading this function.
   *
   * **`viewer`** is reserved for the recognition / DescribeApi v2
   * pipeline. The v1 body ignores it, but the substrate-synthetic
   * descriptor (in `MqlSubscriptionApi`) threads it end-to-end so
   * the per-viewer design is wired without a future API rename. The
   * return type is always `string` — `'something'` is the bottom of
   * the fallback chain, so callers never write `??` ceremony.
   *
   * @param obj - Object to render
   * @param viewer - Optional Sensor for per-viewer overrides (v1: ignored)
   */
  static getDisplayName(obj: Stuff, viewer?: Sensor): string {
    void viewer;
    if (MixinApi.isNamed(obj)) {
      const name = obj.getName();
      if (name) return name;
    }
    if (MixinApi.isVisible(obj)) {
      const short = obj.getShortDescription();
      if (short) return short;
    }
    return DEFAULT_DISPLAY_NAME;
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
  static formatName(obj: Stuff, viewer?: Sensor): string {
    const base = DescribeApi.getDisplayName(obj, viewer);
    if (!MixinApi.isGlobbable(obj)) return base;
    const n = obj.getQuantity();
    if (n === 1) return base;
    return `${n} ${GrammarApi.pluralize(obj, base)}`;
  }

  /**
   * Partition a container's contents snapshot into top-level items
   * and items grouped under their supporting Surfaced host. Used by
   * room-listing render paths so an apple resting on a desk appears
   * nested under the desk instead of as a separate room-level item.
   *
   * Under Option D (see `docs/plans/affordance-verb-plan.md` § 2),
   * an apple on a desk in a room has `container = room` AND
   * `restingOn = desk` — both relationships are real. The grouping
   * is purely presentational: the underlying contents walk is
   * unchanged, and items resting on surfaces in OTHER containers
   * fall back to `topLevel` (the cross-listing case is out of scope
   * in v1; `placeOn`'s post-condition keeps the supporter and
   * resting items in the same container).
   *
   * Cluttered-surface rendering (4+ items) is the caller's policy.
   * The grouping returned here is structural; callers consult
   * {@link SURFACE_ENUMERATE_THRESHOLD} and decide between "the desk,
   * with X, Y, and Z on it" and "the desk, scattered with various
   * items".
   *
   * @param contents - The container's getContents() snapshot.
   * @returns A {@link RestingGrouping} with top-level items and a
   *   per-supporter grouping. Both fields are populated even when
   *   empty.
   */
  static groupContentsByResting(
    contents: readonly (Stuff & Containable)[],
  ): RestingGrouping {
    const presentIds = new Set<string>();
    for (const c of contents) presentIds.add(c.stuffId);

    const topLevel: (Stuff & Containable)[] = [];
    const byHost = new Map<string, (Stuff & Containable)[]>();

    for (const item of contents) {
      const support = item.getRestingOn();
      if (support === null) {
        topLevel.push(item);
        continue;
      }
      const supportId = (support as Stuff).stuffId;
      if (!presentIds.has(supportId)) {
        // Cross-listing: supporter is somewhere else; render
        // top-level rather than dropping the item from the listing.
        topLevel.push(item);
        continue;
      }
      let bucket = byHost.get(supportId);
      if (!bucket) {
        bucket = [];
        byHost.set(supportId, bucket);
      }
      bucket.push(item);
    }
    return { topLevel, byHost };
  }

  /**
   * Format a Surfaced host's resting-items suffix for the
   * containing listing. Returns the suffix string (e.g.,
   * `", with a red apple on it"`) or `null` when the surface
   * supports no items in this listing.
   *
   * Enumerates when the count is ≤ {@link SURFACE_ENUMERATE_THRESHOLD};
   * summarizes ("scattered with various items") otherwise. The
   * threshold matches the plan's recommended constant.
   *
   * The host argument is unused at the bare string-rendering layer
   * (no per-host overrides today), but kept in the signature so
   * future shape-aware suffixes (a hot plate; a sloped surface)
   * have a hook without an API rename.
   */
  static formatRestingSuffix(
    _host: Stuff & Surfaced,
    resting: readonly (Stuff & Containable)[],
  ): string | null {
    if (resting.length === 0) return null;
    if (resting.length > SURFACE_ENUMERATE_THRESHOLD) {
      return ', scattered with various items';
    }
    const names = resting.map((r) => DescribeApi.formatName(r));
    let joined: string;
    if (names.length === 1) {
      joined = names[0]!;
    } else if (names.length === 2) {
      joined = `${names[0]} and ${names[1]}`;
    } else {
      // names.length === 3
      joined = `${names[0]}, ${names[1]}, and ${names[2]}`;
    }
    return `, with ${joined} on it`;
  }
}


SecurityApi.decorateApiClass(DescribeApi);
