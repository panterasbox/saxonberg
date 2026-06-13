/**
 * LoungeWarren — the concrete, singleton Warren over the one `Lounge`
 * room template. Supplies the lounge *policy* on top of the base Warren
 * mechanism: least-full routing, a star hub topology, the tunable
 * bud/merge band, the population reconcile loop, and the one host-only
 * fixture (Dave's Bar).
 *
 * Singleton (`SingletonMixin`): there is exactly one lounge Warren,
 * resolved/created lazily by `StuffApi.singleton(LoungeWarren.WARREN_PATH)`.
 * Multi-lounge is deferred; the abstract base stays multi-instance-capable
 * for future consumers (dungeon/desert).
 *
 * The strategy is intentionally the *simplest tunable* one — seat arrivals
 * least-full, reap rooms that fall below the merge watermark, bud when all
 * eligible rooms are at the bud threshold; never rebalance a live crowd.
 * The personality lives in a few knobs (`getBudThreshold` /
 * `getMergeWatermark` / `getReapGraceMs`), built to fail safe
 * (flatten-to-one-room is `N` high + `M` 0) and tune cheap (defaults are
 * code constants headed for `GameConfig`).
 */

import { Warren, type Attachment } from '../../lib/location/Warren';
import { SingletonMixin } from '../../lib/stuff/Singleton';
import type { Stuff } from '../../lib/stuff/Stuff';
import type { Container } from '../../lib/spatial/Container';
import type { Containable } from '../../lib/spatial/Containable';
import type { Exitable } from '../../lib/boundary/Exitable';
import { StuffApi } from '../../api/stuff';
import { ContainmentApi } from '../../api/containment';
import { MessageApi } from '../../api/message';
import { Mml } from '../../api/mml';
import { ScheduleApi, type ScheduleHandle } from '../../api/schedule';

type MemberStuff = Stuff & Container;
type ExitableContainer = Stuff & Container & Exitable;

export default class LoungeWarren extends SingletonMixin(Warren) {
  /** Seeded Warren-definition path; the `startLocation` spawn reference. */
  static readonly WARREN_PATH = '/domain/lounge/warren';
  /** The one lounge-room template every instance clones from. */
  static readonly LOUNGE_TEMPLATE = '/domain/lounge/lounge';
  /** Dave's Bar — the singleton external-neighbor shell. */
  static readonly BAR_PATH = '/domain/lounge/bar';

  /** The lounge's TPA node — a singleton fixture seated into the host. */
  static readonly LOUNGE_TERMINAL_PATH = '/domain/lounge/terminal';

  /** Direction host→Dave's (cardinal; auto-inverse 'south'). */
  static readonly BAR_DIRECTION = 'north';
  static readonly BAR_OPPOSITE = 'south';

  // Generous v1 defaults (steady state keeps rooms in [M, N]). Tests
  // override small via `setThresholds`. Headed to GameConfig.
  static readonly DEFAULT_BUD_THRESHOLD = 10;
  static readonly DEFAULT_MERGE_WATERMARK = 3;
  static readonly DEFAULT_REAP_GRACE_MS = 60_000;

  // Star-hub direction pool for satellites. The lounge expands
  // horizontally, never north (that's Dave's Bar) and never vertically
  // (no upstairs/downstairs unless the lounge ever gets huge). With small
  // live counts this is ample; a crowded star would exhaust it —
  // acceptable for v1 (the strategy is swappable). TS `private` per the
  // proxy-receiver rule.
  private static readonly STAR_DIRECTIONS = [
    'east',
    'south',
    'west',
    'southeast',
    'southwest',
  ];

  private budThreshold = LoungeWarren.DEFAULT_BUD_THRESHOLD;
  private mergeWatermark = LoungeWarren.DEFAULT_MERGE_WATERMARK;
  private reapGraceMs = LoungeWarren.DEFAULT_REAP_GRACE_MS;

  /** Pending reap timers, keyed by satellite. */
  private _reapTimers: Map<MemberStuff, ScheduleHandle> = new Map();

  // Reserve a hub direction per member so satellites don't collide on
  // the host's exit map. Cleared lazily as members leave.
  private _starIndex = 0;

  public getBudThreshold(): number {
    return this.budThreshold;
  }
  public getMergeWatermark(): number {
    return this.mergeWatermark;
  }
  public getReapGraceMs(): number {
    return this.reapGraceMs;
  }

  /**
   * Runtime tuning seam (the band is the lounge's personality). v1 ships
   * code-constant defaults; this is the hook tests use to drive small
   * thresholds and the migration target when the knobs move to
   * `GameConfig`.
   */
  public setThresholds(opts: {
    budThreshold?: number;
    mergeWatermark?: number;
    reapGraceMs?: number;
  }): void {
    if (opts.budThreshold !== undefined) this.budThreshold = opts.budThreshold;
    if (opts.mergeWatermark !== undefined)
      this.mergeWatermark = opts.mergeWatermark;
    if (opts.reapGraceMs !== undefined) this.reapGraceMs = opts.reapGraceMs;
  }

  // ───────────────────────── policy hooks ─────────────────────────

  /**
   * Bud = clone the one lounge-room template (it self-registers via its
   * `warren` instruction field). Instances share the template path; their
   * hub exits use live refs (`keepLiveDestination`), so there is no need
   * to re-key per-instance paths.
   */
  protected async createMember(): Promise<MemberStuff> {
    return StuffApi.clone<MemberStuff>(LoungeWarren.LOUNGE_TEMPLATE);
  }

