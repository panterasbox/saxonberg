/**
 * ClaimsRegister — the ledger on the claims-office counter, and the one
 * thing that tells `stake` which diggings it is recording for.
 *
 * ⭐ A fixture rather than a global: a second mining town's claims office
 * has its own register naming its own warren, and neither pack learns
 * about the other. The `stake` controller finds it by shape (a thing
 * that can name a warren) rather than by path, which is the same
 * duck-typed seam `survey` uses to read a holding.
 *
 * ⚠ It holds NO claims. Title lives in `ParcelRecord`, written only by
 * the gated `ParcelApi` — which is exactly why a content edit cannot
 * forge one, and why this row is a pointer rather than a database.
 */

import Thing from '@saxonberg/server/mud/lib/stuff/Thing';
import { DetailedMixin } from '@saxonberg/server/mud/lib/description/Detailed';
import type { CommandContributions } from '@saxonberg/server/mud/api/command';
import type { FieldMeta } from '@saxonberg/server/mud/lib/mixin';

export default class ClaimsRegister extends DetailedMixin(Thing) {
  /**
   * ⭐ The counter affords `stake` to whoever is in the room — the
   * content-affords-the-verb rule. A mine's acts are conferred by the
   * mine's own fixtures, never by a core mixin.
   */
  static commandContributions: CommandContributions = {
    self: [],
    environment: ['trade/mining/cmd/mining/stake.yaml'],
    peers: ['trade/mining/cmd/mining/stake.yaml'],
  };

  static fieldMeta: FieldMeta = {
    warrenPath: { persistent: true, authorable: true },
  };

  /** The diggings this register records claims for. */
  protected warrenPath: string = '';

  public getWarrenPath(): string { return this.warrenPath; }
  public setWarrenPath(value: string): void { this.warrenPath = value; }
}
