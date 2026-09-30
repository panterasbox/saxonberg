/**
 * ColonyMixin — ⭐⭐ **the colony IS the organism.**
 *
 * Not a herd of insects you draft one out of, and not a box with a
 * number on it: a single living thing with a strength, a queen, stores of
 * honey and pollen, and a temper you find out by putting your hands on
 * it. The individual bee is below the resolution anything in this game
 * acts at — you never name one, never handle one, never treat one — so
 * the population is the body and the arithmetic is the metabolism.
 *
 * Two hosts compose it and they are the only honest two:
 *
 *   - **`Hive`** — a colony in a box. It has an interior volume, a wall
 *     whose conductivity decides what a winter costs, capped comb to rob,
 *     and a lid you open.
 *   - **`Colony`** — bees with no box: a swarm hanging in a tree, a
 *     nucleus on a shelf, a split in your hands. Strength, queen and
 *     temper; **no stores**, because stores are comb and comb is in a
 *     box. That is what the `storesKg` / `storesCapacityKg` /
 *     `consumeStores` hooks express, rather than a guard.
 *
 * ⚠ Everything here is **derived, never drawn**. The swarm decision, the
 * absconding, the starvation and the sting count are all functions of
 * state and elapsed game-time; the one place a choice is needed (which
 * body part a sting finds) is SEEDED off the host's own identity, which
 * is the field pattern and not a die.
 *
 * ⚠⚠ **Read-triggered and sync**, like the growth model it is shaped
 * after: every public read reconciles first, the integration is
 * rates × days in one step, and the one edge that needs an `await` (what
 * the temperature is outside) is a promise-coalesced cache whose
 * unresolved value reads as MILD. An unresolved hive must never freeze
 * and must never burn.
 */

import type {
  MixinConstructor,
  FieldMeta,
} from '@saxonberg/server/mud/lib/mixin';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Container } from '@saxonberg/server/mud/lib/spatial/Container';
import type Species from '@saxonberg/server/mud/platform/idea/species/Species';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import type { Containable } from '@saxonberg/server/mud/lib/spatial/Containable';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import { AppApi } from '@saxonberg/server/mud/api/app';
import { BiomeApi } from '@saxonberg/server/mud/api/biome';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { ConditionApi } from '@saxonberg/server/mud/api/condition';
import { Mml } from '@saxonberg/server/mud/api/mml';
import { HazardDelivery } from '@saxonberg/server/mud/lib/hazard/HazardDelivery';
import { TemplatePaths } from '@saxonberg/server/mud/lib/paths';

export const COLONY_MIXIN = 'ColonyMixin';

/** The Discipline this trade credits. */
export const APICULTURE = 'apiculture';

/**
 * ⭐⭐ **The gap ladder** — where a sting gets you, in the order bees
 * actually find you: the face first (they go for the head), then the
 * hands you are working with, then up the arms, then the body.
 *
 * ⚠ It is walked from a **seeded** start index, never a draw: a colony's
 * own identity plus how many times it has been disturbed decides where
 * this session's stings land. That is the field pattern — *roll to decide
 * what the world IS, never what your action DID* — and it means the same
 * hive worked the same way twice gets you in the same places, which is
 * how you learn to cover them.
 *
 * ⭐ A `body.head.face` key slots in FIRST the day the body plan grows
 * one; until then the head is the honest approximation and the veil
 * covers the head slot.
 */
const GAP_LADDER = [
  'body.head',
  'body.arm.left.hand',
  'body.arm.right.hand',
  'body.arm.left',
  'body.arm.right',
  'body.torso',
  'body.leg.left',
  'body.leg.right',
] as const;

/** The hand slots a biped holds a smoker in. */
const HAND_SLOTS = ['hand:left', 'hand:right'] as const;

/** What disturbing a colony did to the person who disturbed it. */
export interface StingReport {
  /** How many stings actually got through. */
  landed: number;
  /** Whether the actor was working with lit smoke. */
  smoked: boolean;
  /** The scene beat, when there was anything to say. */
  prelude?: { self: ReturnType<typeof Mml.compose>; peers: ReturnType<typeof Mml.compose> };
}

const SECONDS_PER_GAME_DAY = 86_400;

/** Containment hops the outside-temperature walk climbs before giving up. */
const MAX_AMBIENT_HOPS = 8;

