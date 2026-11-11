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
 *
 * ⭐⭐ **The weather** (paint D5, folded in at review): an outside coat
 * thins where the weather reaches it at its material's rate
 * (`Material.weatheringMPerGameYear`), outermost first, and fades where the
 * sun does — {@link Faced.reconcileWeather}. It is decomposition's exposure
 * clock for a coat: indoors, in a pack or on a rack the weather reaches
 * nothing and nothing changes (Law 2 holds by construction). What the
 * weather does to the BODY once its coat is gone is the host's
 * ({@link Faced.bareWearPerDay}): a building wears; a good does not yet.
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
import type { ActOutcome, ActPlan, ActRefusal } from '../craft/ActPlan';
import { Quantity } from '../quantity';
import type { PaintMakeup } from './Paint';
import { BiomeApi } from '../../api/biome';
import { WorldClockApi } from '../../api/worldclock';
import { MaterialApi } from '../../api/material';

/** Game seconds in a game year (the calendar's 360 days). */
const GAME_YEAR_S = 360 * 86_400;

const GAME_DAY_S = 86_400;

/** How much of the weather a face out under a roof in the open air still meets. */
const SHELTERED_EXPOSURE = 0.3;

/** A coat that set badly has opened: it weathers this many times as fast. */
const OPENED_FACTOR = 2;

/** Sun dose (`0..1`) per game day of full sky light — about a hundred days to fade a lake. */
const SUN_DOSE_PER_DAY = 0.01;

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
/** Why the painter cannot reach a thing's outside from where they stand. */
export type CoatReachRefusal = ActRefusal<'no-landing'>;

/**
 * ⭐ Every reason a brushed coat is refused — `PaintController` words each
 * (controllers-are-io D4); the thing painted is the controller's target.
 */
export type CoatRefusal =
  | CoatReachRefusal
  /** Nothing in the pot (`empty`), or what is in it runs off (`runs-off`). */
  | ActRefusal<'not-paint', { source: Stuff; why: 'empty' | 'runs-off' }>
  | ActRefusal<'nothing-to-cover'>
  /** Not enough in the pot; `litres` is what the coat would take. */
  | ActRefusal<'source-too-low', { source: Stuff; litres: number }>
  /** The pot ran dry while the coat went on. */
  | ActRefusal<'pot-ran-dry'>;

/** What a coat's begin words need. */
export interface CoatBegin {
  source: Stuff;
}

/** What a brushed coat came to. */
export type CoatDone =
  /** A wet coat of `what` (the paint in words) laid. */
  | { kind: 'coated'; what: string }
  /** The thing or the pot was gone when the step landed (nothing said). */
  | { kind: 'gone' };

export type CoatPlan = ActPlan<CoatBegin, CoatDone, CoatRefusal>;

/** Why a label will not paste. */
export type PasteRefusal = ActRefusal<'not-glue'> | ActRefusal<'source-too-low'> | ActRefusal<'not-paper'>;

