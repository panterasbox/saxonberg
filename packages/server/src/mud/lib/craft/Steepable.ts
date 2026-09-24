/**
 * SteepableMixin — a thing that gives up a solute when steeped in a
 * solvent (clinical-medicine review R2). Infusion is GENERAL: a solvent
 * extracts the solute a steepable holds → an extract (water + leaves →
 * tea, water + herb → draught, spirits + herb → tincture, oil + herb →
 * infused oil). The medicine build shipped `steep` as a medicine-only
 * verb with a hardcoded draught output; that was dishonest and poisoned
 * the well for cooking. The substrate is kernel here (cooking, medicine
 * and distilling have no common pack ancestor → kernel, per the
 * `lib/`-vs-kernel-MR doctrine); the chemistry (solvent type changing the
 * extract, extraction efficiency, heat kinetics, multi-solute blends)
 * stays deferred to a real cooking/infusion build.
 *
 * ⭐ The mixin carries the affordance: anything steepable affords the
 * platform `steep`/`infuse` verb outward (the `ManualBuildMixin`
 * precedent — the affordance is named once on the substrate, never
 * copied onto every row). `steepsInto` names the extract Material path;
 * v1 the solvent is water (the controller checks it) and the output is
 * fixed by the steepable, so the substrate generalises now and the
 * solvent-dependent output lands later.
 *
 * Domain-layer privacy: TypeScript modifiers (the proxy-receiver rule);
 * the inter-Stuff contract is the method surface (`getSteepsInto`), never
 * the field.
 */

import type { CommandContributions } from "../../api/command";
import type { FieldMeta, MixinConstructor } from "../mixin";

/** The method surface a steepable exposes to other Stuff. */
export interface Steepable {
  /** The extract Material path this thing steeps into. */
  getSteepsInto(): string;
}

export function SteepableMixin<TBase extends MixinConstructor>(Base: TBase) {
  return class SteepableMixin extends Base implements Steepable {
    static _mixinName = "SteepableMixin";

    /**
     * ⭐ A steepable affords `steep`/`infuse` outward — named once on the
     * substrate. `environment` flows the affordance up the containment
     * chain to whoever carries the solute (a herb in the hand affords
     * `steep`), which is where the act begins.
     */
    static commandContributions: CommandContributions = {
      environment: ["platform/cmd/crafting/steep.yaml"],
    };

    static fieldMeta: FieldMeta = {
      steepsInto: { persistent: true, authorable: true },
    };

    /** The extract Material path this thing steeps into. */
    public steepsInto: string = "";

    public getSteepsInto(): string {
      return this.steepsInto;
    }
  };
}
