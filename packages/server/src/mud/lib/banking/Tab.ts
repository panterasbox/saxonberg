/**
 * TabMixin — the smallest credit primitive: the establishment's running
 * receivable against a known patron. Hosted on the **venue `Location`** (the
 * singleton Bar), NOT the bartenders or the Menu: the tab is the *house's*
 * credit relationship and must outlive shift changes (one bartender opens
 * it, another adds to it, you settle with whoever's on — one tab, owned by
 * the house). The bartender merely *acts on behalf of* the venue; the verb
 * resolves the establishment and records against its TabMixin.
 *
 * **Recognition-gated** — a tab is a privilege of being *known* (reads the
 * shipped `RecognitionApi`): only a patron the house (its present bartender)
 * recognizes may run one. **Skipping** is possible and *priced*, not
 * prevented: a `RegardApi` regard hit from the creditor plus revocation of
 * the privilege. The tab is the on-ramp the deferred lending system reads.
 *
 * Purely the *additive credit* layer — there is no proprietor/merchant
 * mixin; a pay-as-you-go venue just has an account + a priced Menu, and
 * `TabMixin` is mixed on only when it extends credit. State lives on the
 * mixin (decision 3: session-durable, the credential precedent); a `Tab`
 * Document for cross-restart durability is the deferred option.
 */

import type { MixinConstructor } from "../mixin";
import type { Stuff } from "../stuff/Stuff";
import { RecognitionApi } from "../../api/recognition";
import { RegardApi } from "../../api/regard";
import { Money } from "./Money";

/** The regard penalty a skipped tab costs the patron (mechanism, not policy). */
export const TAB_SKIP_REGARD_PENALTY = 20;

/** Public shape added by TabMixin. */
export interface Tab {
  /** The patron's accrued, unsettled tab balance. */
  getTabBalance(patronKey: string): Money;
  /** Whether `patron` may run a tab here — recognized by `recognizer`, not revoked. */
  canRunTab(patron: Stuff, recognizer: Stuff): boolean;
  /** Accrue a charge to the patron's tab (the house extends credit). */
  accrueToTab(patronKey: string, amount: Money): void;
  /** Zero the patron's tab (after it settles via pay). Returns what was owed. */
  clearTab(patronKey: string): Money;
  /** Whether the patron's tab privilege has been revoked (for skipping). */
  isTabRevoked(patronKey: string): boolean;
  /** Restore a patron's tab privilege (re-extend credit). */
  grantTab(patronKey: string): void;
  /**
   * Price a skipped tab: a `RegardApi` regard hit from `creditor` toward the
   * patron + revoke the privilege. The unpaid balance stays on the books.
   */
  skipTab(patron: Stuff, creditor: Stuff): void;
}

export function TabMixin<TBase extends MixinConstructor<Stuff>>(Base: TBase) {
  return class TabMixin extends Base implements Tab {
    static _mixinName = "TabMixin";

    static persistentFields = ["tabBalances", "revokedTabs"];

    /**
     * patronKey → accrued minor units.
     * @runtimeState
     */
    public tabBalances: Record<string, number> = {};
    /** Patrons whose tab privilege has been revoked (skipped a tab). */
    private _revokedTabs: Set<string> = new Set();

    /**
     * Persistence accessor for the revoked set (array round-trip).
     * @runtimeState
     */
    get revokedTabs(): string[] {
      return [...this._revokedTabs];
    }
    set revokedTabs(keys: string[]) {
      this._revokedTabs = new Set(keys);
    }

    public getTabBalance(patronKey: string): Money {
      return Money.of(this.tabBalances[patronKey] ?? 0);
    }

    public canRunTab(patron: Stuff, recognizer: Stuff): boolean {
      const key = patron.getTemplatePath();
      if (!key) return false;
      if (this._revokedTabs.has(key)) return false;
      return RecognitionApi.recognizes(recognizer, patron);
    }

    public accrueToTab(patronKey: string, amount: Money): void {
      this.tabBalances[patronKey] =
        (this.tabBalances[patronKey] ?? 0) + amount.minor;
    }

    public clearTab(patronKey: string): Money {
      const owed = this.tabBalances[patronKey] ?? 0;
      delete this.tabBalances[patronKey];
      return Money.of(owed);
    }

    public isTabRevoked(patronKey: string): boolean {
      return this._revokedTabs.has(patronKey);
    }

    public grantTab(patronKey: string): void {
      this._revokedTabs.delete(patronKey);
    }

    public skipTab(patron: Stuff, creditor: Stuff): void {
      const key = patron.getTemplatePath();
      if (!key) return;
      this._revokedTabs.add(key);
      RegardApi.adjustRegard(creditor, patron, -TAB_SKIP_REGARD_PENALTY);
    }
  };
}
