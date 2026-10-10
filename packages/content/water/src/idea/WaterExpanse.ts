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

import { Expanse } from '@saxonberg/server/mud/lib/expanse/Expanse';
import type { GeoPosition } from '@saxonberg/server/mud/lib/expanse/GeoPosition';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { FieldMeta } from '@saxonberg/server/mud/lib/mixin';
import type { WaterState } from '@saxonberg/server/mud/platform/idea/species/Species';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { WeatherApi } from '@saxonberg/server/mud/api/weather';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import WaterBand from './WaterBand';

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

export default class WaterExpanse extends Expanse {
  static fieldMeta: FieldMeta = {
    depthM: { persistent: true, authorable: true },
    fetchKm: { persistent: true, authorable: true },
    bottom: { persistent: true, authorable: true },
    stock: { persistent: true, authorable: true },
    waterTemperatureK: { persistent: true, authorable: true },
    salinityPpt: { persistent: true, authorable: true },
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

  /** ⭐ What the water says at `pos`: the sea state, then the band's own character. */
  public override async readAt(pos: GeoPosition, scope: Stuff | null): Promise<string> {
    const sea = await this.seaStateAt(pos, scope);
    const from = compass(sea.fromDeg);
    let line = sea.words === 'calm'
      ? 'The sea is calm.'
      : `The sea is ${sea.words}${sea.steep ? ', short and steep' : ''}, running from the ${from}.`;
    const own = (await this.fieldAt(pos)).band?.getOutsideDescription() ?? '';
    if (own !== '') line += ` ${own}`;
    return line;
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
