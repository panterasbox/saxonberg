/**
 * IceSheet — ⭐⭐ **the floor of a pool that freezes: a sheet somebody can
 * stand on while it bears them, and work** (storage-and-ice D12, D15, D16).
 *
 * A `WaterSurface` (the kernel's pool floor) that bears by its thickness.
 * The pool is one place; the ice is what is underfoot in it, and whether
 * you are on it or in the water under it is SUPPORT — the floor's ground
 * slot — never location.
 *
 * ## The log: areas by history
 *
 * A 4 000 m² sheet is not one thickness. What was done to it is a list of
 * patches, each an area with a history (`field`, `scraped`, `marked`,
 * `cut`, `broken`, `hole`), and each patch's ice is the reach's ice walk
 * run with that history: a cut patch is open water on the day it was cut
 * and regrows thinner from nothing; a scraped patch had no snow on it, so
 * it grows faster and BLACK until the next snow. The weather walk is the
 * catalogue's (`iceAtSync(ref, now, {openedAtS, bareFromS})`); the log is
 * only ever the history.
 *
 *  - `bears(load)` — some patch still bears it: a person stands on
 *    whatever area holds them.
 *  - `giveWay` — the patch that failed splits off a `broken` patch, so the
 *    hole somebody went through is open water in the log.
 *  - **The thaw wipes the log**: when the field reads open water, the log
 *    collapses to one field patch, every occupant goes in, and what was
 *    left on the ice floats or sinks (sinkers to the pool's bottom).
 *
 * ## Its own record
 *
 * A floor is a fixture with no container, so the persistence spine cannot
 * reach it through its room. It keeps its own `(scope, key)` record keyed
 * by its POOL (restored in `resolveUnderfoot`, captured after every act).
 */

import WaterSurface, { GROUND_SLOT } from '@saxonberg/server/mud/platform/thing/WaterSurface';
import { PersistableMixin } from '@saxonberg/server/mud/lib/persistence/Persistable';
import { PersistableApi } from '@saxonberg/server/mud/api/persistable';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import { WeatherApi } from '@saxonberg/server/mud/api/weather';
import { EmploymentApi } from '@saxonberg/server/mud/api/employment';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import type { FieldMeta } from '@saxonberg/server/mud/lib/mixin';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Container } from '@saxonberg/server/mud/lib/spatial/Container';
import type { Containable } from '@saxonberg/server/mud/lib/spatial/Containable';
import {
  CuttableMixin,
  type CutAnswer,
  type CutDone,
  type CutRefusal,
  type CutRequest,
  type Cuttable,
} from '@saxonberg/server/mud/lib/craft/Cuttable';
import type { ActDone, ActPlan, ActRefusal } from '@saxonberg/server/mud/lib/craft/ActPlan';
import WatercourseCatalogue, { OPEN_WATER_BELOW_M, type IceRecord, type IceHistory } from '../idea/WatercourseCatalogue';

/** What a patch of the sheet has been through. */
export type PatchKind = 'field' | 'scraped' | 'marked' | 'cut' | 'broken' | 'hole';

/** One patch of the sheet: an area with a history. */
export interface PatchRecord {
  id: string;
  kind: PatchKind;
  areaM2: number;
  /** When the patch began (the act that made it). */
  sinceS: number;
  /** Open water from this moment (a cut, a break, a hole); regrows from nothing. */
  openedAtS?: number;
  /** Bare of snow from this moment until the next snow (a scraping). */
  bareFromS?: number;
  /** The marking grid, m (a marked patch). */
  gridM?: number;
}

/** The catalogue, by path. */
const CATALOGUE_PATH = '/system/water/idea/WatercourseCatalogue';
/** The block a cut mints. */
const BLOCK_ROW = '/stuff/thing/ice-block';
/** Ice density, kg/m³. */
const ICE_DENSITY = 917;
/** Skim ice is open water — the catalogue's one threshold. */
const OPEN_BELOW_M = OPEN_WATER_BELOW_M;
/** A hole for a line, m². */
const HOLE_M2 = 0.1;
/** How a tool might say how much a pass covers. */
interface SweepTool {
  getSweepM2?(): number;
  getGridM?(): number;
  getDraught?(): string;
}

