/**
 * SoundConduit — sound pass-through across a Boundary.
 *
 * Same shape as `LightConduit` / `SmellConduit`: a 0..1 multiplier
 * applied to the linear sound amplitude flowing from the `from`
 * side to the `to` side. Returning `0` short-circuits the sound
 * walk for that direction (closed door, closed shutter); returning
 * `1` transmits unattenuated.
 *
 * Door + Window implement this conduit alongside the other three;
 * transmissivity gates on `isOpen()` / `Sealable.isOpen` respectively.
 *
 * Acoustic note: real-world doors offer 10-30 dB attenuation when
 * closed (not infinite). v1 treats closed Door as transmissivity 0
 * for simplicity; a future muffled-door subclass can return a
 * partial transmissivity (`0.01` → ~20 dB attenuation).
 */

import type { BoundarySide, Conduit } from './Conduit';

export interface SoundConduit extends Conduit {
  readonly conduitKind: 'sound';
  transmissivity(from: BoundarySide, to: BoundarySide): number;
}
