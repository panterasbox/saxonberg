/**
 * Vessel — the generic concrete container.
 *
 * `lib/stuff/Vessel` is substrate with seven subclasses (`BankCounter`,
 * `ConsignmentShelf`, `Footlocker`, `Handcart`, `Pack`, `Stock`,
 * `ExitableVessel`) — inheritance is overwhelmingly its job. One
 * template cloned it raw: the bag of holding.
 *
 * That template names this class. See
 * See CLAUDE.md § Instanceable Lives in `obj/`.
 */

import { Vessel as VesselBase } from '../../lib/stuff/Vessel';

export default class Vessel extends VesselBase {}
