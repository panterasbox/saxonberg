/**
 * ReachWarren — ⭐⭐ **the river's places that are not authored** (river
 * D5–D7): the water within hail of whoever is in it, and the spots where
 * the river has stopped something.
 *
 * ONE singleton for the realm (the `ColumnWarren` shape): a second river
 * needs a profile row and nothing here. Its members are of two kinds, each
 * on its own row and each with its own moving zone (D38):
 *
 * - **Patches** (`reach/patch/water`) — the water within hail of somebody,
 *   carried by the current. Minted when something goes into the river
 *   between authored places, moved one event at a time, merged when two
 *   come within hail and split when a swimmer strokes out of one, handed
 *   into an authored place when they reach its upstream end, and reaped
 *   when empty. Never persisted.
 * - **Stops** (`reach/stop/water`) — a patch that has stopped: a gravel
 *   bar, the bed under a pool, the bank you got out on. Fixed at a km and
 *   a bank, persisted by `(row, key)` with the key their position, kept
 *   while anything is in them and reaped when empty — so a sword on the
 *   bed is there after a restart, once.
 *
 * ## One event per patch
 *
 * A patch does not tick. Its {@link Drift} holds ONE game-clock event: the
 * earliest of the next stretch boundary, the next place it reaches, the
 * next fixed place coming within hail, and the end of its river — capped,
 * so a merge or a change in the flow is noticed. At the event the patch
 * moves, tells its people what changed, rewires its ways, merges, and
 * schedules the next.
 *
 * ## What it decides, and what it does not
 *
 * It owns where the river's ways lead and when (its {@link ReachExit}s
 * ask it). It does not own bodies: whether a swimmer holds against the
 * current or is swept is the body's (W2).
 */

import { RoomWarren } from '@saxonberg/server/mud/lib/location/RoomWarren';
import type { Attachment } from '@saxonberg/server/mud/lib/location/Warren';
import { SingletonMixin } from '@saxonberg/server/mud/lib/stuff/Singleton';
import { PersistableMixin } from '@saxonberg/server/mud/lib/persistence/Persistable';
import { Drift } from '@saxonberg/server/mud/lib/location/Drift';
import type { FieldMeta } from '@saxonberg/server/mud/lib/mixin';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { PersistableApi } from '@saxonberg/server/mud/api/persistable';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import { AppApi } from '@saxonberg/server/mud/api/app';
import { WeatherApi } from '@saxonberg/server/mud/api/weather';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';
import { NavigationApi } from '@saxonberg/server/mud/api/navigation';
import type { Stuff, EvictionContext } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { VetoResult } from '@saxonberg/server/mud/lib/errors';
import type { Container } from '@saxonberg/server/mud/lib/spatial/Container';
import type { Containable } from '@saxonberg/server/mud/lib/spatial/Containable';
import type { Exitable } from '@saxonberg/server/mud/lib/boundary/Exitable';
import type { LinePosition, RiverSide } from '../lib/RiverLine';
import type WatercourseCatalogue from './WatercourseCatalogue';
import type { LinePlace } from './WatercourseCatalogue';
import type ReachPatch from '../location/ReachPatch';
import type ReachStop from '../location/ReachStop';
import type BankPatch from '../location/BankPatch';
import type ReachZone from '../location/ReachZone';
import type ReachExit from './exits/ReachExit';
import type RiverHazard from '../thing/RiverHazard';
import type { LineHazard } from '../lib/RiverLine';
import type { ReachWay } from './exits/ReachExit';

type MemberStuff = Stuff & Container;
type ReachPlace = ReachPatch | ReachStop;

const CATALOGUE_PATH = '/system/water/idea/WatercourseCatalogue';
const PATCH_ZONE = '/system/water/location/reach/patch';
const STOP_ZONE = '/system/water/location/reach/stop';
const PATCH_ROW = '/system/water/location/reach/patch/water';
const BANK_ZONE = '/system/water/location/reach/bank';
const BANK_ROW = '/system/water/location/reach/bank/ground';
/** One walk along a bank, km (`water.river.bankStepM`). */
const BANK_STEP_KM = 0.1;
/** Walking and running pace along a bank, m/s. */
const WALK_MPS = 1.4;
const RUN_MPS = 2.5;
const STOP_ROW = '/system/water/location/reach/stop/water';
const EXIT_KIND = '/system/water/idea/exits/reach';
/** What a river way names as its far side until it is taken. */
const REACH_DIR = '/system/water/location/reach';
/** Where a river row lives — the frame a position on it names. */
const LINE_PREFIX = '/stuff/idea/Watercourse/';

/** A drift event is never further off than this, game-seconds — merges and floods are noticed. */
const MAX_EVENT_S = 600;
/** Slower than this the water is slack, m/s: nothing is carried. */
const SLACK_MPS = 0.02;
/** A killick holds in water slower than this, m/s (`water.river.killickHoldsMps`). */
const KILLICK_HOLDS_MPS = 0.3;
/** A ship's wake swamps small boats past this speed, m/s (`water.river.wakeSpeedMps`). */
const WAKE_SPEED_MPS = 2.5;
/** A patch (water within hail, under way) is at least this deep, m. */
const MIN_PATCH_DEPTH_M = 0.3;
/** How far ahead white water is heard, km. */
const EARSHOT_KM = 0.3;
/** A hazard on a bank reaches this share of the width out from it. */
const HAZARD_REACH = 0.35;
/** A stroke takes you this many hails along the river. */
const STROKE_HAILS = 1.1;

/** One stop the river is keeping, by where it is. */
interface StopRecord {
  course: string;
  km: number;
  side: RiverSide | 'mid';
}

export default class ReachWarren extends SingletonMixin(PersistableMixin(RoomWarren)) {
  /** Where the singleton lives. */
  static readonly PATH = '/system/water/idea/ReachWarren';

  static fieldMeta: FieldMeta = {
    // ⭐ Where the river is keeping something — so a stop holding a sword
    // is found again by the water drifting past it after a restart.
    stops: { persistent: true },
  };

  /** The stops holding something, by position. */
  public stops: StopRecord[] = [];

  /** Which row the next `createMember()` clones (set inside the chain). */
  private _budRow = PATCH_ROW;
  /** A patch's zone identity is its serial. Runtime. */
  private _serial = 0;
  private _patches = new Set<ReachPatch>();
  private _banks = new Set<BankPatch>();
  private _stops = new Map<string, ReachStop>();
  /** Patch stuffId → game-second of its last event. Runtime. */
  private _lastAt = new Map<string, number>();
  /** Patch stuffId → the ship whose boat was launched into it. Runtime. */
  private _shipOf = new Map<string, string>();
  /** Patch stuffId → the node its weather was read for. Runtime. */
  private _nodeOf = new Map<string, string>();
  /** Patch stuffId → the white water it was last told about. Runtime. */
  private _heard = new Map<string, string>();
  /** Patch stuffId → bank path → the bank's way to it. Runtime. */
  private _bankWays = new Map<string, Map<string, string>>();
  /** The serialization chain for minting (one member at a time). */
  private _mintChain: Promise<unknown> = Promise.resolve();

  /* ───────────────────────── Warren policy ───────────────────────── */

  /** ⭐ A moving place lays out its own frame: its ways are never a grid's. */
  public override laysOutOwnFrame(): boolean {
    return true;
  }

  /**
   * ⭐ Anything tangible keeps a river place (D6): a canoe, a body, a
   * dropped sword — not only somebody connected. A patch holding only a
   * log keeps drifting; a bar holding a canoe is kept.
   */
  protected occupantsOf(m: MemberStuff): (Stuff & Container)[] {
    return m.getContents().filter((c) => MixinApi.isTangible(c)) as unknown as (Stuff & Container)[];
  }

  protected async createMember(): Promise<MemberStuff> {
    return StuffApi.clone<MemberStuff>(this._budRow);
  }

  public async admitArrival(): Promise<void> {
    /* no-op — the way in is a river place's `downstream`, or a shore's. */
  }

  protected attachmentFor(): Attachment {
    return { direction: 'down' };
  }

  protected override async wireHubExit(_room: MemberStuff): Promise<void> {
    /* the river wires its own ways — see `installWays` */
  }

  protected async wireHostFixtures(): Promise<void> { /* no host */ }
  protected async unwireHostFixtures(): Promise<void> { /* no host */ }

  public override canEvict(_context: EvictionContext): VetoResult {
    return { ok: false, reason: 'system singleton; never culled' };
  }

