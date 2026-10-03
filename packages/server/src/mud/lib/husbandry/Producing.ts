/**
 * ProducingMixin — **three taps, three real neglect failures** (D25).
 *
 * ⚠⚠ **A tap fills from the PRODUCTION SLICE of the energy budget, and
 * mints nothing.** That is the whole constraint. Every product is a
 * transform of feed, which is a transform of sunlight and soil; the
 * shipped `Stock` counter's *reset sweep* is the right shape to copy and
 * its `par` semantics is emphatically not — a counter topped up to par
 * is a faucet wearing a hat.
 *
 * So the fill rate is scaled by **condition** (the `flesh` reserve): an
 * animal in poor flesh gives less milk, because it has less to give.
 * ⭐ And **production dies before condition does**, with no special case,
 * because production sits at priority 4 in the partitioning cascade and
 * the store is what is left over.
 *
 * ## The three behaviours, and why they differ
 *
 * ⭐⭐ **Accrual for the on-ramp, expiry for the committed** (D93):
 *
 * | | behaviour | neglect |
 * |---|---|---|
 * | **milk** | `expire` | she **dries off** for that lactation. ⚠ A large **slope** (D45), not a cliff — the next lactation is unaffected, so an absence costs a season and never an animal |
 * | **eggs** | `accrue` | they **spoil** in the nest past what a clutch holds |
 * | **wool** | `continuous` | a worse fleece, and a hot sheep |
 *
 * The forgiving end of the roster accrues and expiry is what you take on
 * when you commit — which is why hens are the on-ramp and a dairy cow is
 * a tyrant, and why *what a player can keep* is an honest choice about
 * their own real-life cadence rather than a gate.
 *
 * ⚠ Every period here is a **GAME day** (D89). At the shipped 12× scale
 * a game day is two real hours, so *twice a game day* is four real
 * hours — which is why a dairy cow's expiry window is generous in game
 * days and still demanding in real ones.
 *
 * ## ⭐⭐⭐ The feedback law, and the three judgments it put here
 *
 * The behaviour column above says what NEGLECT costs. It does NOT say
 * the thing that actually distinguishes these products, which the taps
 * build found by asking the biology instead of the table: **does the act
 * of taking feed back on the RATE?**
 *
 * | | feedback | the judgment, and where it lives |
 * |---|---|---|
 * | **milk** | ⭐ direct — lactation is demand-driven, so removal stimulates synthesis and residual suppresses it | ⚠ **none at the act, deliberately.** There is no now-vs-later in milk: a take always empties her. What the player trades is **attendance against her rate** — labour — so the standing-instruction relief is milk's whole answer, and `look` bands the window clock so the loss is visible coming (W1 deleted the plan's extra curve; see the `expire` branch of the reconcile for why it could not exist) |
 * | **eggs** | ⭐ through a state the act PREVENTS — a hen is an indeterminate layer, so a clutch left standing makes her brood and stop | `brooding` + `fullSince`, armed by `broodAfterDays` |
 * | **wool · honey · sap** | none | nothing to decide at the act; `worst` records what the YEAR put in, read at the take |
 *
 * ⚠ An earlier draft asserted the opposite — that all of these were one
 * mechanism with different dials. They are not. Each field below is read
 * by exactly ONE behaviour, which is the shape that table demands.
 *
 * ⭐ And the taps are kernel substrate as of the taps build: a cow
 * (ranching), a hive (apiculture) and a sap-bearing tree (forestry) have
 * no common pack ancestor, which is CLAUDE.md's promotion test.
 */

import type { MixinConstructor, FieldMeta } from '../mixin';
import { Mixins } from '../mixin';
import { StuffApi } from '../../api/stuff';
import { WorldClockApi } from '../../api/worldclock';
import { MixinApi } from '../../api/mixin';
import { TemplatePaths } from '../paths';
import type { Stuff } from '../stuff/Stuff';
import type Species from '../../platform/idea/species/Species';
import type {
  TapSpec,
  TapClosedReason,
  TapWindowSpec,
} from '../../platform/idea/species/Species';
import { CelestialApi } from '../../api/celestial';
import { EARTH_LIKE } from '../time/CelestialProfile';
import { BulkableApi } from '../../api/bulk';
import { ContainmentApi } from '../../api/containment';
import { Quantity } from '../quantity';
import type Material from '../../platform/idea/material/Material';
import type { Tooled } from '../craft/Tooled';
import type { Bulkable } from '../bulk/Bulkable';
import type { Tappable } from './Tappable';
import type {
  WorkDifficulty,
  WorkPrognosis,
  WorkResult,
} from '../ground/Workable';
import type { GradeBand } from '../craft/Grade';

const SECONDS_PER_GAME_DAY = 86_400;

