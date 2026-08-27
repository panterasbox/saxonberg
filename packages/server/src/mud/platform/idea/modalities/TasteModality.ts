/**
 * TasteModality — the gustatory singleton. Contact modality.
 *
 * Taste is contact-only and authoring-driven this build (per-Detail
 * `taste` slot prose). The default null `signalAt` is correct —
 * there is no field-walked taste signal. Future taste-chemistry
 * substrate would land its readout here.
 */

import { Modality } from '../../../lib/perception/Modality';

export class TasteModality extends Modality {}
