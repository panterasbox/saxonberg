/**
 * AdvancementMixin — the per-character surface of the advancement
 * subsystem: the conferral affordance source and the bands-only self-view
 * verb.
 *
 * Advancement holds no per-character runtime state (Competence is
 * derive-on-read, the Transcript lives as Documents), so this mixin owns
 * no fields. It does two things:
 *
 *   1. **Affords the self-view** (`competence`) via a static
 *      `commandContributions.self`, collected by the affordance walk
 *      exactly like `PersonaMixin`'s `chronicle` verb.
 *   2. **Hosts the conferral source.** Crossing a competence band confers
 *      the Discipline's band-gated verbs (the knowing→doing seam). Because
 *      Competence is derive-on-read, a band crossing has no event — the
 *      only band-mover is a Transcript append, so `AdvancementApi`
 *      re-invokes {@link refreshConferrals} after every append. The verbs
 *      ride the push-based affordance stack (the hosted-update pattern),
 *      sourced from the `DisciplineCatalogue` so `getAffordances` resolves
 *      their `commandSource` to "the catalog / your competence."
 */

import type { Stuff } from "../stuff/Stuff";
import type { MixinConstructor } from "../mixin";
import type { CommandGiver } from "../command/CommandGiver";
import type { CommandDefinition } from "../command/CommandDefinition";
import type { CommandContributions } from "../../api/command";
import { CommandApi } from "../../api/command";
import { AdvancementApi } from "../../api/advancement";
import { StuffApi } from "../../api/stuff";
import { TemplatePaths } from "../paths";

/** Public shape provided by AdvancementMixin. */
export interface Advancing {
  refreshConferrals(): Promise<void>;
}

export function AdvancementMixin<TBase extends MixinConstructor<Stuff>>(
  Base: TBase
) {
  return class AdvancementMixin extends Base {
    static _mixinName = "AdvancementMixin";

    /**
     * The bands-only self-view. Zero-arg, read-only, self-only — the
     * `chronicle`-verb shape. Afforded statically; the conferred verbs
     * (below) are pushed dynamically.
     */
    static commandContributions: CommandContributions = {
      self: ["charactergen/competence.yaml"],
      environment: [],
      inventory: [],
      peers: [],
    };

    /**
     * Re-evaluate this character's competence-conferred verbs and reconcile
     * the affordance stack: drop the prior conferral entry, then re-push
     * the current set (idempotent pop + conditional push, mirroring the
     * hosted-update delta). Called by `AdvancementApi` after each Transcript
     * append. No-op before the Catalog warms.
     */
    async refreshConferrals(): Promise<void> {
      const catalogue = StuffApi.findByTemplatePath(
        TemplatePaths.disciplineCatalogue
      );
      if (!catalogue) return;
      // The host is always a CommandGiver in practice (AdvancementMixin is
      // composed above CommandGiverMixin on Character), but the base isn't
      // type-constrained to it — narrow like Mobile does for its
      // CommandGiver calls.
      const giver = this as unknown as Stuff & CommandGiver;
      const verbs = await AdvancementApi.conferredVerbs(giver);
      const defs: CommandDefinition[] = [];
      for (const verb of verbs) {
        const def = CommandApi.getCommand(verb);
        if (def) defs.push(def);
      }
      // The catalogue is the affording source — attribution resolves to
      // "your competence in the catalog." Pop the old entry unconditionally
      // (a band may have dropped), re-push only if anything is conferred.
      giver.popCommandSource(catalogue);
      if (defs.length > 0) {
        giver.pushCommandSource(catalogue, "self", defs);
      }
    }
  };
}
