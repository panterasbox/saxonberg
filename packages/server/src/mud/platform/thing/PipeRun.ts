/**
 * PipeRun — ⭐⭐ **the pipe that brings water into a room** (water-supply
 * D10, D29). A room has water iff a SOUND run stands in it and its premises
 * resolves a supply: no run, or a run that is unlaid, burst or leaking, and
 * the taps in that room read `unplumbed`. The run is a durable thing with an
 * inside face, a temperature and the water standing in it — so it freezes
 * and bursts in a cold night, leaks when it thaws, is mended by `repair`,
 * and a lead one leaches into soft acid water by the shipped face law.
 *
 * ⭐ **It is an ADORNMENT of the room** — part of the room's structure, the
 * way a sconce is: absent from the room's loose listing (plumbing is behind
 * the walls and under the boards), nameable (`look run`, `repair run`, `fit
 * lead pipe to run`), rebuilt from the room's row, its runtime state riding
 * a live room's record. A scullery whose run is bare on the wall says so in
 * its own prose. This is not concealment (`search` reveals nothing): a pipe
 * under the floor is enclosed, not hiding.
 *
 * ⭐ **A run is built, not conjured.** A plumber's run is an ASSEMBLY (D10):
 * its row's bill names pipe lengths and the joints that hold them (`wiped`
 * for lead, `caulked` for iron, dressed by plumbing), and an UNLAID run —
 * the one an unplumbed kitchen offers — records its lengths empty so `fit
 * lead pipe to run` lays them one at a time. An incomplete run delivers
 * nothing. A run with no bill is ONE PIECE (assembly's monolith rule): the
 * pre-plumbed rooms of a city that was built with water in it.
 *
 * ⭐ **The service run** (`kind: service`) is the lot's connection to the
 * main in the street: completing it CITES that main for the premises
 * (`ParcelApi.citeWaterSource`) — and refuses its last length where the
 * main it names does not serve the premises.
 */

import Good from '../../lib/stuff/Good';
import { BulkableMixin } from '../../lib/bulk/Bulkable';
import { ThermalMixin } from '../../lib/thermal/Thermal';
import { DurableMixin } from '../../lib/material/Durable';
import { AssembledMixin, type PartLine } from '../../lib/craft/Assembled';
import { AdornmentMixin } from '../../lib/boundary/Adornment';
import type { FieldMeta } from '../../lib/mixin';
import type { Stuff } from '../../lib/stuff/Stuff';
import type { CommandContributions } from '../../api/command';
import type { MarkupAugmenter } from '../../api/mml';
import { MixinApi } from '../../api/mixin';
import { StuffApi } from '../../api/stuff';
import { ParcelApi } from '../../api/parcel';
import { BulkableApi } from '../../api/bulk';
import { WorldClockApi } from '../../api/worldclock';
import { AppApi } from '../../api/app';
import { AppSettingKeys } from '../../lib/config/AppSettings';
import type { WaterSupply } from '../../lib/supply/SupplyState';
import type { VetoResult } from '../../lib/errors';
import type Material from '../../lib/material/Material';
import type { BulkAffordance, BulkPayload } from '../../lib/bulk/Bulkable';
import { Quantity } from '../../lib/quantity';
import { MessageApi } from '../../api/message';
import { Mml } from '../../api/mml';

/** The fresh water a burst spills. */
const WATER_PATH = '/stuff/idea/material/bulk/water';

/** A run is sound at or above this condition; below, burst. */
const SOUND_CONDITION = 0.5;
/** What a lead run's bulge leaves it at — mendable. */
const LEAD_BURST_CONDITION = 0.4;
/** Litres a metre of house pipe holds (half-inch bore, near enough). */
const LITRES_PER_M = 0.2;

export type PipeRunKind = 'room' | 'service';

/** Numeric dial with a call-site fallback. */
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

/** ⭐ `look run` says what state it is in — laid, sound, weeping, burst. */
function stateAugmenter(text: string, host: Stuff): string {
  if (!(host instanceof PipeRun)) return text;
  // Read the frost first: a look is a read like a draw (the browser walk —
  // a thawed scullery's run still read "burst", and its water never came).
  host.reconcileFrost(WorldClockApi.getNow().rawValue());
  return `${text}\n\nIt is ${host.stateWords()}.`;
}

