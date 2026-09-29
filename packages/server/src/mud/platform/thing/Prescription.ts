/**
 * Prescription — a slip of paper authorizing a controlled active for one
 * patient (clinical-medicine D9). A slip is a slip: `PrescriptionMixin`
 * on a bare `Thing`. Cloned by `prescribe` and stamped with the patient,
 * the active and the dose count; spent by `administer`.
 */

import Movable from '../../lib/stuff/Movable';
import { PrescriptionMixin } from '../../lib/vitals/Prescription';

export default class Prescription extends PrescriptionMixin(Movable) {}
