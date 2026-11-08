/**
 * OdorousConsumableMaterial — a `ConsumableMaterial` with a smell of its own,
 * for the same reason as {@link OdorousMaterial}: the capability is opted into
 * by the row's class.
 */
import { OdorousMixin } from '../../../lib/material/Odorous';
import { ConsumableMaterial } from './ConsumableMaterial';

export class OdorousConsumableMaterial extends OdorousMixin(ConsumableMaterial) {}
