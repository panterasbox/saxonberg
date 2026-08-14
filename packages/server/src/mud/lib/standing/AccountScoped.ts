/**
 * The account seam for account-level standing.
 *
 * ⭐ **Why this exists at all.** `STOCK_LEVEL` says *Make* and *Fund*
 * measure the **person**, not the character. To band an account's figure
 * `InfluenceApi` needs two facts — which account a host belongs to, and
 * which subjects that account owns — and both live on `Avatar`.
 *
 * ⚠ **It cannot ask `Avatar` directly.** `Avatar` imports `InfluenceApi`
 * (its `subscribableFields` read standing), so an import from
 * `api/influence` back to `Avatar` — or to `api/player`, which reaches
 * `Avatar` through `PlayerLogic` — closes a module cycle. This interface
 * is declared in `lib/standing/`, which `api/influence` already depends
 * on and which depends on nothing, so the arrow only ever points one
 * way.
 *
 * ⚠ **Why a `typeof` guard rather than `MixinApi.isX`.** The project
 * rule is to narrow with a mixin predicate *where a mixin owns the
 * concern*. None does here: belonging to an account is a fact about the
 * `Avatar` class, not a composable capability, and minting a mixin for a
 * single method to satisfy the letter of the rule would invent a
 * subsystem concept nothing else needs. The guard is confined to this
 * file so there is exactly one place to change if that stops being true.
 */

/** What an account-level standing read needs from a host. */
export interface AccountSubjects {
  /**
   * The durable account key. Used as the `subject` of the rolled-up
   * `InfluenceStanding`, so the figure names what it measured.
   */
  readonly subject: string;
  /**
   * Every durable per-character subject the account owns — the keys the
   * per-character standings are stored under.
   *
   * ⚠ Includes the host itself. An account of one must roll up to
   * exactly the host's own figure, which is the degenerate case that
   * keeps the roll-up honest for the overwhelmingly common account.
   */
  readonly members: readonly string[];
}

/**
 * A host that can name the account it belongs to.
 *
 * ⚠ The narrowing predicate for this lives as a private static on
 * `InfluenceApi`, not here — `lib/**` admits no free-floating exported
 * functions (export discipline), and the guard has exactly one caller.
 */
export interface AccountScoped {
  getAccountSubjects(): AccountSubjects | undefined;
}
