/**
 * Food — what a body eats: it spoils, may poison, has a pH.
 *
 * A KIND of material (material decomposition): what the substance is.
 * Composes `Edibility`, `Perishability`, `Toxicity`, `Acidity`, `Tissue`.
 * Consumers never narrow on a kind — they ask for a capability
 * (`MixinApi.has<Capability>`).
 */
import Organic from "../../../lib/material/Organic";
import { EdibilityMixin } from "../../../lib/material/Edibility";
import { PerishabilityMixin } from "../../../lib/material/Perishability";
import { ToxicityMixin } from "../../../lib/material/Toxicity";
import { AcidityMixin } from "../../../lib/material/Acidity";
import { TissueMixin } from "../../../lib/material/Tissue";

export default class Food extends EdibilityMixin(
  PerishabilityMixin(ToxicityMixin(AcidityMixin(TissueMixin(Organic)))),
) {}
