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
 * mass, no recourse if lost.
 *
 * **Identity is `(currency, denomination)`** — the currency key plus the
 * coin's face value in minor units. There is no coin *name*: `zorkmid` is
 * the only authored money noun, and a coin presents as *"a 25-zorkmid
 * piece"*, derived from the pair via {@link Currency.describeDenomination}.
 * A second issuer's coins therefore render and stack correctly the moment
 * its currency record exists, with no naming ceremony and no content edit.
 * (banking Law 1 still holds: the face value is intrinsic to the
 * *currency*, read by the banking layer — the number here is the
 * denomination's structural key, not a worth stamped on the good, and a
 * pair that does not resolve **throws** rather than being worth what it
 * says.)
 *
 * ⚠⚠ `globIdentityFields = ['currency', 'denomination']`: two stacks merge
 * only when **both** match. The currency half is load-bearing — without it
 * two issuers' like-valued coins would merge into one stack, creating money
 * by a merge with no ledger row and no error. The key is the defence, not a
 * rule someone remembers.
 *
 * A concrete standalone content object that composes only shipped mixins, so
 * it lives at top-level `/obj/` beside `Flask` / `AirTank` / `Campfire`
 * (memory: *obj vs lib Stuff placement*) — not in `lib/banking/`.
 */

import Thing from "../../lib/stuff/Thing";
import { GlobbableMixin } from "../../lib/stuff/Globbable";
import { SecurityPolicies } from "../../lib/security/SecurityPolicies";
import { CallSecurity, Final, Unshadowable } from "../../lib/security/decorators";
import { Currency } from "../../lib/banking/Currency";
import { Quantity } from "../../lib/quantity";
import type { FieldMeta } from "../../lib/mixin";

const CoinBase = GlobbableMixin(Thing);

/**
 * ⚠⚠ Who may change a coin stack's size — the cash-side conservation gate.
 *
 * `setQuantity` on a coin **mints money by assignment**: it moves value with
 * no ledger row, no conservation check and no error. The ledger has a sealed
 * chokepoint (`postTransaction`, the single writer); cash, being ordinary
 * `Stuff`, had nothing equivalent. This closes that asymmetry with the
 * discipline `Stuff.destroy()` already uses.
 *
 * The realistic threat is not an attacker — it is a future contributor's
 * well-meant feature inflating the supply while nobody notices. This caller
 * set IS the policy: the glob mechanics (split/merge) and the cash faucet.
 * Anything else is a design conversation, not a list edit.
 *
 * ⚠ Gated **here and not on `GlobbableMixin`**: a glob is not necessarily
 * money. Gating the mixin would gate every pile of ore and every stack of
 * apples in the world, which is both wrong and enormously disruptive. The
 * generalization — a *value-bearing* marker that a scrip token or a bearer
 * credential could also carry — is the money-integrity slate's own cycle
 * (docs/slates/builds/money-integrity-slate.md § open question 2). Until
 * then, `Coin` is the value-bearing glob, and scrip will be a `Coin` with a
 * different currency, so it inherits this gate for free.
 */
const CoinQuantityMutators = SecurityPolicies.AnyOf(
  // ⚠ The CLONE PIPELINE. A `Hydrator` applies a template's (or a captured
  // snapshot's) `quantity` through the two-phase `set<Field>` dispatch, so
  // hydration is how a coin stack legitimately comes into existence at all —
  // both for a fresh `/stuff/thing/Coin` clone and for a logged-out player's cash
  // being reconstituted from `holder_snapshots`. Reconstituting a stack that
  // already exists is not minting.
  //
  // ⚠ This does mean a template authored with `data.quantity: 1000000` would
  // clone into a fortune. That is a CONTENT-authoring surface, not a code
  // one: `class` / `hydratorClass` are wizard-gated fields, and
  // "can a template mint coins" is enumerated in
  // docs/slates/builds/money-integrity-slate.md § the audit surface
  // (clone-a-coin, content packs, the CMS coin row) as that cycle's work.
  // `lib/stuff/Hydrator` is an INTERFACE — there is no runtime class to gate
  // on, so the arms are the concrete hydrator's code provenance and its
  // template lineage (`lint:gates` catches a dead arm here).
  SecurityPolicies.FromModule("/platform/idea/persistence/PersistentHydrator", {
    includeSubclasses: true,
  }),
  SecurityPolicies.FromTemplate("/platform/idea/persistence/*Hydrator"),
  // The glob mechanics: split subtracts what it hands out, merge sums what it
  // absorbs — both conserve by construction.
  SecurityPolicies.FromModule("/api/glob#GlobbableApi", {
    includeSubclasses: false,
  }),
  SecurityPolicies.FromTemplate("/platform/idea/api/glob"),
  // The cash faucet: `issueCash` sizes a freshly minted stack, and every mint
  // it performs is a logged `mint` leg through the conservation chokepoint.
  SecurityPolicies.FromModule("/api/banking#BankingApi", {
    includeSubclasses: false,
  }),
  SecurityPolicies.FromTemplate("/platform/idea/api/banking"),
);

