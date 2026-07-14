/**
 * Scene — the multi-audience message composer (a `lib/message/` value
 * object).
 *
 * Built via `MessageApi.scene(actor)` (its author-facing face); the
 * private constructor admits no other entry. Queue per-audience frames
 * with the fluent `.toSelf` / `.toTarget` / `.toPeers` / `.toContents`
 * methods, then `.send()` composes each frame, stamps commandId /
 * causingCommandId from the ambient ExecutionContext, and dispatches
 * through `MessageApi`'s routing primitives.
 *
 * Composition (Mml) and recipient selection live here; the frame-shape
 * and routing decisions stay in `MessageApi`.
 */

import type { Stuff } from '../stuff/Stuff';
import type { Sensor } from './Sensor';
import type { Container } from '../spatial/Container';
import type { MessageFrame } from '@saxonberg/types';
import { SecurityApi } from '../../api/security';
import { MixinApi } from '../../api/mixin';
import { ExecutionContextApi } from '../../api/execution-context';
import { Mml } from '../../api/mml';
import { MessageApi } from '../../api/message';
import { AudienceGather } from '../perception/AudienceGather';
import { Sound } from '../perception/Sound';

/**
 * What a producer passes to `.toSelf` / `.toTarget` / `.toPeers` /
 * `.toContents`. Plain string is treated as raw markup-already (parity
 * with how content was authored before the redesign — but new code
 * should use Mml).
 */
type Body = Mml | string;

interface AudienceFrame {
  recipientKind: 'self' | 'target' | 'peers' | 'contents' | 'audible';
  body: Body;
  payload?: unknown;
  // Per-audience override of the audience: tag.
  audience: 'actor' | 'target' | 'witness';
  target?: Stuff & Sensor;
  // 'audible' only: short noun phrase ("whistle") used to compose the
  // faint directional line delivered to reached-but-not-same-room
  // sensors ("From the north, a faint whistle.").
  descriptor?: string;
}

/**
 * Compose multi-audience messages with one `.send()` call. Built via
 * `MessageApi.scene(actor)`; private constructor — no other entry.
 */
export class Scene {
  // Vendor-internal sentinel; the only constructor caller is
  // `MessageApi.scene`. Forces every external caller through that
  // factory (which stamps the ambient ExecutionContext at compose
  // time).
  static readonly #sentinel = Symbol('scene-construct');

  #actor: Stuff;
  #topic: string | null = null;
  #modality: string | null = null;
  #extraMeta: Partial<MessageFrame['meta']> = {};
  #sharedTags: string[] = [];
  #sharedPayload: unknown = undefined;
  #frames: AudienceFrame[] = [];

  /** @internal — only `MessageApi.scene` may call. */
  constructor(actor: Stuff, sentinel: symbol) {
    if (sentinel !== Scene.#sentinel) {
      throw new Error('Scene is constructed via MessageApi.scene(actor) only');
    }
    this.#actor = actor;
  }

