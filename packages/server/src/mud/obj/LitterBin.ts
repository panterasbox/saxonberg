/**
 * LitterBin — a public bin that holds litter.
 *
 * A `Vessel` (the canonical container-object — it holds discrete Stuff,
 * dropped litter) with `Detailed` (the dented drum, the swing lid) on top.
 * Nothing bespoke: an ordinary container fixture. Its capacity / open-topped
 * behaviour is authored per-seed.
 */

import { Vessel } from '../lib/stuff/Vessel';
import { DetailedMixin } from '../lib/description/Detailed';

const LitterBinBase = DetailedMixin(Vessel);

export default class LitterBin extends LitterBinBase {}
