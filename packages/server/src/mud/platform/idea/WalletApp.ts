/**
 * WalletApp — the credential wallet, as an app installed on the person.
 * Composes {@link CredentialWalletMixin} (the holder) on `App`, one app
 * holding every credential kind. Row: `/platform/idea/app/wallet`.
 *
 * It affords the **payment verbs** to its host (the `self` bucket — a wallet
 * app is born holding a payment credential). Travel adds no holder-verbs:
 * `register` is afforded by the terminal, `teleport` is a general verb.
 *
 * Session-durable: re-cloned each login from a row that ships both an
 * empty payment record and a floored travel record, so the born-with
 * University Avenue hop survives and accounts re-link in the loadout.
 */

import { CredentialWalletMixin } from "../../lib/credential/CredentialWallet";
import type { CredentialKind } from "../../lib/credential/Credential";
import App from "./App";
import { TemplatePaths } from "../../lib/paths";
import type { CommandContributions } from "../../api/command";

export default class WalletApp extends CredentialWalletMixin(App) {
  static readonly TEMPLATE_PATH = TemplatePaths.walletApp;

  /** Born holding an (empty) payment record, a floored travel record, and an
   *  (empty) keychain — the implant keychain a lease adds a dorm keyway to. */
  static defaultCredentialKinds: readonly CredentialKind[] = [
    "payment",
    "travel",
    "key",
  ];

  /**
   * The wallet app affords the payment verbs to its host. Carried via the
   * `self` bucket (an app confers its `self` verbs to the host).
   */
  static commandContributions: CommandContributions = {
    // ⚠ `draw` and `fulfill` rode this list until controllers-are-io W7
    // and are `house draw` / `job fulfill` now — subcommands of the noun
    // whose book they write, afforded to every character by `Persona`.
    self: [
      "platform/cmd/banking/pay.yaml",
      "platform/cmd/banking/wallet.yaml",
      // ⚠ `watch` rode this list for one build and was removed. Two
      // reasons, and the second is the one that generalizes:
      //   1. it SHADOWED the livestream `watch` — and because this
      //      wallet is born-with, it did so for every character alive.
      //   2. a wallet is not why you can stand a post. `fulfill` earned
      //      its place here (the implant logs the delivery); `watch`
      //      had no such story, and reaching for the wallet because it
      //      is the thing everybody has is how a host goes wrong.
      // Standing a watch is now derived from PRESENCE and needs no verb.
    ],
    peers: [],
    environment: [],
  };
}