  /**
   * ⭐ Keep what is kept and let the rest go: a stop with anything in it
   * is captured (its record is what a restart reads); an empty one is
   * captured EMPTY — so a stale record can never put back what was taken
   * — and reaped; an empty patch is reaped.
   */
  protected async reconcile(): Promise<void> {
    for (const m of this.getMembers()) {
      const empty = this.occupantsOf(m).length === 0;
      const stop = this.asStop(m);
      if (stop !== null) {
        const key = stop.getPersistenceKey();
        await PersistableApi.capture(stop as unknown as Stuff, key ?? undefined).catch(() => undefined);
        if (!empty) continue;
        this.forgetStop(stop);
        this.reap(m);
        continue;
      }
      if (!empty) continue;
      const bank = [...this._banks].find((b) => (b as unknown) === (m as unknown));
      if (bank) {
        this._banks.delete(bank);
        this.reap(m);
        continue;
      }
      this.reapPatch(m as unknown as ReachPatch);
    }
  }

  /* ───────────────────────── entry points ───────────────────────── */

  /**
   * ⭐ Put something into the river at a position — a swimmer leaving a
   * place's downstream end, a body swept off a bank, whatever goes over a
   * side. It joins the patch already within hail there, or a new one.
   */
  public async handIn(thing: Stuff & Containable, pos: LinePosition): Promise<ReachPatch> {
    const patch = await this.patchNear(pos, null) ?? await this.mintPatch(pos);
    ContainmentApi.move(thing, patch as unknown as Stuff & Container);
    this.tellOf(thing, Mml.compose`The current takes you.`);
    return patch;
  }

  /** A river place hands a body to the line at one of its ends. */
  public async handOutOf(
    place: Stuff,
    body: Stuff & Containable,
    end: 'upstream' | 'downstream',
  ): Promise<boolean> {
    const pos = await this.endOf(place, end);
    if (pos === null) return false;
    await this.handIn(body, pos);
    return true;
  }

  /** ⭐ An authored river place's ways onto the line, at its handing ends. */
  public async installEnds(place: Stuff): Promise<void> {
    if (!MixinApi.isExitable(place)) return;
    const river = (place as unknown as { getRiver?(): { ends?: Record<string, string> } | null }).getRiver?.();
    if (!river) return;
    for (const end of ['downstream', 'upstream'] as const) {
      if ((river.ends?.[end] ?? 'handoff') !== 'handoff') continue;
      if (place.getExit(end)) continue;
      await this.installWay(place as unknown as Stuff & Container & Exitable, end, end);
    }
  }

  /**
   * ⭐ A bank's way into the river (D8, D26): `river`, worked out when it
   * is taken — into the water within hail there, which is the patch a
   * swimmer passing is in when one is, so wading in after somebody puts you
   * in the water with them. A bank that already has a way into the water
   * (the quay's steps into the stream) keeps it.
   */
  public async installBankWay(shore: Stuff): Promise<void> {
    if (!MixinApi.isExitable(shore) || !MixinApi.isShore(shore)) return;
    const ex = shore as unknown as Stuff & Container & Exitable;
    if (!('exit' in shore.wayIntoWater()) && !shore.getExit('river')) {
      await this.installWay(ex, 'river', 'enter');
    }
    // ⭐ Along the bank (D25): the bank between places is walkable.
    if (!shore.getExit('upstream')) await this.installWay(ex, 'upstream', 'walk-up');
    if (!shore.getExit('downstream')) await this.installWay(ex, 'downstream', 'walk-down');
  }

  /** ⭐ What sinks from a patch lies on the bed where it went down (D9). */
  public async sinkFrom(patch: ReachPatch, thing: Stuff & Containable): Promise<boolean> {
    const pos = patch.getLinePosition();
    if (pos === null) return false;
    const stop = await this.stopAt(pos.course, pos.km, 'mid');
    ContainmentApi.move(thing, stop as unknown as Stuff & Container);
    return true;
  }

  /**
   * The stop at a position, found or made — the `DormWarren.admit` shape,
   * and the way a stop comes back after a restart.
   */
  public async stopAt(course: string, km: number, side: RiverSide | 'mid'): Promise<ReachStop> {
    const key = stopKey(course, km, side);
    const live = this._stops.get(key);
    if (live && !live.isDestroyed()) return live;
    return this.serial(async () => {
      const again = this._stops.get(key);
      if (again && !again.isDestroyed()) return again;
      const stood = (await PersistableApi.standUpKeyed(STOP_ROW, key)) as unknown as ReachStop | null;
      if (stood === null) throw new Error(`ReachWarren: the stop ${key} could not be stood up`);
      if (stood.getLinePosition() === null) {
        const width = this.widthAt(course, km);
        const across = side === 'left' ? width * 0.05 : side === 'right' ? width * 0.95 : width * this.channelAt(course, km);
        stood.placeOnLine(`${LINE_PREFIX}${course}`, { course, km, across });
      }
      await this.adoptStop(stood);
      return stood;
    });
  }

  /**
   * ⭐ A stop standing up — fresh, or back from its record: its own zone,
   * membership, its ways, and the warren's record of it. Idempotent.
   */
  public async adoptStop(stop: ReachStop): Promise<void> {
    const pos = stop.getLinePosition();
    if (pos === null) return;
    const key = stop.getPersistenceKey() ?? stopKey(pos.course, pos.km, 'mid');
    if (this._stops.get(key) === stop) return;
    this._stops.set(key, stop);
    if (!this.hasMember(stop as unknown as MemberStuff)) this.addMember(stop as unknown as MemberStuff);
    await this.giveZone(stop, `${STOP_ZONE}/${zoneLeafOf(key)}`);
    await this.refreshWater(stop);
    await this.installWays(stop);
    if (!this.stops.some((r) => stopKey(r.course, r.km, r.side) === key)) {
      const side = parseSide(key);
      this.stops.push({ course: pos.course, km: pos.km, side });
      await this.saveSelf();
    }
  }

  /* ───────────────────────── the ways ───────────────────────── */

  /** ⭐ Where a reach exit leads, worked out now (D7). */
  public async destinationFor(exit: ReachExit): Promise<Stuff & Container> {
    return this.destinationOf(exit.getSource() as unknown as Stuff, exit.getWay(), exit.getTarget());
  }

  /**
   * ⭐ Where a way from `source` leads now, named rather than taken through
   * an exit — what a boat being paddled asks (river D21): the same water a
   * swimmer's stroke reaches.
   */
  public async destinationOf(source: Stuff, way: ReachWay, wayTarget = ''): Promise<Stuff & Container> {
    const exit = { getTarget: () => wayTarget };
    if (way === 'patch') {
      for (const p of [...this._patches, ...this._banks]) {
        if (p.stuffId === exit.getTarget() && !p.isDestroyed()) return p as unknown as Stuff & Container;
      }
      throw new Error('The water there has gone on.');
    }
    if (way === 'walk-up' || way === 'walk-down') {
      const step = await this.bankStep(source, way);
      if (step === null) throw new Error('There is no going on along the bank that way.');
      if ('place' in step) return StuffApi.singleton<Stuff & Container>(step.place);
      return ((await this.bankNear(step.pos, step.side)) ?? (await this.mintBank(step.pos))) as unknown as Stuff & Container;
    }
    const pos = await this.positionOf(source, way);
    if (pos === null) throw new Error('ReachWarren: this water is on no river');
    switch (way) {
      case 'left':
      case 'right':
        // ⭐ Worked out at ARRIVAL (D14): the patch drifted on while you
        // swam, so the bank you land on is the one beside you now.
        return this.stopAt(pos.course, pos.km, way) as unknown as Promise<Stuff & Container>;
      case 'downstream':
      case 'upstream': {
        const hailKm = this.hailKm(source);
        const sign = way === 'downstream' ? -1 : 1;
        const line = this.catalogue()?.lineOfSync(pos.course) ?? null;
        const km = clamp(pos.km + sign * hailKm * STROKE_HAILS, line?.mouthKm ?? 0, line?.sourceKm ?? pos.km);
        const target = { ...pos, km };
        // Into an authored place, when the stroke reaches it.
        const place = this.waterPlaceAt(target);
        if (place !== null) return StuffApi.singleton<Stuff & Container>(place.path);
        const exclude = MixinApi.isMovingPlace(source) ? (source as unknown as ReachPatch) : null;
        return ((await this.patchNear(target, exclude)) ?? (await this.mintPatch(target))) as unknown as Stuff & Container;
      }
      case 'branch': {
        const target = await this.branchPosition(pos, exit.getTarget());
        if (target === null) throw new Error(`ReachWarren: no branch '${exit.getTarget()}' here`);
        return ((await this.patchNear(target, null)) ?? (await this.mintPatch(target))) as unknown as Stuff & Container;
      }
      case 'place':
        return StuffApi.singleton<Stuff & Container>(exit.getTarget());
      case 'enter':
        return ((await this.patchNear(pos, null)) ?? (await this.mintPatch(pos))) as unknown as Stuff & Container;

      case 'down': {
        const stop = await this.stopAt(pos.course, pos.km, 'mid');
        return stop as unknown as Stuff & Container;
      }
    }
  }