const PipeRunBase = AdornmentMixin(
  AssembledMixin(DurableMixin(ThermalMixin(BulkableMixin(Good)))),
);

export default class PipeRun extends PipeRunBase {
  static markupAugmenters: MarkupAugmenter[] = [stateAugmenter];

  static fieldMeta: FieldMeta = {
    runKind: { persistent: true, authorable: true },
    unlaid: { persistent: true, authorable: true },
    lengthM: { persistent: true, authorable: true },
    connectsTo: { persistent: true, authorable: true, ref: 'identity:relation' },
    frostStamp: { persistent: true, runtimeState: true },
    burstAt: { persistent: true, runtimeState: true },
    leaked: { persistent: true, runtimeState: true },
    laying: { persistent: true, runtimeState: true },
  };

  /** `room` — the pipe into this room; `service` — the lot's connection to the main. */
  protected runKind: PipeRunKind = 'room';
  /** Authored: this run starts with its lengths EMPTY, for a plumber to lay. */
  protected unlaid = false;
  /** How long the run is, m — the water it holds. */
  protected lengthM = 6;
  /** A service run's main: the supply in the street it connects to. */
  protected connectsTo = '';
  /** When frost was last reconciled, game s. `null` = never. */
  protected frostStamp: number | null = null;
  /** When it burst, game s, or `null`. */
  protected burstAt: number | null = null;
  /** Whether its burst has already run out onto the floor. */
  protected leaked = false;
  /**
   * Being laid: materialized unlaid and not yet complete. Its missing
   * lengths are SEATS, not breakage — the look says it wants them.
   */
  protected laying = false;

  constructor() {
    super();
    this.fixedInPlace = true;
    // The water standing in it is its interior — what freezes, and what a
    // lead face leaches into.
    this.interiorBulk = true;
  }

  public getRunKind(): PipeRunKind {
    return this.runKind;
  }
  public setRunKind(value: PipeRunKind): void {
    this.runKind = value === 'service' ? 'service' : 'room';
  }
  public setUnlaid(value: boolean): void {
    this.unlaid = value === true;
  }
  public setLengthM(value: number): void {
    this.lengthM = Number.isFinite(value) && value > 0 ? value : 6;
  }
  public getConnectsTo(): string {
    return this.connectsTo;
  }
  public setConnectsTo(value: string): void {
    this.connectsTo = typeof value === 'string' ? value.trim() : '';
  }

  /**
   * ⭐ An unlaid run materializes its lengths EMPTY (the slip-joint jug's
   * shape): every structural line `failed` in full, so `fit lead pipe to run`
   * fills them one at a time.
   */
  public override ensureParts(): void {
    const first = this.parts.length === 0;
    super.ensureParts();
    if (first && this.unlaid) {
      for (const line of this.parts) {
        if (line.role === 'structural') {
          line.failed = line.count;
          // ⭐ An empty seat, not a split length: the browser walk read an
          // unlaid run as "broken… four of the lengths are split".
          line.empty = true;
        }
      }
      this.unlaid = false;
      this.laying = true;
    }
  }

  /** ⭐ An unlaid run is read as laid-empty from its very first read. */
  public override getParts(): PartLine[] {
    if (this.unlaid) this.ensureParts();
    return super.getParts();
  }

  /** Every length laid, every joint tight? */
  public isComplete(): boolean {
    this.ensureParts();
    return !this.leaks();
  }

  /** ⭐ Does this run carry water? Complete, and not burst. */
  public isSound(): boolean {
    return this.isComplete() && this.getCondition() >= SOUND_CONDITION;
  }

  /** The room this run is part of. */
  private roomOf(): Stuff | null {
    const host = this.getAdornedTo();
    if (host !== null) return host;
    const self = this as unknown as Stuff;
    return MixinApi.isContainable(self) ? (self.getContainer() as Stuff | null) : null;
  }

  // ---------- frost, burst and the leak ----------

