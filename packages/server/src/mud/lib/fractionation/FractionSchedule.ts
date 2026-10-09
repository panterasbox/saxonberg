/**
 * FractionSchedule — ⭐⭐ **what comes off a batch, in what order, as it is
 * drawn.**
 *
 * A pot of wash under a fire does not give up one liquid. It gives up a
 * sequence of them: the first drops are the poisonous ones, then the
 * harsh ones, then the good ones, then the dull ones, and what is left in
 * the pot is not a spirit at all. Nothing in the engine could say that.
 * `MaturingMixin` can say *this batch becomes that material after so many
 * days*, which is a different shape in three ways — it is one output, it
 * is driven by a clock, and it is about the whole batch at once.
 *
 * ⭐ **The clock here is the VOLUME DRAWN**, not time. A still that nobody
 * is pouring from is not making progress; the run advances because you
 * took something out of it, which is also why the skill is *where you
 * stop* rather than *when you look*. That makes the mechanism the lees
 * split's shape (amount-triggered, `maturation.md` § *the rack floor*)
 * generalised from one boundary to many.
 *
 * ## One material, many payloads
 *
 * ⚠⚠ The fractions do **not** differ by `Material`, and that is forced
 * rather than chosen: `BulkableApi.transfer` declines a cross-material
 * pour, so fractions that were different materials could never be
 * recombined — and recombining them (the heads back into the next
 * charge, the hearts into one cask) is most of what a distiller does. So
 * a schedule names ONE `productMaterial` and the fractions differ by what
 * rides on the payload: the dose (`toxins`), the quality (`gradeBand`)
 * and the prose (`character`). One `residueMaterial` names what is left
 * in the pot once the last fraction is drawn — the lees-style swap.
 *
 * ## Rows, not code
 *
 * Reference data in the {@link MaturationProfile} shape: a singleton Idea
 * per row under any root's `idea/fractionation/` subtree, warmed by
 * `FractionScheduleCatalogue`, matched to a charge by the charge
 * material's TAGS against `inputCategory`. A second feedstock — a
 * rectification, a wine for brandy, a crude oil — is rows and more
 * boundaries, with nothing in `lib/` to change. Nothing in this file says
 * the word whiskey.
 *
 * See `docs/subsystems/fractionation.md`.
 */

import { Idea } from '../stuff/Idea';
import { SingletonMixin } from '../stuff/Singleton';
import { StuffApi } from '../../api/stuff';
import type Material from '../material/Material';
import type { ToxinTag } from '../metabolism/Metabolic';
import { Grade } from '../craft/Grade';
import type { FieldMeta } from '../mixin';
import type { VetoResult } from '../errors';
import type { EvictionContext } from '../stuff/Stuff';

/**
 * One fraction of a run — a span of the charge, and what comes off over
 * it.
 */