  /**
   * ⭐ Whether the water lets `mover` take a way NOW, in the water's words;
   * `null` when it does (D14). The bank decides a landing — a wall, a steep
   * bank or an undercut refuses — and a current faster than you swim
   * refuses going up it, or getting in to a margin it races along.
   */
  public async refusalFor(exit: ReachExit, mover: Stuff): Promise<string | null> {
    return this.refusalOf(exit.getSource() as unknown as Stuff, exit.getWay(), mover);
  }

  /** {@link refusalFor} for a way named rather than an exit (a boat's). */
  public async refusalOf(source: Stuff, way: ReachWay, mover: Stuff): Promise<string | null> {
    if (way === 'place' || way === 'branch' || way === 'enter' || way === 'patch') return null;
    if (way === 'walk-up' || way === 'walk-down') {
      const step = await this.bankStep(source, way);
      if (step === null) return 'The bank ends there; there is no going on along it.';
      if ('place' in step) return null;
      const bank = this.catalogue()?.lineOfSync(step.pos.course)?.stretchAt(step.pos.km)?.banks[step.side] ?? null;
      if (bank && !bank.walkable) return 'The bank rises into sheer rock; there is no going on along it.';
      return null;
    }
    const pos = await this.positionOf(source, way);
    if (pos === null) return 'This water is on no river you can find.';
    const cat = this.catalogue();
    const state = cat ? await cat.riverStateAt(pos, WorldClockApi.getNow().rawValue()) : null;
    const swim = MixinApi.isRespiration(mover) ? await mover.swimSpeedMps() : 0.6;
    if (way === 'left' || way === 'right') {
      const bank = state?.stretch.banks[way] ?? null;
      if (bank === null) return null;
      if (bank.kind === 'wall') return 'There is no bank that side, only sheer rock; the water carries you on.';
      if (bank.kind === 'steep' || bank.kind === 'undercut') {
        return 'The bank that side is a wall of roots and earth higher than your reach; the water carries you on.';
      }
      if (state && Math.abs(state.margins[way].currentMps) > swim * 2) {
        return 'The current along that bank runs faster than you can swim; it carries you past.';
      }
      return null;
    }
    if (way === 'upstream' && state && state.currentMps >= swim) {
      return 'The current is faster than you can swim; you make no way against it.';
    }
    if (way === 'down' && state && state.depthHereM < 1.5) {
      return 'The water is shallow enough to stand in; there is nowhere to dive.';
    }
    return null;
  }

  /**
   * How long the swim a way asks takes, real seconds. ⭐ The river runs on
   * the GAME clock (the patch drifts in game seconds), so a stroke through
   * moving water is reckoned in game seconds and handed back as real ones —
   * otherwise a swimmer crossing forty meters of margin would watch the
   * patch carry them a kilometer (river risk 5).
   */
  public async crossingSecondsFor(exit: ReachExit, mover: Stuff): Promise<number> {
    const gameS = await this.crossingGameSeconds(exit, mover);
    const scale = WorldClockApi.getScale();
    return gameS / (Number.isFinite(scale) && scale > 0 ? scale : 1);
  }

  private async crossingGameSeconds(exit: ReachExit, mover: Stuff): Promise<number> {
    const source = exit.getSource() as unknown as Stuff;
    const way = exit.getWay();
    if (way === 'walk-up' || way === 'walk-down') {
      const mode = (mover as unknown as { getEngagedMode?(): { getName?(): string } | string | null }).getEngagedMode?.();
      const name = typeof mode === 'string' ? mode : mode?.getName?.() ?? '';
      return (BANK_STEP_KM * 1000) / (name.endsWith('run') ? RUN_MPS : WALK_MPS);
    }
    if (way === 'place' || way === 'branch' || way === 'enter' || way === 'patch' || !MixinApi.isRespiration(mover)) return 0;
    const pos = await this.positionOf(source, way);
    if (pos === null) return 0;
    // ⭐ Stroking: for the next while you meet things head-first (D13).
    mover.noteStroke();
    const swim = Math.max(0.1, await mover.swimSpeedMps());
    if (way === 'left' || way === 'right') {
      const width = this.widthAt(pos.course, pos.km);
      const to = way === 'left' ? width * 0.05 : width * 0.95;
      return Math.abs(pos.across - to) / swim;
    }
    if (way === 'down') return 0;
    const cat = this.catalogue();
    const state = cat ? await cat.riverStateAt(pos, WorldClockApi.getNow().rawValue()) : null;
    const v = state?.currentMps ?? 0;
    const meters = this.hailKm(source) * 1000 * STROKE_HAILS;
    // ⭐ Over the GROUND: downstream the current adds to your stroke;
    // upstream it takes off what you make.
    const over = way === 'upstream' ? Math.max(0.05, swim - Math.max(0, v)) : swim + Math.max(0, v);
    return meters / over;
  }

  /* ───────────────────────── minting ───────────────────────── */

  /** A patch within hail of a position on the same course and band, else `null`. */
  private async patchNear(pos: LinePosition, exclude: ReachPatch | null): Promise<ReachPatch | null> {
    const hail = this.hailM();
    const width = this.widthAt(pos.course, pos.km);
    let best: ReachPatch | null = null;
    let bestD = Infinity;
    for (const p of this._patches) {
      if (p === exclude || p.isDestroyed()) continue;
      const at = p.getLinePosition();
      if (!at || at.course !== pos.course) continue;
      if (bandOf(at.across, width, hail) !== bandOf(pos.across, width, hail)) continue;
      const d = Math.abs(at.km - pos.km) * 1000;
      if (d <= hail && d < bestD) {
        best = p;
        bestD = d;
      }
    }
    return best;
  }

  private async mintPatch(pos: LinePosition): Promise<ReachPatch> {
    const patch = await this.serial(async () => {
      this._budRow = PATCH_ROW;
      return (await this.createMemberSerialized()) as unknown as ReachPatch;
    });
    patch.placeOnLine(`${LINE_PREFIX}${pos.course}`, { ...pos });
    this.addMember(patch as unknown as MemberStuff);
    this._serial += 1;
    await this.giveZone(patch, `${PATCH_ZONE}/${pos.course}/${this._serial}`);
    this._patches.add(patch);
    this._lastAt.set(patch.stuffId, WorldClockApi.getNow().rawValue());
    await this.refreshWater(patch);
    await this.installWays(patch);
    await this.wireWithinHail(patch);
    await this.scheduleNext(patch);
    return patch;
  }

  /**
   * ⭐ The place's own zone (D38): minted from its kind row under the
   * place's own identity, adopting the place through the zone's own
   * `addLocation` — the only writer of a room's zone.
   */
  private async giveZone(place: ReachPlace, identity: string): Promise<void> {
    const current = place.getZone() as unknown as Stuff | null;
    if (current !== null && current.getIdentityPath() === identity) return;
    const kind = identity.startsWith(STOP_ZONE) ? STOP_ZONE : identity.startsWith(BANK_ZONE) ? BANK_ZONE : PATCH_ZONE;
    // identity-keyed-by: lookup — the place's getZone() resolves to this
    // instance; nothing persists under it (a zone is minted again with its place).
    const zone = await StuffApi.clone<ReachZone>(kind, undefined, { asIdentityPath: identity });
    zone.adopt(place as never);
  }

  /**
   * The water a place reads: the river at its position, as deep as the line
   * says there — the margin's depth at a bank, the channel's mid-river.
   */
  private async refreshWater(place: ReachPlace): Promise<void> {
    const pos = place.getLinePosition();
    const cat = this.catalogue();
    if (pos === null || cat === null) return;
    const node = cat.reachNearSync(pos.course, pos.km)?.ref ?? `${pos.course}:${pos.course}`;
    const state = await cat.riverStateAt(pos, WorldClockApi.getNow().rawValue()).catch(() => null);
    // ⭐ The water within hail of somebody is never dry (the drive found a
    // patch at a bar's edge reading a margin of nothing, and `dive` told
    // "no open water"): a patch is at least wading water.
    const floorM = MixinApi.isMovingPlace(place) && (place as unknown as ReachPatch).isUnderWay() ? MIN_PATCH_DEPTH_M : 0;
    const depth = Math.max(floorM, state?.depthHereM ?? 1.4);
    place.setWater({ of: node, depthM: Math.round(depth * 100) / 100 });
    // ⭐ The place moved under whoever stood in it: deeper now, the bed
    // lets them go (the drive found a swimmer standing in a deep pool).
    const floor = MixinApi.isAdornable(place) ? place.getFloor() : null;
    (floor as { reconcileSupport?(): void } | null)?.reconcileSupport?.();
  }