  /**
   * ⭐⭐ Bring the run's frost up to `nowS`, off its ROOM's temperature
   * trajectory (the room is the publisher; integrated, never sampled at the
   * read). A sound run holding water whose room went below the freezing
   * point since the last read **bursts**: lead bulges (mendable), iron —
   * brittle — cracks. A burst run whose room has thawed **leaks** its
   * standing water onto the floor, once.
   */
  public reconcileFrost(nowS: number): void {
    const room = this.roomOf();
    if (room === null || !MixinApi.isAtmospheric(room)) return;
    if (this.frostStamp === null) {
      this.frostStamp = nowS;
      return;
    }
    const from = this.frostStamp;
    if (!(nowS > from)) return;
    this.frostStamp = nowS;
    const freezeK = dial(AppSettingKeys.waterFreezeK, 273.15) - 0.5;
    const curve = room.temperatureTrajectory(from, nowS);
    if (this.burstAt === null && this.isSound()) {
      const coldest = Math.min(...curve.samples(4).map((s) => s.value));
      if (coldest <= freezeK) {
        const brittle = this.getMaterial()?.hasTag('brittle') === true;
        this.setCondition(brittle ? 0 : LEAD_BURST_CONDITION);
        this.burstAt = nowS;
        this.leaked = false;
      }
    }
    if (this.burstAt !== null && !this.leaked && curve.at(nowS) > freezeK) {
      this.leakOntoFloor(room);
    }
    // A run mended back to sound is no longer burst.
    if (this.burstAt !== null && this.getCondition() >= SOUND_CONDITION) {
      this.burstAt = null;
      this.leaked = false;
    }
  }

  /** The thaw: the water standing in it runs out across the floor. */
  private leakOntoFloor(room: Stuff): void {
    this.leaked = true;
    const floor = MixinApi.isAdornable(room) ? room.getFloor() : null;
    // ⭐ What lies on the floor lies in the water, soaked through — and a
    // thing whose material is weak wet gives way (paper: a letter on a
    // flooded kitchen floor goes to pulp; `Integrity` decides, not this).
    // The water runs out whether or not the floor keeps a record of it.
    // Somebody standing in it steps out of it: agents are not soaked here.
    if (MixinApi.isContainer(room)) {
      for (const thing of room.getLooseContents()) {
        if (thing === (this as unknown as Stuff) || thing === floor) continue;
        if (thing.isAgent() || !MixinApi.isWet(thing)) continue;
        thing.wet(1);
      }
    }
    if (floor === null) return;
    const slot = BulkableApi.slotFor(floor, undefined);
    const water = StuffApi.findByTemplatePath<Material>(WATER_PATH) ?? null;
    if (slot === null || water === null) return;
    // ⭐ The burst's water — what stood in the run and what the main pushed
    // through the split before anybody noticed — lies on the floor until it
    // dries. What the surface cannot hold soaks away.
    const litres = Math.max(1, this.lengthM * LITRES_PER_M) * 20;
    if (slot.isEmpty()) slot.setMaterial(water);
    slot.setAmount(Quantity.of(slot.getAmount().rawValue() + litres, 'L'));
  }

  /**
   * ⭐ The water standing in the run, settled to the supply's chemistry —
   * and whatever its own face has leached into it since the last draw (the
   * shipped face law: a lead pipe in soft acid water). Returns the payload
   * a draw carries first, or `null` when nothing stands in it.
   */
  public standingWater(
    chemistry: { pH: number; hardnessDgh: number; salinityPpt: number } | null,
  ): BulkPayload | null {
    const water = StuffApi.findByTemplatePath<Material>(WATER_PATH) ?? null;
    if (water === null) return null;
    if (this.isBulkEmpty('interior')) {
      this.setBulkMaterial('interior', water);
      this.setBulkAmount('interior', Quantity.of(this.lengthM * LITRES_PER_M, 'L'));
    }
    if (chemistry !== null) {
      const p = this.getBulkPayload('interior') ?? {};
      if (p.pH !== chemistry.pH || p.hardnessDgh !== chemistry.hardnessDgh) {
        this.setBulkPayload('interior', { ...p, ...chemistry });
      }
    }
    return this.getBulkPayload('interior');
  }

  /** A draw ran the standing water out: what stands now is fresh. */
  public flush(): void {
    const p = this.getBulkPayload('interior');
    if (p === null) return;
    const { dissolvedToxins: _gone, faceCheckedS: _t, ...rest } = p;
    this.setBulkPayload('interior', rest);
  }

