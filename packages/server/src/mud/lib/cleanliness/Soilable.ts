/**
 * SoilableMixin — ⭐ **dirt by kind, on the layer an act reached**
 * (cleanliness D1).
 *
 * A thing that can get dirty carries DEPOSITS: an amount of a row-declared
 * dirt kind (`blood`, `grease`, `mud`… — `DirtKind` rows, any pack) at a
 * SITE. A body's sites are its part keys (`body.arm.left.hand`); a
 * garment, a floor, a pot or a pane has one site, `''`. The amount is a
 * dimensionless load: `0.1` marks a thing, `0.4` soils it, `1` is filthy
 * (the `cleanliness.band.*` dials).
 *
 * ⭐⭐ **Nothing here has a clock.** Dirt arrives only because an act put
 * it there — {@link Soilable.soil} is the ONE writer, and every producer
 * (butchering, walking a mire, stoking a fire, milking) calls it at the
 * moment of the act, on the layer the act reached. A shirt in a wardrobe
 * for a year is exactly as clean as the day it went in. This replaces the
 * retired hands clock (`HygieneMixin`, a six-hour linear decay that made
 * clean hands go dirty by themselves), and it is `textiles.md § The
 * soiling seam`'s rule: *a local interaction is a call, not a broadcast*.
 *
 * Bands are WORDS (`clean · marked · soiled · filthy`); the presentation
 * reads the kinds as adjectives off their rows (*bloodied and greasy*).
 *
 * ⭐ **Blood is a sample.** A `blood` deposit made by a bleeding body keeps
 * a {@link StainRecord} — the bleeder's TRUE type and system, the way a
 * drawn `BloodUnit` does — so `analyze blood <shirt>` can read whose it
 * was. It is the one place `by` is kept; every other kind is anonymous.
 *
 * What WASHING does (`wash(spec)`, the chemistry) and the clean TIERS the
 * kitchen and the clinic read are on this mixin too — the mixin is the
 * authority, every verb a dumb caller.
 *
 * ⛔ Never a `Map` (no BSON shape); never an event; never the word
 * "condition" (it means three things already).
 */

import type { MixinConstructor, FieldMeta } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import type { MarkupAugmenter } from '../../api/mml';
import { AppApi } from '../../api/app';
import { MixinApi } from '../../api/mixin';
import { PerceptionApi } from '../../api/perception';
import { StuffApi } from '../../api/stuff';
import { WorldClockApi } from '../../api/worldclock';
import { AppSettingKeys } from '../config/AppSettings';
import { TemplatePaths } from '../paths';
import { Contamination } from '../material/Contaminable';
import type DirtKindCatalogue from '../../platform/idea/DirtKindCatalogue';
import type { DirtKindDescriptor } from '../../platform/idea/DirtKind';
import type { CleanserAction, CleanserDescriptor } from '../../platform/idea/Cleanser';

/** The four soil bands, cleanest first — words, ordinal. */
export const SOIL_BANDS = ['clean', 'marked', 'soiled', 'filthy'] as const;
export type SoilBand = (typeof SOIL_BANDS)[number];

/**
 * ⭐ The clean tiers (cleanliness D14), lowest first — a DERIVED word,
 * never stored: what was done to a thing since its last deposit. Washing
 * removes (`clean`), hot water with a soap or an alkali sanitises, a boil
 * held long enough disinfects, a dry heat or a flame past 433 K sterilises.
 * `dirty` is below presentable: the thing shows its soil or a film.
 */
export const CLEAN_TIERS = [
  'dirty',
  'presentable',
  'clean',
  'sanitised',
  'disinfected',
  'sterile',
] as const;
export type CleanTier = (typeof CLEAN_TIERS)[number];

/** The whole-thing site — a garment, a floor, a pot, a pane. */
export const WHOLE_SITE = '';

/** Default dials (`cleanliness.band.*` overrides). */
export const SOIL_DEFAULTS = {
  MARKED_AT: 0.1,
  SOILED_AT: 0.4,
  FILTHY_AT: 1,
  /** A load never reads above this — piling more on adds nothing. */
  MAX_LOAD: 2,
  /** A kind below this share of the marked threshold is not worth a word. */
  WORDLESS_BELOW: 0.25,
} as const;

/**
 * A blood deposit's sample — the bleeder's TRUE values, the drawn-unit
 * rule. Flat scalars so it round-trips with no marshaller.
 */