  /** The ways every minted place has: the banks, the strokes, the bed. */
  private async installWays(place: Stuff): Promise<void> {
    if (!MixinApi.isExitable(place)) return;
    const ex = place as unknown as Stuff & Container & Exitable;
    const ways: ReachWay[] = MixinApi.isMovingPlace(place) && (place as unknown as ReachPatch).isUnderWay()
      ? ['left', 'right', 'downstream', 'upstream', 'down']
      : ['downstream', 'upstream'];
    // ⭐ From a stop — a bar, the shallows — you wade back in as readily as
    // you swim (a dry bar is not swum on).
    const wade = !ways.includes('left');
    for (const way of ways) {
      if (ex.getExit(way)) continue;
      await this.installWay(ex, way, way, '', wade);
    }
  }

  private async installWay(
    on: Stuff & Container & Exitable,
    direction: string,
    way: ReachWay,
    target = '',
    wade = false,
  ): Promise<void> {
    await on.installExit<ReachExit>(
      EXIT_KIND,
      {
        direction,
        source: on,
        // ⭐ A way into moving water names THE RIVER (the reach directory,
        // which no zone covers), never a patch's row: where it leads is
        // worked out when it is taken, and a named way between two of the
        // river's own places is not a same-zone shortcut.
        destinationPath: way === 'place' ? target : way === 'patch' ? PATCH_ROW : REACH_DIR,
        media: way === 'place'
          ? ['water', 'vertical']
          : way === 'walk-up' || way === 'walk-down'
            ? ['ground']
            : wade || way === 'left' || way === 'right' ? ['water', 'ground'] : ['water'],
      },
      (e) => e.configureReach(way, target),
    );
  }

  private removeWay(on: Stuff & Exitable, direction: string): void {
    const exit = on.getExit(direction);
    if (!exit) return;
    on.removeExit(direction);
    StuffApi.destruct(exit as unknown as Stuff);
  }

  /* ───────────────────────── the drift ───────────────────────── */

  /**
   * ⭐ The patch's one next event (D6): the earliest of the next stretch
   * boundary, the next place it reaches, the next fixed place coming
   * within hail, and the end of its river — capped at {@link MAX_EVENT_S}.
   */
  private async scheduleNext(patch: ReachPatch): Promise<void> {
    if (patch.isDestroyed()) return;
    const pos = patch.getLinePosition();
    const cat = this.catalogue();
    if (pos === null || cat === null) return;
    const nowS = WorldClockApi.getNow().rawValue();
    const state = await cat.riverStateAt(pos, nowS);
    const v = state?.currentHereMps ?? 0;
    let dueS = MAX_EVENT_S;
    if (v > SLACK_MPS && state) {
      const line = cat.lineOfSync(pos.course);
      const targets: number[] = [state.stretch.downKm, line?.mouthKm ?? 0];
      for (const p of cat.placesOfSync(pos.course)) {
        if (p.kind === 'water' && p.upKm < pos.km) targets.push(p.upKm);
        const hailKm = this.hailM() / 1000;
        if (p.upKm + hailKm < pos.km) targets.push(p.upKm + hailKm);
      }
      for (const r of this.stops) {
        const hailKm = this.hailM() / 1000;
        if (r.course === pos.course && r.km + hailKm < pos.km) targets.push(r.km + hailKm);
      }
      const next = Math.max(...targets.filter((k) => k < pos.km - 1e-6), line?.mouthKm ?? 0);
      const s = ((pos.km - next) * 1000) / v;
      dueS = Math.min(MAX_EVENT_S, Math.max(1, s));
    }
    let drift = patch.getDrift();
    if (drift === null) {
      drift = new Drift(patch as unknown as Stuff, `reach-drift:${patch.stuffId}`);
      patch.setDrift(drift);
    }
    drift.scheduleAt(nowS + dueS, () => this.onDrift(patch));
  }

  /** ⭐ The event: move, hand in, wire, merge, tell, schedule (D6). */
  private async onDrift(patch: ReachPatch): Promise<void> {
    if (patch.isDestroyed()) return;
    const cat = this.catalogue();
    const from = patch.getLinePosition();
    if (cat === null || from === null) return;
    const nowS = WorldClockApi.getNow().rawValue();
    const lastAt = this._lastAt.get(patch.stuffId) ?? nowS;
    this._lastAt.set(patch.stuffId, nowS);
    const state = await cat.riverStateAt(from, lastAt);
    const v = Math.max(0, state?.currentHereMps ?? 0);
    const line = cat.lineOfSync(from.course);
    let km = from.km - (v * Math.max(0, nowS - lastAt)) / 1000;
    // Never past a place's upstream end, or the river's end, in one step.
    const stopAtKm = Math.max(
      line?.mouthKm ?? 0,
      ...cat.placesOfSync(from.course).filter((p) => p.kind === 'water' && p.upKm < from.km).map((p) => p.upKm),
    );
    if (km < stopAtKm) km = stopAtKm;
    const to: LinePosition = { ...from, km };
    // ⭐ What drifts follows the deepest, fastest water — the thalweg swings
    // to the outside of each bend — unless somebody in it is swimming.
    if (this.allPassive(patch)) {
      to.across = this.widthAt(to.course, km) * this.channelAt(to.course, km);
    }
    patch.placeOnLine(`${LINE_PREFIX}${from.course}`, to);
    await this.deliverDisconnected(patch);
    await this.meetHazards(patch, from, to);
    if (await this.fetchUp(patch, from, to)) return;
    if (patch.isDestroyed()) return;
    await this.refloat();

    // Reached an authored water place: it owns the water from here.
    const place = cat.placesOfSync(from.course).find(
      (p) => p.kind === 'water' && Math.abs(p.upKm - km) < 0.002 && p.ends.upstream === 'handoff',
    );
    if (place) {
      await this.handInto(patch, place);
      return;
    }
    // The end of the river.
    if (line && km <= line.mouthKm + 1e-6) {
      const carried = await this.atMouth(patch, from.course);
      if (carried) return;
    }

    const node = cat.reachNearSync(to.course, to.km)?.ref ?? '';
    if (this._nodeOf.get(patch.stuffId) !== node) {
      // ⭐ Risk 2: a patch that drifted into another catchment reads ITS weather.
      WeatherApi.forgetScope(patch.stuffId);
      this._nodeOf.set(patch.stuffId, node);
    }
    await this.refreshWater(patch);
    await patch.onFrameMoved(from, to);
    this.hearAhead(patch, to);
    await this.wireWithinHail(patch);
    if (await this.mergeInto(patch)) return;
    await this.scheduleNext(patch);
  }

  /**
   * ⭐ White water is heard before it is seen (D26, requirement 9): a
   * rapid or a falls within earshot downstream is told — once — to whoever
   * is being carried toward it. A sound announces itself; nothing else on
   * the river does.
   */
  private hearAhead(patch: ReachPatch, at: LinePosition): void {
    const line = this.catalogue()?.lineOfSync(at.course) ?? null;
    if (!line) return;
    const ahead = line.stretchesBetween(at.km, Math.max(line.mouthKm, at.km - EARSHOT_KM))
      .find((s) => s.flow === 'rapid' || s.flow === 'falls');
    if (!ahead || at.km <= ahead.upKm) return;
    const heard = this._heard.get(patch.stuffId);
    if (heard === ahead.id) return;
    this._heard.set(patch.stuffId, ahead.id);
    const line_ = ahead.flow === 'falls'
      ? 'Ahead of you, under the sound of the water, a deep steady roar that is not the wind: the falls.'
      : 'Ahead, round the bend, the river is roaring — white water, and you are going into it.';
    for (const c of (patch as unknown as Stuff & Container).getContents()) this.tellOf(c, Mml.compose`${line_}`);
  }

  /** Is everybody in the patch letting the water take them? */
  private allPassive(patch: ReachPatch): boolean {
    for (const c of (patch as unknown as Stuff & Container).getContents()) {
      if (MixinApi.isRespiration(c) && c.approachNow() === 'head-first') return false;
    }
    return true;
  }

