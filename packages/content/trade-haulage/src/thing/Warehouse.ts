/**
 * Warehouse — the **bailee**: a store that holds other people's goods
 * and owes a duty of care for them.
 *
 * ⚠⚠ **Storage is deliberately NOT a priced scarce good here**, and the
 * reason is a fact about the engine rather than a scoping preference:
 * **capacity is a property of a BEARER'S BODY**
 * (`bodyMass × CAPACITY_FRACTION × …`), and a warehouse has no bearer.
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
import BearerReceipt from './BearerReceipt';
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
   * ⭐⭐ **`bearer` decides whether the receipt is a Thing or a record**,
   * and that is the whole of the document-of-title design: a bearer
   * receipt is minted as a `BearerReceipt` you can be robbed of, and
   * whoever holds it may claim the goods; a registered receipt is a row
   * naming a person and cannot be taken off them. Same document, two
   * custody models — the credential bearer/registered split, reused.
   */
  public async deposit(
    goods: Stuff & Containable,
    depositor: string,
    opts: { bearer?: boolean } = {},
  ): Promise<{ receiptPath: string; token: BearerReceipt | null }> {
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
    const bearer = opts.bearer === true;
    const receiptPath = await registry.issueReceipt(bailee, {
      what,
      goodsPath,
      depositor,
      bearer,
    });

    // A bearer receipt has to EXIST as an object, or "you can steal it"
    // is a claim with nothing behind it.
    let token: BearerReceipt | null = null;
    if (bearer) {
      token = await StuffApi.clone<BearerReceipt>(
        '/trade/haulage/thing/bearer-receipt',
      );
      token.setReceiptPath(receiptPath);
      token.setWhat(what);
    }
    return { receiptPath, token };
  }

  private async resolveBailee(): Promise<(Stuff & Business) | null> {
    if (this.baileePath === '') return null;
    const biz = await StuffApi.singleton<Stuff>(this.baileePath).catch(
      () => null,
    );
    return biz && MixinApi.isBusiness(biz) ? biz : null;
  }
}
