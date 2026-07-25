/**
 * BankCounter — the teller-counter fixture: the seeded `BankMixin` host that
 * lights up the banking verb surface inside a branch and holds the cash
 * vault. A **`Vessel`** (the canonical container-object — its contents are
 * the vault coins); `Vessel` already carries `Visible` / `Perceptible` (via
 * `Thing`) so it renders, resolves by keyword, and sits in the room — only
 * `Detailed` (look-at details) is added on top. `Vessel` rather than a
 * hand-rolled `ContainerMixin(Thing)`: a thing-that-holds-things is exactly
 * what `Vessel` is.
 *
 * The `BankMixin` demonstrator class, homed beside the mixin (the
 * `TravelCredential` / `BrandedBottle` precedent).
 */

import { Vessel } from "../stuff/Vessel";
import { DetailedMixin } from "../description/Detailed";
import { PostRegistrationMixin } from "../stuff/PostRegistration";
import { DialogueEffectRegistry } from "../npc/DialogueEffects";
import { BankMixin } from "./Bank";
import { BANK_CIRCLE_EFFECT } from "./BankDialogueEffect";

const BankCounterBase = BankMixin(
  DetailedMixin(PostRegistrationMixin(Vessel)),
);

export default class BankCounter extends BankCounterBase {
  static persistentFields = ["corpoKey"];

  /**
   * A bank standing up registers banking's dialogue effects — the
   * object-lifecycle home for what was a module-scope registration
   * (`bank-circle` can only fire in a conversation held at a bank, so
   * the first live counter is exactly when the verb becomes real).
   * Idempotent `Map.set`; every counter re-asserts it, which also
   * re-points the handler after a hot reload of the effect module.
   */
  public override async postRegister(context?: unknown): Promise<void> {
    await super.postRegister(context);
    DialogueEffectRegistry.register("bank-circle", BANK_CIRCLE_EFFECT);
  }
}
