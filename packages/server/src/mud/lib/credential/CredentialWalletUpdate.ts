/**
 * CredentialWalletUpdate — the credential wallet as a hosted update: the
 * born-with **wallet app**. Composes {@link CredentialWalletMixin} (the
 * holder) and `AetherHostedMixin` (the must-be-hosted relation) around a bare
 * `Idea`. Injected once into an attunement host by
 * `Avatar.installDefaultLoadout` (the `CommsUpdate` / `ForumsUpdate`
 * precedent), replacing the per-credential `PaymentImplantUpdate` and
 * `TravelCredentialUpdate` twins with a single app holding both records.
 *
 * It affords the **payment verbs** to its host (the `self` bucket — a wallet
 * app is born holding a payment credential). Travel adds no holder-verbs:
 * `register` is afforded by the terminal, `teleport` is a general verb.
 *
 * Session-durable in v1: re-cloned each login from a seed that ships both an
 * empty payment record and a floored travel record, so the born-with
 * University Avenue hop survives and accounts re-link via `openAccount`.
 */

import { Idea } from "../stuff/Idea";
import { CredentialWalletMixin } from "./CredentialWallet";
import type { CredentialKind } from "./Credential";
import { AetherHostedMixin } from "../augmentation/AetherHosted";
import { TemplatePaths } from "../paths";
import type { CommandContributions } from "../../api/command";

export default class CredentialWalletUpdate extends CredentialWalletMixin(
  AetherHostedMixin(Idea),
) {
  static readonly TEMPLATE_PATH = TemplatePaths.credentialWalletUpdate;

  /** Born holding an (empty) payment record, a floored travel record, and an
   *  (empty) keychain — the implant keychain a lease adds a dorm keyway to. */
  static defaultCredentialKinds: readonly CredentialKind[] = [
    "payment",
    "travel",
    "key",
  ];

  /**
   * The wallet app affords the payment verbs to its host. Carried via the
   * `self` bucket (a hosted update confers its `self` verbs to the host).
   */
  static commandContributions: CommandContributions = {
    // `work/fulfill.yaml` rides the wallet because the capture beat must
    // travel with the courier, away from any board — diegetically the
    // implant logs the delivery.
    self: ["banking/pay.yaml", "banking/wallet.yaml", "work/fulfill.yaml"],
    environment: [],
    inventory: [],
    peers: [],
  };
}
