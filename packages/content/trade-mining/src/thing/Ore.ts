/**
 * Ore — a lump of ground with metal in it, and ⭐ **the one new field
 * this whole build adds to matter: `grade`.**
 *
 * `Material.composition` fixes what a KIND of ore is — malachite is
 * 57.48 % copper by mass, and that is chemistry, not a dial. But
 * `Material` is singleton-by-templatePath, so the thing that varies lump
 * to lump cannot live there. It lives here: a fraction, persistent,
 * authorable, and explicitly **not** `GradedMixin` (that is the
 * `poor…masterful` quality band, a different axis entirely).
 *
 * ## Pooling, and why the lie moves
 *
 * Ore is `Globbable`, and it keeps the shipped `canMergeWith` default —
 * **two lumps of one ore row pool regardless of grade**, which is
 * literally what happens in a cart. {@link Ore.onMerged} mass-weights the
 * average.
 *
 * ⚠ The formula is the **delta** form, and the shipped merge order is
 * why: `GlobbableLogic.merge` runs
 * `setQuantity(total)` → `destruct(absorbed)` → `onMerged(absorbed)`, so
 * by the time the hook fires the survivor's quantity is ALREADY the
 * total. With `Q` the new total and `a` the absorbed count:
 *
 *     grade = (grade × (Q − a) + absorbedGrade × a) / Q
 *
 * ⭐ This sharpens *"true weight, true grade"* rather than weakening it:
 * **the lie moves from physics to declaration.** Ore that pools cannot be
 * audited lump by lump, so high-grading — pocketing the rich pieces
 * before the lot is weighed — is a real theft that works *because* ore
 * pools. Stage A ships the pooling and the honest assay; high-grading as
 * an OFFENCE wants an adjudicator, and that is Stage B.
 */

import Thing from '@saxonberg/server/mud/lib/stuff/Thing';
import { GlobbableMixin } from '@saxonberg/server/mud/lib/stuff/Globbable';
import type Material from '@saxonberg/server/mud/lib/material/Material';
import type { FieldMeta } from '@saxonberg/server/mud/lib/mixin';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';

// `Thing` already carries Tangible (the material) and Chattel (the
// per-instance owner a cut lump needs from the face to the scale).
const OreBase = GlobbableMixin(Thing);

export default class Ore extends OreBase {
  static fieldMeta: FieldMeta = {
    // ⭐ Level-1 spoiler: the grade is what an assay EARNS. A wiki page
    // should not hand out the number the scale is for.
    grade: { persistent: true, authorable: true, spoiler: 1, spoilerName: 0 },
    gangueMaterialPath: { persistent: true, authorable: true },
  };

  /** Ore fraction by mass, 0–1. What the smelt's yield is arithmetic on. */
  protected grade: number = 0;

  /** What comes up with it and is worth nothing. */
  protected gangueMaterialPath: string | null = null;

  /**
   * The lot this stack is about to absorb, captured in `canMergeWith`
   * because `onMerged` fires after the absorbed stack is destructed.
   * Transient by construction — never persisted, never read twice.
   *
   * TypeScript `private` rather than `#`: every Stuff dispatches through
   * the call-security proxy, and a `#` slot is unreachable from `this`
   * inside a method called through it.
   */
  private _absorbing: { stuffId: string; quantity: number; grade: number } | null = null;

  public getGrade(): number { return this.grade; }
  public setGrade(value: number): void {
    this.grade = value < 0 ? 0 : value > 1 ? 1 : value;
  }

  public getGangueMaterialPath(): string | null { return this.gangueMaterialPath; }
  public setGangueMaterialPath(value: string | null): void {
    this.gangueMaterialPath = value ?? null;
  }

  /**
   * The metal fraction of this lump by mass — ⭐ **chemistry times
   * grade**, and nothing else. The ore mineral's own `composition` says
   * what fraction of the mineral is metal (two Cu in a 221.114 g/mol
   * formula unit is 0.5748); the lump's grade says what fraction of the
   * lump is that mineral. Nobody authors "how much copper comes out".
   *
   * Returns `0` when the material is not resident or names no metal —
   * an honest zero, and a smelt of it fails visibly rather than
   * inventing metal.
   */
  public metalFractionOf(metalPath: string): number {
    const material = this.getMaterial() as Material | null;
    if (!material) return 0;
    const entry = material
      .getComposition()
      .find((c) => c.materialPath === metalPath);
    return (entry?.fraction ?? 0) * this.grade;
  }

  /**
   * Mass-weight the grade as two lots pool. See the class docstring for
   * why this is the delta form and not the textbook one.
   */
  public override onMerged(absorbed: Stuff): void {
    const stashed = this._absorbing;
    this._absorbing = null;
    const total = this.getQuantity();
    if (
      stashed !== null &&
      stashed.stuffId === absorbed.stuffId &&
      total > 0 &&
      stashed.quantity > 0 &&
      stashed.quantity <= total
    ) {
      this.setGrade(
        (this.grade * (total - stashed.quantity) + stashed.grade * stashed.quantity) / total,
      );
    }
    super.onMerged(absorbed);
  }

  /**
   * ⭐ **A sample off a pooled lot assays as the lot.** The split-off is
   * a fresh clone of the ore ROW, so it starts at the row's authored
   * grade — which is zero — and would silently make cutting a sample a
   * way to destroy value. Carrying the grade across is what makes
   * *"assay is per-lot"* mean anything: you can take a sample to the
   * scale and learn about the pile it came from.
   */
  public override onSplit(splitoff: Stuff): void {
    const cut = splitoff as unknown as Ore;
    if (typeof cut.setGrade === 'function') cut.setGrade(this.grade);
    if (typeof cut.setGangueMaterialPath === 'function') {
      cut.setGangueMaterialPath(this.gangueMaterialPath);
    }
    super.onSplit(splitoff);
  }

  /**
   * ⚠⚠ **The absorbed lot is read HERE, before it is destructed**, and
   * that is not a stylistic choice.
   *
   * `GlobbableLogic.merge` runs, in order:
   * `canMergeWith` → `setQuantity(total)` → `destruct(absorbed)` →
   * `onMerged(absorbed)`. A destructed Stuff's accessors return
   * `undefined` — verified by test, because the plan flagged it as the
   * one genuine unknown — so by the time the hook fires there is nothing
   * left to weight the average WITH. The pre-hook is the only place the
   * two figures still exist.
   *
   * The stash is keyed on the candidate's `stuffId` and cleared on use,
   * so a speculative `GlobbableApi.canMerge` probe that never proceeds
   * to a merge cannot leak into the next real one.
   */
  public override canMergeWith(other: Stuff): boolean {
    const ok = super.canMergeWith(other);
    const lot = other as unknown as Ore;
    this._absorbing =
      ok && typeof lot.getGrade === 'function' && typeof lot.getQuantity === 'function'
        ? { stuffId: other.stuffId, quantity: lot.getQuantity(), grade: lot.getGrade() }
        : null;
    return ok;
  }
}
