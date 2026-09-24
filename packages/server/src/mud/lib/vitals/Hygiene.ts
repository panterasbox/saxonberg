/**
 * HygieneMixin — ⭐ **is this body clean?** (recovery build, D10).
 *
 * One persisted stamp, `washedAt` (game-seconds; `null` = never washed),
 * and a derived cleanliness that decays from 1 (just scrubbed) to 0 over
 * `HYGIENE_SOIL_SEC`. It is the `Serviceable` shape applied to a body: an
 * act soils (one-way, `washedAt = null`), water restores (`scrub()` stamps
 * now). Composed on `Creature` beside `VitalsMixin` — every body can be
 * dirty; only a TREATER's cleanliness is ever read (an animal that never
 * treats is simply never asked), so no narrowing guard.
 *
 * The one consumer this build wires is wound treatment: dressing a
 * bleeding wound with dirty hands inoculates it (D11), and the treatment's
 * effective quality is scaled by how clean the treater is. Other soiling
 * producers (butchering, mining, the sewer) are a deferred seam.
 */

import type { MixinConstructor, FieldMeta } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import { WorldClockApi } from '../../api/worldclock';

/** How long (game-seconds) clean hands stay clean — six game-hours. */
export const HYGIENE_SOIL_SEC = 6 * 60 * 60;

export interface Hygiene {
  /** Cleanliness `[0, 1]`: 1 just after a scrub, decaying to 0 (or `0`
   * when never washed). */
  handsCleanliness(): number;
  /** Soil the body — one-way, `washedAt = null` (the Serviceable shape). */
  soil(): void;
  /** Wash the body clean — stamps `washedAt = now`. */
  scrub(): void;
  /** The raw stamp (game-seconds) or null. */
  getWashedAt(): number | null;
}

export function HygieneMixin<TBase extends MixinConstructor>(Base: TBase) {
  return class HygieneMixin extends Base implements Hygiene {
    static _mixinName = 'HygieneMixin';

    static fieldMeta: FieldMeta = {
      washedAt: { persistent: true, runtimeState: true },
    };

    /** Game-seconds of the last wash; `null` = never (reads fully dirty). */
    public washedAt: number | null = null;

    public getWashedAt(): number | null {
      return this.washedAt;
    }

    public handsCleanliness(): number {
      if (this.washedAt === null) return 0;
      const now = WorldClockApi.getNow().rawValue();
      const since = now - this.washedAt;
      return Math.max(0, 1 - since / HYGIENE_SOIL_SEC);
    }

    public soil(): void {
      this.washedAt = null;
    }

    public scrub(): void {
      this.washedAt = WorldClockApi.getNow().rawValue();
    }
  };
}

// A type-only reference so `Stuff` is retained as an import even when the
// build elides it (the mixin composes on a Stuff subclass).
export type HygieneHost = Stuff & Hygiene;