export interface FractionSpec {
  /** Stable key, unique within the schedule (`foreshots`, `hearts`). */
  key: string;
  /**
   * The cumulative fraction of the ORIGINAL charge at which this
   * fraction ENDS, in `(0, 1]`. Strictly ascending across the schedule.
   * The last one's complement is the residue.
   */
  upTo: number;
  /**
   * ⭐ Authored prose — what a nose or a tongue reports while this is
   * what is coming off. ⚠ **No digit may appear in it** (the
   * requirements are explicit): the read is a character, not a gauge,
   * and the moment it carries a number the cut stops being a judgement.
   */
  character: string;
  /** The grade band matter drawn over this span carries. */
  gradeBand: string;
  /**
   * Toxin doses **per litre** of what comes off here, stamped onto the
   * drawn payload as `dissolvedToxins`. Absent ⇒ clean.
   */
  toxins?: ToxinTag[];
  /**
   * Heat (K) the host must reach before this fraction will come off at
   * all. Absent ⇒ the schedule's own `requiresHeatK` is the only gate.
   * ⭐ This is the seam a refinery column needs and a pot still does
   * not: naphtha comes over at 350 K and gas oil does not.
   */
  requiresHeatK?: number;
  /**
   * ⭐⭐ **How strongly this fraction carries the CHARGE's aromatics** — a
   * multiplier on each `dissolvedAromatics` concentration in the thing
   * being distilled. Absent ⇒ 1, which is "comes over unchanged" and is
   * what every schedule did before this existed.
   *
   * ⭐ This is the seam that makes the whole product a product rather
   * than a chemistry demo. Phenols are **high-boiling**: a peated wash
   * comes over clean through the foreshots (`0`) and turns, late, as the
   * hearts run on (`2.5`), with most of what is left in the tails (`6`).
   * So a peated wash and a clean one **do not want the same cut** — take
   * the hearts short and you have thrown away the character you spent a
   * day of turf on; run them long to keep it and you are taking tails
   * into the spirit. A decision at the malting rung changes the right
   * answer at the cut, which is the real reason a heavily peated house
   * cuts lower than a clean one.
   *
   * ⚠ There is no mass-balance enforcement across the schedule, and
   * there should not be: a still is not a closed accounting system to
   * the author, and the residue in the stillage is where the remainder
   * goes. The shipped wash figures put roughly 70 % of the charge's
   * phenol over and leave 30 % behind, which is about right.
   */
  aromaticCarry?: number;
  /**
   * ⭐⭐⭐ **What this fraction IS** — a `Material` path, in a schedule
   * whose `separation` is `'fractions'`. Absent in `'cuts'` mode, and
   * required in `'fractions'` mode.
   *
   * This is the one field that makes a refinery a different machine from
   * a still, and the difference is not a matter of degree:
   *
   *  - A **pot still** separates one substance into GRADES of itself.
   *    Foreshots, hearts and tails are all new-make spirit; they differ
   *    in character and in what they will poison you with, and the
   *    distiller's whole art is **deciding where to cut** and then
   *    blending what they kept. One `productMaterial`, several qualities
   *    of it, and recombining them is legitimate.
   *  - A **refinery column** separates one substance into DIFFERENT
   *    SUBSTANCES. Gasoline is not a grade of kerosene and no amount of
   *    blending makes it one; you cannot distil crude and choose not to
   *    make the light ends, and you cannot pour the light ends back in
   *    and have crude again.
   *
   * ⚠ Which is why `getBulkAvailable` **clamps at the boundary** in this
   * mode: the column will not hand you gasoline and kerosene in one
   * cask. You draw until the character changes and you change casks,
   * which is what *joint production* means at the tap.
   */
  material?: string;
}

/**
 * ⭐⭐⭐ **What KIND of separation a schedule performs**, and the one
 * thing that decides whether its fractions recombine.
 *
 * `'cuts'` — grades of one substance (a pot still). The default, so
 * every schedule authored before this existed is byte-identical.
 *
 * `'fractions'` — distinct substances (a refinery column). Each spec
 * names its own `material` and the schedule's `productMaterial` must be
 * empty, because there is no such thing as *the* product.
 *
 * ⚠ A TypeScript string union rather than an exported array with a
 * membership test, deliberately: `lint:closed-vocabularies` sits at its
 * ceiling of 5 and the compiler is already the gate here.
 */
export type Separation = 'cuts' | 'fractions';

