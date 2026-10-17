/**
 * StoreMixin — ⭐⭐ **a holder whose contents are a ledger** (storage-and-ice
 * D1–D7). An icehouse does not hold ten thousand blocks of ice; it holds
 * twenty tonnes of black ice and two tonnes of dry sawdust, and the world
 * models exactly that: one {@link StoreLine} per pool key, as an amount.
 *
 * ## The face (D3)
 *
 * A count cannot be bound by `get` or `put`, so for every line with stock
 * the store keeps ONE real exemplar in its own contents — the top of the
 * stack, a clone of the line's good at one unit's mass carrying the line's
 * state. The line's `amountKg` INCLUDES the face.
 *
 *  - `put <good> in <stack>` moves the good in; the store **absorbs** it into
 *    its line (or it becomes the face of a new line) once the move settles.
 *  - `get <good>` takes the face out: the line falls by the face's mass, no
 *    receipt changes (off the books), and the store re-faces.
 *  - A face that is DESTRUCTED (an ice face that melted between reads) is
 *    not debited again — the line's own physics already took it.
 *  - Every {@link reconcile} re-stamps each face from its line: the face is
 *    a VIEW of the line.
 *
 * ## The lazy reconcile (D4)
 *
 * Every read brings the lines current from `lastReconciledS` to now, under
 * the outside air of each weather segment in the gap (the walk the ice on a
 * still reach uses), at the temperature the ROOM would have settled at for
 * that outside (`envelopeSteadyStateK`, which already includes this store's
 * own pull on the air). Each stock line asks its good what the step did to
 * it (`reconcileInStore`); the meltwater soaks the packing, and a soaked
 * packing conducts like the water it holds — the spiral a keeper repacks to
 * stop.
 *
 * ## The heat sink (D5)
 *
 * The store is a {@link RoomHeatExchanging} occupant: a conductance from the
 * room's air, through its packing, to the anchor of every line at its
 * plateau (melting ice: 273.15 K). That is why an icehouse is colder than
 * the same shed empty, with no special case anywhere.
 *
 * Capacity is mass, at the container's own veto (D7). Custody (receipts,
 * the keeper, deposit/withdraw) is W3's and rides the same lines.
 */

import type { MixinConstructor, FieldMeta } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import type { Containable } from '../spatial/Containable';
import type { Container } from '../spatial/Container';
import type { VetoResult } from '../errors';
import type { Atmospheric } from '../biome/Atmospheric';
import type { RoomHeatExchange } from '../thermal/RoomHeatExchange';
import type { Poolable, StoreConditions } from './Poolable';
import type { StoreLine, StoreSeedLine } from './StoreLine';
import { MixinApi } from '../../api/mixin';
import { StuffApi } from '../../api/stuff';
import { ContainmentApi } from '../../api/containment';
import { PersistableApi } from '../../api/persistable';
import { WorldClockApi } from '../../api/worldclock';
import { WeatherApi } from '../../api/weather';
import { BiomeApi } from '../../api/biome';
import { AppApi } from '../../api/app';
import { AppSettingKeys } from '../config/AppSettings';
import { Quantity } from '../quantity';
import { ExecutionContextApi } from '../../api/execution-context';

/** A face is any pooled good the store holds as a line's exemplar. */
type PoolableStuff = Stuff & Containable & Poolable;

/** One outside-air stretch of a gap. */
interface OutsideStretch {
  fromS: number;
  toS: number;
  outsideK: number;
}

/** An arrival waiting to be settled into the ledger. */
interface Arrival {
  item: PoolableStuff;
  key: string;
  massKg: number;
  /** One unit's dry mass, read at arrival (a merged arrival is gone by settle). */
  unitMassKg: number;
  /** Who held it as it was offered, when that was an actor. */
  putter: Stuff | null;
}

/** The smallest line worth keeping, kg. */
const LINE_EPSILON_KG = 1e-6;
/** A reconcile closer than this to the last one does no physics, s. */
const MIN_STEP_S = 600;
/** The window of the withdrawal moving average, days. */
const DRAW_WINDOW_DAYS = 30;
/** Water's conductivity, W/(m·K) — what a soaked packing conducts like. */
const K_WATER = 0.6;

