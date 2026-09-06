/**
 * Warehouse — the **bailee**: a store that holds other people's goods
 * and owes a duty of care for them.
 *
 * ⚠⚠ **Storage is deliberately NOT a priced scarce good here**, and the
 * reason is a fact about the engine rather than a scoping preference:
 * **capacity is a property of a BEARER'S BODY**
 * (`bodyMass × CAPACITY_FRACTION × …`), and a warehouse has no body.
 * So *full* is unrepresentable, and a service that cannot fill up cannot
 * charge rent, turn anyone away, or fail. What ships is the **receipt**
 * and the **duty**; a stocktake that always balances would be inert
 * content — the same failure as a coach nobody rides.
 *
 * The warehousing build owns the rest, and its metric when it lands is
 * **mass** (authored in 126 content files against volume's one, and
 * unlike a count of contents it cannot be gamed by nesting).
 *
 * ⭐ Issuing a receipt is a method ON this object, not an Api call:
 * verbs go on objects, and *what is in my shed* is a question about the
 * shed.
 */

import { Vessel } from '@saxonberg/server/mud/lib/stuff/Vessel';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import type { FieldMeta } from '@saxonberg/server/mud/lib/mixin';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Containable } from '@saxonberg/server/mud/lib/spatial/Containable';
import type { Business } from '@saxonberg/server/mud/platform/idea/Business';
import WaybillRegistry from '../idea/WaybillRegistry';
import { WAYBILL_REGISTRY_PATH } from '../lib/haulage/ShipmentDesk';

export default class Warehouse extends Vessel {
  static fieldMeta: FieldMeta = {
    baileePath: { persistent: true, authorable: true, authorPicker: 'Template' },
  };

  /** The business that owes the duty of care. */
  public baileePath = '';

  public getBaileePath(): string {
    return this.baileePath;
  }
  public setBaileePath(value: string): void {
    this.baileePath = value;
  }

  /**
   * Take goods into store and issue a receipt.
   *
   * ⚠⚠ **The receipt is a RECORD, and there is deliberately no object.**
   * It shipped with a `bearer` option that minted a `BearerReceipt` —
   * "a document of title that is a Thing you can steal" — and the claim
   * was empty: nothing anywhere read the slip back, so holding it
   * entitled the holder to nothing and stealing it accomplished
   * nothing. A prop with a strong docstring attached.
   *
   * ⭐ The bearer form belongs with the act that would give it meaning:
   * a `withdraw` at the shed that checks who holds what, hands the goods
   * over and voids the row. Built together it is a real
   * document-of-title mechanic; built apart it is furniture. It is named
   * in `docs/subsystems/logistics.md` as a missing seam rather than
   * implied by a class sitting in the tree.
   */
  public async deposit(
    goods: Stuff & Containable,
    depositor: string,
  ): Promise<{ receiptPath: string }> {
    const bailee = await this.resolveBailee();
    if (!bailee) {
      throw new Error(
        'Warehouse.deposit: this store names no bailee, so nobody owes a ' +
          'duty of care for what is in it',
      );
    }
    const what = goods.getPresentation();
    const goodsPath = goods.getTemplatePath() ?? '';
    ContainmentApi.move(goods, this as unknown as never);

    const registry = await StuffApi.singleton<WaybillRegistry>(
      WAYBILL_REGISTRY_PATH,
    );
    const receiptPath = await registry.issueReceipt(bailee, {
      what,
      goodsPath,
      depositor,
    });
    return { receiptPath };
  }


  private async resolveBailee(): Promise<(Stuff & Business) | null> {
    if (this.baileePath === '') return null;
    const biz = await StuffApi.singleton<Stuff>(this.baileePath).catch(
      () => null,
    );
    return biz && MixinApi.isBusiness(biz) ? biz : null;
  }
}
