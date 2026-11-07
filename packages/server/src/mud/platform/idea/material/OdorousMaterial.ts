/**
 * OdorousMaterial — a `Material` with a smell of its own (`OdorousMixin`),
 * the `RadioactiveMaterial` pattern: a row opts in by naming this class, and a
 * plain `Material` holds no smell data at all.
 */
import { OdorousMixin } from '../../../lib/material/Odorous';
import Material from '../../../lib/material/Material';

export class OdorousMaterial extends OdorousMixin(Material) {}
