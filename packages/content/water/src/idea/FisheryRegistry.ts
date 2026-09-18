/**
 * FisheryRegistry — **every reach holds what belongs in it, unasked**
 * (fishing D1/D3).
 *
 * The fishery is a RECORD on a reach, never an object in a room, and it
 * is **derived**: which species a water holds and how many at full comes
 * from the species' authored habitats read against what the catalogue
 * says the water is like right now (`waterStateAt`). Nobody writes a
 * table for the confluence or the moor's mere; the moor holds trout and
 * not mullet because the Holloway's head is cold, fast, fresh and soft,
 * and the trout's tolerances say so.
 *
 * ## What the record holds
 *
 * Only what cannot derive: how far each species has been **drawn** down
 * and not yet recovered, and when that was last reconciled. Recovery is
 * reconcile-on-read — the drawn map decays exponentially toward zero
 * with a half-life in game days — and is **written only on a draw or a
 * release**, never on a `look`. A reach nobody has fished has no
 * document at all and reads against `drawn = {}`, which is what makes
 * *every reach holds fish* true at zero cost.
 *
 * ## Why the WATER pack keeps it
 *
 * The record reads the catalogue, which the kernel cannot import; two
 * trades (fishing now, hunting later) will read it and have no common
 * pack ancestor below `water`; and *a system is true whether or not
 * anyone participates* — fish are in the river whether or not anybody
 * fishes. The trade depends on the water; the water learns nothing about
 * fishing. The one word of a trade here is a **setting**
 * (`water.fishery.readDiscipline`): the Discipline whose band gates the
 * species read, defaulting to the fishing trade's row, and honest when
 * that row is not installed (the physical read only).
 *
 * ## The one law
 *
 * `Species.fitIn` — Liebig's minimum over every authored tolerance,
 * naming the limiter. This file does not restate it; it asks the
 * species. `capacity = round(fit × abundance × reachLengthKm)`; a
 * `stocks:` entry on the node overrides that with the authored number
 * and says so.
 *
 * See [docs/subsystems/fishing.md] and [docs/subsystems/watershed.md].
 */

import { Idea } from '@saxonberg/server/mud/lib/stuff/Idea';
import { DocumentApi } from '@saxonberg/server/mud/api/document';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { AppApi } from '@saxonberg/server/mud/api/app';
import { CelestialApi } from '@saxonberg/server/mud/api/celestial';
import { Template } from '@saxonberg/server/mud/lib/stuff/Template';
import { EARTH_LIKE } from '@saxonberg/server/mud/lib/time/CelestialProfile';
import {
  RegistrarMixin,
  type Registrar,
} from '@saxonberg/server/mud/lib/document/Register';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { EvictionContext } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { VetoResult } from '@saxonberg/server/mud/lib/errors';
import type Species from '@saxonberg/server/mud/platform/idea/species/Species';
import type {
  Habitat,
  WaterParameter,
  WaterState,
} from '@saxonberg/server/mud/platform/idea/species/Species';
import {
  CompetenceBand,
  type CompetenceBandName,
} from '@saxonberg/server/mud/lib/advancement/CompetenceBand';
import {
  WATERCOURSE_CATALOGUE_PATH,
  type ContaminationReading,
  type FlowReading,
  type ReachRef,
} from './WatercourseCatalogue';
import type WatercourseCatalogue from './WatercourseCatalogue';

/** Where the register lives in the document tree — titled to the water group. */
export const FISHERY_PREFIX = '/system/water/fisheries';
/** The document kind the platform declares for a reach's record. */
export const FISHERY_KIND = 'fishery';
/** The branch the register's documents are owned by: the water system. */
export const FISHERY_OWNER = '/system/water';

/** The class every species row is found by (the catalogue's own pattern). */
const SPECIES_CLASS = '/platform/idea/species/Species';

/** The singleton's own template path — its row ships with this pack. */
export const FISHERY_REGISTRY_PATH = '/system/water/idea/FisheryRegistry';

const SECONDS_PER_DAY = 86_400;

/** The record — only what cannot derive. */
export interface FisheryRecord {
  reachRef: ReachRef;
  /** Per species template path: fish drawn down and not yet recovered. */
  drawn: Record<string, number>;
  /** Game-seconds the drawn map was last reconciled. */
  reconciledAtS: number;
}

