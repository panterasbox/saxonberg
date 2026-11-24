/**
 * CheckRack — the weapons-check rack: a {@link Locker} (persistence-model
 * N3) that takes only arms. A **kept** container fixture
 * that takes a patron's arms into custody (their owner-stamps stay put)
 * against a claim ticket, and hands them back on `rack reclaim`. Custody, never
 * title — the bar-fight build's coat-check-with-teeth.
 *
 * It composes the shared **`HeldGoodsMixin`** — the custody base (the coat
 * check, whole) — NOT `ConsignmentShelfMixin`: a checked weapon is held for
 * its owner to reclaim, never brokered, so the rack carries none of the
 * sale layer (no ask, no listing cap, no `buy`). `reclaim` narrows on the
 * shared `HeldGoodsShelf` surface (so it serves this and the store shelf
 * alike) and authorizes on `ChattelApi.ownerOf`, not on possessing the
 * ticket — so taking someone else's checked piece stays theft. The
 * consignment shelf is the same base plus a sale layer; a coat check is
 * just the base.
 */

import Locker from "@saxonberg/server/mud/platform/thing/Locker";
import type { HoldRefusal } from "@saxonberg/server/mud/lib/retail/HeldGoods";
import { MixinApi } from "@saxonberg/server/mud/api/mixin";
import type { Stuff } from "@saxonberg/server/mud/lib/stuff/Stuff";
import type { FieldMeta } from "@saxonberg/server/mud/lib/mixin";

export default class CheckRack extends Locker {
  static fieldMeta: FieldMeta = {};

  /**
   * ⭐ A check rack holds ARMS, and discrete ones: a shield is armor (not a
   * weapon), and a fungible stack is owned by possession — never checked.
   * (controller-liquidity W8, C61: the controller asked `isWeapon()` of a
   * good that was not Wieldable — `rack check lantern` threw.)
   */
  accepts(item: Stuff): HoldRefusal | null {
    if (!MixinApi.isWieldable(item) || !item.isWeapon()) {
      return { ok: false, reason: "not-a-weapon" };
    }
    if (MixinApi.isStackable(item)) return { ok: false, reason: "fungible" };
    return super.accepts(item);
  }

}
