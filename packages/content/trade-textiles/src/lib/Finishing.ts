/**
 * FinishingMixin — ⭐ cloth finished IN THE PIECE by a temperature-driven
 * profile: raw silk degummed in a copper of simmering water, and (the
 * recorded next consumers) wool scoured, linen piece-bleached, a garment
 * finished after it is made.
 *
 * The discrete twin of a maturing vat for cloth, the way `RipeningMixin`
 * is for a wheel of cheese — minus the food: no freshness, no spoilage to
 * hold. It matches a `MaturationProfile` by the bolt's material TAG (the
 * profile's `inputCategory`), integrates `profile.rateAt` over the bolt's
 * own temperature trajectory, remembers the worst `damageSat` it was held
 * at, and at fraction 1 swaps the material to the profile's product and
 * scales the mass by `productFraction` — the quarter of a raw-silk bolt's
 * weight that was gum boils away.
 *
 * ⚠ The bath is the KERNEL's: a solid in a vessel of liquid is at the
 * liquid's temperature (`ThermalMixin`'s immersion rung). Without that,
 * a bolt in a copper of boiling water read the room's air, and boiling
 * cloth was unrepresentable — the deferral `BleachingGreen` names.
 *
 * Phases: `idle` (no profile matches) · `active` · `finished` · `killed`
 * (held past the profile's kill line — reserved; degumming authors none).
 */

import type { FieldMeta, MixinConstructor } from '@saxonberg/server/mud/lib/mixin';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type Material from '@saxonberg/server/mud/lib/material/Material';
import MaturationProfile from '@saxonberg/server/mud/lib/maturation/MaturationProfile';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import { TemplatePaths } from '@saxonberg/server/mud/lib/paths';
import { GRADE_BANDS } from '@saxonberg/server/mud/lib/craft/Grade';

export const FINISHING_MIXIN = 'FinishingMixin';

export type FinishingPhase = 'idle' | 'active' | 'finished' | 'killed';

const SECONDS_PER_GAME_DAY = 86_400;
const SUB_STEPS = 8;
/** Held this badly (damage satisfaction under it) the finish costs a band. */
const DAMAGE_BAND_AT = 0.5;

/** The public face of a finishing. */
export interface Finishing {
  getFinishingPhase(): FinishingPhase;
  /** How far through the finish, 0–1. */
  getFinishedFraction(): number;
  reconcileFinishing(): void;
  /** The finish in words, or `''` when there is nothing to say. */
  finishingLine(): string;
}

function nowGameSeconds(): number | null {
  if (!StuffApi.findByTemplatePath(TemplatePaths.worldClockRegistry)) return null;
  return WorldClockApi.getNow().rawValue();
}

type FinishingBase = Stuff & {
  getMaterial(): Material | null;
  setMaterial(value: Material | null, detailKey?: string): void;
  getMass(): Quantity<'kg'>;
  setMass(value: Quantity<'kg'>): void;
  temperatureTrajectory(fromS: number, toS: number): {
    samples(n: number): Array<{ value: number; durationS: number }>;
  };
};

