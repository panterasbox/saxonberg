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
 *
 * ⭐ The Hearthworks' one class, shipped in the venue pack (the capability
 * rung) since the venue re-rooted under `/world/terminus` — a class path
 * under a pack root resolves into THAT pack's `src/`, never the kernel's.
 * Backs `/world/terminus/hearthworks/location/SealedCellar`.
 */

import SingletonCartesianLocation from '@saxonberg/server/mud/lib/location/SingletonCartesianLocation';
import { ReservedMixin } from '@saxonberg/server/mud/lib/reserve';

export default class SealedCellar extends ReservedMixin(SingletonCartesianLocation) {}
