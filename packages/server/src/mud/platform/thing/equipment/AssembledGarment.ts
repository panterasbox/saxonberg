/**
 * AssembledGarment — a garment made of parts — uppers and soles, stitched (the boots). The sole is the wear part, re-soled alone.
 *
 * ⭐ Its own class, not `AssembledMixin` on `Garment`: most garment rows
 * have no parts, and a mixin every instance does not need is the
 * antipattern the base-class narrowing removed. `lint:bills` holds both
 * directions: a class that composes `AssembledMixin` has a bill on every
 * row, and a row with a bill names such a class.
 */

import Garment from './Garment';
import { AssembledMixin } from '../../../lib/craft/Assembled';

const AssembledGarmentBase = AssembledMixin(Garment);

export default class AssembledGarment extends AssembledGarmentBase {}