  /** @internal — used by MessageApi.scene to bypass the sentinel. */
  static _construct(actor: Stuff): Scene {
    return new Scene(actor, Scene.#sentinel);
  }

  /** Set the topic. Required before `.send()`. */
  topic(path: string): this {
    this.#topic = path;
    return this;
  }

  /**
   * Stamp the perception-modality attribution on every composed
   * frame's `meta.modality`. Used by sensory producers
   * (`VocalMixin.say` → `'hearing'`, `AetherMixin.tell` →
   * `'verbal-esp'`) so reception-side gating at
   * `SensorMixin.filterMessage` can drop frames whose modality
   * isn't in the recipient's sensorium. System / log / narrative
   * frames omit this call and deliver unconditionally.
   */
  modality(name: string): this {
    this.#modality = name;
    return this;
  }

  /**
   * Stamp additional `meta` fields on every composed frame. Used for
   * cross-cutting non-modality meta like `acousticDb` (sound source
   * amplitude, drives propagation reach) and `channelId` (channel
   * attribution for chat / multi-party DM frames). Merges with whatever
   * the framework otherwise stamps (`timestamp`, `commandId`,
   * `causingCommandId`, `modality`). Successive calls accumulate.
   */
  meta(partial: Partial<MessageFrame['meta']>): this {
    Object.assign(this.#extraMeta, partial);
    return this;
  }

  /** Append shared tags. Merged with per-audience auto-tags. */
  tags(tags: string[]): this {
    this.#sharedTags.push(...tags);
    return this;
  }

  /** Set a shared payload — applied to any audience that doesn't override. */
  payload(p: unknown): this {
    this.#sharedPayload = p;
    return this;
  }

  /**
   * Frame for the actor. Requires the actor to be a Sensor (else throws
   * — composition error, not user-input error).
   */
  toSelf(body: Body, payload?: unknown): this {
    if (!MixinApi.isSensor(this.#actor)) {
      throw new Error(
        'Scene.toSelf requires the actor to be a Sensor'
      );
    }
    this.#assertNoDuplicate('self');
    this.#frames.push({
      recipientKind: 'self',
      audience: 'actor',
      body,
      payload,
      target: this.#actor,
    });
    return this;
  }

  /**
   * Frame for an explicit target. Throws if the target isn't a Sensor.
   */
  toTarget(target: Stuff, body: Body, payload?: unknown): this {
    if (!MixinApi.isSensor(target)) {
      throw new Error('Scene.toTarget requires the target to be a Sensor');
    }
    this.#assertNoDuplicate('target');
    this.#frames.push({
      recipientKind: 'target',
      audience: 'target',
      body,
      payload,
      target,
    });
    return this;
  }

  /**
   * Frame for everyone in the actor's environment except the actor and
   * any explicit target. Requires the actor to be Containable.
   */
  toPeers(body: Body, payload?: unknown): this {
    if (!MixinApi.isContainable(this.#actor)) {
      throw new Error(
        'Scene.toPeers requires the actor to be Containable'
      );
    }
    this.#assertNoDuplicate('peers');
    this.#frames.push({
      recipientKind: 'peers',
      audience: 'witness',
      body,
      payload,
    });
    return this;
  }

  /**
   * Frame for everyone inside the actor's contents (excluding the
   * actor itself). Requires the actor to be a Container — used when
   * the actor IS the place (haunted location, ambient narrator).
   */
  toContents(body: Body, payload?: unknown): this {
    if (!MixinApi.isContainer(this.#actor)) {
      throw new Error(
        'Scene.toContents requires the actor to be a Container'
      );
    }
    this.#assertNoDuplicate('contents');
    this.#frames.push({
      recipientKind: 'contents',
      audience: 'witness',
      body,
      payload,
    });
    return this;
  }

  /**
   * Discrete-event cross-room sound push. Unlike `.toPeers` (the
   * actor's one room), this fans one attenuated, directional frame to
   * every hearing sensor the sound reaches — same room plus adjacent
   * rooms, blocked by closed doors, faded by distance — via the
   * audience-gather walk over the shipped acoustic graph.
   *
   * The source level is read from `.meta({ acousticDb })` at `.send()`
   * time (finally making that seam live); the per-recipient threshold
   * drop uses `Sound.DEFAULT_HEARING_THRESHOLD_DB`. `body` is the
   * same-room full body; `opts.descriptor` is the short noun phrase for
   * the faint directional line delivered to farther rooms. Stamp
   * `.modality('hearing')` so no-hearing sensors are dropped by the
   * existing sensorium gate. Requires the actor to be Containable (it
   * must sit somewhere in the world).
   */
  toAudible(body: Body, opts?: { descriptor?: string }): this {
    if (!MixinApi.isContainable(this.#actor)) {
      throw new Error('Scene.toAudible requires the actor to be Containable');
    }
    this.#assertNoDuplicate('audible');
    this.#frames.push({
      recipientKind: 'audible',
      audience: 'witness',
      body,
      descriptor: opts?.descriptor,
    });
    return this;
  }

  /**
   * Compose every queued audience frame, stamp commandId /
   * causingCommandId from the ambient ExecutionContext, and dispatch.
   */
  send(): void {
    if (this.#topic === null) {
      throw new Error('Scene.send() requires a topic');
    }
    if (this.#frames.length === 0) return;

    const cmdCtx = ExecutionContextApi.getCurrentCommandContext();
    const commandId = cmdCtx?.commandId;
    const causingCommandId =
      ExecutionContextApi.getCurrentCausingCommandId() ?? undefined;

    const explicitTarget = this.#frames.find(
      (f) => f.recipientKind === 'target'
    )?.target;
    const actorAsContainable = MixinApi.isContainable(this.#actor)
      ? this.#actor
      : null;
    const actorAsContainer = MixinApi.isContainer(this.#actor)
      ? this.#actor
      : null;

    for (const af of this.#frames) {
      const tags = [`audience:${af.audience}`, ...this.#sharedTags];
      const payload = af.payload ?? this.#sharedPayload;

      // Build a fresh frame per recipient. The body is materialized
      // against the recipient as the `viewer` so any per-recipient
      // `toMml(viewer)` (Quantity, future pedagogical-seam-aware
      // values) sees the right reader.
      const buildFrame = (recipient: Stuff & Sensor): MessageFrame => {
        const meta: MessageFrame['meta'] = { timestamp: Date.now() };
        if (commandId !== undefined) meta.commandId = commandId;
        if (causingCommandId !== undefined) meta.causingCommandId = causingCommandId;
        if (this.#modality !== null) meta.modality = this.#modality;
        Object.assign(meta, this.#extraMeta);
        const body =
          af.body instanceof Mml ? af.body.toString(recipient) : af.body;
        const frame: MessageFrame = {
          id: SecurityApi.uuid(),
          topic: this.#topic!,
          tags,
          body,
          meta,
        };
        if (payload !== undefined) frame.payload = payload;
        return frame;
      };

      switch (af.recipientKind) {
        case 'self': {
          const recipient = af.target!;
          MessageApi.sendMessage(recipient, buildFrame(recipient));
          break;
        }
        case 'target': {
          const recipient = af.target!;
          MessageApi.sendMessage(recipient, buildFrame(recipient));
          break;
        }
        case 'peers': {
          if (!actorAsContainable) break;
          const env = actorAsContainable.getContainer();
          if (!env) break;
          const skip = new Set<Stuff>([this.#actor]);
          if (explicitTarget) skip.add(explicitTarget);
          for (const sensor of MessageApi.getSensors(env)) {
            if (skip.has(sensor as Stuff)) continue;
            MessageApi.sendMessage(sensor, buildFrame(sensor));
          }
          break;
        }
        case 'contents': {
          if (!actorAsContainer) break;
          for (const sensor of MessageApi.getSensors(actorAsContainer)) {
            if ((sensor as Stuff) === this.#actor) continue;
            MessageApi.sendMessage(sensor, buildFrame(sensor));
          }
          break;
        }
        case 'audible': {
          const sourceLoc = enclosingLocation(this.#actor);
          if (!sourceLoc) break;
          const sourceDb = this.#extraMeta.acousticDb;
          if (typeof sourceDb !== 'number' || !Number.isFinite(sourceDb)) {
            break;
          }
          for (const arrival of AudienceGather.gather(sourceLoc, sourceDb)) {
            if (arrival.db < Sound.DEFAULT_HEARING_THRESHOLD_DB) continue;
            // Same-room (direction null) → the full body via buildFrame;
            // a reached farther room → a faint directional line.
            const frame = buildFrame(arrival.sensor);
            if (arrival.direction !== null) {
              frame.body = composeFaint(
                af.descriptor,
                arrival.direction,
                sourceDb,
                arrival.db,
              ).toString(arrival.sensor);
            }
            MessageApi.sendMessage(arrival.sensor, frame);
          }
          break;
        }
      }
    }
  }

  #assertNoDuplicate(kind: AudienceFrame['recipientKind']): void {
    if (this.#frames.some((f) => f.recipientKind === kind)) {
      throw new Error(
        `Scene already has a .to${capitalize(kind)} frame; multiple ` +
          `frames of the same kind are not allowed`
      );
    }
  }
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * The room a Stuff sits in: walk up the container chain while each hop
 * is Containable, returning the first Container that is not (a
 * Location). Resolves the true source room even when the emitter is a
 * carried object (a whistle in a hand propagates from the room, not the
 * hand). Mirrors the container-chain walk in `Containable.canEvict`.
 * Returns the actor itself when it is already a non-Containable
 * Container (a humming room). `null` when placeless.
 */
function enclosingLocation(start: Stuff): (Stuff & Container) | null {
  let cur: Stuff | null = start;
  while (cur !== null) {
    if (MixinApi.isContainable(cur)) {
      cur = cur.getContainer();
    } else if (MixinApi.isContainer(cur)) {
      return cur;
    } else {
      return null;
    }
  }
  return null;
}

/**
 * The faint directional line for a sound reaching a room past its
 * source ("From the north, a faint whistle."). Fades the adjective by
 * how much level was lost: within ~35 dB of source → "faint", beyond →
 * "distant".
 */
function composeFaint(
  descriptor: string | undefined,
  direction: string,
  sourceDb: number,
  deliveredDb: number,
): Mml {
  const noun = descriptor && descriptor.length > 0 ? descriptor : 'sound';
  const adjective = sourceDb - deliveredDb >= 35 ? 'distant' : 'faint';
  return Mml.compose`From the ${direction}, a ${adjective} ${noun}.`;
}
