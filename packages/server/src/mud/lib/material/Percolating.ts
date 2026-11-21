/**
 * PercolatingMixin — ⭐ a POROUS SOLID that a liquid seeps down through,
 * carrying something out of it as it goes (sugar D3).
 *
 * Claying a sugar loaf is the first consumer: wet clay on the base of the
 * loaf lets its water creep down through the crystals over days, washing
 * the molasses film off them, so the top of the loaf comes out white while
 * the foot is still brown. The same shape is lye leaching through ash, and
 * the ash hopper adopts it when the potash build lands — which is why it
 * is kernel substrate and not the sugar pack's.
 *
 * The mechanism, and nothing else:
 *   - liquid is put on the solid two ways: ⭐ POURED on it (`pour pail onto
 *     heap` — it is a pour target, matter-model-overlaps D10b: the heap
 *     takes the liquid out of the vessel and keeps what it is, its
 *     `percolant`), or `receivePercolant(litres)` — liquid already lying
 *     where the solid lies (a hopper's liquor, a lump of wet clay's water),
 *     which carries nothing of its own out;
 *   - the REACH (`0..1`, how far down it has got) advances over the host's
 *     `percolationDays()` while there is liquid working — banked at the
 *     heap's own changes and finished on a game-clock wake at its due time
 *     (crowded-rooms D8), never by whoever happens to read it;
 *   - each advance calls the host's `@hook onPercolated(from, to)`, which
 *     decides what the reach did to it (the loaf lifts its bands and gives
 *     up molasses);
 *   - ⭐ a poured liquid comes out the bottom as the reach advances — the
 *     share that has come through, as the host says it left
 *     (`@hook percolateOut`: ash makes it lye) — by the one drip
 *     (`BulkableApi.drip`): into the vessel the solid is in, else the one
 *     it stands on, else onto the floor.
 *
 * What composing it CLAIMS: a solid a liquid can move through over days,
 * and so one a liquid can be poured on. Not every solid is — a bar of iron
 * is not — so it is a mixin on the porous things, never on Tangible.
 */
import type { MixinConstructor, FieldMeta } from '../mixin';
import { MixinApi } from '../../api/mixin';
import { StuffApi } from '../../api/stuff';
import { BulkableApi } from '../../api/bulk';
import { MaterialApi } from '../../api/material';
import { WorldClockApi } from '../../api/worldclock';
import type { ClockHandle } from '../../api/worldclock';
import { ExecutionContextApi } from '../../api/execution-context';
import { Quantity } from '../quantity';
import type { Stuff } from '../stuff/Stuff';
import type { BulkPayload } from '../bulk/Bulkable';
import type { Container } from '../spatial/Container';
import { PourTargetMixin, type PourAnswer, type PourDone, type PourRequest } from '../bulk/PourTarget';
import { TemplatePaths } from '../paths';

const SECONDS_PER_GAME_DAY = 86_400;

/**
 * ⭐ The liquid working down through a porous solid (D10b). `material` is
 * what was POURED on it — `null` when the liquid lies where the solid lies
 * (a hopper's liquor) and the solid's host carries it out in place.
 */
export interface Percolant {
  material: string | null;
  payload: BulkPayload | null;
  litres: number;
}

/** A liquid leaving the bottom of a heap: what it is, and how much. */
export interface PercolateOut {
  material: string;
  payload: BulkPayload | null;
  litres: number;
}

/** Public shape contributed by PercolatingMixin. */
export interface Percolating {
  /** Put `litres` of the liquid it lies in on the solid, to work down through it. */
  receivePercolant(litres: number): void;
  /** How far the liquid has got, `0..1` (reconciled on read). */
  getReach(): number;
  /** Litres of liquid still working through it. */
  getPercolantL(): number;
  /** What is working through it, or `null`. */
  getPercolant(): Percolant | null;
  /** Integrate the percolation to now. */
  reconcilePercolation(): void;
}

