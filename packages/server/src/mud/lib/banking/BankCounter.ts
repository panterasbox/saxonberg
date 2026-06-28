/**
 * BankCounter — the teller-counter fixture: the seeded `BankMixin` host that
 * lights up the banking verb surface inside a branch and holds the cash
 * vault. A **`Vessel`** (the canonical container-object — its contents are
 * the vault coins) made describable + referenceable (`Visible` / `Perceptible`
 * / `Detailed`) so it sits in the room, renders, resolves by keyword, and
 * exposes look-at details. `Vessel` rather than a hand-rolled
 * `ContainerMixin(Thing)`: a thing-that-holds-things is exactly what `Vessel`
 * is.
 *
 * The `BankMixin` demonstrator class, homed beside the mixin (the
 * `TravelCredential` / `BrandedBottle` precedent).
 */

import { Vessel } from "../stuff/Vessel";
import { VisibleMixin } from "../description/Visible";
import { PerceptibleMixin } from "../description/Perceptible";
import { DetailedMixin } from "../description/Detailed";
import { BankMixin } from "./Bank";

const BankCounterBase = BankMixin(
  DetailedMixin(VisibleMixin(PerceptibleMixin(Vessel)))
);

export default class BankCounter extends BankCounterBase {
  static persistentFields = ["corpoKey"];
}