/** `groove`'s done facts: the grid scored, its spacing. */
export type GrooveDone = { gridCm: number };
/**
 * ⭐ Every reason `groove` is refused — trade-ice words each. (It lived on
 * the kernel's `Cuttable` until controller-liquidity D14: `groove` and
 * `scrape` have one host, so they are this sheet's METHODS, and their
 * vocabulary is this file's.)
 */
export type GrooveRefusal =
  | ActRefusal<'not-on-ice'>
  | ActRefusal<'no-horse'>
  | ActRefusal<'no-clear-ice'>
  | ActRefusal<'open'>;

/** `scrape`'s done facts: the area scraped down to the black. */
export type ScrapeDone = { areaM2: number };
/** ⭐ Every reason `scrape` is refused — trade-ice words each. */
export type ScrapeRefusal =
  | ActRefusal<'not-on-ice'>
  | ActRefusal<'no-snowy-ice'>
  | ActRefusal<'open'>
  | ActRefusal<'nothing-left'>;

const IceSheetBase = CuttableMixin(PersistableMixin(WaterSurface));

export default class IceSheet extends IceSheetBase implements Cuttable {
  static fieldMeta: FieldMeta = {
    // ⭐ The sheet's history is runtime state — and the TRUTH of its
    // thickness by patch is what `measure ice` only brackets.
    log: { persistent: true, runtimeState: true, spoiler: 1 },
    patchFootprintM2: { persistent: true, authorable: true },
  };

  /** The sheet's history, by patch. */
  public log: PatchRecord[] = [];
  /** The patch that breaks off under a body going through, m². */
  public patchFootprintM2 = 1;

  /** Transient: the reach the pool cites, once resolved. */
  private reachRef: string | null = null;
  /** Transient: the pool's path — the record's key. */
  private poolKey: string | null = null;
  /** Transient: a thaw is being applied. */
  private thawing = false;

  // ───────────────────────── reads ─────────────────────────

  public getLog(): PatchRecord[] {
    return this.ensureLog().map((p) => ({ ...p }));
  }

  /** The ice of one patch, now — `null` when the reach is not resolved. */
  public iceOf(patch: PatchRecord): IceRecord | null {
    const cat = this.catalogue();
    const ref = this.bindReach();
    if (cat === null || ref === null) return null;
    return cat.iceAtSync(ref, nowS(), historyOf(patch));
  }

  /** A patch by the word a player uses for it. */
  public patchByWord(word: string | null): PatchRecord | null {
    const log = this.ensureLog();
    const w = (word ?? '').trim().toLowerCase();
    if (w === '' || w === 'ice' || w === 'sheet' || w === 'field' || w === 'snowy') {
      return log.find((p) => p.kind === 'field') ?? null;
    }
    const kinds: Record<string, PatchKind> = {
      scraped: 'scraped',
      bare: 'scraped',
      marked: 'marked',
      grid: 'marked',
      cut: 'cut',
      channel: 'cut',
      broken: 'broken',
      hole: 'hole',
    };
    const kind = kinds[w];
    if (!kind) return null;
    const matching = log.filter((p) => p.kind === kind && p.areaM2 > 0);
    return matching.sort((a, b) => b.sinceS - a.sinceS)[0] ?? null;
  }

  // ───────────────────── the floor protocol ─────────────────────

  /** ⭐ Some patch still bears the load (and is not rotten). */
  public override bears(loadKg: number): boolean {
    if (this.bindReach() === null) return super.bears(loadKg);
    for (const p of this.ensureLog()) {
      if (!(p.areaM2 > 0)) continue;
      const ice = this.iceOf(p);
      if (ice === null) continue;
      if (ice.thicknessM > OPEN_BELOW_M && !ice.rotting && ice.bearsKg >= loadKg) return true;
    }
    return false;
  }

  /** Open water in the sheet: every patch that reads no ice (cuts, holes, a thawed field). */
  public override openWaterAreaM2(): number {
    if (this.bindReach() === null) return super.openWaterAreaM2();
    let open = 0;
    for (const p of this.ensureLog()) {
      const ice = this.iceOf(p);
      if (ice !== null && ice.thicknessM <= OPEN_BELOW_M) open += p.areaM2;
    }
    return open;
  }

