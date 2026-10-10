/**
 * PumpingMixin — **a displacement machine that moves a fluid**: a hand
 * pump on a village well, a force pump fitted to a dead bore, the city's
 * intake. The capability; `platform/thing/Pump` is what rows name.
 *
 * ## ⭐⭐ Five facts, and only one of them carries a law
 *
 *  - **mechanism** — a `PumpMechanism` row. ⭐ The one that carries a law:
 *    a mechanism that PULLS can lift no higher than the air where it stands
 *    will push the fluid up the pipe ({@link BiomeApi.suctionHeadFor}). The
 *    row says *which*; the place says *how far*; nothing says *why*.
 *  - **lift** (`liftM`) — the most head this build of pump will push
 *    against. For a puller the atmosphere is usually the tighter bound.
 *  - **throughput** (`throughputLps`) — litres per second at the handle,
 *    or at full power.
 *  - **power** — the MOVER, which is the class rather than a number: a pump
 *    with no mover is worked by hand (the spell's watts are the body's,
 *    paid through the exertion substrate); a pump that composes a `Powered`
 *    supply runs off it. ⭐ **A prime mover is a `Powered` implementer** —
 *    the coupling the steam-engine slate asks for, stated as what exists.
 *  - **seal** — a packing set IN the pump: a `Durable` tool offering
 *    `packing`. A broken packing offers nothing (`Tooled.hasCapability` is
 *    false on a broken Durable), so *the leather has gone* is capability
 *    loss with no state machine.
 *
 * ## Where it stands
 *
 * A pump is a good SET IN its source — a well, a wellhead, a conduit — by
 * the platform's own `put`. Its source is its container; the source's pump
 * is its content. Nothing hunts for either.
 *
 * ⚠ **Not on `BurnerMixin`.** A furnace is not a pump: its bellows
 * implements the PROTOCOL (`Pumpable`), not this capability.
 *
 * See [docs/subsystems/pump.md].
 */

import type { MixinConstructor, FieldMeta } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import type { Container } from '../spatial/Container';
import type { Containable } from '../spatial/Containable';
import type { VetoResult } from '../errors';
import type { Durable } from '../material/Durable';
import type { Powered } from '../supply/Powered';
import type Material from '../material/Material';
import type {
  LiftSource,
  PumpSource,
  Pumpable,
  PumpPrognosis,
  PumpResult,
} from './Pumpable';
import { MixinApi } from '../../api/mixin';
import { StuffApi } from '../../api/stuff';
import { BiomeApi } from '../../api/biome';
import { AppApi } from '../../api/app';
import { Mml } from '../../api/mml';
import { Quantity } from '../quantity';
import { AppSettingKeys } from '../config/AppSettings';

/** The capability a packing offers, and the only thing a pump will hold. */
export const PACKING = 'packing';

/** Fallbacks for the four dials, used when the settings row is unseeded. */
const WEAR_PER_STROKE_FALLBACK = 0.06;
const WEAR_PER_RUNNING_HOUR_FALLBACK = 0.002;
const HAND_FLOOR_W_FALLBACK = 200;
const CREW_DUTY_FALLBACK = 0.5;
const PUMP_EFFICIENCY_FALLBACK = 0.6;
const MUSCLE_EFFICIENCY_FALLBACK = 0.25;
const STANDARD_GRAVITY = 9.81;
const WATER_KG_M3 = 1000;

/** Numeric AppSetting read, falling back to the literal (the `Durable` dial). */
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

/** The face of a `PumpMechanism` row this mixin reads — by shape. */
export interface PumpMechanismView {
  getName(): string;
  isPulling(): boolean;
  getDescription(): string;
}

/** The token one hand spell hands back to itself. */
interface StrokeToken {
  litres: number;
}

/** The five words a packing's condition reads in — no digit, ever. */
export type PackingCondition = 'sound' | 'worn' | 'leaking' | 'perished' | 'gone';

