/**
 * Shore — **a room-fixed feature that cites a reach and reads the
 * water** (fishing D15).
 *
 * A riverbank, a mere on a heath, a wharf's edge: the thing in a room
 * that says *this room is beside that water*. It is the water system's
 * and not any trade's, by the `/system/` test — a bank is there whether
 * or not anyone fishes — and it is what makes a room whose Locality
 * cites no reach (the wharf: `terminus/city` declares none) fishable at
 * all. A verb that wants a reach takes a Shore as its declared argument
 * and falls back to the Locality's reach when none is bound; a locality
 * that never mentioned fish has them with no row and no code.
 *
 * ## What `look` says
 *
 * The **physical read**, for everyone: the water's name, its breadth in
 * words, whether it runs or lies still, whether it is fresh or salt,
 * warm or cold, soft or hard, and — a fact about the map, not a hazard
 * readout — *the outfall discharges into this water* when something
 * upstream does. Then the **fishery read**, at the viewer's band in
 * whatever Discipline `water.fishery.readDiscipline` names (the fishing
 * trade's row by default): the registry's `readFor`, which never prints
 * a number. The code knows *a Discipline path*, never the word fishing;
 * when the row the setting names is not installed the band is the floor
 * and the read is physical only — honest for a realm with water and no
 * fishing trade.
 *
 * ## The memo
 *
 * Every read the shore needs is async (the catalogue, the registry) and
 * an augmenter is sync, so the shore keeps a memo refreshed
 * fire-and-forget at `postRegister` and on every render once a weather
 * segment old — the `GristMill` shape. A shore asked before its first
 * refresh lands says *the water is hard to read yet*, which reads as
 * "not yet", never as a lie.
 */

import Thing from '@saxonberg/server/mud/platform/thing/Thing';
import { DetailedMixin } from '@saxonberg/server/mud/lib/description/Detailed';
import { PostRegistrationMixin } from '@saxonberg/server/mud/lib/stuff/PostRegistration';
import type { FieldMeta } from '@saxonberg/server/mud/lib/mixin';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { MarkupAugmenter } from '@saxonberg/server/mud/api/mml';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { AppApi } from '@saxonberg/server/mud/api/app';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import { TemplatePaths } from '@saxonberg/server/mud/lib/paths';
import {
  CompetenceBand,
  type CompetenceBandName,
} from '@saxonberg/server/mud/lib/advancement/CompetenceBand';
import type Discipline from '@saxonberg/server/mud/platform/idea/Discipline';
import { WATERCOURSE_CATALOGUE_PATH } from '../idea/WatercourseCatalogue';
import type WatercourseCatalogue from '../idea/WatercourseCatalogue';
import type { CompiledReach } from '../idea/WatercourseCatalogue';
import { FISHERY_REGISTRY_PATH } from '../idea/FisheryRegistry';
import type FisheryRegistry from '../idea/FisheryRegistry';
import type { FisheryStanding } from '../idea/FisheryRegistry';

/** The Discipline whose band gates the species read, when the setting is silent. */
const DEFAULT_READ_DISCIPLINE = '/trade/fishing/idea/Discipline/fishing';

/** The weather field is memoised per six-game-hour segment; asking more often buys nothing. */
const SEGMENT_S = 6 * 3600;

/** What the last refresh found. */
interface ShoreMemo {
  reach: CompiledReach | null;
  standing: FisheryStanding | null;
  /** The key of the Discipline the read is gated on, or `null` when its row is not installed. */
  disciplineKey: string | null;
  atS: number;
}

const ShoreBase = PostRegistrationMixin(DetailedMixin(Thing));

export default class Shore extends ShoreBase {
  static fieldMeta: FieldMeta = {
    reachRef: { persistent: true, authorable: true },
  };

  /** The water read, appended to the shore's own description on `look`. */
  static markupAugmenters: MarkupAugmenter[] = [waterReadAugmenter];

  /** `"<courseKey>:<nodeName>"` — the reach this shore stands on. */
  public reachRef = '';

  private _memo: ShoreMemo | null = null;
  /** The refresh in flight, so a `settle()` can await one already running. */
  private _refreshing: Promise<void> | null = null;

  public getReachRef(): string {
    return this.reachRef;
  }
  public setReachRef(value: string): void {
    this.reachRef = value ?? '';
  }

  /** A shore is part of the bank; nobody carries one off. */
  public override async postRegister(_context?: unknown): Promise<void> {
    this.fixedInPlace = true;
    void this.refresh();
  }

  /** The last read, or `null` before the first refresh lands. */
  public waterRead(): ShoreMemo | null {
    void this.refresh();
    return this._memo;
  }

  /**
   * Await the read so the next render is current — what a verb that is
   * about to print the water does, rather than trusting the memo.
   */
  public async settle(): Promise<void> {
    await this.refresh(true);
  }

