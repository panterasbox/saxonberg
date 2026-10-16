/**
 * RipeningMixin — a SOLID that converts on a shelf by its own temperature
 * (the dairy build, D9): a wheel of cheese. The **discrete twin** of
 * `MaturingMixin`.
 *
 * ⭐ Maturing composes on a VESSEL and converts what its interior holds;
 * a wheel has no interior — it IS the thing ripening. So this mixin keeps
 * the parts of the shape that are about time and temperature and drops
 * the parts that are about bulk: no strain (the rind flora came with the
 * curd), no lees, no pitch, no pour. What it shares is the authored
 * reaction norm — the same `MaturationProfile` rows, matched by the host's
 * own material TAGS (`soft-cheese`, `hard-cheese` — the materials a curd
 * BECOMES when it sets, so a vat's curd never matches a ripening row) —
 * and the same arithmetic, through the profile's own `rateAt`/`damageSat`.
 *
 * Phases: `idle` (no profile) · `active` (ripening) · `finished` (ripe) ·
 * `turned` (gone over — a soft cheese left past its days) · `killed` (it
 * was kept too warm, and the rind's flora is dead — stored, because a
 * wheel cannot be re-pitched).
 *
 * The grade is the weakest link of three: the worst temperature stretch,
 * the band the wheel was made at, and how far along it is
 * (`productAtFraction` opens the *young but sellable* window). Written to
 * the Graded face every reconcile, so a ripe wheel is WORTH more — the
 * value a cheesemaker waits for.
 *
 * ⭐ While ripening it holds spoilage off (`SpoilageHolding`): the rind's
 * flora is the population. Contamination is never held.
 *
 * What composing it claims: *this solid converts by its own temperature
 * over game-time.* ⛔ Not every `Provision` — a ration does not ripen. A
 * cured ham is the named second consumer.
 */
import type { MixinConstructor, FieldMeta } from '../mixin';
import { Mixins } from '../mixin';
import type { AnyConstructor } from '../../api/mixin';
import { MixinApi } from '../../api/mixin';
import { StuffApi } from '../../api/stuff';
import { WorldClockApi } from '../../api/worldclock';
import type { MarkupAugmenter } from '../../api/mml';
import type { Stuff } from '../stuff/Stuff';
import type Material from '../material/Material';
import { Grade, type GradeBand } from '../craft/Grade';
import MaturationProfile from './MaturationProfile';
import { TemplatePaths } from '../paths';

/** Where a wheel has got to. */
export type RipeningPhase = 'idle' | 'active' | 'finished' | 'turned' | 'killed';

/** Public shape contributed by RipeningMixin. */
export interface Ripening {
  /** Integrate the ripening over elapsed game-time (lazy; reads drive it). */
  reconcileRipening(): void;
  /** The phase (reconciles first). */
  getRipeningPhase(): RipeningPhase;
  /** How far along, `0..1` (reconciles first). */
  getRipeness(): number;
  /** The matched profile, or `null`. */
  getRipeningProfile(): MaturationProfile | null;
  /** True while the rind's flora holds spoilage off. */
  holdsSpoilage(): boolean;
  /** The words a look or a taste gives — never a number. */
  ripenessLine(): string | null;
}

const SECONDS_PER_GAME_DAY = 86_400;
const SUB_STEPS = 8;

function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

/** Worst-stretch satisfaction → band (Maturing's thresholds, twin). */
function bandFor(x: number): GradeBand {
  if (x >= 0.95) return 'masterful';
  if (x >= 0.8) return 'exceptional';
  if (x >= 0.6) return 'fine';
  if (x >= 0.35) return 'fair';
  return 'poor';
}

/**
 * The ripeness line, on `look` and `taste` — and NOT `smell`, which the
 * material's own nose already answers. ⚠ The filter gate is the Palatable
 * lesson.
 */
function ripeningAugmenter(
  text: string,
  host: Stuff,
  _viewer: Stuff,
  opts?: { filter?: readonly string[] },
): string {
  if (!MixinApi.isRipening(host)) return text;
  const filter = opts?.filter;
  if (filter && !filter.includes('taste')) return text;
  const line = host.ripenessLine();
  if (!line) return text;
  return text && text.length > 0 ? `${text}\n\n${line}` : line;
}

