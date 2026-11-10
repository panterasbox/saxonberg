/**
 * Ceramic — a fired body (brick, stoneware, porcelain).
 *
 * A KIND of material (material decomposition): what the substance is. Adds
 * no capability of its own. Consumers never narrow on a kind — they ask for
 * a capability (`MixinApi.has<Capability>`).
 */
import Stone from "./Stone";

export default class Ceramic extends Stone {}