/** One species' standing in a reach right now. */
export interface SpeciesStanding {
  speciesPath: string;
  /** What the water read calls it — the row's first common name, else the path's leaf. */
  name: string;
  /** Individuals the reach holds at full. */
  capacity: number;
  /**
   * Individuals it WOULD hold at a perfect fit — the species' abundance
   * over the reach. The band words read `level / full`, so a species the
   * water barely suits reads *a few* even at capacity, and the limiter
   * line beside it says why.
   */
  full: number;
  /** Individuals it holds now — capacity less what is drawn. */
  level: number;
  /** `0..1` — the species' fit in this water. */
  fit: number;
  /** The one factor that limits it, or `null` at a perfect fit. */
  limiting: WaterParameter | 'season' | null;
  /** Authored on the node rather than derived. */
  stocked: boolean;
  role: Habitat['role'];
  fightRating: number;
}

/** What a reach holds — the whole read, for a trade, a brain or a test. */
export interface FisheryStanding {
  reachRef: ReachRef;
  species: SpeciesStanding[];
  water: WaterState;
  flow: FlowReading | null;
  contamination: ContaminationReading | null;
}

/** The catalogue's reading surface, as this register needs it. */
type Catalogue = Pick<
  WatercourseCatalogue,
  'reachOf' | 'waterStateAt' | 'flowAt' | 'liveDraws' | 'contaminationAt'
>;

export default class FisheryRegistry extends RegistrarMixin(Idea) {
  constructor() {
    super();
    this.registerPrefix = FISHERY_PREFIX;
    this.registerOwner = FISHERY_OWNER;
    this.registerKind = FISHERY_KIND;
  }

  /** A load-bearing singleton with a gated write surface is never culled. */
  public canEvict(_context: EvictionContext): VetoResult {
    return { ok: false, reason: 'the fishery record is the register itself' };
  }

  // ---------- the read ----------

  /**
   * ⭐ **What a reach holds right now.** Pure derive; writes nothing.
   * `null` when the citation names no reach.
   */
  public async standingAt(
    reachRef: ReachRef,
    nowS: number,
  ): Promise<FisheryStanding | null> {
    const cat = await this.catalogue();
    const reach = await cat.reachOf(reachRef);
    if (reach === null) return null;
    const water = await cat.waterStateAt(reachRef, nowS);
    if (water === null) return null;
    const flow = await cat.flowAt(reachRef, nowS, await cat.liveDraws(nowS));
    const contamination = await cat.contaminationAt(reachRef, nowS);
    const season = CelestialApi.seasonFor(EARTH_LIKE, nowS);
    const lengthKm = dial('water.fishery.reachLengthKm', 1);
    const record = await this.read(reachRef);
    const drawn = record === null ? {} : recovered(record, nowS).drawn;

    const species: SpeciesStanding[] = [];
    for (const sp of await this.species()) {
      const habitat = sp.getHabitat();
      if (habitat === null) continue;
      const path = sp.getTemplatePath() ?? '';
      const { fit, limiting } = sp.fitIn(water, season);
      const stock = reach.stocks.find((s) => s.species === path);
      const capacity =
        stock !== undefined
          ? stock.capacity
          : Math.round(fit * habitat.abundance * lengthKm);
      const level = Math.max(0, capacity - Math.round(drawn[path] ?? 0));
      const full = stock !== undefined ? stock.capacity : Math.max(1, Math.round(habitat.abundance * lengthKm));
      species.push({
        speciesPath: path,
        name: sp.getCommonNames()[0] ?? nameOf(path),
        capacity,
        full,
        level,
        fit: stock !== undefined ? 1 : fit,
        limiting: stock !== undefined ? null : limiting,
        stocked: stock !== undefined,
        role: habitat.role,
        fightRating: habitat.fightRating,
      });
    }
    return { reachRef, species, water, flow, contamination };
  }

