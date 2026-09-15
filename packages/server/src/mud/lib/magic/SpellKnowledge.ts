/**
 * SpellKnowledge — the **vocabulary** of the per-character spell-learning
 * ladder: the chronicle key it files under and the prose the entry
 * carries. Derived on read from the chronicle ledger.
 *
 * ⭐ **The verbs are on the character, not here** — `persona.hasClaimed(key)`
 * and `recordChronicleOnce(key, entry)` on `PersonaMixin`, which is
 * key-agnostic so the kernel learns no content word.
 *
 * The `RecipeKnowledge` sibling, verbatim, and that is the whole design:
 *
 *   unknown → known-of → can-cast
 *
 * - **known-of** — a chronicle **claim**, minted (once) on reading a
 *   spellbook. You know the working exists and roughly what it asks.
 * - **can-cast** — falls out of **competence**, which derives on read
 *   from (Discipline × Transcript) and is never stored.
 *
 * ## Why a book cannot grant skill
 *
 * Competence is derive-on-read under derive-don't-track, so a book that
 * *granted* it would have to write Transcript evidence the character
 * never earned. It cannot, and it should not want to (requirements D13).
 *
 * So the ordinary outcome is the honest one: **you know a spell you
 * cannot cast**, because the band gate still bites. That is the
 * practicum thesis in one object — *instruction is the manual, practice
 * is the lab* — and it is the same **claim-vs-deed** axis the college
 * uses for assessment provenance, now doing work in a third place.
 *
 * Reading mints the claim; casting mints the deeds; competence derives
 * from deeds only.
 *
 * **Amnesia lives on `Memorized`, not here.** D15's line is that amnesia
 * takes claims and never deeds — but a *chronicle* claim is append-only
 * by construction, and rightly so: "I once read of this" is a fact about
 * the past that nothing should be able to unmake. What amnesia actually
 * strips is the **held specification** — the sharpness on
 * `MemorizedMixin`, which is decaying state rather than history. The
 * asymmetry D15 asks for is preserved exactly, and the ledger stays
 * append-only.
 *
 * Claim and deed use **distinct keys** — `recordOnce` dedups on
 * `{owner, key}` regardless of kind, so a shared key would make the deed
 * a no-op on the claim's row.
 */

import type { ChronicleEntryFields } from '../chronicle/ChronicleEntry';

export class SpellKnowledge {
  /** The key a *known-of* claim is filed under. */
  static knownKey(spellPath: string): string {
    return `spell-known:${spellPath}`;
  }

  /**
   * The ledger line for reading of a spell.
   *
   * ⚠ **Never a deed.** Writing one would be writing evidence of practice
   * that did not happen, and competence derives from exactly that evidence.
   */
  static knownEntry(name: string): ChronicleEntryFields {
    return { kind: 'claim', text: `Read of ${name}.`, tags: ['spell'] };
  }
}
