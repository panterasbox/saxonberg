/**
 * HazardMixin — a self-resolving trap/hazard capability (the flagship of
 * the concealment-detection consumer layer).
 *
 * A hazard is **self-contained**: it holds its own state (`armed → sprung`
 * / `disarmed`), its trigger + delivery + movement-consequence descriptors,
 * and — crucially — **its own resolution**. There is NO `HazardApi` /
 * `HazardLogic` (see docs/plans/concealment-detection-plan.md D7): the
 * powerful steps a spring orchestrates (`ConditionApi.inflict`,
 * `PerceptionApi.perceives`, the metabolism / locomotion / posture Apis)
 * are each **already gated**, so wrapping them in one more gate buys
 * nothing. This generalizes `GlassAlley.onEntered` exactly — a plain Stuff
 * method calling the gated `inflict` seam, now made reusable content.
 *
 * The taxonomy (pit / spiked-pit / dart / scythe / deadfall / snare /
 * tripwire / trapped-chest / electrified-floor) lands as **descriptor
 * fields + one {@link HazardDelivery} value-object** — no per-kind
 * subclass; a "kind" is just a field combination on the authored
 * {@link Trap} (or a `Location` / `Exit` / `Container` composing this).
 *
 * The concealment axis (how hard the trap is to notice, gated per-viewer
 * by `PerceptionApi`) rides `ConcealableMixin` (a `Trap` composes both).
 *
 * See docs/subsystems/concealment.md.
 */

import type { AbortReason } from '@saxonberg/types';
import type { MixinConstructor } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import { HazardDelivery, type HazardDeliveryOptions } from './HazardDelivery';
import {
  HazardActivity,
  HAZARD_PIN_TYPE,
} from './HazardActivity';
import { MixinApi } from '../../api/mixin';
import { MessageApi } from '../../api/message';
import { Mml } from '../../api/mml';
import { ConditionApi } from '../../api/condition';
import { AccountabilityApi } from '../../api/accountability';
import { SpeciesApi } from '../../api/species';
import { PerceptionApi } from '../../api/perception';
import { LocomotionApi } from '../../api/locomotion';
import { ContainmentApi } from '../../api/containment';
import { SchedulerApi } from '../../api/scheduler';
import { StuffApi } from '../../api/stuff';
import { AppApi } from '../../api/app';
import { AppSettingKeys } from '../config/AppSettings';
import { Postures } from '../slot/Postured';

/** The state axis — one-shot in v1 (`disarmed` is a third terminal state). */
export type HazardState = 'armed' | 'sprung' | 'disarmed';
export const HAZARD_STATES: readonly HazardState[] = [
  'armed',
  'sprung',
  'disarmed',
];

/**
 * The trigger axis. v1 handles `'traversal'` (fired at the move) and
 * `'interact'` (fired by open/pull/grab). `'proximity'` / `'timer'` /
 * `'remote'` are **reserved** descriptor values — authored-representable
 * but unhandled (no code fires them yet).
 */
export type HazardTrigger =
  | 'traversal'
  | 'interact'
  | 'proximity'
  | 'timer'
  | 'remote';

/** The movement veto/redirect a sprung traversal-hazard applies. */
export type TraverseConsequence = 'none' | 'pin' | 'trip' | 'drop';

/** Game-second fallbacks — read when AppSettings isn't warmed (tests). */
const PIN_SECONDS_FALLBACK = 6;
const DROP_FALL_ENERGY_FALLBACK = 4;

/** A hazard's outward method surface (the inter-Stuff contract). */
export interface Hazard {
  isArmed(): boolean;
  getHazardState(): HazardState;
  /** The durable id of the player who placed this hazard (`''` = authored). */
  getPlacedBy(): string;
  /** Stamp the placer's durable id (set by `arm` at deploy). */
  setPlacedBy(placer: string): void;
  getDelivery(): HazardDelivery;
  setDelivery(value: HazardDelivery | HazardDeliveryOptions): void;
  getTrigger(): HazardTrigger;
  getTraverseConsequence(): TraverseConsequence;
  isGroundTriggered(): boolean;
  getDropDestination(): string | undefined;
  /** Defuse the hazard (armed → disarmed); a no-op once sprung. */
  disarm(): void;
  /**
   * Defuse this hazard on behalf of `actor` — flip state + narrate the
   * outcome (the disarm interaction lives here, not in the command
   * controller). A no-op once sprung/disarmed.
   */
  disarmBy(actor: Stuff): void;
  /**
   * A mover has entered this hazard's locus. Springs it unless the mover
   * *avoids* it (already-discovered, actively-perceived, or clearing a
   * ground hazard by flying/swimming). `mode` is the locomotion mode name
   * (kept in the signature for the Phase-5 care↔speed attention modifier).
   */
  resolveTraversal(mover: Stuff, mode: string): void;
  /** An interact-touch (open / pull / grab) on an armed interact-hazard. */
  resolveInteract(actor: Stuff): void;
}

