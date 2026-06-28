/**
 * TravelCard — a carryable Teleport Authority travel card.
 *
 * A held credential: a thin {@link CredentialWalletMixin} holder over a plain
 * `Thing`, carrying one `travel` credential record (the registered-node set +
 * born-with floor). State lives on the card, so handing it to another player
 * hands over its registered routes — the transferable half of the credential
 * (the wallet implant is the personal half).
 *
 * Affords no holder-verbs: `register` is afforded by the terminal you're
 * standing at, `teleport` is a general verb. The card is pure gate-data.
 */

import Thing from "../../../lib/stuff/Thing";
import { CredentialWalletMixin } from "../../../lib/credential/CredentialWallet";
import type { CredentialKind } from "../../../lib/credential/Credential";

export default class TravelCard extends CredentialWalletMixin(Thing) {
  /** Born holding one travel credential record (registered set + floor). */
  static defaultCredentialKinds: readonly CredentialKind[] = ["travel"];
}
