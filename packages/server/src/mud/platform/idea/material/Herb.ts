/**
 * Herb — leaf, root and bark gathered for what is in them; it wilts.
 *
 * A KIND of material (material decomposition): what the substance is.
 * Composes `Perishability`, `Solidity`, `Porosity`. Consumers never narrow
 * on a kind — they ask for a capability (`MixinApi.has<Capability>`).
 */
import Plant from "../../../lib/material/Plant";
import { PerishabilityMixin } from "../../../lib/material/Perishability";
import { SolidityMixin } from "../../../lib/material/Solidity";
import { PorosityMixin } from "../../../lib/material/Porosity";

export default class Herb extends PerishabilityMixin(
  SolidityMixin(PorosityMixin(Plant)),
) {}