  /**
   * ⭐ The drop, recorded: the patch that failed splits off a `broken`
   * patch of the footprint, so the hole a body went through is open water
   * in the log. A deliberate entry (`swim` at a hole) breaks nothing.
   */
  public override giveWay(occupant: Stuff, deliberate = false): boolean {
    if (!deliberate && this.bindReach() !== null) {
      const load = this.supportLoadKgOf(occupant);
      const failed = this.ensureLog()
        .filter((p) => p.areaM2 >= this.patchFootprintM2)
        .map((p) => ({ p, ice: this.iceOf(p) }))
        .filter((x) => x.ice !== null && x.ice.thicknessM > OPEN_BELOW_M && x.ice.bearsKg < load)
        .sort((a, b) => (a.ice!.thicknessM - b.ice!.thicknessM))[0];
      if (failed) this.split(failed.p, 'broken', this.patchFootprintM2, { openedAtS: nowS() });
      void this.captureSelf();
    }
    return super.giveWay(occupant, deliberate);
  }

  /** The thaw first, then give way under everyone the sheet no longer bears. */
  public override reconcileSupport(): void {
    this.reconcileThaw();
    super.reconcileSupport();
  }

  protected override notBearingWords(): string {
    return this.openWaterAreaM2() > 0 && !this.bears(0)
      ? 'There is nothing here to stand on but water.'
      : 'The ice will not bear you here.';
  }

  /**
   * ⭐ The sentence `look` appends: the patches in words, with the words
   * that address them.
   */
  public override groundPhrase(): string | null {
    if (this.bindReach() === null) return super.groundPhrase();
    const log = this.ensureLog();
    const field = log.find((p) => p.kind === 'field');
    const fieldIce = field ? this.iceOf(field) : null;
    if (fieldIce !== null && fieldIce.thicknessM <= OPEN_BELOW_M && log.length <= 1) {
      return 'It is open water.';
    }
    const parts: string[] = [];
    if (fieldIce !== null) {
      parts.push(
        fieldIce.thicknessM <= OPEN_BELOW_M
          ? 'The field has gone to open water'
          : `The ice field is ${fieldIce.quality === 'snow-ice' ? 'white snow-ice' : 'clear black ice'}${fieldIce.rotting ? ', dark and rotten' : ''}`,
      );
    }
    const kinds = new Set(log.filter((p) => p.areaM2 > 0).map((p) => p.kind));
    if (kinds.has('scraped')) parts.push('a scraped patch shows bare');
    if (kinds.has('marked')) parts.push('a marked grid is scored across it');
    if (kinds.has('cut')) parts.push('a cut channel stands where blocks came out');
    if (kinds.has('broken')) parts.push('the ice is broken where somebody went through');
    if (kinds.has('hole')) parts.push('a hole is cut for a line');
    return `${parts.join('; ')}.`;
  }

  /** The whole field has gone to open water (its summer). */
  private isOpenWater(): boolean {
    if (this.bindReach() === null) return false;
    const field = this.ensureLog().find((p) => p.kind === 'field');
    const ice = field ? this.iceOf(field) : null;
    return ice !== null && ice.thicknessM <= OPEN_BELOW_M;
  }

  /**
   * ⭐ The sheet says what it is NOW (lens 3a — the fiction cannot betray
   * itself): in its summer it is open water, not *"a wide sheet of ice …
   * ringing faintly under the cold"* above a line that says *"It is open
   * water"* (the drive, run 6).
   */
  public override getShortDescription(): string {
    return this.isOpenWater() ? 'open water' : super.getShortDescription();
  }

  public override getLong(): string {
    return this.isOpenWater() ? 'Open water, still and dark — no ice on it anywhere.' : super.getLong();
  }

  /** Snow lies on ice whatever the grade (the sheet is not on grade). */
  public override getSnowDepthM(): number {
    if (this.bindReach() === null || !WeatherApi.isActive()) return 0;
    const room = this.room();
    if (room === null) return 0;
    const site = (room as unknown as { climateSite?(): unknown }).climateSite?.();
    const locality = (room as unknown as { weatherLocality?(): unknown }).weatherLocality?.();
    if (!site) return 0;
    const field = this.ensureLog().find((p) => p.kind === 'field');
    if (!field) return 0;
    const ice = this.iceOf(field);
    if (ice === null || ice.thicknessM <= OPEN_BELOW_M) return 0;
    try {
      const cover = WeatherApi.snowCoverAt(site as never, (locality ?? null) as never, Quantity.of(nowS(), 's'));
      return (cover as unknown as { depthM?: number }).depthM ?? 0;
    } catch {
      return 0;
    }
  }

