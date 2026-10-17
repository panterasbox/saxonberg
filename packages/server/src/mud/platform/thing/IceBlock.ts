/**
 * IceBlock — a piece of ice you can carry: a squared block cut from a
 * sheet or set in an ice pan, or a lump a pail froze into. ⭐ Both the
 * `ice-block` and the `ice-lump` rows name this class — a lump is ice, so
 * it claims no temper, melts through the shipped plateau like any
 * `Casting`, and pools in a store by its grade.
 *
 * `iceQuality` is the grade the trade sold by: **black** (clear, hard,
 * frozen under bare sky), **snow-ice** (frozen under snow, white and
 * soft), or **cloudy** (pan ice — the DEFAULT, because a block that was
 * not cut from a sheet set in a pan or a pail, and the freeze needs no
 * hook to say so). The cut stamps the patch's grade (storage-and-ice D17).
 *
 * ## In a store (D2, D17)
 *
 * Pools as `ice|<quality>` — a lump and a block of one grade are the same
 * matter and share a line. A line of ice in a store follows the plateau:
 * below its melting point it relaxes toward the room's air through its
 * packing (`τ = m·c / G`); at the plateau the heat that comes in through
 * the packing melts it (`melt = G·(T_room − T_mp)·dt / L`). `G =
 * surface / (depth/k + R_films)` — so a big stack, which has little
 * surface for its mass, keeps far better than a small one, and a soaked
 * packing, which conducts like water, lets the summer in.
 */

import type { FieldMeta } from '../../lib/mixin';
import Casting from './Casting';
import { PoolableMixin, type StoreConditions, type StoreResponse } from '../../lib/storage/Poolable';
import type { PoolRole } from '../../lib/storage/StoreLine';
import { AppApi } from '../../api/app';
import { AppSettingKeys } from '../../lib/config/AppSettings';

/** The grade natural ice was sold by. Closed: the trade's three words. */
export type IceQuality = 'black' | 'snow-ice' | 'cloudy';

/** The three grades, in the order the trade priced them. */
export const ICE_QUALITIES: readonly IceQuality[] = ['black', 'snow-ice', 'cloudy'];

/** Fallbacks when the material row says nothing (ice's own figures). */
const ICE_MP_K = 273.15;
const ICE_LATENT_J_PER_KG = 334_000;
const ICE_C_J_PER_KG_K = 2100;

const IceBlockBase = PoolableMixin(Casting);

export default class IceBlock extends IceBlockBase {
  static fieldMeta: FieldMeta = {
    iceQuality: { persistent: true, authorable: true },
  };

  public iceQuality: IceQuality = 'cloudy';

  /** The grade this ice was cut or set at. */
  public getIceQuality(): IceQuality {
    return this.iceQuality;
  }

  /** Stamp the grade (a cut stamps its patch's). Unknown words read cloudy. */
  public setIceQuality(quality: IceQuality): void {
    this.iceQuality = ICE_QUALITIES.includes(quality) ? quality : 'cloudy';
  }

  // ───────────────────────── Poolable ─────────────────────────

  /** ⭐ Ice pools by its grade, whatever its shape (D2). */
  public override poolKey(): string {
    return `ice|${this.iceQuality}`;
  }

  public override applyPoolKey(poolKey: string): void {
    const grade = poolKey.split('|')[1];
    if (grade) this.setIceQuality(grade as IceQuality);
  }

  public override poolState(): Record<string, number> {
    return { temperatureK: this.getTemperature().rawValue() };
  }

  public override applyPoolState(state: Record<string, number>): void {
    const t = state.temperatureK;
    if (typeof t === 'number' && Number.isFinite(t) && t > 0) {
      this.setStampedTemperatureK(t);
      this.setLastAmbientK(t);
    }
  }

  public override poolRole(): PoolRole {
    return 'stock';
  }

