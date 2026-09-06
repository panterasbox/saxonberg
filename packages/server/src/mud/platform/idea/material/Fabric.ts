/**
 * Fabric — one **non-resisting textile construction form**, as a
 * template row.
 *
 * ⭐ *"Fabric construction"* is the textile industry's own name for
 * exactly this classification — woven / knit / nonwoven — and the
 * namespace is precisely scoped: because resist-bearing forms
 * (`plate`, `mail`, `padded`, `quilted`, `hide`) stay a closed kernel
 * `as const`, **`/stuff/idea/fabric/` can only ever hold fabrics.**
 * Plate is never a row, so the cloth connotation is correct rather than
 * sloppy.
 *
 * ## Why this is content and the resist grid is not
 *
 * A form's resist profile is combat mitigation, and letting content
 * author that is a real objection. A purely-textile form carries
 * **drape, loft and weave density** and contributes no resist, so it
 * carries no such risk — and leaving the vocabulary closed would
 * collide with the rule that *a pack must never need a kernel list
 * edit*. So `Construction` grows a second source and `isForm()`
 * consults both; every fabric shares one kernel resist profile
 * (`poor · poor · poor`), which is the split made literal: **content
 * chooses the weave, the kernel decides that cloth resists poorly.**
 *
 * ## ⚠ `layerBand` is required and range-validated
 *
 * `Construction.getLayerDepth()` is called **unconditionally** in three
 * hot paths — the heat-attenuation fold, the struck-site covering
 * stack, the trauma covering walk. The depth ladder must therefore stay
 * total across both sources, so a row's band is validated at hydration
 * (loudly) rather than at the moment somebody swings.
 *
 * Reference data, the `MaturationProfile` shape: a singleton Idea per row,
 * stood up whole at boot by `FabricCatalogue.postRegister` (the roster
 * warm that closes the reference-Ideas-inert-at-boot rule), read by
 * SYNC seams. Rows live under any root's `idea/fabric/` subtree — the
 * kernel keeps no list of roots.
 */

import { Idea } from '../../../lib/stuff/Idea';
import { SingletonMixin } from '../../../lib/stuff/Singleton';
import { Construction } from '../../../lib/material/Construction';
import type { FabricSpec } from '../../../lib/material/Construction';
import type { FieldMeta } from '../../../lib/mixin';
import type { VetoResult } from '../../../lib/errors';
import type { EvictionContext } from '../../../lib/stuff/Stuff';

export default class Fabric extends SingletonMixin(Idea) {
  /**
   * Residency veto — form reference data resolved by SYNC reads (every
   * `Construction.of` on a garment). A culled row would take its form
   * word out of the vocabulary and every garment carrying it would stop
   * resolving, silently.
   */
  public canEvict(_context: EvictionContext): VetoResult {
    return { ok: false, reason: 'fabric form singleton; never culled' };
  }

  /** The form word an author writes (`woven`, `knit`, `felted`). */
  public key = '';
  /** Outside-in depth band `0..4`, shared with the kernel ladder. */
  public layerBand = 0;
  /** Trapped-air fraction `0..1` — the thermal parameter behind `clo`. */
  public loft = 0;
  /** Thread closeness `0..1` — windproofing, and cover for concealment. */
  public weaveDensity = 0;
  /** How it hangs, `0..1`. Reserved: authored, not yet consumed. */
  public drape = 0.5;

  static fieldMeta: FieldMeta = {
    key: { persistent: true, authorable: true },
    layerBand: { persistent: true, authorable: true },
    loft: { persistent: true, authorable: true },
    weaveDensity: { persistent: true, authorable: true },
    drape: { persistent: true, authorable: true },
  };

  // ── the inter-Stuff contract (methods, never fields) ──

  getKey(): string {
    return this.key;
  }
  setKey(value: string): void {
    if (!value || !/^[a-z][a-z0-9-]*$/.test(value)) {
      throw new RangeError(
        `Fabric.setKey: '${value}' is not a kebab form word`,
      );
    }
    this.key = value;
  }

  getLayerBand(): number {
    return this.layerBand;
  }
  setLayerBand(value: number): void {
    // ⚠ The totality guard. See the class docstring.
    if (!Number.isInteger(value) || value < 0 || value > 4) {
      throw new RangeError(
        `Fabric.setLayerBand: ${value} is outside the 0..4 covering ladder`,
      );
    }
    this.layerBand = value;
  }

  getLoft(): number {
    return this.loft;
  }
  setLoft(value: number): void {
    this.loft = unitFraction('setLoft', value);
  }

  getWeaveDensity(): number {
    return this.weaveDensity;
  }
  setWeaveDensity(value: number): void {
    this.weaveDensity = unitFraction('setWeaveDensity', value);
  }

  getDrape(): number {
    return this.drape;
  }
  setDrape(value: number): void {
    this.drape = unitFraction('setDrape', value);
  }

  /** This row as the registry's flat spec. */
  public toSpec(): FabricSpec {
    return {
      key: this.key,
      layerBand: this.layerBand,
      loft: this.loft,
      weaveDensity: this.weaveDensity,
      drape: this.drape,
    };
  }

  /**
   * Push this row into the `Construction` vocabulary. Called by the
   * catalogue's warm; separate from `toSpec` so the registry has one
   * writer and a re-warm can rebuild it wholesale.
   */
  public register(): void {
    Construction.registerFabric(this.toSpec());
  }
}

/** Validate a `0..1` authored fraction, naming the field on refusal. */
function unitFraction(field: string, value: number): number {
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new RangeError(`Fabric.${field}: ${value} is outside 0..1`);
  }
  return value;
}
