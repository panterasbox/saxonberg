/**
 * Sand — a won load of glass sand. `AlloyedMixin(Good)` so it carries its
 * assay: the iron the quarry stamped at the face (glass build W3), which
 * is what decides whether the glass it makes comes out clear or green.
 * Not tinted itself (sand is not glass); it hands its iron to the melt.
 */

import Good from "@saxonberg/server/mud/lib/stuff/Good";
import { AlloyedMixin } from "@saxonberg/server/mud/lib/material/Alloyed";

export default class Sand extends AlloyedMixin(Good) {}
