/**
 * MouldMixin — a vessel that answers one question: **when what is in me
 * sets, what shape comes out?** (the dairy build, D9 — moulds as a kernel
 * system).
 *
 * ⭐⭐ Before this, two things decided the shape of a set solid and neither
 * was the container: the MATERIAL (`castTemplate` at the freeze edge — so
 * water froze to an ice block in a bucket) and the RECIPE
 * (`outputTemplate`). A mould is the claim that the **container** decides,
 * and that the recipe owns no shape. So the set site asks the container
 * first and falls back to the material: a plain vessel keeps today's
 * behaviour exactly (a lump drops beside it), and a mould keeps what set in
 * it, in its shape, until somebody takes it out.
 *
 * ⭐ How a thing sets is the MATTER's business, never the mould's. Two set
 * processes ship:
 *
 *   - **freezing** — `meltingPoint` + latent heat, driven by the thermal
 *     reconcile (`Thermal.reconcileBulkPhase`), which asks
 *     {@link Mould.castInto} when the pool sets;
 *   - **draining** — `Material.drainSetting`: curd gives up its whey over
 *     time and sets, faster and drier under a weight placed ON the mould
 *     (when the host composes `PlacingMixin` — a cheese hoop takes a press
 *     stone, an ingot mould does not). Integrated here, on the mould's own
 *     reads ({@link Mould.reconcileSetting}).
 *
 * Dry, cure and bake are the next set processes and hang on the same hook.
 *
 * ⛔ **No verb.** The acts are the shipped ones — `pour` into the mould,
 * `put` a weight on it, `look` at it, `get` the set thing out. A pour INTO a
 * mould authoring a `discipline` credits it (the bulk `PourController`), so
 * there is no recipe and nothing for a deed to gate.
 *
 * What composing it CLAIMS: *a made, wearing vessel that holds what set in
 * it.* Requires `Bulkable` (the pool), `Thermal` (freezing is heat) and
 * `Container` (the cast stays IN it). ⛔ Not every vessel is a mould — a
 * pail, a pot, a crucible are not, and a pool left in one sets as a lump.
 * See `docs/subsystems/mould.md`.
 */
import type { MixinConstructor, FieldMeta } from '../mixin';
import { Mixins } from '../mixin';
import type { AnyConstructor } from '../../api/mixin';
import { MixinApi } from '../../api/mixin';
import { StuffApi } from '../../api/stuff';
import { ContainmentApi } from '../../api/containment';
import { WorldClockApi } from '../../api/worldclock';
import type { MarkupAugmenter } from '../../api/mml';
import type { Stuff } from '../stuff/Stuff';
import type { Container } from '../spatial/Container';
import type { Containable } from '../spatial/Containable';
import type Material from '../material/Material';
import type { BulkPayload } from '../bulk/Bulkable';
import { WEAR_PER_USE } from '../material/Durable';
import { Quantity } from '../quantity';
import { TemplatePaths } from '../paths';

/** What a pool hands a mould when it sets. */
export interface SetPool {
  /** The material the set thing IS (`becomes`, or the pool's own). */
  material: Material;
  /** The set thing's mass. */
  massKg: number;
  /** The pool's payload, captured before it was cleared. */
  payload: BulkPayload | null;
  /** The set thing's moisture (a drain set writes it); absent ⇒ untouched. */
  moisture?: number;
  /**
   * ⭐ Stamp `material` even over a shape row that authored its own. A
   * DRAIN set's `becomes` is authoritative (one wheel row, every cheese);
   * a FREEZE keeps the row's material, because the row knows the solid
   * phase (an ice block is ice, never water).
   */
  stampMaterial?: boolean;
}

/**
 * ⭐ A cast that can remember what it was made from (a wheel says *a ewe's
 * milk cheese*). Duck-probed on the clone, so nothing composes a marker
 * and a lump of copper simply does not answer.
 */
export interface MadeFromHolding {
  getMadeFrom(): string;
  setMadeFrom(materialPath: string): void;
}

