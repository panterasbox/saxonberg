/**
 * GluePot — ⭐ glue boiled from what the tannery and the knackers throw away
 * (paint build D12).
 *
 * The kettle pattern (`SoapKettle`): put the stock in — hide scraps, bone,
 * fish skins (anything tagged `collagen`) — then pour water over it, and the
 * pot matches the boil to the STOCK: hide scraps give hide glue, bone bone
 * glue, fish skins fish glue. The stock is taken into the water (consumed);
 * held below the boil for a few hours on the hearth the profile carries the
 * water to glue. Cold, an animal glue sets to a cake (its material's cast);
 * warmed in a pot, it runs again. ⚠ Stock first, then the water (the
 * hopper's constraint: a `put` after the fill does not re-match).
 */

import CraftVessel from '@saxonberg/server/mud/platform/thing/CraftVessel';
import { MaturingMixin } from '@saxonberg/server/mud/lib/maturation/Maturing';
import MaturationProfileRef from '@saxonberg/server/mud/lib/maturation/MaturationProfile';
import type Material from '@saxonberg/server/mud/lib/material/Material';
import type MaturationProfile from '@saxonberg/server/mud/lib/maturation/MaturationProfile';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';

/** Which glue a stock boils to, by the stock's tag — the first that matches. */
const STOCK_GLUE: ReadonlyArray<[string, string]> = [
  ['fish-skin', 'fish-glue'],
  ['hide-scraps', 'hide-glue'],
  ['bone', 'bone-glue'],
];

export default class GluePot extends MaturingMixin(CraftVessel) {
  public override matchProfile(material: Material): MaturationProfile | null {
    if (material.hasTag('water')) {
      const stock = this.getContents().filter((c) => {
        const m = MixinApi.isTangible(c) ? c.getMaterial() : null;
        return m?.hasTag('collagen') ?? false;
      });
      const key = this.glueFor(stock);
      if (key !== null) {
        const profile = MaturationProfileRef.byKey(key);
        if (profile !== null) {
          for (const s of stock) void StuffApi.destruct(s);
          return profile;
        }
      }
    }
    return super.matchProfile(material);
  }

  /** The glue the stock in the pot boils to — the most of one kind, by its tag. */
  private glueFor(stock: Stuff[]): string | null {
    for (const [tag, key] of STOCK_GLUE) {
      if (stock.some((s) => (MixinApi.isTangible(s) ? s.getMaterial()?.hasTag(tag) : false))) return key;
    }
    return null;
  }
}
