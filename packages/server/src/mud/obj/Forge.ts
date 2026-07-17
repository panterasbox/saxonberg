/**
 * Forge — a bellows-fed smithing furnace: a {@link FurnaceMixin} appliance
 * whose charcoal fuel + a worked bellows reach smelting heat (iron's melting
 * point) that unfed wood never does. Composes `Furnace + LightSource +
 * Reserved(fuel) + Thermal` over a `Thing`. Lit with `ignite`; the bellows is
 * worked to boost the held temperature (`forge.getHeldTemperatureK()` scales by
 * `bellowsMultiplier` when active). A lit forge heats the Meltables in its
 * scope toward that temperature (`heatContents`) — the metal-melting demo.
 */

import Thing from '../lib/stuff/Thing';
import { ReservedMixin } from '../lib/reserve';
import { LightSourceMixin } from '../lib/perception/LightSource';
import { ThermalMixin } from '../lib/thermal/Thermal';
import { FurnaceMixin } from '../lib/fire/Furnace';

const ForgeBase = FurnaceMixin(
  LightSourceMixin(ReservedMixin(ThermalMixin(Thing))),
);

export default class Forge extends ForgeBase {}
