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
import type DirtKindCatalogue from '../../platform/idea/DirtKindCatalogue';
import type { DirtKindDescriptor } from '../../platform/idea/DirtKind';
import type { CleanserAction } from '../../platform/idea/Cleanser';

/** The four soil bands, cleanest first — words, ordinal. */
export const SOIL_BANDS = ['clean', 'marked', 'soiled', 'filthy'] as const;
export type SoilBand = (typeof SOIL_BANDS)[number];

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
  getHeatStamp(): HeatStamp | null;
  /** The last wash at `site`, or null. */
  getWashStamp(site?: string): WashStamp | null;
  /** Record a wash at `site` (the wash itself, and the laundress's). */
  recordWash(site: string, stamp: WashStamp): void;

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
      const row = dirtRow(kind);
      if (row && Object.keys(row.contaminates).length > 0) {
        const self = this as unknown as Stuff;
        if (MixinApi.isContaminable(self)) {
          for (const [pathogen, severity] of Object.entries(row.contaminates)) {
            self.contaminate(pathogen, Math.min(1, severity * amount));
          }
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
function dirtRow(kind: string): DirtKindDescriptor | null {
  const cat = StuffApi.findByTemplatePath<DirtKindCatalogue>(
    TemplatePaths.dirtKindCatalogue,
  );
  if (!cat) {
    void StuffApi.singleton<DirtKindCatalogue>(TemplatePaths.dirtKindCatalogue)
      .then((c) => c.allWarmed())
      .catch((err: unknown) =>
        console.warn('Soilable: dirt catalogue load failed:', err),
      );
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
