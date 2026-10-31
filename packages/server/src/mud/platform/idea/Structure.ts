/**
 * Structure — the default BUILDING: one row, one structure (a
 * `Singleton` keyed by its row's path), and every capability its outside
 * has (paint build, 2026-10-31).
 *
 * Everything a structure IS — membership, entrance, height, storeys, the
 * landing, whether it has been sold — is the base's ({@link StructureBase},
 * `lib/structure/Structure`); this twin is what every Structure row names,
 * and it composes the outside:
 *
 * - **a face** ({@link FacedMixin}) — ONE outside a coat can be laid on;
 * - **weathering** ({@link WeatheringMixin}) — the coat thins where the
 *   weather reaches it, sets by the air, fades in the sun;
 * - **a shell** ({@link ShellMixin}) — the fabric under the coat holds
 *   while the coat does and wears once it is gone;
 * - **persistence** — ⭐ only once it is SOLD (D7): a staged building
 *   writes no record and comes back as its row authored it whenever the
 *   world restages; an owned one keeps its coats and fabric.
 *
 * A content author opts out of a capability by naming a class over the
 * base that does not compose it (a ruin, a monument). A holding's minted
 * house (`/system/residence/idea/HoldingStructure`) is the base keyed per
 * lot instead of a singleton.
 */

import StructureBase from '../../lib/structure/Structure';
import { SingletonMixin } from '../../lib/stuff/Singleton';
import { FacedMixin } from '../../lib/material/Faced';
import { WeatheringMixin } from '../../lib/material/Weathering';
import { ShellMixin } from '../../lib/structure/Shell';
import { PersistableMixin } from '../../lib/persistence/Persistable';
import type { Stuff } from '../../lib/stuff/Stuff';

export const STRUCTURE_CLASS_PATH = '/platform/idea/Structure';

export default class Structure extends PersistableMixin(
  ShellMixin(WeatheringMixin(FacedMixin(SingletonMixin(StructureBase)))),
) {
  /** A building's outside is always out in the weather. */
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

  /** The walls and roof the weather meets — what a coat is spread over. */
  public override coatAreaM2(): number {
    return this.exteriorAreaM2();
  }

  /** ⭐ The coats and fabric are kept only once it is sold (D7). */
  public override persistsCoats(): boolean {
    return this.isTitleSold();
  }

  /**
   * @hook Does this structure keep a record even while it is staged? A
   * building does not (it restages); a ship does — her voyage is hers
   * whoever holds her (her coats still follow {@link persistsCoats}).
   */
  protected persistsWhenStaged(): boolean {
    return false;
  }

  public override shouldPersist(): boolean {
    return super.shouldPersist() && (this.persistsWhenStaged() || this.isTitleSold());
  }
}
