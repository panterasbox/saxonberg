/**
 * SolidFood — a food with a texture — grain, dough, bread, sausage, curd.
 *
 * A KIND of material (material decomposition): what the substance is.
 * Composes `Solidity`, `Porosity`, `Kinetic`. Consumers never narrow on a
 * kind — they ask for a capability (`MixinApi.has<Capability>`).
 */
import Food from "./Food";
import { SolidityMixin } from "../../../lib/material/Solidity";
import { PorosityMixin } from "../../../lib/material/Porosity";
import { KineticMixin } from "../../../lib/material/Kinetic";

export default class SolidFood extends SolidityMixin(
  PorosityMixin(KineticMixin(Food)),
) {}
