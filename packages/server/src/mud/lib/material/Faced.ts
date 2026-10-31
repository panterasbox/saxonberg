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
 * says at what heat (its first `kinetics` change's reference) and past what
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
import type { Stuff } from '../stuff/Stuff';
import type { EnclosureSpec } from '../spatial/Enclosed';
import type Material from './Material';
import type { KineticChange, KineticProgress } from './Kinetics';
import { MixinApi } from '../../api/mixin';
import { StuffApi } from '../../api/stuff';
import { AppApi } from '../../api/app';
import { AppSettingKeys } from '../config/AppSettings';
import type { AromaTag } from '../metabolism/DissolvedAromatics';
import type { MarkupAugmenter } from '../../api/mml';

/** The two faces a good can have. */
export type FaceName = 'outside' | 'inside';

/** What a coat has come to. */
export type CoatState = 'wet' | 'set' | 'crazed' | 'run' | 'crawled';

/** Is `s` a {@link CoatState}? Exhaustive over the type, so it moves with it. */
function isCoatState(s: unknown): s is CoatState {
  const state = s as CoatState;
  switch (state) {
    case 'wet':
    case 'set':
    case 'crazed':
    case 'run':
    case 'crawled':
      return true;
    default: {
      const never: never = state;
      return never !== never;
    }
  }
}

/** One coat — construction's layer, with the state a firing gave it. */
export interface CoatLayer extends EnclosureSpec {
  material: string;
  thicknessM: number;
  state: CoatState;
  /** The face's soiling when the coat was laid (crawling reads it at the fuse). */
  dirtyAtLay?: number;
  /**
   * ⭐ How far a wet coat has gone toward fusing — its material's kinetic
   * progress (a dose law's banked dose and its degree), advanced by HEAT-WORK
   * like the body under it (B100). Absent until heat reaches it.
   */
  progress?: { extent: number; dose?: number };
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
  /**
   * ⭐ Advance every wet coat by HEAT-WORK over a window (B100): `integrate`
   * is ∫ rate(T) dt over the window for a kinetic change — the same integral
   * the body under it fires by — and `peakK` the window's peak, which only
   * decides HOW a fused coat came out (run past its scorch). A coat whose
   * material has no kinetic law fuses at its melting point. Returns how
   * many coats fused.
   */
  heatCoats(integrate: (change: KineticChange) => number, peakK: number): number;
  /**
   * Fuse every wet coat AT ONCE, at `peakK` — only for a coat laid by the
   * heat itself (a vapor glaze: salt thrown into a kiln at peak deposits
   * already fused). A coat laid by hand fuses by heat-work (`heatCoats`).
   */
  fuseCoats(peakK: number): number;
  /**
   * ⭐ Set every wet coat that sets by COOLING (cordage D13′): a coat whose
   * material has no heat-set law and melts above `atK` — pitch drawn out of
   * a hot tub — is set the moment it is that cold. Returns how many set.
   */
  coolCoats(atK: number): number;
  /** Does this face keep water in? A sound fused coat, or a tight body. */
  holdsWater(face: FaceName): boolean;
  /** The body's open porosity, `0..1` — read off its (fired) material. */
  porosity(): number;
  /** How hard this good is to get clean, `≥ 1` — a crazed coat or a bare porous body holds dirt. */
  cleansAs(): number;
  /** Is any coat on any face still wet? */
  hasWetCoats(): boolean;
  /**
   * Does this vessel hold a liquid its porous body lets through? Its
   * outside is a wet film for as long as it does (the weeping jar).
   */
  /**
   * Does the WALL let water through — either face open (no tight coat over
   * a porous body, or an open crack)? The face's half of a weep, without
   * reading the contents (the bulk's own exchange asks it from inside its
   * reconcile).
   */
  isPermeable(): boolean;
  weeps(): boolean;
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

/**
 * A coat's state, in the words a look gives it. ⭐ The word for a sound coat
 * is the coat MATERIAL's (`coatWord` — glazed, painted, tarred), and a wet
 * one says what will set it: the fire, for a coat whose material sets by
 * heat. The faults are every coat's — paint crazes, crawls and runs too.
 */
const COAT_WORDS: Record<CoatState, (coat: Material | null, face: FaceName) => string> = {
  wet: (m, f) =>
    `It has a wet coat of ${nameOf(m)} on the ${f}, not yet ${
      m?.getKinetics()?.setsByHeat() ? 'fired' : 'set'
    }.`,
  set: (m, f) => `It is ${m?.getCoatWord() ?? 'coated'} on the ${f} with ${nameOf(m)}.`,
  crazed: (m, f) => `The ${nameOf(m)} on its ${f} is crazed with fine cracks.`,
  run: (m, f) => `The ${nameOf(m)} on its ${f} has run and pooled toward the foot.`,
  crawled: (m, f) => `The ${nameOf(m)} on its ${f} has crawled back off bare patches.`,
};

function nameOf(m: Material | null): string {
  return m?.getName() || 'coating';
}

/**
 * ⭐ What a look says of the coats: the outermost on each face, wet or
 * fired and how it came out. Before this nothing described a coat at all —
 * a glazed crock read exactly as a bare one (the ceramics drive C, run 37;
 * run 36 had passed only because "froze wet" matched).
 */
const coatAugmenter: MarkupAugmenter = (text, host, _viewer, opts) => {
  if (opts?.filter) return text;
  if (!MixinApi.isFaced(host)) return text;
  const lines: string[] = [];
  for (const face of host.faces()) {
    const top = host.getCoats(face)[0];
    if (!top) continue;
    lines.push(COAT_WORDS[top.state](materialAt(top.material), face));
  }
  // ⭐ A weeping vessel's outside is wet for as long as it weeps — the one
  // rule the evaporative cooling reads too (drive C, run 37: the jar of
  // water read "thoroughly dried" while the thermometer found it cool).
  if (host.weeps()) lines.push('Its outside is damp and beaded where what it holds seeps through.');
  if (lines.length === 0) return text;
  const all = lines.join(' ');
  return text && text.length > 0 ? `${text}\n\n${all}` : all;
};

export function FacedMixin<TBase extends MixinConstructor<Stuff>>(Base: TBase) {
  class FacedMixin extends Base implements Faced {
    static _mixinName = 'FacedMixin';


    static markupAugmenters: MarkupAugmenter[] = [coatAugmenter];

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

    /**
     * Author the coats (the applier's setter). ⚠ A state that is not a
     * {@link CoatState} throws: eleven rows kept `fused` after it was
     * renamed `set`, and every one of those glazed goods read as a bare
     * porous body (the ceramics finalize).
     */
    public setCoats(value: Partial<Record<FaceName, CoatLayer[]>>): void {
      for (const [face, list] of Object.entries(value ?? {})) {
        for (const c of list ?? []) {
          if (!isCoatState(c.state)) {
            throw new TypeError(`Faced: a coat on the ${face} is '${String(c.state)}', which is no coat state`);
          }
        }
      }
      this.coats = value ?? {};
    }

    public faces(): FaceName[] {
      const self = this as unknown as Stuff;
      return MixinApi.isBulkable(self) && self.hasInteriorBulk()
        ? ['outside', 'inside']
        : ['outside'];
    }

    public weeps(): boolean {
      const self = this as unknown as Stuff;
      if (!MixinApi.isBulkable(self) || !self.hasInteriorBulk()) return false;
      const held = self.getBulkMaterial('interior');
      if (held === null || !held.hasTag('liquid')) return false;
      if (!(self.getBulkAmount('interior').rawValue() > 0)) return false;
      return this.isPermeable();
    }

    public isPermeable(): boolean {
      return !this.holdsWater('outside') || !this.holdsWater('inside');
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

    public heatCoats(integrate: (change: KineticChange) => number, peakK: number): number {
      let fused = 0;
      let touched = false;
      const next: Partial<Record<FaceName, CoatLayer[]>> = {};
      for (const [face, list] of Object.entries(this.coats) as [FaceName, CoatLayer[]][]) {
        next[face] = (list ?? []).map((coat) => {
          if (coat.state !== 'wet') return coat;
          const mat = materialAt(coat.material);
          const change = mat?.getKinetics()?.changes()[0];
          if (change === undefined) {
            // No heat-work law: the melt point alone decides.
            const melts = mat?.getMeltingPoint().rawValue() ?? 0;
            if (!(melts > 0) || peakK < melts) return coat;
            fused += 1;
            touched = true;
            return this.fusedCoat(coat, mat ?? null, null, peakK);
          }
          const integral = integrate(change);
          if (!(integral > 0)) return coat;
          const prev: KineticProgress = { extent: coat.progress?.extent ?? 0, rung: -1 };
          if (coat.progress?.dose !== undefined) prev.dose = coat.progress.dose;
          const conv = change.accrue(prev, integral, 1);
          touched = true;
          const at = change.getLadder()[0]?.atDegree ?? 1;
          const progress = { extent: conv.extent, ...(conv.dose !== undefined ? { dose: conv.dose } : {}) };
          if (conv.extent + 1e-9 < at) return { ...coat, progress };
          fused += 1;
          return this.fusedCoat({ ...coat, progress }, mat ?? null, change, peakK);
        });
      }
      if (touched) this.coats = next;
      return fused;
    }

    public fuseCoats(peakK: number): number {
      if (!(peakK > 0)) return 0;
      let changed = 0;
      const next: Partial<Record<FaceName, CoatLayer[]>> = {};
      for (const [face, list] of Object.entries(this.coats) as [FaceName, CoatLayer[]][]) {
        next[face] = (list ?? []).map((coat) => {
          if (coat.state !== 'wet') return coat;
          const mat = materialAt(coat.material);
          const change = mat?.getKinetics()?.changes()[0] ?? null;
          const fuseK = change?.getReferenceK() ?? mat?.getMeltingPoint().rawValue() ?? 0;
          if (!(fuseK > 0) || peakK < fuseK) return coat;
          changed += 1;
          return this.fusedCoat(coat, mat ?? null, change, peakK);
        });
      }
      if (changed > 0) this.coats = next;
      return changed;
    }

    public coolCoats(atK: number): number {
      let changed = 0;
      const next: Partial<Record<FaceName, CoatLayer[]>> = {};
      for (const [face, list] of Object.entries(this.coats) as [FaceName, CoatLayer[]][]) {
        next[face] = (list ?? []).map((coat) => {
          if (coat.state !== 'wet') return coat;
          const mat = materialAt(coat.material);
          if (mat === null || mat.getKinetics()?.setsByHeat()) return coat;
          const melts = mat.getMeltingPoint().rawValue();
          if (!(melts > atK)) return coat;
          changed += 1;
          return this.fusedCoat(coat, mat, null, melts);
        });
      }
      if (changed > 0) this.coats = next;
      return changed;
    }

    /**
     * How a coat came out when it fused: run (fired past its scorch), crawled
     * (laid over dirt), crazed (it shrinks more than its body), else set.
     */
    private fusedCoat(coat: CoatLayer, mat: Material | null, change: KineticChange | null, peakK: number): CoatLayer {
      const self = this as unknown as Stuff;
      const body = MixinApi.isTangible(self) ? self.getMaterial() : null;
      const bodyAlpha = body?.getThermalExpansion() ?? 0;
      const scorchK = change?.getScorchAboveK() ?? null;
      if (scorchK !== null && peakK > scorchK) return { ...coat, state: 'run' };
      if ((coat.dirtyAtLay ?? 0) > dial(AppSettingKeys.facesCrawlDirt, 0.3)) return { ...coat, state: 'crawled' };
      const coatAlpha = mat?.getThermalExpansion() ?? 0;
      if (coatAlpha - bodyAlpha > dial(AppSettingKeys.facesCrazeMismatch, 1.5e-6)) return { ...coat, state: 'crazed' };
      return { ...coat, state: 'set' };
    }

    public porosity(): number {
      const self = this as unknown as Stuff;
      const mat = MixinApi.isTangible(self) ? self.getMaterial() : null;
      if (mat === null || !mat.hasTag('porous') && !mat.hasTag('fired')) return 0;
      return Math.max(0, mat.getWaterAbsorptionCapacity().rawValue()) / 100;
    }

    public holdsWater(face: FaceName): boolean {
      // ⭐ An OPEN crack through the wall leaks whatever is laid on it (M5).
      // A riveted one holds — what a tinker's rivets (and the putty under
      // the staples) are for; the mould reads the same rule (B100).
      const self = this as unknown as Stuff;
      if (MixinApi.isIntegrity(self) && self.getFlaws().some((f) => f.kind === 'crack' && !f.mended)) return false;
      // ⭐ A sound coat holds water when its MATERIAL is tight — a glaze is,
      // a limewash would not be; a run coat still covers. Crazed and crawled
      // coats have opened, and the body answers.
      const tight = dial(AppSettingKeys.facesHoldsWaterBelow, 0.03);
      const top = this.getCoats(face)[0];
      if (top !== undefined && (top.state === 'set' || top.state === 'run')) {
        const coat = materialAt(top.material);
        if (coat !== null && coat.getWaterAbsorptionCapacity().rawValue() / 100 <= tight) return true;
      }
      return this.porosity() <= tight;
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
