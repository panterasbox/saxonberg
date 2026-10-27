/**
 * KineticMixin — ⭐ **how far each change its material undergoes has gone**,
 * reconciled on read over the good's own temperature history (the sugar
 * build's review, 2026-10-24).
 *
 * The material says WHAT happens and how fast at each temperature
 * ({@link Kinetics}, on the row); this holds the per-good state — an extent
 * `0..1` per change, one clock stamp, and the grade the good started at —
 * and applies the consequences: the grade falls as a change runs, the good
 * becomes another material when one completes, and `look` reads it in
 * words. It retired two pack mixins that were this with one curve each:
 * baking's `StalingMixin` and sugar's `InvertingMixin`.
 *
 * ⭐⭐ **Inertness is checked BEFORE the clock** (`Freshness`'s sparse
 * rule): matter whose material declares no kinetics reads and writes
 * nothing, so composing this on `Provision` costs a chair nothing.
 *
 * ⭐ **Integrated over the trajectory, not sampled.** A bundle of cane that
 * sat in the noon sun and was carried into shade turned at the noon rate
 * while it was there; a loaf out of the oven cools THROUGH the band where
 * starch moves fastest. `ThermalMixin.temperatureTrajectory` integrates it.
 *
 * ⚠ No far-past guard and no linkdead freeze: the change runs over the
 * whole absence, which is the point — bread stales while you are away.
 *
 * ⚠ Honest limit: the clock starts at the FIRST READ, not at the mint
 * (`Freshness`'s convention, and the two retired mixins'). A birth hook
 * would start it at the mint, and `lint:on-create` holds that hook's
 * population; nothing records a good's making time to integrate from.
 */

import type { MixinConstructor, FieldMeta } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import type Material from './Material';
import type { Kinetics, KineticChange } from './Kinetics';
import { Grade } from '../craft/Grade';
import { MixinApi } from '../../api/mixin';
import { StuffApi } from '../../api/stuff';
import { WorldClockApi } from '../../api/worldclock';
import { TemplatePaths } from '../paths';
import type { MarkupAugmenter } from '../../api/mml';

const SECONDS_PER_HOUR = 3_600;
/** The temperature a good with no thermal history is taken at, K. */
const UNTRACKED_K = 293;
/** Simpson sub-steps per trajectory stretch. */
const SUB_STEPS = 8;

/** `look` reads each change in words, through the senses its row names. */
function kineticAugmenter(
  text: string,
  host: Stuff,
  _viewer: Stuff,
  opts?: { filter?: readonly string[] },
): string {
  const duck = host as unknown as Partial<Kinetic>;
  if (typeof duck.kineticPhrases !== 'function' || host.isDestroyed()) return text;
  const lines = duck
    .kineticPhrases()
    .filter((p) => !opts?.filter || !p.senses || p.senses.some((c) => opts.filter!.includes(c)))
    .map((p) => p.phrase)
    .filter((l) => l !== '');
  if (lines.length === 0) return text;
  const block = lines.join(' ');
  return text && text.length > 0 ? `${text}\n\n${block}` : block;
}

/** The kinetic capability surface. */
export interface Kinetic {
  /** How far change `key` has gone, `0..1` — reconciles on read; `0` when the material has no such change. */
  getKineticExtent(key: string): number;
  /** Each change's words at its current extent, with the senses they are read through. */
  kineticPhrases(): { key: string; phrase: string; senses?: readonly string[] }[];
  /** Reconcile every change to now. */
  reconcileKinetics(): void;
  /** Set a change's extent outright — the mint, and the test seam. */
  setKineticExtent(key: string, value: number): void;
}

