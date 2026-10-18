/**
 * Rug — a textile floor covering, laid `on` a floor (cleanliness D15).
 *
 * ⭐ It gathers what a floor gathers — crumbs, grit, the mud off boots —
 * and it is taken up and BEATEN (`brush rug` / `beat rug`, with a beater
 * or a broom), not swept or scrubbed. Nothing about a rug is special to
 * the verb: brushing is the thing's own act (`Soilable.brushOff`).
 */

import Good from '../../lib/stuff/Good';
import { SoilableMixin } from '../../lib/cleanliness/Soilable';

export default class Rug extends SoilableMixin(Good) {}
