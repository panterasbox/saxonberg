/**
 * DescriptorBank — the pool an unidentified item's appearance is drawn
 * from. One bank per item class (potions, wands, rings, amulets,
 * spellbooks, scrolls).
 *
 * The `NameBank` shape verbatim, and for the same reasons: these are
 * bulk authored **content**, not code, so they live as plain-JSON
 * `Document`s in their own collection and arrive through the `PackApi`
 * reconcile installer as the `descriptor-banks` content kind.
 *
 * ## Why every bank is a PRODUCT of two axes
 *
 * The arithmetic forces it (requirements D32). A class with N item types
 * needs N descriptors live, **2N** during a transition window, and
 * roughly **N × (reuseDelay + 1)** overall — about **80** at N = 20. No
 * flat list of colours supplies that without descending into *pale blue*
 * versus *light blue*, which is the point at which descriptors stop
 * being distinguishable and start being annoying.
 *
 * So each bank is two orthogonal axes: **ten words on each gives a
 * hundred distinguishable descriptors from twenty authored words**, and
 * every word stays meaningful. Scrolls are the free case — arbitrary
 * text, unbounded.
 *
 * | Class | Axis A | Axis B |
 * |---|---|---|
 * | Potions | colour | clarity |
 * | Wands | ornament | proportion |
 * | Rings | band form | marking |
 * | Amulets | shape | marking |
 * | Spellbooks | condition | cover marking |
 * | Scrolls | arbitrary text | — |
 *
 * ## ⚠ The invariant a lint enforces
 *
 * > descriptor banks ∩ (material **names** ∪ **keywords** ∪
 * > **appearance** words) = ∅
 *
 * **Descriptor axes must be decorative, never material.** Material is a
 * closed curated set with real physical consequences
 * (`response = f(mechanism, material, construction)`), so a descriptor
 * naming one is either a lie in the model or an unintended constraint on
 * manufacture — and the closed set is nowhere near deep enough to feed a
 * pool anyway.
 *
 * The collision surface is wider than material *names*: `Material` also
 * carries **`keywords`**, which drive the parser's material resolution.
 * So a collision is a **parser ambiguity bug**, not a stylistic wobble —
 * if *amber* is both a wand descriptor and a material keyword, `look at
 * amber` has two answers.
 *
 * The authoring trap worth stating out loud: the tempting words are
 * material claims in disguise — **gilded, vellum, leathery, cloth,
 * crystal, glassy, waxen, iron-bound**. Every one asserts a substance.
 *
 * What this buys is that material stays true, fixed, and **orthogonal**.
 * A wand *is* brass, honestly and permanently — which tells you real
 * things (it conducts, it will not burn) and tells you **nothing** about
 * which spell it holds. An item then carries two independent readable
 * facts instead of one mystery label.
 */

import { Document } from '../persistence/Document';
import type { FieldMeta } from '../mixin';

/** The two axes of one bank, resolved. */
export interface DescriptorAxes {
  /** Axis A — the primary distinguishing word (colour, ornament, …). */
  primary: string[];
  /** Axis B — the qualifier (clarity, proportion, marking, …). Empty for scrolls. */
  secondary: string[];
}

export class DescriptorBank extends Document {
  static collectionName = 'descriptor_banks';
  static fieldMeta: FieldMeta = {
    key: { persistent: true },
    primary: { persistent: true },
    secondary: { persistent: true },
    primaryAxis: { persistent: true },
    secondaryAxis: { persistent: true },
    unidentifiedLong: { persistent: true },
    unidentifiedDetails: { persistent: true },
  };

  /** Unique bank key — the item class (`potion`, `wand`, `ring`, …). */
  public key: string = '';

  /** Axis A words. */
  public primary: string[] = [];

  /** Axis B words. Empty for a single-axis bank (scrolls). */
  public secondary: string[] = [];

  /** What axis A *is*, for authors and the lint's error messages. */
  public primaryAxis: string = '';

  /** What axis B *is*. Empty for a single-axis bank. */
  public secondaryAxis: string = '';

