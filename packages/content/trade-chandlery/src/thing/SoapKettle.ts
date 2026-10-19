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
import type MaturationProfile from '@saxonberg/server/mud/lib/maturation/MaturationProfile';
import type { ForeignPourKind } from '@saxonberg/server/mud/lib/maturation/Maturing';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { AppApi } from '@saxonberg/server/mud/api/app';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';
import { ExecutionContextApi } from '@saxonberg/server/mud/api/execution-context';

/** What fat and lye become in the kettle — and what the boil works on. */
const SOAP_PASTE = '/trade/chandlery/idea/material/soap-paste';
/** What salt grains soft soap into. */
const SOAP_CURD = '/trade/chandlery/idea/material/hard-soap-curd';
/** Quicklime slaked in water (potash D14). */
const MILK_OF_LIME = '/trade/chandlery/idea/material/milk-of-lime';
/** Lye made caustic by slaked lime — the soap-boiler's strong lye. */
const CAUSTIC_LYE = '/trade/chandlery/idea/material/caustic-lye';
/** Fat and caustic lye: the paste that boils straight to a hard curd. */
const HARD_SOAP_PASTE = '/trade/chandlery/idea/material/hard-soap-paste';
/** The heat quicklime gives off as it slakes, J per kg (CaO + H₂O). */
const SLAKING_J_PER_KG = 1.15e6;

export default class SoapKettle extends MaturingMixin(CraftVessel) {
  /** The kettle's own transform for `poured` into what it holds, or null. */
  private soapTransform(poured: Material): string | null {
    const held = this.getBulkMaterial('interior');
    if (!held) return null;
    // ⭐ (potash D14) Lime makes lye CAUSTIC, and caustic lye makes HARD
    // soap with no salting — checked first, since a caustic lye is a lye.
    if (held.hasTag('lye') && !held.hasTag('caustic-lye') && poured.hasTag('slaked-lime')) return CAUSTIC_LYE;
    if (held.hasTag('slaked-lime') && poured.hasTag('lye') && !poured.hasTag('caustic-lye')) return CAUSTIC_LYE;
    if (held.hasTag('fat') && poured.hasTag('caustic-lye')) return HARD_SOAP_PASTE;
    if (held.hasTag('caustic-lye') && poured.hasTag('fat')) return HARD_SOAP_PASTE;
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

  /**
   * ⭐⭐ Slaking (potash D14): water poured on quicklime in the kettle. The
   * lime takes the water with a hiss and a great deal of heat, and what is
   * left is milk of lime — caustic, and the lime a lye wants to make it
   * strong. Nothing ferments: there is no profile, only the change. ⚠ Lime
   * first, then the water (the hopper's constraint: a `put` after the
   * fill does not re-match).
   */
  public override matchProfile(material: Material): MaturationProfile | null {
    if (material.hasTag('water')) {
      const lime = this.getContents().filter((c) => {
        const m = MixinApi.isTangible(c) ? c.getMaterial() : null;
        return (m?.hasTag('caustic') ?? false) && (m?.hasTag('liming') ?? false);
      });
      if (lime.length > 0) {
        this.slake(lime);
        return null;
      }
    }
    return super.matchProfile(material);
  }

  private slake(lime: Stuff[]): void {
    const perKg = (() => {
      try {
        const v = Number(AppApi.setting('chandlery.lime.slakingJPerKg'));
        return Number.isFinite(v) && v > 0 ? v : SLAKING_J_PER_KG;
      } catch {
        return SLAKING_J_PER_KG;
      }
    })();
    let kg = 0;
    for (const lump of lime) kg += MixinApi.isTangible(lump) ? lump.getMass().rawValue() : 0;
    // ⭐ The hand that put the water to it: bare, the lime burns it.
    const actor = ExecutionContextApi.getActingAuthor() as Stuff | null;
    const burnt = lime[0] && MixinApi.isTangible(lime[0]) ? lime[0].getMaterial() : null;
    for (const lump of lime) void StuffApi.destruct(lump);
    this.depositHeat(kg * perKg);
    this.rekeyBatch(MILK_OF_LIME);
    if (actor && burnt && MixinApi.isAttired(actor)) {
      const gloved = actor.handSites().some((h) => actor.outermostAt(h) !== null);
      const site = actor.handSites()[0];
      if (!gloved && site && burnt.corrodeOnContact(actor, { site })) {
        MessageApi.scene(actor)
          .topic('act.deed')
          .toSelf(
            Mml.compose`The lime hisses and heaves as the water takes it, and spits up over your bare hand. It burns like a coal.`,
          )
          .send();
      }
    }
  }
}
