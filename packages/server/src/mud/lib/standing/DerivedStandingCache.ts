/**
 * ⭐ **DerivedStandingCache — the sync face of an async ledger.**
 *
 * Two of the five live standing figures read ledgers whose Api is
 * async (`TraitApi.pronouncedFor`, `AdvancementApi.bandsFor`), while
 * `SubscribableFieldDescriptor.read` is **synchronous**. That is not an
 * oversight to route around: `MqlSubscriptionApi.projectFields` is sync,
 * and `ContainerMixin`'s own `contents` descriptor calls it from inside
 * its `read` — so widening `read` to return a promise would make
 * projection async *recursively through nested containment*, on the
 * inspection card's hot path. The contract is sync for a reason.
 *
 * The other three figures are already sync for the right reason: they
 * read a **materialized standing** (`RenownStanding` and friends keep an
 * in-memory map warmed from mongo). This class gives the two
 * un-materialized ledgers the same shape without asking them to
 * materialize a whole collection first.
 *
 * **Self-healing, not eagerly warmed.** A boot-time warm over every
 * subject would mean folding the raw transcript ledger for every
 * character who ever existed, which is the wrong trade for a figure
 * nobody may look at. Instead:
 *
 *   1. `get()` misses and returns `undefined`. `projectFields` omits an
 *      `undefined` field, so the client simply has no value yet — it
 *      renders as absent, never as a wrong number.
 *   2. The miss schedules a background fold, at most one in flight per
 *      subject.
 *   3. When it lands, `onWarm` runs — a **direct** poke to
 *      `MqlSubscriptionApi.notifyDurableSubject`, so the subscription
 *      re-resolves and the real figure arrives as a delta moments
 *      later. No event, no bus: one known producer, one known
 *      consumer.
 *
 * Which is the honest version: **a figure the server has not computed
 * yet is absent, not zero.** A zero would be a claim.
 *
 * Each ledger keeps it fresh from then on by calling `refresh()` right
 * after it persists a row.
 */

export class DerivedStandingCache<T> {
  /** Folded values, keyed by durable subject id. */
  private readonly values = new Map<string, T>();

  /** Subjects with a fold in flight — the stampede guard. */
  private readonly inFlight = new Set<string>();

  /**
   * @param fold   Async ledger read producing the cached value.
   * @param onWarm Called after a background fold lands, so the caller
   *               can poke whatever needs to re-resolve.
   */
  constructor(
    private readonly fold: (subject: string) => Promise<T>,
    private readonly onWarm: (subject: string) => void
  ) {}

  /**
   * The sync read. Returns `undefined` on a miss and schedules the
   * fold; the value arrives on the next re-resolve.
   */
  public get(subject: string): T | undefined {
    if (this.values.has(subject)) return this.values.get(subject);
    this.scheduleWarm(subject);
    return undefined;
  }

  /** Replace a subject's value and notify. Called on ledger append. */
  public async refresh(subject: string): Promise<void> {
    try {
      this.values.set(subject, await this.fold(subject));
      this.onWarm(subject);
    } catch {
      // A ledger read that fails leaves the previous value in place.
      // Dropping to a stale figure beats replacing it with a wrong one.
    }
  }

  /** Drop everything — HMR, tests, and the world-reset path. */
  public clear(): void {
    this.values.clear();
    this.inFlight.clear();
  }

  private scheduleWarm(subject: string): void {
    if (this.inFlight.has(subject)) return;
    this.inFlight.add(subject);
    void this.fold(subject)
      .then((v) => {
        this.values.set(subject, v);
        this.onWarm(subject);
      })
      .catch(() => {
        // Leave the subject un-cached; the next read retries.
      })
      .finally(() => {
        this.inFlight.delete(subject);
      });
  }
}
