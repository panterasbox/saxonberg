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
import { BankMixin } from "./Bank";

const BankCounterBase = BankMixin(DetailedMixin(Vessel));

export default class BankCounter extends BankCounterBase {
  static persistentFields = ["corpoKey"];
}