export function FinishingMixin<TBase extends MixinConstructor>(Base: TBase) {
  return class FinishingMixin extends Base implements Finishing {
    static _mixinName: string = FINISHING_MIXIN;

    static _mixinRefusal = '{} is not cloth that can be finished';

    static fieldMeta: FieldMeta = {
      finishingPhase: { persistent: true, stackIdentity: true },
      finishedFraction: { persistent: true, stackIdentity: true },
      finishingStamp: { persistent: true },
      finishingProfileKey: { persistent: true },
      finishingMaterialPath: { persistent: true },
      _finishWorst: { persistent: true },
    };

    public finishingPhase: FinishingPhase = 'idle';
    public finishedFraction = 0;
    /** Game-seconds of the last reconcile; `0` = never. */
    public finishingStamp = 0;
    public finishingProfileKey = '';
    /** The material the finish is keyed to (a change ⇒ a fresh start). */
    public finishingMaterialPath: string | null = null;
    /** Monotone minimum of the damage satisfaction while active. */
    public _finishWorst = 1;

    private _reconcilingFinishing = false;

    private finishingHost(): FinishingBase {
      return this as unknown as FinishingBase;
    }

    public getFinishingPhase(): FinishingPhase {
      this.reconcileFinishing();
      return this.finishingPhase;
    }

    public getFinishedFraction(): number {
      this.reconcileFinishing();
      return this.finishedFraction;
    }

    public reconcileFinishing(): void {
      if (this._reconcilingFinishing) return;
      const host = this.finishingHost();
      const nowS = nowGameSeconds();
      if (nowS === null) return;
      const material = host.getMaterial();
      const path = material?.getTemplatePath() ?? null;
      this._reconcilingFinishing = true;
      try {
        if (path !== this.finishingMaterialPath) {
          this.startFinishing(material, path, nowS);
          return;
        }
        if (this.finishingStamp === 0) {
          this.finishingStamp = nowS;
          return;
        }
        const fromS = this.finishingStamp;
        if (!(nowS > fromS)) return;
        this.finishingStamp = nowS;
        if (this.finishingPhase !== 'active') return;
        const profile = MaturationProfile.byKey(this.finishingProfileKey);
        if (!profile) return;
        const killK = profile.getKillK();
        let gained = 0;
        for (const s of host.temperatureTrajectory(fromS, nowS).samples(SUB_STEPS)) {
          if (killK !== null && s.value > killK) {
            this.finishingPhase = 'killed';
            return;
          }
          const sat = profile.damageSat(s.value);
          if (sat < this._finishWorst) this._finishWorst = sat;
          gained += profile.rateAt(s.value) * (s.durationS / SECONDS_PER_GAME_DAY);
        }
        this.finishedFraction = Math.min(1, this.finishedFraction + gained);
        if (this.finishedFraction >= 1) this.complete(profile);
      } finally {
        this._reconcilingFinishing = false;
      }
    }

    /** A new material: find its profile, if any, and start from nothing. */
    private startFinishing(material: Material | null, path: string | null, nowS: number): void {
      this.finishingMaterialPath = path;
      this.finishingStamp = nowS;
      this.finishedFraction = 0;
      this._finishWorst = 1;
      const profile = material ? MaturationProfile.forMaterial(material) : null;
      this.finishingProfileKey = profile?.getKey() ?? '';
      this.finishingPhase = profile !== null ? 'active' : 'idle';
    }

    /**
     * ⭐ Done: the product material, the mass the profile keeps, and a band
     * off if it was held too hot. The finish keys itself to the product so
     * the swap does not read as a new material to start over on.
     */
    private complete(profile: MaturationProfile): void {
      const host = this.finishingHost();
      const productPath = profile.getProductMaterial();
      const product = productPath ? StuffApi.findByTemplatePath<Material>(productPath) : null;
      this.finishingPhase = 'finished';
      if (product) {
        this.finishingMaterialPath = productPath;
        host.setMaterial(product);
      }
      const fraction = profile.getProductFraction();
      if (fraction > 0 && fraction < 1) {
        const kg = host.getMass().rawValue();
        if (kg > 0) host.setMass(Quantity.of(kg * fraction, 'kg'));
      }
      if (this._finishWorst < DAMAGE_BAND_AT && MixinApi.isGraded(host)) {
        const i = (GRADE_BANDS as readonly string[]).indexOf(host.getGradeBand());
        host.setGradeBand(GRADE_BANDS[Math.max(0, (i < 0 ? 1 : i) - 1)]!);
      }
    }

    /** The finish in words — what a hand feels in the cloth. */
    public finishingLine(): string {
      const phase = this.getFinishingPhase();
      if (phase === 'finished') return 'It is soft and lustrous, and lighter in the hand than it looks.';
      if (phase === 'killed') return 'It has been boiled too hard; the cloth is harsh and tender.';
      if (phase !== 'active') return '';
      if (this.finishedFraction <= 0) return 'It is stiff in the gum.';
      return this.finishedFraction < 0.5
        ? 'The gum is beginning to come out of it; it is softening.'
        : 'Most of the gum has boiled out of it; it is nearly soft.';
    }
  };
}