/** What is standing in one tap, and how long it has been standing. */
export interface TapState {
  /** Units available to take. */
  standing: number;
  /** Game-seconds of the last take. `0` = never taken. */
  lastTaken: number;
  /**
   * ⚠ Has an `expire` tap given up for this season? A **slope**: the
   * animal stops producing until the lactation resets, and the next one
   * is unaffected. Never a dead animal and never a permanent loss.
   */
  driedOff: boolean;
  /**
   * ⭐ **`continuous` only — the WORST the year got**, `[0, 1]`: the
   * minimum condition over the growth this fleece represents. Stamped
   * onto the yield's grade at the take, then reset. The `_worstLimiting`
   * shape from `Growing`, which is where the idea came from. Seeded `1`.
   */
  worst: number;
  /**
   * ⭐ **`accrue` with `broodAfterDays` only** — the bird is sitting on
   * a full clutch and has stopped laying. Cleared by taking it.
   */
  brooding: boolean;
  /**
   * Game-seconds at which this tap first reached its ceiling, `0` when
   * it is not full. The clock `broodAfterDays` is measured against.
   */
  fullSince: number;
}

/** What `tapWindow` answers: open, or shut and why. */
export interface TapWindowRead {
  open: boolean;
  reason: TapClosedReason | null;
}

/** What `takeFrom` hands back — the units, and the year they carry. */
export interface TapTake {
  units: number;
  /** The `continuous` quality record, `[0, 1]`. `1` for other taps. */
  worst: number;
}

/** The public surface a producing animal offers. */
/**
 * ⭐ **`Producing` IS `Tappable`** — `ProducingMixin` implements both
 * halves by default (a cow, a hive and a sap tree get the whole act for
 * free), so the interface says so rather than leaving every caller to
 * assert it.
 *
 * ⚠ Without this `extends`, `MixinApi.isProducing()` narrowed to
 * `Stuff & Producing` and each of the three call sites then wrote
 * `as unknown as Stuff & Tappable` to get the half it already had — a
 * cast standing in for a declaration. Found in the pre-merge sweep.
 */
export interface Producing extends Tappable {
  /** Reconcile every tap over elapsed game-time. Sync, read-triggered. */
  reconcileProduction(): void;
  /** The taps this animal's species authors. */
  taps(): readonly TapSpec[];
  /** What is standing in one tap, reconciled. */
  standingIn(key: string): number;
  /** Whether an `expire` tap has given up for this season. */
  isDriedOff(key: string): boolean;
  /**
   * Take everything standing in a tap. Returns the units taken and the
   * year they carry, and ⭐ **resets the neglect clock** — which is the
   * whole of why taking one is an act rather than a collection.
   */
  takeFrom(key: string): TapTake;
  /** Put an `expire` tap back into production (a new lactation). */
  freshen(key: string): void;
  /** How hard this animal is working, `[0, 1]` — the condition scale. */
  productionFactor(): number;
  /** Whether a tap is open right now, and why not. */
  tapWindow(key: string): TapWindowRead;
  /** The host's own sentence for a shut tap. No digits, ever. */
  tapRefusal(key: string, reason: TapClosedReason): string;
  /** The `biome` window kind's hook — the host answers. */
  biomeWindowOpen(spec: TapSpec): boolean;
  /** The `look` lines: what this producer is doing, in words. */
  productionRead(): string[];
  /**
   * ⭐ The Discipline this host asks to be credited for a take, or
   * `null`. What lets a kernel controller earn a TRADE's competence
   * without knowing the trade exists — ground's own seam, reused.
   */
  tapCredit(key: string): { discipline: string; difficulty: WorkDifficulty } | null;
}

