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
import { Paint } from './Paint';
import type { ActPlan, ActRefusal } from '../craft/ActPlan';
import { Mml } from '../../api/mml';
import { MessageApi } from '../../api/message';
import { Quantity } from '../quantity';
import type { PaintMakeup } from './Paint';

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
  /** ⭐ What a paint coat was made of — the pot's makeup, kept (paint D8). */
  paint?: PaintMakeup;
  /** Words lettered in the coat (`write … with paint`) — they go when it does. */
  marks?: string;
  /** The sun this coat has had, `0..1` — a fugitive pigment fades by it (paint D5). */
  faded?: number;
}

/**
 * ⭐ One stretch of the AIR a coat sits in (paint build D4): how long, how
 * warm, how humid, whether rain is falling on it, and how freely the air
 * changes (`1` in the open; an indoor room's air changes per hour over
 * four, capped at `1`). A coat that sets by the air reads these; a coat
 * that sets by heat never does.
 */
export interface CoatAir {
  seconds: number;
  kelvin: number;
  /** Relative humidity, `0..1`. */
  rh: number;
  rain: boolean;
  airChange: number;
}

/** What `paint` asks of the thing painted (paint D9). */
export interface CoatRequest {
  actor: Stuff;
  /** The vessel whose liquid is brushed on. */
  source: Stuff;
  /** The brush in hand. */
  brush: Stuff;
}

/** What an air window did to the coats. */
export interface AirCoatResult {
  /** How many coats set (or set badly). */
  set: number;
  /** Heat an oxidizing coat gave off, J per m² of face. */
  heatJPerM2: number;
}

export interface Faced {
  /** `outside`, and `inside` when the good holds bulk. */
  faces(): FaceName[];
  /** The coats on a face, outermost first. */
  getCoats(face: FaceName): readonly CoatLayer[];
  /** The material that meets the world at a face: its top coat's, else the body's. */
  outermost(face: FaceName): Material | null;
  /** Lay a WET coat of `materialPath` on a face (outermost). */
  layCoat(face: FaceName, materialPath: string, thicknessM: number, dirtyAtLay?: number, paint?: PaintMakeup): void;
  /**
   * ⭐ Advance every wet coat that sets by the AIR over `segments` (paint
   * D4): carbonation and oxidation want air and time, drying and solvent
   * want dry air; rain on a wet coat runs it and frost crazes it. A coat
   * that sets by heat is untouched (`heatCoats`'s).
   */
  airCoats(segments: readonly CoatAir[]): AirCoatResult;
  /** The area of a face, m² — a good's skin (`6·V^⅔`); a building's walls and roof. */
  coatAreaM2(): number;
  /** Are this thing's coats kept in its record? A good's always; a staged building's not (paint D7). */
  persistsCoats(): boolean;
  /**
   * ⭐ Plan one brushed coat from `req.source` (paint D9) — the thing
   * painted decides: how much surface it has, how much paint that takes,
   * whether the painter can reach it. Refuses in words.
   */
  coatPlanFor(req: CoatRequest): Promise<ActPlan | ActRefusal>;
  /** Why `actor` cannot reach this thing's outside to paint it, or `null`. */
  coatReachRefusal(actor: Stuff): ActRefusal | null;
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

/**
 * ⭐ The look line for one coat. A PAINT coat says its color and what it
 * is (paint D8): *"It is painted yellow on the outside: yellow ochre in
 * linseed oil."* Anything else is the state's line.
 */
function coatLine(top: CoatLayer, face: FaceName): string {
  const m = materialAt(top.material);
  if (top.paint === undefined) return COAT_WORDS[top.state](m, face);
  const paint = new Paint(top.paint);
  const what = paint.words(top.faded ?? 0);
  const faded = (top.faded ?? 0) * (1 - paint.lightfastness()) > 0.25 ? ', faded by the sun' : '';
  switch (top.state) {
    case 'set':
      return `It is ${paint.coatWord()} ${paint.colorTag(top.faded ?? 0)} on the ${face}${faded} — ${what}.`;
    case 'wet':
      return `It has a wet coat of ${what} on the ${face}, not yet set.`;
    default:
      return COAT_WORDS[top.state](m, face);
  }
}

/** Is any pigment in this paint a lead one (tagged `lead`)? */
function leadIn(makeup: PaintMakeup): boolean {
  return makeup.pigments.some((p) => p.share > 0 && (materialAt(p.material)?.hasTag('lead') ?? false));
}

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
    lines.push(coatLine(top, face));
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

