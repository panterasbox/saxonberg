/**
 * Well — **a shaft sunk to standing water, with a trough at its collar.**
 * The village well at Rejection; the deep one somebody sank on the fringe
 * and gave up on.
 *
 * ⭐⭐ It answers {@link LiftSource}, and adds nothing it did not already
 * know: the water stands `depthM` below the collar, the body below is
 * taken as inexhaustible (the finite aquifer is a named non-goal), and
 * whatever comes up lands in the `interior` slot — the trough — which
 * starts EMPTY. So `fill bucket from well` before anybody has pumped says,
 * honestly, that there is nothing in it.
 *
 * ⭐ A well is a pump SOURCE: a `Container` that holds its pump as content
 * and refuses anything else (*"Only a pump goes in a well."*). A row is
 * born with one (`props: [/stuff/thing/gear/hand-pump]`); a player swaps
 * one with `get` and `put`. The veto narrows CONTENTS, never which classes
 * may be wells.
 *
 * `Thing`, not `Good` — the `WaterFixture` reasoning: it is a hole in the
 * ground with masonry round it, and nobody's chattel. ⚠ No `Thermal`:
 * nothing reads the trough's temperature in this build, and composing a
 * gauge nobody consults is surface with no consumer.
 *
 * ⚠ A bucket carried up on a rope would need no pump and no pressure, at
 * any depth — that is the bucket family's, and a well with a windlass is a
 * later row, not a change here.
 *
 * See [docs/subsystems/pump.md].
 */

import Thing from '../../lib/stuff/Thing';
import { BulkableMixin } from '../../lib/bulk/Bulkable';
import { ContainerMixin } from '../../lib/spatial/Container';
import { StagedMixin } from '../../lib/stuff/Staged';
import { MixinApi } from '../../api/mixin';
import { StuffApi } from '../../api/stuff';
import { Quantity } from '../../lib/quantity';
import type { FieldMeta } from '../../lib/mixin';
import type { Stuff } from '../../lib/stuff/Stuff';
import type { Container } from '../../lib/spatial/Container';
import type { Containable } from '../../lib/spatial/Containable';
import type { VetoResult } from '../../lib/errors';
import type Material from '../../lib/material/Material';
import { LiftSourceMixin, type LiftSource } from '../../lib/pump/LiftSource';
import { PumpSourceMixin, type PumpSource } from '../../lib/pump/PumpSource';
import type { CommandContributions } from '../../api/command';
import type { GroundWater } from '../../lib/supply/SupplyState';
import { WorldClockApi } from '../../api/worldclock';
import { ZoneApi } from '../../api/zone';
import { BulkableApi } from '../../api/bulk';
import { GrammarApi } from '../../api/grammar';
import Rope from './Rope';
import type { BulkAffordance } from '../../lib/bulk/Bulkable';
import { MaterialApi } from '../../api/material';

/** What stands at the bottom of a well when the row does not say. */
const WATER_PATH = '/stuff/idea/material/bulk/water';

const WellBase = LiftSourceMixin(
  PumpSourceMixin(StagedMixin(ContainerMixin(BulkableMixin(Thing)))),
);

export default class Well extends WellBase implements LiftSource, PumpSource {
  /** Metres from the collar down to the standing water. */
  protected depthM = 0;

  /** The Material standing at the bottom of the shaft. */
  protected standing = WATER_PATH;

  /**
   * ⭐ The aquifer this well draws on (water-supply D13) — a commons row's
   * path. `''` = a LONE well: its own body of water, finite, recovering.
   */
  protected aquifer = '';

  /**
   * The collar's elevation, m ASL — `-1` = its room's zone elevation. A well
   * on a hillside stands above the yard its zone is measured at (R9).
   */
  protected collarM = -1;

  /** A lone well's body, m³ — `-1` = bottomless (the author's out). */
  protected bodyM3 = 40;
  /** How far below full a lone well's body stands, m³. */
  protected drawnM3 = 0;
  /** A lone well's recovery, m³ a game day — what seeps back in. */
  protected rechargeM3PerDay = 4;
  /** When the lone body was last reconciled, game s. */
  protected bodyStamp: number | null = null;

  /** The aquifer's surface as last read, m ASL, and the collar's elevation. */
  private _surfaceM: number | null = null;
  private _collarM: number | null = null;

  static fieldMeta: FieldMeta = {
    depthM: { persistent: true, authorable: true },
    standing: { persistent: true, authorable: true, ref: 'identity:constituent' },
    aquifer: { persistent: true, authorable: true, ref: 'identity:relation' },
    collarM: { persistent: true, authorable: true },
    bodyM3: { persistent: true, authorable: true },
    rechargeM3PerDay: { persistent: true, authorable: true },
    drawnM3: { persistent: true, runtimeState: true },
    bodyStamp: { persistent: true, runtimeState: true },
  };

