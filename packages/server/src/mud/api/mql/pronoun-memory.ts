/**
 * PronounMemory — per-CommandGiver stash for the dynamic pronoun
 * seeds (`it`, `him`, `her`, `them`) plus the `last` slot returned by
 * `$$`. Updated post-resolve by the dispatcher; read by the resolver
 * when those seeds appear in a chain.
 *
 * Slot semantics:
 *
 *   - `it` / `him` / `her` / `them` — gendered slots. Routed at
 *     update time from the matched Stuff's `GenderedMixin.getPronouns()`
 *     (the enum: He → him, She → her, They → them, It → it). Stuff
 *     that doesn't compose `Gendered` defaults to `it`.
 *
 *   - `last` — full `MqlMany` from the most recent resolve,
 *     including any query-level via. `$$` reads this slot verbatim.
 *
 * Each slot also carries the **input fragment** that produced it
 * (the post-desugar query text). This is what the dispatcher's
 * scope-update logic substitutes for the pronoun string when a
 * `look it`-shaped query fires `updates_scope: true` — storing the
 * literal pronoun would be unstable across queries, so the original
 * fragment ("bookcase") is the right anchor.
 *
 * Update rules:
 *
 *   - Empty results don't touch the stash (no-op).
 *
 *   - Inputs that are themselves dynamic pronouns (`it`, `him`,
 *     `her`, `them`, `$$`) don't update either — the stash already
 *     has the right state, and overwriting with a pronoun-string
 *     fragment would lose the original anchor. Detection is
 *     case-insensitive on the trimmed fragment.
 *
 *   - Single-stuff results route to the gendered slot AND update
 *     `last` (so `$$` sees the same result).
 *
 *   - Multi-stuff results update `them` and `last` only — there's
 *     no single-stuff anchor to route per gender.
 *
 * The class is plain (not an Api): one instance per `CommandGiverMixin`
 * host, stored in a transient field. `#`-private slots are fine here
 * because PronounMemory is NOT a Stuff and never crosses the
 * call-security proxy.
 */

import type { Stuff } from '../../lib/stuff/Stuff';
import type { MqlMany } from './types';

/**
 * Slots indexed by the dynamic-pronoun seed name. `last` is the
 * companion slot for `$$`.
 */
export type PronounSlot = 'it' | 'him' | 'her' | 'them' | 'last';

export type GenderedSlot = Exclude<PronounSlot, 'last'>;

interface StashEntry {
  /** Resolved-result snapshot. For gendered slots, length is 1
   *  (single anchor) for he/she/it and 1+ for they/them collectives. */
  result: MqlMany;
  /** Post-desugar input fragment that produced this entry. */
  fragment: string;
}

/**
 * The stash itself. Plain class, instantiated once per CommandGiver.
 */
export class PronounMemory {
  #it: StashEntry | null = null;
  #him: StashEntry | null = null;
  #her: StashEntry | null = null;
  #them: StashEntry | null = null;
  #last: StashEntry | null = null;

  /**
   * Read a slot. Returns null when nothing's been stored. The
   * resolver maps the returned `result.stuff` array to `MqlMatch`
   * records, stamping `result.via` (when present) on each.
   */
  read(slot: PronounSlot): MqlMany | null {
    return this.#entry(slot)?.result ?? null;
  }

  /**
   * Read the input fragment that produced a slot, or null when the
   * slot is empty. Used by the dispatcher to substitute for
   * dynamic-pronoun queries during scope update — `look it` becomes
   * `look <stored fragment>` for scope-anchor purposes.
   */
  readFragment(slot: PronounSlot): string | null {
    return this.#entry(slot)?.fragment ?? null;
  }

  /**
   * Update the stash from a resolve result. The dispatcher calls
   * this once per `resolveAndValidate` MQL field.
   *
   *   - Empty results no-op.
   *   - Inputs that are themselves dynamic pronouns no-op.
   *   - Otherwise: `last` always updates; the gendered slot
   *     corresponding to the matched Stuff's pronouns updates for
   *     single-stuff results; multi-stuff results route to `them`.
   *
   * `slotFor` is provided by the caller because `MixinApi.isGendered`
   * lives on the wrong side of the dependency graph for direct use
   * here (`mql/pronoun-memory.ts` would re-enter `command.ts` via
   * `mixin.ts`'s import chain). The dispatcher passes a routing fn
   * that knows the gender mapping.
   */
  update(
    result: MqlMany,
    fragment: string,
    slotFor: (stuff: Stuff) => GenderedSlot
  ): void {
    if (result.stuff.length === 0) return;
    if (isDynamicPronounFragment(fragment)) return;

    const entry: StashEntry = { result, fragment };
    this.#last = entry;

    if (result.stuff.length === 1) {
      const slot = slotFor(result.stuff[0]!);
      this.#setSlot(slot, entry);
      return;
    }

    // Multi-stuff: only `them` makes sense as a referent.
    this.#them = entry;
  }

  /**
   * Test seam: clear the entire stash. Production code never calls
   * this (the stash is alive for the duration of the giver's
   * lifecycle); tests use it between cases.
   */
  clear(): void {
    this.#it = null;
    this.#him = null;
    this.#her = null;
    this.#them = null;
    this.#last = null;
  }

  #entry(slot: PronounSlot): StashEntry | null {
    switch (slot) {
      case 'it':
        return this.#it;
      case 'him':
        return this.#him;
      case 'her':
        return this.#her;
      case 'them':
        return this.#them;
      case 'last':
        return this.#last;
    }
  }

  #setSlot(slot: GenderedSlot, entry: StashEntry): void {
    switch (slot) {
      case 'it':
        this.#it = entry;
        return;
      case 'him':
        this.#him = entry;
        return;
      case 'her':
        this.#her = entry;
        return;
      case 'them':
        this.#them = entry;
        return;
    }
  }
}

/**
 * Recognize a fragment whose head is a dynamic pronoun (the seeds
 * `it`/`him`/`her`/`them`/`$$`). Used by both the stash-update guard
 * (don't overwrite fragment with a pronoun string) and the
 * dispatcher's scope-substitution path.
 *
 * Matches the *bare* pronoun form only — a fragment like `it:i`
 * (transform off the it-slot) doesn't qualify because the player's
 * intent isn't "treat me as the pronoun" but "drill into it."
 */
export function isDynamicPronounFragment(fragment: string): boolean {
  const s = fragment.trim().toLowerCase();
  return s === 'it' || s === 'him' || s === 'her' || s === 'them' || s === '$$';
}
