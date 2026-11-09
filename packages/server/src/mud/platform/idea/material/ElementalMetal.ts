/**
 * ElementalMetal — a metal that is one element (iron, copper, gold).
 *
 * A KIND of material (material decomposition): what the substance is.
 * Composes `Element`. Consumers never narrow on a kind — they ask for a
 * capability (`MixinApi.has<Capability>`).
 */
import Metal from "./Metal";
import { ElementMixin } from "../../../lib/material/Element";

export default class ElementalMetal extends ElementMixin(Metal) {}
