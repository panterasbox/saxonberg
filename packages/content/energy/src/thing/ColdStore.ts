/**
 * ColdStore — ⭐ **a powered cold appliance: a fridge, a freezer, an
 * actively-cooled cabinet.** The Thing half of the Thing≡Location proof: it
 * composes the SAME `ClimateControlMixin` a walk-in `ColdRoom` (a Location)
 * does, and gets the same behaviour — its interior air is driven toward a
 * setpoint while its premises' meter is live, and drifts when the power is
 * cut.
 *
 * Composition, outside-in:
 *   ClimateControl → GridPowered (the plug: `Powered` over the parcel meter)
 *     → Sealable (the door) → Atmospheric (the interior air it drives)
 *       → Staged (ships a freezer compartment via `props:`)
 *         → Container (holds the blood bags, the ice pan) → Good.
 *
 * It carries the coach's own four overrides (`ExitableVessel` precedent): a
 * box with a declared roof whose envelope applies on a volume, a door that
 * is its seal, and an insulated-panel enclosure default. A fridge is
 * `fixedInPlace` — you do not pocket it.
 *
 * A second kind of cold store is a ROW; a second supply is a second
 * `Powered` implementer in its own pack. See [docs/subsystems/energy.md],
 * [docs/subsystems/thermal.md § The active twin].
 */

import Good from '@saxonberg/server/mud/lib/stuff/Good';
import { ContainerMixin } from '@saxonberg/server/mud/lib/spatial/Container';
import { StagedMixin } from '@saxonberg/server/mud/lib/stuff/Staged';
import { SealableMixin } from '@saxonberg/server/mud/lib/spatial/Sealable';
import { AtmosphericMixin } from '@saxonberg/server/mud/lib/biome/Atmospheric';
import { ClimateControlMixin } from '@saxonberg/server/mud/lib/thermal/ClimateControl';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import type { FieldMeta } from '@saxonberg/server/mud/lib/mixin';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { EnclosureDefaults } from '@saxonberg/server/mud/lib/spatial/Enclosed';
import type { MarkupAugmenter } from '@saxonberg/server/mud/api/mml';
import { GridPoweredMixin } from '../lib/GridPowered';

const ColdStoreBase = ClimateControlMixin(
  GridPoweredMixin(
    StagedMixin(SealableMixin(AtmosphericMixin(ContainerMixin(Good)))),
  ),
);

export default class ColdStore extends ColdStoreBase {
  static fieldMeta: FieldMeta = {
    // The authored interior volume (m³) the envelope runs on — a cause.
    interiorVolumeM3: { persistent: true, authorable: true },
  };

  /** Authored interior volume in m³; `0` (unauthored) → no envelope. */
  public interiorVolumeM3 = 0;

  /** A fridge is bolted to its spot; you do not pocket it. */
  public fixedInPlace = true;

  static markupAugmenters: MarkupAugmenter[] = [coldStoreStateAugmenter];

  /** The box's declared interior — the coach's volume override. */
  public getVolume(): Quantity<'m³'> | null {
    return this.interiorVolumeM3 > 0
      ? Quantity.of(this.interiorVolumeM3, 'm³')
      : null;
  }

  /** A vessel's roof is its DECLARATION — apply whenever a volume is authored. */
  public envelopeApplies(): boolean {
    return this.getVolume() !== null;
  }

  /** For a vessel the SEAL is the door — an open door is the one leak. */
  public openExteriorOpenings(): number {
    return this.isOpen() ? 1 : 0;
  }

  /**
   * An insulated-panel default (cork-lined in prose) — far better than a
   * wall of stone. ⚠ A row SHOULD author its own `enclosure:` (F4): a thin
   * fridge holds less than a thick walk-in, for free.
   */
  public enclosureDefaults(): EnclosureDefaults {
    return { materialPath: '/stuff/idea/material/wood/pine', thicknessM: 0.08 };
  }

  /** The live state sentence, read off the host. */
  public stateLine(): string {
    if (this.isOpen()) return 'It stands open, the cold spilling out.';
    return this.isPowered()
      ? 'It is running quietly, the air inside cold.'
      : 'It is silent — the premises has no power, and the cold is leaking out.';
  }
}

/** Append the cold store's live state to its `look` long description. */
function coldStoreStateAugmenter(
  text: string,
  host: Stuff,
  _viewer: Stuff,
): string {
  if (!(host instanceof ColdStore)) return text;
  const line = host.stateLine();
  return text && text.length > 0 ? `${text}\n\n${line}` : line;
}
