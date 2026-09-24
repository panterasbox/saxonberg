/**
 * Simple — a medicinal herb you steep into a draught (clinical-medicine
 * D10). Extends `Provision`, because a herb IS food-shaped matter: it
 * rots, it can be contaminated. It composes the kernel `SteepableMixin`,
 * which carries the `steepsInto` field (the draught Material `steep`
 * produces) and affords the platform `steep`/`infuse` verb outward — the
 * infusion substrate is general and lives in the kernel now, not here.
 */

import Provision from "@saxonberg/server/mud/platform/thing/Provision";
import { SteepableMixin } from "@saxonberg/server/mud/lib/craft/Steepable";

export default class Simple extends SteepableMixin(Provision) {}