  /**
   * ⭐⭐ The river's killers, met on their side as the water passes them
   * (D12). A hazard on the far bank is passed clear; one on your side is
   * met as you come — head-first, feet-first or passive — and decides. A
   * body caught is moved into the stop at the hazard (the patch goes on)
   * and held there; when the hold ends on its own the river takes it on.
   * ⭐ A disconnected body is never handed to a hazard (D15).
   */
  private async meetHazards(patch: ReachPatch, from: LinePosition, to: LinePosition): Promise<void> {
    const line = this.catalogue()?.lineOfSync(to.course) ?? null;
    if (!line || from.km <= to.km) return;
    const width = this.widthAt(to.course, to.km);
    for (const h of line.hazardsBetween(from.km, to.km)) {
      const at = h.side === 'left' ? width * 0.05 : width * 0.95;
      if (Math.abs(to.across - at) > width * HAZARD_REACH) continue;
      const bodies = (patch as unknown as Stuff & Container)
        .getContents()
        .filter((c) => (c.isAgent?.() ?? false) && MixinApi.isContainable(c));
      for (const body of bodies) {
        if (MixinApi.isHasInteractive(body) && body.isLinkdead()) continue;
        const approach = MixinApi.isRespiration(body) ? body.approachNow() : 'passive';
        const stop = await this.stopAt(to.course, h.km, h.side);
        const hazard = await this.hazardIn(stop, h);
        if (hazard === null) continue;
        if (!hazard.catches(approach)) {
          hazard.meet(body, approach, () => undefined);
          continue;
        }
        ContainmentApi.move(body as Stuff & Containable, stop as unknown as Stuff & Container);
        const below: LinePosition = { course: to.course, km: Math.max(line.mouthKm, h.km - 0.01), across: width * this.channelAt(to.course, h.km) };
        hazard.meet(body, approach, () => {
          if (body.isDestroyed() || (body as Stuff & Containable).getContainer() !== (stop as unknown as Stuff)) return;
          void this.handIn(body as Stuff & Containable, below).catch(() => undefined);
        });
      }
    }
  }

  /** The hazard good standing in its stop, placed there the first time it is met. */
  private async hazardIn(stop: ReachStop, h: LineHazard): Promise<RiverHazard | null> {
    for (const c of (stop as unknown as Stuff & Container).getContents()) {
      const r = c as unknown as RiverHazard;
      if (typeof r.getHazardId === 'function' && r.getHazardId() === h.id) return r;
    }
    try {
      const hazard = await StuffApi.clone<RiverHazard & Stuff & Containable>(h.row);
      hazard.setHazardId(h.id);
      ContainmentApi.move(hazard, stop as unknown as Stuff & Container);
      return hazard;
    } catch (err) {
      console.warn(`ReachWarren: the hazard ${h.id} (${h.row}) could not be placed`, err);
      return null;
    }
  }

  /**
   * ⭐⭐ A disconnected body is delivered, alive (D15): carried to the first
   * spot downstream that can hold it out of the current — an eddy, a bar —
   * and held there at the surface, kept by the stop while you are away.
   * The river's killers never act on it; absence never kills you.
   */
  private async deliverDisconnected(patch: ReachPatch): Promise<void> {
    const pos = patch.getLinePosition();
    if (pos === null) return;
    for (const c of [...(patch as unknown as Stuff & Container).getContents()]) {
      if (!MixinApi.isHasInteractive(c) || !c.isLinkdead()) continue;
      await this.deliver(c as Stuff & Containable, pos);
    }
  }

  /** Take one body to the first holdable spot downstream of `pos` and hold it there. */
  public async deliver(body: Stuff & Containable, pos: LinePosition): Promise<void> {
    const line = this.catalogue()?.lineOfSync(pos.course) ?? null;
    if (!line) return;
    const eddy = line.eddiesBetween(pos.km, line.mouthKm)[0] ?? null;
    const bar = line.collectsAt(pos.km);
    const spot = [eddy, bar].filter((x) => x !== null).sort((a, b) => b!.km - a!.km)[0] ?? null;
    const km = spot?.km ?? pos.km;
    const side: RiverSide = spot?.side ?? 'left';
    const stop = await this.stopAt(pos.course, km, side);
    ContainmentApi.move(body, stop as unknown as Stuff & Container);
    if (MixinApi.isRespiration(body)) body.holdUp();
  }

  /**
   * ⭐ What the river carries with nobody swimming in it fetches up where
   * drift collects (D27): a log, a lost hat, a body — passing a point bar
   * or a strainer, it stays there, in the stop at that spot. `true` when
   * the patch emptied into one and is gone.
   */
  private async fetchUp(patch: ReachPatch, from: LinePosition, to: LinePosition): Promise<boolean> {
    const contents = (patch as unknown as Stuff & Container).getContents();
    if (contents.length === 0 || contents.some((c) => c.isAgent?.())) return false;
    const line = this.catalogue()?.lineOfSync(to.course) ?? null;
    const spot = line?.collectsAt(from.km + 1e-6) ?? null;
    if (spot === null || spot.km < to.km) return false;
    const stop = await this.stopAt(to.course, spot.km, spot.side);
    for (const c of [...contents]) {
      if (MixinApi.isContainable(c)) ContainmentApi.move(c, stop as unknown as Stuff & Container);
    }
    this.reapPatch(patch);
    return true;
  }

  /**
   * ⭐ A body on the bed that has come up (D27): decomposition has filled
   * it, and it leaves the stop it lay in for the current. Looked at as the
   * river runs, never on a clock of its own — there are few.
   */
  private async refloat(): Promise<void> {
    for (const stop of [...this._stops.values()]) {
      if (stop.isDestroyed()) continue;
      const pos = stop.getLinePosition();
      // Only off the BED: a body fetched up on a bar stays there.
      if (pos === null || stop.stateNow() !== 'swimming') continue;
      for (const c of [...(stop as unknown as Stuff & Container).getContents()]) {
        if ((c as unknown as { buoyantNow?(): boolean }).buoyantNow?.() !== true) continue;
        if (!MixinApi.isContainable(c)) continue;
        await this.handIn(c, { ...pos, across: this.widthAt(pos.course, pos.km) * this.channelAt(pos.course, pos.km) });
      }
    }
  }

  /** Hand everything in a patch into the authored place it has reached. */
  private async handInto(patch: ReachPatch, place: LinePlace): Promise<void> {
    const dest = await StuffApi.singleton<Stuff & Container>(place.path);
    for (const c of [...(patch as unknown as Stuff & Container).getContents()]) {
      if (!MixinApi.isContainable(c)) continue;
      try {
        ContainmentApi.move(c, dest);
        this.tellOf(c, Mml.compose`The river carries you on, into ${dest.getPresentation?.() ?? 'the water ahead'}.`);
      } catch (err) {
        console.warn(`ReachWarren: could not hand ${c.stuffId} into ${place.path}`, err);
      }
    }
    this.reapPatch(patch);
  }

  /**
   * At the end of a river: a tributary's water goes on into its main
   * stream at the junction; anything else stops there (a sea mouth's
   * authored place takes it before this).
   */
  private async atMouth(patch: ReachPatch, course: string): Promise<boolean> {
    const cat = this.catalogue();
    const ends = cat ? await cat.endsOf(course) : null;
    const pos = patch.getLinePosition()!;
    if (ends?.mouth.into === 'river') {
      const main = await cat!.positionOf(`${ends.mouth.course}:${ends.mouth.node}`);
      if (main) {
        const to: LinePosition = { course: main.course, km: main.km, across: main.across };
        for (const c of [...(patch as unknown as Stuff & Container).getContents()]) {
          if (!MixinApi.isContainable(c)) continue;
          await this.handIn(c, to);
        }
        this.reapPatch(patch);
        return true;
      }
    }
    // Nowhere further: the river's end holds what it carried.
    const stop = await this.stopAt(pos.course, pos.km, 'mid');
    for (const c of [...(patch as unknown as Stuff & Container).getContents()]) {
      if (MixinApi.isContainable(c)) ContainmentApi.move(c, stop as unknown as Stuff & Container);
    }
    this.reapPatch(patch);
    return true;
  }

  /**
   * ⭐ Within hail is together (D6): two patches on the same course and in
   * the same band across, within hail of each other, become one — the
   * elder keeps its place and takes the other's contents. `true` when
   * `patch` was folded into another and is gone.
   */
  private async mergeInto(patch: ReachPatch): Promise<boolean> {
    const pos = patch.getLinePosition();
    if (pos === null) return false;
    const other = await this.patchNear(pos, patch);
    if (other === null) return false;
    const [keep, fold] = other.stuffId < patch.stuffId ? [other, patch] : [patch, other];
    for (const c of [...(fold as unknown as Stuff & Container).getContents()]) {
      if (!MixinApi.isContainable(c)) continue;
      ContainmentApi.move(c, keep as unknown as Stuff & Container);
      this.tellOf(c, Mml.compose`You are near enough to the others in the water to call to them.`);
    }
    this.reapPatch(fold);
    if (keep !== patch) return true;
    await this.scheduleNext(keep);
    return true;
  }