/** A label pasted: the glue's name and the words it carries (`''` — none). */
export type PasteOutcome = ActOutcome<{ glue: string; words: string }>;

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
  /**
   * ⭐ Paste a sheet onto the outside with the glue in `pot`: the
   * glue goes on as a coat carrying the sheet's words, and the sheet is
   * gone into it. How long it stays is the glue's own damp-resistance.
   */
  pasteOn(sheet: Stuff, pot: Stuff): Promise<PasteOutcome | PasteRefusal>;
  /**
   * ⭐ The damp lets a weak glue go: on a good that is WET, a
   * glued coat whose glue does not resist damp comes away — and the words
   * pasted in it go with it. Returns how many let go.
   */
  releaseDampGlue(): number;
  /** Are this thing's coats kept in its record? A good's always; a staged building's not (paint D7). */
  persistsCoats(): boolean;
  /**
   * ⭐ Plan one brushed coat from `req.source` (paint D9) — the thing
   * painted decides: how much surface it has, how much paint that takes,
   * whether the painter can reach it. Refuses with a reason and facts.
   */
  coatPlanFor(req: CoatRequest): Promise<CoatPlan | CoatRefusal>;
  /** Why `actor` cannot reach this thing's outside to paint it, or `null`. */
  coatReachRefusal(actor: Stuff): CoatReachRefusal | null;
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
  /**
   * ⭐ Walk the weather since the last look over the outside (paint D5):
   * set what the air sets, thin what the weather reaches, fade what the sun
   * reaches, and — once the last coat is gone — wear a durable body at
   * {@link bareWearPerDay}. Returns the game-second the outside went BARE in
   * this window, or `null` if it did not.
   */
  reconcileWeather(): number | null;
  /**
   * Thin the outside coats over `segments` at `exposure` (`0..1` of the
   * weather reaching them). Returns the seconds into the window at which
   * the last outside coat wore through, or `null`.
   */
  weatherCoats(segments: readonly CoatAir[], exposure: number, skyLight: number): number | null;
  /** Is there no coat left on the outside? */
  coatGone(): boolean;
  /** Is the outside coat worn thin (below `thinM`)? */
  coatThin(thinM: number): boolean;
  /** What the weather has been doing to the outside, in words — or `null` when nothing shows. */
  weatherCause(): string | null;
  /** How much condition a day of weather costs the body once its coat is gone. Default none. */
  bareWearPerDay(): number;
  /** The game-second the weather was last walked to, or `null`. */
  getWeatheredToS(): number | null;
  /** Restamp the walk — a staging seam. */
  setWeatheredToS(s: number | null): void;
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
  return MaterialApi.materials().peek(path) ?? null;
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
      m && MixinApi.hasKinetic(m) && m.getKinetics()?.setsByHeat() ? 'fired' : 'set'
    }.`,
  set: (m, f) => `It is ${m && MixinApi.hasCoating(m) ? m.getCoatWord() : 'coated'} on the ${f} with ${nameOf(m)}.`,
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
/** Litres of glue a label takes. */
const PASTE_LITRES = 0.005;
/** A pasted label's glue film, m. */
const PASTE_FILM_M = 0.00005;
/** Wet past this (the `wet` band), a weak glue lets go. */
const DAMP_LETS_GO_AT = 0.45;
/** A glue that resists the damp at least this well holds in it. */
const GLUE_HOLDS_DAMP = 0.5;

const coatAugmenter: MarkupAugmenter = (text, host, _viewer, opts) => {
  if (opts?.filter) return text;
  if (!MixinApi.isFaced(host)) return text;
  // Reconcile on read: the weather since the last look, first.
  host.reconcileWeather();
  host.releaseDampGlue();
  const lines: string[] = [];
  // ⭐ A pasted label reads — on any good with an outside.
  for (const c of host.getCoats('outside')) {
    if (c.marks && !MixinApi.isMarked(host)) lines.push(`A label is pasted on it: "${c.marks}".`);
  }
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
      weatheredToS: { persistent: true, runtimeState: true },
    };

    /**
     * The coats' slice — the declared fields, unless the host says its coats
     * are not kept (a staged ship's hull, paint D7). Plain JSON either way.
     */
    static captureSlice(host: Stuff): { fields: Record<string, unknown> } {
      const self = host as unknown as Faced & { coats: unknown; absorbed: unknown; weatheredToS: unknown };
      if (!self.persistsCoats()) return { fields: {} };
      return {
        fields: {
          coats: structuredClone(self.coats),
          absorbed: structuredClone(self.absorbed),
          weatheredToS: self.weatheredToS,
        },
      };
    }

    /** @hook Why `actor` cannot reach this to paint it — `null` (a good in reach can be). */
    public coatReachRefusal(_actor: Stuff): CoatReachRefusal | null {
      return null;
    }

    /**
     * @hook One brushed coat (paint D9). A brush lays a wet film
     * `structure.paint.coatThicknessM` thick over {@link coatAreaM2}; what
     * stays when it sets is that film × the paint's solids. The pot gives
     * up exactly that many litres; a pot with less coats nothing.
     */
    public async coatPlanFor(req: CoatRequest): Promise<CoatPlan | CoatRefusal> {
      const self = this as unknown as Stuff & Faced;
      const reach = this.coatReachRefusal(req.actor);
      if (reach !== null) return reach;
      const src = req.source;
      if (!MixinApi.isBulkable(src) || !src.hasInteriorBulk()) {
        return { ok: false, reason: 'not-paint', facts: { source: src, why: 'empty' } };
      }
      const material = src.getBulkMaterial('interior');
      if (material === null || !MixinApi.hasCoating(material) || !material.getLaysCoat()) {
        return { ok: false, reason: 'not-paint', facts: { source: src, why: 'runs-off' } };
      }
      const area = this.coatAreaM2();
      if (!(area > 0)) {
        return { ok: false, reason: 'nothing-to-cover' };
      }
      const film = dial(AppSettingKeys.structurePaintCoatThicknessM, 0.00005);
      const litres = area * film * 1000;
      const held = src.getBulkAmount('interior').rawValue();
      if (held + 1e-9 < litres) {
        return { ok: false, reason: 'source-too-low', facts: { source: src, litres } };
      }
      const makeup = src.getBulk('interior').getPayload()?.paint;
      const solids = makeup?.solidsFraction ?? Math.min(0.9, Math.max(0.1, (MixinApi.hasSolution(material) ? material.getSolidsKgPerL() : 0) || 0.4));
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
        facts: { source: src },
        onComplete: () => {
          if (self.isDestroyed() || src.isDestroyed() || !MixinApi.isBulkable(src)) {
            return { ok: true, facts: { kind: 'gone' } };
          }
          const have = src.getBulkAmount('interior').rawValue();
          if (have + 1e-9 < litres) return { ok: false, reason: 'pot-ran-dry' };
          // ⭐ Walk the weather UP TO NOW first, so the rain of last week
          // does not fall on a coat laid today.
          self.reconcileWeather();
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
          return { ok: true, facts: { kind: 'coated', what } };
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
    public setCoats(value: Partial<Record<FaceName, CoatLayer[]>>): Promise<void> | undefined {
      for (const [face, list] of Object.entries(value ?? {})) {
        for (const c of list ?? []) {
          if (!isCoatState(c.state)) {
            throw new TypeError(`Faced: a coat on the ${face} is '${String(c.state)}', which is no coat state`);
          }
        }
      }
      this.coats = value ?? {};
      // The restore door (load-on-use W8): every coat's material loads with
      // the face; `undefined` at runtime, where the act held the rows.
      return MaterialApi.materials().ensureCitedIn(this.coats);
    }

    public async pasteOn(
      sheet: Stuff,
      pot: Stuff,
    ): Promise<PasteOutcome | PasteRefusal> {
      const held = MixinApi.isBulkable(pot) && pot.hasInteriorBulk() ? pot.getBulkMaterial('interior') : null;
      if (held === null || !MixinApi.hasCoating(held) || held.getAdhesive() === null || !MixinApi.isBulkable(pot)) {
        return { ok: false, reason: 'not-glue' };
      }
      const have = pot.getBulkAmount('interior').rawValue();
      if (have + 1e-9 < PASTE_LITRES) {
        return { ok: false, reason: 'source-too-low' };
      }
      if (!MixinApi.isMarked(sheet)) {
        return { ok: false, reason: 'not-paper' };
      }
      await sheet.refreshMarks(sheet);
      const words = sheet.getMarkText().trim();
      pot.setBulkAmount('interior', Quantity.of(have - PASTE_LITRES, 'L'));
      this.layCoat('outside', held.getTemplatePath() ?? '', PASTE_FILM_M, 0);
      const top = this.getCoats('outside')[0];
      if (top !== undefined && words !== '') top.marks = words;
      StuffApi.destruct(sheet);
      return { ok: true, facts: { glue: held.getName(), words } };
    }

    public releaseDampGlue(): number {
      const self = this as unknown as Stuff;
      if (!MixinApi.isWet(self) || self.getWetness() < DAMP_LETS_GO_AT) return 0;
      const list = this.coats.outside ?? [];
      const kept = list.filter((c) => {
        const coatMat = materialAt(c.material);
        const glue = coatMat && MixinApi.hasCoating(coatMat) ? coatMat.getAdhesive() : null;
        return glue === null || glue.resistsDamp >= GLUE_HOLDS_DAMP;
      });
      const gone = list.length - kept.length;
      if (gone > 0) this.coats = { ...this.coats, outside: kept };
      return gone;
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
          const change = mat && MixinApi.hasKinetic(mat) ? mat.getKinetics()?.changes()[0] : undefined;
          // A coat the AIR sets is `airCoats`'s, never the fire's.
          if (change?.setsByAir()) return coat;
          if (change === undefined) {
            // No heat-work law: the melt point alone decides.
            const melts = mat && MixinApi.hasFusion(mat) ? mat.getMeltingPoint().rawValue() : 0;
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
          const change = (mat && MixinApi.hasKinetic(mat) ? mat.getKinetics()?.changes()[0] : undefined) ?? null;
          if (change?.setsByAir()) return coat;
          const fuseK =
            change?.getReferenceK() ?? (mat && MixinApi.hasFusion(mat) ? mat.getMeltingPoint().rawValue() : 0);
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
          if (mat === null) return coat;
          if (MixinApi.hasKinetic(mat) && (mat.getKinetics()?.setsByHeat() || mat.getKinetics()?.airSet())) return coat;
          const melts = MixinApi.hasFusion(mat) ? mat.getMeltingPoint().rawValue() : 0;
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
          const change = mat && MixinApi.hasKinetic(mat) ? (mat.getKinetics()?.airSet() ?? null) : null;
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
      const bodyAlpha = body && MixinApi.hasSolidity(body) ? body.getThermalExpansion() : 0;
      const scorchK = change?.getScorchAboveK() ?? null;
      if (scorchK !== null && peakK > scorchK) return { ...coat, state: 'run' };
      if ((coat.dirtyAtLay ?? 0) > dial(AppSettingKeys.facesCrawlDirt, 0.3)) return { ...coat, state: 'crawled' };
      const coatAlpha = mat && MixinApi.hasSolidity(mat) ? mat.getThermalExpansion() : 0;
      if (coatAlpha - bodyAlpha > dial(AppSettingKeys.facesCrazeMismatch, 1.5e-6)) return { ...coat, state: 'crazed' };
      return { ...coat, state: 'set' };
    }

    public porosity(): number {
      const self = this as unknown as Stuff;
      const mat = MixinApi.isTangible(self) ? self.getMaterial() : null;
      if (mat === null || !mat.hasTag('porous') && !mat.hasTag('fired')) return 0;
      if (!MixinApi.hasPorosity(mat)) return 0;
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
        if (coat !== null && (MixinApi.hasPorosity(coat) ? coat.getWaterAbsorptionCapacity().rawValue() : 0) / 100 <= tight) return true;
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

    // ── the weather (paint D5) ──────────────────────────────────────

    /** Game-second the weather was last walked to (`null`: never — the first look stamps). */
    public weatheredToS: number | null = null;

    public getWeatheredToS(): number | null {
      return this.weatheredToS;
    }

    public setWeatheredToS(s: number | null): void {
      this.weatheredToS = typeof s === 'number' && Number.isFinite(s) ? s : null;
    }

    /**
     * @hook The place whose air this thing's outside meets — a good's
     * container by default; a building answers one of its landings.
     */
    public weatherScope(): Stuff | null {
      const self = this as unknown as Stuff;
      if (!MixinApi.isContainable(self)) return null;
      return self.getContainer() ?? null;
    }

    /**
     * @hook How much of the weather reaches the outside at `scope`: all of
     * it where the rain does, some under a roof in the open air, none
     * indoors (or in a pack: a person has no exposure).
     */
    public weatherExposureAt(scope: Stuff): number {
      const e = BiomeApi.exposureOf(scope);
      if (e === null) return 0;
      if (e.rainReaches()) return 1;
      return e.windEnters() ? SHELTERED_EXPOSURE : 0;
    }

    /** @hook The sky light at `scope`, `0..1` — what fades a pigment. */
    public skyLightAt(scope: Stuff): number {
      return BiomeApi.exposureOf(scope)?.skyLightFraction() ?? 0;
    }

    /** @hook How freely the air at `scope` changes for a coat that wants it, `0..1`. */
    public airChangeAt(scope: Stuff): number {
      if (!MixinApi.isAtmospheric(scope)) return 1;
      const ach = scope.airChangesPerHour();
      return Number.isFinite(ach) ? Math.min(1, Math.max(0, ach / 4)) : 1;
    }

    /**
     * @hook What a day of weather costs a durable body once its coat is
     * gone. ⚠ None by default: what bare exposure does to a good's own
     * material is decomposition's per-material rate, not built. A building
     * answers its dial (`structure.weather.daysToWorn`).
     */
    public bareWearPerDay(): number {
      return 0;
    }

    public reconcileWeather(): number | null {
      const now = WorldClockApi.getNow().rawValue();
      const from = this.weatheredToS ?? now;
      if (!(now > from)) {
        this.weatheredToS = now;
        return null;
      }
      const self = this as unknown as Stuff;
      const wearPerDay = MixinApi.isDurable(self) ? this.bareWearPerDay() : 0;
      const wasBare = this.coatGone();
      // Nothing on the outside and nothing to wear: no weather to walk.
      if (wasBare && !(wearPerDay > 0)) {
        this.weatheredToS = now;
        return null;
      }
      const scope = this.weatherScope();
      if (scope === null) {
        // ⭐ No place stands to read the air from (a building whose landing
        // is not loaded). A bare body still takes the weather; a coat waits,
        // unwalked, for a landing to walk it from — so nothing is lost.
        if (wasBare && MixinApi.isDurable(self)) self.wear(((now - from) / GAME_DAY_S) * wearPerDay);
        if (wasBare || !(wearPerDay > 0)) this.weatheredToS = now;
        return null;
      }
      this.weatheredToS = now;
      const airChange = this.airChangeAt(scope);
      const segments: CoatAir[] = BiomeApi.airSegmentsFor(scope, from, now).map((seg) => ({
        seconds: seg.durationS,
        kelvin: seg.air.tempK,
        rh: Math.min(1, Math.max(0, seg.air.humidityPct / 100)),
        rain: seg.rainMmPerH > 0,
        airChange,
      }));
      // ⭐ A thermal body sets its own wet coats over its room's air and
      // takes an oil's heat (`Thermal.reconcileCoats`); anything else —
      // a building, a board — sets them here, and an oil's heat is said,
      // not felt (the survey says the new oil is curing).
      if (!MixinApi.isThermal(self)) this.airCoats(segments);
      const bareAfter = this.weatherCoats(segments, this.weatherExposureAt(scope), this.skyLightAt(scope));
      const bareAt = bareAfter === null ? null : from + bareAfter;
      // ⭐ The body takes the weather only for the time it stood bare
      // (paint D13): a building kept painted stays sound.
      const bareFrom = wasBare ? from : bareAt;
      if (bareFrom !== null && wearPerDay > 0 && MixinApi.isDurable(self)) {
        self.wear(((now - bareFrom) / GAME_DAY_S) * wearPerDay);
      }
      return bareAt;
    }

    public weatherCoats(segments: readonly CoatAir[], exposure: number, skyLight: number): number | null {
      const face: FaceName = 'outside';
      const coats = [...this.getCoats(face)].map((c) => ({ ...c }));
      if (coats.length === 0) return null;
      let elapsed = 0;
      let bareAt: number | null = null;
      for (const seg of segments) {
        if (!(seg.seconds > 0)) continue;
        // The sun fades the outermost coat's pigment wherever it reaches.
        const top = coats[0];
        if (top !== undefined && top.paint !== undefined && skyLight > 0) {
          top.faded = Math.min(1, (top.faded ?? 0) + (seg.seconds / GAME_DAY_S) * 0.5 * skyLight * SUN_DOSE_PER_DAY);
        }
        const segYears = (seg.seconds / GAME_YEAR_S) * Math.max(0, exposure);
        let used = 0;
        while (used < segYears && coats.length > 0) {
          const c = coats[0]!;
          if (c.state === 'wet') break;
          const opened = c.state === 'crazed' || c.state === 'run' ? OPENED_FACTOR : 1;
          const weatherMat = materialAt(c.material);
          const rate =
            (weatherMat && MixinApi.hasCoating(weatherMat) ? weatherMat.getWeatheringMPerGameYear() : 0) * opened;
          if (!(rate > 0)) break;
          const yearsToGo = c.thicknessM / rate;
          if (yearsToGo > segYears - used) {
            c.thicknessM -= rate * (segYears - used);
            used = segYears;
            break;
          }
          // This coat wears through partway into the segment.
          used += yearsToGo;
          coats.shift();
          if (coats.length === 0 && bareAt === null) bareAt = elapsed + (used / segYears) * seg.seconds;
        }
        elapsed += seg.seconds;
      }
      const rest = { ...this.coats };
      if (coats.length === 0) delete rest[face];
      else rest[face] = coats;
      this.coats = rest;
      return bareAt;
    }

    public coatGone(): boolean {
      return this.getCoats('outside').length === 0;
    }

    public coatThin(thinM: number): boolean {
      const coats = this.getCoats('outside');
      if (coats.length === 0) return false;
      const total = coats.reduce((a, c) => a + (c.state === 'wet' ? 0 : c.thicknessM), 0);
      return coats.every((c) => c.state !== 'wet') && total < thinM;
    }

    /**
     * ⭐ The weather's work on the outside, read off the COAT — the coat is
     * what a passer-by sees going: *"the paint has gone; the weather is at
     * what was under it"*. `null` while a sound coat holds.
     */
    public weatherCause(): string | null {
      const top = this.getCoats('outside')[0];
      if (top !== undefined && top.state === 'wet') {
        const binder = top.paint ? new Paint(top.paint).binder() : null;
        const sets =
          binder && MixinApi.hasKinetic(binder) ? binder.getKinetics()?.airSet()?.getSets() : null;
        return sets === 'oxidation'
          ? 'the new oil is still curing, faintly warm to the hand'
          : 'the new coat is still wet';
      }
      if (top !== undefined && top.state === 'run') return 'the last coat ran in the rain and never set right';
      if (top !== undefined && top.state === 'crazed') return 'the last coat crazed in the frost';
      if (top === undefined) return 'the paint has gone; the weather is at what was under it';
      if (this.coatThin(dial(AppSettingKeys.structureCoatThinM, 0.00001))) {
        return 'the paint is going; weather is starting to find the seams';
      }
      return null;
    }
  }
  return FacedMixin;
}
