/**
 * FacedMixin — ⭐⭐ **a good has faces, and a face carries coats**
 * (ceramics M6, D5).
 *
 * Every good has an OUTSIDE, and a vessel also has an INSIDE. Each face
 * carries a layer list, outermost first — construction's shape for a wall
 * (`EnclosureSpec`: a material and a thickness), so a building's face and a
 * pot's face are one idea. A face's outermost layer decides what meets the
 * contents (the lead leach, `BulkableMixin.reconcileLeach`), whether the
 * body holds water or weeps (`holdsWater`), and how it cleans.
 *
 * A coat is laid WET (`dip`) and FUSED by heat — the glaze's own material
 * says at what heat (its first `heatTransitions` reference) and past what
 * heat it runs (`scorchAboveK`). At the fuse:
 *
 *  - a coat that shrinks more than its body on cooling (`thermalExpansion`
 *    mismatch above `faces.crazeMismatch`) is `crazed` — it cracks, the pot
 *    weeps a little and dirt lodges;
 *  - one fired past its material's `scorchAboveK` `run`s to the foot and
 *    pools — the piece grades down;
 *  - one laid over dust or grease (`dirtyAtLay` above `faces.crawlDirt`)
 *    `crawl`s back off bare patches.
 *
 * State-free until a coat is laid (`{}`): the claim it makes of every good
 * — *it has an outside, and something may be laid on it* — is true of every
 * good, which is the test for composing on the base. ⚠ Not on `Thing`: a
 * wall, a floor and a fixture take paint through construction's layers.
 */

import type { MixinConstructor, FieldMeta } from '../mixin';
import type { CommandContributions } from '../../api/command';
import type { Stuff } from '../stuff/Stuff';
import type { EnclosureSpec } from '../spatial/Enclosed';
import type Material from './Material';
import { MixinApi } from '../../api/mixin';
import { StuffApi } from '../../api/stuff';
import { AppApi } from '../../api/app';
import { AppSettingKeys } from '../config/AppSettings';
import type { AromaTag } from '../metabolism/DissolvedAromatics';

/** The two faces a good can have. */
export type FaceName = 'outside' | 'inside';

/** What a coat has come to. */
export type CoatState = 'wet' | 'fused' | 'crazed' | 'run' | 'crawled';

/** One coat — construction's layer, with the state a firing gave it. */
export interface CoatLayer extends EnclosureSpec {
  material: string;
  thicknessM: number;
  state: CoatState;
  /** The face's soiling when the coat was laid (crawling reads it at the fuse). */
  dirtyAtLay?: number;
}

export interface Faced {
  /** `outside`, and `inside` when the good holds bulk. */
  faces(): FaceName[];
  /** The coats on a face, outermost first. */
  getCoats(face: FaceName): readonly CoatLayer[];
  /** The material that meets the world at a face: its top coat's, else the body's. */
  outermost(face: FaceName): Material | null;
  /** Lay a WET coat of `materialPath` on a face (outermost). */
  layCoat(face: FaceName, materialPath: string, thicknessM: number, dirtyAtLay?: number): void;
  /** Fuse every wet coat this heat reaches; returns how many changed. */
  fuseCoats(peakK: number): number;
  /** Does this face keep water in? A sound fused coat, or a tight body. */
  holdsWater(face: FaceName): boolean;
  /** The body's open porosity, `0..1` — read off its (fired) material. */
  porosity(): number;
  /** How hard this good is to get clean, `≥ 1` — a crazed coat or a bare porous body holds dirt. */
  cleansAs(): number;
  /** Is any coat on any face still wet? */
  hasWetCoats(): boolean;
  /** The aromas a porous face has kept from what it held (the crock that remembers). */
  absorbedAromas(face: FaceName): readonly AromaTag[];
  /** Record what a porous face keeps — the slot's face exchange writes it. */
  setAbsorbedAromas(face: FaceName, aromas: readonly AromaTag[]): void;
}

function dial(key: string, fallback: number): number {
  try {
    const raw = AppApi.setting(key);
    if (raw == null || raw === '') return fallback;
    const n = Number.parseFloat(raw);
    return Number.isFinite(n) ? n : fallback;
  } catch {
    return fallback;
  }
}

function materialAt(path: string): Material | null {
  return StuffApi.findByTemplatePath<Material>(path) ?? null;
}