  /** Sideways: anyone at the well can try its handle. */
  static commandContributions: CommandContributions = {
    peers: ['platform/cmd/device/pump.yaml'],
  };

  constructor() {
    super();
    // Masonry round a hole in the ground. Nobody walks off with it.
    this.fixedInPlace = true;
  }

  public getDepthM(): number {
    return this.depthM;
  }
  public setDepthM(value: number): void {
    this.depthM = Math.max(0, Number(value) || 0);
  }

  // ---------- the pump it holds ----------

  /** The pump set in this well, or `null`. */
  public pumpFitted(): Stuff | null {
    for (const c of this.getContents()) {
      if (MixinApi.isPumping(c)) return c;
    }
    return null;
  }

  /** ⭐ Only a pump goes in a well, and only one. */
  public canAddContainable(thing: Stuff & Containable): VetoResult {
    if (!MixinApi.isPumping(thing)) {
      return { ok: false, reason: 'Only a pump goes in a well.' };
    }
    if (this.pumpFitted() !== null) {
      return { ok: false, reason: 'There is a pump in it already.' };
    }
    return { ok: true };
  }

  // ---------- ⭐⭐ LiftSource ----------

  /**
   * ⭐ How far down the water stands, m (water-supply D13): down to the
   * aquifer's surface from the collar when the well cites one (as last
   * read), else the lone body's column falling as it is drawn — and the
   * well's own depth when it is dry. What the pump's suction is measured
   * against.
   */
  public standingDepthM(): number {
    if (this.aquifer !== '' && this._surfaceM !== null && this._collarM !== null) {
      return Math.max(0, Math.min(this.depthM, this._collarM - this._surfaceM));
    }
    // A lone well's water stands at its bottom, as it always has.
    return this.depthM;
  }

  public getAquifer(): string {
    return this.aquifer;
  }
  public setAquifer(value: string): void {
    this.aquifer = typeof value === 'string' ? value.trim() : '';
  }
  public setCollarM(value: number): void {
    this.collarM = Number.isFinite(value) ? value : -1;
  }
  public setBodyM3(value: number): void {
    this.bodyM3 = Number.isFinite(value) ? value : 40;
  }
  public setRechargeM3PerDay(value: number): void {
    this.rechargeM3PerDay = Number.isFinite(value) && value >= 0 ? value : 4;
  }

  /** Bring a lone body up to `nowS`: what seeps back in since the last read. */
  private reconcileBody(nowS: number): void {
    if (this.bodyStamp === null) {
      this.bodyStamp = nowS;
      return;
    }
    const days = Math.max(0, nowS - this.bodyStamp) / 86_400;
    this.bodyStamp = nowS;
    this.drawnM3 = Math.max(0, this.drawnM3 - this.rechargeM3PerDay * days);
  }

  /** The aquifer, loaded on use (the well follows ITS reference outward). */
  private async groundWater(): Promise<(Stuff & GroundWater) | null> {
    if (this.aquifer === '') return null;
    const a = await StuffApi.singleton<Stuff & GroundWater>(this.aquifer).catch(() => null);
    if (a === null) return null;
    await a.ensureLocality();
    const nowS = WorldClockApi.getNow().rawValue();
    this._surfaceM = a.surfaceM(nowS);
    if (this._collarM === null && this.collarM >= 0) this._collarM = this.collarM;
    if (this._collarM === null) {
      const room = this.getContainer();
      this._collarM = room === null ? null : await ZoneApi.elevationFor(room as Stuff).catch(() => null);
    }
    return a;
  }

  public async standingMaterial(): Promise<string | null> {
    return this.standing || null;
  }

  /** ⭐ A body, not a tank: the finite aquifer is a named non-goal. */
  /**
   * ⭐ What is left to draw, litres (water-supply D13): an aquifer's water
   * above THIS well's bottom — a deep well outlasts a shallow one on the
   * same water — or a lone body's.
   */
  public async standingAvailableL(): Promise<number> {
    const a = await this.groundWater();
    if (a !== null) {
      const collar = this._collarM ?? 0;
      const bottom = collar - this.depthM;
      return (this._surfaceM ?? -Infinity) > bottom ? Infinity : 0;
    }
    if (this.aquifer !== '') return 0;
    if (this.bodyM3 < 0) return Infinity;
    this.reconcileBody(WorldClockApi.getNow().rawValue());
    return Math.max(0, this.bodyM3 - this.drawnM3) * 1000;
  }

