/**
 * FractionatingMixin — ⭐⭐ **a host whose interior is not one liquid.**
 *
 * It yields in ordered fractions as it is drawn, under a
 * {@link FractionSchedule} matched to its charge. Composing it claims
 * exactly that, and nothing else: a pot still, a rectifying column, a
 * refinery tower. A vat does not fractionate (its lees are one boundary
 * and a material swap, which `MaturingMixin` already says), and a bottle
 * pours what it holds.
 *
 * ## The run is driven by the DRAW, not by a clock
 *
 * There is no time integral here, deliberately. A charged still that
 * nobody pours from makes no progress — which is the whole reason the
 * skill is *where you stop* rather than *when you look*, and the reason
 * this is not a `MaturationProfile` with extra fields. The state machine
 * is four words:
 *
 *   - **idle** — nothing in it, or matter no schedule matches (water).
 *   - **charged** — the charge is in, the heat is not. ⭐ A cold charge
 *     pours straight back out *as what it is*: nothing refuses it, and
 *     nothing has happened to it.
 *   - **running** — the heat arrived, the interior material swapped to
 *     the schedule's product, and every draw now advances `drawnL`.
 *   - **spent** — the last fraction is gone and what remains is the
 *     residue material (the lees-style swap).
 *
 * ## What a draw carries
 *
 * `getBulkPayloadForDraw(affordance, litres)` is the seam this mixin
 * exists to override. It answers with the **span** `[drawnL, drawnL + l]`
 * blended by volume: the dose (`dissolvedToxins`), the grade (the worst
 * band in the span — weakest-link, because a pour that caught the tails
 * is a pour with tails in it) and the maker. ⚠ Without the litres a
 * single pour started at the first drop would be stamped wholly as its
 * first fraction: three quarters of a litre of foreshots instead of the
 * honest thirty millilitres of them.
 *
 * ## The read is BLURRED — and the blur is optimistic
 *
 * ⭐⭐ `readFraction(viewer)` reports the **best-graded** fraction within
 * `readBlur × blurForBand(band)` of where the run actually is. At
 * `expert` the window is zero and the read is exact; at `untrained` it is
 * wide and the nose hears what it wants to hear.
 *
 * ⚠⚠ **It was a LAG for an afternoon, and a lag is the wrong error.** The
 * plan reasoned that a late nose *"keeps some heads and some tails"*, and
 * the world test showed the first half is impossible: you start
 * collecting when you believe the hearts have begun, so a nose that
 * notices boundaries late starts collecting late and throws good spirit
 * away. It loses yield and makes a *cleaner* bottle, which teaches the
 * opposite of the lesson.
 *
 * ⭐ An optimistic window produces exactly the two errors the
 * requirements name, and from one sentence rather than two rules: the
 * untrained distiller believes the hearts have started while the heads
 * are still coming over, and believes they are still running after the
 * tails begin. Both errors enlarge the cut, both make it worse, and that
 * is also the true pressure on a real novice — yield feels like money.
 *
 * Competence resolves DETAIL and never ACCESS. The untrained distiller
 * can draw every drop in the pot; the refusal they get is from the fire,
 * not from their transcript.
 *
 * ⚠ **And nothing announces a boundary.** No note, no scene line, no
 * push. The character changes on the next `smell` and that is the whole
 * signal; a message would turn a judgement into a prompt.
 *
 * See `docs/subsystems/fractionation.md`.
 */

import type { MixinConstructor, FieldMeta } from '../mixin';
import { Mixins } from '../mixin';
import type { AnyConstructor } from '../../api/mixin';
import type { Stuff } from '../stuff/Stuff';
import type { MarkupAugmenter } from '../../api/mml';
import { MixinApi } from '../../api/mixin';
import { StuffApi } from '../../api/stuff';
import { ExecutionContextApi } from '../../api/execution-context';
import type Material from '../material/Material';
import type { BulkAffordance, BulkPayload } from '../bulk/Bulkable';
import type { ToxinTag } from '../metabolism/Metabolic';
import { DissolvedToxins } from '../metabolism/DissolvedToxins';
import {
  DissolvedAromatics,
  type AromaTag,
} from '../metabolism/DissolvedAromatics';
import { Concentration } from '../bulk/Concentration';
import { Grade } from '../craft/Grade';
import FractionSchedule, { type FractionSpec } from './FractionSchedule';
import type { CompetenceBandName } from '../advancement/CompetenceBand';