export interface StainRecord {
  site: string;
  kind: string;
  /** Washed hot enough to set (D8): then only an oxidiser lifts it. */
  set: boolean;
  /** The ABO phenotype. */
  type: string;
  /** The blood system the type belongs to. */
  system: string;
  speciesPath: string;
  /** Whose blood — a durable person key. ⚠ a spoiler (level 2). */
  donorIdentityPath: string;
}

/** The last wash a site had — what the clean tiers read (D14). */
export interface WashStamp {
  atS: number;
  cleanserKey: string | null;
  action: CleanserAction | null;
  waterK: number;
  hardnessDgh: number;
}

/** The last sterilising heat since the last deposit (D14). */
export interface HeatStamp {
  peakK: number;
  heldS: number;
  atS: number;
}

/**
 * One cleanser in a wash: its row, and the material it is made of (whose
 * `corrosiveTo` is what a lye or a vitriol BURNS — derived, never
 * authored on the cleanser).
 */
export interface WashCleanser {
  row: CleanserDescriptor;
  materialPath: string | null;
  /** The thing it came from (a bar, a flask) — what a wash spends. */
  source?: Stuff;
}

/**
 * ⭐ What a wash brings to a thing (cleanliness D10) — the three
 * contributions and the water's own read. Built by the verb from what is
 * in reach; the chemistry is the thing's.
 */
export interface WashSpec {
  /** The water's temperature, K — read from what holds it. */
  waterK: number;
  /** The water's hardness, °dH — the source's, carried by the water. */
  hardnessDgh: number;
  /** Zero or more cleansers (soap, and soda to soften the water). */
  cleansers: readonly WashCleanser[];
  /** Effort: `1` a plain wash, `3` a scrub. Time is the third contribution. */
  effort: number;
  /** Other things in the same water (the bleed of an unfast dye). */
  coWashed?: readonly Stuff[];
}

/** What a wash did — the verb renders this and nothing else. */
export interface WashOutcome {
  /** Kind → load removed. */
  removed: Record<string, number>;
  /** Kinds that SET in this wash (blood in hot water). */
  setNow: string[];
  /** What the wash did to the thing itself: `felted` · `shrunk` ·
   * `rotted` · `burnt` · `scratched` · `faded` · `bled-onto`. */
  damage: string[];
  /** The band after. */
  band: SoilBand;
}

export interface Soilable {
  /**
   * ⭐ THE writer. Deposit `amount` of dirt `kind` at `site` (`''` = the
   * whole thing). `by` is the source — kept only for blood (the sample).
   * Clears the heat stamp: a sterile thing touched is no longer sterile.
   */
  soil(kind: string, amount: number, by?: Stuff | null, site?: string): void;
  /** Total load at `site`; with no site, the worst site. */
  soilAt(site?: string): number;
  /** One kind's load at `site`. */
  soilLoad(kind: string, site?: string): number;
  /** The band at `site`; with no site, the worst site. */
  soilBand(site?: string): SoilBand;
  /** Kinds present at `site`, heaviest first; with no site, at any site. */
  soilKinds(site?: string): string[];
  /** Every site carrying anything. */
  soilSites(): string[];
  /** Remove `fraction` of one kind at `site`; returns the amount removed. */
  removeSoil(kind: string, fraction: number, site?: string): number;
  /** Whether `kind` at `site` has SET (a hot-washed blood stain). */
  isSoilSet(kind: string, site?: string): boolean;
  /** Mark `kind` at `site` set (or not). */
  setSoilSet(kind: string, site: string, set: boolean): void;
  /** The kinds as words — *bloodied and greasy* — or `''` when clean. */
  describeSoil(site?: string): string;
  /** The band and kinds as a sentence fragment — *soiled, bloodied and
   * greasy* — or `''` when clean. */
  soilPhrase(site?: string): string;
  /**
   * ⭐ @hook The `look` line for this thing's soil, or `''`. The default
   * speaks for the whole-thing site — *It is soiled, bloodied and greasy.*
   * A host words its own: a body says it per part (the Attired
   * impression), a floor names its boards and its strewing.
   */
  soilLookLine(viewer?: Stuff | null): string;
  /** Every blood sample on this thing (optionally one kind). */
  stainsOf(kind?: string): StainRecord[];
  /** Stamp a sterilising heat the act reached (boil, flame, oven hold). */
  recordHeat(peakK: number, heldS: number): void;
  /**
   * ⭐ How clean, in the tiers a kitchen, a clinic and a surgery read
   * (cleanliness D14) — derived on read from the band, the last wash and
   * the last heat since the last deposit.
   */
  cleanTier(site?: string): CleanTier;
  getHeatStamp(): HeatStamp | null;
  /** The last wash at `site`, or null. */
  getWashStamp(site?: string): WashStamp | null;
  /** Record a wash at `site` (the wash itself, and the laundress's). */
  recordWash(site: string, stamp: WashStamp): void;
  /**
   * ⭐⭐ THE wash (cleanliness D10): remove dirt at `site` by chemistry —
   * each kind by whether a cleanser's action is one it answers to, scaled
   * by the water's heat, the effort and the water's hardness; blood SETS
   * in hot water and then answers only to a bleach. Records the wash for
   * the tiers. A host adds what washing does to IT by override (a garment
   * felts, shrinks, rots, bleeds; a vessel tips its dregs).
   */
  washSite(spec: WashSpec, site?: string): WashOutcome;
  /**
   * @hook Settle what has been happening to this thing since it was last
   * read — a garment hung in the sun or the fumes (cleanliness D21). A
   * no-op by default; an async read point (`look`, `wash`) awaits it.
   */
  reconcileAiring(): Promise<void>;
  /**
   * @hook Why this thing is NOT washed in water — in words — or `null` when
   * it is. A floor kept by strewing is swept, not scrubbed (cleanliness
   * D15). The verb renders the refusal; the thing decides it.
   */
  washRefusal(): string | null;

