/**
 * Journey — a trip along a `Route`, as a **sustained engagement whose
 * beat is one leg**.
 *
 * Not a `DurativeActivity`: a journey's duration is not trustworthy up
 * front (a door shuts, a ford rises, a team tires), and a fixed timer
 * would lie to the player about when they arrive. So the order is a
 * command and the advance is the scheduler (logistics D4).
 *
 * ## ⭐⭐ Every beat issues the same `traverse` a player's `go` does
 *
 * This is the load-bearing rule and the reason there is no second
 * movement implementation: each leg goes through
 * `LocomotionApi.engageAround` → `Mobile.traverse`, so the mode gates,
 * `Exit.canTraverse`, the conveyance ripple and the haulage tow all run
 * on the shipped path, and **a journey cannot silently bypass a gate**.
 * The vehicle is genuinely present in every node it passes, which is
 * what makes a busy road visibly busy and an interception possible with
 * no interception system.
 *
 * ## Who moves, and who is engaged
 *
 * They are different objects, and both answers are shipped behaviour:
 *
 * | shape | the mover | how the rest follows |
 * |---|---|---|
 * | a towed rig | the **driver** — hitched | the shipped haulage tow inside `Mobile.traverse` |
 * | a barge, a coach | the **vessel** — self-propelled | the shipped conveyance ripple carries occupants |
 *
 * The engagement lives on the **driver**, because `EngagedMixin` is on
 * `Character` and because aborting must halt the vehicle. It holds the
 * **`hands`** slot only: `body`, `attention` and `voice` stay free, so a
 * driver cannot fight back and **a passenger holds no engagement at
 * all** — which is what makes an escort mechanically necessary rather
 * than merely sensible (AC7).
 *
 * ## The metronome and the score
 *
 * The framework fixes an emission's interval at start, so the beat is a
 * **one-game-minute tick** and each leg spends a budget:
 *
 * ```
 * legGameMinutes = edgeMinutes × modeFactor(mode) × loadFactor(rig)
 * ```
 *
 * A leg advances when its budget is spent, so a long edge is genuinely
 * long and a heavy wagon is genuinely slow, with one timer and no
 * rescheduling. ⚠ Everything here is **game time**: no entitlement in
 * this design may depend on the rate at which commands are processed.
 *
 * ## Arrival is a completion
 *
 * `SchedulerApi.complete`, not `cancel`. Before the logistics build a
 * sustained engagement had only one exit, so *arriving* and *being
 * stopped* were the same event in the envelope.
 *
 * See [docs/subsystems/logistics.md].
 */

import type {
  SustainedEngagement,
  ScheduledEmission,
} from '@saxonberg/server/mud/api/scheduler';
import { SchedulerApi } from '@saxonberg/server/mud/api/scheduler';
import { LocomotionApi } from '@saxonberg/server/mud/api/locomotion';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';
import { AppApi } from '@saxonberg/server/mud/api/app';
import { AppSettingKeys } from '@saxonberg/server/mud/lib/config/AppSettings';
import type { EngagementSlot, Engaged } from '@saxonberg/server/mud/lib/activity/Engaged';
import type { AbortReason } from '@saxonberg/types';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Mobile } from '@saxonberg/server/mud/lib/spatial/Mobile';
import type { Containable } from '@saxonberg/server/mud/lib/spatial/Containable';
import type { Route } from './Route';
import LaneCatalogue from '../../idea/LaneCatalogue';
import './abort-reasons';

/** The activity type key the scheduler indexes this class under. */
export const JOURNEY_TYPE = 'transport-journey';

/**
 * ⚠ **`hands` only.** `body` and `attention` stay free on purpose — see
 * the class note.
 */
const JOURNEY_SLOTS: readonly EngagementSlot[] = ['hands'];

/** One tick of the metronome, in game minutes. */
const TICK_GAME_MINUTES = 1;

/** The code-side floor under `transport.loadFactorAtCapacity`. */
const DEFAULT_LOAD_FACTOR_AT_CAPACITY = 1.5;

/** What the driver asked for when the journey was ordered. */
export interface JourneySpec {
  /** The character whose `hands` the journey holds. */
  driver: Stuff & Engaged;
  /** The rig, barge or coach being taken. */
  vehicle: Stuff;
  route: Route;
  /** The lane's `LocomotionMode` name, or `''` for the mover's default. */
  mode: string;
  catalogue: LaneCatalogue;
}

export class Journey implements SustainedEngagement {
  engagementId = '';
  readonly type = JOURNEY_TYPE;
  readonly actor: Stuff & Engaged;
  startedAt = 0;
  readonly slots = new Set<EngagementSlot>(JOURNEY_SLOTS);
  /**
   * ⚠ **Empty, deliberately — `combat` is not in it.** Being shot at
   * does not stop your wagon; stopping is the driver's own `cancel`.
   */
  readonly interruptibleBy = new Set<AbortReason>();
  readonly cancelable = true;
  readonly emissions: readonly ScheduledEmission[];

