/**
 * Acid — a corrosive compound with a pH well below 7 (vitriol); it poisons
 * and fumes.
 *
 * A KIND of material (material decomposition): what the substance is.
 * Composes `Compound`, `Solution`, `Acidity`, `Toxicity`, `Odor`. Consumers
 * never narrow on a kind — they ask for a capability
 * (`MixinApi.has<Capability>`).
 */
import Mineral from "../../../lib/material/Mineral";
import { CompoundMixin } from "../../../lib/material/Compound";
import { SolutionMixin } from "../../../lib/material/Solution";
import { AcidityMixin } from "../../../lib/material/Acidity";
import { ToxicityMixin } from "../../../lib/material/Toxicity";
import { OdorMixin } from "../../../lib/material/Odor";

export default class Acid extends CompoundMixin(
  SolutionMixin(AcidityMixin(ToxicityMixin(OdorMixin(Mineral)))),
) {}