  // Public so the applier and the persistence spine can reflect into them.
  deposits: Record<string, number>;
  setDeposits: string[];
  stains: StainRecord[];
  washes: Record<string, WashStamp>;
  heat: HeatStamp | null;
}

export function SoilableMixin<TBase extends MixinConstructor<Stuff>>(
  Base: TBase,
) {
  return class SoilableMixin extends Base implements Soilable {
    static _mixinName: string = 'SoilableMixin';

    static fieldMeta: FieldMeta = {
      deposits: { persistent: true, runtimeState: true },
      setDeposits: { persistent: true, runtimeState: true },
      // ⚠ The bleeder's true type and who they were — what `analyze
      // blood` is for. A spoiler wherever it surfaces.
      stains: { persistent: true, runtimeState: true, spoiler: 2 },
      washes: { persistent: true, runtimeState: true },
      heat: { persistent: true, runtimeState: true },
    };

    static markupAugmenters: MarkupAugmenter[] = [soilAugmenter];

    /** `${site}|${kind}` → load. `{}` = clean. */
    public deposits: Record<string, number> = {};
    /** Deposit keys whose dirt has SET (a hot-washed blood stain). */
    public setDeposits: string[] = [];
    public stains: StainRecord[] = [];
    /** Site → the last wash there. */
    public washes: Record<string, WashStamp> = {};
    public heat: HeatStamp | null = null;

    // ---------- the writer ----------

    public soil(
      kind: string,
      amount: number,
      by: Stuff | null = null,
      site: string = WHOLE_SITE,
    ): void {
      if (!kind || !(amount > 0)) return;
      const key = depositKey(site, kind);
      const prior = this.deposits[key] ?? 0;
      const next = Math.min(SOIL_DEFAULTS.MAX_LOAD, prior + amount);
      this.deposits = { ...this.deposits, [key]: round(next) };
      this.heat = null;
      if (by && kind === 'blood') this.keepSample(site, kind, by);
      const self = this as unknown as Stuff;
      if (MixinApi.isContaminable(self)) {
        const row = dirtRow(kind);
        for (const [pathogen, severity] of Object.entries(row?.contaminates ?? {})) {
          self.contaminate(pathogen, Math.min(1, severity * amount));
        }
      }
    }

    // ---------- reads ----------

    public soilAt(site?: string): number {
      if (site === undefined) {
        let worst = 0;
        for (const s of this.soilSites()) worst = Math.max(worst, this.siteTotal(s));
        return worst;
      }
      return this.siteTotal(site);
    }

    public soilLoad(kind: string, site: string = WHOLE_SITE): number {
      return this.deposits[depositKey(site, kind)] ?? 0;
    }

    public soilBand(site?: string): SoilBand {
      return bandOf(this.soilAt(site));
    }

    public soilKinds(site?: string): string[] {
      const byKind = new Map<string, number>();
      for (const [key, load] of Object.entries(this.deposits)) {
        if (!(load > 0)) continue;
        const [s, kind] = splitKey(key);
        if (site !== undefined && s !== site) continue;
        byKind.set(kind, Math.max(byKind.get(kind) ?? 0, load));
      }
      return [...byKind.entries()]
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .map(([k]) => k);
    }

    public soilSites(): string[] {
      const sites = new Set<string>();
      for (const [key, load] of Object.entries(this.deposits)) {
        if (load > 0) sites.add(splitKey(key)[0]);
      }
      return [...sites].sort();
    }

    public isSoilSet(kind: string, site: string = WHOLE_SITE): boolean {
      return this.setDeposits.includes(depositKey(site, kind));
    }

    public setSoilSet(kind: string, site: string, set: boolean): void {
      const key = depositKey(site, kind);
      const has = this.setDeposits.includes(key);
      if (set && !has && (this.deposits[key] ?? 0) > 0) {
        this.setDeposits = [...this.setDeposits, key];
      } else if (!set && has) {
        this.setDeposits = this.setDeposits.filter((k) => k !== key);
      }
      if (kind === 'blood') {
        this.stains = this.stains.map((s) =>
          s.site === site && s.kind === kind ? { ...s, set } : s,
        );
      }
    }

    public removeSoil(
      kind: string,
      fraction: number,
      site: string = WHOLE_SITE,
    ): number {
      const key = depositKey(site, kind);
      const prior = this.deposits[key] ?? 0;
      if (!(prior > 0) || !(fraction > 0)) return 0;
      const f = Math.min(1, fraction);
      const left = round(prior * (1 - f));
      const next = { ...this.deposits };
      if (left < 0.005) {
        delete next[key];
        this.setDeposits = this.setDeposits.filter((k) => k !== key);
        // The deposit is gone, and its sample with it.
        this.stains = this.stains.filter(
          (s) => !(s.site === site && s.kind === kind),
        );
      } else {
        next[key] = left;
      }
      this.deposits = next;
      return prior - (next[key] ?? 0);
    }

    public describeSoil(site?: string): string {
      const marked = dialOf(
        AppSettingKeys.cleanlinessBandMarkedAt,
        SOIL_DEFAULTS.MARKED_AT,
      );
      const floor = marked * SOIL_DEFAULTS.WORDLESS_BELOW;
      const words: string[] = [];
      for (const kind of this.soilKinds(site)) {
        if (this.kindLoad(kind, site) < floor) continue;
        const word = dirtRow(kind)?.adjective ?? kind;
        if (!words.includes(word)) words.push(word);
        if (words.length === 3) break;
      }
      return joinWords(words);
    }

    public soilPhrase(site?: string): string {
      const band = this.soilBand(site);
      if (band === 'clean') return '';
      const kinds = this.describeSoil(site);
      if (!kinds) return band;
      if (band === 'marked') return `a little ${kinds}`;
      return `${band}, ${kinds}`;
    }

    public soilLookLine(_viewer: Stuff | null = null): string {
      const phrase = this.soilPhrase(WHOLE_SITE);
      return phrase ? `It is ${phrase}.` : '';
    }

    public stainsOf(kind?: string): StainRecord[] {
      return this.stains
        .filter((s) => kind === undefined || s.kind === kind)
        .map((s) => ({ ...s }));
    }

    public cleanTier(site: string = WHOLE_SITE): CleanTier {
      const band = this.soilBand(site);
      const filmed = this.soilKinds(site).some(
        (k) => this.soilLoad(k, site) > 0 && dirtRow(k)?.form === 'film',
      );
      if (band !== 'clean') {
        return band === 'marked' && !filmed ? 'presentable' : 'dirty';
      }
      const heat = this.heat;
      const wash = this.washes[site] ?? null;
      // ⭐ Raw — clean to look at, never washed or heated since it was made
      // or last touched — is only presentable: nobody has made it clean.
      if (heat === null && wash === null) return 'presentable';
      const boiled = heat !== null && heat.peakK >= 373 && heat.heldS >= 300;
      const self = this as unknown as Stuff;
      const germFree =
        !MixinApi.isContaminable(self) ||
        Contamination.isClean(self.getPathogenLoads());
      if (boiled && germFree) {
        return heat.peakK >= 433 && heat.heldS >= 60 ? 'sterile' : 'disinfected';
      }
      // A dry heat or a flame past 433 K for a minute sterilises too, with
      // no boil held first (the kit in the flame).
      if (heat !== null && heat.peakK >= 433 && heat.heldS >= 60 && germFree) {
        return 'sterile';
      }
      if (
        wash !== null &&
        wash.waterK >= 333 &&
        (wash.action === 'surfactant' ||
          wash.action === 'alkali-mild' ||
          wash.action === 'alkali-strong')
      ) {
        return 'sanitised';
      }
      return 'clean';
    }

    public recordHeat(peakK: number, heldS: number): void {
      if (!(peakK > 0) || !(heldS > 0)) return;
      const prior = this.heat;
      // ⭐ The stamp keeps the hottest hold since the last deposit; a
      // longer hold at the same heat lengthens it.
      if (
        !prior ||
        peakK > prior.peakK + 1 ||
        (Math.abs(peakK - prior.peakK) <= 1 && heldS > prior.heldS)
      ) {
        this.heat = { peakK, heldS, atS: nowS() };
      }
    }

    public getHeatStamp(): HeatStamp | null {
      return this.heat ? { ...this.heat } : null;
    }

    public getWashStamp(site: string = WHOLE_SITE): WashStamp | null {
      const w = this.washes[site];
      return w ? { ...w } : null;
    }

    public recordWash(site: string, stamp: WashStamp): void {
      this.washes = { ...this.washes, [site]: { ...stamp } };
    }

    public reconcileAiring(): Promise<void> {
      return Promise.resolve();
    }

    public washRefusal(): string | null {
      return null;
    }

    public washSite(spec: WashSpec, site: string = WHOLE_SITE): WashOutcome {
      const removed: Record<string, number> = {};
      const setNow: string[] = [];
      const actions = spec.cleansers.map((c) => c.row.action);
      // ⭐ Soda in the same water softens it (`using` twice is two
      // cleansers); soap in hard water scums.
      const softened = spec.cleansers.some((c) => c.row.softens);
      const dgh = softened ? Math.min(spec.hardnessDgh, 2) : spec.hardnessDgh;
      const scums = spec.cleansers.some((c) => c.row.hardWaterPenalty);
      const fHard = scums ? 1 - 0.6 * clamp01((dgh - 6) / 12) : 1;
      // Heat: cold water does most of what warm does; hot water more.
      const fT = 0.8 + 0.4 * clamp01((spec.waterK - 283) / 60);
      // Effort: a scrub (3) does more than a dip (1); never a full clean
      // on time alone.
      const fEffort = Math.min(1.6, 0.7 + 0.3 * Math.max(0, spec.effort));
      for (const kind of this.soilKinds(site)) {
        const row = dirtRow(kind);
        const setsAt = row?.setsAboveK ?? null;
        // ⭐ Hot water SETS blood before it can lift it (D8).
        if (setsAt !== null && spec.waterK >= setsAt && !this.isSoilSet(kind, site)) {
          this.setSoilSet(kind, site, true);
          setNow.push(kind);
        }
        const set = this.isSoilSet(kind, site);
        const answers = set ? (row?.setAnswersTo ?? []) : (row?.answersTo ?? []);
        const water = set ? 0.02 : (row?.waterLifts ?? 0.3);
        const helped = actions.some((a) => answers.includes(a));
        const base = helped ? Math.max(water, 0.9) : water;
        const fraction = clamp01(base * fT * fEffort * (helped ? fHard : 1));
        const got = this.removeSoil(kind, fraction, site);
        if (got > 0) removed[kind] = got;
      }
      // ⭐ Washing REMOVES microbes from a surface (the shipped rule): a
      // knife, a board, a kit — anything that carries them. Heat is what
      // KILLS them (D14).
      const self = this as unknown as Stuff;
      if (site === WHOLE_SITE && MixinApi.isContaminable(self)) {
        self.clearContamination();
      }
      const first = spec.cleansers[0]?.row ?? null;
      this.recordWash(site, {
        atS: nowS(),
        cleanserKey: first?.key ?? null,
        action: first?.action ?? null,
        waterK: spec.waterK,
        hardnessDgh: dgh,
      });
      return { removed, setNow, damage: [], band: this.soilBand(site) };
    }

    // ---------- internals ----------

    private siteTotal(site: string): number {
      let total = 0;
      for (const [key, load] of Object.entries(this.deposits)) {
        if (splitKey(key)[0] === site) total += load;
      }
      return total;
    }

    private kindLoad(kind: string, site?: string): number {
      if (site !== undefined) return this.soilLoad(kind, site);
      let worst = 0;
      for (const [key, load] of Object.entries(this.deposits)) {
        if (splitKey(key)[1] === kind) worst = Math.max(worst, load);
      }
      return worst;
    }

    private keepSample(site: string, kind: string, by: Stuff): void {
      if (!MixinApi.isVitals(by)) return;
      const type = by.bloodType();
      if (type === null) return;
      const donor = by.getIdentityPath() ?? by.getTemplatePath() ?? '';
      if (
        this.stains.some(
          (s) => s.site === site && s.kind === kind && s.donorIdentityPath === donor,
        )
      ) {
        return;
      }
      const species = MixinApi.isOrganism(by)
        ? (by.getSpecies()?.getTemplatePath() ?? '')
        : '';
      this.stains = [
        ...this.stains,
        {
          site,
          kind,
          set: false,
          type,
          system: by.bloodSystemOf(),
          speciesPath: species,
          donorIdentityPath: donor,
        },
      ];
    }
  };
}

