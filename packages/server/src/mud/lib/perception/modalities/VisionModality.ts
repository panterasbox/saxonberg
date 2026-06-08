/**
 * VisionModality — the vision singleton. Field modality.
 *
 * `signalAt(loc)` returns the total light at `loc` (lux intensity +
 * color temperature + capped source attribution). The propagation
 * walk relocates here from the retired `LightApi.lightAt` in
 * Phase 2 of the perception substrate build; Phase 1 ships the
 * empty subclass so the modality singleton boots and other phases
 * (sensorium walk, reception gating) wire against the typed class.
 */

import { Modality } from '../Modality';

export class VisionModality extends Modality {}