  /**
   * ⭐ The ways to whatever FIXED place is within hail now (D7): an
   * authored bank (a quay, a towpath), a stop that is keeping something.
   * Wired as the patch comes within hail; taken down as it passes out.
   */
  private async wireWithinHail(patch: ReachPatch): Promise<void> {
    const pos = patch.getLinePosition();
    const cat = this.catalogue();
    if (pos === null || cat === null || !MixinApi.isExitable(patch as unknown as Stuff)) return;
    const ex = patch as unknown as Stuff & Container & Exitable;
    const hailKm = this.hailM() / 1000;
    const want = new Map<string, string>();
    for (const p of cat.placesOfSync(pos.course)) {
      if (p.kind !== 'bank') continue;
      if (pos.km <= p.upKm + hailKm && pos.km >= p.downKm - hailKm) want.set(p.name, p.path);
    }
    // Ways already wired that the water has left behind.
    for (const [dir, exit] of ex.getExits()) {
      const reach = exit as unknown as ReachExit;
      if (typeof reach.getWay !== 'function' || reach.getWay() !== 'place') continue;
      if (want.get(dir) !== reach.getTarget()) this.removeWay(ex, dir);
    }
    for (const [name, path] of want) {
      if (ex.getExit(name)) continue;
      await this.installWay(ex, name, 'place', path);
    }
    // ⭐ …and from the bank, the water passing it (D26): `water`, pinned to
    // this patch while it is within hail, so a throw, a haul, a look and a
    // wade from the bank reach whoever is in it. Taken down when it passes.
    // The fixed banks within hail: authored places by path, bank patches by id.
    const banks = new Map<string, Stuff>();
    for (const path of want.values()) {
      const live = StuffApi.findByTemplatePath<Stuff>(path);
      if (live) banks.set(path, live);
    }
    for (const b of this._banks) {
      const at = b.getLinePosition();
      if (!at || b.isDestroyed() || at.course !== pos.course) continue;
      if (Math.abs(at.km - pos.km) <= hailKm) banks.set(b.stuffId, b as unknown as Stuff);
    }
    const had = this._bankWays.get(patch.stuffId) ?? new Map<string, string>();
    for (const [key, dir] of had) {
      if (banks.has(key)) continue;
      const bank = StuffApi.findByTemplatePath<Stuff>(key) ?? [...this._banks].find((b) => b.stuffId === key) ?? null;
      if (bank && MixinApi.isExitable(bank as unknown as Stuff)) this.removeWay(bank as unknown as Stuff & Exitable, dir);
      had.delete(key);
    }
    for (const [path, bank] of banks) {
      if (had.has(path)) continue;
      if (!MixinApi.isExitable(bank)) continue;
      let dir = 'water';
      for (let n = 2; bank.getExit(dir); n++) dir = `water-${n}`;
      await this.installWay(bank as unknown as Stuff & Container & Exitable, dir, 'patch', patch.stuffId);
      const way = bank.getExit(dir) as unknown as ReachExit | undefined;
      way?.pinTo(patch as unknown as Stuff & Container);
      had.set(path, dir);
    }
    this._bankWays.set(patch.stuffId, had);
    // ⭐ At a junction, the other river by its name (D7): going upstream
    // there you choose a branch.
    for (const t of cat.tributariesOfSync(pos.course)) {
      const near = Math.abs(t.km - pos.km) <= hailKm;
      const has = ex.getExit(t.course);
      if (near && !has) await this.installWay(ex, t.course, 'branch', t.course);
      if (!near && has) this.removeWay(ex, t.course);
    }
  }

  /* ───────────────────────── boats ───────────────────────── */

  /**
   * ⭐ The river where a room is now — what a boat being paddled feels
   * (D21): the current at its across (the margin's with `inside`), the
   * depth, how broken the water is. `null` off any river.
   */
  public async riverAt(
    room: Stuff,
    inside = false,
  ): Promise<{ currentMps: number; depthM: number; roughness: number; course: string; km: number; barSide: RiverSide | null; widthM: number } | null> {
    const cat = this.catalogue();
    if (!cat) return null;
    let pos = (room as unknown as { getLinePosition?(): LinePosition | null }).getLinePosition?.() ?? null;
    if (pos === null) {
      const river = (room as unknown as { getRiver?(): { course: string; at: string } | null }).getRiver?.();
      if (river) pos = await cat.positionOf(river.at.includes(':') ? river.at : `${river.course}:${river.at}`);
    }
    if (pos === null) return null;
    const nowS = WorldClockApi.getNow().rawValue();
    let state = await cat.riverStateAt(pos, nowS);
    if (state && inside) {
      const s = state.stretch;
      const insideSide: RiverSide = s.outside === 'left' ? 'right' : 'left';
      const width = this.widthAt(pos.course, pos.km);
      state = (await cat.riverStateAt({ ...pos, across: insideSide === 'left' ? width * 0.08 : width * 0.92 }, nowS)) ?? state;
    }
    if (!state) return null;
    const banks = state.stretch.banks;
    return {
      currentMps: state.currentHereMps,
      depthM: state.depthHereM,
      roughness: state.roughness,
      course: pos.course,
      km: pos.km,
      barSide: banks.left.kind === 'bar' ? 'left' : banks.right.kind === 'bar' ? 'right' : null,
      widthM: state.widthM,
    };
  }

  /**
   * ⭐ Where a boat launched from `from` goes into the river (D30): from a
   * bank on a river's line, into the water at its edge, held there (a stop
   * at the bank) — `paddle` pushes off. `null` anywhere else.
   */
  public async launchPlaceFor(from: Stuff): Promise<(Stuff & Container) | null> {
    // ⭐ A ship's deck on a river (D28, D30): her boat goes into the water
    // where she lies — and comes back up onto her deck while she is within hail.
    const deckPath = from.getTemplatePath();
    const ship = deckPath ? await NavigationApi.structureAt(deckPath).catch(() => null) : null;
    if (ship && MixinApi.isPositioned(ship) && ship.getLinePosition() !== null && MixinApi.isVoyaging(ship)) {
      if (ship.getCourse() !== null) return null;
      const pos = ship.getLinePosition()!;
      const patch = (await this.patchNear(pos, null)) ?? (await this.mintPatch(pos));
      this._shipOf.set(patch.stuffId, ship.getTemplatePath() ?? '');
      return patch as unknown as Stuff & Container;
    }
    if (!MixinApi.isShore(from) || from.getBank() === null) return null;
    const b = from.getBank()!;
    const cat = this.catalogue() ?? (await StuffApi.singleton<WatercourseCatalogue>(CATALOGUE_PATH));
    const pos = await cat.positionOf(`${b.course}:${b.at},${b.side}`);
    if (pos === null) return null;
    return (await this.stopAt(pos.course, pos.km, b.side)) as unknown as Stuff & Container;
  }

  /**
   * Where a boat in river water comes out (D30): from the edge of the river
   * beside an authored bank within hail, up onto that bank. `null` anywhere
   * else — a boat in the stream of the river has nowhere to be lifted onto.
   */
  public async recoverPlaceFor(from: Stuff): Promise<(Stuff & Container) | null> {
    const pos = (from as unknown as { getLinePosition?(): LinePosition | null }).getLinePosition?.() ?? null;
    const cat = this.catalogue();
    if (pos === null || cat === null) return null;
    // Back up onto the deck of the ship she came off, while that ship lies within hail.
    const shipPath = this._shipOf.get(from.stuffId) ?? null;
    const ship = shipPath ? StuffApi.findByTemplatePath<Stuff>(shipPath) : null;
    if (ship && MixinApi.isPositioned(ship) && MixinApi.isVoyaging(ship) && ship.getCourse() === null) {
      const at = ship.getLinePosition();
      const deck = (ship as unknown as { getEntrance?(): string | null }).getEntrance?.() ?? null;
      if (at && deck && at.course === pos.course && Math.abs(at.km - pos.km) <= this.hailM() / 1000) {
        return StuffApi.singleton<Stuff & Container>(deck);
      }
    }
    const hailKm = this.hailM() / 1000;
    for (const p of cat.placesOfSync(pos.course)) {
      if (p.kind !== 'bank') continue;
      if (pos.km <= p.upKm + hailKm && pos.km >= p.downKm - hailKm) {
        return StuffApi.singleton<Stuff & Container>(p.path);
      }
    }
    return null;
  }

  /**
   * ⭐ A killick dropped from a boat (D23): it holds where the water is
   * slack — the boat and its people become a stop at that spot — and drags
   * where it is not.
   */
  public async holdBoat(boat: Stuff & Containable): Promise<{ ok: boolean; line: string }> {
    const room = boat.getContainer() as unknown as Stuff | null;
    if (room === null) return { ok: false, line: 'There is no water under it to hold in.' };
    const pos = (room as unknown as { getLinePosition?(): LinePosition | null }).getLinePosition?.() ?? null;
    const river = await this.riverAt(room);
    if (pos === null || river === null) return { ok: false, line: 'The killick goes down, and finds nothing to hold.' };
    const holdsBelow = dialNum('water.river.killickHoldsMps', KILLICK_HOLDS_MPS);
    if (Math.abs(river.currentMps) >= holdsBelow) {
      return { ok: false, line: 'The killick goes down and drags along the bottom; the water is too quick for it to hold.' };
    }
    if ((room as unknown as { isUnderWay?(): boolean }).isUnderWay?.() === false) {
      return { ok: true, line: 'The killick goes down and holds; you are not going anywhere.' };
    }
    const width = this.widthAt(pos.course, pos.km);
    const side: RiverSide | 'mid' = pos.across < width * 0.3 ? 'left' : pos.across > width * 0.7 ? 'right' : 'mid';
    const stop = await this.stopAt(pos.course, pos.km, side);
    ContainmentApi.move(boat, stop as unknown as Stuff & Container);
    return { ok: true, line: 'The killick goes down, bumps along, and takes hold. The boat swings round on its line and stops.' };
  }

