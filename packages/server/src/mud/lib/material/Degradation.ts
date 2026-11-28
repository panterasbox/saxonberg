/**
 * DegradationMixin — *it BREAKS DOWN in its surroundings.*
 *
 * Which decay mechanisms attack this material and how hard: iron rusts,
 * oak rots and molds, linen fades, brick spalls. A mechanism key PRESENT
 * means the material suffers it — the legality test an authored decay state
 * is checked against (*iron does not rot*); `perYear` is the progress it
 * makes per game year at a driver of 1, and an absent `perYear` means the
 * mechanism can be authored but not derived. Corrosion names its `product`
 * (rust · verdigris · tarnish), the word `look` prints.
 *
 * A capability of a material, named for the substance's physics, never for
 * a process that reads it (material-decomposition D1). A consumer narrows
 * with `MixinApi.hasDegradation(m)` and never on a material's kind. Nothing
 * here reads a clock: the rate is folded over an authored history once, at
 * mint (decomposition D7).
 */

import type { FieldMeta, MixinConstructor } from "../mixin";
import type { Stuff } from "../stuff/Stuff";
import type Material from "./Material";
import {
  DecayMark,
  DecayScale,
  type DecayMarkRecord,
  type DecayMechanism,
} from "./DecayMark";

/** How one mechanism attacks this material. */
export interface DegradationSpec {
  /** Progress per game year at a driver of 1; absent = authored only. */
  perYear?: number;
  /** Corrosion's product, as `look` words it (`rust`). Required on corrosion. */
  product?: string;
}

/** Mechanism → how it attacks. A key present = the material suffers it. */
export type DegradationTable = Partial<Record<DecayMechanism, DegradationSpec>>;

export interface Degradation {
  getDegradation(): Readonly<DegradationTable>;
  setDegradation(value: DegradationTable | null): void;
  suffers(mechanism: DecayMechanism): boolean;
  productOf(mechanism: DecayMechanism): string | null;
  ratePerYear(mechanism: DecayMechanism): number | null;
  marksFrom(entry: unknown): DecayMarkRecord[];
}

export function DegradationMixin<TBase extends MixinConstructor<Stuff>>(
  Base: TBase,
) {
  return class DegradationMixin extends Base implements Degradation {
    static _mixinName = "DegradationMixin";

    static fieldMeta: FieldMeta = {
      // ⭐ `by-key`: a child row overrides ONE mechanism (charred oak's rot)
      // and keeps its parent's others. Spoiler 1 with the name visible: that
      // oak rots is open; how fast is the trade's to learn.
      degradation: {
        persistent: true,
        authorable: true,
        inherit: "by-key",
        spoiler: 1,
        spoilerName: 0,
      },
    };

    protected degradation: DegradationTable = {};

    public getDegradation(): Readonly<DegradationTable> {
      return this.degradation;
    }

    /**
     * Validating setter — refuses an unknown mechanism, a corrosion with no
     * `product`, and a `perYear` that is not a finite number ≥ 0.
     */
    public setDegradation(value: DegradationTable | null): void {
      if (value == null) {
        this.degradation = {};
        return;
      }
      if (typeof value !== "object" || Array.isArray(value)) {
        throw new TypeError(
          `degradation must be a map of mechanism → { perYear?, product? }`,
        );
      }
      const out: DegradationTable = {};
      for (const [key, raw] of Object.entries(value)) {
        const mechanism = new DecayScale(key).mechanism;
        const spec = (raw ?? {}) as DegradationSpec;
        if (typeof spec !== "object" || Array.isArray(spec)) {
          throw new TypeError(
            `degradation.${key} must be { perYear?, product? }`,
          );
        }
        const entry: DegradationSpec = {};
        if (spec.perYear !== undefined) {
          if (
            typeof spec.perYear !== "number" ||
            !Number.isFinite(spec.perYear) ||
            spec.perYear < 0
          ) {
            throw new RangeError(
              `degradation.${key}.perYear must be a number ≥ 0; got ${String(spec.perYear)}`,
            );
          }
          entry.perYear = spec.perYear;
        }
        if (spec.product !== undefined) {
          if (typeof spec.product !== "string" || spec.product.trim() === "") {
            throw new TypeError(`degradation.${key}.product must be a word`);
          }
          entry.product = spec.product.trim();
        }
        if (mechanism === "corrosion" && !entry.product) {
          throw new TypeError(
            `degradation.corrosion needs a product (rust, verdigris, tarnish)`,
          );
        }
        out[mechanism] = entry;
      }
      this.degradation = out;
    }

    /** Whether this material suffers `mechanism` at all. */
    public suffers(mechanism: DecayMechanism): boolean {
      return this.degradation[mechanism] !== undefined;
    }

    /** The material's word for what `mechanism` leaves on it (`rust`); `null` if none. */
    public productOf(mechanism: DecayMechanism): string | null {
      return this.degradation[mechanism]?.product ?? null;
    }

    /** Progress per game year at a driver of 1; `null` = not derivable on this material. */
    public ratePerYear(mechanism: DecayMechanism): number | null {
      return this.degradation[mechanism]?.perYear ?? null;
    }

    /**
     * ⭐ An authored decay state for a part of this material —
     * `{ corrosion: pitted, mold: spotted }` — as marks, or a throw naming
     * what is wrong: not a map, an unknown mechanism or band, or a
     * mechanism this material does not suffer (*iron does not rot*). The
     * legality is the MATERIAL's (decomposition D3, D6); the host decides
     * where the marks go.
     */
    public marksFrom(entry: unknown): DecayMarkRecord[] {
      if (entry === null || typeof entry !== "object" || Array.isArray(entry)) {
        throw new TypeError(
          "a decay state is a map of mechanism → band ({ corrosion: pitted })",
        );
      }
      // A capability of a material: its host IS one.
      const name = (this as unknown as Material).getName() || "this material";
      const out: DecayMarkRecord[] = [];
      for (const [mechanism, band] of Object.entries(entry)) {
        const scale = new DecayScale(mechanism);
        if (!this.suffers(scale.mechanism)) {
          throw new RangeError(`${name} does not suffer ${mechanism}`);
        }
        out.push(new DecayMark({ mechanism: scale.mechanism, band: String(band) as never }).record());
      }
      return out;
    }
  };
}