export function RipeningMixin<TBase extends MixinConstructor<Stuff>>(Base: TBase) {
  return class RipeningMixin extends Base implements Ripening {
    static _mixinName: string = 'RipeningMixin';

    static markupAugmenters: MarkupAugmenter[] = [ripeningAugmenter];

    static __validateComposition__(ctor: AnyConstructor): void {
      const name = (ctor as { name?: string }).name ?? 'class';
      for (const [mixin, why] of [
        [Mixins.Fresh, 'it ripens instead of rotting, so it must be able to rot'],
        [Mixins.Thermal, 'its own temperature drives it'],
        [Mixins.Graded, 'the ripeness is written to its grade'],
      ] as const) {
        if (!MixinApi.hasMixin(ctor, mixin)) {
          throw new Error(`${name} composes RipeningMixin without ${mixin}; ${why}.`);
        }
      }
    }

    static fieldMeta: FieldMeta = {
      ripeningPhase: { persistent: true, runtimeState: true },
      ripenessFraction: { persistent: true, runtimeState: true },
      ripeningStamp: { persistent: true, runtimeState: true },
      ripeningProfileKey: { persistent: true, runtimeState: true },
      ripeningMaterialPath: { persistent: true, runtimeState: true },
      ripeningInputBand: { persistent: true, runtimeState: true },
      _ripeWorst: { persistent: true, runtimeState: true },
      overDays: { persistent: true, runtimeState: true },
    };

    public ripeningPhase: RipeningPhase = 'idle';
    public ripenessFraction = 0;
    /** Game-seconds of the last reconcile; `0` = never. */
    public ripeningStamp = 0;
    public ripeningProfileKey = '';
    /** The material the ripening is keyed to (a change ⇒ a fresh start). */
    public ripeningMaterialPath: string | null = null;
    /** The band the wheel was MADE at — the ceiling (weakest link). */
    public ripeningInputBand: string | null = null;
    /** Monotone minimum of the damage satisfaction. */
    public _ripeWorst = 1;
    /** Game-days past ripe (the going-over clock). */
    public overDays = 0;

    private _reconcilingRipening = false;

    /**
     * ⭐ It starts ripening the moment it IS a cheese (dairy, found by the
     * drive): ripening used to start at the first READ, so a wheel cast,
     * salted and racked and left unlooked-at stored `idle` — its spoilage
     * gauge unheld and its clock unstarted for every day before somebody
     * looked — and came off the rack three weeks later *faintly off*.
     * Both the cast and the salting craft set the material.
     */
    public setMaterial(value: Material | null, detailKey?: string): void {
      (Base.prototype as unknown as {
        setMaterial(v: Material | null, k?: string): void;
      }).setMaterial.call(this, value, detailKey);
      this.reconcileRipening();
    }

    public reconcileRipening(): void {
      if (this._reconcilingRipening) return;
      const self = this as unknown as Stuff;
      const material: Material | null = MixinApi.isTangible(self)
        ? self.getMaterial()
        : null;
      const path = material?.getTemplatePath() ?? null;
      const nowS = ripeningNowSeconds();
      if (nowS === null) return;
      this._reconcilingRipening = true;
      try {
        if (path !== this.ripeningMaterialPath) {
          this.startRipening(material, path, nowS);
          return;
        }
        if (this.ripeningStamp === 0) {
          this.ripeningStamp = nowS;
          return;
        }
        const elapsed = nowS - this.ripeningStamp;
        if (!(elapsed > 0)) return;
        this.ripeningStamp = nowS;
        if (this.ripeningPhase === 'idle' || this.ripeningPhase === 'killed') return;
        const profile = MaturationProfile.byKey(this.ripeningProfileKey);
        if (!profile) return;

        const samples = MixinApi.isThermal(self)
          ? self.temperatureTrajectory(nowS - elapsed, nowS).samples(SUB_STEPS)
          : [];
        const killK = profile.getKillK();
        for (const s of samples) {
          // ⚠ Too warm and the rind's flora dies — stored, not re-pitched.
          if (killK !== null && s.value > killK) {
            this.ripeningPhase = 'killed';
            this.applyRipeningGrade(profile);
            return;
          }
          const sat = profile.damageSat(s.value);
          if (sat < this._ripeWorst) this._ripeWorst = sat;
        }
        if (this.ripeningPhase === 'active') {
          const gained = samples.reduce(
            (a, s) => a + profile.rateAt(s.value) * (s.durationS / SECONDS_PER_GAME_DAY),
            0,
          );
          this.ripenessFraction = Math.min(1, this.ripenessFraction + gained);
          if (this.ripenessFraction >= 1) this.ripeningPhase = 'finished';
        } else if (this.ripeningPhase === 'finished') {
          // ⭐ A soft cheese goes over; a hard one authors no turn and
          // simply keeps.
          if (profile.getTurnedMaterial() !== null) {
            this.overDays += elapsed / SECONDS_PER_GAME_DAY;
            if (this.overDays >= profile.getTurnDays()) {
              this.ripeningPhase = 'turned';
              this.swapToTurned(profile);
            }
          }
        }
        this.applyRipeningGrade(profile);
      } finally {
        this._reconcilingRipening = false;
      }
    }

    private startRipening(material: Material | null, path: string | null, nowS: number): void {
      this.ripeningMaterialPath = path;
      this.ripenessFraction = 0;
      this._ripeWorst = 1;
      this.overDays = 0;
      this.ripeningStamp = nowS;
      const profile = material ? MaturationProfile.forMaterial(material) : null;
      this.ripeningProfileKey = profile?.getKey() ?? '';
      this.ripeningPhase = profile !== null ? 'active' : 'idle';
    }

    /**
     * ⭐ The witness that records the band the wheel was MADE at: a
     * `setGrade` while ripening has not begun is the set site stamping the
     * vat's band onto the cast; once it is ripening, `setGrade` is this
     * mixin writing its own derived band. ⚠ Reading the face at the start
     * instead would cap every ungraded wheel at `GradedMixin`'s default
     * `fair` for ever — Maturing's `batchInputBand` trap, twin.
     */
    public setGrade(value: Grade): void {
      if (this.ripeningPhase === 'idle') {
        this.ripeningInputBand = value.getBand();
      }
      super.setGrade(value);
    }

    private swapToTurned(profile: MaturationProfile): void {
      const turned = profile.getTurnedMaterial();
      if (!turned || turned === this.ripeningMaterialPath) return;
      const m = StuffApi.findByTemplatePath<Material>(turned);
      const self = this as unknown as Stuff;
      if (m && MixinApi.isTangible(self)) {
        self.setMaterial(m);
        this.ripeningMaterialPath = turned;
      }
    }

    /** Weakest link of the worst stretch, the made band, and how far along. */
    private applyRipeningGrade(profile: MaturationProfile): void {
      const self = this as unknown as Stuff;
      if (!MixinApi.isGraded(self)) return;
      let band = Grade.of(bandFor(clamp01(this._ripeWorst)));
      if (this.ripeningInputBand !== null && Grade.isBand(this.ripeningInputBand)) {
        band = band.min(Grade.of(this.ripeningInputBand));
      }
      const p = profile.getProductAtFraction();
      if (this.ripeningPhase === 'turned' || this.ripeningPhase === 'killed') {
        band = band.min(Grade.of('poor'));
      } else if (p < 1) {
        const along = (clamp01(this.ripenessFraction) - p) / Math.max(1e-9, 1 - p);
        band = band.min(Grade.of(bandFor(clamp01(along))));
      }
      self.setGrade(band);
    }

    public getRipeningPhase(): RipeningPhase {
      this.reconcileRipening();
      return this.ripeningPhase;
    }

    public getRipeness(): number {
      this.reconcileRipening();
      return clamp01(this.ripenessFraction);
    }

    public getRipeningProfile(): MaturationProfile | null {
      return MaturationProfile.byKey(this.ripeningProfileKey);
    }

    /**
     * ⭐ The grade a buyer reads is the RIPENED grade: reconcile first, so
     * a wheel nobody has looked at for a month is priced as it is now.
     */
    public getGrade(): Grade {
      this.reconcileRipening();
      return super.getGrade();
    }

    public holdsSpoilage(): boolean {
      // ⚠ No reconcile here: the freshness read that asks is itself
      // inside a read, and the phase as last stored is the honest answer
      // about the span being integrated.
      return this.ripeningPhase === 'active';
    }

    public ripenessLine(): string | null {
      const phase = this.getRipeningPhase();
      if (phase === 'idle') return null;
      if (phase === 'killed') {
        return 'It has sweated and cracked in the warm — the rind is dead, and it will not ripen now.';
      }
      if (phase === 'turned') {
        return 'It has gone over: the paste runs, and it smells of ammonia.';
      }
      if (phase === 'finished') {
        return 'It is ripe — the rind is set and the paste gives a little under the thumb.';
      }
      const p = this.getRipeningProfile()?.getProductAtFraction() ?? 1;
      return this.ripenessFraction < p
        ? 'It is young yet — pale, and firm, and tasting mostly of milk.'
        : 'It is coming on; the rind has formed and the paste is turning.';
    }
  };
}

/** Game-seconds now, or `null` when no world clock is running. */
function ripeningNowSeconds(): number | null {
  if (!StuffApi.findByTemplatePath(TemplatePaths.worldClockRegistry)) {
    return null;
  }
  return WorldClockApi.getNow().rawValue();
}