export function PercolatingMixin<TBase extends MixinConstructor<Stuff>>(Base: TBase) {
  return class PercolatingMixin extends PourTargetMixin(Base) implements Percolating {
    static _mixinName: string = 'PercolatingMixin';

    static fieldMeta: FieldMeta = {
      percolant: { persistent: true, runtimeState: true },
      percolationReach: { persistent: true, runtimeState: true },
      percolationStamp: { persistent: true, runtimeState: true },
      percolationWakeAtS: { persistent: true, runtimeState: true },
    };

    /** The liquid working through the solid, or `null`. */
    public percolant: Percolant | null = null;
    /** How far down it has reached, `0..1`. */
    public percolationReach = 0;
    /** Game-seconds of the last reconcile; `0` = idle. */
    public percolationStamp = 0;

    /**
     * ⭐ Game-seconds the liquid will be through, or `0` (crowded-rooms D8).
     * Persisted and re-armed by {@link setPercolationWakeAtS}, so a restart
     * mid-leach finishes on time.
     */
    public percolationWakeAtS = 0;
    /** The live wake — transient, re-armed by the setter. */
    private _percolationWake: ClockHandle | null = null;

    /** Reentry guard (TS-private; proxy-safe — never `#`). */
    private _percolating = false;

    /**
     * The restore door (load-on-use W8): what was poured on the heap loads
     * with it — its material and whatever its payload cites — so a run-off
     * after a restart can name it. `undefined` when nothing needs loading.
     */
    public setPercolant(value: Percolant | null): Promise<void> | undefined {
      this.percolant = value ?? null;
      return this.percolant === null ? undefined : MaterialApi.materials().ensureCitedIn(this.percolant);
    }

    /** Set (or clear, `0`) when the liquid will be through, and arm it. */
    public setPercolationWakeAtS(value: number): void {
      this._percolationWake?.cancel();
      this._percolationWake = null;
      this.percolationWakeAtS = Number.isFinite(value) && value > 0 ? value : 0;
      if (this.percolationWakeAtS === 0) return;
      this._percolationWake = WorldClockApi.at(
        Quantity.of(this.percolationWakeAtS, 's'),
        () => {
          this._percolationWake = null;
          this.percolationWakeAtS = 0;
          this.reconcilePercolation();
        },
        { host: this as unknown as Stuff, tag: 'percolation' },
      );
    }

    /**
     * Re-derive the due time from the reach banked now: the rate is the
     * host's own (`percolationDays()`), which may read where it stands.
     */
    private armPercolation(now: number): void {
      if (!(this.getPercolantL() > 0) || this.percolationReach >= 1) {
        if (this.percolationWakeAtS !== 0) this.setPercolationWakeAtS(0);
        return;
      }
      const days = Math.max(1e-6, this.percolationDays());
      const untilS = (1 - this.percolationReach) * days * SECONDS_PER_GAME_DAY;
      this.setPercolationWakeAtS(now + Math.max(1, Math.ceil(untilS)));
    }

    /** ⭐ A heap moved: bank, and re-derive the due time where it now stands. */
    public onMoved(from: (Stuff & Container) | null, to: (Stuff & Container) | null): void {
      const sup = (Base.prototype as {
        onMoved?: (f: (Stuff & Container) | null, t: (Stuff & Container) | null) => void;
      }).onMoved;
      if (typeof sup === 'function') sup.call(this, from, to);
      this.reconcilePercolation();
    }

    /**
     * @hook How many game-days the liquid takes to reach the bottom. The
     * host's own (a sugar loaf's `clayDays`). Default ten.
     */
    public percolationDays(): number {
      return 10;
    }

    /**
     * @hook The reach advanced from `fromReach` to `toReach` — the host
     * decides what that did to it. Default: nothing.
     */
    public onPercolated(_fromReach: number, _toReach: number): void {
      // the host's
    }

    /**
     * @hook ⭐ What a POURED liquid is as it leaves the bottom, for the reach
     * from `fromReach` to `toReach` (D10b) — ash answers lye. Default: what
     * went in comes out.
     */
    public percolateOut(matter: PercolateOut, _fromReach: number, _toReach: number): PercolateOut {
      return matter;
    }

    /**
     * @hook A liquid was just poured on it by `by` — the act's moment, when
     * whose the liquid will be is decided (ash: the communal-oven rule).
     * Default: nothing.
     */
    public percolantPoured(_by: Stuff): void {
      // the host's
    }

    /**
     * ⭐ `pour <vessel> onto <heap>` (D10b) — the destination decides: the
     * heap takes the liquid out of the vessel and keeps what it is. One
     * liquid at a time: another kind poured on while one is working through
     * will not mix.
     */
    public receivePour(req: PourRequest): PourAnswer {
      const target = this as unknown as Stuff;
      const { by, source } = req;
      const fromSlot = BulkableApi.slotFor(source, req.sourceVia);
      if (fromSlot === null) {
        return { ok: false, reason: 'nothing-in-source', facts: { source, target } };
      }
      return {
        ok: true,
        durationMs: 0,
        effortW: 0,
        facts: { kind: 'now' },
        onComplete: async () => {
          const done = (kind: PourDone['kind']): { ok: true; facts: PourDone } => ({
            ok: true,
            facts: { kind, source, target, notes: [] },
          });
          const material = fromSlot.getMaterial();
          const path = fromSlot.getMaterialPath();
          if (fromSlot.isEmpty() || material === null || path === null || !material.hasTag('liquid')) {
            return done('nothing');
          }
          const working = this.percolant;
          if (working !== null && working.litres > 0 && working.material !== null && working.material !== path) {
            return done('mismatch');
          }
          const amount = BulkableApi.amountFromOption(req.amount, { kind: 'all' }, req.exact === true);
          const available = fromSlot.available();
          let litres: number;
          if (amount.kind === 'all') {
            // A river has no "all" to tip on a heap.
            litres = Number.isFinite(available) ? available : 0;
          } else if (amount.litres > available && amount.mode === 'strict') {
            return done('too-much');
          } else {
            litres = Math.min(amount.litres, available);
          }
          if (!(litres > 0)) return done('nothing');
          const payload = fromSlot.payloadForDraw(litres);
          fromSlot.debit(litres);
          if (MixinApi.isBulkable(source)) source.afterPouredOutBy(by, litres);
          this.takePercolant(path, payload, litres);
          this.percolantPoured(by);
          return done('poured');
        },
      };
    }

    /** Bank, then add a poured liquid to what is working through. */
    private takePercolant(material: string, payload: BulkPayload | null, litres: number): void {
      this.reconcilePercolation();
      // The liquid the solid lies in (`material: null`) is its vessel's, not
      // the heap's: what is poured takes over, and carries the alkali there.
      const was = this.percolant !== null && this.percolant.material !== null ? this.percolant : null;
      this.percolant = {
        material,
        payload: was !== null && was.litres > 0 && was.payload !== null ? was.payload : payload,
        litres: (was?.litres ?? 0) + litres,
      };
      // A fresh pour on a heap the last one has come through starts again.
      if (this.percolationReach >= 1) this.percolationReach = 0;
      this.startClock();
    }

    public receivePercolant(litres: number): void {
      if (!(litres > 0)) return;
      this.reconcilePercolation();
      const was = this.percolant;
      // ⚠ A POURED liquid still working through runs out into the liquid the
      // solid lies in — that IS how it reaches it. Counting that liquid onto
      // the poured one would run it out again, and make liquid out of nothing.
      if (was !== null && was.material !== null && was.litres > 0) return;
      this.percolant = { material: null, payload: null, litres: (was?.litres ?? 0) + litres };
      this.startClock();
    }

    private startClock(): void {
      const now = percolationNowSeconds();
      if (now !== null && this.percolationStamp === 0) this.percolationStamp = now;
      if (now !== null) this.armPercolation(now);
    }

    public getReach(): number {
      this.reconcilePercolation();
      return this.percolationReach;
    }

    public getPercolantL(): number {
      return this.percolant?.litres ?? 0;
    }

    public getPercolant(): Percolant | null {
      return this.percolant;
    }

    public reconcilePercolation(): void {
      if (this._percolating) return;
      // The room's reading holds the world still (crowded-rooms D9).
      if (ExecutionContextApi.worldHeldStill) return;
      if (!(this.getPercolantL() > 0) || this.percolationReach >= 1) return;
      const now = percolationNowSeconds();
      if (now === null) return;
      if (this.percolationStamp === 0) {
        this.percolationStamp = now;
        this.armPercolation(now);
        return;
      }
      const elapsed = now - this.percolationStamp;
      this.percolationStamp = now;
      if (!(elapsed > 0)) return;
      const days = Math.max(1e-6, this.percolationDays());
      const from = this.percolationReach;
      const raw = from + elapsed / (days * SECONDS_PER_GAME_DAY);
      // A wake fires within the clock's epsilon of its due time; a reach a
      // hair short of the bottom is at it.
      const to = raw >= 1 - 1e-9 ? 1 : raw;
      this.percolationReach = to;
      const working = this.percolant!;
      // ⭐ A poured liquid comes out as the reach advances: the share of
      // what is left that this stretch of the reach lets through.
      let outL = 0;
      if (working.material !== null) {
        outL = to >= 1 ? working.litres : working.litres * ((to - from) / Math.max(1e-12, 1 - from));
      }
      if (to >= 1) {
        // Through: what liquid was left has come out the bottom.
        this.percolant = null;
        this.percolationStamp = 0;
      } else if (outL > 0) {
        this.percolant = { ...working, litres: working.litres - outL };
      }
      this._percolating = true;
      try {
        if (working.material !== null && outL > 0) this.runOff(working, outL, from, to);
        this.onPercolated(from, to);
      } finally {
        this._percolating = false;
      }
      this.armPercolation(now);
    }

    /** What came through leaves by the one drip, as the host says it left. */
    private runOff(working: Percolant, litres: number, from: number, to: number): void {
      const out = this.percolateOut(
        { material: working.material!, payload: working.payload, litres },
        from,
        to,
      );
      if (!(out.litres > 0)) return;
      BulkableApi.drip({
        off: this as unknown as Stuff,
        material: MaterialApi.materials().need(out.material),
        litres: out.litres,
        payload: out.payload,
      });
    }
  };
}

/** Game-seconds now, or `null` when no world clock is running. */
function percolationNowSeconds(): number | null {
  if (!StuffApi.findByTemplatePath(TemplatePaths.worldClockRegistry)) return null;
  return WorldClockApi.getNow().rawValue();
}
