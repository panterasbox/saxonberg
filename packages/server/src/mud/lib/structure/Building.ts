/**
 * Building — ⭐ **a structure with an OUTSIDE** (paint review, 2026-11-02).
 *
 * A {@link Structure} is *these places are one thing* — membership, the
 * entrance, storeys, the landing, whether it can be seen from the sea. A
 * ship is one, and so (until the mountain slate) is the peak of Waponi Woo.
 * A BUILDING is the structure whose outside is kept: a coat painted on it
 * from where it meets the weather ({@link FacedMixin}), and a fabric under
 * the coat ({@link DurableMixin}) that the weather wears only once the coat
 * is gone and `maintain` puts back.
 *
 * Only ever inherited: the row twin (`platform/idea/Building`, one per row)
 * and a holding's minted building (`HoldingBuilding`, one per building of
 * a lot) are what instance it.
 */

import StructureBase from './Structure';
import { FacedMixin } from '../material/Faced';
import { DurableMixin } from '../material/Durable';
import { AppApi } from '../../api/app';
import { AppSettingKeys } from '../config/AppSettings';
import type { Stuff } from '../stuff/Stuff';
import type { FieldMeta } from '../mixin';
import { GeoPosition, type GeoPositionRecord } from '../expanse/GeoPosition';
import type { CoatReachRefusal } from '../material/Faced';
import { MixinApi } from '../../api/mixin';
import { MaintainableMixin, UPKEEP_KIT_WEAR, type MaintainAnswer } from './Maintainable';

export default abstract class Building extends MaintainableMixin(DurableMixin(FacedMixin(StructureBase))) {
  static fieldMeta: FieldMeta = {
    position: { persistent: true, authorable: true },
  };

  /**
   * ⭐ Where this building stands on the chart (geography build), or
   * `null` — *where my Locality is*, a real answer. A building stands still,
   * which is why the point is here and not on {@link StructureBase}: a ship
   * is a structure too, and her place is her fix. A light on a rock with a
   * sea node needs none; it stands where the sea has its rock.
   */
  protected position: GeoPositionRecord | null = null;

  /** Where it stands on the chart, or `null` (where its Locality is). */
  public getPosition(): GeoPosition | null {
    return this.position === null ? null : new GeoPosition(this.position);
  }

  /** Set (or clear) the point; a non-finite latitude or longitude throws. */
  public setPosition(value: GeoPositionRecord | null): void {
    this.position = value === null || value === undefined ? null : new GeoPosition(value).toJSON();
  }

  /** Its authored point first, else where the sea has it (a light on its rock). */
  public override chartPoint(): GeoPosition | null {
    return this.getPosition() ?? super.chartPoint();
  }

  /** A building's outside is always out in the weather, read from a landing. */
  public override weatherScope(): Stuff | null {
    return this.outsideScope();
  }

  public override weatherExposureAt(_scope: Stuff): number {
    return 1;
  }

  public override skyLightAt(_scope: Stuff): number {
    return 1;
  }

  public override airChangeAt(_scope: Stuff): number {
    return 1;
  }

  /** Reconcile on read: the weather since the last look, first. */
  public override getCondition(): number {
    this.reconcileWeather();
    return super.getCondition();
  }

  /** The walls and roof the weather meets — what a coat is spread over. */
  public override coatAreaM2(): number {
    return this.exteriorAreaM2();
  }

  /** ⭐ A building is painted from where it meets the weather (paint D9). */
  public override coatReachRefusal(actor: Stuff): CoatReachRefusal | null {
    return this.landingRefusal(actor);
  }

  /**
   * ⭐ Make the fabric sound (`maintain`). A sound fabric under a coat that
   * is gone or going is told so — that is a brush's work, not the kit's —
   * and the kit is spared.
   */
  public override maintainWith(kit: Stuff): MaintainAnswer {
    const before = this.getConditionWord();
    if (before === 'sound') {
      const coatWanting = this.coatGone() || this.coatThin(this.coatThinM());
      return { ok: false, reason: coatWanting ? 'coat-not-fabric' : 'already-sound' };
    }
    this.setCondition(1);
    if (MixinApi.isDurable(kit)) kit.wear(UPKEEP_KIT_WEAR);
    return { ok: true, before };
  }

  /** Below this an outside coat reads as going (`structure.coat.thinM`). */
  private coatThinM(): number {
    try {
      const n = Number.parseFloat(AppApi.setting(AppSettingKeys.structureCoatThinM) ?? '');
      if (Number.isFinite(n) && n > 0) return n;
    } catch {
      /* cold cache — the shipped default */
    }
    return 0.00001;
  }
}
