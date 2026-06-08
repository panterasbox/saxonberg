/**
 * TouchModality — the tactile singleton. Contact modality.
 *
 * `signalAt(loc)` reads ambient temperature via
 * `BiomeApi.resolveTemperatureFor`, returning a `Touch` value object
 * (K temperature + coarse band). No propagation walk — touch is a
 * contact modality, queried at the actor's scope. Phase 5 fills the
 * body; Phase 1 ships the empty subclass so the modality singleton
 * boots and other phases wire against the typed class.
 */

import { Modality } from '../Modality';

export class TouchModality extends Modality {}