  /** Record a draw on the water this well stands in (D13). */
  public async recordDraw(litres: number): Promise<number> {
    if (!(litres > 0)) return 0;
    const nowS = WorldClockApi.getNow().rawValue();
    const a = await this.groundWater();
    if (a !== null) return a.recordDraw(litres, nowS);
    if (this.bodyM3 < 0) return litres;
    this.reconcileBody(nowS);
    const given = Math.min(litres, Math.max(0, this.bodyM3 - this.drawnM3) * 1000);
    this.drawnM3 += given / 1000;
    return given;
  }

  public receivableL(): number {
    const slot = this.getBulk('interior');
    const held = slot.getMaterialPath();
    if (held !== null && held !== this.standing) return 0;
    return slot.remaining();
  }

  /**
   * Raise up to `litres` into the trough. ⭐ It consults no pressure:
   * whether the fluid CAN be pulled this far is the pump's question, asked
   * before this is ever called — a bucket asks it never.
   */
  public async liftInto(litres: number): Promise<number> {
    const room = this.receivableL();
    const asked = Math.min(Math.max(0, litres), room, await this.standingAvailableL());
    // ⭐ What is lifted is taken from the ground's water (D13).
    const moved = await this.recordDraw(asked);
    if (!(moved > 0)) return 0;
    const material = MaterialApi.materials().peek(this.standing);
    if (!material) return 0;
    const slot = this.getBulk('interior');
    if (slot.getMaterialPath() === null) slot.setMaterial(material);
    slot.setAmount(Quantity.of(slot.getAmount().rawValue() + moved, 'L'));
    return moved;
  }

  // ---------- ⭐ the bucket on a rope ----------

  /** Why the last haul gave nothing, for `fill` to say — cleared by the next. */
  private _haulRefusal: string | null = null;

  /**
   * ⭐ A bucket on a rope (water-supply, the browser walk): `fill pail from
   * well` at a well with no pump hauls the water up — a rope tied to the
   * vessel, or one the drawer carries, at least as long as the water stands
   * deep. A bucket asks no suction question (pump.md: category A, any
   * depth); the haul lifts what the vessel will hold into the trough, and
   * `fill` pours it on. A well with a pump in it is pumped instead.
   */
  public override async beforeDrawInto(affordance: BulkAffordance, vessel: Stuff, by: Stuff): Promise<void> {
    await super.beforeDrawInto(affordance, vessel, by);
    this._haulRefusal = null;
    if (affordance !== 'interior' || this.pumpFitted() !== null) return;
    if (!this.getBulk('interior').isEmpty()) return;
    const available = await this.standingAvailableL();
    const depthM = this.standingDepthM();
    if (!(available > 0)) {
      this._haulRefusal = 'You let the bucket down and it comes up dry: there is no water standing in the well.';
      return;
    }
    const rope = this.ropeFor(vessel, by);
    if (rope === null) {
      this._haulRefusal = `The water stands ${depthM.toFixed(0)} m down. A bucket wants a rope to reach it.`;
      return;
    }
    if (rope.getLengthM() < depthM) {
      this._haulRefusal =
        `${GrammarApi.cap(rope.getPresentation())} is ${rope.getLengthM().toFixed(0)} m long; ` +
        `the water stands ${depthM.toFixed(0)} m down.`;
      return;
    }
    const want = BulkableApi.slotFor(vessel, undefined)?.remaining() ?? 0;
    if (want > 0) await this.liftInto(Number.isFinite(want) ? want : 10);
  }

  public override bulkWhyEmpty(affordance: BulkAffordance): string | null {
    return affordance === 'interior' && this._haulRefusal !== null
      ? this._haulRefusal
      : super.bulkWhyEmpty(affordance);
  }

  /** The rope a haul uses: one tied round the vessel, else one the drawer holds. */
  private ropeFor(vessel: Stuff, by: Stuff): Rope | null {
    const held = MixinApi.isContainer(by) ? (by.getContents() as Stuff[]) : [];
    const here = this.getContainer();
    const around = here !== null && MixinApi.isContainer(here) ? (here.getContents() as Stuff[]) : [];
    const ropes = [...held, ...around].filter((c): c is Rope => c instanceof Rope && !c.isDestroyed());
    return ropes.find((r) => r.getAnchor() === vessel) ?? ropes.find((r) => held.includes(r)) ?? null;
  }

  public liftScope(): (Stuff & Container) | null {
    const here = this.getContainer();
    return here && MixinApi.isContainer(here) ? here : null;
  }
}
