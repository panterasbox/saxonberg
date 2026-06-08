/**
 * SmellConduit — odor pass-through across a Boundary.
 *
 * Same shape as `LightConduit`: a 0..1 multiplier applied to the
 * smell signal flowing from the `from` side to the `to` side.
 * Returning `0` short-circuits the smell walk for that direction
 * (closed door, closed shutter); returning `1` lets the signal
 * through unattenuated (open).
 *
 * Per the requirements doc: Door and Window implement this conduit
 * alongside `LightConduit`; transmissivity gates on
 * `isOpen()` / `Sealable.isOpen` respectively.
 */

import type { BoundarySide, Conduit } from './Conduit';

export interface SmellConduit extends Conduit {
  readonly conduitKind: 'smell';
  transmissivity(from: BoundarySide, to: BoundarySide): number;
}
