/**
 * Gate — ⭐⭐ **a controlled structure with a setting, a lock and a log**
 * (water-supply D12): a headgate that opens a river into a ditch, a turnout
 * that opens a ditch onto a field. It passes `opening × capacityM3S` into
 * what it diverts to (the rest goes on down its own course), it opens BY AN
 * AMOUNT (`open the headgate to a quarter`), it takes a padlock, and every
 * setting is logged with who made it — the gate's own record is the water
 * ledger the field integrates and the rider audits.
 *
 * ⭐ **The rota is the turn list** (D21): a turnout names the position its
 * turns belong to (`turnOf`). Before anybody reads the log, the turns the
 * roster implies since the last read are reconciled into it — an irrigator
 * nobody watched all night still took their turn — and ⚠ each implied
 * opening obeys the live act's refusal: a padlocked turnout stays shut for
 * an irrigator with no key, and the log records the refused turn. The
 * reconcile never does what the live act could not.
 *
 * Weirs and dams stay plain `ControlStructure`s: a weir has no setting.
 * Staged or live is the row's (D30): a row that is the valley's ledger
 * names {@link PersistentGate}.
 */

import { ThrottleableMixin, SealableMixin } from '@saxonberg/server/mud/lib/spatial/Sealable';
import { LockableMixin } from '@saxonberg/server/mud/lib/boundary/Lockable';
import { ShiftSchedule } from '@saxonberg/server/mud/lib/employment/ShiftSchedule';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import { TrajectoryLog, type Piecewise } from '@saxonberg/server/mud/lib/Trajectory';
import type { FieldMeta } from '@saxonberg/server/mud/lib/mixin';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { VetoResult } from '@saxonberg/server/mud/lib/errors';
import type { ShiftEntry } from '@saxonberg/server/mud/lib/employment/Roster';
import type { CommandContributions } from '@saxonberg/server/mud/api/command';
import type { MarkupAugmenter } from '@saxonberg/server/mud/api/mml';
import ControlStructure, { type ControlSplit } from './ControlStructure';
import WatercourseCatalogue, { WATERCOURSE_CATALOGUE_PATH } from '../idea/WatercourseCatalogue';

/** Whose turns open this gate: a position on a business's roster. */
export interface TurnOf {
  business: string;
  positionKey: string;
  assignee: string;
}

/** A setting in the words the `open … to` verb takes. */
function settingWords(opening: number): string {
  if (opening <= 0) return 'shut';
  if (opening >= 1) return 'fully open';
  const words: Array<[number, string]> = [
    [0.25, 'a quarter open'],
    [0.5, 'half open'],
    [0.75, 'three quarters open'],
  ];
  const named = words.find(([f]) => Math.abs(opening - f) < 0.01);
  return named ? named[1] : `${Math.round(opening * 100)}% open`;
}

/** Who a record names — a body if one is loaded, else the leaf of the path. */
function workerName(by: string): string {
  if (by === '') return 'somebody';
  const live = StuffApi.findByIdentityPath(by)[0] ?? StuffApi.findByTemplatePath(by);
  if (live) return live.getPresentation();
  return by.split('/').filter(Boolean).pop() ?? by;
}

/**
 * ⭐ `look turnout` says how it is set and who last worked it — its own
 * record (D12), the ledger a rider audits. The browser walk found a gate
 * whose look said neither.
 */
function gateStateAugmenter(text: string, host: Stuff): string {
  if (!(host instanceof Gate)) return text;
  host.reconcileFromLoaded(WorldClockApi.getNow().rawValue());
  const lines = [`It is ${settingWords(host.getOpening())}.`];
  // The latest by time: a rota's catch-up appends past turns after a hand.
  const last = [...host.getWorkLog()].sort((a, b) => a.atS - b.atS).at(-1);
  if (last) {
    lines.push(
      last.by.endsWith('#refused')
        ? `Its last turn was refused: ${workerName(last.by.slice(0, -'#refused'.length))} found it padlocked.`
        : `${workerName(last.by)} last set it ${settingWords(last.opening)}.`,
    );
  }
  return `${text}\n\n${lines.join(' ')}`;
}

