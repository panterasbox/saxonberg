/**
 * HideHorn — the hard and fibrous parts of an animal (leather, bone, wool,
 * silk).
 *
 * A KIND of material (material decomposition): what the substance is.
 * Composes `Degradation`, `Solidity`, `Porosity`. Consumers never narrow on a kind — they
 * ask for a capability (`MixinApi.has<Capability>`).
 */
import Animal from "../../../lib/material/Animal";
import { SolidityMixin } from "../../../lib/material/Solidity";
import { PorosityMixin } from "../../../lib/material/Porosity";
import { DegradationMixin } from "../../../lib/material/Degradation";

export default class HideHorn extends DegradationMixin(
  SolidityMixin(PorosityMixin(Animal)),
) {}
