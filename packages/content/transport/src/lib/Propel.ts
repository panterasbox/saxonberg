/**
 * Propel — ⭐ **a small boat moved by its people's effort** (river D21):
 * the engagement `paddle` starts, on the paddler's hands, until they
 * `stop`, land, or their arms give out.
 *
 * Every beat (twenty game seconds) the paddler is exerted at their pace
 * and the boat's speed through the water comes from that power against
 * the hull's drag — `v = (P·η / (½·ρ·C_d·A))^(1/3)`, `η` the part's (a
 * pole in shallows is the strongest thing there is), `A` the hull's beam
 * × draft. Over the ground:
 *
 * - **downstream** the current adds to it;
 * - **upstream** it takes away — in the channel it may take more than you
 *   make, and you lose ground (`--inside` hugs the slack along the inside
 *   of the bend);
 * - **to a bank** the stroke takes you across, and the bank decides.
 *
 * Each stroke's worth of way (a hail's length along, the width across)
 * moves the boat into the water there — the same water a swimmer's stroke
 * reaches, asked of the river's warren. Water rougher than the boat's
 * freeboard swamps it.
 *
 * ⚠ Its own clock: the effort's power is this engagement's, not the
 * body's `currentPowerW` (which fades on game seconds while breath is
 * real — respiration's recorded gap).
 */

import type { AbortReason } from '@saxonberg/types';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Engaged, EngagementSlot } from '@saxonberg/server/mud/lib/activity/Engaged';
import type { SustainedEngagement, ScheduledEmission } from '@saxonberg/server/mud/api/scheduler';
import type { Container } from '@saxonberg/server/mud/lib/spatial/Container';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { SchedulerApi } from '@saxonberg/server/mud/api/scheduler';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { Mml } from '@saxonberg/server/mud/api/mml';
import type Boat from '../thing/Boat';
import type ReachWarren from '@saxonberg/content-water/src/idea/ReachWarren';
import type { ReachWay } from '@saxonberg/content-water/src/idea/exits/ReachExit';

export const PROPEL_TYPE = 'propel';

/** One beat of paddling, game ms. */
const BEAT_GAME_MS = 20_000;
const BEAT_S = BEAT_GAME_MS / 1000;
/** A paddler's sustained pace, and a burst, W (`water.craft.paddleW`). */
const PADDLE_W = 120;
const HARD_W = 250;
/** Hull drag coefficient. */
const HULL_CD = 0.5;
/** The most a small boat makes under sail, m/s. */
const SAIL_MAX_MPS = 3;
/** Beating up a river against the wind's bends, she makes this share. */
const SAIL_BEAT_SHARE = 0.6;
/** A stroke's worth of way along the river, in hails. */
const STROKE_HAILS = 1.1;

/** Which way the paddler is driving. */
export type PropelHeading = 'upstream' | 'downstream' | 'left' | 'right' | 'place';

export interface PropelSpec {
  actor: Stuff & Engaged;
  boat: Boat;
  heading: PropelHeading;
  /** For `place`: the landing's path. */
  target?: string;
  inside: boolean;
  hard: boolean;
  water: ReachWarren;
  /**
   * ⭐ Under sail (D20, D21): the wind drives her, not arms — her speed
   * through the water is the wind's share, nobody tires, and with no wind
   * she lies becalmed.
   */
  windMps?: number;
}

export class Propel implements SustainedEngagement {
  engagementId = '';
  readonly type = PROPEL_TYPE;
  readonly actor: Stuff & Engaged;
  startedAt = 0;
  readonly slots: ReadonlySet<EngagementSlot> = new Set<EngagementSlot>(['hands']);
  readonly interruptibleBy: ReadonlySet<AbortReason> = new Set();
  readonly cancelable = true;
  readonly emissions: readonly ScheduledEmission[];

  private readonly boat: Boat;
  private readonly heading: PropelHeading;
  private readonly target: string;
  private readonly inside: boolean;
  private readonly hard: boolean;
  private readonly water: ReachWarren;
  /** The wind she sails on, m/s; `null` when her people drive her. */
  private readonly windMps: number | null;
  /** Metres made toward the next stroke's worth. */
  private progress = 0;
  private ended = false;
  private busy = false;
  private toldLosing = false;
  private toldTired = false;

  constructor(spec: PropelSpec) {
    this.actor = spec.actor;
    this.boat = spec.boat;
    this.heading = spec.heading;
    this.target = spec.target ?? '';
    this.inside = spec.inside;
    this.hard = spec.hard;
    this.water = spec.water;
    this.windMps = typeof spec.windMps === 'number' ? spec.windMps : null;
    this.emissions = [{ intervalMs: BEAT_GAME_MS, event: () => void this.beat() }];
  }

  onStart(): void {
    this.startedAt = Date.now();
  }

  onAbort(_reason: AbortReason): void {
    this.ended = true;
  }