export function ProducingMixin<TBase extends MixinConstructor<Stuff>>(
  Base: TBase,
) {
  return class ProducingMixin extends Base implements Producing, Tappable {
    public readonly tappable = true as const;

    static _mixinName: string = Mixins.Producing;

    /**
     * ⚠ The refusal `rob`, `milk`, `shear` and `gather` give a target
     * that has no taps. A pack mixin declares its own phrase beside its
     * name (`lint:arg-kinds` refuses one with none, which is right — the
     * generic sentence tells a player nothing).
     */
    static _mixinRefusal = "{} does not give anything";

    /*
     * ⭐⭐ **The taps used to afford the tap verbs from HERE, and the
     * argument was right — but the seam does not exist yet.**
     *
     * The list moved off the `Livestock` CLASS onto this mixin because
     * `Livestock` promised `milk`, `shear` and `gather` on every animal
     * in the trade whether or not it gave anything: a sheepdog offered
     * `shear` and a plough ox offered `milk`, and each controller had to
     * un-promise it at execute time. **A guard that re-narrows the host
     * set is the tell that the affordance is on the wrong host.**
     *
     * ⚠⚠ But a mixin static is still a CLASS-level answer, and the
     * honest question is per-INSTANCE: *what does this animal's authored
     * `production[]` contain?* A hive composes this mixin and gives
     * honey; putting the three ranching views here promised it `milk`
     * and `shear` for exactly the reason `Livestock` used to promise a
     * sheepdog `shear`. So the flat list has gone back to `Livestock`
     * (its only other composer, so nothing shipped changes) and a host
     * that taps something else affords its own verb from its own class.
     *
     * ⭐ **The finding, for tapping-slate:** the right home is an
     * instance-level contribution seam — a species with an `eggs` tap
     * affording `gather` and nothing else — and
     * `CommandApi.collectContributions` walks class statics only
     * (`api/command.ts:1444`). Until that exists, the affordance is a
     * class's answer and the class has to be the one that knows.
     */

    static fieldMeta: FieldMeta = {
      tapState: { persistent: true },
      productionStamp: { persistent: true },
    };

    /** Per-tap state, keyed by the tap's key. */
    public tapState: Record<string, TapState> = {};

    /** Game-seconds stamp of the last production reconcile. */
    public productionStamp = 0;

    protected _reconcilingProduction = false;

    public taps(): readonly TapSpec[] {
      const self = this as unknown as Stuff;
      if (!MixinApi.isOrganism(self)) return [];
      const species = self.getSpecies() as Species | null;
      return species?.getProduction() ?? [];
    }

    /**
     * ⭐ How hard this animal is working — the production slice, scaled
     * by what it has to give.
     *
     * An animal in good flesh works at full; a thin one works at a
     * fraction; an emaciated one has nothing to spare at all. ⚠ It reads
     * the reserve rather than a band, because a band would make
     * production a step function and a real animal's yield falls away
     * gradually.
     */
    public productionFactor(): number {
      const self = this as unknown as Stuff;
      if (!MixinApi.isReserved(self)) return 1;
      const flesh = self.getReserve('flesh')?.current.rawValue();
      if (flesh === undefined) return 1;
      // Full at "in good flesh" and above; nothing at the emaciated end.
      return clamp01((flesh - 12) / 43);
    }

    public standingIn(key: string): number {
      this.reconcileProduction();
      return this.tapState[key]?.standing ?? 0;
    }

    public isDriedOff(key: string): boolean {
      this.reconcileProduction();
      return this.tapState[key]?.driedOff === true;
    }

    public takeFrom(key: string): TapTake {
      this.reconcileProduction();
      const state = this.tapState[key];
      if (!state) return { units: 0, worst: 1 };
      const taken = state.standing;
      if (taken <= 0) return { units: 0, worst: state.worst ?? 1 };
      const now = nowSeconds();
      const worst = state.worst ?? 1;
      // ⭐ The take clears every judgment it is the answer to: she is
      // emptied and her window clock restarts, the clutch is gone (so
      // she stops brooding), and the fleece's year leaves with the
      // fleece.
      this.tapState = {
        ...this.tapState,
        [key]: {
          ...state,
          standing: 0,
          lastTaken: now ?? state.lastTaken,
          driedOff: false,
          worst: 1,
          brooding: false,
          fullSince: 0,
        },
      };
      return { units: taken, worst };
    }

    /**
     * ⭐⭐ Whether a tap is open, and when it is not, why.
     *
     * Declared data decides this (`TapSpec.window`), so a new season is
     * a row. ⚠ **The tri-state rule:** a term this world does not model
     * reads as OPEN, never closed — a host that answers no temperature
     * is gated by daylength alone rather than silently dead.
     */
    public tapWindow(key: string): TapWindowRead {
      // ⚠ Reconcile first: `brooding` and `driedOff` are both DERIVED
      // from elapsed game-time, so answering off a stale state would
      // report a hen as laying for as long as nobody happened to read
      // her standing. (Safe against the reconcile's own call — its
      // reentry guard makes the inner call a no-op, which is the
      // sampled-at-the-read semantics this wants anyway.)
      this.reconcileProduction();
      const tap = this.taps().find((t) => t.key === key);
      if (!tap) return { open: false, reason: null };
      const state = this.tapState[key];

      // `expire`'s own closure is the lactation, not a season.
      if (state?.driedOff === true) {
        return { open: false, reason: 'dried-off' };
      }
      if (state?.brooding === true) {
        return { open: false, reason: 'brooding' };
      }

      const spec: TapWindowSpec = tap.window ?? { kind: 'always' };
      switch (spec.kind) {
        case 'always':
        case 'event':
          // `event` is opened and closed by `freshen`/dry-off, both of
          // which are answered above. Open otherwise.
          return OPEN;
        case 'biome':
          return this.biomeWindowOpen(tap)
            ? OPEN
            : { open: false, reason: 'no-forage' };
        case 'photoperiod': {
          const day = daylightFraction();
          if (day === null) return OPEN;
          return inBand(day, spec.daylightFrom, spec.daylightTo)
            ? OPEN
            : { open: false, reason: seasonSide(day, spec.daylightFrom) };
        }
        case 'weather': {
          const day = daylightFraction();
          if (day !== null) {
            if (!inBand(day, spec.daylightFrom, spec.daylightTo)) {
              return {
                open: false,
                reason: seasonSide(day, spec.daylightFrom),
              };
            }
            // ⭐ Spring and autumn cross the SAME daylength band and are
            // not the same season for a tree. `rising` discriminates
            // them by the sign of the change over one game day.
            if (spec.rising !== undefined) {
              const yesterday = daylightFraction(-SECONDS_PER_GAME_DAY);
              if (yesterday !== null) {
                const isRising = day > yesterday;
                if (isRising !== spec.rising) {
                  return {
                    open: false,
                    reason: spec.rising ? 'after-season' : 'before-season',
                  };
                }
              }
            }
          }
          // The temperature term, when the host has one to read. Absent
          // is unmodelled, which is open.
          const self = this as unknown as Stuff;
          if (MixinApi.isThermal(self)) {
            const k = self.getTemperature()?.rawValue();
            if (k !== undefined) {
              if (k < spec.minK) return { open: false, reason: 'cold' };
              if (k > spec.maxK) return { open: false, reason: 'warm' };
            }
          }
          return OPEN;
        }
      }
    }

    /**
     * ⚠ The kernel's refusals, and **not one of them contains a digit**
     * — a shut tap is a thing you read off the world, never a number you
     * are told. Hosts override in their own voice (a cow's dried-off is
     * not a birch's end of run).
     */
    public tapRefusal(key: string, reason: TapClosedReason): string {
      switch (reason) {
        case 'before-season':
          return 'it is not the season for that yet';
        case 'after-season':
          return 'that season is over for the year';
        case 'cold':
          return 'it is too cold for anything to run';
        case 'warm':
          return 'it is too warm; nothing is running';
        case 'dried-off':
          return 'there is nothing left to give this season';
        case 'brooding':
          return 'she is sitting tight and will not be moved';
        case 'no-forage':
          return 'there is nothing out there to work';
      }
    }

    /**
     * The `biome` window's hook. Default open — a producer whose supply
     * is the land around it overrides (a hive reads its forage census).
     */
    public biomeWindowOpen(_spec: TapSpec): boolean {
      return true;
    }

    /**
     * ⭐ What this producer is doing, in words a `look` can print.
     *
     * ⚠ **No digits.** The bands exist so that *going off is visible
     * before it is lost* — a player who reads "she is drying up" has
     * been told everything a number would have told them and has been
     * told it in time.
     */
    public productionRead(): string[] {
      this.reconcileProduction();
      const lines: string[] = [];
      for (const tap of this.taps()) {
        const state = this.tapState[tap.key];
        if (!state) continue;
        if (tap.behaviour === 'expire') {
          // ⭐ Banded off the WINDOW CLOCK, which is the only number milk
          // was ever about. No stored curve — see the `expire` branch of
          // the reconcile for why there isn't one.
          const now = nowSeconds();
          const sinceTaken =
            now !== null && state.lastTaken > 0
              ? (now - state.lastTaken) / SECONDS_PER_GAME_DAY
              : 0;
          const through =
            tap.windowDays > 0 ? sinceTaken / tap.windowDays : 0;
          if (state.driedOff) {
            lines.push('She has dried off for this season.');
          } else if (through < OVERDUE_BAND) {
            lines.push('She is in full milk.');
          } else if (through < LATE_BAND) {
            lines.push('She is heavy and wants milking.');
          } else {
            lines.push(
              'She is overdue, and will dry off for the season if nobody comes.',
            );
          }
        } else if (tap.behaviour === 'accrue') {
          if (state.brooding) {
            lines.push('She is sitting tight on a clutch and has stopped laying.');
          }
        } else {
          if (state.worst < 0.6) {
            lines.push('A lean spell has left a weak point in the fleece.');
          }
          if (tap.capUnits !== undefined && state.standing >= tap.capUnits) {
            lines.push('The fleece is so heavy it is starting to shed.');
          }
        }
        const window = this.tapWindow(tap.key);
        if (!window.open && window.reason === 'after-season') {
          lines.push('The run is over for the year.');
        }
      }
      return lines;
    }

    public freshen(key: string): void {
      const state = this.tapState[key];
      if (!state) return;
      const now = nowSeconds();
      this.tapState = {
        ...this.tapState,
        [key]: { ...state, driedOff: false, lastTaken: now ?? state.lastTaken },
      };
    }

    /**
     * Fill every tap over elapsed game-time, and apply its own neglect.
     *
     * ⚠ **No far-past guard.** A kept animal's clock runs while its
     * keeper is away — that is the whole of D29 — and the failure modes
     * here are exactly what an absence is supposed to cost: a lactation,
     * a clutch, a fleece. Never the animal.
     */
    public reconcileProduction(): void {
      if (this._reconcilingProduction) return;
      const nowS = nowSeconds();
      if (nowS === null) return;
      if (this.productionStamp === 0) {
        this.productionStamp = nowS;
        this.seedTaps(nowS);
        return;
      }
      const elapsed = nowS - this.productionStamp;
      if (elapsed <= 0) {
        this.productionStamp = nowS;
        return;
      }
      this._reconcilingProduction = true;
      try {
        const days = elapsed / SECONDS_PER_GAME_DAY;
        const factor = this.productionFactor();
        const next: Record<string, TapState> = { ...this.tapState };
        for (const tap of this.taps()) {
          const state = next[tap.key] ?? seedState(nowS);
          const sinceTaken =
            state.lastTaken > 0 ? (nowS - state.lastTaken) / SECONDS_PER_GAME_DAY : 0;
          // ⚠ A state persisted before these keys existed comes back
          // missing them. No migration ever: default on read, and the
          // first reconcile after a reboot writes them back.
          const worst = state.worst ?? 1;

          // ⭐⭐ The window gates the FILL and nothing else. What is
          // already standing stays takeable, because a season ending is
          // not a reason to confiscate what the season produced.
          //
          // ⚠ Sampled at the read, not integrated across the interval —
          // the `Stand` growth-factor form. Honest-cheap, and stated:
          // a jump across a season boundary bills the whole interval at
          // the boundary's own answer.
          const open = this.tapWindow(tap.key).open ? 1 : 0;

          if (tap.behaviour === 'expire') {
            // ⚠ She dries off. The SLOPE: production stops for this
            // lactation and the next one is unaffected — an absence
            // costs a season, never an animal.
            if (sinceTaken > tap.windowDays) {
              next[tap.key] = { ...state, standing: 0, driedOff: true };
              continue;
            }
            if (state.driedOff) {
              next[tap.key] = { ...state, standing: 0 };
              continue;
            }
            // What is standing is one window's worth, not a running
            // total: milk that was not taken is milk that was not made.
            //
            // ⭐⭐⭐ And that is ALL milk's mechanism is — see the
            // `expire` note in the header. The plan (D6) specified a
            // second, finer suppression curve on top of this
            // (`TapState.vigour`, relaxing toward `1 − residual`) and
            // it is **unimplementable and was deleted in W1**, for a
            // reason worth recording because it is structural:
            //
            // `ceiling = perGameDay × windowDays`, so she fills EXACTLY
            // as the window closes. The region where a cow sits full and
            // suppresses her own synthesis is therefore empty by
            // construction — it begins precisely where the neglect cliff
            // already fires. Every dial choice that opened a gap would
            // have had to change what `windowDays` means.
            //
            // ⚠ It was also the plan re-inventing something the
            // requirements had deliberately removed: milk's agreed
            // answer is **no judgment at the act**. A take always
            // empties her; what the player trades is ATTENDANCE against
            // her rate — labour — and the standing-instruction relief is
            // the answer to that, not a curve. AC 8 (*going off is
            // visible before it is lost*) is met by `productionRead`
            // banding the clock that already exists.
            const ceiling = tap.perGameDay * tap.windowDays;
            next[tap.key] = {
              ...state,
              standing: Math.min(
                ceiling,
                state.standing + tap.perGameDay * days * factor * open,
              ),
            };
            continue;
          }

          if (tap.behaviour === 'accrue') {
            // Collect whenever — but a full clutch is a full clutch:
            // ⭐ she adds nothing to it (she does not pile eggs up and
            // let them rot), and past `broodAfterDays` sitting on it she
            // goes broody and stops altogether.
            const ceiling = tap.perGameDay * tap.windowDays;
            const rate = tap.perGameDay * factor * open;
            const standing = Math.min(ceiling, state.standing + rate * days);
            const full = ceiling > 0 && standing >= ceiling - 1e-9;
            // ⚠⚠ `fullSince` is stamped at the moment she ACTUALLY
            // became full, which is inside this interval and not at the
            // end of it. Stamping it at `nowS` meant a single reconcile
            // spanning both the filling and the brooding could never
            // detect the brooding — and a reconcile-on-read system is
            // mostly made of long single steps, so that is the common
            // case, not the edge. (Found by the W1 test; the first
            // version of this passed only because that test happened to
            // read her twice.)
            let fullSince = 0;
            if (full) {
              if (state.fullSince > 0) {
                fullSince = state.fullSince;
              } else if (rate > 0) {
                const daysToFull = (ceiling - state.standing) / rate;
                fullSince =
                  nowS - Math.max(0, days - daysToFull) * SECONDS_PER_GAME_DAY;
              } else {
                fullSince = nowS;
              }
            }
            const brooding =
              tap.broodAfterDays !== undefined &&
              fullSince > 0 &&
              (nowS - fullSince) / SECONDS_PER_GAME_DAY > tap.broodAfterDays;
            next[tap.key] = { ...state, standing, fullSince, brooding };
            continue;
          }

          // `continuous`: it grows and grows. What neglect costs is
          // QUALITY — ⭐ which is now RECORDED rather than inferred:
          // `worst` is the minimum condition over this fleece's growth,
          // and the shearing act stamps it onto the grade. (The
          // `_worstLimiting` shape from `Growing`, which is where the
          // idea came from.) A hot sheep is the thermal build's read off
          // the same standing mass.
          const grown = state.standing + tap.perGameDay * days * factor * open;
          next[tap.key] = {
            ...state,
            // ⭐ Past the cap the growth is simply lost — a fleece that
            // heavy has shed — and `look` says so. Absent means
            // unbounded, which is what wool meant before the cap.
            standing:
              tap.capUnits !== undefined ? Math.min(tap.capUnits, grown) : grown,
            worst: Math.min(worst, factor),
          };
        }
        this.tapState = next;
        this.productionStamp = nowS;
      } finally {
        this._reconcilingProduction = false;
      }
    }

    /**
     * ⭐ The Discipline this host asks for. Default `null` — the kernel
     * credits nothing on its own, because *what* a take teaches is the
     * host's claim and not the verb's.
     */
    public tapCredit(
      _key: string,
    ): { discipline: string; difficulty: WorkDifficulty } | null {
      return null;
    }

    /* ─────────────────── the act (Tappable) ─────────────────── */

    /**
     * ⭐⭐ What this take would be, or why not — and **nothing happens
     * here.** The order of refusals is the order a person would hit
     * them: is the tap open at all, is there anything standing, and only
     * then do you need something to put it in.
     */
    public async planTap(
      _by: Stuff,
      key: string,
      _tool: (Stuff & Tooled) | null,
      vessel: (Stuff & Bulkable) | null,
      _what: string | null,
    ): Promise<WorkPrognosis> {
      const tap = this.taps().find((t) => t.key === key);
      if (!tap) {
        return {
          kind: 'refusal',
          reason: 'no-such-tap',
          prose: (this as unknown as Stuff).getPresentation() +
            ' does not give that.',
        };
      }
      const window = this.tapWindow(key);
      if (!window.open && window.reason !== null) {
        return {
          kind: 'refusal',
          // ⭐ The reason travels as the season, so the controller can
          // tell information from refusal. None of `TapClosedReason` is
          // a failure — see its declaration.
          reason: `season-${window.reason}`,
          prose: this.tapRefusal(key, window.reason),
        };
      }
      const standing = this.standingIn(key);
      if (standing <= STANDING_EPSILON) {
        return {
          kind: 'refusal',
          reason: 'nothing-standing',
          prose: this.tapEmptyPhrase(key),
        };
      }
      // ⭐⭐ Whether a vessel is needed DERIVES from the yield shape and
      // is never a second flag: litres have to go somewhere, a count
      // and a mass do not.
      const shape = tap.yieldShape ?? 'mass';
      if (shape === 'volume') {
        if (!vessel) {
          return {
            kind: 'refusal',
            reason: 'no-vessel',
            prose: 'You have nothing to catch it in.',
          };
        }
        const material = yieldMaterial(tap);
        if (!material) {
          return {
            kind: 'refusal',
            reason: 'no-material',
            prose: 'There is nothing to draw.',
          };
        }
        const slot = BulkableApi.slotFor(vessel, undefined);
        const held = slot?.getMaterial() ?? null;
        if (slot && held && held !== material) {
          return {
            kind: 'refusal',
            reason: 'material-mismatch',
            prose:
              'There is ' + held.getName() + ' in ' +
              vessel.getPresentation() + ' already.',
          };
        }
      }
      return {
        kind: 'plan',
        durationMs: tap.takeMs ?? defaultTakeMs(shape),
        cost: TAKE_COST,
        beginSelf: this.tapBeginPhrase(key),
        beginPeers: null,
        // ⚠ The token is the host's own bookkeeping. It carries the KEY
        // so two takes in flight cannot draw the same tap by accident,
        // and nothing outside this file reads it.
        token: { key },
      };
    }

    /**
     * Land the take: draw it, put it somewhere, and say so.
     *
     * ⚠ Re-reads the tap at completion rather than trusting the plan's
     * numbers — the interval between planning and landing is real game
     * time, and a season can close inside it.
     */
    public async completeTap(
      by: Stuff,
      key: string,
      _tool: (Stuff & Tooled) | null,
      vessel: (Stuff & Bulkable) | null,
      _token: unknown,
    ): Promise<WorkResult> {
      const tap = this.taps().find((t) => t.key === key);
      if (!tap) return { self: 'Nothing came of it.' };
      const shape = tap.yieldShape ?? 'mass';
      const standing = this.standingIn(key);
      if (standing <= STANDING_EPSILON) {
        return { self: 'Nothing came of it.' };
      }
      const take = this.takeFrom(key);
      if (take.units <= 0) return { self: 'Nothing came of it.' };

      const credit = this.tapCredit(key);
      if (shape === 'volume') {
        const kept = await this.pourTake(tap, take.units, vessel);
        return {
          self: this.tapTookPhrase(key, take.units, kept),
          peers: null,
          credit,
        };
      }
      const minted = await this.mintTake(tap, take, by, shape);
      return {
        self: this.tapTookPhrase(key, take.units, take.units, minted),
        peers: null,
        credit,
      };
    }

    /**
     * ⭐ Pour a `volume` take into the bound vessel, and return the
     * litres actually KEPT.
     *
     * ⚠ The surplus is spilled, not held back — a take always empties
     * the tap (there is no now-vs-later), so the vessel decides what you
     * keep and the difference is the completeness the scene reports.
     * That is why the refusal above asks for a vessel and this does not
     * clamp the take to fit one.
     *
     * The source is a transient unbounded receptacle, which is the
     * shipped way to put N litres of a material into a slot (the bulk
     * conjuration path uses the same three calls). ⛔ No new Api.
     */
    protected async pourTake(
      tap: TapSpec,
      units: number,
      vessel: (Stuff & Bulkable) | null,
    ): Promise<number> {
      if (!vessel) return 0;
      const material = yieldMaterial(tap);
      if (!material) return 0;
      const to = BulkableApi.slotFor(vessel, undefined);
      if (!to) return 0;
      const source = await StuffApi.clone<Stuff & Bulkable>(
        UNBOUNDED_RECEPTACLE,
      );
      try {
        source.setBulkMaterial('interior', material);
        const from = BulkableApi.slotFor(source, undefined);
        if (!from) return 0;
        const result = BulkableApi.transfer(from, to, {
          kind: 'measure',
          litres: units,
          mode: 'lenient',
        });
        return result.applied ?? 0;
      } finally {
        StuffApi.destruct(source);
      }
    }

    /**
     * Mint a `mass` or `count` take into the taker's hands.
     *
     * ⭐ `count` mints `floor(units)` separate objects — the Rob frame
     * precedent — so each one is a perishable `Provision` a recipe can
     * ask for by the item. `mass` sets the mass on one object, and
     * stamps the fleece's year onto its grade when the host recorded
     * one.
     */
    protected async mintTake(
      tap: TapSpec,
      take: TapTake,
      by: Stuff,
      shape: 'mass' | 'count',
    ): Promise<Stuff[]> {
      const made: Stuff[] = [];
      const n = shape === 'count' ? Math.floor(take.units) : 1;
      for (let i = 0; i < n; i++) {
        let thing: Stuff;
        try {
          thing = await StuffApi.clone<Stuff>(tap.yieldRow);
        } catch {
          break;
        }
        if (shape === 'mass') {
          const host = thing as unknown as {
            setMass?(q: Quantity<'kg'>): void;
            setQuantity?(n: number): void;
          };
          host.setMass?.(Quantity.of(round2(take.units), 'kg'));
          // ⭐ A stackable yield also carries its count, which is what
          // makes `spin fleece` reach a charge (W3/D10).
          host.setQuantity?.(Math.max(1, Math.round(take.units)));
          // ⭐⭐ The fleece's YEAR lands on the grade here, and this is
          // the only place it can: `worst` leaves with the take and the
          // host resets it, so a later reader would find nothing.
          if (take.worst < 1 && MixinApi.isGraded(thing)) {
            thing.setGradeBand(gradeFromWorst(take.worst));
          }
        }
        if (MixinApi.isContainer(by) && MixinApi.isContainable(thing)) {
          ContainmentApi.move(thing, by);
        }
        made.push(thing);
      }
      return made;
    }

    /* ─────────────── the words (hosts override) ─────────────── */

    /** What an empty tap says. Hosts override in their own voice. */
    public tapEmptyPhrase(_key: string): string {
      return 'There is nothing to take just now.';
    }

    /** What the actor reads as the take starts. */
    public tapBeginPhrase(_key: string): string {
      return 'You settle in to the work.';
    }

    /**
     * What the actor reads when it lands.
     *
     * ⭐ `kept` vs `drawn` is the completeness the vessel decided, and
     * the sentence says so without a number when they differ — a player
     * who brought too small a pail should be told it overflowed, not
     * handed a figure.
     */
    public tapTookPhrase(
      _key: string,
      drawn: number,
      kept: number,
      minted?: Stuff[],
    ): string {
      if (minted && minted.length > 0) {
        const first = minted[0];
        const what = first ? first.getPresentation() : 'something';
        return minted.length > 1
          ? `You come away with ${minted.length} of them.`
          : `You come away with ${what}.`;
      }
      if (kept <= 0) return 'It runs away to nothing before you can catch it.';
      if (kept < drawn - STANDING_EPSILON) {
        return 'You catch what you can; the rest goes on the ground.';
      }
      return 'You come away with the lot.';
    }

    /** Open a state for each authored tap at first touch. */
    private seedTaps(nowS: number): void {
      const next: Record<string, TapState> = { ...this.tapState };
      for (const tap of this.taps()) {
        if (!next[tap.key]) next[tap.key] = seedState(nowS);
      }
      this.tapState = next;
    }
  };
}