  /** The viewer's band in the read Discipline — sync, the floor when unknown. */
  public bandOf(viewer: Stuff): CompetenceBandName {
    const key = this._memo?.disciplineKey ?? null;
    if (key === null || !MixinApi.isAdvancing(viewer)) return CompetenceBand.FLOOR;
    const bands = viewer.competenceDigestCached();
    return bands?.find((b) => b.discipline === key)?.band ?? CompetenceBand.FLOOR;
  }

  private refresh(force = false): Promise<void> {
    if (this._refreshing !== null) return this._refreshing;
    if (!StuffApi.findByTemplatePath(TemplatePaths.worldClockRegistry)) return Promise.resolve();
    const nowS = WorldClockApi.getNow().rawValue();
    if (!force && this._memo !== null && nowS - this._memo.atS < SEGMENT_S) return Promise.resolve();
    const run = this.readWater(nowS).finally(() => {
      this._refreshing = null;
    });
    this._refreshing = run;
    return run;
  }

  private async readWater(nowS: number): Promise<void> {
    const ref = this.reachRef;
    if (!ref) {
      this._memo = { reach: null, standing: null, disciplineKey: null, atS: nowS };
      return;
    }
    try {
      const cat = (await StuffApi.singleton<Stuff>(WATERCOURSE_CATALOGUE_PATH)) as unknown as WatercourseCatalogue;
      const registry = (await StuffApi.singleton<Stuff>(FISHERY_REGISTRY_PATH)) as unknown as FisheryRegistry;
      const reach = await cat.reachOf(ref);
      const standing = reach === null ? null : await registry.standingAt(ref, nowS);
      this._memo = { reach, standing, disciplineKey: await readDisciplineKey(), atS: nowS };
    } catch {
      // No catalogue, no registry, no reading — a bank, not a read.
      this._memo = { reach: null, standing: null, disciplineKey: null, atS: nowS };
    }
  }
}

/* ───────────────────────── module-private ───────────────────────── */

/**
 * The KEY of the Discipline the setting names, or `null` when its row is
 * not installed — the honest answer for a realm with water and no
 * fishing trade.
 */
async function readDisciplineKey(): Promise<string | null> {
  let path = DEFAULT_READ_DISCIPLINE;
  try {
    const raw = AppApi.setting('water.fishery.readDiscipline');
    if (typeof raw === 'string' && raw.trim() !== '') path = raw.trim();
  } catch {
    /* the default */
  }
  try {
    const row = await StuffApi.singleton<Discipline>(path);
    const key = row?.getKey?.() ?? '';
    return key === '' ? null : key;
  } catch {
    return null;
  }
}

function waterReadAugmenter(text: string, host: Stuff, viewer: Stuff): string {
  if (!(host instanceof Shore) || host.isDestroyed()) return text;
  const memo = host.waterRead();
  const lines: string[] = [];
  if (memo === null || memo.reach === null) {
    lines.push('The water is hard to read yet.');
  } else {
    lines.push(...physicalRead(memo));
    const standing = memo.standing;
    if (standing !== null && memo.disciplineKey !== null) {
      const registry = StuffApi.findByTemplatePath<Stuff>(FISHERY_REGISTRY_PATH) as unknown as FisheryRegistry | null;
      if (registry) lines.push(...registry.readFor(standing, host.bandOf(viewer)));
    }
  }
  const line = lines.join(' ');
  return text && text.length > 0 ? `${text}\n\n${line}` : line;
}

/** The physical read: for everyone, and never a number. */
function physicalRead(memo: ShoreMemo): string[] {
  const reach = memo.reach!;
  const out: string[] = [];
  const name = reach.courseName || reach.courseKey;
  out.push(`This is ${name}, ${breadthWords(reach.channelWidthM)}.`);
  const water = memo.standing?.water ?? null;
  if (water !== null) {
    const words = [
      currentWords(water.currentMps),
      salinityWords(water.salinityPpt),
      temperatureWords(water.temperatureK),
      hardnessWords(water.hardnessDgh),
    ];
    out.push(`The water is ${words.slice(0, -1).join(', ')} and ${words[words.length - 1]}.`);
  }
  if ((memo.standing?.contamination?.level ?? 0) > 0) {
    out.push('An outfall discharges into this water.');
  }
  return out;
}

function breadthWords(widthM: number | null): string {
  if (widthM === null || widthM < 10) return 'a narrow water';
  if (widthM < 30) return 'a stream you could throw a stone across';
  if (widthM < 100) return 'a broad river';
  return 'a great wide water';
}

function currentWords(mps: number): string {
  if (mps < 0.05) return 'still';
  if (mps < 0.3) return 'slow';
  return 'fast';
}

function salinityWords(ppt: number): string {
  if (ppt < 1) return 'fresh';
  if (ppt < 25) return 'brackish';
  return 'salt';
}

function temperatureWords(k: number): string {
  if (k < 280) return 'cold';
  if (k < 290) return 'cool';
  return 'warm';
}

function hardnessWords(dgh: number): string {
  return dgh < 6 ? 'soft' : 'hard';
}