export function HazardMixin<TBase extends MixinConstructor>(Base: TBase) {
  return class HazardMixin extends Base implements Hazard {
    static _mixinName = 'HazardMixin';
    static persistentFields = [
      'hazardState',
      'trigger',
      'delivery',
      'traverseConsequence',
      'groundTriggered',
      'dropDestination',
      'springMessage',
      'placedBy',
    ];

    /**
     * The state axis — `'armed'` fires, `'sprung'` is spent (one-shot v1),
     * `'disarmed'` is defused. @authorable
     */
    public hazardState: HazardState = 'armed';

    /** The trigger axis. @authorable */
    public trigger: HazardTrigger = 'traversal';

    /**
     * The delivery — what/how-hard/where the spring inflicts. Constructed
     * from the authored seed value by {@link setDelivery}. Defaults to a
     * benign no-site zero-energy delivery so an un-authored hazard is
     * inert. @authorable
     */
    public delivery: HazardDelivery = new HazardDelivery({
      channel: 'blunt',
      energy: 0,
      siteSelector: [],
    });

    /** The movement veto/redirect on a traversal spring. @authorable */
    public traverseConsequence: TraverseConsequence = 'none';

    /**
     * A ground-laid contact hazard (the default) is **cleared** when the
     * mover crosses in an `air` / `water` medium (flying / swimming over
     * it). Author `false` for a hazard that catches every medium (a
     * ceiling deadfall). @authorable
     */
    public groundTriggered = true;

    /**
     * The `drop` consequence's authored "below" destination — a template
     * path to the location the mover falls into. NOT computed geometry: a
     * designer names where down is. Left unset, a `drop` inflicts the fall
     * blunt but relocates no one. @authorable
     */
    public dropDestination?: string;

    /**
     * Optional authored line the victim sees when this hazard springs (a
     * flavor override, e.g. "A poisoned needle drives up through the slab!").
     * Left blank, a generic spring line is used. Witnesses always get a
     * generic "…springs a hidden trap." @authorable
     */
    public springMessage = '';

    /**
     * The durable id (`templatePath`) of the actor who **placed** this
     * hazard, when a player deployed it via `arm`. Empty (`''`) for an
     * authored/environmental hazard (a dungeon pit — no culpable placer).
     * When set, a spring appends an `AccountabilityApi` `harm` row against
     * this placer, from which `crime` derives (harm to a non-consenting
     * sentient). Stamped at deploy; survives the placed clone's persistence
     * so the absent placer is still on the hook when the victim springs it.
     * @authorable
     */
    public placedBy = '';

    // ---------------------------------------------------------------
    // Accessors + state
    // ---------------------------------------------------------------

    public isArmed(): boolean {
      return this.hazardState === 'armed';
    }

    public getHazardState(): HazardState {
      return this.hazardState;
    }

    public getPlacedBy(): string {
      return this.placedBy;
    }

    public setPlacedBy(placer: string): void {
      this.placedBy = placer;
    }

    public setHazardState(value: HazardState): void {
      if (!HAZARD_STATES.includes(value)) {
        throw new RangeError(
          `HazardMixin.setHazardState: unknown state '${String(value)}'`,
        );
      }
      this.hazardState = value;
    }

    public getDelivery(): HazardDelivery {
      return this.delivery;
    }

    /** Normalize a raw authored value (plain object or instance). */
    public setDelivery(value: HazardDelivery | HazardDeliveryOptions): void {
      this.delivery = HazardDelivery.from(value);
    }

    public getTrigger(): HazardTrigger {
      return this.trigger;
    }

    public setTrigger(value: HazardTrigger): void {
      this.trigger = value;
    }

    public getTraverseConsequence(): TraverseConsequence {
      return this.traverseConsequence;
    }

    public setTraverseConsequence(value: TraverseConsequence): void {
      this.traverseConsequence = value;
    }

    public isGroundTriggered(): boolean {
      return this.groundTriggered;
    }

    public setGroundTriggered(value: boolean): void {
      this.groundTriggered = value;
    }

    public getDropDestination(): string | undefined {
      return this.dropDestination;
    }

    public setDropDestination(value: string | undefined): void {
      this.dropDestination = value;
    }

    public disarm(): void {
      if (this.hazardState === 'sprung') return; // spent — nothing to defuse
      this.hazardState = 'disarmed';
    }

    /**
     * Mark the hazard spent. Called at the head of a spring so a `drop`
     * consequence's forced relocation can never re-enter and re-trigger
     * this same hazard (the drop-reentrancy guard).
     */
    protected spring(): void {
      this.hazardState = 'sprung';
    }

    // ---------------------------------------------------------------
    // Resolution
    // ---------------------------------------------------------------

    public resolveTraversal(mover: Stuff, mode: string): void {
      if (!this.isArmed() || this.trigger !== 'traversal') return;
      if (this.moverAvoids(mover, mode)) return;
      // Spend it FIRST — the drop-reentrancy guard.
      this.spring();
      this.narrateSpring(mover);
      this.deliverHarm(mover);
      this.applyTraverseConsequence(mover);
    }

    public resolveInteract(actor: Stuff): void {
      if (!this.isArmed() || this.trigger !== 'interact') return;
      this.spring();
      this.narrateSpring(actor);
      this.deliverHarm(actor);
      // Interact hazards deliver harm only — no traverse veto/redirect
      // (you weren't moving; you touched it).
    }

    /**
     * Announce the spring to the victim + any witnesses. `ConditionApi.inflict`
     * is silent (it only mutates the body state), so without this a player
     * walks into a trap, takes the wound, and sees nothing — the feedback
     * beat a trap needs. The victim gets the authored `springMessage` if set,
     * else a generic line; witnesses always get a generic one.
     */
    private narrateSpring(victim: Stuff): void {
      const authored = this.springMessage.trim();
      MessageApi.scene(victim)
        .topic('world.hazard.spring')
        .toSelf(
          authored
            ? Mml.fromMarkup(authored)
            : Mml.compose`Something gives way beneath you — a hidden trap springs!`
        )
        .toPeers(Mml.compose`${Mml.name(victim)} springs a hidden trap.`)
        .send();
    }

    /**
     * Defuse this hazard on behalf of `actor`: flip it to `disarmed` and
     * narrate the outcome. The disarm *interaction* is a side effect of the
     * hazard's own identity, so it lives here on the interface (symmetric
     * with {@link narrateSpring}) rather than in the command controller,
     * which owns only the command machinery (target resolution, the
     * found/armed gates, the costed activity, the actor's advancement deed).
     * No-op if already sprung/disarmed.
     */
    public disarmBy(actor: Stuff): void {
      if (!this.isArmed()) return;
      this.disarm();
      const self = this as unknown as Stuff;
      MessageApi.scene(actor)
        .topic('world.hazard.disarm')
        .toSelf(Mml.compose`You defuse ${Mml.object(self)}.`)
        .toPeers(Mml.compose`${Mml.name(actor)} defuses ${Mml.object(self)}.`)
        .send();
    }

    /**
     * Does the mover step *around* this hazard? True iff they've already
     * discovered it, actively perceive it now, or a ground hazard is
     * cleared by their air/water medium (fly/swim over it).
     */
    private moverAvoids(mover: Stuff, mode: string): boolean {
      const self = this as unknown as Stuff;
      if (PerceptionApi.hasDiscovered(mover, self)) return true;
      // The care↔speed axis (D8): the mode's attention modifier folds into
      // the perceive check — sneaking raises traverse-time perception (avoids
      // a trap a walk would spring), running lowers it (springs one a walk
      // avoids). `walk` and every other mode contribute the passive baseline.
      if (PerceptionApi.perceives(mover, self, PerceptionApi.modeAttention(mode)))
        return true;
      if (this.groundTriggered && this.clearedByMedium(mode)) return true;
      return false;
    }

    /** A ground hazard is cleared when the mode's medium is air or water. */
    private clearedByMedium(mode: string): boolean {
      const medium = LocomotionApi.modeOf(mode)?.getMedium();
      return medium === 'air' || medium === 'water';
    }

    /** Inflict the delivery's wound (armor mitigates free) + inject toxin. */
    private deliverHarm(mover: Stuff): void {
      const spec = this.delivery.toInflictSpec(mover);
      if (spec) ConditionApi.inflict(mover, spec);
      if (this.delivery.hasToxin() && MixinApi.isMetabolic(mover)) {
        const toxin = this.delivery.getToxin();
        if (toxin) mover.introduceToxin(toxin.type, toxin.amount);
      }
      this.noteHarmAccountability(mover);
    }

    /**
     * A **player-placed** trap that harms a mover appends one `harm` row to
     * the unified accountability ledger — co-located with the `inflict`
     * chokepoint (the producer that knows the consent: a snare is never
     * consented to). `crime` derives from it iff the victim was a
     * non-consenting sentient. An authored/environmental hazard (`placedBy
     * === ''`) has no culpable placer and appends nothing — an unlucky
     * dungeon pit is not a crime.
     */
    private noteHarmAccountability(mover: Stuff): void {
      const placer = this.placedBy;
      if (!placer) return;
      const victimId = mover.getTemplatePath();
      if (!victimId) return;
      const self = this as unknown as Stuff;
      let sentient = false;
      try {
        sentient = SpeciesApi.isSentient(mover);
      } catch {
        sentient = false;
      }
      AccountabilityApi.record({
        kind: 'harm',
        sessionId: `trap:${self.stuffId}`,
        initiator: placer,
        opponent: victimId,
        victim: victimId,
        killer: placer,
        consented: false,
        sentient,
      });
    }

    private applyTraverseConsequence(mover: Stuff): void {
      switch (this.traverseConsequence) {
        case 'pin':
          this.applyPin(mover);
          break;
        case 'trip':
          this.applyTrip(mover);
          break;
        case 'drop':
          this.applyDrop(mover);
          break;
        case 'none':
        default:
          break;
      }
    }

    /** Snare — hold the mover's `body` slot for `hazard.pinSeconds`. */
    private applyPin(mover: Stuff): void {
      if (!MixinApi.isEngaged(mover)) return;
      const activity = new HazardActivity({
        actor: mover,
        type: HAZARD_PIN_TYPE,
        durationMs: this.pinSeconds() * 1000,
        slots: ['body'],
        onComplete: (): void => {},
        onAbort: (_reason: AbortReason): void => {},
      });
      SchedulerApi.start(activity);
    }

    /** Trip — knock the mover prone (the `lie` posture). */
    private applyTrip(mover: Stuff): void {
      if (MixinApi.isPosed(mover)) mover.setPosture(Postures.Lie);
    }

    /**
     * Drop — fall into the authored "below" location, then take the fall
     * blunt on landing. `sprung` is already set (the reentrancy guard), so
     * even were the below-room itself trapped this hazard can't re-fire.
     * A fall is a vertical relocation, not a door-traverse — modeled as a
     * containment move to the authored below-location (no geometry), so it
     * never re-enters `Mobile.traverse` at all.
     */
    private applyDrop(mover: Stuff): void {
      const belowPath = this.dropDestination;
      if (belowPath && MixinApi.isContainable(mover)) {
        const below = StuffApi.findByTemplatePath(belowPath);
        if (below && MixinApi.isContainer(below)) {
          ContainmentApi.move(mover, below);
        }
      }
      // The impact on landing — a blunt fall, dial-tuned.
      const site = this.delivery.resolveSite(mover);
      const energy = this.dropFallEnergy();
      if (site && energy > 0) {
        ConditionApi.inflict(mover, { mechanism: 'blunt', site, energy });
      }
    }

    private pinSeconds(): number {
      return readDial(AppSettingKeys.hazardPinSeconds, PIN_SECONDS_FALLBACK);
    }

    private dropFallEnergy(): number {
      return readDial(
        AppSettingKeys.hazardDropFallEnergy,
        DROP_FALL_ENERGY_FALLBACK,
      );
    }
  };
}

/** Read a numeric AppSettings dial with a seeded-literal fallback. */
function readDial(key: string, fallback: number): number {
  try {
    const raw = AppApi.setting(key);
    if (raw === '' || raw == null) return fallback;
    const n = Number.parseFloat(raw);
    return Number.isFinite(n) ? n : fallback;
  } catch {
    return fallback;
  }
}