  /**
   * Seat an arrival the host can't hold. **Sync prefix** seats into the
   * least-full eligible satellite (so the re-seat completes within the
   * triggering move — single perception); only when none is eligible do
   * we `await` a fresh bud.
   */
  public async admitArrival(host: MemberStuff, actor: Stuff): Promise<void> {
    const eligible = this.getMembers()
      .filter((m) => m !== host && this.occupantsOf(m).length < this.budThreshold)
      .sort((a, b) => this.occupantsOf(a).length - this.occupantsOf(b).length);
    let target = eligible[0];
    if (!target) {
      target = await this.spawnMember();
      this.emitBudCue(host);
    }
    ContainmentApi.move(actor as unknown as Stuff & Containable, target);
  }

  /** Star topology: reserve the next free direction off the host. */
  protected attachmentFor(_m: MemberStuff): Attachment {
    const pool = LoungeWarren.STAR_DIRECTIONS;
    const dir = pool[this._starIndex % pool.length]!;
    this._starIndex += 1;
    return { direction: dir };
  }

  /**
   * Population reconcile — merge-low only (budding is handled eagerly by
   * the arrival witness). A satellite below the merge watermark schedules
   * a drain-and-reap after the grace; the timer re-checks at fire time
   * (no thrash) and the host is never reaped. No live rebalancing of
   * healthy rooms.
   */
  protected async reconcile(): Promise<void> {
    const host = this.getCurrentHost();
    for (const s of this.getMembers()) {
      if (s === host) continue;
      const occ = this.occupantsOf(s).length;
      if (occ < this.mergeWatermark) {
        if (!this._reapTimers.has(s)) {
          const handle = ScheduleApi.schedule(this.reapGraceMs, () => {
            this._reapTimers.delete(s);
            if (
              this.hasMember(s) &&
              s !== this.getCurrentHost() &&
              this.occupantsOf(s).length < this.mergeWatermark
            ) {
              this.reapMember(s);
              this.emitMergeCue(s);
            }
          });
          this._reapTimers.set(s, handle);
        }
      } else {
        const pending = this._reapTimers.get(s);
        if (pending) {
          ScheduleApi.cancel(pending);
          this._reapTimers.delete(s);
        }
      }
    }
  }

  /**
   * Wire the one host-only fixture: a north exit to Dave's Bar. The host
   * is a non-singleton clone (a shared template path), so the back-exit
   * (bar→host) holds a live ref. Satellites reach Dave's by walking to
   * the host.
   */
  protected async wireHostFixtures(host: MemberStuff): Promise<void> {
    const hostEx = this.requireExitable(host);
    const bar = await StuffApi.singleton<ExitableContainer>(LoungeWarren.BAR_PATH);
    await hostEx.addBidirectionalExit(bar, LoungeWarren.BAR_DIRECTION, {
      opposite: LoungeWarren.BAR_OPPOSITE,
      keepLiveDestination: true,
    });

    // Seat the lounge's TPA node into the host (the singleton fixture is
    // created on first wiring — first landing — which stands the network up
    // via its postRegister cascade; re-seated here on host migration). Use
    // the path string, not a class import, to avoid a LoungeTerminal cycle.
    // Fail-soft: a deployment without the fast-travel seeds (or a unit test
    // that doesn't load them) still gets a working lounge, just no terminal.
    try {
      const terminal = await StuffApi.singleton<Stuff & Containable>(
        LoungeWarren.LOUNGE_TERMINAL_PATH,
      );
      ContainmentApi.move(terminal, host);
    } catch (err) {
      console.warn(
        'LoungeWarren: lounge TPA terminal not seated:',
        err instanceof Error ? err.message : String(err),
      );
    }
  }

  /**
   * Remove the host-only fixture's neighbor-side half (Dave's `south`)
   * left dangling when the old host was destroyed, so `wireHostFixtures`
   * can re-install it onto the new host cleanly. Idempotent — no-op when
   * Dave's isn't loaded or the exit is gone.
   */
  protected async unwireHostFixtures(): Promise<void> {
    const bar = StuffApi.findByTemplatePath<ExitableContainer>(
      LoungeWarren.BAR_PATH,
    );
    if (!bar) return;
    const exit = bar.getExit(LoungeWarren.BAR_OPPOSITE);
    if (!exit) return;
    bar.removeExit(LoungeWarren.BAR_OPPOSITE);
    StuffApi.destruct(exit as unknown as Stuff);
  }

  // ─────────────────────────── cues ───────────────────────────────

  /** Diegetic budding cue — a new doorway opens in the host room. */
  private emitBudCue(host: MemberStuff): void {
    try {
      MessageApi.scene(host)
        .topic('world.lounge.bud')
        .toContents(Mml.compose`A new doorway eases open along the wall.`)
        .send();
    } catch {
      /* cues are flavor; never let one break the topology change */
    }
  }

  /** Diegetic merging cue — a doorway eases shut as a room is reaped. */
  private emitMergeCue(satellite: MemberStuff): void {
    try {
      MessageApi.scene(satellite)
        .topic('world.lounge.merge')
        .toContents(Mml.compose`A doorway eases quietly shut.`)
        .send();
    } catch {
      /* flavor only */
    }
  }
}