// ---------- module-private helpers ----------

function depositKey(site: string, kind: string): string {
  return `${site}|${kind}`;
}

function splitKey(key: string): [string, string] {
  const at = key.lastIndexOf('|');
  return at < 0 ? [WHOLE_SITE, key] : [key.slice(0, at), key.slice(at + 1)];
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

function round(n: number): number {
  return Math.round(n * 1e4) / 1e4;
}

function nowS(): number {
  try {
    return WorldClockApi.getNow().rawValue();
  } catch {
    return 0;
  }
}

function dialOf(key: string, fallback: number): number {
  try {
    const raw = AppApi.setting(key);
    if (raw === '' || raw == null) return fallback;
    const n = Number.parseFloat(raw);
    return Number.isFinite(n) ? n : fallback;
  } catch {
    return fallback;
  }
}

function bandOf(load: number): SoilBand {
  if (load >= dialOf(AppSettingKeys.cleanlinessBandFilthyAt, SOIL_DEFAULTS.FILTHY_AT)) {
    return 'filthy';
  }
  if (load >= dialOf(AppSettingKeys.cleanlinessBandSoiledAt, SOIL_DEFAULTS.SOILED_AT)) {
    return 'soiled';
  }
  if (load >= dialOf(AppSettingKeys.cleanlinessBandMarkedAt, SOIL_DEFAULTS.MARKED_AT)) {
    return 'marked';
  }
  return 'clean';
}

/**
 * The dirt row for `kind`, synchronously — `look` cannot wait. ⭐ Loads on
 * first use: a cold catalogue is stood up and warmed in the background,
 * and this read answers `null` (the caller uses the key as the word).
 */
/** One warning per process for a catalogue that will not stand up. */
let warnedCold = false;

function dirtRow(kind: string): DirtKindDescriptor | null {
  const cat = StuffApi.findByTemplatePath<DirtKindCatalogue>(
    TemplatePaths.dirtKindCatalogue,
  );
  if (!cat) {
    void StuffApi.singleton<DirtKindCatalogue>(TemplatePaths.dirtKindCatalogue)
      .then((c) => c.allWarmed())
      .catch((err: unknown) => {
        if (warnedCold) return;
        warnedCold = true;
        console.warn('Soilable: dirt catalogue load failed:', err);
      });
    return null;
  }
  return cat.peek(kind);
}

function joinWords(words: string[]): string {
  if (words.length <= 1) return words[0] ?? '';
  return `${words.slice(0, -1).join(', ')} and ${words[words.length - 1]}`;
}

/**
 * ⭐ The look line, worded by the host's {@link Soilable.soilLookLine} —
 * the whole-thing sentence by default, per part on a body, the boards and
 * the strewing on a floor. Too dim to make out marks, nothing is said.
 */
function soilAugmenter(text: string, host: Stuff, viewer: Stuff): string {
  if (!MixinApi.isSoilable(host)) return text;
  const line = host.soilLookLine(viewer);
  if (!line) return text;
  if (!PerceptionApi.canMakeOutMarks(viewer, host)) return text;
  return `${text}\n\n${line}`;
}