/** Below this, a tap counts as empty. Guards float dust, not a dial. */
const STANDING_EPSILON = 0.01;

/**
 * Endurance one take costs a fresh body, in percentage points.
 *
 * ⭐ One figure for every take, deliberately: milking, shearing, robbing
 * and tapping are all *bending over something for a while*, and pricing
 * them apart would be inventing a difference the player cannot see.
 */
const TAKE_COST = 4;

/**
 * ⚠ The literal, not a `TemplatePaths` key — the bulk-conjuration path
 * in `MagicLogic` names it the same way, and adding a key for a second
 * caller is the kind of registry growth the paths file exists to avoid.
 */
const UNBOUNDED_RECEPTACLE = '/platform/thing/UnboundedReceptacle';

/**
 * How long a take occupies the hands when the spec says nothing, in
 * real ms. Grain, and shaped by what you are doing rather than by what
 * you are taking it from: litres come at the rate they come, a count is
 * picked up, a mass is cut off.
 */
function defaultTakeMs(shape: 'mass' | 'volume' | 'count'): number {
  return shape === 'volume' ? 10_000 : shape === 'count' ? 2_000 : 20_000;
}

/**
 * The material a `volume` tap yields.
 *
 * ⚠ For a `volume` tap `yieldRow` names a **MATERIAL**, not a thing
 * row — the vessel is the object, so there is nothing to clone. Stated
 * on `TapSpec.yieldShape` too, because it is the one place the field's
 * meaning changes with another field's value.
 */