/** Where a run has got to. */
export type RunPhase = 'idle' | 'charged' | 'running' | 'spent';

const SMELL_CHANNEL = 'smell';
const TASTE_CHANNEL = 'taste';

/**
 * ⭐ How much of the schedule's `readBlur` a band actually suffers. The
 * expert reads the boundary as it happens; the untrained reads it a whole
 * blur late. ⚠ Table, not arithmetic over the band index: the shape of
 * the curve is a design decision and belongs where it can be read.
 */
export const BLUR_BY_BAND: Record<CompetenceBandName, number> = {
  untrained: 1,
  novice: 0.75,
  competent: 0.5,
  proficient: 0.25,
  expert: 0,
};

/** Public shape contributed by FractionatingMixin. */
export interface Fractionating {
  /** Litres the charge started at; `0` when idle. */
  getChargeL(): number;
  /** Litres drawn off since the run started. */
  getDrawnL(): number;
  /** The run phase (reconciles on read). */
  getRunPhase(): RunPhase;
  /** Is a run under way — heat on, fractions still coming? */
  isRunning(): boolean;
  /** The matched schedule, or `null`. */
  getRunSchedule(): FractionSchedule | null;
  /**
   * What `viewer` would say is coming off right now — lagged by their
   * competence. `null` when nothing is running, or when their nose is so
   * far behind that the run had not started yet.
   */
  readFraction(viewer: Stuff): FractionSpec | null;
  /** Bring the run state up to date against the interior. */
  reconcileRun(): void;
}

/**
 * The state line on a `look`, and the lagged character on `smell` /
 * `taste`.
 *
 * ⚠ The filter gate is the whole of the Palatable lesson: an augmenter
 * that ignores `opts.filter` lands on every channel, which is how
 * `maturationAugmenter` came to read a cellar line out over a field of
 * linen. `look` gets the state and never the fraction — a glance at a
 * running still tells you it is running, not where in the run it is.
 */
function fractionAugmenter(
  text: string,
  host: Stuff,
  viewer: Stuff,
  opts?: { filter?: readonly string[] },
): string {
  if (!MixinApi.isFractionating(host)) return text;
  const filter = opts?.filter;
  const sensory =
    !!filter &&
    (filter.includes(SMELL_CHANNEL) || filter.includes(TASTE_CHANNEL));
  let line: string | null = null;
  if (sensory) {
    line = host.readFraction(viewer)?.character ?? null;
    // ⭐⭐ **The smoke is HEARD ARRIVING.** The fraction's authored
    // character says where in the run you are; the aromatics say what
    // the charge is giving up right now — and because phenols are
    // high-boiling (`FractionSpec.aromaticCarry`), a peated wash reads
    // clean through the foreshots and then turns, late, as the hearts
    // run on. That transition is the thing a distiller is listening for,
    // and nothing announces it: you have to be smelling.
    // ⚠ `getBulkPayloadForDraw` is `Bulkable`'s seam, not
    // `Fractionating`'s, so the narrowing has to say so — the host is
    // both, and widening the Fractionating interface to borrow a bulk
    // method would be the wrong fix.
    const aroma = MixinApi.isBulkable(host)
      ? DissolvedAromatics.render(
          host.getBulkPayloadForDraw('interior', 0)?.dissolvedAromatics,
          bandFor(viewer, host.getRunSchedule()?.getDiscipline() ?? ''),
        )
      : null;
    if (aroma) line = line ? `${line} ${aroma}` : aroma;
  } else if (!filter) {
    const phase = host.getRunPhase();
    if (phase === 'charged') line = 'It is charged and cold.';
    else if (phase === 'running') line = 'It is running.';
    else if (phase === 'spent') line = 'It is run out — only the dregs left.';
  }
  if (!line) return text;
  return text && text.length > 0 ? `${text}\n\n${line}` : line;
}

