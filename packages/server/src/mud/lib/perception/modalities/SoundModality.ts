/**
 * SoundModality — the auditory singleton. Field modality.
 *
 * `signalAt(loc)` walks containment + Boundary conduits + exits to
 * accumulate dB sound at the given scope. The walk lands in Phase 4
 * of the perception substrate build; Phase 1 ships the empty
 * subclass so the modality singleton boots and other phases wire
 * against the typed class.
 *
 * Note: the modality NAME is `'sound'`, but the BodyPlan organ key
 * (the `Modality.modality` field) is `'hearing'`. The substrate
 * tolerates the asymmetry — modalities are addressed by their
 * `name` in `PerceptionApi.modalityByName`, organs by the
 * BodyPlan's `sensoryPorts.modality`.
 */

import { Modality } from '../Modality';

export class SoundModality extends Modality {}