export default class FractionSchedule extends SingletonMixin(Idea) {
  /** Stable key — what a host records to re-find its schedule. */
  public key = '';
  /**
   * The TAG the charge material must carry for this schedule to match
   * (the recipe-slot `category` convention).
   *
   * ⚠ A material tag can only belong to ONE matcher of a given kind: a
   * `MaturationProfile` whose `inputCategory` is also this tag would
   * re-key every vessel that so much as receives the charge.
   */
  public inputCategory = '';
  /**
   * ⭐⭐ What kind of separation this is — grades of one substance, or
   * distinct substances. See {@link Separation}. Default `'cuts'`, so
   * every shipped row is unchanged.
   */
  public separation: Separation = 'cuts';
  /** The Discipline the draw credits. `''` = none. */
  public discipline = '';
  /**
   * Heat (K) the host must reach for the run to start at all. `0` = the
   * run starts the moment the charge lands (a settling tank, a column
   * that is already hot).
   */
  public requiresHeatK = 0;
  /** Template path of the material every fraction is made of. */
  public productMaterial = '';
  /** Template path of what is left in the pot after the last fraction. */
  public residueMaterial = '';
  /**
   * ⭐⭐ **How late an unskilled nose notices a boundary**, as a fraction
   * of the charge — the whole of the competence model here. The read is
   * blurred by `readBlur × blurForBand`, so an untrained distiller is
   * told what WAS coming off a while ago and therefore keeps some heads
   * and some tails. Nothing is gated: the untrained can draw every drop.
   */
  public readBlur = 0.02;
  /**
   * ⭐ How much the toxic head of the run GROWS per grade band below
   * `masterful`, as a fraction of the charge. A poor wash really does
   * carry more of what you must throw away, and this is the reason the
   * hearts are not a litre count anyone can memorise: the boundaries
   * move with the charge. Seeded from the charge's grade, never drawn.
   */
  public gradeStretch = 0;
  /** The ordered fractions. Validated on set. */
  public fractions: FractionSpec[] = [];

  static fieldMeta: FieldMeta = {
    key: { persistent: true, authorable: true },
    inputCategory: { persistent: true, authorable: true },
    separation: { persistent: true, authorable: true },
    discipline: { persistent: true, authorable: true },
    requiresHeatK: { persistent: true, authorable: true },
    productMaterial: { persistent: true, authorable: true },
    residueMaterial: { persistent: true, authorable: true },
    readBlur: { persistent: true, authorable: true },
    gradeStretch: { persistent: true, authorable: true },
    fractions: { persistent: true, authorable: true },
  };

  /** Residency veto — reference data; a culled row matches nothing. */
  public canEvict(_context: EvictionContext): VetoResult {
    return { ok: false, reason: 'reference row; never culled' };
  }

  public canDestruct(): VetoResult {
    return {
      ok: false,
      reason: 'FractionSchedule is reference data; never destructed',
    };
  }

  // ── the inter-Stuff contract (methods, never fields) ──

  getKey(): string {
    return this.key;
  }
  setKey(value: string): void {
    if (!value || value.trim().length === 0) {
      throw new RangeError('FractionSchedule.setKey: key must be non-empty');
    }
    this.key = value;
  }

  getInputCategory(): string {
    return this.inputCategory;
  }
  setInputCategory(value: string): void {
    if (!value || value.trim().length === 0) {
      throw new RangeError(
        'FractionSchedule.setInputCategory: category must be non-empty',
      );
    }
    this.inputCategory = value;
  }

  getDiscipline(): string {
    return this.discipline;
  }
  setDiscipline(value: string): void {
    this.discipline = value;
  }

  getRequiresHeatK(): number {
    return this.requiresHeatK;
  }
  setRequiresHeatK(value: number): void {
    if (!Number.isFinite(value) || value < 0) {
      throw new RangeError(
        `FractionSchedule.setRequiresHeatK: must be a non-negative Kelvin ` +
          `figure, got ${value}`,
      );
    }
    this.requiresHeatK = value;
  }

  getProductMaterial(): string {
    return this.productMaterial;
  }
  setProductMaterial(value: string): void {
    if (!value || value.trim().length === 0) {
      throw new RangeError(
        'FractionSchedule.setProductMaterial: must name a material path',
      );
    }
    this.productMaterial = value;
  }

  /** What kind of separation this schedule performs. See {@link Separation}. */
  getSeparation(): Separation {
    return this.separation;
  }