/**
 * What the last thing that happened to this colony was, in one word, for
 * the reading to name. `''` is *nothing worth mentioning*.
 */
export type ColonyEvent = '' | 'swarmed' | 'absconded' | 'starved' | 'requeened';

/** The public surface a colony offers. */
export interface Colonial {
  reconcileColony(): void;
  getStrength(): number;
  getPollenKg(): number;
  hasLiveQueen(): boolean;
  getLastEvent(): ColonyEvent;
  getDisturbCount(): number;
  /** Kelvin outside, or the mild default while the walk is unresolved. */
  outsideK(): number;
  /** Whether it is warm enough for bees to fly at all. */
  flyingWeather(): boolean;
}

/**
 * ⚠ **The base constraint IS the composition requirement.** A colony has
 * to sit on an Organism: its species is what the taps and the handling
 * range are read from, so a colony with no species would be a class that
 * has to know a row. Saying it in the type rather than as a runtime
 * refusal means a wrong composition does not compile.
 */
type ColonyBase = Stuff & { getSpecies(): Species | null };

export function ColonyMixin<TBase extends MixinConstructor<ColonyBase>>(
  Base: TBase,
) {
  return class ColonyMixin extends Base implements Colonial {
    static _mixinName = COLONY_MIXIN;

    static _mixinRefusal = "{} is not a colony of bees";

    static fieldMeta: FieldMeta = {
      strength: { persistent: true, authorable: true },
      pollenKg: { persistent: true, authorable: true },
      hasQueen: { persistent: true, authorable: true },
      queenlessSince: { persistent: true },
      starvingSince: { persistent: true },
      colonyStamp: { persistent: true },
      disturbCount: { persistent: true },
      _lastEvent: { persistent: true },
      _outsideK: { persistent: true, runtimeState: true },
      _pendingSwarmAt: { persistent: true },
      _pendingSwarmStrength: { persistent: true },
      _pendingSwarmHandling: { persistent: true },
    };

    /**
     * ⭐ **The population, `[0, 1]`** — and it is a fraction rather than
     * a count of bees on purpose. Nothing in the game ever needs the
     * count, and a count would invite a number in the reading, which
     * AC 2 forbids: you look at the door and see a trickle or bees
     * stacked up on the board.
     */
    public strength = 0;

    /** Stored pollen, kg. Brood food — honey is the fuel, this is the meat. */
    public pollenKg = 0;

    /** Whether there is a laying queen. Without one it dwindles. */
    public hasQueen = false;

    /** Game-seconds the queen was lost, or 0. Requeening reads it. */
    public queenlessSince = 0;

    /** Game-seconds the stores ran out, or 0. Abscond/death read it. */
    public starvingSince = 0;

    /** Game-seconds stamp of the last colony reconcile. */
    public colonyStamp = 0;

    /** How many times it has been disturbed. Temper and the sting seed. */
    public disturbCount = 0;

    /** The last event, for the reading to name. */
    public _lastEvent: ColonyEvent = '';

    /**
     * Kelvin outside this colony, or `-1` unresolved.
     *
     * ⚠⚠ **The tri-state, and it is load-bearing twice over.** `-1`
     * reads as MILD (see {@link outsideK}), so a colony whose walk has
     * not run yet neither freezes nor burns stores against the cold. A
     * cache nothing warms reading a hard default forever is a failure
     * this codebase has had three times; resolving unknown to "cold"
     * would kill every hive on the first read after a restart.
     */
    public _outsideK = -1;

    /** A swarm that has left and not yet been given a body; 0 = none. */
    public _pendingSwarmAt = 0;
    public _pendingSwarmStrength = 0;
    public _pendingSwarmHandling = 0;

    /** The in-flight outside-temperature resolve — coalesces callers. */
    private _outsidePromise: Promise<void> | null = null;

    /** The in-flight departure settle — coalesces callers. */
    private _departurePromise: Promise<void> | null = null;

    protected _reconcilingColony = false;

    // ---------- the hooks a host answers for its own stores ----------

    /**
     * @hook Kilograms of honey this colony has to live on. **Zero for a
     * colony with no box**, which is not a limitation but the fact: a
     * swarm hanging in a tree is carrying what it ate before it left.
     */
    protected storesKg(): number {
      return 0;
    }

    /** @hook How much comb there is to fill. Zero without a box. */
    protected storesCapacityKg(): number {
      return 0;
    }

    /** @hook Spend `kg` of stores. A no-op where there are none. */
    protected consumeStores(kg: number): void {
      void kg;
    }

    /**
     * @hook The heat-loss coefficient of whatever this colony is living
     * in, W/K. ⭐ Zero for a boxless swarm, and that is why a swarm is not
     * something you overwinter: with no envelope there is nothing to
     * compute, and the arithmetic says so rather than a rule saying so.
     */
    protected lossCoefficientWperK(): number {
      return 0;
    }

    // ---------- the reads ----------

    public getStrength(): number {
      this.reconcileColony();
      return clamp01(this.strength);
    }

    public getPollenKg(): number {
      this.reconcileColony();
      return Math.max(0, this.pollenKg);
    }

    public hasLiveQueen(): boolean {
      this.reconcileColony();
      return this.hasQueen;
    }

    public getLastEvent(): ColonyEvent {
      this.reconcileColony();
      return this._lastEvent;
    }

    public getDisturbCount(): number {
      return this.disturbCount;
    }

    /** True while this colony holds bees at all. */
    public isOccupied(): boolean {
      this.reconcileColony();
      return this.strength > 0;
    }

    /**
     * ⭐ **A vacant box has no species**, which is how
     * `ProducingMixin.taps()` comes back empty and nothing accrues into
     * an empty hive. The alternative — a `strength > 0` guard inside the
     * production reconcile — would be the guard that tells you the state
     * is in the wrong place.
     */
    public getSpecies(): Species | null {
      if (this.strength <= 0 && !this.hasQueen) return null;
      return (super.getSpecies as () => Species | null).call(this);
    }

    public outsideK(): number {
      if (this._outsideK < 0) {
        void this.restampOutside();
        return this.dial('apiculture.mildK', 293);
      }
      return this._outsideK;
    }

    public flyingWeather(): boolean {
      return this.outsideK() >= this.dial('apiculture.flightK', 283);
    }

    /**
     * Resolve the temperature outside this colony — the one `await`,
     * kept off the read path, holding the PROMISE rather than a boolean
     * so a second caller coalesces onto the first. The shape
     * `Growing.restampWarmth` established.
     *
     * ⭐ It walks OUTWARD by containment, so a hive in a shed reads the
     * shed's air and the shed's own envelope answers for the shed. The
     * hive never has to know whether it is indoors.
     */
    public restampOutside(): Promise<void> {
      const inFlight = this._outsidePromise;
      if (inFlight !== null) return inFlight;
      const started = this.resolveOutside();
      this._outsidePromise = started;
      return started;
    }

    private async resolveOutside(): Promise<void> {
      try {
        const self = this as unknown as Stuff;
        if (!MixinApi.isContainable(self)) return;
        let env: Stuff | null = self.getContainer();
        for (let hops = 0; hops < MAX_AMBIENT_HOPS && env !== null; hops++) {
          if (MixinApi.isContainer(env)) {
            const k = await BiomeApi.resolveTemperatureFor(
              env as Stuff & Container,
            );
            const value = k?.rawValue();
            if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
              this._outsideK = value;
              return;
            }
          }
          env = MixinApi.isContainable(env) ? env.getContainer() : null;
        }
      } catch {
        // ⚠ A failed walk leaves it UNRESOLVED rather than resolving it
        // to something. Unknown must never read as cold.
      } finally {
        this._outsidePromise = null;
      }
    }

    /** Re-resolve the outside when the colony is carried somewhere. */
    public noteColonyMoved(): void {
      this._outsideK = -1;
      void this.restampOutside();
    }

    // ---------- the clock ----------

    /**
     * ⭐⭐ **The winter equation, and it is the whole reason the hive is
     * a Vessel.**
     *
     * A wintering colony is a warm body inside a box: it holds a cluster
     * at brood temperature, the box leaks at its own coefficient, and the
     * honey is the fuel it pays the difference with.
     *
     * ```
     * U        = the box's heat-loss coefficient          (W/K)
     * P        = U · max(0, clusterK − outsideK) · coupling  (W)
     * burnKg   = (maintenance · strength + P·86400/honeyJPerKg) · days
     * ```
     *
     * ⭐ Nothing here is authored per hive. A thick-walled box needs less
     * honey than a thin one because a thick wall has a lower `U`, which
     * is the same arithmetic the buildings use — so the epoch ladder
     * (skep → thin box → thick box) is two numbers on a row and no code
     * at all, and a player who works out that a warmer box costs less
     * honey has worked out something true.
     *
     * `coupling` is below 1 because a cluster is not the whole interior:
     * the bees heat themselves, not the box, and the entrance's leak is
     * folded in here rather than modelled as an opening.
     *
     * ⚠ **No far-past guard**, deliberately, exactly as the taps have
     * none: a kept colony's clock runs while its keeper is away, and
     * what an absence costs is a season, a swarm, or — if it was already
     * starving in the cold — the colony. That is the cost the build
     * exists to make real, and a guard would refund it.
     */
    public reconcileColony(): void {
      if (this._reconcilingColony) return;
      const nowS = this.nowGameSeconds();
      if (nowS === null) return;
      if (this.colonyStamp === 0) {
        this.colonyStamp = nowS;
        if (this._outsideK < 0) void this.restampOutside();
        return;
      }
      const elapsed = nowS - this.colonyStamp;
      if (elapsed <= 0) {
        this.colonyStamp = nowS;
        return;
      }
      this._reconcilingColony = true;
      try {
        this.colonyStamp = nowS;
        const days = elapsed / SECONDS_PER_GAME_DAY;
        if (this.strength <= 0 && !this.hasQueen) return;

        const outside = this.outsideK();
        const flightK = this.dial('apiculture.flightK', 283);
        const broodSeason = outside >= flightK;

        // ---- what it eats ----
        const clusterK = broodSeason
          ? this.dial('apiculture.broodClusterK', 308)
          : this.dial('apiculture.winterClusterK', 293);
        const u = this.lossCoefficientWperK();
        const watts =
          u *
          Math.max(0, clusterK - outside) *
          this.dial('apiculture.coupling', 0.35);
        const honeyJPerKg = this.dial('apiculture.honeyJPerKg', 12_500_000);
        const burnKg =
          (this.dial('apiculture.maintenanceKgPerDay', 0.04) * this.strength +
            (watts * SECONDS_PER_GAME_DAY) / honeyJPerKg) *
          days;
        if (burnKg > 0) this.consumeStores(burnKg);

        // ---- what it gathers, and what the brood eats ----
        const forage = broodSeason ? this.colonyForageFactor() : 0;
        // ⭐ …and what it leaves behind. Pollination is a CONSEQUENCE of
        // working the range, so it is paid here rather than being a
        // second mechanism with its own clock.
        if (broodSeason) this.repayForage(days);
        this.pollenKg = Math.max(
          0,
          this.pollenKg +
            this.dial('apiculture.pollenPerDay', 0.03) * forage * days -
            this.dial('apiculture.broodPollenPerDay', 0.02) * this.strength * days,
        );

        // ---- what it becomes ----
        const stores = this.storesKg();
        const honeyOk = stores > 0 ? 1 : 0;
        const pollenOk = this.pollenKg > 0 ? 1 : 0;
        const queenOk = this.hasQueen ? 1 : 0;
        this.strength = clamp01(
          this.strength +
            this.dial('apiculture.growthPerDay', 0.02) *
              Math.min(honeyOk, pollenOk, queenOk) *
              days -
            this.dial('apiculture.attritionPerDay', 0.004) * days,
        );

        // ---- the queen ----
        if (!this.hasQueen && this.queenlessSince > 0) {
          const queenlessDays =
            (nowS - this.queenlessSince) / SECONDS_PER_GAME_DAY;
          if (queenlessDays >= this.dial('apiculture.requeenDays', 21)) {
            if (this.strength >= this.dial('apiculture.requeenFloor', 0.25)) {
              // ⭐ They raise one themselves. This is why a split works
              // at all, and why a swarm does not end the parent colony.
              this.hasQueen = true;
              this.queenlessSince = 0;
              this._lastEvent = 'requeened';
            } else {
              // Too few left to get a queen mated; it dwindles away.
              this.strength = 0;
            }
          }
        }

        this.settleDearth(nowS, stores, flightK, outside);
        this.considerSwarm(nowS, forage);
      } finally {
        this._reconcilingColony = false;
      }
    }

    /**
     * ⭐⭐ **Out of stores has two different endings, and which one you
     * get is the weather.**
     *
     * In flying weather they **abscond**: the whole colony walks out and
     * goes looking for somewhere better, and the box is simply empty.
     * Nothing died, nothing is owed, and AC 14 is exactly this — you come
     * back to an empty box and the honest answer is *they left*.
     *
     * In the cold they **starve**, because there is nowhere to go. That
     * is the one place in this build where neglect kills something, and
     * it is the one place where it should: taking all the honey in
     * autumn is a decision with a spring in it.
     */
    private settleDearth(
      nowS: number,
      stores: number,
      flightK: number,
      outside: number,
    ): void {
      if (stores > 0) {
        this.starvingSince = 0;
        return;
      }
      if (this.strength <= 0) return;
      if (this.starvingSince === 0) {
        this.starvingSince = nowS;
        return;
      }
      const dearthDays = (nowS - this.starvingSince) / SECONDS_PER_GAME_DAY;
      if (outside >= flightK) {
        if (dearthDays >= this.dial('apiculture.abscondDays', 3)) {
          this.strength = 0;
          this.hasQueen = false;
          this.pollenKg = 0;
          this.starvingSince = 0;
          // ⚠ `lifecycleState` is deliberately NOT set to 'dead'.
          // Nothing died — they left.
          this._lastEvent = 'absconded';
        }
        return;
      }
      if (dearthDays >= this.dial('apiculture.starveDays', 5)) {
        this.strength = 0;
        this.hasQueen = false;
        this.pollenKg = 0;
        this.starvingSince = 0;
        this._lastEvent = 'starved';
        const self = this as unknown as Stuff;
        if (MixinApi.isOrganism(self)) self.setLifecycleState('dead');
      }
    }

    /**
     * ⭐⭐ **A colony swarms because it filled its room in a flow** — not
     * on a timer and not on a roll.
     *
     * Strong, queened, stores near the top of the comb it has, and a
     * flow on: that is the whole condition, and every term is something
     * the keeper can act on. Giving them another box is what stops it,
     * which is why supering in time is a real decision rather than a
     * maintenance chore (AC 6).
     *
     * ⚠ It is NOT brain-shaped. A brain is conduct emitted on channels by
     * a Behaved host with cadence timers; this is arithmetic on a record,
     * which is the growth model's shape and reconciles correctly across
     * an absence.
     */
    private considerSwarm(nowS: number, forage: number): void {
      const capacity = this.storesCapacityKg();
      if (capacity <= 0) return; // a boxless swarm does not swarm again
      if (!this.hasQueen) return;
      if (this.strength < this.dial('apiculture.swarmStrength', 0.85)) return;
      if (this.storesKg() < this.dial('apiculture.swarmFullness', 0.85) * capacity)
        return;
      if (forage <= this.dial('apiculture.swarmFlowFloor', 0.3)) return;

      const handling = (
        this as unknown as { getHandling?(): number }
      ).getHandling?.() ?? 0.4;
      // Half of them go with the old queen; the rest raise a new one.
      this.strength = this.strength * 0.5;
      this.hasQueen = false;
      this.queenlessSince = nowS;
      this._pendingSwarmAt = nowS;
      this._pendingSwarmStrength = this.strength;
      this._pendingSwarmHandling = handling;
      this._lastEvent = 'swarmed';
      void this.settleDepartures();
    }

    /**
     * Give a departed swarm a body — a `Colony` Thing hanging where it
     * left, so it can be found, looked at and boxed.
     *
     * ⭐ It hangs for a day and then it is gone: a keeper who is present
     * catches their own swarm, and one who is not loses half a colony to
     * the woods. The reading still says it swarmed, so you find out what
     * happened either way.
     */
    public settleDepartures(): Promise<void> {
      const inFlight = this._departurePromise;
      if (inFlight !== null) return inFlight;
      const started = this.mintDeparture();
      this._departurePromise = started;
      return started;
    }

    private async mintDeparture(): Promise<void> {
      try {
        const at = this._pendingSwarmAt;
        if (at <= 0) return;
        const strength = this._pendingSwarmStrength;
        this._pendingSwarmAt = 0;
        this._pendingSwarmStrength = 0;
        const handling = this._pendingSwarmHandling;
        this._pendingSwarmHandling = 0;
        const nowS = this.nowGameSeconds();
        if (nowS === null || strength <= 0) return;
        const hangDays = this.dial('apiculture.swarmHangDays', 1);
        if ((nowS - at) / SECONDS_PER_GAME_DAY > hangDays) return;

        const self = this as unknown as Stuff;
        if (!MixinApi.isContainable(self)) return;
        const env = self.getContainer();
        if (env === null || !MixinApi.isContainer(env)) return;
        const swarm = await StuffApi.clone<Stuff>(
          '/trade/apiculture/thing/swarm',
        );
        const asColony = swarm as unknown as {
          strength?: number;
          hasQueen?: boolean;
          setHandling?(v: number): void;
        };
        asColony.strength = strength;
        asColony.hasQueen = true; // the old queen goes with them
        asColony.setHandling?.(handling);
        ContainmentApi.move(
          swarm as Stuff & Containable,
          env as Stuff & Container,
        );
      } catch {
        // ⚠ A swarm that cannot be minted is a swarm that got away. The
        // reading already says the colony swarmed, so nothing is silent.
      } finally {
        this._departurePromise = null;
      }
    }

    /**
     * ⭐⭐ **Disturbing a colony, and the covering is what decides.**
     *
     * Not a die and not combat. The number of attempts is a function of
     * the colony's temper, whether there is smoke, and how cold it is
     * (a cold colony is a bad-tempered one, which is true and is also
     * why you work hives on warm afternoons). Each attempt is a
     * `point`-channel delivery at a site from the seeded gap ladder, and
     * it goes through the SAME `ConditionApi.inflict` path as a dart:
     *
     *   - bare skin → a puncture, and half a unit of venom;
     *   - a woven veil on the head slot → the covering stack attenuates
     *     it and **nothing at all gets in**, wound or venom (the W1 rule,
     *     applied by the producer that knows the consent — and there is
     *     none).
     *
     * ⭐ So a veil works because it is cloth over the place the bees go
     * for, not because it is a bee veil, and nobody authored a mitigation
     * table. One sting is an annoyance well under venom's first band;
     * thirty is a medical problem, and the bands do that arithmetic
     * themselves (AC 3, AC 4).
     *
     * ⚠ A bee dies when it stings, so every landed sting costs the colony
     * a little strength. Working a hive roughly is not free.
     */
    public disturb(actor: Stuff): StingReport {
      this.reconcileColony();
      if (this.strength <= 0) return { landed: 0, smoked: false };

      const smoked = this.workingWithSmoke(actor);
      const risk =
        (this as unknown as { handlingRisk?(): number }).handlingRisk?.() ?? 0.3;
      const cold = this.outsideK() < this.dial('apiculture.crossK', 285);
      const attempts = Math.round(
        this.dial('apiculture.stingBase', 6) *
          (0.25 + risk) *
          (smoked ? this.dial('apiculture.smokeFactor', 0.15) : 1) *
          (cold ? 1.5 : 1),
      );

      this.disturbCount += 1;
      const sites: string[] = [];
      const energy = this.dial('apiculture.stingJ', 0.26);
      const dose = this.dial('apiculture.venomPerSting', 0.5);
      let landed = 0;
      const start = this.stingSeed();
      for (let i = 0; i < attempts; i++) {
        const site = GAP_LADDER[(start + i) % GAP_LADDER.length]!;
        const delivery = new HazardDelivery({
          channel: 'point',
          energy,
          siteSelector: [site],
          toxin: { type: 'venom', amount: dose },
        });
        const spec = delivery.toInflictSpec(actor);
        if (!spec) continue;
        const outcome = ConditionApi.inflict(actor, spec);
        if (!outcome.afflicted) continue;
        // ⭐ The W1 rule, applied here by hand because a colony is not a
        // trap: the dose rides the wound. A veil that turns the sting
        // turns the venom with it.
        if (MixinApi.isMetabolic(actor)) actor.introduceToxin('venom', dose);
        landed += 1;
        sites.push(site);
        this.strength = Math.max(
          0,
          this.strength - this.dial('apiculture.stingCost', 0.002),
        );
      }

      return { landed, smoked, prelude: this.stingScene(landed, sites, smoked) };
    }

    /**
     * Is there lit smoke in the actor's hands? ⭐ A **body read on the
     * actor**, not an instrument search: what matters is that you are
     * holding it and it is going, and a smoker in your pack is a smoker
     * you did not use.
     */
    private workingWithSmoke(actor: Stuff): boolean {
      if (!MixinApi.isSlotted(actor)) return false;
      for (const slot of HAND_SLOTS) {
        let held;
        try {
          held = actor.getOccupant(slot);
        } catch {
          continue;
        }
        if (!held) continue;
        const thing = held as unknown as Stuff;
        if (MixinApi.isBurner(thing) && thing.isLit()) return true;
      }
      return false;
    }

    /**
     * A stable start index for the gap ladder — the host's identity plus
     * its disturbance count. Seeded, not drawn.
     */
    private stingSeed(): number {
      const self = this as unknown as Stuff;
      const key = self.getTemplatePath() ?? '';
      let v = 0x811c9dc5;
      for (let i = 0; i < key.length; i++) {
        v ^= key.charCodeAt(i);
        v = Math.imul(v, 0x01000193) >>> 0;
      }
      return (v + this.disturbCount) % GAP_LADDER.length;
    }

    /**
     * ⭐ **The scene names what would have stopped it**, which is the
     * whole of AC 5: you cannot fight a colony, and the game has to tell
     * you what to do instead without a refusal to hang it on. So the
     * sentence carries the answer.
     */
    private stingScene(
      landed: number,
      sites: string[],
      smoked: boolean,
    ): StingReport['prelude'] {
      if (landed <= 0) {
        return {
          self: smoked
            ? Mml.compose`The smoke goes in ahead of you and they hardly notice you at all.`
            : Mml.compose`They come up around your hands and settle again. Nothing in it this time.`,
          peers: Mml.compose`Bees lift off a hive and settle back.`,
        };
      }
      const where = describeSites(sites);
      const advice = smoked
        ? 'More smoke, and slower hands.'
        : 'A veil and gloves, and smoke, is what you should have had.';
      return {
        self: Mml.compose`${countWord(landed)} ${landed === 1 ? 'gets' : 'get'} through — ${where}. ${advice}`,
        peers: Mml.compose`Bees come up off a hive in a sheet, and somebody backs away from it fast.`,
      };
    }

    /**
     * @hook How good the forage is around here, `[0, 1]`. The bare mixin
     * has no landscape read — that is the hive's, which knows where it is
     * standing — so a boxless swarm gathers at a flat middling rate.
     */
    protected colonyForageFactor(): number {
      return 0.5;
    }

    /**
     * @hook Pay the land back for the window just integrated. ⭐ A no-op
     * on the bare mixin: a swarm hanging in a tree is not working the
     * bloom, it is waiting to be somewhere. The hive overrides it, and
     * the direction of the call is the whole coupling — the plant never
     * asks who pollinated it.
     */
    protected repayForage(days: number): void {
      void days;
    }

    /**
     * A numeric AppSetting read, falling back to the seeded literal.
     *
     * ⚠ A METHOD rather than a module helper because an exported free
     * function is not a module category this project has — and a
     * module-private copy in each of the three consumer files is three
     * copies of one concept. The rates it reads are playtest dials, not
     * design decisions; the seeded fallbacks are what make the pack work
     * before its settings row installs.
     */
    protected dial(key: string, fallback: number): number {
      try {
        const raw = AppApi.setting(key);
        if (raw === '' || raw == null) return fallback;
        const n = Number.parseFloat(raw);
        return Number.isFinite(n) ? n : fallback;
      } catch {
        return fallback;
      }
    }

    /** Game-seconds now, or `null` with no world clock (pre-boot, tests). */
    protected nowGameSeconds(): number | null {
      if (!StuffApi.findByTemplatePath(TemplatePaths.worldClockRegistry)) {
        return null;
      }
      return WorldClockApi.getNow().rawValue();
    }
  };
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/** Where the stings landed, in words a person would use. */
function describeSites(sites: string[]): string {
  const words = new Set<string>();
  for (const site of sites) {
    if (site.startsWith('body.head')) words.add('one at your face');
    else if (site.endsWith('.hand')) words.add('your hands');
    else if (site.startsWith('body.arm')) words.add('up your forearms');
    else if (site.startsWith('body.leg')) words.add('through your trousers');
    else words.add('inside your collar');
  }
  const list = [...words];
  if (list.length <= 1) return list[0] ?? 'somewhere you did not expect';
  return `${list.slice(0, -1).join(', ')} and ${list[list.length - 1]}`;
}

/** Small counts read as words; anything worse reads as a lot. */
function countWord(n: number): string {
  const words = [
    'None',
    'One',
    'Two',
    'Three',
    'Four',
    'Five',
    'Six',
    'Seven',
    'Eight',
    'Nine',
  ];
  return words[n] ?? 'A great many';
}