  // ─────────────────────────── the acts ───────────────────────────

  /**
   * ⭐ `groove` as a plan (controller-liquidity D14 — a method, one host):
   * an instant act the verb lands at once; {@link markPatch} decides.
   */
  public groovePlan(actor: Stuff, tool: Stuff, part: string | null): ActPlan<undefined, GrooveDone, GrooveRefusal> {
    return { ok: true, durationMs: 0, effortW: 0, facts: undefined, onComplete: () => this.markPatch(actor, tool, part) };
  }

  /** ⭐ `scrape` as a plan — an instant act; {@link scrapePatch} decides. */
  public scrapePlan(actor: Stuff, tool: Stuff, part: string | null): ActPlan<undefined, ScrapeDone, ScrapeRefusal> {
    return { ok: true, durationMs: 0, effortW: 0, facts: undefined, onComplete: () => this.scrapePatch(actor, tool, part) };
  }

  /** `scrape`: clear snow off an area of the field (or of a named patch). */
  public scrapePatch(actor: Stuff, tool: Stuff, raw: string | null): ActDone<ScrapeDone, ScrapeRefusal> {
    if (!this.supports(actor)) return { ok: false, reason: 'not-on-ice' };
    const from = this.patchByWord(raw ?? 'field');
    if (from === null || from.kind === 'cut' || from.kind === 'hole' || from.kind === 'broken') {
      return { ok: false, reason: 'no-snowy-ice' };
    }
    const fromIce = this.iceOf(from);
    if (fromIce === null || fromIce.thicknessM <= OPEN_BELOW_M) {
      return { ok: false, reason: 'open' };
    }
    const area = Math.min(from.areaM2, (tool as unknown as SweepTool).getSweepM2?.() ?? 4);
    if (!(area > 0)) return { ok: false, reason: 'nothing-left' };
    this.split(from, 'scraped', area, { bareFromS: nowS() });
    void this.captureSelf();
    return { ok: true, facts: { areaM2: area } };
  }

  /** `groove`: score a grid across scraped (or field) ice. */
  public markPatch(actor: Stuff, tool: Stuff, raw: string | null): ActDone<GrooveDone, GrooveRefusal> {
    if (!this.supports(actor)) return { ok: false, reason: 'not-on-ice' };
    const t = tool as unknown as SweepTool;
    if (t.getDraught?.() === 'horse' && !this.hasDraftAnimal()) {
      return { ok: false, reason: 'no-horse' };
    }
    // ⭐ One grid on a sheet (the review): a new mark REPLACES a standing
    // one — its area goes back to the ice it was scored on, then the new
    // grid is laid. So `cut marked` always means the one current grid, and
    // two players never hold two grids nobody can tell apart. ⚠ A REFUSED
    // mark leaves the grid standing (the pre-merge audit — a bad word wiped
    // the crew's grid): the log is put back as it was.
    const before = this.log.map((p) => ({ ...p }));
    const refuse = (reason: 'no-clear-ice' | 'open'): GrooveRefusal => {
      this.log = before;
      return { ok: false, reason };
    };
    for (const old of this.log.filter((p) => p.kind === 'marked' && p.areaM2 > 0)) this.unmark(old);
    // A bare `groove` takes the scraped patch, else the field; a NAMED patch
    // is that patch or a refusal (`mark banana` is not the field).
    const from = raw === null ? (this.patchByWord('scraped') ?? this.patchByWord('field')) : this.patchByWord(raw);
    if (from === null || !(from.kind === 'scraped' || from.kind === 'field')) {
      return refuse('no-clear-ice');
    }
    const fromIce = this.iceOf(from);
    if (fromIce === null || fromIce.thicknessM <= OPEN_BELOW_M) return refuse('open');
    const grid = t.getGridM?.() ?? 0.3;
    const area = Math.min(from.areaM2, t.getDraught?.() === 'horse' ? 100 : 20);
    this.split(from, 'marked', area, { gridM: grid, bareFromS: from.bareFromS });
    void this.captureSelf();
    return { ok: true, facts: { gridCm: Math.round(grid * 100) } };
  }

