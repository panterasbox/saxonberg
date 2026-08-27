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
 * not the live fire temperature.
 */

import Thing from '../../lib/stuff/Thing';
import { SlottedMixin } from '../../lib/slot/Slotted';
import { PosturedMixin } from '../../lib/slot/Postured';
import { ReservedMixin } from '../../lib/reserve';
import { LightSourceMixin } from '../../lib/perception/LightSource';
import { ThermalMixin } from '../../lib/thermal/Thermal';
import { FurnaceMixin } from '../../lib/fire/Furnace';

const CampfireBase = FurnaceMixin(
  LightSourceMixin(
    ReservedMixin(PosturedMixin(SlottedMixin(ThermalMixin(Thing)))),
  ),
);

export default class Campfire extends CampfireBase {}
