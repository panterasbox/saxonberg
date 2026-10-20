/**
 * SoapKettle — the copper kettle soap is boiled in (cleanliness D24).
 *
 * ⭐ Soap with NO new verb. Fat poured in (tallow, olive oil), lye poured
 * on it, and the kettle kept at the boil on a hearth: the `saponification`
 * profile turns the paste into SOFT SOAP over about an hour, and the
 * glycerin settles out as its lees. Salt added to the soft soap GRAINS it —
 * the curd floats free of the brine — and the curd poured into a frame sets
 * into a bar.
 *
 * The kettle owns its chemistry: fat + lye and soap + salt are this
 * vessel's two transforms (`classifyForeignPour`), so neither fat nor soft
 * soap is given a profile anywhere else — a cask of tallow stays tallow.
 */

import CraftVessel from '@saxonberg/server/mud/platform/thing/CraftVessel';
import { MaturingMixin } from '@saxonberg/server/mud/lib/maturation/Maturing';
import type Material from '@saxonberg/server/mud/lib/material/Material';
import type { ForeignPourKind } from '@saxonberg/server/mud/lib/maturation/Maturing';

/** What fat and lye become in the kettle — and what the boil works on. */
const SOAP_PASTE = '/trade/chandlery/idea/material/soap-paste';
/** What salt grains soft soap into. */
const SOAP_CURD = '/trade/chandlery/idea/material/hard-soap-curd';

export default class SoapKettle extends MaturingMixin(CraftVessel) {
  /** The kettle's own transform for `poured` into what it holds, or null. */
  private soapTransform(poured: Material): string | null {
    const held = this.getBulkMaterial('interior');
    if (!held) return null;
    if (held.hasTag('fat') && poured.hasTag('lye')) return SOAP_PASTE;
    if (held.hasTag('lye') && poured.hasTag('fat')) return SOAP_PASTE;
    if (held.hasTag('soft-soap') && poured.hasTag('salt')) return SOAP_CURD;
    return null;
  }

  public override classifyForeignPour(
    material: Material,
    strain: string,
  ): ForeignPourKind | null {
    if (this.soapTransform(material) !== null) return 'transform';
    return super.classifyForeignPour(material, strain);
  }

  public override applyForeignPour(
    kind: ForeignPourKind,
    strain: string,
    litres: number,
    material?: Material,
  ): void {
    const becomes = material ? this.soapTransform(material) : null;
    if (kind === 'transform' && becomes !== null) {
      this.rekeyBatch(becomes);
      return;
    }
    super.applyForeignPour(kind, strain, litres, material);
  }
}