  /** A marked patch goes back to the ice it was scored on: scraped (its bare clock kept) or field. */
  private unmark(marked: PatchRecord): void {
    const scraped = marked.bareFromS !== undefined;
    const home = this.log.find(
      (p) => p !== marked && (scraped ? p.kind === 'scraped' && p.bareFromS === marked.bareFromS : p.kind === 'field'),
    );
    if (home) {
      home.areaM2 += marked.areaM2;
      this.log = this.log.filter((p) => p !== marked);
    } else {
      marked.kind = scraped ? 'scraped' : 'field';
      delete marked.gridM;
    }
  }

  /**
   * ⭐ The cut plan: the kernel `cut` (D16) — a block off the marked grid,
   * or a hole for a line (`cut hole`); it needs an ice saw, a body ON the
   * ice, and ice there to cut. (The ice trade's `groove` and `scrape` are
   * this sheet's own methods — {@link markPatch}, {@link scrapePatch} —
   * not cuts: controller-liquidity D14.)
   */
  public override async cutPlan(req: CutRequest): Promise<CutAnswer> {
    const refuse = (r: CutRefusal): CutAnswer => r;
    const saw = req.tools.find((t) => MixinApi.isTool(t) && t.hasCapability('ice-sawing'));
    if (!saw) return refuse({ ok: false, reason: 'no-ice-saw' });
    if (!this.supports(req.actor)) return refuse({ ok: false, reason: 'not-on-ice' });
    const hole = (req.part ?? '').trim().toLowerCase() === 'hole';
    const patch = hole ? this.patchByWord('field') : this.patchByWord(req.part ?? 'marked');
    if (patch === null) return refuse({ ok: false, reason: hole ? 'no-ice' : 'no-grid' });
    if (!hole && patch.kind !== 'marked') return refuse({ ok: false, reason: 'no-grid' });
    const ice = this.iceOf(patch);
    if (ice === null || ice.thicknessM <= OPEN_BELOW_M) return refuse({ ok: false, reason: 'open' });
    const actor = req.actor;
    return {
      ok: true,
      durationMs: hole ? 60_000 : 120_000,
      effortW: 500,
      facts: { kind: 'ice', hole },
      onComplete: () => this.finishCut(actor, hole, patch.id),
    };
  }

  /**
   * The cut's end: the plan owns its completion (tailoring's `finishCut`
   * precedent) — the cut controller words what it came to.
   */
  private async finishCut(actor: Stuff, hole: boolean, patchId: string): Promise<ActDone<CutDone, CutRefusal>> {
    if (hole) {
      await this.cutHole(actor);
      return { ok: true, facts: { kind: 'ice-hole' } };
    }
    const block = await this.cutBlock(actor, patchId);
    const kg = block !== null && MixinApi.isTangible(block) ? block.getMass().rawValue() : 0;
    return { ok: true, facts: { kind: 'ice-block', block, kg } };
  }

  /** A block off a marked patch: thickness × grid², at the patch's grade. */
  public async cutBlock(actor: Stuff, patchId: string): Promise<Stuff | null> {
    const patch = this.ensureLog().find((p) => p.id === patchId);
    if (!patch) return null;
    const ice = this.iceOf(patch);
    if (ice === null || ice.thicknessM <= OPEN_BELOW_M) return null;
    const grid = patch.gridM ?? 0.56;
    const area = Math.min(patch.areaM2, grid * grid);
    if (!(area > 0)) return null;
    const massKg = ice.thicknessM * area * ICE_DENSITY;
    this.split(patch, 'cut', area, { openedAtS: nowS() });
    let block: Stuff | null = null;
    try {
      block = await StuffApi.clone<Stuff>(BLOCK_ROW);
      if (MixinApi.isTangible(block)) block.setMass(Quantity.of(Math.round(massKg * 10) / 10, 'kg'));
      const graded = block as unknown as { setIceQuality?(q: string): void };
      graded.setIceQuality?.(ice.quality === 'snow-ice' ? 'snow-ice' : 'black');
      if (MixinApi.isThermal(block)) {
        block.setStampedTemperatureK(271);
        block.setLastAmbientK(271);
      }
      const room = this.room();
      // ⭐ Whose block it is — stamped BEFORE it lands (a titled good is not
      // fresh, so its arrival derives nothing): a hand on shift for the
      // house that works this water cuts for the house; anyone else cuts
      // their own — `hew`'s rule for ore. Unstamped, a block fell back to
      // its ROW's author, and its cutter could not sell it (the review).
      const owner = this.cutterOwner(actor, room);
      if (MixinApi.isChattel(block)) {
        try {
          await block.stampChattel(owner);
        } catch (err) {
          // A title that could not be written never loses the block.
          console.warn('IceSheet: could not title the block', err);
        }
      }
      if (room !== null && MixinApi.isContainable(block) && MixinApi.isContainer(room)) {
        ContainmentApi.move(block as Stuff & Containable, room as Stuff & Container);
      }
    } catch (err) {
      console.warn('IceSheet: block mint failed', err);
    }
    await this.captureSelf();
    this.reconcileSupport();
    return block;
  }