  /** Declare the separation kind (the row's `separation:`). */
  setSeparation(value: Separation): void {
    this.separation = value === 'fractions' ? 'fractions' : 'cuts';
  }

  getResidueMaterial(): string {
    return this.residueMaterial;
  }
  setResidueMaterial(value: string): void {
    this.residueMaterial = value;
  }

  getReadBlur(): number {
    return this.readBlur;
  }
  setReadBlur(value: number): void {
    if (!Number.isFinite(value) || value < 0 || value > 1) {
      throw new RangeError(
        `FractionSchedule.setReadBlur: must be a fraction in [0, 1], got ${value}`,
      );
    }
    this.readBlur = value;
  }

  getGradeStretch(): number {
    return this.gradeStretch;
  }
  setGradeStretch(value: number): void {
    if (!Number.isFinite(value) || value < 0 || value > 1) {
      throw new RangeError(
        `FractionSchedule.setGradeStretch: must be a fraction in [0, 1], ` +
          `got ${value}`,
      );
    }
    this.gradeStretch = value;
  }

  getFractions(): readonly FractionSpec[] {
    return this.fractions;
  }

  /**
   * ⚠ **Validated here and nowhere else.** A schedule whose boundaries
   * are out of order, whose bands are words the grade vocabulary has
   * never heard, or whose last fraction claims the whole charge (leaving
   * no residue) would fail at the draw — silently, as a run that gives
   * the wrong thing. An authoring error must arrive at the row.
   */
  setFractions(value: FractionSpec[]): void {
    if (!Array.isArray(value) || value.length === 0) {
      throw new RangeError(
        'FractionSchedule.setFractions: a schedule with no fractions yields ' +
          'nothing',
      );
    }
    let previous = 0;
    const keys = new Set<string>();
    for (const spec of value) {
      if (!spec.key || spec.key.trim().length === 0) {
        throw new RangeError(
          'FractionSchedule.setFractions: every fraction needs a key',
        );
      }
      if (keys.has(spec.key)) {
        throw new RangeError(
          `FractionSchedule.setFractions: duplicate fraction key '${spec.key}'`,
        );
      }
      keys.add(spec.key);
      if (
        !Number.isFinite(spec.upTo) ||
        spec.upTo <= previous ||
        spec.upTo > 1
      ) {
        throw new RangeError(
          `FractionSchedule.setFractions: '${spec.key}' upTo must be strictly ` +
            `ascending within (0, 1]; got ${spec.upTo} after ${previous}`,
        );
      }
      previous = spec.upTo;
      if (!Grade.isBand(spec.gradeBand)) {
        throw new RangeError(
          `FractionSchedule.setFractions: '${spec.key}' gradeBand ` +
            `'${spec.gradeBand}' is not a grade band`,
        );
      }
      if (!spec.character || spec.character.trim().length === 0) {
        throw new RangeError(
          `FractionSchedule.setFractions: '${spec.key}' needs a character — ` +
            `the read is prose, and a fraction nobody can smell is a number`,
        );
      }
      if (
        spec.aromaticCarry !== undefined &&
        (!Number.isFinite(spec.aromaticCarry) || spec.aromaticCarry < 0)
      ) {
        throw new RangeError(
          `FractionSchedule.setFractions: '${spec.key}' aromaticCarry ` +
            `must be a finite number at or above zero; got ` +
            `${String(spec.aromaticCarry)}`,
        );
      }
      if (/\d/.test(spec.character)) {
        throw new RangeError(
          `FractionSchedule.setFractions: '${spec.key}' character carries a ` +
            `digit; the cut is a judgement, not a gauge`,
        );
      }
    }
    if (previous >= 1) {
      throw new RangeError(
        'FractionSchedule.setFractions: the last fraction must leave a ' +
          'residue — a pot that gives up everything it holds is not a still',
      );
    }
    this.fractions = value.map((s) => ({ ...s }));
  }

