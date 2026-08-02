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
import { Coinage } from "../lib/banking/Coinage";
import { Quantity } from "../lib/quantity";
import type { FieldMeta } from "../lib/mixin";

const CoinBase = GlobbableMixin(Thing);

export default class Coin extends CoinBase {
  static fieldMeta: FieldMeta = {
    denomination: { persistent: true, globIdentity: true },
  };

  /** The coin's denomination (its identity / kind). v1: `'credit'`. */
  public denomination: string = DEFAULT_CURRENCY;

  /** Inter-stuff read of the denomination. */
  public getDenomination(): string {
    return this.denomination;
  }

  /**
   * The **stack's** total mass: the per-coin mass — derived from the
   * denomination ({@link Coinage.perCoinMass}, currency-intrinsic like face
   * value, NOT a worth on the good) — scaled by the stack size. Deriving from
   * the denomination (a preserved `globIdentityField`) makes mass correct
   * across clone / split / merge without depending on the stored `Tangible`
   * mass, so a 25-credit sovereign stack is always heavier per coin than a
   * pile of 1-credit pieces of the same value. This is what flows through the
   * shipped `LoadBearing` tree-walk (which reads `getMass()`), so a large
   * fortune measurably blows past carry capacity — the honest-physics cash cap.
   */
  public override getMass(): Quantity<"kg"> {
    return Coinage.perCoinMass(this.denomination).scale(this.getQuantity());
  }
}
