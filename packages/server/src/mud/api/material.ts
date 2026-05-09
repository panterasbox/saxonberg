/**
 * MaterialApi — bulk-material lookup for any Stuff.
 *
 * Single entry point so callers don't have to know whether the Stuff in
 * hand composes `TangibleMixin`. Non-Tangible Stuff (Ideas, command
 * staging entities, raw `Agent` subclasses without bulk physical
 * presence) return `null` here.
 *
 * v1 is bulk-only: one Material per Stuff. The slate explicitly defers
 * per-Detail materials (the wood haft vs iron head of an axe). When
 * tissues / per-Detail authoring lands, this Api gains a `detailKey`
 * parameter; today it does NOT.
 */

import type { Stuff } from '../lib/stuff/Stuff';
import type { Material } from '../lib/stuff/Material';
import { MixinApi } from './mixin';
import { SecurityApi } from './security';

export class MaterialApi {
  /**
   * Resolve the bulk Material singleton for `stuff`, or `null` if `stuff`
   * is not Tangible (or is Tangible but unset). Sync; threads through
   * `Tangible.getMaterial()`, which uses `findByTemplatePath` for HMR
   * safety.
   */
  public static materialOf(stuff: Stuff): Material | null {
    if (!MixinApi.isTangible(stuff)) return null;
    return stuff.getMaterial();
  }
}

SecurityApi.decorateApiClass(MaterialApi);
