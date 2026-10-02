/**
 * BankCounter — the teller-counter fixture: the seeded `BankMixin` host that
 * lights up the banking verb surface inside a branch and holds the cash
 * vault. A **`Holder`** — matter that holds discrete things, standing in
 * the branch. The root carries `Visible` / `Perceptible` / `Detailed`, so it
 * renders, resolves by keyword and answers a look-at without anything added.
 *
 * ⚠ **It used to be a `Vessel`, and that was one rung too far.** Since the
 * base-class narrowing (D14) `Vessel` sits on `Good`, which composes
 * `Chattel` and `Concealable` — a teller's counter is bolted to the floor of
 * a bank: it is not somebody's chattel and you cannot hide it. The container
 * behaviour it actually wanted is one mixin, so it composes that mixin.
 *
 * The `BankMixin` demonstrator class, homed beside the mixin (the
 * `TravelCredential` precedent).
 */

import Holder from "../../lib/stuff/Holder";
import { ContainerMixin } from "../../lib/spatial/Container";
import { DialogueEffectRegistry } from "../../lib/npc/DialogueEffects";
import { BankMixin } from "../../lib/banking/Bank";
import { BANK_CIRCLE_EFFECT } from "../../lib/banking/BankDialogueEffect";
import type { FieldMeta } from "../../lib/mixin";

const BankCounterBase = BankMixin(
  Holder,
);

export default class BankCounter extends BankCounterBase {
  static fieldMeta: FieldMeta = {
    corpoKey: { persistent: true },
  };

  /**
   * A bank standing up registers banking's dialogue effects — the
   * object-lifecycle home for what was a module-scope registration
   * (`bank-circle` can only fire in a conversation held at a bank, so
   * the first live counter is exactly when the verb becomes real).
   * Idempotent `Map.set`; every counter re-asserts it, which also
   * re-points the handler after a hot reload of the effect module.
   */
  public override async onCreate(context?: unknown): Promise<void> {
    await super.onCreate(context);
    DialogueEffectRegistry.register("bank-circle", BANK_CIRCLE_EFFECT);
  }
}
