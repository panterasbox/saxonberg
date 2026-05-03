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
import { decorateApiClass } from '../lib/security/decorators';

/**
 * Presentation-layer API for describing objects.
 */
export class DescribeApi {
  /**
   * Resolve a human-readable name for an object.
   *
   * Checks in order:
   * 1. NamedMixin.fullName
   * 2. A string `name` property (Location and similar carry this directly)
   * 3. VisibleMixin.shortDescription
   * 4. The caller-supplied fallback
   *
   * Callers that only care whether a name exists (e.g. MqlApi scoring) should
   * pass `''` and test for empty. Display callers should pass a sensible
   * fallback like `'something'` or `'Someone'`.
   *
   * @param obj - Object to name
   * @param fallback - Returned when no name source is available (default: '')
   */
  static getDisplayName(obj: Stuff, fallback: string = ''): string {
    if (MixinApi.isNamed(obj)) return obj.fullName;
    const withName = obj as Stuff & { name?: unknown };
    if (typeof withName.name === 'string' && withName.name) return withName.name;
    if (MixinApi.isVisible(obj) && obj.shortDescription) return obj.shortDescription;
    return fallback;
  }
}

decorateApiClass(DescribeApi);