  /**
   * ⚠⚠ **There is deliberately no runtime check that `separation` and
   * the spans' `material`s agree, and the reason is worth keeping.**
   *
   * They are ONE claim and a row that gets it half right is the
   * dangerous case — a `'fractions'` row missing one `material` would
   * hand that span out as `productMaterial`, which in a refinery means a
   * cask labelled kerosene full of gasoline, at the completion of a
   * pour, with nobody watching.
   *
   * It lives in **`pnpm lint:fraction-schedules`**, and it got there by
   * elimination:
   *
   *  - `setFractions` cannot hold it. `separation` and `fractions` are
   *    two authored keys and the `TemplateApplier` dispatches a row's
   *    `data:` keys in the order the row lists them, so a setter check
   *    reads whatever `separation` was at that moment — a perfectly good
   *    column would throw and **reordering the YAML would fix it.**
   *  - `onCreate` is the convention's home for a cross-field rule, and
   *    `lint:on-create` refused it: that hook is a RATCHET (*the ceiling
   *    may fall, never rise*) whose own complaint is that it *collects
   *    work that belongs elsewhere.* The audit agreed.
   *
   * ⭐ And the gate is the better home on the merits. This is an
   * AUTHORING rule: it cannot be fixed by a player, it cannot vary at
   * run time, and the person who needs to hear about it is reading a
   * YAML file right now. Build time, named by file.
   */

  /**
   * ⭐ What a draw over this span actually IS, by separation kind: the
   * span's own material in a column, the schedule's one product in a
   * still. The single place the distinction is read, so no consumer has
   * to know which kind of machine it is looking at.
   */
  materialFor(spec: FractionSpec): string {
    return this.separation === 'fractions'
      ? (spec.material ?? '')
      : this.productMaterial;
  }

  /** Cumulative fraction of the charge that is residue. */
  getResidueFraction(): number {
    const last = this.fractions[this.fractions.length - 1];
    return last ? Math.max(0, 1 - last.upTo) : 1;
  }

  /**
   * The fraction coming off at cumulative drawn-fraction `at`, or `null`
   * past the last one (the residue).
   */
  fractionAt(at: number): FractionSpec | null {
    for (const spec of this.fractions) {
      if (at < spec.upTo) return spec;
    }
    return null;
  }

  /**
   * ⚠ Private: the whole-table read is an internal walk, never author
   * surface (`lint:whole-table`). Callers ask a question
   * ({@link byKey}, {@link forMaterial}), never for the roster.
   */
  private static all(): FractionSchedule[] {
    return StuffApi.findByPathGlob<FractionSchedule>(
      '/**/idea/fractionation/**',
    )
      .filter((s): s is FractionSchedule => s instanceof FractionSchedule)
      .sort((a, b) => a.getKey().localeCompare(b.getKey()));
  }

  /** The live schedule with `key`, or `null`. */
  static byKey(key: string): FractionSchedule | null {
    if (!key) return null;
    return FractionSchedule.all().find((s) => s.getKey() === key) ?? null;
  }

  /**
   * The schedule matching `material` — by the charge's TAGS against each
   * schedule's `inputCategory`. Two matches is an AUTHORING error,
   * surfaced as a warning and resolved deterministically (lowest key
   * wins) — never a roll. `null` ⇒ the host holds matter it cannot run,
   * which is the correct answer for a still full of water.
   */
  static forMaterial(material: Material): FractionSchedule | null {
    const matches = FractionSchedule.all().filter((s) => {
      const category = s.getInputCategory();
      return category.length > 0 && material.hasTag(category);
    });
    if (matches.length > 1) {
      console.warn(
        `FractionSchedule.forMaterial: material '${material.getTemplatePath()}' ` +
          `matches ${matches.length} schedules ` +
          `(${matches.map((s) => s.getKey()).join(', ')}) — authoring error; ` +
          `using '${matches[0]!.getKey()}'`,
      );
    }
    return matches[0] ?? null;
  }
}