  /** The boat: its destruction ends the paddling. */
  getHost(): Stuff | null {
    return this.boat as unknown as Stuff;
  }

  private tell(text: string): void {
    try {
      MessageApi.scene(this.actor).topic('act.deed').toSelf(Mml.compose`${text}`).send();
    } catch {
      /* decoration */
    }
  }

  private end(text?: string): void {
    if (text) this.tell(text);
    this.ended = true;
    SchedulerApi.cancel(this, 'preconditions-changed');
  }

  /** One beat of effort (see the header). */
  private async beat(): Promise<void> {
    if (this.ended || this.busy) return;
    this.busy = true;
    try {
      await this.stroke();
    } catch (err) {
      console.warn('Propel: a stroke failed', err);
      this.end();
    } finally {
      this.busy = false;
    }
  }

  private async stroke(): Promise<void> {
    const boat = this.boat as unknown as Stuff & Container;
    if (boat.isDestroyed() || !MixinApi.isContainable(this.actor) || this.actor.getContainer() !== boat) {
      return this.end();
    }
    if (this.boat.isCapsized()) return this.end('She is upside down; there is no paddling her.');
    const part = this.windMps !== null ? this.boat.sail() : this.boat.propulsion();
    if (part === null) return this.end(this.windMps !== null ? 'She has no sail to set.' : 'There is nothing in her to paddle with.');
    const room = this.boat.getContainer();
    if (room === null) return this.end();
    const river = await this.water.riverAt(room, this.inside);
    if (river === null) return this.end('She is not on any water that goes anywhere.');

    const shallows = river.depthM <= 1;
    if (part.getNeeds() === 'bottom' && river.depthM > part.getReachM()) {
      return this.end(`You dig the ${part.getPropulsionKind()} in and it finds no bottom.`);
    }

    // The effort, and what it buys.
    let powerW = this.hard ? HARD_W : PADDLE_W;
    if (this.windMps !== null) {
      powerW = 0;
    } else if (MixinApi.isExerting(this.actor)) {
      const can = this.actor.sustainableW();
      if (powerW > can) {
        powerW = Math.max(30, can);
        if (!this.toldTired) {
          this.toldTired = true;
          this.tell('Your arms are going; you settle to what you can keep up.');
        }
      }
      this.actor.exert({ durationS: BEAT_S, powerW });
    }
    const crew = Math.max(1, this.boat.crew().length);
    const hull = this.boat.getHull();
    const area = Math.max(0.05, hull.beamM * hull.draftM);
    const eff = part.getEfficiency() * (part.getNeeds() === 'bottom' && shallows ? 1.6 : 1);
    // Under sail her way is the wind's share — a small boat on a reach
    // makes about a third of the wind's speed, and less beating up a river.
    const v = this.windMps !== null
      ? Math.min(SAIL_MAX_MPS, this.windMps * eff * (this.heading === 'upstream' ? SAIL_BEAT_SHARE : 1))
      : Math.cbrt((powerW * crew * eff) / (0.5 * 1000 * HULL_CD * area));

    // The water rougher than her freeboard swamps her.
    const wave = river.roughness * 0.6;
    if (wave > this.boat.freeboardNowM()) {
      this.boat.capsize('White water comes in over the side, and over the other.');
      return this.end();
    }

    const cur = river.currentMps;
    const hail = MixinApi.isMovingPlace(room) ? room.hailRangeM() : 100;
    let gain: number;
    let need: number;
    let way: ReachWay;
    switch (this.heading) {
      case 'downstream':
        gain = (v + Math.max(0, cur)) * BEAT_S;
        need = hail * STROKE_HAILS;
        way = 'downstream';
        break;
      case 'upstream':
        gain = (v - cur) * BEAT_S;
        need = hail * STROKE_HAILS;
        way = 'upstream';
        if (gain <= 0) {
          if (!this.toldLosing) {
            this.toldLosing = true;
            this.tell('You dig and dig and the bank goes by the wrong way: the current is stronger than you are here.');
          }
          return;
        }
        break;
      default:
        gain = v * BEAT_S;
        need = 30;
        way = this.heading === 'place' ? 'place' : this.heading;
    }
    this.progress += gain;
    if (this.progress < need) return;
    this.progress = 0;

    if (this.heading === 'place') {
      const landing = await StuffApi.singleton<Stuff>(this.target);
      const into = await this.water.launchPlaceFor(landing);
      if (into === null) return this.end('There is nowhere there to bring her in.');
      ContainmentApi.move(boat as never, into);
      return this.end(`You bring her in to ${landing.getPresentation()}, and she grounds gently.`);
    }
    const refusal = await this.water.refusalOf(room, way, this.actor);
    if (refusal !== null) return this.end(refusal);
    const dest = await this.water.destinationOf(room, way);
    ContainmentApi.move(boat as never, dest);
    if (this.heading === 'left' || this.heading === 'right') {
      return this.end('You bring her in to the bank, and she grounds.');
    }
  }
}