  /* ───────────────────────── what is in sight ───────────────────────── */

  /**
   * ⭐ Whoever is in the water within sight of `place` on `course` (D26):
   * to the end of the bend you are on and half way round the next, or as
   * far as height carries on a straight reach. The bodies, not the water:
   * *someone in the water, upstream, coming down.*
   */
  /**
   * ⭐ A ship's wake (river D29): passing at more than
   * `water.river.wakeSpeedMps`, she throws a wave `0.08 · v²` m high, and a
   * small boat within hail with less freeboard than that is swamped. Slowed,
   * nothing. The ship's watch asks; the water does the rest.
   */
  public async wakeAt(pos: LinePosition, speedMps: number): Promise<void> {
    if (speedMps <= dialNum('water.river.wakeSpeedMps', WAKE_SPEED_MPS)) return;
    const wave = 0.08 * speedMps * speedMps;
    const hailKm = this.hailM() / 1000;
    const near = [...this._patches, ...this._stops.values()].filter((p) => {
      const at = p.getLinePosition();
      return at !== null && at.course === pos.course && Math.abs(at.km - pos.km) <= hailKm && !p.isDestroyed();
    });
    for (const place of near) {
      for (const c of [...(place as unknown as Container).getContents()]) {
        const boat = c as unknown as { freeboardNowM?(): number; capsize?(why: string): void };
        if (typeof boat.freeboardNowM !== 'function' || typeof boat.capsize !== 'function') continue;
        if (wave > boat.freeboardNowM()) {
          boat.capsize('A steamer goes by at speed and her wake comes down on you, a hill of brown water.');
        }
      }
    }
  }

  /**
   * ⭐ Lining (river D24): a boat on a painter held from the bank comes
   * along to the water at the bank where the holder now stands — held there
   * by the line, a stop at that bank. The pull is the walker's: the
   * current's drag on her hull, paid in effort.
   */
  public async lineBoatTo(boat: Stuff & Containable, bank: LinePosition, walker: Stuff): Promise<void> {
    const room = boat.getContainer() as unknown as Stuff | null;
    const at = (room as unknown as { getLinePosition?(): LinePosition | null } | null)?.getLinePosition?.() ?? null;
    if (room === null || at === null || at.course !== bank.course) return;
    if (Math.abs(at.km - bank.km) > this.hailM() / 1000 * 2) return;
    const width = this.widthAt(bank.course, bank.km);
    const side: RiverSide = bank.across < width / 2 ? 'left' : 'right';
    const stop = await this.stopAt(bank.course, bank.km, side);
    if ((stop as unknown as Stuff) === room) return;
    ContainmentApi.move(boat, stop as unknown as Stuff & Container);
    const river = await this.riverAt(stop as unknown as Stuff).catch(() => null);
    if (river && MixinApi.isExerting(walker)) {
      walker.exert({ durationS: 60, powerW: Math.min(400, 60 + 40 * Math.abs(river.currentMps)) });
    }
    this.tellOf(walker, Mml.compose`You lean on the painter and walk her up the bank, the boat sheering out on the current and coming along.`);
  }

  /**
   * ⭐ A kedge down within hail (river D28): the km of a stop holding a
   * boat that carries its killick — the boat took it out and let it go.
   */
  public kedgeNear(pos: LinePosition): number | null {
    const hailKm = this.hailM() / 1000;
    let best: { km: number; d: number } | null = null;
    for (const stop of this._stops.values()) {
      const at = stop.getLinePosition();
      if (at === null || at.course !== pos.course || stop.isDestroyed()) continue;
      const d = Math.abs(at.km - pos.km);
      if (d === 0 || d > hailKm) continue;
      const held = (stop as unknown as Container).getContents().some((c) => {
        const boat = c as unknown as { holdAt?: unknown; getContents?(): Stuff[] };
        return typeof boat.holdAt === 'function' &&
          (boat.getContents?.() ?? []).some((k) => typeof (k as unknown as { dropAnchor?: unknown }).dropAnchor === 'function');
      });
      if (held && (best === null || d < best.d)) best = { km: at.km, d };
    }
    return best?.km ?? null;
  }

  public sightablesNear(course: string, place: unknown, eyeHeightM: number): Stuff[] {
    const cat = this.catalogue();
    const line = cat?.lineOfSync(course) ?? null;
    if (!cat || !line) return [];
    const p = place as Stuff;
    let km: number | null = (p as unknown as { getLinePosition?(): LinePosition | null }).getLinePosition?.()?.km ?? null;
    if (km === null && MixinApi.isShore(p) && p.getBank() !== null) {
      const b = p.getBank()!;
      km = cat.positionOfSync(`${b.course}:${b.at}`)?.km ?? null;
    }
    if (km === null) return [];
    const sight = line.sightKm(km, eyeHeightM);
    const out: Stuff[] = [];
    for (const room of [...this._patches, ...this._stops.values()]) {
      if ((room as unknown) === p || room.isDestroyed()) continue;
      const at = room.getLinePosition();
      if (!at || at.course !== course) continue;
      if (at.km > km + sight.upKm || at.km < km - sight.downKm) continue;
      for (const c of (room as unknown as Stuff & Container).getContents()) {
        if (c.isAgent?.()) out.push(c);
      }
    }
    return out;
  }

  /* ───────────────────────── the bank ───────────────────────── */

  /**
   * One walk along a bank (D25): from an authored bank place's end or a
   * bank patch's km, a hundred meters up or down the same bank — into the
   * authored bank place there when there is one, else the bank there.
   * `null` past the river's ends.
   */
  private async bankStep(
    source: Stuff,
    way: 'walk-up' | 'walk-down',
  ): Promise<{ place: string } | { pos: LinePosition; side: RiverSide } | null> {
    const cat = this.catalogue() ?? (await StuffApi.singleton<WatercourseCatalogue>(CATALOGUE_PATH));
    let course: string;
    let km: number;
    let side: RiverSide;
    const own = (source as unknown as { getLinePosition?(): LinePosition | null }).getLinePosition?.() ?? null;
    if (own !== null) {
      course = own.course;
      km = own.km;
      side = own.across < this.widthAt(course, km) / 2 ? 'left' : 'right';
    } else if (MixinApi.isShore(source) && source.getBank() !== null) {
      const b = source.getBank()!;
      const placed = cat.placesOfSync(b.course).find((p) => p.path === (source.getTemplatePath() ?? ''));
      course = b.course;
      side = b.side;
      km = placed ? (way === 'walk-up' ? placed.upKm : placed.downKm) : ((await cat.positionOf(`${b.course}:${b.at}`))?.km ?? 0);
    } else {
      return null;
    }
    const line = cat.lineOfSync(course);
    if (!line) return null;
    const target = way === 'walk-up' ? km + BANK_STEP_KM : km - BANK_STEP_KM;
    if (target > line.sourceKm || target < line.mouthKm) return null;
    const here = source.getTemplatePath() ?? '';
    const place = cat.placesOfSync(course).find(
      (p) => p.kind === 'bank' && p.side === side && p.path !== here && target <= p.upKm + 1e-6 && target >= p.downKm - 1e-6,
    );
    if (place) return { place: place.path };
    const width = this.widthAt(course, target);
    return { pos: { course, km: target, across: side === 'left' ? width * 0.02 : width * 0.98 }, side };
  }

  private async bankNear(pos: LinePosition, side: RiverSide): Promise<BankPatch | null> {
    for (const b of this._banks) {
      const at = b.getLinePosition();
      if (!at || b.isDestroyed() || at.course !== pos.course) continue;
      const bSide: RiverSide = at.across < this.widthAt(at.course, at.km) / 2 ? 'left' : 'right';
      if (bSide === side && Math.abs(at.km - pos.km) * 1000 < 30) return b;
    }
    return null;
  }

