/**
 * Key — a physical key: a bearer instrument holding a {@link KeyCredential}
 * (the `PaymentCard` / `TravelCard` precedent — `CredentialWalletMixin(Thing)`).
 *
 * A physical key is the **durable** access form: it persists with its holder
 * (carried inventory rides the persistence spine), where the implant keychain
 * is session-durable in v1. It affords no verbs — it's a pure instrument the
 * lock reads through the reachable-wallet scan; its `shortDescription` (a brass
 * key / a keycard / a master ring) is set at issuance from the lock technology.
 */

import Thing from "../../lib/stuff/Thing";
import { CredentialWalletMixin } from "../../lib/credential/CredentialWallet";
import type { CredentialKind } from "../../lib/credential/Credential";

export default class Key extends CredentialWalletMixin(Thing) {
  /** Born holding one (empty) keychain record — issuance fills it. */
  static defaultCredentialKinds: readonly CredentialKind[] = ["key"];
}
