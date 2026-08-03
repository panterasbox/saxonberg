/**
 * Rod — the **focus** item class: a pre-formed pattern with no tank.
 *
 * D5's second class, defined by what it does not carry. A rod supplies
 * the *specification*; **you** supply the energy — so it is bounded by
 * your reserve rather than by energy density, and **you** are the
 * endpoint, which means a rod that shoves recoils onto you (D6).
 *
 * A focus supplies the missing leg of Tarn's Rule, so foci come in verb
 * and noun flavours, and **a focus that lifts the axis you are already
 * strong on is worthless**. That is what makes them a real purchasing
 * decision rather than a strictly-better upgrade.
 *
 * It perishes too, by pattern rot (D9) — slower than charge, because it
 * is losing *order* rather than energy. A faded rod does not fail; it
 * delivers less per point you spend, which is the same legible signal
 * spell fade uses. `recharge` re-impresses it.
 *
 * `Rod` is the generic concrete class lenses and staves share; what
 * distinguishes them is content, not class.
 */

import Thing from '../../lib/stuff/Thing';
import { ArcaneMixin } from '../../lib/magic/Arcane';
import { FocusMixin } from '../../lib/magic/Focus';
import { CirculatingMixin } from '../../lib/residency/Circulating';

const RodBase = CirculatingMixin(FocusMixin(ArcaneMixin(Thing)));

export default class Rod extends RodBase {}
