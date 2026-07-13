/**
 * LitterBin — a public bin that holds litter.
 *
 * Composition: `Container` (it holds discrete Stuff — dropped litter),
 * `Detailed` (the dented drum, the swing lid) over a `Thing` (metal, via
 * `Tangible`). Nothing bespoke: an ordinary container fixture. Its
 * capacity / open-topped behaviour is authored per-seed.
 */

import Thing from '../lib/stuff/Thing';
import { ContainerMixin } from '../lib/spatial/Container';
import { DetailedMixin } from '../lib/description/Detailed';

const LitterBinBase = ContainerMixin(DetailedMixin(Thing));

export default class LitterBin extends LitterBinBase {}
