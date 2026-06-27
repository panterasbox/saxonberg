/**
 * BankCounter — the teller-counter fixture: the seeded `BankMixin` host that
 * lights up the banking verb surface inside a branch and holds the cash
 * vault. A `Container` (its contents are the vault coins) that is also a
 * `Thing` (it sits in the room, is looked at, referenced by keyword).
 *
 * The `BankMixin` demonstrator class, homed beside the mixin (the
 * `TravelCredential` / `BrandedBottle` precedent): a class that instantiates
 * a banking-defined mixin lives in `lib/banking/`, not top-level `/obj/`.
 */

import Thing from "../stuff/Thing";
import { ContainerMixin } from "../spatial/Container";
import { BankMixin } from "./Bank";

const BankCounterBase = BankMixin(ContainerMixin(Thing));

export default class BankCounter extends BankCounterBase {
  static persistentFields = ["corpoKey"];
}