    /**
     * The coats' slice — the declared fields, unless the host says its coats
     * are not kept (a staged ship's hull, paint D7). Plain JSON either way.
     */
    static captureSlice(host: Stuff): { fields: Record<string, unknown> } {
      const self = host as unknown as Faced & { coats: unknown; absorbed: unknown };
      if (!self.persistsCoats()) return { fields: {} };
      return { fields: { coats: structuredClone(self.coats), absorbed: structuredClone(self.absorbed) } };
    }

    /** @hook Why `actor` cannot reach this to paint it — `null` (a good in reach can be). */
    public coatReachRefusal(_actor: Stuff): ActRefusal | null {
      return null;
    }

    /**
     * @hook One brushed coat (paint D9). A brush lays a wet film
     * `structure.paint.coatThicknessM` thick over {@link coatAreaM2}; what
     * stays when it sets is that film × the paint's solids. The pot gives
     * up exactly that many litres; a pot with less coats nothing.
     */
    public async coatPlanFor(req: CoatRequest): Promise<ActPlan | ActRefusal> {
      const self = this as unknown as Stuff & Faced;
      const reach = this.coatReachRefusal(req.actor);
      if (reach !== null) return reach;
      const src = req.source;
      if (!MixinApi.isBulkable(src) || !src.hasInteriorBulk()) {
        return { ok: false, reason: 'not-paint', line: Mml.compose`There is nothing in ${Mml.thing(src)} to paint with.` };
      }
      const material = src.getBulkMaterial('interior');
      if (material === null || !material.getLaysCoat()) {
        return {
          ok: false,
          reason: 'not-paint',
          line: Mml.compose`What is in ${Mml.thing(src)} will not lay a coat — it runs off and leaves nothing behind.`,
        };
      }
      const area = this.coatAreaM2();
      if (!(area > 0)) {
        return { ok: false, reason: 'nothing-to-cover', line: Mml.compose`There is nothing of ${Mml.thing(self)} a brush could cover.` };
      }
      const film = dial(AppSettingKeys.structurePaintCoatThicknessM, 0.00005);
      const litres = area * film * 1000;
      const held = src.getBulkAmount('interior').rawValue();
      if (held + 1e-9 < litres) {
        const want = litres >= 1 ? `about ${Math.round(litres)} litres` : 'more than that';
        return {
          ok: false,
          reason: 'source-too-low',
          line: Mml.compose`There is not enough in ${Mml.thing(src)} to give ${Mml.thing(self)} a coat — it would take ${want}.`,
        };
      }
      const makeup = src.getBulk('interior').getPayload()?.paint;
      const solids = makeup?.solidsFraction ?? Math.min(0.9, Math.max(0.1, material.getSolidsKgPerL() || 0.4));
      const setM = film * solids;
      // ⭐ A paint's coat is its BINDER's: the binder sets and weathers it;
      // the makeup keeps the pigments for its color (paint D8).
      const path = makeup?.binder || (material.getTemplatePath() ?? '');
      const what = makeup ? new Paint(makeup).words() : material.getName() || 'paint';
      const giver = req.actor;
      // A minute to brush a board; an hour and more for a house front.
      const durationMs = Math.round(Math.min(2 * 3_600_000, Math.max(30_000, area * 45_000)));
      return {
        ok: true,
        durationMs,
        effortW: 120,
        beginSelf: Mml.compose`You load the brush from ${Mml.thing(src)} and start laying the coat on ${Mml.thing(self)}.`,
        beginPeers: Mml.compose`${Mml.actor(giver)} starts painting ${Mml.thing(self)}.`,
        onComplete: () => {
          if (self.isDestroyed() || src.isDestroyed() || !MixinApi.isBulkable(src)) return undefined;
          const have = src.getBulkAmount('interior').rawValue();
          if (have + 1e-9 < litres) {
            return { ok: false, reason: 'source-too-low', line: Mml.compose`The pot runs dry before the coat is on.` };
          }
          // ⭐ Walk the weather UP TO NOW first, so the rain of last week
          // does not fall on a coat laid today.
          if (MixinApi.isWeathering(self)) self.reconcileWeather();
          src.setBulkAmount('interior', Quantity.of(have - litres, 'L'));
          const soil = MixinApi.isSoilable(self) ? Math.max(self.soilAt('outside'), self.soilAt('')) : 0;
          self.layCoat('outside', path, setM, soil, makeup);
          // ⭐ Lead paint on the brush is lead on the hands (paint D14): the
          // body takes a dose by the litre; a glove halves it.
          if (makeup !== undefined && leadIn(makeup) && MixinApi.isMetabolic(giver)) {
            const gloved =
              MixinApi.isAttired(giver) && giver.handSites().some((h) => giver.outermostAt(h) !== null);
            giver.addToxinBurden('lead', litres * dial(AppSettingKeys.metabolismLeadSkinDosePerL, 0.6) * (gloved ? 0.5 : 1));
          }
          if (!giver.isDestroyed()) {
            MessageApi.scene(giver)
              .topic('act.deed')
              .toSelf(Mml.compose`${Mml.thing(self)} stands under a wet coat of ${what}. Let it set; keep the rain off it.`)
              .toPeers(Mml.compose`${Mml.actor(giver)} finishes a coat on ${Mml.thing(self)}.`)
              .send();
          }
          return undefined;
        },
      };
    }

