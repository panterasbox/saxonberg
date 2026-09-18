/**
 * FisheryRead — **the shape this trade meets the water pack's register
 * over**, and nothing else. A duck-typed view of `FisheryRegistry`'s
 * reading and writing surface, so the trade never imports the water
 * pack's class (the `GristMill` rule: two packs meet over a shape).
 *
 * ⚠ Kept in step by the water pack's own tests; a field added there and
 * not here is simply invisible to the trade, which is the honest
 * failure. Types only — nothing here is instantiated.
 */

import type { WaterState } from '@saxonberg/server/mud/platform/idea/species/Species';
import type { CompetenceBandName } from '@saxonberg/server/mud/lib/advancement/CompetenceBand';

export interface SpeciesStanding {
  speciesPath: string;
  name: string;
  capacity: number;
  /** What it would hold at a perfect fit. */
  full: number;
  level: number;
  fit: number;
  limiting: string | null;
  stocked: boolean;
  role: 'bait' | 'forage' | 'predator' | 'apex';
  fightRating: number;
}

export interface FisheryStanding {
  reachRef: string;
  species: SpeciesStanding[];
  water: WaterState;
  contamination: { level: number; byKind: Record<string, number> } | null;
}

export interface FisheryRegistry {
  standingAt(reachRef: string, nowS: number): Promise<FisheryStanding | null>;
  readFor(standing: FisheryStanding, band: CompetenceBandName): string[];
  draw(reachRef: string, speciesPath: string, count: number, nowS: number): Promise<number>;
  release(reachRef: string, speciesPath: string, count: number, nowS: number): Promise<void>;
}
