/**
 * Campfire — the demo combustion fixture, now a thin {@link FurnaceMixin}
 * instance (the pinned-hot-while-fuelled pattern it seeded is generalized).
 *
 * Composition: `Furnace + LightSource + Postured(warming log-seats) +
 * Reserved(fuel) + Thermal` over a `Thing`. A content-theme `fuel` reserve
 * (`theme: 'combustion'`) depletes lazily against game-time; while lit + fuel
 * remains `getTemperature()` is **pinned** at the furnace's held temperature
 * (default 800 K — the Campfire pin), so its surface sits in the scalding band
 * and contact burns through the general `heat`-channel hook (no campfire-local
 * burn code). On burnout the pin releases — the fire cools toward ambient as
 * plain Thermal embers.
 *
 * Warmth reaches bodies through the **warming-slot `warmth` attribute** (a
 * log-seat authors both `restQuality` and `warmth`), read by the body's
 * effective-ambient resolver — radiant warmth as a constant slot attribute,
 * not the live fire temperature. ⭐ Since the envelope build it ALSO warms
 * the room itself, where there is a room: sitting at the fire and being in
 * a room with a fire in it are two different goods, and a campfire is one
 * of the few objects that delivers both.
 */

import Thing from '../../lib/stuff/Thing';
import { SurfacedMixin } from '../../lib/spatial/Surfaced';
import { SlottedMixin } from '../../lib/slot/Slotted';
import { PosturedMixin } from '../../lib/slot/Postured';
import { ReservedMixin } from '../../lib/reserve';
import { LightSourceMixin } from '../../lib/perception/LightSource';
import { ThermalMixin } from '../../lib/thermal/Thermal';
import { FurnaceMixin } from '../../lib/fire/Furnace';
import { SpaceHeatingMixin } from '../../lib/thermal/SpaceHeating';

// ⭐ `SurfacedMixin`: a pot rests ON a fire. What rests on a lit campfire
// takes its held temperature as its ambient (`ThermalMixin.restamp`).
//
// ⭐⭐ `SpaceHeatingMixin` (the envelope build): an open fire is FOR
// warmth. Outdoors that changes nothing — a sky-exposed scope has no
// envelope to warm, and that is the ENVELOPE's rule rather than a guard
// here — but a campfire lit inside four walls now warms the walls, which
// is what an open fire does. The practicum's brazier is a Campfire row,
// and it is in a cell.
const CampfireBase = SpaceHeatingMixin(
  FurnaceMixin(
    LightSourceMixin(
      ReservedMixin(
        PosturedMixin(SlottedMixin(SurfacedMixin(ThermalMixin(Thing)))),
      ),
    ),
  ),
);

export default class Campfire extends CampfireBase {}