    /** @hook Are the coats kept in this thing's record? Default yes. */
    public persistsCoats(): boolean {
      return true;
    }

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

    public layCoat(face: FaceName, materialPath: string, thicknessM: number, dirtyAtLay = 0, paint?: PaintMakeup): void {
      if (typeof materialPath !== 'string' || materialPath === '') return;
      const layer: CoatLayer = {
        material: materialPath,
        thicknessM: thicknessM > 0 ? thicknessM : dial(AppSettingKeys.facesDipThicknessM, 0.0003),
        state: 'wet',
      };
      if (dirtyAtLay > 0) layer.dirtyAtLay = dirtyAtLay;
      if (paint !== undefined) layer.paint = { ...paint, pigments: paint.pigments.map((p) => ({ ...p })) };
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
          // A coat the AIR sets is `airCoats`'s, never the fire's.
          if (change?.setsByAir()) return coat;
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
          if (change?.setsByAir()) return coat;
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
          if (mat === null || mat.getKinetics()?.setsByHeat() || mat.getKinetics()?.airSet()) return coat;
          const melts = mat.getMeltingPoint().rawValue();
          if (!(melts > atK)) return coat;
          changed += 1;
          return this.fusedCoat(coat, mat, null, melts);
        });
      }
      if (changed > 0) this.coats = next;
      return changed;
    }

    public airCoats(segments: readonly CoatAir[]): AirCoatResult {
      let set = 0;
      let heatJPerM2 = 0;
      let touched = false;
      const next: Partial<Record<FaceName, CoatLayer[]>> = {};
      for (const [face, list] of Object.entries(this.coats) as [FaceName, CoatLayer[]][]) {
        next[face] = (list ?? []).map((coat) => {
          if (coat.state !== 'wet') return coat;
          const mat = materialAt(coat.material);
          const change = mat?.getKinetics()?.airSet() ?? null;
          if (mat === null || change === null) return coat;
          const sets = change.getSets();
          let extent = coat.progress?.extent ?? 0;
          let out: CoatLayer = coat;
          for (const seg of segments) {
            if (!(seg.seconds > 0)) continue;
            // ⭐ Rain on a wet coat washes it down; frost on one cracks it
            // as the water in it freezes — the shipped fault states.
            if (seg.rain) {
              out = { ...out, state: 'run' };
              break;
            }
            if (seg.kelvin < 273.15) {
              out = { ...out, state: 'crazed' };
              break;
            }
            const f =
              sets === 'carbonation'
                ? Math.min(1, Math.max(0, seg.airChange))
                : sets === 'oxidation'
                  ? Math.min(1, Math.max(0.1, seg.airChange))
                  : Math.max(0, 1 - seg.rh);
            if (!(f > 0)) continue;
            const before = extent;
            extent = change.advance(extent, (change.rateAt(seg.kelvin) * f * seg.seconds) / 3_600);
            const density = mat.getDensity().rawValue() || 900;
            heatJPerM2 += (extent - before) * coat.thicknessM * density * change.getExothermicJPerKg();
            if (extent + 1e-9 >= 1) break;
          }
          touched = true;
          if (out.state !== 'wet') {
            set += 1;
            return out;
          }
          const progress = { extent };
          if (extent + 1e-9 < 1) return { ...out, progress };
          set += 1;
          const dirty = (coat.dirtyAtLay ?? 0) > dial(AppSettingKeys.facesCrawlDirt, 0.3);
          return { ...out, progress, state: dirty ? 'crawled' : 'set' };
        });
      }
      if (touched) this.coats = next;
      return { set, heatJPerM2 };
    }

    /** @hook A face's area — a good's skin, `6·V^⅔` off its mass and material; a building overrides it. */
    public coatAreaM2(): number {
      const self = this as unknown as Stuff;
      if (!MixinApi.isTangible(self)) return 0;
      const kg = self.getMass().rawValue();
      const density = self.getMaterial()?.getDensity().rawValue() || 2000;
      return 6 * Math.pow(Math.max(0, kg / density), 2 / 3);
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
