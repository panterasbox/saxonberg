/**
 * Ore — a stone worth smelting: a mixture whose composition names the metal
 * in it.
 *
 * A KIND of material (material decomposition): what the substance is.
 * Composes `Mixture`. Consumers never narrow on a kind — they ask for a
 * capability (`MixinApi.has<Capability>`).
 */
import Stone from "./Stone";
import { MixtureMixin } from "../../../lib/material/Mixture";

export default class Ore extends MixtureMixin(Stone) {}
