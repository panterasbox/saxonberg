/**
 * Glue — a coat that holds two things together; it sets and melts.
 *
 * A KIND of material (material decomposition): what the substance is.
 * Composes `Coating`, `Odor`, `Fusion`, `Kinetic`. Consumers never narrow on
 * a kind — they ask for a capability (`MixinApi.has<Capability>`).
 */
import Material from "../../../lib/material/Material";
import { CoatingMixin } from "../../../lib/material/Coating";
import { OdorMixin } from "../../../lib/material/Odor";
import { FusionMixin } from "../../../lib/material/Fusion";
import { KineticMixin } from "../../../lib/material/Kinetic";

export default class Glue extends CoatingMixin(
  OdorMixin(FusionMixin(KineticMixin(Material))),
) {}