/** Public shape contributed by MouldMixin. */
export interface Mould {
  /** The template a set pool of `material` becomes in this mould. */
  castTemplateFor(material: Material): string;
  /**
   * Mint the set thing from a pool and keep it — the one cast path both
   * set processes share. Asynchronous (a clone); the pool has already
   * been cleared by the caller.
   */
  castInto(pool: SetPool): Promise<Stuff | null>;
  /** True while a set thing sits in the mould. */
  holdsCast(): boolean;
  /** Kilograms placed ON the mould — the press. `0` without `Placing`. */
  loadKg(): number;
  /** Integrate a drain set to now (reconcile-on-read). */
  reconcileSetting(): void;
  /** The Discipline a fill into this mould credits; `''` = none. */
  getMouldDiscipline(): string;
  /** `filled` · `setting` · `set` · `null` (empty) — a state, no digit. */
  setState(): 'filled' | 'setting' | 'set' | null;
}

/** Seconds per game day — the unit a drain set's `days` is authored in. */
const SECONDS_PER_GAME_DAY = 86_400;

/**
 * The state line on `look` — words, never a number. ⚠ Filtered to `look`:
 * a mould has nothing to say to a nose that its contents do not.
 */
function mouldAugmenter(
  text: string,
  host: Stuff,
  _viewer: Stuff,
  opts?: { filter?: readonly string[] },
): string {
  if (opts?.filter) return text;
  if (!MixinApi.isMould(host)) return text;
  const state = host.setState();
  const line =
    state === 'set'
      ? 'What was poured in has set, and holds the shape of it.'
      : state === 'setting'
        ? 'It has drawn down and firmed, but it is not set through yet.'
        : state === 'filled'
          ? 'It is filled, and has not begun to set.'
          : null;
  if (!line) return text;
  return text && text.length > 0 ? `${text}\n\n${line}` : line;
}

