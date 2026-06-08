/**
 * SmellModality — the olfactory singleton. Field modality.
 *
 * `signalAt(loc)` walks containment + Boundary conduits + exits to
 * accumulate odor concentration at the given scope. The walk lands
 * in Phase 3 of the perception substrate build; Phase 1 ships the
 * empty subclass so the modality singleton boots and other phases
 * (sensorium walk, reception gating) wire against the typed class.
 */

import { Modality } from '../Modality';

export class SmellModality extends Modality {}
