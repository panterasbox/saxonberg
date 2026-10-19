/**
 * WaterExpanse — a sea: the kernel's `Expanse` frame with a water column
 * under it, and a surface the wind works on.
 *
 * ⭐ The water tier exists because of the COLUMN, not for water-flavoured
 * prose: depth, the bottom, and — derived from those with the wind and the
 * fetch — the sea state. A desert expanse would compose the kernel frame
 * directly; nothing here is needed for sand.
 *
 * ## Sea state is derived, and no row authors it (maritime D21)
 *
 * Four inputs: the WIND's direction (the narrowest band's lean, else the
 * expanse's prevailing wind) and strength (the realm's weather field plus
 * the band's lean), the FETCH (the narrowest band's, else the expanse's),
 * and the DEPTH. Significant wave height is the fetch-limited form
 * `Hs ≈ 0.0016 · U · √(F/g)`, capped at a fully developed sea
 * (`0.243 U²/g`), and STEEPENED where the water is shallower than eight
 * wave heights — so a long fetch running onto a shoal is worse than the
 * same wind over deep water, and the bar pilot's danger falls out with
 * nobody authoring *rough*. It is rendered in words, never a number.
 *
 * Rows live at `/stuff/idea/WaterExpanse/<key>` (the realm's own water,
 * editable by the realm), with their nodes and bands beneath.
 */

import { NavigationApi } from '@saxonberg/server/mud/api/navigation';
import { Expanse } from '@saxonberg/server/mud/lib/expanse/Expanse';
import {
  WaterSourceMixin,
  type WaterRead,
} from '@saxonberg/server/mud/lib/location/WaterSource';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import type FisheryRegistry from './FisheryRegistry';
import type { FisheryStanding } from './FisheryRegistry';
import type { GeoPosition } from '@saxonberg/server/mud/lib/expanse/GeoPosition';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { FieldMeta } from '@saxonberg/server/mud/lib/mixin';
import type { WaterState } from '@saxonberg/server/mud/platform/idea/species/Species';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { WeatherApi } from '@saxonberg/server/mud/api/weather';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import { AppApi } from '@saxonberg/server/mud/api/app';
import WaterBand from './WaterBand';

function numSetting(key: string, fallback: number): number {
  try {
    const n = Number(AppApi.setting(key));
    return Number.isFinite(n) && n > 0 ? n : fallback;
  } catch {
    return fallback;
  }
}

const G = 9.81;
/** A breeze where no weather field reaches (an adrift boat, a bare test). */
const STILL_AIR_MPS = 5;

/** Sea-state words by significant wave height, metres (Douglas). */
const SEA_WORDS: ReadonlyArray<[number, string]> = [
  [0.1, 'calm'],
  [0.5, 'smooth'],
  [1.25, 'slight'],
  [2.5, 'moderate'],
  [4, 'rough'],
  [Infinity, 'very rough'],
];

/** What the sea is doing at a position. */
/** The register a sea's fishery read comes from (a path, not an import — no cycle). */
const FISHERY_PATH = '/system/water/idea/FisheryRegistry';
/** What a bucket over the side brings up. */
const SALT_WATER_PATH = '/stuff/idea/material/bulk/salt-water';

/** The source's own half of a sea's read. */
interface SeaReadState {
  line: string;
  standing: FisheryStanding | null;
  disciplineKey: string | null;
}

export interface SeaState {
  /** Significant wave height, metres — internal, never shown. */
  heightM: number;
  /** The word for it. */
  words: string;
  /** Short and steep over a shoal. */
  steep: boolean;
  /** The direction the wind and sea come FROM, degrees. */
  fromDeg: number;
  /** A multiplier for wear: 0 in a calm, ~1 in a moderate sea. */
  roughness: number;
}

export default class WaterExpanse extends WaterSourceMixin(Expanse) {
  static fieldMeta: FieldMeta = {
    depthM: { persistent: true, authorable: true },
    fetchKm: { persistent: true, authorable: true },
    bottom: { persistent: true, authorable: true },
    stock: { persistent: true, authorable: true },
    waterTemperatureK: { persistent: true, authorable: true },
    salinityPpt: { persistent: true, authorable: true },
    clarityM: { persistent: true, authorable: true },
  };

  /** Depth where no band says otherwise, metres. */
  protected depthM = 60;
  /** Fetch where no band says otherwise, km. */
  protected fetchKm = 200;
  protected bottom = '';
  /** What lives in this sea anywhere — stock key → abundance (0..1). */
  protected stock: Record<string, number> = {};
  protected waterTemperatureK = 285;
  protected salinityPpt = 35;
  /** How deep light reaches, m (underwater D6). Open sea is clear. */
  protected clarityM = 10;

  /**
   * Place path → the craft whose deck it is (`''` = none), resolved once
   * per place through the structure catalogue. Transient.
   */
  private craftOfPlace = new Map<string, string>();