export function FacedMixin<TBase extends MixinConstructor<Stuff>>(Base: TBase) {
  class FacedMixin extends Base implements Faced {
    static _mixinName = 'FacedMixin';

    /**
     * ⭐ `dip` is afforded by the thing being dipped — a held mug and a mug
     * on a shelf alike (`environment` + `peers`). A static on the CLASS.
     */
    static commandContributions: CommandContributions = {
      environment: ['platform/cmd/crafting/dip.yaml'],
      peers: ['platform/cmd/crafting/dip.yaml'],
    };

    static fieldMeta: FieldMeta = {
      coats: { persistent: true, authorable: true, runtimeState: true },
      absorbed: { persistent: true, runtimeState: true },
    };

    /** What porous faces have soaked up and keep giving back, by face. */
    public absorbed: Partial<Record<FaceName, AromaTag[]>> = {};

    public absorbedAromas(face: FaceName): readonly AromaTag[] {
      return this.absorbed[face] ?? [];
    }

    public setAbsorbedAromas(face: FaceName, aromas: readonly AromaTag[]): void {
      const kept = aromas.filter((a) => a && a.amount > 1e-6).map((a) => ({ ...a }));
      const next = { ...this.absorbed };
      if (kept.length > 0) next[face] = kept;
      else delete next[face];
      this.absorbed = next;
    }

    /** The coats, by face, outermost first. Empty — no coats — is the default. */
    public coats: Partial<Record<FaceName, CoatLayer[]>> = {};

    public faces(): FaceName[] {
      const self = this as unknown as Stuff;
      return MixinApi.isBulkable(self) && self.hasInteriorBulk()
        ? ['outside', 'inside']
        : ['outside'];
    }

    public getCoats(face: FaceName): readonly CoatLayer[] {
      return this.coats[face] ?? [];
    }

    public hasWetCoats(): boolean {
      return Object.values(this.coats).some((list) => (list ?? []).some((c) => c.state === 'wet'));
    }

    public outermost(face: FaceName): Material | null {
      const top = this.getCoats(face)[0];
      if (top && top.state !== 'crawled') return materialAt(top.material);
      const self = this as unknown as Stuff;
      return MixinApi.isTangible(self) ? self.getMaterial() : null;
    }

    public layCoat(face: FaceName, materialPath: string, thicknessM: number, dirtyAtLay = 0): void {
      if (typeof materialPath !== 'string' || materialPath === '') return;
      const layer: CoatLayer = {
        material: materialPath,
        thicknessM: thicknessM > 0 ? thicknessM : dial(AppSettingKeys.facesDipThicknessM, 0.0003),
        state: 'wet',
      };
      if (dirtyAtLay > 0) layer.dirtyAtLay = dirtyAtLay;
      this.coats = { ...this.coats, [face]: [layer, ...(this.coats[face] ?? [])] };
    }

    public fuseCoats(peakK: number): number {
      if (!(peakK > 0)) return 0;
      const self = this as unknown as Stuff;
      const body = MixinApi.isTangible(self) ? self.getMaterial() : null;
      const bodyAlpha = body?.getThermalExpansion() ?? 0;
      const crawlAt = dial(AppSettingKeys.facesCrawlDirt, 0.3);
      const crazeAt = dial(AppSettingKeys.facesCrazeMismatch, 1.5e-6);
      let changed = 0;
      const next: Partial<Record<FaceName, CoatLayer[]>> = {};
      for (const [face, list] of Object.entries(this.coats) as [FaceName, CoatLayer[]][]) {
        next[face] = (list ?? []).map((coat) => {
          if (coat.state !== 'wet') return coat;
          const mat = materialAt(coat.material);
          const spec = mat?.getHeatTransitions()[0]?.toSpec();
          const fuseK = spec?.referenceK ?? mat?.getMeltingPoint().rawValue() ?? 0;
          if (!(fuseK > 0) || peakK < fuseK) return coat;
          changed += 1;
          if (spec?.scorchAboveK !== undefined && peakK > spec.scorchAboveK) {
            return { ...coat, state: 'run' as const };
          }
          if ((coat.dirtyAtLay ?? 0) > crawlAt) return { ...coat, state: 'crawled' as const };
          const coatAlpha = mat?.getThermalExpansion() ?? 0;
          if (coatAlpha - bodyAlpha > crazeAt) return { ...coat, state: 'crazed' as const };
          return { ...coat, state: 'fused' as const };
        });
      }
      if (changed > 0) this.coats = next;
      return changed;
    }

    public porosity(): number {
      const self = this as unknown as Stuff;
      const mat = MixinApi.isTangible(self) ? self.getMaterial() : null;
      if (mat === null || !mat.hasTag('porous') && !mat.hasTag('fired')) return 0;
      return Math.max(0, mat.getWaterAbsorptionCapacity().rawValue()) / 100;
    }

    public holdsWater(face: FaceName): boolean {
      // ⭐ A crack through the wall leaks whatever is laid on it (M5).
      const self = this as unknown as Stuff;
      if (MixinApi.isTangible(self) && self.getFlaws().some((f) => f.kind === 'crack')) return false;
      const top = this.getCoats(face)[0];
      if (top !== undefined) {
        if (top.state === 'fused') return true;
        if (top.state === 'run') return true;
      }
      return this.porosity() <= dial(AppSettingKeys.facesHoldsWaterBelow, 0.03);
    }

    public cleansAs(): number {
      const coats = [...this.getCoats('outside'), ...this.getCoats('inside')];
      if (coats.some((c) => c.state === 'crazed')) return 2;
      if (coats.length === 0 && this.porosity() > dial(AppSettingKeys.facesHoldsWaterBelow, 0.03)) {
        return 1.5;
      }
      return 1;
    }
  }
  return FacedMixin;
}
