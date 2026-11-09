/**
 * OdorousConsumableMaterial — ⚠ scaffold (material decomposition W0): the
 * base `Material` now composes `OdorMixin` itself, so this adds nothing. Its
 * rows are re-homed onto their kinds, and this class deleted, in W2a.
 */
import { ConsumableMaterial } from './ConsumableMaterial';

export class OdorousConsumableMaterial extends ConsumableMaterial {}
