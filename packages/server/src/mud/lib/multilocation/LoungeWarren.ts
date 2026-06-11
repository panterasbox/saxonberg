/**
 * LoungeWarren — the concrete, singleton Warren over the one `LoungeRoom`
 * template. Supplies the lounge *policy* on top of the base mechanism:
 * least-full routing, a star hub topology, the tunable bud/merge band, the
 * population reconcile loop, and the host-only fixtures (Dave's Bar + the
 * placeholder campus exit).
 *
 * Singleton (`SingletonMixin`): there is exactly one lounge Warren,
 * resolved/created lazily by `StuffApi.singleton(LoungeWarren.WARREN_PATH)`.
 * Multi-lounge is deferred; the abstract base stays multi-instance-capable
 * for future consumers (dungeon/desert).
 *
 * The strategy is intentionally the *simplest tunable* one — seat arrivals
 * least-full, reap rooms that fall below the merge watermark, bud when all
 * eligible rooms are at the bud threshold; never rebalance a live crowd.
 * The elastic lounge is an unproven UX bet, so the personality lives in a
 * few knobs (`getBudThreshold` / `getMergeWatermark` / `getReapGraceMs`),
 * built to fail safe (flatten-to-one-room is `N` high + `M` 0) and tune
 * cheap (headed for `GameConfig`). See
 * [docs/requirements/multilocation-lounge-requirements.md].
 */

import { Warren, type Attachment } from './Warren';
import { SingletonMixin } from '../stuff/Singleton';
import type { Stuff } from '../stuff/Stuff';
import type { Container } from '../spatial/Container';
import type { Containable } from '../spatial/Containable';
import type { Exitable } from '../boundary/Exitable';
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
  /** Placeholder campus exit destination (Duncan Hall lobby). */
  static readonly CAMPUS_PATH = '/domain/eternal/duncan-hall/lobby';

  /** Direction host→Dave's (cardinal; auto-inverse 'south'). */
  static readonly BAR_DIRECTION = 'north';
  static readonly BAR_OPPOSITE = 'south';
  /** Labeled cross-zone exit host→campus and its inverse campus→host. */
  static readonly CAMPUS_DIRECTION = 'out';
  static readonly CAMPUS_OPPOSITE = 'lounge';

  // Generous v1 defaults (steady state keeps rooms in [M, N]). Tests
  // override small via `setThresholds`. Headed to GameConfig.
  static readonly DEFAULT_BUD_THRESHOLD = 10;
  static readonly DEFAULT_MERGE_WATERMARK = 3;
  static readonly DEFAULT_REAP_GRACE_MS = 60_000;

  // Star-hub direction pool for satellites. Deliberately excludes the
  // host-fixture directions (`north` → Dave's, `out` → campus) so a
  // satellite's hub exit never collides with a fixture on the host's
  // exit map. With small live counts this is ample; a crowded star
  // would exhaust it — acceptable for v1 (the strategy is swappable).
  // TS `private` per the proxy-receiver rule.
  private static readonly STAR_DIRECTIONS = [
    'east',
    'south',
    'west',
    'northeast',
    'southeast',
    'southwest',
    'northwest',
    'up',
    'down',
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
   * `warren` instruction field). `cloneInstance` re-keys each clone under
   * a unique per-instance path so the hub/fixture `Exit`s that point at a
   * specific room resolve unambiguously despite every instance sharing
   * the template.
   */
  protected async createMember(): Promise<MemberStuff> {
    return StuffApi.cloneInstance<MemberStuff>(LoungeWarren.LOUNGE_TEMPLATE);
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

  /** Star topology: reserve the next free cardinal off the host. */
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
   * Wire the host-only fixtures: a north exit to Dave's Bar and a
   * placeholder labeled exit out to the campus entry, so the lounge is
   * never a dead end. Satellites reach both by walking to the host.
   */
  protected async wireHostFixtures(host: MemberStuff): Promise<void> {
    const bar = await StuffApi.singleton<ExitableContainer>(LoungeWarren.BAR_PATH);
    await (host as ExitableContainer).addBidirectionalExit(
      bar,
      LoungeWarren.BAR_DIRECTION,
      { opposite: LoungeWarren.BAR_OPPOSITE },
    );
    const campus = await StuffApi.singleton<ExitableContainer>(
      LoungeWarren.CAMPUS_PATH,
    );
    await (host as ExitableContainer).addBidirectionalExit(
      campus,
      LoungeWarren.CAMPUS_DIRECTION,
      { opposite: LoungeWarren.CAMPUS_OPPOSITE },
    );
  }

  /**
   * Remove the host-only fixtures' neighbor-side halves (Dave's `south`,
   * campus `lounge`) left dangling when the old host was destroyed, so
   * `wireHostFixtures` can re-install them onto the new host cleanly.
   * Idempotent — no-op when the neighbor isn't loaded or the exit is gone.
   */
  protected async unwireHostFixtures(): Promise<void> {
    this.removeNeighborExit(LoungeWarren.BAR_PATH, LoungeWarren.BAR_OPPOSITE);
    this.removeNeighborExit(
      LoungeWarren.CAMPUS_PATH,
      LoungeWarren.CAMPUS_OPPOSITE,
    );
  }

  private removeNeighborExit(neighborPath: string, direction: string): void {
    const neighbor = StuffApi.findByTemplatePath<ExitableContainer>(neighborPath);
    if (!neighbor) return;
    const exit = neighbor.getExit(direction);
    if (!exit) return;
    neighbor.removeExit(direction);
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