  readonly route: Route;
  private readonly vehicle: Stuff;
  private readonly mode: string;
  private readonly catalogue: LaneCatalogue;

  /** How many legs are behind us — the index into `route.nodes`. */
  private legIndex = 0;
  /** Game minutes spent on the current leg. */
  private spent = 0;
  /** The current leg's budget, `null` until the first tick resolves it. */
  private budget: number | null = null;
  /** Re-entrancy guard: a slow traverse must not overlap the next tick. */
  private beating = false;
  private ended = false;

  constructor(spec: JourneySpec) {
    this.actor = spec.driver;
    this.vehicle = spec.vehicle;
    this.route = spec.route;
    this.mode = spec.mode;
    this.catalogue = spec.catalogue;
    this.emissions = [
      {
        // Game seconds, not real ones: the framework divides by 1000 and
        // schedules on the world clock.
        intervalMs: TICK_GAME_MINUTES * 60 * 1000,
        event: () => {
          void this.tick();
        },
      },
    ];
  }

  onStart(): void {
    this.startedAt = Date.now();
  }

  onAbort(_reason: AbortReason): void {
    // Idempotent teardown. ⚠ Nothing is rewound: a journey that stops
    // leaves the vehicle in the node it reached (AC6). "Where did it get
    // to" is a question the world answers, not a saved position.
    this.ended = true;
  }

  /**
   * The **vehicle**, so its destruction tears the journey down —
   * `vehicle-disabled` by way of the framework's host subscription.
   */
  getHost(): Stuff | null {
    return this.vehicle;
  }

  /* ─────────────────────────── the readout ─────────────────────────── */

  /** Where the vehicle is now, as a durable path. */
  public currentNode(): string {
    return this.route.nodes[this.legIndex] ?? '';
  }

  /** How many legs are still to come. */
  public legsRemaining(): number {
    return this.route.legsFrom(this.legIndex);
  }

  /**
   * Game minutes still to run, at the budgets the route's edges carry.
   *
   * ⚠ An **estimate**, and honestly so: it reads the edges ahead as they
   * are now, and a door that shuts later will make it wrong. Competence
   * tightens the window a reader is shown; it never shortens the trip.
   */
  public async estimateRemainingGameMinutes(): Promise<number> {
    const last = this.route.nodes.length - 1;
    if (this.legIndex >= last) return 0;
    // The current leg's remainder — its budget is not resolved until the
    // first tick, so an estimate asked before departure resolves it here.
    const current = this.budget ?? (await this.budgetFor(this.legIndex));
    let total = Math.max(0, current - this.spent);
    for (let i = this.legIndex + 1; i < last; i += 1) {
      total += await this.budgetFor(i);
    }
    return total;
  }

  /* ─────────────────────────── the beat ─────────────────────────── */

  /**
   * One tick of the metronome. Spends a game minute; advances a leg when
   * the current budget is used up.
   */
  private async tick(): Promise<void> {
    if (this.ended || this.beating) return;
    this.beating = true;
    try {
      if (this.budget === null) this.budget = await this.budgetFor(this.legIndex);
      this.spent += TICK_GAME_MINUTES;
      if (this.spent < this.budget) return;
      await this.advance();
    } finally {
      this.beating = false;
    }
  }

  /** Travel one leg — or refuse it, and say which way it failed. */
  private async advance(): Promise<void> {
    const from = this.route.nodes[this.legIndex];
    const to = this.route.nodes[this.legIndex + 1];
    if (from === undefined || to === undefined) {
      this.finish();
      return;
    }

    // ⚠ The transaction boundary is PER LEG (D4): everything is
    // re-validated here, immediately before the step, because a journey
    // that checked once at the start would drive through a door somebody
    // shut an hour ago.
    const mover = this.mover();
    if (!mover) {
      SchedulerApi.cancel(this, 'vehicle-disabled');
      return;
    }
    const exit = await LaneCatalogue.exitBetween(from, to);
    if (!exit || exit.isBlocked()) {
      SchedulerApi.cancel(this, 'route-blocked');
      return;
    }

    try {
      // ⭐ The same call a player's `go` makes. Nothing here moves
      // anything itself.
      if (this.mode) {
        const mode = await LocomotionApi.loadMode(this.mode);
        await LocomotionApi.engageAround(mover, mode, exit, () =>
          mover.traverse(exit, mode.getName()),
        );
      } else {
        await LocomotionApi.traverseWithDefault(mover, exit);
      }
    } catch {
      // A gate refused mid-route. The vehicle stays where it is.
      SchedulerApi.cancel(this, 'route-blocked');
      return;
    }

    this.legIndex += 1;
    this.spent = 0;
    this.budget = null;
    if (this.legsRemaining() === 0) this.finish();
  }

