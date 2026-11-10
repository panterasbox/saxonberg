/**
 * Residue — what is left over from a process (lees, manure, sweepings); it
 * rots.
 *
 * A KIND of material (material decomposition): what the substance is.
 * Composes `Tissue`, `Perishability`. Consumers never narrow on a kind —
 * they ask for a capability (`MixinApi.has<Capability>`).
 */
import Organic from "../../../lib/material/Organic";
import { TissueMixin } from "../../../lib/material/Tissue";
import { PerishabilityMixin } from "../../../lib/material/Perishability";

export default class Residue extends TissueMixin(PerishabilityMixin(Organic)) {}
