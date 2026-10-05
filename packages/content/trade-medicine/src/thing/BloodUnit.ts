/**
 * BloodUnit — a filled, typed, brandable, spawn-eligible bag of blood
 * (blood build D13): the trade's object for a stored unit. A `Receptacle`
 * (so it holds the perishable blood Material as interior bulk), plus
 * `BrandedMixin` (the upstream's units carry the Goodkin mark; a player's
 * drawn bag is a plain Receptacle and never branded — the gift is legibly
 * not the corpo's) and `CirculatingMixin` (a unit may stand on a producer
 * floor through the spawn sweep — the supply backbone).
 *
 * ⭐ A row authors the type/system as data (`bloodType`, `bloodSystem`);
 * `onCreate` stamps the matching `BulkPayload.blood` onto the interior,
 * because the payload is `runtimeState` and a row cannot author it. A bag
 * already carrying a unit (one a `bleed` filled) is left alone.
 *
 * Ships in `/trade/medicine/thing/BloodUnit`. NOT on `Receptacle` itself —
 * every saline bag and water skin would then circulate and brand.
 */

import Receptacle from '@saxonberg/server/mud/platform/thing/Receptacle';
import { CirculatingMixin } from '@saxonberg/server/mud/lib/residency/Circulating';
import { BrandedMixin } from '@saxonberg/server/mud/lib/corpo/Branded';
import type { FieldMeta } from '@saxonberg/server/mud/lib/mixin';
import type { BloodTypeLabel } from '@saxonberg/server/mud/lib/vitals/BloodType';

const BloodUnitBase = CirculatingMixin(BrandedMixin(Receptacle));

export default class BloodUnit extends BloodUnitBase {
  // ⚠ Plain `static fieldMeta` (NOT `static override fieldMeta`): the
  // content lints' field resolver (`fieldMetaKeys`) matches `static
  // fieldMeta` and `static readonly fieldMeta` only — an `override`
  // modifier makes every field here invisible to it, and the rows that
  // author them read as orphan data keys.
  static fieldMeta: FieldMeta = {
    // ⭐ `bloodType` is the SEED carrier (the `Behaved.dispositions`
    // precedent): its phase-3 `seedBloodType` applier stamps the whole
    // payload from the fields, which avoids an `onCreate` (the hook census
    // is a ratchet, and an authored history belongs on a seed field).
    bloodType: { persistent: true, authorable: true, seed: true },
    bloodSystem: { persistent: true, authorable: true },
    donorKey: { persistent: true, authorable: true },
    labelled: { persistent: true, authorable: true },
  };

  /** The TRUE ABO phenotype of what this bag holds. */
  public bloodType: BloodTypeLabel = 'O';
  /** The blood system (D3) compatibility is judged on. */
  public bloodSystem: string = '';
  /** Whose blood it was — an institutional pooled donor key for the
   * upstream's units ('' = unattributed, which never earns a player gift
   * credit). */
  public donorKey: string = '';
  /** Institutional units ship labelled (tested); a player's draw is not. */
  public labelled: boolean = true;

  public constructor() {
    super();
    // A unit is a bag of bulk — give it the interior slot its material
    // rides in. A row still authors the material/amount/capacity.
    this.interiorBulk = true;
    this.setKeywords(['blood', 'unit', 'bag']);
    this.setPrimaryKeyword('unit');
  }

  /**
   * ⭐ Phase-3 seed applier for `bloodType` — stamps the matching
   * `BulkPayload.blood` from the fields (which phase 1 has already set),
   * for a FILLED blood bag that nothing has already stamped (a drawn bag
   * carries its own unit; an empty row is not a unit). The seam the
   * `onCreate` used to be, moved to where an authored history belongs.
   */
  public async seedBloodType(value: BloodTypeLabel): Promise<void> {
    this.bloodType = value;
    if (this.interiorPayload?.blood) return;
    if (!this.interiorMaterial) return;
    try {
      const slot = this.getBulk();
      slot.setPayload({
        blood: {
          speciesPath: '',
          system: this.bloodSystem,
          type: this.bloodType,
          labelled: this.labelled,
          donorIdentityPath: this.donorKey,
        },
      });
    } catch {
      /* no interior slot — not a filled unit */
    }
  }
}
