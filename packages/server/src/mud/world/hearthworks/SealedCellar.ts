/**
 * SealedCellar — the sealed-room CO-death demonstrator (the ventilation
 * lesson). A `CartesianLocation` carrying a finite combustion-`air` Reserve
 * (`ReservedMixin`), so a fire lit inside it starves: it burns incomplete
 * (cooler + soot), fills the room with smoke + carbon monoxide (the medium
 * turns un-breathable and poisonous), and finally self-smothers as the air
 * floors — an enclosed fire kills by CO, not flame. Crack the door (an open
 * boundary) and it burns clean. The **only** bespoke thing here is composing
 * `ReservedMixin` for the authored air budget; the whole behaviour is the
 * shipped `FireApi` air model reading it. See docs/subsystems/fire.md.
 */

import CartesianLocation from '../../lib/location/CartesianLocation';
import { ReservedMixin } from '../../lib/reserve';

export default class SealedCellar extends ReservedMixin(CartesianLocation) {}