export default class Coin extends CoinBase {
  static fieldMeta: FieldMeta = {
    currency: { persistent: true, globIdentity: true },
    denomination: { persistent: true, globIdentity: true },
  };

  /**
   * The currency this coin is money of. Unstamped (`""`) on a bare clone —
   * `issueCash` stamps it, and an unstamped coin cannot be valued.
   */
  public currency: string = "";

  /**
   * The coin's denomination: its **face value in minor units**, which is
   * its identity within the currency (there is no name).
   */
  public denomination: number = 0;

  /**
   * ⚠⚠ The cash-side conservation gate — see {@link CoinQuantityMutators}.
   * Only the glob mechanics and the cash faucet may resize a money stack.
   */
  @CallSecurity(CoinQuantityMutators)
  @Final
  @Unshadowable
  public override setQuantity(n: number): void {
    super.setQuantity(n);
  }

  /** Inter-stuff read of the currency. */
  public getCurrency(): string {
    return this.currency;
  }

  /** Inter-stuff read of the denomination (face value in minor units). */
  public getDenomination(): number {
    return this.denomination;
  }

  /**
   * The **stack's** total mass: the per-coin mass — derived from
   * `(currency, denomination)` ({@link Currency.perCoinMass},
   * currency-intrinsic like face value, NOT a worth on the good) — scaled
   * by the stack size. Deriving from preserved `globIdentityField`s makes
   * mass correct across clone / split / merge without depending on the
   * stored `Tangible` mass, so a 25-value stack is always heavier per coin
   * than a pile of 1-value pieces of the same total. This is what flows
   * through the shipped `LoadBearing` tree-walk, so a large fortune
   * measurably blows past carry capacity — the honest-physics cash cap.
   *
   * ⚠ **Throws on an unstamped or unresolvable pair.** Valuation must never
   * guess: the retired `?? 1` fallback silently revalued high denominations
   * on an unmigrated rename, and the conservation audit passed anyway
   * because it recomputed from the same broken lookup.
   */
  public override getMass(): Quantity<"kg"> {
    return Currency.perCoinMass(this.currency, this.denomination).scale(
      this.getQuantity()
    );
  }

  /**
   * How the stack presents — derived from `(currency, denomination)`, or
   * the issuer's chosen `label` when it named its coins.
   *
   * ⚠ **The asymmetry with {@link getMass} is deliberate**: presentation
   * degrades to a blank rather than throwing, because an unstamped coin
   * must never crash a `look`; valuation throws, because it must never lie.
   */
  public override getShortDescription(): string {
    try {
      return Currency.describeDenomination(this.currency, this.denomination);
    } catch {
      return "a blank coin";
    }
  }

  /**
   * The counted form — `"4 5-zorkmid pieces"`, not `"4 a 5-zorkmid pieces"`.
   *
   * `getPresentation` composes a stack as `` `${n} ${pluralize(base)}` ``
   * where `base` is the short description, and a short description that
   * leads with an article reads wrong once a count is prefixed. (This is a
   * general glob-rendering wart — *"4 a red apples"* — that predates the
   * currency build; `getPluralForm` is the sanctioned host-side opt-out, and
   * money is the surface where it shows most.)
   */
  public getPluralForm(): string {
    let singular = "";
    try {
      singular = String(
        Currency.describeDenomination(this.currency, this.denomination) ?? ""
      );
    } catch {
      singular = "";
    }
    if (!singular) return "coins";
    return `${singular.replace(/^(a|an|the) /i, "")}s`;
  }

  /**
   * Keywords gain the currency vocabulary. The `Perceptible` keyword getter
   * already tokenizes {@link getShortDescription} on whitespace, so
   * `"a 25-zorkmid piece"` also yields `25-zorkmid` and `piece` for free —
   * which is what makes a 25-value stack separately addressable from a
   * 1-value one at the parser.
   */
  public override getKeywords(): string[] {
    const base = super.getKeywords();
    if (!this.currency || !Currency.has(this.currency)) return base;
    const record = Currency.of(this.currency);
    return [...base, record.unit, record.plural];
  }
}
