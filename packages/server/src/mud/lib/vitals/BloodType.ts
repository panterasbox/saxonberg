/**
 * BloodType — the ABO-shaped blood group as a value object (blood build
 * D2/D3).
 *
 * A phenotype-level type: a **blood system** plus an ABO phenotype (`A` ·
 * `B` · `AB` · `O`, plus `mixed` for a unit two different types were poured
 * into — compatible with nobody). The genotype→phenotype derivation and
 * the seeded birth roll live on `VitalsMixin` (a body's own business);
 * this object answers the two questions a transfusion asks: *may this go
 * into that body, and if not, how badly.*
 *
 * ⭐ **The system, not the species (D3).** Compatibility is a thing of the
 * blood, not of the taxon: a species declares (`Species.bloodGroups.
 * system`) which *blood system* it shares, and two bodies are ABO-comparable
 * iff their systems match — so a sapiens and a khazadicus who share the
 * `hominid` system can cross-transfuse, while two elves of the `fae` system
 * who mismatch ABO cannot. A species that declares no system is its own
 * system (its own path), which is the flat per-species behaviour every
 * unauthored species keeps. The field is called `system` for this reason;
 * it holds a species path only for the default (own-system) case.
 *
 * ⚠ **Instance methods only — no statics.** `lint:lib-statics` sits at
 * its ceiling with zero headroom, and a value class's statics are
 * invisible to the author-surface projection besides; the compatibility
 * rule is a thing a `BloodType` KNOWS about a recipient, so it is an
 * instance method (verbs-on-objects). Construction is the constructor.
 *
 * The ABO pattern is kept deliberately recognizable — it is a
 * transferable clinical judgment (the universal donor, the cross-match),
 * not a claim to teach hematology (requirements § pedagogy / D14). The
 * allele frequencies and which species carries them are pure fiction.
 */

/** The three ABO alleles an author may put in a species' frequency table. */
export type AboAllele = "A" | "B" | "O";

/** What a body (or a labelled unit) reads as. `mixed` is a spoiled label,
 * not a genotype — a unit two different types were combined into. */
export type AboPhenotype = "A" | "B" | "AB" | "O";
export type BloodTypeLabel = AboPhenotype | "mixed";

export class BloodType {
  constructor(
    /** The blood system this belongs to — a cross-system transfusion is
     * always a mismatch. Defaults to a species' own path when the species
     * declares no shared system (the flat per-species case). */
    public readonly system: string,
    /** The ABO phenotype, or `mixed` for a combined unit. */
    public readonly abo: BloodTypeLabel,
  ) {}

  /**
   * ⭐ May this blood go into `recipient` as a donor? Same blood system AND
   * the ABO rule: O→anyone, A→A/AB, B→B/AB, AB→AB. A `mixed` unit matches
   * nobody.
   */
  public isCompatibleDonorFor(recipient: BloodType): boolean {
    if (this.system !== recipient.system) return false;
    switch (this.abo) {
      case "O":
        return true;
      case "A":
        return recipient.abo === "A" || recipient.abo === "AB";
      case "B":
        return recipient.abo === "B" || recipient.abo === "AB";
      case "AB":
        return recipient.abo === "AB";
      default:
        return false; // mixed — compatible with nobody
    }
  }

  /**
   * The severity of giving this to `recipient`: `0` compatible, `1` an
   * ABO mismatch within the same blood system, `2` a cross-system mismatch
   * (the worst reaction). The transfusion reaction scales by this (D3).
   */
  public mismatchFor(recipient: BloodType): 0 | 1 | 2 {
    if (this.system !== recipient.system) return 2;
    return this.isCompatibleDonorFor(recipient) ? 0 : 1;
  }
}