  /** Has it burst (and not been mended)? */
  public isBurst(): boolean {
    return this.burstAt !== null && this.getCondition() < SOUND_CONDITION;
  }

  /** What `survey` and `look` say of it, in words. */
  public stateWords(): string {
    if (!this.isComplete()) return 'not yet laid — lengths missing';
    if (this.isBurst()) return this.leaked ? 'burst, and has run out across the floor' : 'burst';
    return this.getCondition() < 0.8 ? 'sound, but weeping at a joint' : 'sound';
  }

  // ---------- the service run cites the main ----------

  /**
   * ⭐ A service run's completion connects the premises to the main it
   * names (D10): the citation is written on the premises' parcel. Returns
   * the refusal when the main does not serve this premises.
   */
  public async connectPremises(): Promise<VetoResult> {
    if (this.runKind !== 'service' || !this.isComplete()) return { ok: true };
    const serves = await this.mainServesPremises();
    if (!serves.ok) return serves;
    const premises = this.premisesPath()!;
    const parcel = ParcelApi.coveringParcelOfSync(premises);
    if (parcel === null) return { ok: false, reason: 'This ground is nobody’s to connect.' };
    await ParcelApi.citeWaterSource(parcel.getExtent(), this.connectsTo);
    return { ok: true };
  }

  /**
   * ⭐ A service run refuses its LAST length where the main it names does
   * not serve this premises (D10): *"No main runs past here."*
   */
  public override async canTakeMembers(part: string, count: number, by: Stuff): Promise<VetoResult> {
    const base = await super.canTakeMembers(part, count, by);
    if (!base.ok || this.runKind !== 'service') return base;
    const missing = this.getParts()
      .filter((l) => l.role === 'structural')
      .reduce((n, l) => n + l.failed, 0);
    if (missing - count > 0) return { ok: true };
    return this.mainServesPremises();
  }

  /** The last length laid on a service run connects the premises. */
  public override async afterMembersFitted(by: Stuff): Promise<void> {
    await super.afterMembersFitted(by);
    if (this.laying) {
      if (this.isComplete()) {
        this.laying = false;
      } else {
        // The substrate clears a line's `empty` at its first member; the
        // lengths still to lay are seats all the same.
        for (const line of this.getParts()) {
          if (line.role === 'structural' && line.failed > 0) line.empty = true;
        }
      }
    }
    if (this.runKind === 'service' && this.isComplete()) {
      const connected = await this.connectPremises();
      // ⭐ Say what the last length did (the browser walk: the run went
      // quiet at the moment it put a house on the main).
      MessageApi.scene(by)
        .topic('act.deed')
        .toSelf(
          connected.ok
            ? Mml.compose`The last length is in: ${Mml.thing(this as unknown as Stuff)} carries the main's water to the house now.`
            : Mml.compose`${connected.reason ?? 'It does not connect.'}`,
        )
        .send();
    }
  }

  /** Does the main this service run names serve its premises? */
  private async mainServesPremises(): Promise<VetoResult> {
    const no: VetoResult = { ok: false, reason: 'No main runs past here.' };
    if (this.connectsTo === '') return no;
    const main = await StuffApi.singleton<Stuff & WaterSupply>(this.connectsTo).catch(() => null);
    const premises = this.premisesPath();
    if (main === null || premises === null || !main.serves(premises)) return no;
    return { ok: true };
  }

  /** This run's premises — its room's persistence key, else its row. */
  public premisesPath(): string | null {
    const room = this.roomOf();
    if (room === null) return null;
    if (MixinApi.isPersistable(room)) {
      const key = room.getPersistenceKey();
      if (key !== null && key.startsWith('/')) return key;
    }
    return room.getTemplatePath();
  }

  /** Read the frost before anybody looks or draws. */
  public override async settleBulk(affordance: BulkAffordance): Promise<void> {
    await super.settleBulk(affordance);
    this.reconcileFrost(WorldClockApi.getNow().rawValue());
  }

  /** Sideways: anybody in the room can `repair` the run (it is Durable). */
  static commandContributions: CommandContributions = {
    peers: ['platform/cmd/crafting/repair.yaml', 'platform/cmd/crafting/fit.yaml'],
  };
}
