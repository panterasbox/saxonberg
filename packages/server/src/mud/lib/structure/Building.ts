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
import type { CoatReachRefusal } from '../material/Faced';

export default abstract class Building extends DurableMixin(FacedMixin(StructureBase)) {
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

  /**
   * ⭐ Once the coat is gone the fabric goes (paint D13): half the
   * condition scale in `structure.weather.daysToWorn` game days.
   */
  public override bareWearPerDay(): number {
    let days = 45;
    try {
      const n = Number.parseFloat(AppApi.setting(AppSettingKeys.structureWeatherDaysToWorn) ?? '');
      if (Number.isFinite(n) && n > 0) days = n;
    } catch {
      /* cold cache — the shipped default */
    }
    return 0.5 / days;
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
}