  /**
   * ⭐ **The banded prose** a shore renders and a fisher speaks: what
   * this water holds, at the reader's competence in the Discipline the
   * `water.fishery.readDiscipline` setting names. Never a number.
   *
   * - `untrained` — nothing of what it holds (the physical read is the
   *   shore's, not this method's);
   * - `novice` — *there are fish in this water*, or *fished out*;
   * - `competent` — the species by name, in bands (*plenty of eels,
   *   a few mullet*), the apex unnamed (*something large*);
   * - `proficient`+ — the apex named (*a royal fish*), and for every
   *   species the water does not suit, **the one factor that limits it**
   *   (*too warm for trout this month*).
   */
  public readFor(standing: FisheryStanding, band: CompetenceBandName): string[] {
    const rank = CompetenceBand.rank(band);
    if (rank < CompetenceBand.rank('novice')) return [];
    const emptyBelow = dial('water.fishery.read.emptyBelow', 0.1);
    const present = standing.species.filter((s) => s.capacity > 0);
    const held = present.filter((s) => s.level > 0);
    const lines: string[] = [];
    if (present.length === 0) return ['Nothing lives in this water.'];
    const fishedOut = held.every((s) => s.level / Math.max(1, s.capacity) < emptyBelow);
    if (fishedOut) {
      lines.push('This water is fished out.');
      if (rank < CompetenceBand.rank('competent')) return lines;
    } else if (rank < CompetenceBand.rank('competent')) {
      return ['There are fish in this water.'];
    }

    const named = held.filter((s) => s.role !== 'apex');
    const apex = held.filter((s) => s.role === 'apex');
    if (!fishedOut && named.length > 0) {
      const parts = named
        .sort((a, b) => b.level - a.level)
        .map((s) => `${bandWord(s.level / Math.max(1, s.full))} ${plural(s.name)}`);
      lines.push(`${capitalise(joinList(parts))} in this water.`);
      for (const s of named) {
        if (s.stocked) lines.push(`The water is stocked with ${plural(s.name)}.`);
      }
    }
    if (apex.length > 0) {
      lines.push(
        rank >= CompetenceBand.rank('proficient')
          ? `And a royal fish — ${joinList(apex.map((s) => `a ${s.name}`))} — lies in the deep water.`
          : 'And something large.',
      );
    }
    if (rank >= CompetenceBand.rank('proficient')) {
      for (const s of standing.species) {
        if (s.stocked || s.limiting === null || s.fit >= 1) continue;
        const why = limiterWords(s.limiting, standing.water, s.name);
        if (why) lines.push(why);
      }
    }
    return lines;
  }

  // ---------- the writes ----------

  /**
   * Draw `count` of a species from a reach. Returns how many were
   * actually there to draw — the minimum of what was asked and the
   * level. Written.
   */
  public async draw(
    reachRef: ReachRef,
    speciesPath: string,
    count: number,
    nowS: number,
  ): Promise<number> {
    if (!(count > 0)) return 0;
    const standing = await this.standingAt(reachRef, nowS);
    if (standing === null) return 0;
    const sp = standing.species.find((s) => s.speciesPath === speciesPath);
    if (sp === undefined) return 0;
    const taken = Math.min(Math.floor(count), sp.level);
    if (taken <= 0) return 0;
    const record = recovered(
      (await this.read(reachRef)) ?? { reachRef, drawn: {}, reconciledAtS: nowS },
      nowS,
    );
    record.drawn[speciesPath] = (record.drawn[speciesPath] ?? 0) + taken;
    await this.write(record);
    return taken;
  }

  /** Put `count` of a species back. Written; never below zero drawn. */
  public async release(
    reachRef: ReachRef,
    speciesPath: string,
    count: number,
    nowS: number,
  ): Promise<void> {
    if (!(count > 0)) return;
    const existing = await this.read(reachRef);
    if (existing === null) return; // nothing was ever drawn here
    const record = recovered(existing, nowS);
    const left = (record.drawn[speciesPath] ?? 0) - count;
    if (left > 1e-6) record.drawn[speciesPath] = left;
    else delete record.drawn[speciesPath];
    await this.write(record);
  }

  // ---------- the register ----------

  /**
   * Read a reach's record. ⚠ The prefix check is the security boundary:
   * a `kind` tag is forgeable, a path under a branch titled to the water
   * group is not.
   */
  public async read(reachRef: ReachRef): Promise<FisheryRecord | null> {
    const path = pathOf(reachRef);
    if (path === null || !isRegistryPath(path)) return null;
    const doc = await DocumentApi.read(path);
    if (doc === null) return null;
    if (!isRegistryPath(doc.getPath())) return null;
    if (doc.getKind() !== FISHERY_KIND) return null;
    return recordOf(doc.getData());
  }

  private async write(record: FisheryRecord): Promise<void> {
    const path = pathOf(record.reachRef);
    if (path === null) return;
    await DocumentApi.saveToRegister(this as unknown as Stuff & Registrar, path, {
      ...record,
      drawn: { ...record.drawn },
    });
  }

  // ---------- the inputs ----------

  private async catalogue(): Promise<Catalogue> {
    return (await StuffApi.singleton<Stuff>(WATERCOURSE_CATALOGUE_PATH)) as unknown as Catalogue;
  }

  /**
   * Every species row, resolved live. Found by CLASS, the catalogue's
   * own pattern; a species with no `habitat` is skipped by the read.
   * ⚠ Not memoised: a species row installed later must show up.
   */
  private async species(): Promise<Species[]> {
    const out: Species[] = [];
    for (const tpl of await Template.findByClass(SPECIES_CLASS)) {
      const habitat = (tpl.data as { habitat?: unknown } | undefined)?.habitat;
      if (habitat === undefined || habitat === null) continue;
      const sp = await StuffApi.singleton<Species>(tpl.path);
      if (sp) out.push(sp);
    }
    return out;
  }
}