/** Public shape provided by {@link PumpingMixin}. */
export interface Pumping extends Pumpable {
  getMechanismPath(): string;
  getLiftM(): number;
  getThroughputLps(): number;
  getStrokeS(): number;
  mechanismRow(): Promise<PumpMechanismView | null>;
  sourceOf(): (Stuff & Container) | null;
  liftSource(): (Stuff & LiftSource) | null;
  packingPart(): (Stuff & Durable) | null;
  packingFitted(): Stuff | null;
  packingCondition(): PackingCondition;
  ceilingAtM(source: Stuff & LiftSource): Promise<number | null>;
  powerForDuty(headM: number, m3s: number, densityKgM3?: number): number;
  handWattsFor(headM: number): number;
  isRunning(): boolean;
  moverPowerW(): number;
  deliverableM3S(headM: number, demandM3S: number): number;
  throughputNow(): number;
  reconcileRunning(nowS: number): void;
  crewLitresFor(hands: number, elapsedS: number): number;
  liftsFrom(source: Stuff & LiftSource): Promise<boolean>;
}

export function PumpingMixin<TBase extends MixinConstructor>(Base: TBase) {
  return class PumpingMixin extends Base implements Pumping {
    static _mixinName: string = 'PumpingMixin';

    static fieldMeta: FieldMeta = {
      mechanism: { persistent: true, authorable: true, ref: 'identity' },
      liftM: { persistent: true, authorable: true },
      throughputLps: { persistent: true, authorable: true },
      strokeS: { persistent: true, authorable: true },
      runStamp: { persistent: true },
    };

    /** Path of the `PumpMechanism` row this pump is built on. */
    public mechanism: string = '';

    /** Most head this pump will push against, in metres. */
    public liftM: number = 8;

    /** Litres per second at the handle, or at full power. */
    public throughputLps: number = 0.5;

    /** Game-seconds of one spell at the handle. */
    public strokeS: number = 20;

    /** Game-seconds the running wear was last reconciled at; `0` = never. */
    public runStamp: number = 0;

    // ---------- the authored surface ----------

    public getMechanismPath(): string {
      return this.mechanism;
    }
    public getLiftM(): number {
      return this.liftM;
    }
    public setLiftM(value: number): void {
      this.liftM = Math.max(0, Number(value) || 0);
    }
    public getThroughputLps(): number {
      return this.throughputLps;
    }
    public setThroughputLps(value: number): void {
      this.throughputLps = Math.max(0, Number(value) || 0);
    }
    public getStrokeS(): number {
      return this.strokeS;
    }
    public setStrokeS(value: number): void {
      this.strokeS = Math.max(1, Number(value) || 1);
    }

    // ---------- what it is, and where ----------

    /** The mechanism row, resolved by path on use. `null` = unauthored. */
    public async mechanismRow(): Promise<PumpMechanismView | null> {
      if (this.mechanism === '') return null;
      try {
        return await StuffApi.singleton<Stuff & PumpMechanismView>(this.mechanism);
      } catch (err) {
        console.error(
          `PumpingMixin: mechanism '${this.mechanism}' did not resolve`,
          err,
        );
        return null;
      }
    }

    /** What the pump is set in, or `null` (a loose pump on a floor). */
    public sourceOf(): (Stuff & Container) | null {
      const self = this as unknown as Stuff;
      const host = MixinApi.isContainable(self) ? self.getContainer() : null;
      if (!host || !MixinApi.isContainer(host)) return null;
      // ⭐ A pump in a pack, a crate or on a floor is CARRIED, not set. A
      // source is a host that holds a pump as its pump — the one method
      // every source answers (`PumpSource`), read by shape.
      const h = host as unknown as Partial<PumpSource>;
      return typeof h.pumpFitted === 'function'
        ? (host as Stuff & Container)
        : null;
    }

    /** The source, if it is one a fluid stands below. */
    public liftSource(): (Stuff & LiftSource) | null {
      const host = this.sourceOf();
      if (!host) return null;
      const h = host as unknown as Partial<LiftSource>;
      return typeof h.standingDepthM === 'function' &&
        typeof h.liftInto === 'function'
        ? (host as unknown as Stuff & LiftSource)
        : null;
    }

    // ---------- ⭐ the seal ----------

    /** The packing in the barrel, sound or not. */
    public packingPart(): (Stuff & Durable) | null {
      const self = this as unknown as Stuff;
      if (!MixinApi.isContainer(self)) return null;
      for (const c of self.getContents()) {
        if (MixinApi.isTool(c) && c.getCapabilities().includes(PACKING)) {
          return MixinApi.isDurable(c) ? (c as Stuff & Durable) : null;
        }
      }
      return null;
    }

    /** The packing, only if it still SEALS — capability, not a flag. */
    public packingFitted(): Stuff | null {
      const part = this.packingPart();
      if (!part || !MixinApi.isTool(part)) return null;
      return part.hasCapability(PACKING) ? part : null;
    }

    /**
     * ⭐ The packing's condition in five words and no digit. `gone` is the
     * broken threshold — the seal offers nothing.
     */
    public packingCondition(): PackingCondition {
      const part = this.packingPart();
      if (!part || part.isBroken()) return 'gone';
      const c = part.getCondition();
      if (c >= 0.8) return 'sound';
      if (c >= 0.55) return 'worn';
      if (c >= 0.3) return 'leaking';
      return 'perished';
    }

    /**
     * ⭐ Only a packing goes in a pump's barrel, and only one. The veto
     * narrows CONTENTS — never which classes may be pumps.
     */
    public canAddContainable(thing: Stuff & Containable): VetoResult {
      const offers =
        MixinApi.isTool(thing) && thing.getCapabilities().includes(PACKING);
      if (!offers) {
        return { ok: false, reason: 'Only a packing fits in the barrel of a pump.' };
      }
      if (this.packingPart() !== null) {
        return { ok: false, reason: 'There is a packing in it already.' };
      }
      return { ok: true };
    }

    // ---------- ⭐⭐ the law ----------

    /**
     * The deepest this pump will draw from `source`, or `null` when nothing
     * bounds it but its own `liftM` (a pusher). ⭐ The ceiling is the
     * place's arithmetic over the fluid standing there — brine's is lower
     * than water's, a hill's lower than the shore's — and no row says it.
     */
    public async ceilingAtM(source: Stuff & LiftSource): Promise<number | null> {
      const mech = await this.mechanismRow();
      if (!mech || !mech.isPulling()) return null;
      const scope = source.liftScope();
      if (!scope) return null;
      const density = await this.densityOf(await source.standingMaterial());
      const head = await BiomeApi.suctionHeadFor(
        scope,
        density === null ? undefined : Quantity.of(density, 'kg/m³'),
      );
      return head.rawValue();
    }

    /** kg/m³ of a material path, or `null` (unknown → water). */
    private async densityOf(materialPath: string | null): Promise<number | null> {
      if (!materialPath) return null;
      const m = StuffApi.findByTemplatePath<Material>(materialPath);
      const rho = m?.getDensity().rawValue() ?? 0;
      return rho > 0 ? rho : null;
    }

    /**
     * Shaft watts to lift `m3s` through `headM` — `ρ·g·h·Q/η`. The conduit's
     * own equation, moved onto the thing that does the work.
     */
    public powerForDuty(headM: number, m3s: number, densityKgM3 = WATER_KG_M3): number {
      const eta = dial(AppSettingKeys.waterPumpEfficiency, PUMP_EFFICIENCY_FALLBACK);
      if (!(eta > 0)) return 0;
      return (densityKgM3 * STANDARD_GRAVITY * Math.abs(headM) * m3s) / eta;
    }

    /**
     * ⭐ Metabolic watts of a spell at the handle at `headM`: the shaft
     * watts over the muscle's own efficiency (the exertion substrate's
     * dial), floored — working a handle is never free.
     */
    public handWattsFor(headM: number): number {
      const shaft = this.powerForDuty(headM, this.throughputLps / 1000);
      const muscle = dial(AppSettingKeys.exertionEfficiency, MUSCLE_EFFICIENCY_FALLBACK);
      const floor = dial(AppSettingKeys.pumpHandFloorW, HAND_FLOOR_W_FALLBACK);
      return Math.round(Math.max(floor, muscle > 0 ? shaft / muscle : shaft));
    }

    // ---------- ⭐ the hand rung (Pumpable) ----------

    public async planPump(_by: Stuff): Promise<PumpPrognosis> {
      const self = this as unknown as Stuff;
      const host = this.sourceOf();
      if (!host) {
        return {
          kind: 'refusal',
          reason: 'not-set',
          prose: Mml.compose`${Mml.thing(self)} is not set in anything — it would only pump air.`,
        };
      }
      const source = this.liftSource();
      if (!source) {
        return {
          kind: 'refusal',
          reason: 'not-a-lift',
          prose: Mml.compose`${Mml.thing(self)} is machinery here, not something you work by hand.`,
        };
      }
      if (this.packingFitted() === null) {
        return {
          kind: 'refusal',
          reason: 'no-packing',
          prose:
            this.packingPart() === null
              ? Mml.compose`The handle drops with no resistance at all — there is no packing in the barrel to seal it.`
              : Mml.compose`The handle drops with no resistance at all — the leather in the barrel has gone to nothing, and nothing seals.`,
        };
      }
      const depth = source.standingDepthM();
      const ceiling = await this.ceilingAtM(source);
      // ⭐⭐ The refusal carries the DEPTH and never the ceiling, and it
      // never says why. Nothing in the game explains the number.
      if (ceiling !== null && depth > ceiling) {
        return {
          kind: 'refusal',
          reason: 'beyond-suction',
          prose: Mml.compose`You work the handle until your arms ache, and nothing comes. The water stands ${String(Math.round(depth))} metres down, and the pump will not draw it up.`,
        };
      }
      if (depth > this.liftM) {
        return {
          kind: 'refusal',
          reason: 'beyond-lift',
          prose: Mml.compose`The handle will not go down against it. The water stands ${String(Math.round(depth))} metres down, more than this pump will push.`,
        };
      }
      if (!((await source.standingAvailableL()) > 0)) {
        return {
          kind: 'refusal',
          reason: 'nothing-standing',
          prose: Mml.compose`You work the handle and draw only air: there is nothing standing below.`,
        };
      }
      if (!(source.receivableL() > 0)) {
        return {
          kind: 'refusal',
          reason: 'trough-full',
          prose: Mml.compose`${Mml.thing(source)} is full to the lip already.`,
        };
      }
      const token: StrokeToken = { litres: this.throughputLps * this.strokeS };
      return {
        kind: 'plan',
        durationMs: this.strokeS * 1000,
        effortW: this.handWattsFor(depth),
        beginSelf: Mml.compose`You take the handle of ${Mml.thing(self)} and work it, up and down.`,
        beginPeers: null,
        token,
      };
    }

    public async completePump(by: Stuff, token: unknown): Promise<PumpResult> {
      const self = this as unknown as Stuff;
      const source = this.liftSource();
      const want = (token as StrokeToken | null)?.litres ?? 0;
      if (!source || this.packingFitted() === null || !(want > 0)) {
        return {
          self: Mml.compose`You let go of the handle. Nothing came.`,
          peers: null,
          litres: 0,
        };
      }
      const litres = await source.liftInto(want);
      this.wearPacking(dial(AppSettingKeys.pumpWearPerStroke, WEAR_PER_STROKE_FALLBACK));
      if (!(litres > 0)) {
        return {
          self: Mml.compose`You let go of the handle. Nothing came.`,
          peers: null,
          litres: 0,
        };
      }
      // ⭐ Name what came up — brine is not water, and a pump on a bore
      // says so.
      const path = await source.standingMaterial();
      const name = (path ? StuffApi.findByTemplatePath<Material>(path)?.getName() : '') || 'water';
      const What = name.charAt(0).toUpperCase() + name.slice(1);
      return {
        self: Mml.compose`${What} comes up in gouts and runs into ${Mml.thing(source)}.`,
        peers: Mml.compose`${Mml.actor(by)} works the handle of ${Mml.thing(self)}, and ${name} comes up.`,
        litres,
      };
    }

    private wearPacking(amount: number): void {
      const part = this.packingPart();
      if (part && amount > 0) part.wear(amount);
    }

    // ---------- ⭐ the machine rung ----------

    /**
     * Is this pump running on its own right now? A pump with no mover never
     * is — it runs only while somebody works it. ⭐ Feature-detects an
     * optional switch and an optional supply on the host (the
     * `poweredTrajectoryOf` shape): an optional capability, never a
     * re-narrowing of which hosts may be pumps.
     */
    public isRunning(): boolean {
      const h = this as unknown as Partial<Powered> & { isOn?: () => boolean };
      if (typeof h.availablePowerW !== 'function') return false;
      if (typeof h.isOn === 'function' && !h.isOn()) return false;
      if (this.packingFitted() === null) return false;
      return h.availablePowerW() > 0;
    }

    /** Watts the mover can put into the shaft right now; `0` when stopped. */
    public moverPowerW(): number {
      if (!this.isRunning()) return 0;
      const h = this as unknown as Powered;
      return Math.max(0, h.availablePowerW());
    }

    /**
     * ⭐⭐ m³/s this pump can actually deliver against `headM` when
     * `demandM3S` is asked of it: its own throughput, the demand, and what
     * its power will lift — whichever is least. A pump whose duty exceeds
     * its supply delivers what the supply will carry, and says so.
     */
    public deliverableM3S(headM: number, demandM3S: number): number {
      if (!this.isRunning()) return 0;
      const h = Math.abs(headM);
      if (h > this.liftM) return 0;
      let q = Math.min(this.throughputLps / 1000, Math.max(0, demandM3S));
      if (h > 0) {
        const perM3S = this.powerForDuty(h, 1);
        if (perM3S > 0) q = Math.min(q, this.moverPowerW() / perM3S);
      }
      return Math.max(0, q);
    }

    /**
     * ⭐ Kilograms a minute this pump is moving RIGHT NOW — the shape
     * `analyze power` reads off any driven machine (the mill answers it
     * first; a pump is the second). A pump nobody is working and no mover
     * is driving moves nothing: *it will not turn*. Water is a kilogram a
     * litre, near enough for a reading in words.
     */
    public throughputNow(): number {
      if (!this.isRunning()) return 0;
      const host = this.sourceOf() as unknown as {
        getHeadM?: () => number | null;
        standingDepthM?: () => number;
      } | null;
      const head =
        typeof host?.getHeadM === 'function'
          ? Math.abs(host.getHeadM() ?? 0)
          : typeof host?.standingDepthM === 'function'
            ? host.standingDepthM()
            : 0;
      return this.deliverableM3S(head, this.throughputLps / 1000) * 1000 * 60;
    }

    /**
     * ⭐⭐ Wear the packing for the hours the pump RAN since the last
     * reconcile. ⚠ **Integrated over the supply's trajectory, never
     * sampled** — the `lint:reconcile-chains` lesson: a pump cut for six of
     * the last ten hours wore for four, whatever the meter reads now.
     *
     * The switch has no history, so whoever turns the pump off or on
     * reconciles first (`ElectricPump.setOn`); between switchings the switch
     * position is constant and only the supply varies.
     */
    public reconcileRunning(nowS: number): void {
      if (this.runStamp === 0 || nowS <= this.runStamp) {
        if (this.runStamp === 0 || nowS < this.runStamp) this.runStamp = nowS;
        return;
      }
      const from = this.runStamp;
      this.runStamp = nowS;
      const h = this as unknown as Partial<Powered> & { isOn?: () => boolean };
      if (typeof h.poweredTrajectory !== 'function') return;
      if (typeof h.isOn === 'function' && !h.isOn()) return;
      const seconds = h.poweredTrajectory(from, nowS).integrate((v) => (v > 0.5 ? 1 : 0), 8);
      const hours = seconds / 3600;
      if (hours > 0) {
        this.wearPacking(
          hours * dial(AppSettingKeys.pumpWearPerRunningHour, WEAR_PER_RUNNING_HOUR_FALLBACK),
        );
      }
    }

    /**
     * ⭐ Will this pump lift from `source` at all — its mechanism's wall and
     * its own lift — with a sound packing? The same law `planPump` applies,
     * for a caller with no hand on the handle (a crew credited by the hour
     * must not out-pump the atmosphere either).
     */
    public async liftsFrom(source: Stuff & LiftSource): Promise<boolean> {
      if (this.packingFitted() === null) return false;
      const depth = source.standingDepthM();
      if (depth > this.liftM) return false;
      const ceiling = await this.ceilingAtM(source);
      return ceiling === null || depth <= ceiling;
    }

    /**
     * ⭐ Litres a crew on shift at the handle raises over `elapsedS` — the
     * continuous rate a producing hole earns while its owner sleeps. A
     * hand does not work every second of a shift: `pump.crewDuty` is the
     * fraction of it spent at the handle.
     */
    public crewLitresFor(hands: number, elapsedS: number): number {
      if (!(hands > 0) || !(elapsedS > 0)) return 0;
      if (this.packingFitted() === null) return 0;
      const duty = dial(AppSettingKeys.pumpCrewDuty, CREW_DUTY_FALLBACK);
      return this.throughputLps * elapsedS * hands * duty;
    }
  };
}
