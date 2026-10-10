/**
 * Oven — a baking / roasting furnace: a {@link BurnerMixin} appliance holding
 * a gentle cooking heat (far below smelting). Same composition as
 * {@link Forge}, a low held temperature + no bellows (authored per seed). Lit
 * with `ignite`.
 */

import Firebox from '../../lib/fire/Firebox';
import { ContainerMixin } from '../../lib/spatial/Container';
import { PlacingMixin } from '../../lib/spatial/Placing';
import { MixinApi } from '../../api/mixin';
import { BulkableApi } from '../../api/bulk';
import type { BulkSlot } from '../../lib/bulk/Bulkable';
import type { Stuff } from '../../lib/stuff/Stuff';

// ⭐ `ContainerMixin` INSIDE `ThermalMixin`: an oven is a chamber you put
// bread in. A `Forge` and a `Kiln` are deliberately NOT containers — a
// forge is a fire you bring a workpiece to, and its radiant `heatContents`
// path (the room-sibling walk) is a different mechanism.
//
// ⭐ And `PlacingMixin` beside it: a range is BOTH — a firebox you put a
// loaf in and a hot plate you stand a pot on. The shipped kitchen-range row
// already says so in its prose ("a flat plate on top worn silver where pots
// have stood"), and prose that promises an affordance the object does not
// have is the crossroads-`south` bug. Both limbs feed the same couple
// (`ThermalMixin.heatSourceK` reads container AND support).
// ⭐ A firebox that ENCLOSES what it heats — that is the whole
// difference between an oven and a forge, and it is two mixins.
const OvenBase = ContainerMixin(PlacingMixin(Firebox));

export default class Oven extends OvenBase {
  /**
   * ⭐⭐⭐ **An oven can be fed by a sealed gas vessel set on it**, and
   * that one override is the whole of *the hearth runs on the bore's gas
   * and the cordwood stays unbought.*
   *
   * The hook is the `Lamp`'s, read one rung out: a lantern's own
   * interior is its tank, and an oven's tank is **whatever is standing
   * on it** — a bladder, a cylinder, a gasometer's offtake. Everything
   * else follows from the substrate with no further code: `fuelRemaining`
   * reads the slot's litres against the material's density,
   * `fuelEnergyJ` reads its heat of combustion, `consumeFuel` debits the
   * litres, and `stoke` refuses `'no-bed'` while a tank is coupled —
   * *the fire is on the pipe; take the bladder off to burn wood.*
   *
   * ## ⚠⚠ Why `Oven` and not `Firebox`
   *
   * A `Retort` is a Firebox that is also a `Placing` host, and what is
   * placed on a retort is its **product** path — the condenser, the
   * gasometer the volatiles run into. On `Firebox` this hook would need
   * a guard to tell a fuel vessel from a product vessel, and **a guard
   * that re-narrows the host set is the tell that the host is wrong.**
   * On `Oven` it needs none: a vessel of something flammable standing on
   * a cooking fire is fuel, which is true of every oven and surprising
   * on none.
   *
   * ## The three conditions, and each is doing work
   *
   * Bulkable (it holds something), `isGasRetained` (it is sealed and
   * shut — ⚠ an open pail of water on a range is not fuel and must not
   * read as empty fuel either), and a material that actually burns. A
   * vessel failing any of them is not a tank, and the bed is the fuel as
   * before — which is what makes this change invisible to every shipped
   * oven in the realm.
   */
  protected override fuelSlot(): BulkSlot | null {
    const self = this as unknown as Stuff;
    if (!MixinApi.isPlacing(self)) return null;
    for (const item of self.getPlaced('on')) {
      if (!MixinApi.isBulkable(item)) continue;
      if (!item.isGasRetained('interior')) continue;
      const material = item.getBulkMaterial('interior');
      if (!material) continue;
      if (BulkableApi.requiredClosureFor(material) !== 'sealed') continue;
      if (!(material.getHeatOfCombustion().rawValue() > 0)) continue;
      return item.getBulk('interior');
    }
    return null;
  }
}