const GateBase = ThrottleableMixin(LockableMixin(SealableMixin(ControlStructure)));

export default class Gate extends GateBase {
  static fieldMeta: FieldMeta = {
    capacityM3S: { persistent: true, authorable: true },
    turnOf: { persistent: true, authorable: true },
    turnStamp: { persistent: true, runtimeState: true },
  };

  /** What it passes fully open into what it diverts to, m³/s. */
  public capacityM3S = 0.1;
  /** Whose rostered turns open it, or `null`. */
  public turnOf: TurnOf | null = null;
  /** When the roster's turns were last reconciled into the log. */
  public turnStamp: number | null = null;

  constructor() {
    super();
    this.fixedInPlace = true;
  }

  public getCapacityM3S(): number {
    return this.capacityM3S;
  }
  public setCapacityM3S(value: number): void {
    this.capacityM3S = Number.isFinite(value) && value > 0 ? value : 0;
  }
  public setTurnOf(value: TurnOf | null): void {
    this.turnOf =
      value && typeof value.business === 'string' && typeof value.positionKey === 'string'
        ? { business: value.business, positionKey: value.positionKey, assignee: String(value.assignee ?? '') }
        : null;
  }

  // ---------- the water ----------

  /** ⭐ It passes its setting's share of its capacity, never more than arrives. */
  public override split(arrivingM3S: number): ControlSplit {
    const arriving = Math.max(0, arrivingM3S);
    const diverted = Math.min(this.getOpening() * this.capacityM3S, arriving);
    return { passedM3S: arriving - diverted, divertedM3S: diverted, generatedW: 0 };
  }

  public override withdrawalM3S(naturalM3S: number): number {
    return this.split(naturalM3S).divertedM3S;
  }

  // ---------- the lock is the gate ----------

  /**
   * ⭐ A padlocked gate opens only for somebody whose key fits it (D12) — the
   * key works the padlock as part of the act. Nobody else.
   */
  public override canOpen(by: Stuff): VetoResult {
    if (this.isLocked() && !this.opensFor(by)) {
      return { ok: false, reason: "It's padlocked shut." };
    }
    return { ok: true };
  }

  // ---------- the rota (D21) ----------

  /**
   * ⭐⭐ Bring the log up to `nowS` from the roster: every turn the rota
   * implies since the last reconcile opens the gate at its start and shuts
   * it at its end, `by` the assignee — unless the gate is padlocked at the
   * turn's start, which records a refused turn (the assignee holds no key;
   * a keyed assignee's NPC turn works the lock as the live act would).
   */
  public async reconcileScheduled(nowS: number): Promise<void> {
    const turn = this.turnOf;
    if (turn === null) return;
    this.applyRota(nowS, turn, await this.scheduleOf(turn));
  }

  /**
   * ⭐ The same reconcile, synchronously, when the company is already loaded
   * — what `look` runs, so a gate looked at mid-turn reads open even when
   * no field has read it since (the browser walk). Nothing loaded, nothing
   * settled: the next async read catches up.
   */
  public reconcileFromLoaded(nowS: number): void {
    const turn = this.turnOf;
    if (turn === null) return;
    const biz = StuffApi.findByTemplatePath<Stuff>(turn.business) ?? null;
    if (biz === null || !MixinApi.isOrganization(biz)) return;
    this.applyRota(nowS, turn, this.slotSchedule(biz, turn));
  }

