/**
 * VerbalESPModality — addressed-ESP-speech singleton. Field modality
 * per the hybrid framing (local aether field + network routing on top).
 *
 * v1 `signalAt` returns the inherited null default — the network-
 * routing layer (`AetherMixin.dm`) handles delivery; the field-half
 * (eavesdropping in range, encryption at the local link) is reserved
 * for a future ESP-physics build. The hybrid model is documented in
 * the senses subsystem doc as the substrate's reserved shape.
 *
 * `family: 'field'` declares the underlying physics honestly even
 * though no `signalAt` walk ships in v1.
 */

import { Modality } from '../Modality';

export class VerbalESPModality extends Modality {}