/**
 * The charge's aromatics at a fraction's own carry multiple. A multiple
 * of 0 returns nothing at all rather than a set of zeroes, so a
 * foreshot's payload stays byte-identical to one from before aromatics
 * existed.
 */
function scaleAromatics(
  tags: readonly AromaTag[],
  carry: number,
): AromaTag[] {
  if (!(carry > 0) || tags.length === 0) return [];
  const out: AromaTag[] = [];
  for (const tag of tags) {
    if (!(tag.amount > 0)) continue;
    out.push({ ...tag, amount: tag.amount * carry });
  }
  return out;
}

/** The viewer's band in one discipline; `untrained` is the floor. */
function bandFor(viewer: Stuff, discipline: string): CompetenceBandName {
  if (!discipline) return 'untrained';
  if (!MixinApi.isAdvancing(viewer)) return 'untrained';
  const digest = viewer.competenceDigestCached();
  if (!digest) return 'untrained';
  return digest.find((d) => d.discipline === discipline)?.band ?? 'untrained';
}

export function FractionatingMixin<TBase extends MixinConstructor<Stuff>>(
  Base: TBase,
) {
  return class FractionatingMixin extends Base implements Fractionating {
    static _mixinName: string = 'FractionatingMixin';

    static markupAugmenters: MarkupAugmenter[] = [fractionAugmenter];

    static __validateComposition__(ctor: AnyConstructor): void {
      const name = (ctor as { name?: string }).name ?? 'class';
      if (!MixinApi.hasMixin(ctor, Mixins.Bulkable)) {
        throw new Error(
          `${name} composes FractionatingMixin without BulkableMixin; ` +
            `the run rides the host's interior bulk slot — there is nothing ` +
            `to fractionate without one.`,
        );
      }
    }

    static fieldMeta: FieldMeta = {
      chargeL: { persistent: true, runtimeState: true },
      drawnL: { persistent: true, runtimeState: true },
      runPhase: { persistent: true, runtimeState: true },
      runScheduleKey: { persistent: true, runtimeState: true },
      runMaterialPath: { persistent: true, runtimeState: true },
      runMaker: { persistent: true, runtimeState: true },
      runChargeBand: { persistent: true, runtimeState: true },
    };

    /** Litres the charge started at. */
    public chargeL = 0;
    /** Litres drawn since the run began. */
    public drawnL = 0;
    /** The phase. */
    public runPhase: RunPhase = 'idle';
    /** The matched schedule's key; `''` = none. */
    public runScheduleKey = '';
    /** The interior material path the run is keyed to (change ⇒ new charge). */
    public runMaterialPath: string | null = null;
    /** Who charged it — stamped onto every draw's payload. */
    public runMaker = '';
    /** The charge's grade band at the start; `''` = unknown. */
    public runChargeBand = '';

    /** Reentry guard (TS-private; proxy-safe — never `#`). */
    private _reconcilingRun = false;

    // ---------- the run machine ----------

    public reconcileRun(): void {
      if (this._reconcilingRun) return;
      const self = this as unknown as Stuff;
      if (!MixinApi.isBulkable(self)) return;
      this._reconcilingRun = true;
      try {
        const path = self.getBulkMaterialPath('interior');
        const amount = self.getBulkAmount('interior').rawValue();

        // An emptied host is an ended run.
        if (path === null || amount <= 0) {
          if (this.runPhase !== 'idle') this.resetRun();
          return;
        }

        // A changed interior material is a fresh charge. ⚠ The mixin's
        // own product and residue swaps re-key FIRST, so they never land
        // here — the same discipline `MaturingMixin` keeps.
        if (path !== this.runMaterialPath) {
          this.startCharge(path, amount);
          return;
        }

        if (this.runPhase === 'charged') {
          const schedule = FractionSchedule.byKey(this.runScheduleKey);
          if (schedule && this.heatReached(schedule.getRequiresHeatK())) {
            this.beginRun(schedule, amount);
          }
          return;
        }

        if (this.runPhase === 'running') {
          const schedule = FractionSchedule.byKey(this.runScheduleKey);
          if (!schedule) return;
          // ⭐ The residue swap, amount-triggered exactly as the lees
          // split is: the draw that crosses the floor converts what is
          // left at the very next read, elapsed or not.
          // ⚠ Against the run's OWN clock, not the interior amount. The
          // floor and the remaining amount are two different
          // floating-point paths to the same number (`charge × residue`
          // vs `charge − drawn`), and they do not always land on the same
          // side of it: a pour of exactly `available()` left the host one
          // part in ten-thousand-million above its own floor and the run
          // never ended. `drawnL` is what the draw actually moved.
          const drawable = this.chargeL * (1 - schedule.getResidueFraction());
          if (this.drawnL >= drawable - 1e-9) this.spendRun(schedule);
        }
      } finally {
        this._reconcilingRun = false;
      }
    }

    /** Drop every run field — an emptied host has no run. */
    protected resetRun(): void {
      this.chargeL = 0;
      this.drawnL = 0;
      this.runPhase = 'idle';
      this.runScheduleKey = '';
      this.runMaterialPath = null;
      this.runMaker = '';
      this.runChargeBand = '';
    }

    /**
     * A fresh charge landed. Match a schedule by the charge material's
     * tags; with none the host is simply a vessel (a still full of
     * water), which is `idle` and not an error.
     */
    protected startCharge(path: string, amount: number): void {
      this.resetRun();
      this.runMaterialPath = path;
      const material = StuffApi.findByTemplatePath<Material>(path);
      if (!material) return;
      const schedule = FractionSchedule.forMaterial(material);
      if (!schedule) return;
      this.chargeL = amount;
      this.runScheduleKey = schedule.getKey();
      this.runPhase = 'charged';
      const self = this as unknown as Stuff;
      // The charge's identity, captured at the charge: the vat's grade is
      // what this run has to work with (D10 stretches the heads by it),
      // and the hand that charged it is who the bottle will name.
      if (MixinApi.isGraded(self)) this.runChargeBand = self.getGradeBand();
      if (MixinApi.isCrafted(self) && self.getMaker()) {
        this.runMaker = self.getMaker();
      }
      if (!this.runMaker) {
        // ⚠⚠ `getIdentityPath()`, never `getTemplatePath()`. Every player
        // Avatar shares ONE template path, so a lineage key collapses the
        // whole realm into one maker — and the harm ledger compares this
        // string against the drinker's own identity path to decide
        // whether the row is against somebody else. A lineage key would
        // make every bottle anonymous-and-identical and the self-victim
        // guard would never fire.
        //
        // ⭐ Finding for review: `MaturingMixin.stampBatchMark`
        // (`Maturing.ts:815-822`) takes `getTemplatePath()` here. It is
        // the same defect one subsystem over, and it is not this build's
        // to fix — recorded in the plan.
        const author = ExecutionContextApi.getActingAuthor() as {
          getIdentityPath?: () => string | null;
        } | null;
        this.runMaker =
          (author && typeof author.getIdentityPath === 'function'
            ? author.getIdentityPath()
            : null) ?? '';
      }
      // Heat may already be on — a column that never cools.
      if (this.heatReached(schedule.getRequiresHeatK())) {
        this.beginRun(schedule, amount);
      }
    }

    /**
     * The heat arrived: swap the interior to the schedule's product and
     * start counting draws. ⚠ The material swap re-keys `runMaterialPath`
     * before anything else can observe it, or the next reconcile would
     * read its own swap as a fresh charge and loop.
     */
    protected beginRun(schedule: FractionSchedule, amount: number): void {
      const self = this as unknown as Stuff;
      if (!MixinApi.isBulkable(self)) return;
      const product = StuffApi.findByTemplatePath<Material>(
        schedule.getProductMaterial(),
      );
      if (!product) {
        console.warn(
          `FractionatingMixin: schedule '${schedule.getKey()}' names product ` +
            `'${schedule.getProductMaterial()}', which is not a live material; ` +
            `the run cannot start.`,
        );
        return;
      }
      this.chargeL = amount;
      this.drawnL = 0;
      this.runPhase = 'running';
      this.runMaterialPath = schedule.getProductMaterial();
      self.setBulkMaterial('interior', product);
    }

    /**
     * The last fraction is gone: what is left becomes the residue. A
     * schedule naming no residue material leaves the product behind
     * rather than inventing one.
     */
    protected spendRun(schedule: FractionSchedule): void {
      const self = this as unknown as Stuff;
      if (!MixinApi.isBulkable(self)) return;
      this.runPhase = 'spent';
      const residuePath = schedule.getResidueMaterial();
      if (!residuePath) return;
      const residue = StuffApi.findByTemplatePath<Material>(residuePath);
      if (!residue) return;
      this.runMaterialPath = residuePath;
      self.setBulkMaterial('interior', residue);
      // The dregs are not the product: whatever dose the spirit carried
      // does not belong to the stillage.
      self.setBulkPayload('interior', null);
    }

    /** Litres at which the last fraction is exhausted. */
    protected residueFloorL(schedule: FractionSchedule): number {
      return this.chargeL * schedule.getResidueFraction();
    }

    /** Has the host reached `k` Kelvin? `0` is always reached. */
    protected heatReached(k: number): boolean {
      if (k <= 0) return true;
      const self = this as unknown as Stuff;
      if (!MixinApi.isThermal(self)) return false;
      return self.reachableHeatK() >= k;
    }

    // ---------- the schedule, as this run sees it ----------

    /**
     * ⭐ The boundaries, stretched by the charge's grade. A poor wash
     * carries more of what has to be thrown away, so every boundary below
     * the hearts' end moves OUT by the same absolute amount — which
     * shrinks the hearts from the front without moving the tails. Seeded
     * from the charge, never drawn.
     */
    protected effectiveFractions(
      schedule: FractionSchedule,
    ): readonly FractionSpec[] {
      const stretch = schedule.getGradeStretch();
      const fractions = schedule.getFractions();
      if (stretch <= 0 || !this.runChargeBand) return fractions;
      const top = Grade.BANDS.length - 1;
      const band = Grade.isBand(this.runChargeBand)
        ? Grade.of(this.runChargeBand).getOrdinal()
        : top;
      const shift = (top - band) * stretch;
      if (shift <= 0) return fractions;
      // Everything but the LAST fraction moves out; the last one is the
      // boundary with the residue and a worse wash does not make a bigger
      // pot.
      const out: FractionSpec[] = [];
      for (let i = 0; i < fractions.length; i++) {
        const spec = fractions[i]!;
        if (i === fractions.length - 1) {
          out.push(spec);
          continue;
        }
        out.push({ ...spec, upTo: Math.min(spec.upTo + shift, 1) });
      }
      // The stretch can push a boundary past its successor; clamp so the
      // sequence stays ascending (a very poor wash is all heads).
      for (let i = 1; i < out.length; i++) {
        const prev = out[i - 1]!;
        const cur = out[i]!;
        if (cur.upTo <= prev.upTo) out[i] = { ...cur, upTo: prev.upTo };
      }
      return out;
    }

    /** The fraction at cumulative drawn-litres `atL`, or `null` (residue). */
    protected fractionAtL(
      schedule: FractionSchedule,
      atL: number,
    ): FractionSpec | null {
      if (this.chargeL <= 0) return null;
      const at = atL / this.chargeL;
      for (const spec of this.effectiveFractions(schedule)) {
        if (at < spec.upTo) return spec;
      }
      return null;
    }

    // ---------- the surface ----------

    public getChargeL(): number {
      this.reconcileRun();
      return this.chargeL;
    }

    public getDrawnL(): number {
      this.reconcileRun();
      return this.drawnL;
    }

    public getRunPhase(): RunPhase {
      this.reconcileRun();
      return this.runPhase;
    }

    public isRunning(): boolean {
      return this.getRunPhase() === 'running';
    }

    public getRunSchedule(): FractionSchedule | null {
      this.reconcileRun();
      return FractionSchedule.byKey(this.runScheduleKey);
    }

    public readFraction(viewer: Stuff): FractionSpec | null {
      this.reconcileRun();
      if (this.runPhase !== 'running') return null;
      const schedule = FractionSchedule.byKey(this.runScheduleKey);
      if (!schedule) return null;
      const blur =
        schedule.getReadBlur() *
        this.chargeL *
        BLUR_BY_BAND[bandFor(viewer, schedule.getDiscipline())];
      const here = this.fractionAtL(schedule, this.drawnL);
      if (blur <= 0) return here;
      // ⭐ The best-graded fraction anywhere in the window — the nose
      // hears what it wants to hear. Three samples are enough because a
      // fraction cannot be narrower than the window without the window
      // already covering its neighbours.
      const candidates = [
        here,
        this.fractionAtL(schedule, Math.max(0, this.drawnL - blur)),
        this.fractionAtL(schedule, this.drawnL + blur),
      ];
      let best: FractionSpec | null = null;
      for (const spec of candidates) {
        if (!spec) continue;
        if (
          best === null ||
          Grade.of(spec.gradeBand).compareTo(Grade.of(best.gradeBand)) > 0
        ) {
          best = spec;
        }
      }
      return best ?? here;
    }

    // ---------- the Bulkable policy seams ----------

    /**
     * ⭐⭐ **The material read reconciles too, and it has to.**
     *
     * `BulkableApi.transfer` captures `from.getMaterial()` at step 1 and
     * stamps the destination with it at step 5 — but the run does not
     * start until something asks a policy seam, and the first thing that
     * does is `computeApplied` at step 4. So the first draw after the
     * fire came up read the material as the CHARGE, started the run while
     * clamping the amount, and then stamped the receiving vessel with
     * wash while handing it a payload full of new-make's foreshots: a
     * bottle of wash that poisons you.
     *
     * ⚠ Found by the cask world test, not by any unit test — the unit
     * tests all heated the host before pouring, which is the one ordering
     * that hides it. The `_reconcilingRun` guard is what keeps this from
     * recursing, since `reconcileRun` reads the same field.
     */
    public getBulkMaterialPath(affordance: BulkAffordance): string | null {
      if (affordance === 'interior' && !this._reconcilingRun) {
        this.reconcileRun();
      }
      return super.getBulkMaterialPath(affordance);
    }

    /**
     * How much can be drawn. A cold charge gives up all of itself (it is
     * still wash, and pouring it back out is legal). A running host gives
     * up everything down to the residue floor — and no further, because
     * what is under the floor is not the product.
     *
     * ⚠ A fraction with its own `requiresHeatK` the host has not reached
     * clamps the draw at that fraction's start: the heavy ends do not
     * come over until the pot is hot enough for them. That is the seam a
     * refinery column is built on and a pot still never exercises.
     */
    public getBulkAvailable(affordance: BulkAffordance): number {
      const self = this as unknown as Stuff;
      if (!MixinApi.isBulkable(self)) return 0;
      const amount = self.getBulkAmount(affordance).rawValue();
      if (affordance !== 'interior') return amount;
      this.reconcileRun();
      if (this.runPhase !== 'running') return amount;
      const schedule = FractionSchedule.byKey(this.runScheduleKey);
      if (!schedule) return amount;
      const floor = this.residueFloorL(schedule);
      let ceiling = Math.max(0, amount - floor);
      // Clamp at the first fraction whose own heat gate is unmet.
      let startL = 0;
      for (const spec of this.effectiveFractions(schedule)) {
        const endL = spec.upTo * this.chargeL;
        if (
          spec.requiresHeatK !== undefined &&
          !this.heatReached(spec.requiresHeatK)
        ) {
          ceiling = Math.min(ceiling, Math.max(0, startL - this.drawnL));
          break;
        }
        startL = endL;
      }
      return Math.max(0, Math.min(amount, ceiling));
    }

    /**
     * A draw advances the run. ⚠ `drawnL` is the only clock there is, so
     * this is where it moves — and the residue swap happens on the next
     * reconcile rather than here, so one code path owns the transition.
     */
    public debitBulk(affordance: BulkAffordance, litres: number): void {
      super.debitBulk(affordance, litres);
      if (affordance !== 'interior') return;
      if (this.runPhase === 'running' && litres > 0) {
        this.drawnL += litres;
      }
      this.reconcileRun();
    }

    /**
     * ⭐⭐ **What `litres` drawn right now actually is** — the span
     * `[drawnL, drawnL + litres]` of the schedule, blended by volume.
     *
     * A pour that straddles a boundary carries both sides in proportion:
     * the dose is the volume-weighted mean of the fractions' doses, and
     * the grade is the WORST band in the span, because a pour with tails
     * in it is a pour with tails in it. The maker is the hand that
     * charged the pot.
     */
    public getBulkPayloadForDraw(
      affordance: BulkAffordance,
      litres: number,
    ): BulkPayload | null {
      const self0 = this as unknown as Stuff;
      const base = MixinApi.isBulkable(self0)
        ? self0.getBulkPayload(affordance)
        : null;
      if (affordance !== 'interior') return base;
      this.reconcileRun();
      if (this.runPhase !== 'running' || this.chargeL <= 0) return base;
      const schedule = FractionSchedule.byKey(this.runScheduleKey);
      if (!schedule) return base;
      const span = Math.max(0, litres);
      const fractions = this.effectiveFractions(schedule);
      let dose: ToxinTag[] = [];
      // ⭐⭐ The charge's own aromatics, carried over at each fraction's
      // own multiple. `aromaticCarry` defaults to 1, so a schedule that
      // authors none passes the charge's character through unchanged and
      // every shipped run is byte-identical to before.
      const chargeAromatics = base?.dissolvedAromatics ?? [];
      let aroma: AromaTag[] = [];
      let covered = 0;
      let worst: Grade | null = null;
      const cursor = this.drawnL;
      const end = this.drawnL + span;
      let startL = 0;
      for (const spec of fractions) {
        const endL = spec.upTo * this.chargeL;
        const overlap = Math.min(end, endL) - Math.max(cursor, startL);
        if (overlap > 0) {
          dose = DissolvedToxins.blend(spec.toxins, overlap, dose, covered);
          aroma = Concentration.blend(
            scaleAromatics(chargeAromatics, spec.aromaticCarry ?? 1),
            overlap,
            aroma,
            covered,
          );
          covered += overlap;
          const band = Grade.of(spec.gradeBand);
          worst = worst === null ? band : worst.min(band);
        }
        startL = endL;
        if (startL >= end) break;
      }
      // A zero-litre read (or a draw entirely past the last fraction)
      // reports the fraction at the cursor rather than nothing, so a
      // caller asking "what is coming off" gets an answer.
      if (covered <= 0) {
        const here = this.fractionAtL(schedule, this.drawnL);
        if (!here) return base;
        dose = DissolvedToxins.surviving(here.toxins, 0);
        aroma = scaleAromatics(chargeAromatics, here.aromaticCarry ?? 1);
        worst = Grade.of(here.gradeBand);
      }
      const self = this as unknown as Stuff;
      // ⭐ The host's own Graded face is restamped so the transfer seam's
      // identity carry and top-up minimum see the DRAW's band rather than
      // the charge's. Nothing else reads it mid-run.
      if (worst !== null && MixinApi.isGraded(self)) {
        const capped =
          this.runChargeBand && Grade.isBand(this.runChargeBand)
            ? worst.min(Grade.of(this.runChargeBand))
            : worst;
        self.setGrade(capped);
        worst = capped;
      }
      const payload: BulkPayload = { ...(base ?? {}) };
      if (this.runMaker) payload.maker = this.runMaker;
      if (dose.length > 0) payload.dissolvedToxins = dose;
      else delete payload.dissolvedToxins;
      if (aroma.length > 0) payload.dissolvedAromatics = aroma;
      else delete payload.dissolvedAromatics;
      return payload;
    }
  };
}