export interface Store {
  /** The ledger, as copies. */
  getLines(): StoreLine[];
  /** One line by pool key, or `null`. */
  getLine(poolKey: string): StoreLine | null;
  /** Kilograms on every line (stock and packing). */
  totalKg(): number;
  /** Kilograms of STOCK (not packing) of a good row, every key it holds. */
  stockKgOf(goodPath: string): number;
  /** The authored capacity, kg (0 = unbounded). */
  getCapacityKg(): number;
  /** The face (the top of the stack) for a line, or `null`. */
  faceFor(poolKey: string): Stuff | null;
  /** Bring every line current to now. */
  reconcile(): Promise<void>;
  /** Wait for in-flight arrivals and re-facing to settle. */
  whenSettled(): Promise<void>;
  /** Lay the authored `seedLines` down — once, on a store with no lines. */
  seedFromRow(): Promise<boolean>;
  /** The heat this store pulls from its room (the {@link RoomHeatExchange} protocol). */
  roomHeatExchange(): RoomHeatExchange;
  /** Days the stock of `goodPath` lasts at its current loss + draw. */
  daysOfSupply(goodPath: string): number;
}

export function StoreMixin<TBase extends MixinConstructor<Stuff>>(Base: TBase) {
  return class StoreMixin extends Base implements Store {
    static _mixinName: string = 'StoreMixin';

    static fieldMeta: FieldMeta = {
      // ⭐ The ledger is the world's exact stock — a spoiler a `measure
      // stock` reading only brackets (the review log).
      lines: { persistent: true, runtimeState: true, spoiler: 1 },
      capacityKg: { persistent: true, authorable: true },
      stackShapeFactor: { persistent: true, authorable: true },
      drainage: { persistent: true, authorable: true },
      acceptsPoolKeys: { persistent: true, authorable: true },
      // ⚠ Authored, NOT persistent: what a store is seeded with is
      // content; once the ledger exists it is play (the
      // `MarketStalls.pitches` rule).
      seedLines: { authorable: true },
    };

    /** The ledger. */
    public lines: StoreLine[] = [];
    /** How much the store holds, kg; 0 = unbounded. */
    public capacityKg = 0;
    /** Exposed faces of a stack on a floor (five: four sides and a top). */
    public stackShapeFactor = 5;
    /** The share of meltwater that runs off rather than soaking the packing, `[0, 1]`. */
    public drainage = 0.5;
    /** The pool keys this store takes, or `null` for any pooled good. */
    public acceptsPoolKeys: string[] | null = null;
    /** What the row seeds the ledger with on first creation. */
    public seedLines: StoreSeedLine[] = [];

    /** Transient: stuffId of each face → the line key it shows. */
    private _faces = new Map<string, string>();
    /** Transient: arrivals the next settle folds into the ledger. */
    private _arrivals: Arrival[] = [];
    /**
     * Transient: who held each arriving good as it was offered (read in
     * the veto, while it is still in their hands — `ContainmentApi.move`
     * carries no actor), consumed when the arrival settles.
     */
    private _pendingPutters = new Map<string, Stuff>();
    /** Transient: true while the store moves its OWN face in. */
    private _minting = false;
    /** Transient: the in-flight settle / re-face work. */
    private _settling: Promise<void> = Promise.resolve();

    // ─────────────────────────── reads ───────────────────────────

    public getLines(): StoreLine[] {
      return this.lines.map((l) => ({ ...l, state: { ...l.state } }));
    }

    public getLine(poolKey: string): StoreLine | null {
      const l = this.lines.find((x) => x.poolKey === poolKey);
      return l ? { ...l, state: { ...l.state } } : null;
    }

    public totalKg(): number {
      return this.lines.reduce((n, l) => n + l.amountKg, 0);
    }

    public stockKgOf(goodPath: string): number {
      return this.lines
        .filter((l) => l.role === 'stock' && l.goodPath === goodPath)
        .reduce((n, l) => n + l.amountKg, 0);
    }

    public getCapacityKg(): number {
      return this.capacityKg;
    }

    public faceFor(poolKey: string): Stuff | null {
      this.adoptFaces();
      for (const c of this.storeContents()) {
        if (this._faces.get(c.stuffId) === poolKey && !c.isDestroyed()) return c;
      }
      return null;
    }

    public whenSettled(): Promise<void> {
      return this._settling;
    }

    public daysOfSupply(goodPath: string): number {
      const lines = this.lines.filter((l) => l.role === 'stock' && l.goodPath === goodPath);
      const kg = lines.reduce((n, l) => n + l.amountKg, 0);
      const rate = lines.reduce((n, l) => n + l.lossKgPerDay + l.drawKgPerDay, 0);
      if (!(kg > 0)) return 0;
      return kg / Math.max(1e-6, rate);
    }

    // ───────────────────── the container's veto (D7) ─────────────────────

    /**
     * ⭐ Asked by `put` FIRST, in the store's own words, and asserted by
     * `ContainmentApi.move` — which is what stops a brain's forced put
     * overfilling the house.
     */
    public canAddContainable(item: Stuff & Containable): VetoResult {
      if (this._minting) return { ok: true };
      const holder = item.getContainer();
      if (holder !== null && holder !== (this as unknown as Stuff)) {
        this._pendingPutters.set(item.stuffId, holder);
      }
      if (!MixinApi.isPoolable(item)) {
        return { ok: false, reason: 'That does not go in a stack like this.' };
      }
      const key = item.poolKey();
      if (this.acceptsPoolKeys !== null && !this.acceptsPoolKeys.includes(key)) {
        return { ok: false, reason: 'This stack does not take that.' };
      }
      if (this.capacityKg > 0 && this.totalKg() + massKgOf(item) > this.capacityKg + 1e-9) {
        return { ok: false, reason: 'The house is full.' };
      }
      return { ok: true };
    }

    /** A good arrived: settle it into the ledger once the move completes. */
    public onContainableAdded(item: Stuff & Containable): void {
      if (this._minting) return;
      // ⚠ A restore puts the FACES back as contents; the ledger came back
      // with them and is the truth, so a restored face is adopted by key
      // (`adoptFaces`), never counted as a put.
      if (restoring()) return;
      if (!MixinApi.isPoolable(item)) return;
      const putter = this._pendingPutters.get(item.stuffId) ?? null;
      this._pendingPutters.delete(item.stuffId);
      this._arrivals.push({
        item: item as PoolableStuff,
        key: item.poolKey(),
        massKg: massKgOf(item),
        unitMassKg: unitMassKgOf(item),
        putter,
      });
      this.schedule(() => this.settleArrivals());
    }

    /**
     * A good left. ⭐ A face taken out (it has a new container) debits its
     * line and the store re-faces; a face that was destructed (its
     * container is gone) is NOT debited — the line's physics took it.
     */
    public onContainableRemoved(item: Stuff & Containable): void {
      const key = this._faces.get(item.stuffId);
      if (key === undefined) return;
      this._faces.delete(item.stuffId);
      const line = this.lines.find((l) => l.poolKey === key);
      if (line && item.getContainer() !== null) {
        line.amountKg = Math.max(0, line.amountKg - massKgOf(item));
      }
      this.schedule(async () => {
        this.dropEmptyLines();
        await this.reface(key);
        await this.captureSelf();
      });
    }

    // ───────────────────────── settling ─────────────────────────

    private schedule(work: () => Promise<void> | void): void {
      this._settling = this._settling.then(
        () => work(),
        () => work(),
      ).catch((err: unknown) => {
        console.warn('StoreMixin: settle failed', err);
      });
    }

    /**
     * Fold every pending arrival into the ledger. ⚠ Runs AFTER the move
     * completed (including the stack substrate's merge-on-arrival, which may
     * already have folded a sawdust heap into the face): an arrival that is
     * gone was merged into a face, and the face's extra units are folded in
     * by {@link normalizeFaces}; one still here is absorbed, or becomes the
     * face of a new line.
     */
    private async settleArrivals(): Promise<void> {
      const arrivals = this._arrivals.splice(0);
      if (arrivals.length === 0) return;
      this.adoptFaces();
      const now = nowS();
      for (const a of arrivals) {
        let line = this.lines.find((l) => l.poolKey === a.key);
        if (!line) {
          // A new line: the arrival is its face.
          line = {
            poolKey: a.key,
            goodPath: a.item.getTemplatePath() ?? '',
            amountKg: 0,
            unitMassKg: a.unitMassKg,
            state: a.item.isDestroyed() ? {} : a.item.poolState(),
            role: a.item.isDestroyed() ? 'stock' : a.item.poolRole(),
            lossKgPerDay: 0,
            drawKgPerDay: 0,
            lastReconciledS: now,
          };
          this.lines.push(line);
        } else {
          const before = line.amountKg;
          if (!a.item.isDestroyed()) {
            line.state = mergeState(a.item, line.state, before, a.item.poolState(), a.massKg);
          }
          const unitsBefore = line.unitMassKg > 0 ? before / line.unitMassKg : 0;
          const unitsIn = a.massKg / Math.max(1e-9, a.unitMassKg);
          if (unitsBefore + unitsIn > 0) {
            line.unitMassKg = (before + a.massKg) / (unitsBefore + unitsIn);
          }
        }
        line.amountKg += a.massKg;
        if (a.item.isDestroyed()) continue;
        if (this.faceFor(a.key) === null) {
          this._faces.set(a.item.stuffId, a.key);
          this.stampFace(a.item, line);
        } else if (this._faces.get(a.item.stuffId) === undefined) {
          await StuffApi.destruct(a.item);
        }
      }
      this.normalizeFaces();
      await this.captureSelf();
    }

    /**
     * ⚠ A stackable face that grew (the stack substrate merged an arriving
     * heap into it before the settle) is cut back to one unit; its extra
     * units were already counted at arrival, so nothing is credited here.
     */
    private normalizeFaces(): void {
      for (const c of this.storeContents()) {
        const key = this._faces.get(c.stuffId);
        if (key === undefined) continue;
        if (MixinApi.isStackable(c) && c.getQuantity() > 1) c.setQuantity(1);
      }
    }

    /** Recognise faces restored with the host (after a restart) by key. */
    private adoptFaces(): void {
      for (const c of this.storeContents()) {
        if (this._faces.has(c.stuffId)) continue;
        if (!MixinApi.isPoolable(c)) continue;
        const key = c.poolKey();
        const line = this.lines.find((l) => l.poolKey === key);
        if (!line) continue;
        const taken = [...this._faces.values()].includes(key);
        if (!taken) this._faces.set(c.stuffId, key);
      }
    }

    /**
     * Mint a face for `poolKey` when its line has stock and none stands.
     * ⚠ Keyed on the LINE's stored key, never on a face's own `poolKey()` —
     * a face's wetness band can drift between reads.
     */
    protected async reface(poolKey: string): Promise<void> {
      const line = this.lines.find((l) => l.poolKey === poolKey);
      if (!line || line.amountKg <= LINE_EPSILON_KG) return;
      if (this.faceFor(poolKey) !== null) return;
      const face = await this.mintUnit(line);
      if (face === null) return;
      this._faces.set(face.stuffId, poolKey);
      this._minting = true;
      try {
        ContainmentApi.move(face, this as unknown as Stuff & Container);
      } finally {
        this._minting = false;
      }
    }

    /**
     * One unit of a line, materialized: a clone of its good at one unit's
     * mass, carrying the line's state. Shared by the face, a withdrawal and
     * a counter's bring-up.
     */
    protected async mintUnit(line: StoreLine, units = 1): Promise<PoolableStuff | null> {
      if (!line.goodPath) return null;
      const made = await StuffApi.clone<Stuff>(line.goodPath);
      if (!MixinApi.isPoolable(made) || !MixinApi.isContainable(made)) {
        await StuffApi.destruct(made);
        return null;
      }
      const unit = made as PoolableStuff;
      unit.applyPoolKey(line.poolKey);
      this.stampFace(unit, line, units);
      return unit;
    }

    /** Stamp a line onto a unit: one unit's mass (or `units` of a stack) and its state. */
    private stampFace(unit: PoolableStuff, line: StoreLine, units = 1): void {
      if (MixinApi.isTangible(unit) && line.unitMassKg > 0) {
        unit.setMass(Quantity.of(line.unitMassKg, 'kg'));
      }
      if (MixinApi.isStackable(unit)) {
        unit.setQuantity(Math.max(1, Math.round(units)));
      }
      unit.applyPoolState(line.state);
    }

    private dropEmptyLines(): void {
      this.lines = this.lines.filter((l) => l.amountKg > LINE_EPSILON_KG);
    }

    private storeContents(): (Stuff & Containable)[] {
      const self = this as unknown as Stuff;
      return MixinApi.isContainer(self) ? self.getContents() : [];
    }

    protected async captureSelf(): Promise<void> {
      const self = this as unknown as Stuff;
      if (!MixinApi.isPersistable(self)) return;
      // A store nobody stamped (a bare test fixture) has no record to keep.
      if (self.getTemplatePath() === null) return;
      try {
        await PersistableApi.capture(self);
      } catch (err) {
        console.warn('StoreMixin: capture failed', err);
      }
    }

    // ─────────────────────────── seeding ───────────────────────────

    /**
     * Lay down the authored `seedLines` — once, on a store whose ledger is
     * empty (the no-record branch). Each seed mints ONE exemplar, which
     * becomes the line's face; the amount is the line's.
     */
    public async seedFromRow(): Promise<boolean> {
      if (this.lines.length > 0 || this.seedLines.length === 0) return false;
      const now = nowS();
      for (const seed of this.seedLines) {
        if (!seed.goodPath || !(seed.amountKg > 0)) continue;
        const made = await StuffApi.clone<Stuff>(seed.goodPath);
        if (!MixinApi.isPoolable(made) || !MixinApi.isContainable(made)) {
          await StuffApi.destruct(made);
          continue;
        }
        const unit = made as PoolableStuff;
        if (seed.grade) unit.applyPoolKey(`${unit.poolKey().split('|')[0]}|${seed.grade}`);
        if (seed.state) unit.applyPoolState(seed.state);
        const line: StoreLine = {
          poolKey: unit.poolKey(),
          goodPath: seed.goodPath,
          amountKg: seed.amountKg,
          unitMassKg: unitMassKgOf(unit),
          state: seed.state ? { ...unit.poolState(), ...seed.state } : unit.poolState(),
          role: unit.poolRole(),
          lossKgPerDay: 0,
          drawKgPerDay: 0,
          lastReconciledS: now,
        };
        const existing = this.lines.find((l) => l.poolKey === line.poolKey);
        if (existing) {
          existing.amountKg += line.amountKg;
          await StuffApi.destruct(unit);
          continue;
        }
        this.lines.push(line);
        this._faces.set(unit.stuffId, line.poolKey);
        this.stampFace(unit, line);
        this._minting = true;
        try {
          ContainmentApi.move(unit, this as unknown as Stuff & Container);
        } finally {
          this._minting = false;
        }
      }
      await this.captureSelf();
      return this.lines.length > 0;
    }

    // ─────────────────────── the reconcile (D4) ───────────────────────

    public async reconcile(): Promise<void> {
      await this.whenSettled();
      const now = nowS();
      if (now <= 0 || this.lines.length === 0) return;
      for (const l of this.lines) if (!(l.lastReconciledS > 0)) l.lastReconciledS = now;
      const since = Math.min(...this.lines.map((l) => l.lastReconciledS));
      if (now - since < MIN_STEP_S) {
        this.restampFaces();
        return;
      }
      const scope = this.airScope();
      const stretches = await this.outsideStretches(scope, since, now);
      const lostKg = new Map<string, number>();

      for (const st of stretches) {
        const ambientK =
          (scope && scope.envelopeSteadyStateK(st.outsideK, st.fromS)) ??
          (scope?.getOwnTemperatureK() ?? st.outsideK);
        const packing = this.lines.find((l) => l.role === 'packing') ?? null;
        for (const line of this.lines) {
          if (line.role !== 'stock') continue;
          const from = Math.max(st.fromS, line.lastReconciledS);
          const dt = st.toS - from;
          if (!(dt > 0)) continue;
          const face = this.faceFor(line.poolKey) as PoolableStuff | null;
          if (face === null) continue;
          const ctx: StoreConditions = {
            massKg: line.amountKg,
            state: line.state,
            ambientK,
            dtS: dt,
            surfaceM2: this.surfaceOf(line, face),
            packing: packing ? this.packingOf(packing, line, face) : null,
          };
          const resp = face.reconcileInStore(ctx);
          const lost = Math.max(0, line.amountKg - resp.massKg);
          lostKg.set(line.poolKey, (lostKg.get(line.poolKey) ?? 0) + lost);
          line.amountKg = Math.max(0, resp.massKg);
          line.state = resp.state;
          if (packing && resp.meltwaterKg > 0) this.soak(packing, resp.meltwaterKg);
        }
      }

      const days = (now - since) / 86400;
      for (const line of this.lines) {
        const lost = lostKg.get(line.poolKey) ?? 0;
        if (line.role === 'stock' && days > 0) line.lossKgPerDay = lost / days;
        line.lastReconciledS = now;
      }
      const emptied = this.lines.filter((l) => l.amountKg <= LINE_EPSILON_KG).map((l) => l.poolKey);
      this.dropEmptyLines();
      for (const key of emptied) {
        const face = this.faceFor(key);
        if (face !== null) {
          this._faces.delete(face.stuffId);
          await StuffApi.destruct(face);
        }
      }
      this.restampFaces();
      await this.captureSelf();
    }

    /** Every face shows its line again — the face is a VIEW. */
    private restampFaces(): void {
      for (const line of this.lines) {
        const face = this.faceFor(line.poolKey) as PoolableStuff | null;
        if (face !== null) this.stampFace(face, line);
      }
    }

    /** `surface = shape × (amount / ρ)^⅔`, m² — a stack's exposed faces. */
    private surfaceOf(line: StoreLine, face: Stuff): number {
      const rho = densityOf(face) || 900;
      return this.stackShapeFactor * Math.pow(Math.max(0, line.amountKg) / rho, 2 / 3);
    }

    /** The packing the line is buried in: its depth and its WET conductivity. */
    private packingOf(
      packing: StoreLine,
      line: StoreLine,
      face: Stuff,
    ): { depthM: number; kWmK: number } | null {
      const pFace = this.faceFor(packing.poolKey);
      const mat = pFace && MixinApi.isTangible(pFace) ? pFace.getMaterial() : null;
      if (!mat) return null;
      const rhoBulk = mat.getDensity().rawValue() || 200;
      const surface = this.surfaceOf(line, face);
      if (!(surface > 0)) return null;
      const depthM = packing.amountKg / rhoBulk / surface;
      const kDry = mat.getThermalConductivity().rawValue() || 0.06;
      const saturation = packing.state.saturation ?? 0;
      return { depthM, kWmK: mat.wetProperty(kDry, K_WATER, saturation) };
    }

    /**
     * ⭐ Meltwater soaks the packing: what does not drain raises its
     * saturation by the water over what the packing can hold.
     */
    private soak(packing: StoreLine, meltwaterKg: number): void {
      const pFace = this.faceFor(packing.poolKey);
      const mat = pFace && MixinApi.isTangible(pFace) ? pFace.getMaterial() : null;
      const wac = mat?.getWaterAbsorptionCapacity().rawValue() ?? 100;
      const holdKg = packing.amountKg * (wac / 100);
      if (!(holdKg > 0)) return;
      const wetKg = meltwaterKg * (1 - clamp01(this.drainage));
      const sat = (packing.state.saturation ?? 0) + wetKg / holdKg;
      packing.state = { ...packing.state, saturation: clamp01(sat) };
    }

    /** The room this store stands in (the first Atmospheric outward). */
    private airScope(): (Stuff & Atmospheric) | null {
      let cursor: Stuff | null = this as unknown as Stuff;
      for (let depth = 0; cursor !== null && depth < 8; depth++) {
        if (depth > 0 && MixinApi.isAtmospheric(cursor)) return cursor;
        if (!MixinApi.isContainable(cursor)) return null;
        cursor = cursor.getEnclosingScope();
      }
      return null;
    }

    /**
     * The outside air over `[fromS, toS]`, by weather segment — from the
     * weather walk, never the room's stale `envelopeOutsideK` (which is
     * restamped only where somebody is). Constant when no weather runs.
     */
    private async outsideStretches(
      scope: (Stuff & Atmospheric) | null,
      fromS: number,
      toS: number,
    ): Promise<OutsideStretch[]> {
      const flat = async (): Promise<OutsideStretch[]> => {
        let k = scope?.envelopeOutsideK ?? null;
        if (k === null && scope) {
          try {
            k = (await BiomeApi.resolveTemperatureFor(scope)).rawValue();
          } catch {
            k = null;
          }
        }
        return [{ fromS, toS, outsideK: k ?? 288 }];
      };
      if (scope === null || !WeatherApi.isActive()) return flat();
      try {
        await scope.resolveClimateSite();
        await scope.resolveWeatherLocality();
        const steps: OutsideStretch[] = [];
        WeatherApi.snowCoverAt(scope.climateSite(), scope.weatherLocality(), Quantity.of(toS, 's'), {
          onStep: (step) => {
            const a = Math.max(fromS, step.startsAtS);
            const b = Math.min(toS, step.startsAtS + step.overlapS);
            if (b > a) steps.push({ fromS: a, toS: b, outsideK: step.airK });
          },
        });
        if (steps.length === 0) return flat();
        steps.sort((x, y) => x.fromS - y.fromS);
        // A gap older than the walk reaches back is read at its first air.
        const first = steps[0] as OutsideStretch;
        if (first.fromS > fromS) steps.unshift({ fromS, toS: first.fromS, outsideK: first.outsideK });
        return steps;
      } catch {
        return flat();
      }
    }

    // ─────────────────────── the heat sink (D5) ───────────────────────

    /**
     * `{fixedW 0, conductance Σ surface/(depth/k + rFilms), anchor}` over
     * every line whose good says it is exchanging (melting ice at its
     * plateau); zero when none is.
     */
    public roomHeatExchange(): RoomHeatExchange {
      const rFilms = dial(AppSettingKeys.envelopeSurfaceResistanceM2KPerW, 0.17);
      const packing = this.lines.find((l) => l.role === 'packing') ?? null;
      let g = 0;
      let gAnchor = 0;
      for (const line of this.lines) {
        if (line.role !== 'stock') continue;
        const face = this.faceFor(line.poolKey) as PoolableStuff | null;
        if (face === null) continue;
        const anchor = face.storeAnchorK(line.state);
        if (anchor === null) continue;
        const surface = this.surfaceOf(line, face);
        const pk = packing ? this.packingOf(packing, line, face) : null;
        const r = (pk && pk.kWmK > 0 ? pk.depthM / pk.kWmK : 0) + rFilms;
        const gl = surface / r;
        g += gl;
        gAnchor += gl * anchor;
      }
      return { fixedW: 0, conductanceWperK: g, anchorK: g > 0 ? gAnchor / g : 0 };
    }

    /** Record a withdrawal into a line's moving average (W3, W4). */
    protected noteDraw(line: StoreLine, kg: number): void {
      // Exponential moving average over the window, treating the draw as
      // landing on the day it is made.
      const alpha = 1 / DRAW_WINDOW_DAYS;
      line.drawKgPerDay = line.drawKgPerDay * (1 - alpha) + kg * alpha;
    }
  };
}

