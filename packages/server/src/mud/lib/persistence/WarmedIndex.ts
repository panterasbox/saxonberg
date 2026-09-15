/**
 * WarmedIndex — ⭐⭐ **the boot-warmed, synchronously-read index over a
 * collection's rows.**
 *
 * Seven record classes had grown the same thing by hand: a
 * `private static _cache = new Map()`, an `async warm()` that reads the
 * whole collection and replaces the map, a `cached()` that hands it out,
 * and a `putCached`/`removeCached` pair the writer keeps in step as it
 * posts. `AccountBalance`, `SupplyAggregate` and the three standings —
 * renown, producer, participation — were character-for-character the same
 * three methods.
 *
 * ## Why the shape exists at all
 *
 * ⭐ **The read surface must not await.** `BankingApi.balanceOf`,
 * `RenownApi.renownOf`, `AppApi.setting` and the appearance render path
 * are all synchronous, and they are called from places that cannot become
 * async — `getPresentation`, a merge ripple's `canMergeWith`, a door's
 * `canTraverse`. So the rows are loaded once and read from memory
 * thereafter.
 *
 * ⚠ **And the index is never authoritative.** Every one of these
 * collections is itself a derived cache over an append-only log
 * (`bank_ledger`, `renown_events`, `participation_events`): dropping the
 * collection and replaying the log reproduces it exactly. This index is
 * therefore a cache over a cache, and that is why a cold read returning
 * the neutral value is correct rather than alarming.
 *
 * ## What this owns, and what it deliberately does not
 *
 * It owns the **storage**: the map, the atomic replace, the single-entry
 * patch. It does NOT own the **warm**, and that is not an oversight —
 * each warm carries an invariant that is the point of that subsystem:
 * `SupplyAggregate` SUMS duplicate rows rather than taking the last (the
 * figure is the money supply, and last-wins silently dropped money);
 * `AccountBalance` THROWS on a currency-less row rather than running the
 * world on money whose denomination nobody knows; the standings join a
 * composite `subject|scope` key. Folding those into one loop would be
 * folding away the three things worth reading.
 *
 * ⚠ **Not a Stuff, and not on the logic singleton.** The obvious-looking
 * home for warmed state is the subsystem's `XLogic` — and it is wrong:
 * a logic singleton is **stateless by construction** so `dest` can reload
 * it, and the next `singletonSync` builds a fresh one. A warmed index
 * there would be silently dropped on every hot reload. State that must
 * survive a reload lives either here, on the record class, or on a
 * `PostRegistrationMixin` holder whose `postRegister` re-warms it.
 */

/**
 * A key→value index, replaced wholesale at warm and patched per entry by
 * the writer. `V` is whatever the subsystem reads synchronously — a
 * number for a balance or a standing, a small record for a supply row.
 *
 * ⚠ **An empty index reads as the neutral value, never as an error.**
 * Every consumer here wants that: a renown read before the warm is 0,
 * which is also what a fresh world means, and the alternative — throwing
 * on a cold read — would make a boot-order slip look like a data bug at
 * whichever call site happened to be first. `AppSettings` is the one
 * place that must distinguish the two, and it is deliberately NOT on this
 * substrate (see its `warm`).
 */
export class WarmedIndex<V> {
  #map = new Map<string, V>();

  /**
   * Replace the whole index — the boot warm and the post-rebuild rewarm.
   *
   * ⭐ **Atomic by construction**: the caller builds the next map and
   * hands it over, so a reader mid-warm sees the old index complete
   * rather than a half-filled new one. Clearing and re-filling in place
   * would expose exactly that window, on a read path that answers "how
   * much money does this account have".
   */
  public replaceWith(entries: Iterable<readonly [string, V]>): void {
    this.#map = new Map(entries);
  }

  /** The value for `key`, or `undefined` when the index has never seen it. */
  public get(key: string): V | undefined {
    return this.#map.get(key);
  }

  /** Patch one entry — what a writer calls as it posts. */
  public put(key: string, value: V): void {
    this.#map.set(key, value);
  }

  /** Drop one entry. */
  public remove(key: string): void {
    this.#map.delete(key);
  }

  /**
   * The whole index, read-only.
   *
   * ⚠ A live view, not a copy: callers iterate it to derive aggregates
   * (totals by currency, overdraft by currency) and copying on every such
   * read would allocate the whole index per question.
   */
  public entries(): ReadonlyMap<string, V> {
    return this.#map;
  }

  /** Empty the index — the test seam. */
  public clear(): void {
    this.#map = new Map();
  }
}
