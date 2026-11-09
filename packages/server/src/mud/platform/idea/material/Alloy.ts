/**
 * Alloy — a metal that is a mixture of metals (bronze, steel).
 *
 * A KIND of material (material decomposition): what the substance is.
 * Composes `Mixture`. Consumers never narrow on a kind — they ask for a
 * capability (`MixinApi.has<Capability>`).
 */
import Metal from "./Metal";
import { MixtureMixin } from "../../../lib/material/Mixture";

export default class Alloy extends MixtureMixin(Metal) {}
