/**
 * PaymentCard — the carryable payment credential: a `Thing` you hold (and
 * can lose), 1:1 with one account (the bearer instrument). A finder can
 * spend it up to its cap until it's frozen — the deliberate middle of the
 * risk ladder (more recoverable than cash, less secure than the body-bound
 * wallet implant).
 *
 * A thin {@link CredentialWalletMixin} holder over a corporeal base: it carries
 * one `payment` credential record (seeded empty, linked + capped at issue by
 * `BankingApi.issueCard`) and affords the payment verbs via its `inventory`
 * bucket. The travel card is the sibling holder that affords nothing.
 */

import Thing from "../../lib/stuff/Thing";
import { CredentialWalletMixin } from "../../lib/credential/CredentialWallet";
import type { CredentialKind } from "../../lib/credential/Credential";
import type { CommandContributions } from "../../api/command";

export default class PaymentCard extends CredentialWalletMixin(Thing) {
  /** Born holding one (empty) payment credential record. */
  static defaultCredentialKinds: readonly CredentialKind[] = ["payment"];

  /**
   * A carried payment card affords the settlement verbs to its holder (the
   * `inventory` bucket), so you can `pay` / manage your `wallet` anywhere you
   * hold the card, not only at a bank counter.
   */
  static commandContributions: CommandContributions = {
    self: [],
    peers: [],
    environment: ["platform/cmd/banking/pay.yaml", "platform/cmd/banking/wallet.yaml"],
  };
}
