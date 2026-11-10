/**
 * EdibleHerb — an herb a mouth takes (mint, juniper, hay).
 *
 * A KIND of material (material decomposition): what the substance is.
 * Composes `Edibility`. Consumers never narrow on a kind — they ask for a
 * capability (`MixinApi.has<Capability>`).
 */
import Herb from "./Herb";
import { EdibilityMixin } from "../../../lib/material/Edibility";

export default class EdibleHerb extends EdibilityMixin(Herb) {}