/* ───────────────────────── module-private ───────────────────────── */

/** `/system/water/fisheries/<course>/<node>`, or `null` for a malformed citation. */
function pathOf(reachRef: ReachRef): string | null {
  const [course, node, ...rest] = reachRef.split(':');
  if (!course || !node || rest.length > 0) return null;
  if (course.includes('/') || node.includes('/')) return null;
  return `${FISHERY_PREFIX}/${course}/${node}`;
}

/** The separator is part of the test — `/system/water/fisheriesX` is not under the prefix. */
function isRegistryPath(path: string): boolean {
  return path.startsWith(`${FISHERY_PREFIX}/`);
}

function recordOf(data: unknown): FisheryRecord | null {
  if (typeof data !== 'object' || data === null) return null;
  const d = data as Record<string, unknown>;
  if (typeof d.reachRef !== 'string' || d.reachRef === '') return null;
  const drawn: Record<string, number> = {};
  if (typeof d.drawn === 'object' && d.drawn !== null) {
    for (const [k, v] of Object.entries(d.drawn as Record<string, unknown>)) {
      if (typeof v === 'number' && Number.isFinite(v) && v > 0) drawn[k] = v;
    }
  }
  return {
    reachRef: d.reachRef,
    drawn,
    reconciledAtS: typeof d.reconciledAtS === 'number' ? d.reconciledAtS : 0,
  };
}

/**
 * Recovery — reconcile-on-read: what was drawn decays toward zero with
 * a half-life in game days. Returns a fresh record stamped `nowS`; the
 * caller decides whether to write it.
 */
function recovered(record: FisheryRecord, nowS: number): FisheryRecord {
  const halfLifeS = Math.max(1e-6, dial('water.fishery.recoveryHalfLifeDays', 2)) * SECONDS_PER_DAY;
  const elapsed = Math.max(0, nowS - record.reconciledAtS);
  const factor = Math.pow(0.5, elapsed / halfLifeS);
  const drawn: Record<string, number> = {};
  for (const [k, v] of Object.entries(record.drawn)) {
    const left = v * factor;
    if (left > 0.05) drawn[k] = left;
  }
  return { reachRef: record.reachRef, drawn, reconciledAtS: nowS };
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

/** The species' name from its path — `brown-trout` → `brown trout`. */
function nameOf(speciesPath: string): string {
  const leaf = speciesPath.split('/').pop() ?? speciesPath;
  return leaf.replace(/-/g, ' ');
}

function plural(name: string): string {
  // Fish names are mostly their own plural; the crab is the exception
  // among the shipped six and any ending in a hard consonant follows it.
  if (/(trout|carp|eel|mullet|sturgeon|fish|pike|perch|bream)$/.test(name)) return name;
  return `${name}s`;
}

function bandWord(fraction: number): string {
  if (fraction >= 0.7) return 'plenty of';
  if (fraction >= 0.35) return 'some';
  return 'a few';
}

function joinList(parts: string[]): string {
  if (parts.length <= 1) return parts[0] ?? '';
  return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
}

function capitalise(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** The limiter, in words, for a species the water does not suit. */
function limiterWords(
  limiting: WaterParameter | 'season',
  water: WaterState,
  name: string,
): string | null {
  switch (limiting) {
    case 'season':
      return `Not the season for ${name}.`;
    case 'temperatureK':
      return water.temperatureK > 288
        ? `Too warm for ${name} this month.`
        : `Too cold for ${name} this month.`;
    case 'currentMps':
      return water.currentMps < 0.3
        ? `Too slow a water for ${name}.`
        : `Too fast a water for ${name}.`;
    case 'salinityPpt':
      return water.salinityPpt < 5
        ? `Not enough salt for ${name} this far up.`
        : `Too much salt for ${name} this far down.`;
    case 'oxygenMgL':
      return `The water is too still and warm to hold air for ${name}.`;
    case 'pH':
      return water.pH < 7 ? `Too sour a water for ${name}.` : `Too sweet a water for ${name}.`;
    case 'hardnessDgh':
      return water.hardnessDgh < 6 ? `Too soft a water for ${name}.` : `Too hard a water for ${name}.`;
    case 'nitrateMgL':
      return `Too rich a water for ${name} — something is feeding it.`;
    case 'ammoniaMgL':
    case 'nitriteMgL':
      return `The water is foul for ${name}.`;
    case 'contamination':
      return `The water is too dirty for ${name}.`;
  }
}
