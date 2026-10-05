/**
 * DissolvedToxins — ⭐⭐ **a dose that is a CONCENTRATION, and therefore
 * blends.**
 *
 * The metabolism subsystem already carries two toxin shapes and neither
 * one can say what a badly-cut spirit is:
 *
 *   - **`Material.toxicity`** is per-serving and per *substance* — every
 *     bottle of whiskey ever is equally alcoholic, because that is what
 *     whiskey IS. It cannot differ per instance.
 *   - **`BulkPayload.formedToxins`** is per-instance but still
 *     **per-serving** and it never blends (`BlendLabel`'s comment says
 *     so: a ptomaine dose is a dose, and tipping a spoiled pot into a
 *     clean one must not divide it).
 *
 * A cut's methanol is neither. It is **mg per litre of what is in the
 * vessel** — a fact about this matter, which halves when you dilute it
 * with twice as much clean spirit and doubles the harm when you drink
 * twice as much. So it blends by volume on every pour, exactly as the
 * microbial load and the water state do, and for the same reason: a dose
 * that did not blend would make decanting a laundry.
 *
 * ⭐ The two scaling rules are the whole distinction, and both are at
 * `routeIntake`:
 *
 *   - a **formed** or **authored** tag contributes `amount` once per
 *     ingest (one serving, however big the sip);
 *   - a **dissolved** tag contributes `amount × litres`, because a
 *     concentration times a volume is a dose.
 *
 * ⚠ `labileAtK` means what it means everywhere else — the working
 * destroys the dose above that temperature — and is compared against the
 * payload's `cookedAtK` at the read, never at the blend. Methanol
 * authors none (distilling it is how it got there).
 *
 * The class is the {@link Freshness} / {@link Contamination} shape: the
 * arithmetic in statics, the reads and writes of one slot's payload on an
 * instance bound to that slot. See `docs/subsystems/fractionation.md` for
 * who puts the concentration there.
 */

import type { BulkPayload, BulkSlot } from '../bulk/Bulkable';
import type { ToxinTag } from './Metabolic';

/**
 * ⭐ Metabolism's second field on the blend payload, declared from the
 * subsystem that owns the word — the `formedToxins` move (`BlendLabel`),
 * for the same reason: a `BulkPayload` cannot compose a mixin, and
 * `lib/bulk` must not learn what a toxin is.
 */
declare module '../bulk/Bulkable' {
  interface BulkPayload {
    /**
     * Toxin doses **per litre** of this matter. Blend by volume on every
     * pour; scale by litres consumed at the ingest. Absent on matter
     * nothing concentrated — which is every payload that existed before
     * the cut.
     */
    dissolvedToxins?: ToxinTag[];
  }
}

export class DissolvedToxins {
  /** A gauge bound to the slot whose matter it measures. */
  constructor(private readonly slot: BulkSlot) {}

  /**
   * Volume-weighted blend of two concentration sets — the pour. `a` is
   * the incoming matter (`amountA` litres applied), `b` what the
   * destination already held (`amountB` litres).
   *
   * ⚠ A type present on one side only is **diluted, not carried at
   * strength**: pouring 30 mL of 1000 mg/L foreshots into 720 mL of
   * clean spirit leaves 40 mg/L, not 1000. That arithmetic is the
   * anti-laundering rule read the other way round, and it is why the
   * cut is a skill rather than a ceremony.
   */
  public static blend(
    a: readonly ToxinTag[] | undefined,
    amountA: number,
    b: readonly ToxinTag[] | undefined,
    amountB: number,
  ): ToxinTag[] {
    const left = a ?? [];
    const right = b ?? [];
    const total = amountA + amountB;
    if (!(total > 0)) return left.map((t) => ({ ...t }));
    const byType = new Map<string, ToxinTag>();
    const fold = (tags: readonly ToxinTag[], litres: number): void => {
      for (const tag of tags) {
        if (!(tag.amount > 0)) continue;
        const existing = byType.get(tag.type);
        if (existing) {
          existing.amount += (tag.amount * litres) / total;
          // Lability is a fact about the SUBSTANCE, so two sets naming
          // one type cannot honestly disagree. Keep the first answer and
          // let a later one fill a gap rather than averaging a physical
          // constant.
          if (existing.labileAtK === undefined && tag.labileAtK !== undefined) {
            existing.labileAtK = tag.labileAtK;
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
    const out: ToxinTag[] = [];
    for (const tag of byType.values()) if (tag.amount > 0) out.push(tag);
    return out;
  }

  /** Whether a set carries any dose at all. */
  public static isClean(tags: readonly ToxinTag[] | null | undefined): boolean {
    if (!tags) return true;
    for (const tag of tags) if (tag.amount > 0) return false;
    return true;
  }

  /**
   * The doses the working's heat did NOT destroy, per litre — the read
   * every consumer wants. `heatK` is the payload's `cookedAtK`.
   */
  public static surviving(
    tags: readonly ToxinTag[] | undefined,
    heatK: number,
  ): ToxinTag[] {
    const out: ToxinTag[] = [];
    for (const tag of tags ?? []) {
      if (!(tag.amount > 0)) continue;
      if (tag.labileAtK !== undefined && tag.labileAtK <= heatK) continue;
      out.push({ ...tag });
    }
    return out;
  }

  /** This slot's concentrations, heat-filtered. `[]` when there are none. */
  tags(): ToxinTag[] {
    const payload = this.slot.getPayload();
    if (!payload) return [];
    return DissolvedToxins.surviving(
      payload.dissolvedToxins,
      payload.cookedAtK ?? 0,
    );
  }

  /** This slot's raw concentrations, unfiltered — the blend's own read. */
  raw(): readonly ToxinTag[] {
    return this.slot.getPayload()?.dissolvedToxins ?? [];
  }

  /**
   * Stamp the set outright — the pour's blend, and the draw that puts a
   * fraction's dose there in the first place. An empty set removes the
   * field rather than storing `[]`, so a payload nobody poisoned stays
   * byte-identical to one from before this existed.
   */
  stamp(tags: readonly ToxinTag[]): void {
    if (this.slot.getMaterial() === null) return;
    const payload: BulkPayload = this.slot.getPayload() ?? {};
    if (DissolvedToxins.isClean(tags)) {
      if (payload.dissolvedToxins === undefined) return;
      const { dissolvedToxins: _d, ...rest } = payload;
      this.slot.setPayload(rest);
      return;
    }
    this.slot.setPayload({
      ...payload,
      dissolvedToxins: tags.map((t) => ({ ...t })),
    });
  }
}