  /* ───────────── the sea a shore cites (maritime revision 3) ───────────── */

  /**
   * ⭐ Where on this sea `place` stands, NOW: a deck is wherever its
   * craft is; a beach is at its nearest landing. `null` until knowable
   * (the craft not yet resolved, the landings not yet compiled).
   */
  public override currentWaterRef(citation: string, place: Stuff): string | null {
    void citation;
    const at = this.positionFor(place);
    return at === null ? null : this.refAt(at);
  }

  public override async readWater(
    citation: string,
    place: Stuff,
    nowS: number,
  ): Promise<WaterRead | null> {
    await this.resolveCraftOf(place);
    await this.nodes().catch(() => undefined);
    const at = this.positionFor(place);
    const name = this.getName() || 'the sea';
    if (at === null) {
      return { ref: citation, atS: nowS, name, pending: true, frozen: false, draw: null };
    }
    const ref = this.refAt(at);
    const line = await this.seaReadAt(at, place);
    let standing: FisheryStanding | null = null;
    let disciplineKey: string | null = null;
    try {
      const registry = await StuffApi.singleton<FisheryRegistry>(FISHERY_PATH);
      standing = await registry.standingAt(ref, nowS).catch(() => null);
      disciplineKey = await registry.readDisciplineKey();
    } catch {
      /* the sea, read physically */
    }
    const opaque: SeaReadState = { line, standing, disciplineKey };
    return {
      ref,
      atS: nowS,
      name,
      // No sea ice is modelled; a frozen water is a reach's.
      frozen: false,
      levelM: 0,
      clarityM: this.clarityM,
      draw: { materialPath: SALT_WATER_PATH, temperatureK: this.waterTemperatureK },
      opaque,
    };
  }

  public override waterLinesFor(read: WaterRead, viewer: Stuff): string[] {
    const state = read.opaque as SeaReadState | undefined;
    if (!state) return [];
    const lines = [state.line];
    if (state.standing !== null) {
      const registry = StuffApi.findByTemplatePath<FisheryRegistry>(FISHERY_PATH);
      if (registry) lines.push(...registry.readForViewer(state.standing, state.disciplineKey, viewer));
    }
    return lines;
  }

  /** The 0.1° cell grammar the fishery keys a sea on. */
  private refAt(at: GeoPosition): string {
    return `${this.getTemplatePath()}@${at.latDeg.toFixed(1)},${at.lonDeg.toFixed(1)}`;
  }

  /** A deck's craft position on THIS sea, else the place's nearest landing. */
  private positionFor(place: Stuff): GeoPosition | null {
    const path = place.getTemplatePath() ?? '';
    const craftPath = this.craftOfPlace.get(path);
    if (craftPath) {
      const craft = StuffApi.findByTemplatePath<Stuff>(craftPath);
      if (craft && MixinApi.isPositioned(craft) && craft.getExpanse() === this.getTemplatePath()) {
        return craft.getExpansePosition() ?? null;
      }
    }
    return path ? this.peekShorePositionFor(path) : null;
  }

  private async resolveCraftOf(place: Stuff): Promise<void> {
    const path = place.getTemplatePath() ?? '';
    if (!path || this.craftOfPlace.has(path)) return;
    try {
      // The craft this place belongs to — attached to it in the location
      // graph's record (never a catalogue of every structure).
      const craft = await NavigationApi.structureAt(path);
      this.craftOfPlace.set(path, craft?.getTemplatePath() ?? '');
    } catch {
      /* asked again on the next read */
    }
  }

  public getDepthM(): number { return this.depthM; }
  public setDepthM(v: number): void { this.depthM = Math.max(0, Number(v) || 0); }
  public getFetchKm(): number { return this.fetchKm; }
  public setFetchKm(v: number): void { this.fetchKm = Math.max(0, Number(v) || 0); }
  public getBottom(): string { return this.bottom; }
  public setBottom(v: string): void { this.bottom = (v ?? '').trim(); }
  public getStock(): Record<string, number> { return { ...this.stock }; }
  public setStock(v: Record<string, number> | null): void { this.stock = { ...(v ?? {}) }; }
  public getWaterTemperatureK(): number { return this.waterTemperatureK; }
  public setWaterTemperatureK(v: number): void { this.waterTemperatureK = Number(v) || 285; }
  public getSalinityPpt(): number { return this.salinityPpt; }
  public setSalinityPpt(v: number): void { this.salinityPpt = Math.max(0, Number(v) || 0); }

  /** The narrowest WATER band containing `pos`, or `null`. */
  private async waterBandAt(pos: GeoPosition): Promise<WaterBand | null> {
    for (const b of await this.bandsAt(pos)) if (b instanceof WaterBand) return b;
    return null;
  }

  /** How deep the water is at `pos`, metres — what the lead finds. */
  public async depthAt(pos: GeoPosition): Promise<number> {
    return (await this.waterBandAt(pos))?.getDepthM() ?? this.depthM;
  }

