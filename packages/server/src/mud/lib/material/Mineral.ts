/**
 * Mineral — what was never alive: metal, stone, salt, alkali, water, gas.
 *
 * A KIND of material (material decomposition): what the substance is. Adds
 * no capability of its own. Consumers never narrow on a kind — they ask for
 * a capability (`MixinApi.has<Capability>`).
 */
import Material from "./Material";

export default abstract class Mineral extends Material {}