  /** The house a cutter on shift cuts for, else the cutter. */
  private cutterOwner(actor: Stuff, room: Stuff | null): Stuff {
    const roomPath = room?.getTemplatePath() ?? '';
    const house = roomPath ? EmploymentApi.businessAt(roomPath) : null;
    const housePath = (house as unknown as { getOrganizationPath?(): string } | null)?.getOrganizationPath?.() ?? '';
    if (house && housePath && MixinApi.isEmployed(actor) && actor.isOnShiftFor(housePath)) {
      return house as unknown as Stuff;
    }
    return actor;
  }

  /** A hole for a line: a small cut patch, no block. */
  public async cutHole(_actor: Stuff): Promise<void> {
    const field = this.patchByWord('field');
    if (field === null) return;
    this.split(field, 'hole', Math.min(field.areaM2, HOLE_M2), { openedAtS: nowS() });
    await this.captureSelf();
  }

  // ─────────────────────────── lifecycle ───────────────────────────

  /**
   * ⭐ The room is known here (the fixture was just attached): resolve the
   * reach the pool cites, warm the catalogue, and restore — or seed — the
   * sheet's own record keyed by its pool.
   */
  public override async resolveUnderfoot(): Promise<void> {
    await super.resolveUnderfoot();
    const room = this.room();
    if (room === null) return;
    this.poolKey = room.getTemplatePath() ?? room.stuffId;
    this.bindReach();
    const cat = this.catalogue();
    const ref = this.bindReach();
    if (cat !== null && ref !== null) {
      try {
        await cat.iceAt(ref, nowS());
      } catch {
        /* the sync read falls back to the plain surface */
      }
    }
    if (this.getTemplatePath() !== null && this.poolKey) {
      try {
        await PersistableApi.restoreOrSeed(this as unknown as Stuff, this.poolKey);
      } catch {
        /* no store reachable (tests): the log seeds on first read */
      }
    }
    this.ensureLog();
  }

  // ─────────────────────────── internals ───────────────────────────

  private room(): Stuff | null {
    return (this as unknown as { getAdornedTo?(): Stuff | null }).getAdornedTo?.() ?? null;
  }

  /**
   * ⭐ The reach this sheet is the ice of — bound from the pool's CITATION,
   * synchronously, the first time anything asks. ⚠ Not from the settled
   * read (`waterRefFor`): at boot the fixture attaches before the water has
   * been read, the read refused as *unread*, and the sheet ran reachless
   * for the life of the world — every walker went through ice that the
   * reach itself said would bear them (the drive, run 3). A still water's
   * ref is its citation (`currentWaterRef`), so no read is needed; the
   * catalogue is warmed alongside so the sync ice read answers.
   */
  private bindReach(): string | null {
    if (this.reachRef !== null) return this.reachRef;
    const room = this.room();
    if (room === null || !MixinApi.isShore(room)) return null;
    const pick = room.waterFor();
    if (!('key' in pick)) return null;
    const cat = this.catalogue();
    const ref = cat !== null ? cat.currentWaterRef(pick.citation, room) : pick.citation;
    if (!ref) return null;
    this.reachRef = ref;
    if (cat !== null) void cat.iceAt(ref, nowS()).catch(() => undefined);
    return ref;
  }

