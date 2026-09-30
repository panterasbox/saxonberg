/**
 * Trap — the canonical deployable **hazard**: `HazardMixin(Good)`, a
 * placed object that springs when a mover meets it (the
 * `Bandage = DressingMixin(Good)` / `Coin = StackableMixin(Good)`
 * precedent — a Thing plus its capability mixin).
 *
 * `Good` composes `ConcealableMixin`, so a `Trap` is
 * concealable out of the box — a designer hides it at a concealment band
 * (`concealment: hidden`) and the detection gate (`PerceptionApi`) decides,
 * per-viewer, whether a mover notices it in time to step around it.
 *
 * The trap taxonomy is authored **data, not subclasses**: a spike pit, a
 * poisoned dart, a scythe blade, and a snare are all one `Trap` with
 * different `delivery` / `trigger` / `traverseConsequence` field
 * combinations. The resolution lives on `HazardMixin`; this class is only
 * the concrete host.
 *
 * See docs/subsystems/concealment.md.
 */

import Good from '../../lib/stuff/Good';
import { HazardMixin } from '../../lib/hazard/Hazard';

export default class Trap extends HazardMixin(Good) {}
