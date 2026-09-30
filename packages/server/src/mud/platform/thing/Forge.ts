/**
 * Forge — a bellows-fed smithing furnace: a {@link BurnerMixin} appliance
 * whose charcoal fuel + a worked bellows reach smelting heat (iron's melting
 * point) that unfed wood never does. Composes `Burner + LightSource +
 * Reserved(fuel) + Thermal` over a `Thing`. Lit with `ignite`; the bellows is
 * worked to boost the held temperature (`forge.getHeldTemperatureK()` scales by
 * `bellowsMultiplier` when active). A lit forge heats the Meltables in its
 * scope toward that temperature (`heatContents`) — the metal-melting demo.
 */

import Firebox from '../../lib/fire/Firebox';

// ⭐ The whole of a forge IS the firebox chain — no mixin of its own,
// only the dials its rows author. It was the sixth class to write those
// four mixins in that order; `Firebox` is that order, named.
export default class Forge extends Firebox {}