  private catalogue(): WatercourseCatalogue | null {
    const c = StuffApi.findByTemplatePath<Stuff>(CATALOGUE_PATH);
    return c instanceof WatercourseCatalogue ? c : null;
  }

  /** The log, seeded with one field patch of the whole area. */
  private ensureLog(): PatchRecord[] {
    if (this.log.length === 0) {
      this.log = [{ id: 'field', kind: 'field', areaM2: this.areaM2 > 0 ? this.areaM2 : 1, sinceS: 0 }];
    }
    return this.log;
  }

  /** Move `areaM2` off a patch into a patch of `kind` (merging with one opened in the same segment). */
  private split(
    from: PatchRecord,
    kind: PatchKind,
    areaM2: number,
    history: { openedAtS?: number; bareFromS?: number; gridM?: number },
  ): PatchRecord {
    const take = Math.min(from.areaM2, areaM2);
    from.areaM2 -= take;
    const now = nowS();
    const segment = Math.floor(now / (6 * 3600));
    const same = this.log.find(
      (p) =>
        p !== from &&
        p.kind === kind &&
        Math.floor(p.sinceS / (6 * 3600)) === segment &&
        p.gridM === history.gridM &&
        p.bareFromS === history.bareFromS,
    );
    if (same) {
      same.areaM2 += take;
      return same;
    }
    const patch: PatchRecord = {
      id: `${kind}-${now}-${this.log.length}`,
      kind,
      areaM2: take,
      sinceS: now,
      ...(history.openedAtS !== undefined ? { openedAtS: history.openedAtS } : {}),
      ...(history.bareFromS !== undefined ? { bareFromS: history.bareFromS } : {}),
      ...(history.gridM !== undefined ? { gridM: history.gridM } : {}),
    };
    this.log.push(patch);
    if (from.kind !== 'field' && from.areaM2 <= 1e-9) this.log = this.log.filter((p) => p !== from);
    return patch;
  }

  /**
   * ⭐ The thaw: when the field reads open water (and the reach is not
   * merely running), the log collapses, everyone goes in, and what was on
   * the ice floats or sinks.
   */
  private reconcileThaw(): void {
    if (this.thawing || this.bindReach() === null) return;
    const field = this.ensureLog().find((p) => p.kind === 'field');
    if (!field) return;
    const ice = this.iceOf(field);
    if (ice === null || ice.thicknessM > OPEN_BELOW_M || ice.reason === 'running') return;
    const remembers = this.log.length > 1 || field.areaM2 < (this.areaM2 > 0 ? this.areaM2 : 1);
    const self = this as unknown as Stuff;
    const holders = MixinApi.isSlotted(self) ? [...self.getOccupants(GROUND_SLOT)] : [];
    if (!remembers && holders.length === 0) return;
    this.thawing = true;
    try {
      this.log = [{ id: 'field', kind: 'field', areaM2: this.areaM2 > 0 ? this.areaM2 : 1, sinceS: nowS() }];
      for (const occ of holders) super.giveWay(occ);
      this.sortFloatSink();
      void this.captureSelf();
    } finally {
      this.thawing = false;
    }
  }

  /** What was left on the ice: floats stay at the surface, sinkers go to the bottom. */
  private sortFloatSink(): void {
    // ⭐ The WATER says where sunk things go, never the ice.
    const room = this.room();
    if (room !== null && MixinApi.isWaterPlace(room)) room.sinkWhatSinks();
  }

  private hasDraftAnimal(): boolean {
    const room = this.room();
    if (room === null || !MixinApi.isContainer(room)) return false;
    return room.getContents().some((c) => MixinApi.isHauling(c) && this.supports(c));
  }

  private async captureSelf(): Promise<void> {
    if (this.getTemplatePath() === null || !this.poolKey) return;
    try {
      await PersistableApi.capture(this as unknown as Stuff, this.poolKey);
    } catch {
      /* no store reachable */
    }
  }
}

function nowS(): number {
  try {
    return WorldClockApi.getNow().rawValue();
  } catch {
    return 0;
  }
}

function historyOf(p: PatchRecord): IceHistory {
  return {
    ...(p.openedAtS !== undefined ? { openedAtS: p.openedAtS } : {}),
    ...(p.bareFromS !== undefined ? { bareFromS: p.bareFromS } : {}),
  };
}