  /** At its plateau a line of ice anchors its room's air at its melting point. */
  public override storeAnchorK(state: Record<string, number>): number | null {
    const mp = this.meltingPointK();
    const t = state.temperatureK ?? mp;
    return t >= mp - 0.05 ? mp : null;
  }

  /** ⭐ The plateau physics — see the class docstring. */
  public override reconcileInStore(ctx: StoreConditions): StoreResponse {
    const mp = this.meltingPointK();
    const latent = this.latentJPerKg();
    const c = this.specificHeat();
    const rFilms = dial(AppSettingKeys.envelopeSurfaceResistanceM2KPerW, 0.17);
    const r = (ctx.packing && ctx.packing.kWmK > 0 ? ctx.packing.depthM / ctx.packing.kWmK : 0) + rFilms;
    const g = ctx.surfaceM2 > 0 ? ctx.surfaceM2 / r : 0;
    let mass = ctx.massKg;
    let t = ctx.state.temperatureK ?? mp;
    let dt = ctx.dtS;
    let heatJ = 0;
    let meltKg = 0;
    if (!(g > 0) || !(mass > 0) || !(dt > 0)) {
      return { massKg: mass, state: { ...ctx.state, temperatureK: t }, heatW: 0, meltwaterKg: 0 };
    }

    // Below the plateau: relax toward the air, and stop at the melting
    // point if the air is warmer than it.
    if (t < mp - 1e-9) {
      const tau = (mass * c) / g;
      const target = ctx.ambientK;
      if (target <= mp) {
        const t2 = target + (t - target) * Math.exp(-dt / tau);
        heatJ += mass * c * (t2 - t);
        t = t2;
        dt = 0;
      } else {
        // Time to reach the plateau: (mp − T∞) = (t − T∞)·e^(−s/τ).
        const s = tau * Math.log((t - target) / (mp - target));
        const used = Math.min(dt, Math.max(0, s));
        const t2 = used >= dt ? target + (t - target) * Math.exp(-dt / tau) : mp;
        heatJ += mass * c * (t2 - t);
        t = Math.min(t2, mp);
        dt -= used;
      }
    }

    // At the plateau: the heat that comes in melts it; cold air cools it.
    if (dt > 0) {
      if (ctx.ambientK > mp) {
        const q = g * (ctx.ambientK - mp) * dt;
        meltKg = Math.min(mass, q / latent);
        heatJ += meltKg * latent;
        mass -= meltKg;
        t = mp;
      } else if (ctx.ambientK < mp) {
        const tau = (mass * c) / g;
        const t2 = ctx.ambientK + (mp - ctx.ambientK) * Math.exp(-dt / tau);
        heatJ += mass * c * (t2 - mp);
        t = t2;
      }
    }

    return {
      massKg: Math.max(0, mass),
      state: { ...ctx.state, temperatureK: t },
      heatW: ctx.dtS > 0 ? heatJ / ctx.dtS : 0,
      meltwaterKg: meltKg,
    };
  }

  private meltingPointK(): number {
    const m = this.getMaterial();
    const mp = m?.getMeltingPoint().rawValue() ?? 0;
    // The material's own plateau (the one `Thermal` melts a loose block
    // at), so the store and the face can never disagree about it.
    return mp > 0 ? mp : ICE_MP_K;
  }

  private latentJPerKg(): number {
    const l = this.getMaterial()?.getLatentHeatOfFusion?.().rawValue() ?? 0;
    return l > 0 ? l : ICE_LATENT_J_PER_KG;
  }

  private specificHeat(): number {
    const cp = this.getMaterial()?.getSpecificHeat().rawValue() ?? 0;
    return cp > 0 ? cp : ICE_C_J_PER_KG_K;
  }
}

function dial(key: string, fallback: number): number {
  try {
    const raw = AppApi.setting(key);
    if (raw === '' || raw == null) return fallback;
    const n = Number.parseFloat(raw);
    return Number.isFinite(n) ? n : fallback;
  } catch {
    return fallback;
  }
}
