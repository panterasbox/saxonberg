/**
 * TravelCard — a carryable Teleport Authority travel card.
 *
 * A held credential: a thin {@link CredentialWalletMixin} holder over a plain
 * `Thing`, carrying one `travel` credential record (the born-with floor). The
 * card is a bearer **instrument**, never a clearance store: its `travel` record
 * satisfies the `teleport`/`register` *instrument gate* ("do you have the means
 * to use the TPA at all?"), but travel **authorization** (the registered-node
 * set) is bound to the traveller's *identity* — the born-with, aether-hosted
 * wallet — and is never read off, nor written to, the card. Handing the card to
 * another player confers no destinations they didn't already hold on their own
 * identity.
 *
 * Affords no holder-verbs: `register` is afforded by the terminal you're
 * standing at, `teleport` is a general verb. The card is pure instrument.
 */

import Thing from "@saxonberg/server/mud/lib/stuff/Thing";
import { CredentialWalletMixin } from "@saxonberg/server/mud/lib/credential/CredentialWallet";
import type { CredentialKind } from "@saxonberg/server/mud/lib/credential/Credential";

export default class TravelCard extends CredentialWalletMixin(Thing) {
  /** Born holding one travel credential record (registered set + floor). */
  static defaultCredentialKinds: readonly CredentialKind[] = ["travel"];
}