  /** Bring the record up to `nowS` from a schedule in hand. */
  private applyRota(nowS: number, turn: TurnOf, schedule: ShiftEntry[]): void {
    if (this.turnStamp === null) {
      // ⭐ The rota starts from the day's midnight, not from the first look:
      // a gate first read mid-turn is open for that turn (the browser walk —
      // Furtado's turnout read "shut" at 06:38, inside his 04:00–10:00).
      const dayStart = nowS - (((nowS % 86_400) + 86_400) % 86_400);
      this.turnStamp = dayStart;
      // What it stands at opens the record, so the first turn is a change.
      if (this.openingCurve.length === 0) {
        new TrajectoryLog(this.openingCurve).record(dayStart, this.getOpening(), this.getOpening(), 0);
      }
      if (!(nowS > dayStart)) return;
    }
    const from = this.turnStamp;
    if (!(nowS > from)) return;
    this.turnStamp = nowS;
    if (schedule.length === 0) return;
    const rota = new ShiftSchedule(schedule);
    const onNow = rota.isOnAt(nowS);
    for (const w of rota.windowsBetween(from, nowS)) {
      if (this.isLocked()) {
        this.workLog.push({ atS: w.fromS, by: `${turn.assignee}#refused`, opening: this.getOpening() });
        continue;
      }
      // A turn still running is clipped to `nowS` by the walk: it stays
      // open (it read "shut" mid-turn), and is not re-opened on every read.
      if (this.getOpening() < 1) this.logSetting(w.fromS, 1, turn.assignee);
      if (w.toS < nowS || !onNow) this.logSetting(w.toS, 0, turn.assignee);
    }
    while (this.workLog.length > 24) this.workLog.shift();
  }

  /** Record a setting at a past instant — the rota's half of the log. */
  private logSetting(atS: number, opening: number, by: string): void {
    new TrajectoryLog(this.openingCurve).record(atS, opening, opening, 0);
    this.workLog.push({ atS, by, opening });
    this.opening = opening;
    this.setOpen(opening > 0);
  }

  /** The assignee's schedule for the position, off the business's roster (loaded on use). */
  private async scheduleOf(turn: TurnOf): Promise<ShiftEntry[]> {
    const biz = await StuffApi.singleton<Stuff>(turn.business).catch(() => null);
    if (biz === null || !MixinApi.isOrganization(biz)) return [];
    return this.slotSchedule(biz, turn);
  }

  /** The turn's hours on a loaded business's roster. */
  private slotSchedule(biz: Stuff, turn: TurnOf): ShiftEntry[] {
    if (!MixinApi.isOrganization(biz)) return [];
    const roster = biz.getRoster();
    const slot = roster
      .getAssignments()
      .find((a) => a.positionKey === turn.positionKey && (turn.assignee === '' || a.assignee === turn.assignee));
    return slot ? [...slot.schedule] : [];
  }

  /** ⭐ A gate worked by a rota settles its turns before it is integrated. */
  public override async settleOpening(nowS: number): Promise<void> {
    await this.reconcileScheduled(nowS);
  }

  /** The opening over a span, after the rota's turns are in. */
  public async settledOpeningTrajectory(fromS: number, toS: number): Promise<Piecewise> {
    await this.reconcileScheduled(toS);
    return this.openingTrajectory(fromS, toS);
  }

  /**
   * ⭐ What it passes fully open right now (D15): its capacity, or less when
   * less water arrives at it — a turnout on a dry ditch passes nothing, so
   * the field it serves is credited nothing however long it stands open.
   */
  public override async passingCapM3S(nowS: number): Promise<number | null> {
    const cat = await StuffApi.singleton<WatercourseCatalogue>(WATERCOURSE_CATALOGUE_PATH).catch(() => null);
    if (cat === null || this.reachRef === '') return this.capacityM3S;
    const flow = await cat.flowAt(this.reachRef, nowS, await cat.liveDraws(nowS));
    return Math.min(this.capacityM3S, Math.max(0, flow?.m3s ?? 0));
  }

  /** The time now, for callers with no clock in hand. */
  public nowS(): number {
    return WorldClockApi.getNow().rawValue();
  }

  /** Anybody at the gate can work it, lock it, unlock it. */
  static markupAugmenters: MarkupAugmenter[] = [gateStateAugmenter];

  static commandContributions: CommandContributions = {
    peers: [
      'platform/cmd/boundary/open.yaml',
      'platform/cmd/boundary/close.yaml',
      'platform/cmd/boundary/lock.yaml',
      'platform/cmd/boundary/unlock.yaml',
    ],
  };
}