export function MouldMixin<TBase extends MixinConstructor<Stuff>>(Base: TBase) {
  return class MouldMixin extends Base implements Mould {
    static _mixinName: string = 'MouldMixin';

    static markupAugmenters: MarkupAugmenter[] = [mouldAugmenter];

    static fieldMeta: FieldMeta = {
      castTemplate: { persistent: true, authorable: true, ref: 'identity:kind' },
      reusable: { persistent: true, authorable: true },
      wearPerCast: { persistent: true, authorable: true },
      discipline: { persistent: true, authorable: true },
      setProgress: { persistent: true, runtimeState: true },
      setStamp: { persistent: true, runtimeState: true },
      setPressed: { persistent: true, runtimeState: true },
    };

    static __validateComposition__(ctor: AnyConstructor): void {
      const name = (ctor as { name?: string }).name ?? 'class';
      for (const [mixin, why] of [
        [Mixins.Bulkable, 'the pool it sets is bulk'],
        [Mixins.Thermal, 'freezing is heat'],
        [Mixins.Container, 'the set thing stays in it'],
      ] as const) {
        if (!MixinApi.hasMixin(ctor, mixin)) {
          throw new Error(
            `${name} composes MouldMixin without ${mixin}; ${why}.`,
          );
        }
      }
    }

    /** ⭐ The shape — the template a pool set in this mould becomes. */
    public castTemplate = '';
    /** A reusable mould wears per cast; a consumed one breaks to release. */
    public reusable = true;
    /** Condition lost per cast by a reusable mould. */
    public wearPerCast = WEAR_PER_USE;
    /** The Discipline a pour into this mould credits. */
    public discipline = '';
    /** A drain set's progress, `0..1`. */
    public setProgress = 0;
    /** Game-seconds of the last drain-set reconcile; `0` = not started. */
    public setStamp = 0;
    /**
     * ∫ (load ratio) d(progress) — how pressed the set has been, averaged
     * over its progress, so a stone put on halfway presses it halfway.
     */
    public setPressed = 0;

    /** Reentry guard (TS-private; proxy-safe — never `#`). */
    private _settingGuard = false;

    getCastTemplate(): string {
      return this.castTemplate;
    }
    setCastTemplate(value: string): void {
      this.castTemplate = typeof value === 'string' ? value : '';
    }
    isReusable(): boolean {
      return this.reusable;
    }
    setReusable(value: boolean): void {
      this.reusable = value !== false;
    }
    getWearPerCast(): number {
      return this.wearPerCast;
    }
    setWearPerCast(value: number): void {
      if (!Number.isFinite(value) || value < 0) {
        throw new RangeError(
          `MouldMixin.setWearPerCast: must be >= 0, got ${value}`,
        );
      }
      this.wearPerCast = value;
    }
    getMouldDiscipline(): string {
      return this.discipline;
    }
    setDiscipline(value: string): void {
      this.discipline = typeof value === 'string' ? value : '';
    }

    public castTemplateFor(material: Material): string {
      const self = this as unknown as Stuff;
      // ⭐ A cracked mould casts a lump — the shape is the mould's only
      // while the mould is whole.
      if (MixinApi.isDurable(self) && self.isBroken()) {
        return material.getCastTemplate();
      }
      return this.castTemplate || material.getCastTemplate();
    }

    public holdsCast(): boolean {
      return this.getContents().length > 0;
    }

    public loadKg(): number {
      const self = this as unknown as Stuff;
      if (!MixinApi.isPlacing(self)) return 0;
      let kg = 0;
      for (const item of self.getPlaced('on')) {
        if (MixinApi.isTangible(item)) kg += item.getMass().rawValue();
      }
      return kg;
    }

    public setState(): 'filled' | 'setting' | 'set' | null {
      this.reconcileSetting();
      const self = this as unknown as Stuff;
      const pooled =
        MixinApi.isBulkable(self) && self.getBulkAmount('interior').rawValue() > 0;
      if (pooled) {
        const drain = self.getBulkMaterial('interior')?.getDrainSetting() ?? null;
        return drain !== null && this.setProgress > 0 ? 'setting' : 'filled';
      }
      return this.holdsCast() ? 'set' : null;
    }

    /**
     * ⭐ The set site's reads drive the set: `look`, `get … from`, every
     * walk over the contents. A drain set is integrated here; a freeze is
     * the thermal reconcile's, which a temperature read drives.
     */
    public getContents(): readonly (Stuff & Containable)[] {
      this.reconcileSetting();
      return super.getContents();
    }

    /**
     * Integrate a drain set to now, and let a temperature read drive the
     * freeze.
     *
     * @samples the drain set reads NO temperature — it integrates progress
     * over game-time by the load on the mould; the one temperature read
     * here exists to run the thermal reconcile, which folds its own
     * trajectory and freezes a pool below its melting point.
     */
    public reconcileSetting(): void {
      if (this._settingGuard) return;
      const self = this as unknown as Stuff;
      if (!MixinApi.isBulkable(self)) return;
      this._settingGuard = true;
      try {
        // A temperature read runs the thermal reconcile, which is what
        // freezes a pool below its melting point (and casts INTO this).
        if (MixinApi.isThermal(self)) self.getTemperature();

        const amountL = self.getBulkAmount('interior').rawValue();
        const material = self.getBulkMaterial('interior');
        const drain = material?.getDrainSetting() ?? null;
        if (!(amountL > 0) || material === null || drain === null) {
          this.setProgress = 0;
          this.setStamp = 0;
          this.setPressed = 0;
          return;
        }
        const nowS = mouldNowSeconds();
        if (nowS === null) return;
        if (this.setStamp === 0) {
          this.setStamp = nowS;
          return;
        }
        const elapsed = nowS - this.setStamp;
        this.setStamp = nowS;
        if (!(elapsed > 0)) return;

        const poolKg = (amountL / 1000) * material.getDensity().rawValue();
        const ratio =
          poolKg > 0 ? Math.min(1, this.loadKg() / (poolKg * drain.loadRef)) : 0;
        const rate = (1 + ratio) / drain.days; // progress per game-day
        const step = Math.min(
          1 - this.setProgress,
          rate * (elapsed / SECONDS_PER_GAME_DAY),
        );
        this.setPressed += ratio * step;
        this.setProgress += step;
        if (this.setProgress < 1 - 1e-9) return;

        // ⭐ Set. The water the press drove out is gone; what is left is
        // the cheese, at the moisture the weight left it.
        const pressed = this.setPressed; // average ratio over the set
        const moisture =
          drain.moisture.unloaded +
          (drain.moisture.loaded - drain.moisture.unloaded) * pressed;
        const waterFraction =
          (material.getNutrientAmounts()['water'] ?? 0) / 1e6;
        const massKg = poolKg * (1 - (1 - moisture) * waterFraction);
        const becomes = drain.becomes
          ? StuffApi.findByTemplatePath<Material>(drain.becomes) ?? material
          : material;
        const payload = self.getBulkPayload('interior');
        self.setBulkAmount('interior', Quantity.of(0, 'L'));
        self.setBulkMaterial('interior', null);
        self.setBulkPayload('interior', null);
        this.setProgress = 0;
        this.setStamp = 0;
        this.setPressed = 0;
        void this.castInto({
          material: becomes,
          massKg,
          payload,
          moisture,
          stampMaterial: true,
        });
      } finally {
        this._settingGuard = false;
      }
    }

    public async castInto(pool: SetPool): Promise<Stuff | null> {
      const self = this as unknown as Stuff & Container;
      const template = this.castTemplateFor(pool.material);
      let cast: Stuff;
      try {
        cast = await StuffApi.clone(template);
      } catch {
        return null; // an unresolvable shape must not crash a reconcile
      }
      const c = cast as Stuff & {
        getMaterial?(): Material | null;
        setMaterial?(m: Material): void;
        setMass?(q: Quantity<'kg'>): void;
        setShortDescription?(s: string): void;
        setKeywords?(k: string[]): void;
      };
      const authored = typeof c.getMaterial === 'function' ? c.getMaterial() : null;
      if (pool.stampMaterial === true && typeof c.setMaterial === 'function') {
        c.setMaterial(pool.material);
      } else if (!authored && typeof c.setMaterial === 'function') {
        c.setMaterial(pool.material);
        // The material's own fallback shape is a generic lump with no prose
        // of its own; a mould's shape is a row that authored its prose.
        if (template === pool.material.getCastTemplate()) {
          c.setShortDescription?.(`cast lump of ${pool.material.getName()}`);
          c.setKeywords?.(['lump', 'cast', ...pool.material.getName().split(/\s+/)]);
        }
      }
      c.setMass?.(Quantity.of(pool.massKg, 'kg'));
      carryPayload(cast, pool, self);

      if (!MixinApi.isContainable(cast)) return cast;
      const item = cast as Stuff & Containable;
      if (this.reusable) {
        ContainmentApi.move(item, self);
        if (MixinApi.isDurable(self as Stuff)) {
          (self as unknown as { wear(n: number): void }).wear(this.wearPerCast);
        }
        return cast;
      }
      // ⭐ A consumed mould is broken to release what set in it.
      const scope = MixinApi.isContainable(self as Stuff)
        ? (self as unknown as Containable).getContainer()
        : null;
      if (scope !== null && MixinApi.isContainer(scope as Stuff)) {
        ContainmentApi.move(item, scope as unknown as Stuff & Container);
      }
      StuffApi.destruct(self as Stuff);
      return cast;
    }
  };
}