export function KineticMixin<TBase extends MixinConstructor<Stuff>>(Base: TBase) {
  return class KineticMixin extends Base implements Kinetic {
    static _mixinName = 'KineticMixin';

    static fieldMeta: FieldMeta = {
      kineticExtents: { persistent: true, runtimeState: true },
      kineticStamp: { persistent: true, runtimeState: true },
      kineticStartBand: { persistent: true, runtimeState: true },
    };

    static markupAugmenters: MarkupAugmenter[] = [kineticAugmenter];

    /** Extent per change key, `0..1` — a plain record (never a bare `Map`: no BSON shape). */
    public kineticExtents: Record<string, number> = {};
    /** Game-seconds of the last reconcile; `0` = never touched. */
    public kineticStamp = 0;
    /** The grade the good had when its clock started — changes lower it from here. */
    public kineticStartBand = '';

    private _reconcilingKinetics = false;

    public getKineticExtent(key: string): number {
      if (!this._reconcilingKinetics) this.reconcileKinetics();
      return this.kineticExtents[key] ?? 0;
    }

    public kineticPhrases(): { key: string; phrase: string; senses?: readonly string[] }[] {
      const kinetics = this.kineticsOfMaterial();
      if (!kinetics) return [];
      return kinetics.changes().map((change) => {
        const senses = change.getSenses();
        return {
          key: change.getKey(),
          phrase: change.phrase(this.getKineticExtent(change.getKey())),
          ...(senses ? { senses } : {}),
        };
      });
    }

    public setKineticExtent(key: string, value: number): void {
      if (!Number.isFinite(value)) return;
      this.kineticExtents = { ...this.kineticExtents, [key]: Math.max(0, Math.min(1, value)) };
      const now = kineticNow();
      if (now !== null) this.kineticStamp = now;
      const change = this.kineticsOfMaterial()?.change(key);
      if (change) this.applyConsequences([change]);
    }

    public reconcileKinetics(): void {
      if (this._reconcilingKinetics) return;
      const kinetics = this.kineticsOfMaterial();
      if (!kinetics) return;
      const now = kineticNow();
      if (now === null) return;
      const self = this as unknown as Stuff;
      if (this.kineticStamp === 0) {
        this.kineticStamp = now;
        if (MixinApi.isGraded(self) && this.kineticStartBand === '') {
          this.kineticStartBand = self.getGrade().getBand();
        }
        return;
      }
      const elapsed = now - this.kineticStamp;
      if (!(elapsed > 0)) return;
      this._reconcilingKinetics = true;
      try {
        const from = this.kineticStamp;
        this.kineticStamp = now;
        const trajectory = MixinApi.isThermal(self) ? self.temperatureTrajectory(from, now) : null;
        const extents = { ...this.kineticExtents };
        for (const change of kinetics.changes()) {
          const key = change.getKey();
          const hours = trajectory
            ? trajectory.integrate((k) => change.rateAt(k), SUB_STEPS) / SECONDS_PER_HOUR
            : (change.rateAt(UNTRACKED_K) * elapsed) / SECONDS_PER_HOUR;
          extents[key] = change.advance(extents[key] ?? 0, hours);
        }
        this.kineticExtents = extents;
        this.applyConsequences(kinetics.changes());
      } finally {
        this._reconcilingKinetics = false;
      }
    }

    /** The grade falls with every change's bands; a completed change makes the good what it becomes. */
    private applyConsequences(changes: readonly KineticChange[]): void {
      const self = this as unknown as Stuff;
      if (MixinApi.isGraded(self) && Grade.isBand(this.kineticStartBand)) {
        const all = this.kineticsOfMaterial()?.changes() ?? changes;
        const drop = all.reduce((d, c) => d + c.gradeDrop(this.kineticExtents[c.getKey()] ?? 0), 0);
        self.setGrade(Grade.fromOrdinal(Grade.of(this.kineticStartBand).getOrdinal() - drop));
      }
      if (!MixinApi.isTangible(self)) return;
      for (const change of changes) {
        const becomes = change.getBecomes();
        if (!becomes || (this.kineticExtents[change.getKey()] ?? 0) < 1) continue;
        const next = StuffApi.findByTemplatePath<Material>(becomes);
        if (next && self.getMaterial() !== next) self.setMaterial(next);
      }
    }

    private kineticsOfMaterial(): Kinetics | null {
      const self = this as unknown as Stuff;
      if (!MixinApi.isTangible(self)) return null;
      return self.getMaterial()?.getKinetics() ?? null;
    }
  };
}

/** Game-seconds now, or null with no world clock (pre-boot, unit tests). */
function kineticNow(): number | null {
  if (!StuffApi.findByTemplatePath(TemplatePaths.worldClockRegistry)) return null;
  return WorldClockApi.getNow().rawValue();
}
