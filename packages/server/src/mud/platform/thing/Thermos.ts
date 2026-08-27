/**
 * Thermos — a dented stainless-steel vacuum flask of coffee.
 *
 * `extends Flask` (which is `Thermal + Sealable + Bulkable` over a
 * `Thing`) plus `Detailed` (the cap-cup, the dented body). The whole
 * mechanic is inherited: sealed → the vacuum barrier keeps the coffee
 * hot for hours; open → the barrier collapses and it cools like an open
 * mug. Gus's thermos stays sealed all shift — the break that never
 * comes — so the coffee never goes cold, backed by the real
 * thermodynamics, not just fiction.
 *
 * The coffee is a real `bulk` at a real cooling temperature; only the
 * drink-*effect* (alertness) is deferred to metabolism, and Gus never
 * triggers it (he never opens it).
 */

import Flask from './Flask';
import { DetailedMixin } from '../../lib/description/Detailed';

const ThermosBase = DetailedMixin(Flask);

export default class Thermos extends ThermosBase {}