  private async mintBank(pos: LinePosition): Promise<BankPatch> {
    const bank = await this.serial(async () => {
      this._budRow = BANK_ROW;
      return (await this.createMemberSerialized()) as unknown as BankPatch;
    });
    bank.placeOnLine(`${LINE_PREFIX}${pos.course}`, { ...pos });
    this.addMember(bank as unknown as MemberStuff);
    this._serial += 1;
    await this.giveZone(bank as unknown as ReachPlace, `${BANK_ZONE}/${pos.course}/${this._serial}`);
    this._banks.add(bank);
    const ex = bank as unknown as Stuff & Container & Exitable;
    await this.installWay(ex, 'upstream', 'walk-up');
    await this.installWay(ex, 'downstream', 'walk-down');
    await this.installWay(ex, 'river', 'enter');
    // The water passing within hail of it now is wired to it now.
    for (const p of this._patches) {
      const at = p.getLinePosition();
      if (at && at.course === pos.course && Math.abs(at.km - pos.km) * 1000 <= this.hailM()) await this.wireWithinHail(p);
    }
    return bank;
  }

  /* ───────────────────────── reaping ───────────────────────── */

  private reapPatch(patch: ReachPatch): void {
    for (const [key, dir] of this._bankWays.get(patch.stuffId) ?? []) {
      const bank = StuffApi.findByTemplatePath<Stuff>(key) ?? ([...this._banks].find((b) => b.stuffId === key) as unknown as Stuff | undefined) ?? null;
      if (bank && !bank.isDestroyed() && MixinApi.isExitable(bank)) this.removeWay(bank, dir);
    }
    this._bankWays.delete(patch.stuffId);
    patch.getDrift()?.cancel();
    patch.setDrift(null);
    this._patches.delete(patch);
    this._lastAt.delete(patch.stuffId);
    this._nodeOf.delete(patch.stuffId);
    this._heard.delete(patch.stuffId);
    this.reap(patch as unknown as MemberStuff);
  }

  /** Remove a member and its zone with it (D38). */
  private reap(m: MemberStuff): void {
    if (m.isDestroyed()) return;
    const zone = m.getZone() as unknown as (Stuff & { removeLocation(p: unknown): boolean }) | null;
    this.removeMember(m);
    if (zone !== null && MixinApi.isMovingZone(zone as unknown as Stuff)) zone.removeLocation(m);
    StuffApi.destruct(m as unknown as Stuff);
    // ⭐ The zone goes with its place (D38): minted with it, reaped with it —
    // not left for eviction (the drive's world ran out of memory).
    if (zone !== null && MixinApi.isMovingZone(zone as unknown as Stuff) && !(zone as unknown as Stuff).isDestroyed()) {
      StuffApi.destruct(zone as unknown as Stuff);
    }
    if (zone !== null && MixinApi.isMovingZone(zone as unknown as Stuff)) {
      try {
        StuffApi.destruct(zone as unknown as Stuff);
      } catch {
        /* it goes when nothing holds it */
      }
    }
  }

  private forgetStop(stop: ReachStop): void {
    const key = stop.getPersistenceKey();
    if (key) this._stops.delete(key);
    const before = this.stops.length;
    this.stops = this.stops.filter((r) => stopKey(r.course, r.km, r.side) !== key);
    if (this.stops.length !== before) void this.saveSelf();
  }

  /* ───────────────────────── reading the line ───────────────────────── */

  private catalogue(): WatercourseCatalogue | null {
    return StuffApi.findByTemplatePath<WatercourseCatalogue>(CATALOGUE_PATH) ?? null;
  }

  /** Where a way starts from: a minted place's own position, an authored place's end. */
  private async positionOf(source: Stuff, way: ReachWay): Promise<LinePosition | null> {
    const own = (source as unknown as { getLinePosition?(): LinePosition | null }).getLinePosition?.() ?? null;
    if (own !== null) return own;
    // ⭐ A ship's deck on a river (D29): over the side is the water where she is.
    const path = source.getTemplatePath();
    const ship = path ? await NavigationApi.structureAt(path).catch(() => null) : null;
    if (ship && MixinApi.isPositioned(ship) && ship.getLinePosition() !== null) return ship.getLinePosition();
    // A bank on the line: the margin of the water beside it.
    if (MixinApi.isShore(source) && source.getBank() !== null) {
      const bank = source.getBank()!;
      const cat = this.catalogue() ?? (await StuffApi.singleton<WatercourseCatalogue>(CATALOGUE_PATH));
      const pos = await cat.positionOf(`${bank.course}:${bank.at},${bank.side}`);
      if (pos !== null) return pos;
    }
    return this.endOf(source, way === 'upstream' ? 'upstream' : 'downstream');
  }

  /** An authored river place's end, as a position on its line. */
  private async endOf(place: Stuff, end: 'upstream' | 'downstream'): Promise<LinePosition | null> {
    const river = (place as unknown as { getRiver?(): { course: string; at: string; span?: number } | null }).getRiver?.();
    const cat = this.catalogue() ?? (await StuffApi.singleton<WatercourseCatalogue>(CATALOGUE_PATH));
    if (!river || !cat) return null;
    const at = river.at.includes(':') ? river.at : `${river.course}:${river.at}`;
    const up = await cat.positionOf(at);
    if (up === null) return null;
    if (end === 'upstream') return up;
    const line = await cat.lineOf(up.course);
    const km = Math.max(line?.mouthKm ?? 0, up.km - (river.span ?? 0));
    return { ...up, km, across: this.widthAt(up.course, km) * (line?.stretchAt(km)?.channelAcross ?? 0.5) };
  }

  /** The other river at a junction you are within hail of, at its mouth. */
  private async branchPosition(pos: LinePosition, course: string): Promise<LinePosition | null> {
    const cat = this.catalogue();
    if (!cat) return null;
    const ends = await cat.endsOf(course);
    if (ends?.mouth.into !== 'river' || ends.mouth.course !== pos.course) return null;
    const line = await cat.lineOf(course);
    if (!line) return null;
    return { course, km: line.mouthKm, across: this.widthAt(course, line.mouthKm) * 0.5 };
  }

  /** The authored water place a position falls inside, if any. */
  private waterPlaceAt(pos: LinePosition): LinePlace | null {
    for (const p of this.catalogue()?.placesOfSync(pos.course) ?? []) {
      if (p.kind === 'water' && pos.km <= p.upKm && pos.km >= p.downKm) return p;
    }
    return null;
  }

  private widthAt(course: string, km: number): number {
    return this.catalogue()?.lineOfSync(course)?.authoredWidthAt(km) ?? 10;
  }

  private channelAt(course: string, km: number): number {
    return this.catalogue()?.lineOfSync(course)?.stretchAt(km)?.channelAcross ?? 0.5;
  }

  private hailM(): number {
    for (const p of this._patches) return p.hailRangeM();
    return 100;
  }

  private hailKm(source: Stuff): number {
    const own = (source as unknown as { hailRangeM?(): number }).hailRangeM?.();
    return (own ?? this.hailM()) / 1000;
  }

  private asStop(m: MemberStuff): ReachStop | null {
    const s = m as unknown as ReachStop;
    if ([...this._banks].some((b) => (b as unknown) === (m as unknown))) return null;
    return typeof s.isUnderWay === 'function' && s.isUnderWay() === false ? s : null;
  }

  /** One mint at a time: two concurrent hand-ins never mint the same patch. */
  private serial<T>(run: () => Promise<T>): Promise<T> {
    const next = this._mintChain.then(run, run);
    this._mintChain = next.then(() => undefined, () => undefined);
    return next;
  }

  private async saveSelf(): Promise<void> {
    await PersistableApi.capture(this as unknown as Stuff).catch(() => undefined);
  }

  private tellOf(thing: Stuff, line: Mml): void {
    if (!MixinApi.isHasInteractive(thing)) return;
    try {
      MessageApi.scene(thing).topic('sense.surroundings').toSelf(line).send();
    } catch {
      /* decoration */
    }
  }
}

/** The key a stop persists by: its course, its meter, its side. */
function stopKey(course: string, km: number, side: RiverSide | 'mid'): string {
  return `${course}@${Math.round(km * 1000)}@${side}`;
}

/** A zone identity's leaf for a stop key. */
function zoneLeafOf(key: string): string {
  return key.replace(/@/g, '/');
}

function parseSide(key: string): RiverSide | 'mid' {
  const side = key.slice(key.lastIndexOf('@') + 1);
  return side === 'left' || side === 'right' ? side : 'mid';
}

/** Which band across the river a position is in (a river narrower than hail is one). */
function bandOf(across: number, width: number, hail: number): number {
  if (width <= hail) return 0;
  return Math.floor(Math.max(0, across) / hail);
}

function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x));
}

/** A numeric dial with a seeded fallback. */
function dialNum(key: string, fallback: number): number {
  try {
    const n = Number.parseFloat(AppApi.setting(key) ?? '');
    return Number.isFinite(n) ? n : fallback;
  } catch {
    return fallback;
  }
}
