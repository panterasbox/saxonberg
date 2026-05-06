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
 */

import type { Stuff } from '../lib/stuff/Stuff';
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
}


SecurityApi.decorateApiClass(DescribeApi);