function yieldMaterial(tap: TapSpec): Material | null {
  return StuffApi.findByTemplatePath<Material>(tap.yieldRow) ?? null;
}

/**
 * ⭐ The fleece's year as a grade band. The plant-side rule verbatim:
 * the WORST stretch decides, because a break is a weak point wherever
 * in the year it fell.
 */
function gradeFromWorst(worst: number): GradeBand {
  if (worst >= 0.9) return 'exceptional';
  if (worst >= 0.75) return 'fine';
  if (worst >= 0.5) return 'fair';
  return 'poor';
}

/** Two decimal places — a yield is weighed, not measured to the gram. */
function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

/**
 * ⭐ Where the `expire` look-bands sit, as a fraction of the window
 * elapsed since the last take. Grain.
 *
 * ⚠ This is how AC 8 is met — *going off is visible before it is lost*
 * — and it is DERIVED, holding no state of its own: the one number milk
 * was ever about is how long it has been since somebody came.
 */
const OVERDUE_BAND = 0.55;
const LATE_BAND = 0.85;

const OPEN: TapWindowRead = { open: true, reason: null };

function seedState(nowS: number): TapState {
  return {
    standing: 0,
    lastTaken: nowS,
    driedOff: false,
    worst: 1,
    brooding: false,
    fullSince: 0,
  };
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/**
 * Daylength as a fraction of the rotation, or null pre-boot.
 *
 * ⚠ The SYNC twin: `CelestialApi.daylightFractionAt` is async only
 * because it awaits a zone field guarded to `EARTH_LIKE` anyway, and a
 * reconcile-on-read cannot await. The shipped readers (`Field`, the
 * breeding window) take the same shortcut for the same reason.
 */
function daylightFraction(offsetS = 0): number | null {
  const now = nowSeconds();
  if (now === null) return null;
  const seconds = CelestialApi.daylightSecondsFor(
    EARTH_LIKE,
    CelestialApi.CAMPUS_LATITUDE,
    now + offsetS,
  );
  return seconds / EARTH_LIKE.dayLengthSeconds;
}

/**
 * Is `day` inside `[from, to]`? ⚠ A WRAPPING band is legal — the
 * `breedsAtDaylight` shape — so a winter season authored `[0.9, 0.1]`
 * reads as one band rather than an empty one.
 */
function inBand(day: number, from: number, to: number): boolean {
  return from <= to ? day >= from && day <= to : day >= from || day <= to;
}

/**
 * Which side of a closed season we are on, in the only terms a player
 * cares about: is it coming, or is it gone? ⭐ Below the opener is
 * *not yet*; above it is *over* — which is what makes the curtain
 * sentence ("the run is over for the year") land at the right moment.
 */
function seasonSide(day: number, from: number): TapClosedReason {
  return day < from ? 'before-season' : 'after-season';
}

/** Game-seconds now, or null when no world clock (pre-boot / tests). */
function nowSeconds(): number | null {
  if (!StuffApi.findByTemplatePath(TemplatePaths.worldClockRegistry)) return null;
  return WorldClockApi.getNow().rawValue();
}