/**
 * Carry what the pool KNEW onto the set thing, when the set thing can hold
 * it: who made it, what it was made from, how far it had spoiled, what it
 * was carrying, how wet it is now. ⚠ Food only by construction — an ingot
 * composes none of these and is told nothing.
 */
function carryPayload(cast: Stuff, pool: SetPool, mould: Stuff): void {
  const p = pool.payload;
  if (MixinApi.isCrafted(cast)) {
    const mouldMaker = MixinApi.isCrafted(mould) ? mould.getMaker() : '';
    const maker = p?.maker || mouldMaker;
    if (maker) cast.setMaker(maker);
    if (MixinApi.isGraded(mould)) cast.setGrade(mould.getGrade());
  }
  if (p?.freshness && MixinApi.isFresh(cast)) {
    cast.setMicrobialLoad(p.freshness.load);
  }
  if (p?.pathogens && MixinApi.isContaminable(cast)) {
    cast.setPathogenLoads({ ...p.pathogens });
  }
  if (pool.moisture !== undefined && MixinApi.isWaterActive(cast)) {
    const solute = p?.water?.solute ?? 0;
    cast.setWaterState({ moisture: pool.moisture, solute });
  }
  if (p?.madeFrom) {
    const probe = cast as unknown as Partial<MadeFromHolding>;
    if (typeof probe.setMadeFrom === 'function') probe.setMadeFrom(p.madeFrom);
  }
}

/** Game-seconds now, or `null` when no world clock is running. */
function mouldNowSeconds(): number | null {
  if (!StuffApi.findByTemplatePath(TemplatePaths.worldClockRegistry)) {
    return null;
  }
  return WorldClockApi.getNow().rawValue();
}
