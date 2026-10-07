/**
 * Cut — a piece of meat off a carcass.
 *
 * The instanceable twin of `CutMixin`, composing on `Provision` so a cut
 * inherits everything meat already needed: Freshness (it rots on the
 * shipped clock), WaterActivity (it cures and dries on the shipped
 * recipes), Contaminable (the butcher's hand and the carcass's own load
 * ride onto it), ThermalDose, Crafted, Composed and Sampled.
 *
 * Rows live wherever the trade that names them lives — the joints are
 * `trade-cooking`'s, because a cut is a thing a butcher makes.
 *
 * ⭐ A row authors only what it IS: which muscles it claims, how deep the
 * tools must reach, and how hard it is to take cleanly. Its texture and
 * its mass DERIVE from the claim and the carcass, so no row can lie about
 * either.
 */
import { CutMixin } from '../../lib/butchery/Cut';
import Provision from './Provision';

export default class Cut extends CutMixin(Provision) {}
