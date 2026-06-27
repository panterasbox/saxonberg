/**
 * Coin — physical, massed, fungible cash.
 *
 * A `Coin` is a {@link GlobbableMixin} over {@link Thing} (so it is
 * Containable, Tangible, Perceptible and Visible): carry / split / merge /
 * count come from the shipped glob substrate, and each coin carries a
 * **mass** (`Tangible`), so a large stack blows past carry capacity through
 * the shipped `LoadBearing` / encumbrance gauge — the cap on cash is the
 * honest physics, not an arbitrary rule (banking-requirements § Goals).
 *
 * Cash is the **bearer** money form: off the *governed* account ledger
 * (hand-to-hand moves change location, not total supply), self-limiting by
 * mass, no recourse if lost. Its denomination is its *identity* (a "credit"
 * coin), NOT a worth stamped on the good (banking Law 1) — how many minor
 * units a denomination represents is intrinsic to the currency
 * ({@link Money.faceValueOf}), read by the banking layer, never written here.
 *
 * A concrete standalone content object that composes only shipped mixins, so
 * it lives at top-level `/obj/` beside `Flask` / `AirTank` / `Campfire`
 * (memory: *obj vs lib Stuff placement*) — not in `lib/banking/`. Contrast
 * the credential mixin classes, which instantiate banking-defined mixins.
 *
 * `globIdentityFields = ['denomination']`: two coin stacks merge only when
 * the same denomination, so future denominations stack separately (the glob
 * coin exemplar).
 */

import Thing from "../lib/stuff/Thing";
import { GlobbableMixin } from "../lib/stuff/Globbable";
import { DEFAULT_CURRENCY } from "../lib/banking/Money";
import { Quantity } from "../lib/quantity";

const CoinBase = GlobbableMixin(Thing);

export default class Coin extends CoinBase {
  static persistentFields = ["denomination"];
  static globIdentityFields = ["denomination"];

  /** The coin's denomination (its identity / kind). v1: `'credit'`. */
  public denomination: string = DEFAULT_CURRENCY;

  /** Inter-stuff read of the denomination. */
  public getDenomination(): string {
    return this.denomination;
  }

  /**
   * The **stack's** total mass: the per-coin mass (stored via `Tangible`,
   * the per-unit value the template seeds + persists) scaled by the stack
   * size. This is what flows through the shipped `LoadBearing` tree-walk
   * (which reads `getMass()`), so a large stack measurably blows past carry
   * capacity — the cap on cash is the honest physics. Persistence still
   * round-trips the per-coin mass via the `mass` accessor, untouched here.
   */
  public override getMass(): Quantity<"kg"> {
    return super.getMass().scale(this.getQuantity());
  }
}