  /**
   * **The long description an UNIDENTIFIED item of this class shows.**
   *
   * The authored `longDescription` on a template is written for the
   * identified item and routinely names what the thing does — which is
   * the leak the derived short name exists to prevent. So the class
   * owns the unidentified prose, exactly as it owns the descriptor
   * pool: an author never writes an unidentified variant, and a
   * careless one cannot give the answer away in the paragraph under a
   * name that withholds it.
   *
   * ⚠ **It must claim no material.** The lint proves the descriptor
   * *axes* disjoint from the materials vocabulary for parser reasons;
   * this prose is never parsed, so it escapes that check — but the
   * modelling reason still binds. A wand *is* brass or ash, truly and
   * per instance, and class-level prose that says "of pale ash" is
   * simply false on the brass one. Describe shape and workmanship;
   * material stays orthogonal and stays honest.
   *
   * Two tokens. `{descriptor}` interpolates this item's rendered
   * descriptor, so the paragraph agrees with the name above it; `{a}`
   * (or `{A}` sentence-initially) is **the article for that
   * descriptor**. ⚠ Never author the article yourself — half a bank's
   * words are vowel-initial, so a literal *a* is one draw away from
   * being a typo at all times. `{a}` runs the same `GrammarApi`
   * resolution the derived name does, so the two cannot disagree.
   * Empty = no generic prose,
   * and the item falls back to its authored long description (the
   * pre-existing behaviour, and still correct for a class whose long
   * description gives nothing away).
   */
  public unidentifiedLong: string = '';

  /**
   * **The examinable sub-parts an UNIDENTIFIED item of this class has**,
   * as `key → what you see`. The `unidentifiedLong` argument one layer
   * down, and the layer where it bites harder.
   *
   * A detail is authored for the identified item and *names the part by
   * what it does* — `sigil`, `scorch`, `focus-lens`. The key alone gives
   * the answer away before the text is even read, and the key is
   * **parsed**: `look at sigil on wand` either resolves or it doesn't,
   * and which one it does is a free identification oracle. So an
   * unidentified item presents this set and nothing else.
   *
   * ⚠ **The fallthrough goes the OTHER WAY from `unidentifiedLong`.**
   * Silence there falls back to the authored paragraph, because an item
   * with no description is broken. Silence *here* shows **nothing** —
   * an item with no examinable parts is an ordinary item, so hiding
   * costs nothing and leaking costs everything. Fail closed.
   *
   * Vision slot only. Details carry a per-sense slot map and nest, but
   * class-level parts are the generic case by construction: *a grip*,
   * *the seal*, *the binding*. An item that wants a smell on a part
   * wants that for the part it really has, which is the identified set.
   *
   * ⚠ Keys are **parser tokens** and land under the same disjointness
   * rule the descriptor axes do — `look at amber` cannot have two
   * answers. `lint:descriptors` checks them; it does not check the
   * prose, which is never parsed.
   */
  public unidentifiedDetails: Record<string, string> = {};

  /**
   * Cache of key → bank. Banks are immutable reference data; the first
   * resolve loads from the collection, thereafter the cache serves it.
   *
   * This matters more here than for name banks: appearance is resolved
   * on **every render of every unidentified item**, which is a much
   * hotter path than char-gen name suggestion.
   */
  static #cache: Map<string, DescriptorBank | null> = new Map();

  /** Drop the resolution cache (`PackApi.sync` after a write; tests). */
  static clearCache(): void {
    DescriptorBank.#cache.clear();
  }

  /** Resolve one bank by key (cached). `null` when unseeded. */
  static async byKey(key: string): Promise<DescriptorBank | null> {
    if (DescriptorBank.#cache.has(key)) {
      return DescriptorBank.#cache.get(key) ?? null;
    }
    const matches = await DescriptorBank.find({ key });
    const bank = matches[0] ?? null;
    DescriptorBank.#cache.set(key, bank);
    return bank;
  }

  /**
   * Seed the cache directly — the **sync** read path.
   *
   * Appearance renders inside sync code (`getPresentation`, the merge
   * ripple's `canMergeWith`), which cannot await a collection query. So
   * banks are warmed once at boot and read synchronously thereafter,
   * exactly as the spell catalogue is.
   */
  static primeCache(banks: readonly DescriptorBank[]): void {
    for (const bank of banks) DescriptorBank.#cache.set(bank.key, bank);
  }

  /** The cached bank for `key`, or `null` — sync, for render paths. */
  static cached(key: string): DescriptorBank | null {
    return DescriptorBank.#cache.get(key) ?? null;
  }

  /** This bank's two axes as plain word lists. */
  public getAxes(): DescriptorAxes {
    return { primary: this.primary, secondary: this.secondary };
  }

  /**
   * How many distinguishable descriptors this bank can produce — the
   * product of its axes, or just the primary for a single-axis bank.
   * What AC 25's depth check reads.
   */
  public getDepth(): number {
    const a = this.primary.length;
    const b = this.secondary.length;
    return b > 0 ? a * b : a;
  }
}
