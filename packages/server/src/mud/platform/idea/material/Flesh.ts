/**
 * Flesh — animal flesh — food that spoils, a mixture of lean, fat and water.
 *
 * A KIND of material (material decomposition): what the substance is.
 * Composes `Edibility`, `Perishability`, `Solidity`, `Porosity`, `Mixture`.
 * Consumers never narrow on a kind — they ask for a capability
 * (`MixinApi.has<Capability>`).
 */
import Animal from "../../../lib/material/Animal";
import { EdibilityMixin } from "../../../lib/material/Edibility";
import { PerishabilityMixin } from "../../../lib/material/Perishability";
import { SolidityMixin } from "../../../lib/material/Solidity";
import { PorosityMixin } from "../../../lib/material/Porosity";
import { MixtureMixin } from "../../../lib/material/Mixture";

export default class Flesh extends EdibilityMixin(
  PerishabilityMixin(SolidityMixin(PorosityMixin(MixtureMixin(Animal)))),
) {}