  /** Arrival — a completion, never an abort. */
  private finish(): void {
    if (this.ended) return;
    this.ended = true;
    try {
      // ⚠ Guarded on `isSensor`, and this is not defensive padding: the
      // `hauls` brain drives journeys with NPC carters, and an NPC has
      // no sensorium. Unguarded, EVERY background haul's arrival would
      // throw — swallowed by the emission's guard, but filing a
      // diagnostic on every completed run in the realm. The shipped
      // `sendCompletedEnvelope` asks the same question for the same
      // reason.
      const driver = this.actor as unknown as Stuff;
      if (MixinApi.isSensor(driver)) {
        MessageApi.scene(driver)
          .topic('act.move')
          .toSelf(Mml.compose`You arrive, and the journey is over.`)
          .send();
      }
    } finally {
      // ⚠ In a `finally`. A driver whose narration fails must not be
      // left holding the reins of a journey that has already ended —
      // the hands would never come free and no verb would say why.
      SchedulerApi.complete(this);
    }
  }

  /**
   * The Mobile that actually traverses: the **vehicle** when it is
   * self-propelled, else the **driver**, who is hitched to a towed rig.
   * See the class note's table. `null` means the journey has lost its
   * vehicle — `vehicle-disabled`.
   */
  private mover(): (Stuff & Mobile & Containable) | null {
    const vehicle = this.vehicle;
    if (vehicle.isDestroyed()) return null;
    if (MixinApi.isMobile(vehicle) && MixinApi.isContainable(vehicle)) {
      return vehicle as Stuff & Mobile & Containable;
    }
    // ⭐ A towed rig moves because the driver is HITCHED TO IT, so the
    // hitch is the journey's own precondition — and checking it here is
    // what makes the shipped **breakaway** gate legible: an overloaded
    // rig that comes off the hitch mid-route ends the journey with a
    // reason that names the vehicle, rather than the driver walking on
    // alone with the cargo standing in the road behind them.
    const driver = this.actor as unknown as Stuff;
    if (!MixinApi.isMobile(driver) || !MixinApi.isContainable(driver)) {
      return null;
    }
    if (!MixinApi.isHauling(driver) || driver.getHauledCart() !== vehicle) {
      return null;
    }
    return driver as Stuff & Mobile & Containable;
  }

  /**
   * The budget for the leg starting at `index`, in game minutes:
   * `edgeMinutes × modeFactor × loadFactor`.
   */
  private async budgetFor(index: number): Promise<number> {
    const from = this.route.nodes[index];
    const to = this.route.nodes[index + 1];
    if (from === undefined || to === undefined) return 0;
    const edge = await this.catalogue.edgeMinutesBetween(from, to);
    return Math.max(TICK_GAME_MINUTES, Math.round(edge * this.modeFactor() * this.loadFactor()));
  }

  /**
   * A faster mode covers the same edge in less time. Read off the
   * shipped `LocomotionMode.speed` — the multiplier that already exists
   * — so a lane's mode is the only thing that has to be authored.
   */
  private modeFactor(): number {
    if (!this.mode) return 1;
    const speed = LocomotionApi.modeOf(this.mode)?.getSpeed() ?? 1;
    return speed > 0 ? 1 / speed : 1;
  }

  /**
   * ⭐ **A heavy wagon is genuinely slower.** 1.0 empty, rising linearly
   * on the load fraction to `transport.loadFactorAtCapacity`. Read from
   * the shipped encumbrance surface — the draft load against what the
   * team can bear — so nothing new measures a cargo.
   */
  private loadFactor(): number {
    const atCapacity = numericSetting(
      AppSettingKeys.transportLoadFactorAtCapacity,
      DEFAULT_LOAD_FACTOR_AT_CAPACITY,
    );
    const fraction = this.loadFraction();
    return 1 + (atCapacity - 1) * Math.min(1, Math.max(0, fraction));
  }

  /** How full the rig is, 0..1; `0` when nothing here bears a load. */
  private loadFraction(): number {
    const bearer = this.actor as unknown as Stuff;
    if (!MixinApi.isLoadBearing(bearer)) return 0;
    const capacity = bearer.getCarryCapacity().rawValue();
    if (!(capacity > 0)) return 0;
    return bearer.getBorneBurden().rawValue() / capacity;
  }
}

/**
 * A numeric AppSetting, or the code-side floor. ⚠ Guarded because
 * `AppApi.setting` throws on an unwarmed cache — see the same note on
 * `LaneCatalogue`'s `dial`.
 */
function numericSetting(key: string, floor: number): number {
  let raw: string;
  try {
    raw = AppApi.setting(key);
  } catch {
    return floor;
  }
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : floor;
}