  /** What the lead brings up at `pos`. */
  public async bottomAt(pos: GeoPosition): Promise<string> {
    return (await this.waterBandAt(pos))?.getBottom() || this.bottom;
  }

  /** ⭐ The sea state at `pos` — derived from wind, fetch and depth. */
  public async seaStateAt(pos: GeoPosition, scope: Stuff | null): Promise<SeaState> {
    const field = await this.fieldAt(pos);
    const wb = await this.waterBandAt(pos);
    const lean = field.band?.getLean() ?? null;
    const fromDeg = lean?.directionDeg ?? this.prevailingDeg;
    const u = Math.max(0.5, this.windMps(scope) + (lean?.strengthMps ?? 0));
    const fetchM = (wb?.getFetchKm() ?? this.fetchKm) * 1000;
    const depth = wb?.getDepthM() ?? this.depthM;
    let hs = Math.min(0.0016 * u * Math.sqrt(fetchM / G), (0.243 * u * u) / G);
    const steep = depth > 0 && depth < hs * 8;
    // A shoal does not make the waves taller so much as shorter and
    // steeper; a step up the scale is how it reads from the deck.
    if (steep) hs *= 1 + Math.min(1, (hs * 8) / depth - 1) * 0.6;
    const words = (SEA_WORDS.find(([max]) => hs < max) ?? SEA_WORDS[SEA_WORDS.length - 1]!)[1];
    return { heightM: hs, words, steep, fromDeg, roughness: Math.min(3, hs / 2) };
  }

  /**
   * ⭐ What the water looks like at `pos` from the deck — the sea state,
   * derived. What the gunwale reads; never a position, never authored.
   */
  public async seaReadAt(pos: GeoPosition, scope: Stuff | null): Promise<string> {
    const sea = await this.seaStateAt(pos, scope);
    const from = compass(sea.fromDeg);
    const line = sea.words === 'calm'
      ? 'The sea is calm.'
      : `The sea is ${sea.words}${sea.steep ? ', short and steep' : ''}, running from the ${from}.`;
    return line;
  }

  /**
   * ⭐ What the SEA changed across a boundary (maritime R9), on top of the
   * frame's set: the sea getting up or going down (a step on the scale),
   * turning short and steep over a shoal, and the water paling over
   * shallow ground or darkening as the bottom falls away. Nothing when
   * nothing a person on deck would notice changed.
   */
  public override async changesAcross(
    before: GeoPosition,
    after: GeoPosition,
    scope: Stuff | null,
  ): Promise<string[]> {
    const out: string[] = [];
    const a = await this.seaStateAt(before, scope);
    const b = await this.seaStateAt(after, scope);
    const rank = (w: string): number => SEA_WORDS.findIndex(([, words]) => words === w);
    if (rank(b.words) > rank(a.words) || (b.steep && !a.steep)) {
      out.push(`The sea gets up — ${b.words}${b.steep ? ', short and steep' : ''}.`);
    } else if (rank(b.words) < rank(a.words)) {
      out.push(b.words === 'calm' ? 'The sea goes down to a calm.' : `The sea goes down — ${b.words}.`);
    }
    const shoal = numSetting('expanse.shoalM', 12);
    const da = await this.depthAt(before);
    const db = await this.depthAt(after);
    if (da >= shoal && db < shoal) out.push('The water pales over shallow ground.');
    else if (da < shoal && db >= shoal) out.push('The water darkens as the bottom falls away.');
    out.push(...(await super.changesAcross(before, after, scope)));
    return out;
  }

  /** How hard the sea is on gear at `pos`. */
  public override async roughnessAt(pos: GeoPosition, scope: Stuff | null): Promise<number> {
    return (await this.seaStateAt(pos, scope)).roughness;
  }

  /** ⭐ The water at `pos`, in the words every fish's tolerances are written in. */
  public async waterStateAt(pos: GeoPosition): Promise<WaterState> {
    const band = (await this.fieldAt(pos)).band;
    return {
      temperatureK: this.waterTemperatureK,
      currentMps: (band?.getSetKn() ?? 0) * 0.5144,
      salinityPpt: this.salinityPpt,
      oxygenMgL: 8,
      pH: 8.1,
      hardnessDgh: 50,
      nitrateMgL: 0.5,
      ammoniaMgL: 0,
      nitriteMgL: 0,
      contamination: 0,
    };
  }

  /** The wind the realm's weather gives here, m/s. */
  private windMps(scope: Stuff | null): number {
    if (scope === null || !MixinApi.isContainer(scope)) return STILL_AIR_MPS;
    try {
      return WeatherApi.deviatedFieldFor(scope, null, 'wind', WorldClockApi.getNow()).rawValue();
    } catch {
      return STILL_AIR_MPS;
    }
  }
}

function compass(deg: number): string {
  const points = ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west'];
  return points[Math.round((((deg % 360) + 360) % 360) / 45) % 8]!;
}
