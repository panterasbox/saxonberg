/**
 * Concentration — ⭐⭐ **the volume-weighted blend, once.**
 *
 * A concentration is *how much of something per litre of this matter*.
 * Two of them now ride {@link BulkPayload}: the dissolved toxin dose
 * (`lib/metabolism/DissolvedToxins`) and the dissolved aroma
 * (`lib/metabolism/DissolvedAromatics`). They model different things —
 * one routes to a body's burden at the ingest, the other to a nose — but
 * the arithmetic that mixes two of them is **byte-identical**, and it is
 * the load-bearing rule in both:
 *
 * > A type present on one side only is **diluted, not carried at
 * > strength.** Pouring 30 mL of 1000 mg/L foreshots into 720 mL of
 * > clean spirit leaves 40 mg/L, not 1000.
 *
 * ⭐ Why this is a promotion and not a copy. The repo's rule is *promote
 * at the third consumer*, and this build supplies the third **call
 * site** rather than merely the second field: the fold now runs on a
 * pour (`BulkableLogic.transfer` step 5), on a recipe's output
 * (`CraftingLogic.applyBulkOutput` — without which a vatting recipe
 * **launders** the dose: two bad bottles blended would read clean), and
 * on a grind (`MillController.fill`, which dropped the source sack's
 * payload outright). The promotion test is met on the arithmetic, not on
 * the field — so `DissolvedToxins.blend` becomes a forwarder and keeps
 * its own `labileAtK` reconciliation, while nothing in `lib/bulk` has to
 * learn what a toxin or an aroma IS.
 *
 * ⚠ This file imports nothing. It is the `Quantity`-shaped named
 * value-object category: the one concept the module defines, with the
 * arithmetic in statics. It must stay ignorant of both its consumers —
 * the moment it knows a toxin from an aroma, the `lib/bulk` →
 * `lib/metabolism` edge the payload decomposition removed is back.
 */

/**
 * The shape the fold needs and nothing more: a named substance and how
 * much of it per litre. Both consumers' tag types satisfy it
 * structurally, and each carries its own extra fields (`labileAtK` on a
 * toxin, nothing yet on an aroma) which the fold preserves without
 * naming them.
 */
export interface Concentrate {
  /** The substance. Unique within one set — the fold sums by it. */
  type: string;
  /** How much per litre. A tag at or below zero is not carried. */
  amount: number;
}

/**
 * @internal
 *
 * ⚠⚠ **Not author surface, and the ratchet was the thing that said so.**
 * Every caller is `lib/` or `platform/idea/api/` internals —
 * `DissolvedToxins`, `DissolvedAromatics`, `BulkableLogic.blendPayloads`,
 * `Fractionating`. Nothing outside those holds a `Concentration`, and the
 * author-reachable seam over this arithmetic is
 * {@link BulkableApi.blendPayloads}, which is an Api static and therefore
 * queryable where people actually look.
 *
 * ⭐ **Why `@internal` rather than a raised ceiling.** `lint:lib-statics`
 * exists because a static on a `lib/` class is in NEITHER of the two
 * places a person searches — public methods on Stuff/mixin classes, and
 * statics in the Api layer — so it is invisible by accident. The
 * projection does file it under a `value-static` kind, but that bucket is
 * a **catch-all** (`!isStaticApi && !isStuffMethod && mud/ && !sealed`),
 * not a judgement that the member is discoverable; leaning on it was
 * dressing a residual label up as visibility. `@internal` is the gate's
 * own sanctioned disposition: TypeDoc drops the class whole, so it is
 * invisible **because its author said so**, it is counted separately, and
 * the ceiling does not have to move.
 */
export class Concentration {
  /**
   * Volume-weighted blend of two concentration sets. `a` is the incoming
   * matter (`amountA` litres applied), `b` what the destination already
   * held (`amountB` litres). The result is a fresh set of fresh tags —
   * nothing aliases either input.
   *
   * Degrades correctly at the edges: a pour into an empty destination
   * (`amountB === 0`) carries `a` across at strength, and a total of zero
   * returns a copy of `a` rather than dividing by it.
   *
   * ⚠ **Fields other than `amount` are reconciled, never averaged.**
   * Where both sides name one type, the first answer wins and a later one
   * may only fill a gap. Those fields are physical constants of the
   * substance (a toxin's `labileAtK`, an aroma's threshold), so two sets
   * naming one type cannot honestly disagree — and averaging a constant
   * would be the kind of wrong answer that still looks like a number.
   */
  public static blend<T extends Concentrate>(
    a: readonly T[] | undefined,
    amountA: number,
    b: readonly T[] | undefined,
    amountB: number,
  ): T[] {
    const left = a ?? [];
    const right = b ?? [];
    const total = amountA + amountB;
    if (!(total > 0)) return left.map((t) => ({ ...t }));
    const byType = new Map<string, T>();
    const fold = (tags: readonly T[], litres: number): void => {
      for (const tag of tags) {
        if (!(tag.amount > 0)) continue;
        const existing = byType.get(tag.type);
        if (existing) {
          existing.amount += (tag.amount * litres) / total;
          // The reconcile, not an average — see the note above.
          for (const key of Object.keys(tag) as (keyof T)[]) {
            if (key === "type" || key === "amount") continue;
            if (existing[key] === undefined && tag[key] !== undefined) {
              existing[key] = tag[key];
            }
          }
        } else {
          byType.set(tag.type, {
            ...tag,
            amount: (tag.amount * litres) / total,
          });
        }
      }
    };
    fold(left, amountA);
    fold(right, amountB);
    const out: T[] = [];
    for (const tag of byType.values()) if (tag.amount > 0) out.push(tag);
    return out;
  }

  /** Whether a set carries any amount at all. */
  public static isClean(
    tags: readonly Concentrate[] | null | undefined,
  ): boolean {
    if (!tags) return true;
    for (const tag of tags) if (tag.amount > 0) return false;
    return true;
  }
}
