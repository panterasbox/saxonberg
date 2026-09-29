/**
 * Beacon — a pedestrian crossing signal (walk / stop).
 *
 * Composition: `Switchable` (the walk↔stop axis surfaced as on/off — on
 * = WALK, off = STOP; `switch`/`toggle` drive it), `Propertied` (dynamic
 * signal state / future timing knobs as props) over a `Detailed` `Thing`.
 * The walk/stop meaning is prose over the on/off state; the beacon gates
 * nothing (theatrical, like Gus's paddle) — it just shows a signal.
 */

import Movable from '../../lib/stuff/Movable';
import { SwitchableMixin } from '../../lib/boundary/Switchable';
import { PropertiedMixin } from '../../lib/stuff/Propertied';

const BeaconBase = SwitchableMixin(PropertiedMixin(Movable));

export default class Beacon extends BeaconBase {}
