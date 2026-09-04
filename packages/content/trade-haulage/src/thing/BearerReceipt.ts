/**
 * BearerReceipt — ⭐ **a document of title that is a Thing you can
 * steal.**
 *
 * A warehouse receipt is a *document of title*: you transfer the receipt
 * instead of moving anything, which is how goods change hands without a
 * cart moving. The interesting half is the custody model, and it is the
 * credential bearer/registered split reused exactly:
 *
 * | | what it is | can it be taken |
 * |---|---|---|
 * | **bearer** | THIS — a slip of paper in your pocket | **yes**, like any other object |
 * | **registered** | a row naming a person, and no object at all | no |
 *
 * ⚠ The registered form ships as *nothing*: the record in the document
 * store is the whole of it, and there is deliberately no Thing to mint.
 * That asymmetry IS the design — the reason a merchant would want one
 * form over the other is exactly that one of them can be lost.
 *
 * The slip carries only a POINTER to the filed receipt, never the goods:
 * a copy would otherwise be a duplicate claim on one crate.
 */

import Thing from '@saxonberg/server/mud/platform/thing/Thing';
import type { FieldMeta } from '@saxonberg/server/mud/lib/mixin';

export default class BearerReceipt extends Thing {
  static fieldMeta: FieldMeta = {
    receiptPath: { persistent: true },
    what: { persistent: true },
  };

  /** The filed `warehouse-receipt` document this slip is a claim on. */
  public receiptPath = '';
  /** What the store acknowledged holding, for the prose on the slip. */
  public what = '';

  public getReceiptPath(): string {
    return this.receiptPath;
  }
  public setReceiptPath(value: string): void {
    this.receiptPath = value;
  }

  public getWhat(): string {
    return this.what;
  }
  public setWhat(value: string): void {
    this.what = value;
  }
}
