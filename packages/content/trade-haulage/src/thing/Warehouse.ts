/**
 * Warehouse — the **bailee**: a store that holds other people's goods
 * and owes a duty of care for them.
 *
 * ⭐⭐ **A store** (storage-and-ice W3): `StoreMixin(Holder)`, the
 * kernel's ledger-keeping holder, holding unique goods LIVE — a crate is
 * kept as itself, on a receipt for one, and comes back as itself on a
 * `withdraw` at the depot book. Capacity is mass (the store's own veto,
 * when a row authors `capacityKg`); the duty of care is the receipt.
 *
 * ⭐ Issuing a receipt is a method ON this object, not an Api call:
 * verbs go on objects, and *what is in my shed* is a question about the
 * shed.
 *
 * ⚠ **A `Holder`, not a `Vessel`** (the base-class narrowing,
 * D14). `Vessel` sits on `Good`, which composes `Chattel` and
 * `Concealable`; this is part of the premises — nobody's chattel, and you
 * cannot hide it. The container behaviour it wants is one mixin, so it
 * composes that mixin. The GOODS it holds are the chattel.
 */

import Holder from '@saxonberg/server/mud/lib/stuff/Holder';
import { StoreMixin } from '@saxonberg/server/mud/lib/storage/Store';
import type { FieldMeta } from '@saxonberg/server/mud/lib/mixin';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Containable } from '@saxonberg/server/mud/lib/spatial/Containable';

const WarehouseBase = StoreMixin(Holder);

export default class Warehouse extends WarehouseBase {
  static fieldMeta: FieldMeta = {
    baileePath: { persistent: true, authorable: true, authorPicker: 'Template' },
  };

  /** The business that owes the duty of care (the store's `businessPath`). */
  public baileePath = '';

  /** ⭐ A depot holds unique goods live, one receipt each. */
  public override acceptsLiveGoods = true;

  public getBaileePath(): string {
    return this.baileePath;
  }
  public setBaileePath(value: string): void {
    this.baileePath = value;
    this.businessPath = value;
  }

  /**
   * Take goods into store and issue a receipt — the depot's programmatic
   * intake, below the custody act (no keeper check: the clerk filing a
   * consignment in IS the house). `deposit`/`withdraw` at the depot book
   * are the verbs; this is what the freight desk calls.
   *
   * ⚠ The receipt is a RECORD (a `warehouse-receipt` document under the
   * bailee's branch); `withdraw` is the act that reads it back.
   */
  public async depositFor(
    goods: Stuff & Containable,
    depositor: string,
  ): Promise<{ receiptPath: string }> {
    if (this.businessPath === '' && this.baileePath !== '') this.businessPath = this.baileePath;
    const out = await this.receive(goods, depositor);
    if (!out.ok) {
      throw new Error(
        out.reason === 'no-bailee'
          ? 'Warehouse.deposit: this store names no bailee, so nobody owes a ' +
              'duty of care for what is in it'
          : `Warehouse.deposit: ${out.line}`,
      );
    }
    return { receiptPath: out.receiptPath };
  }
}