// ───────────────────────────── module helpers ─────────────────────────────

/** True inside the persistence spine's restore frame. */
function restoring(): boolean {
  try {
    return ExecutionContextApi.getCallStack().some((f) => f.method === 'persistenceRestore');
  } catch {
    return false;
  }
}

function nowS(): number {
  try {
    return WorldClockApi.getNow().rawValue();
  } catch {
    return 0;
  }
}

/** Dry kilograms of a good, every unit of a stack. */
function massKgOf(item: Stuff): number {
  const unit = unitMassKgOf(item);
  const n = MixinApi.isStackable(item) ? item.getQuantity() : 1;
  return unit * n;
}

/** Dry kilograms of one unit. */
function unitMassKgOf(item: Stuff): number {
  if (!MixinApi.isTangible(item)) return 0;
  return item.getDryMass().rawValue();
}

function densityOf(item: Stuff): number {
  if (!MixinApi.isTangible(item)) return 0;
  return item.getMaterial()?.getDensity().rawValue() ?? 0;
}

function mergeState(
  good: Poolable,
  a: Record<string, number>,
  massA: number,
  b: Record<string, number>,
  massB: number,
): Record<string, number> {
  return good.mergePoolState(a, massA, b, massB);
}

function clamp01(v: number): number {
  return Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 0;
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
