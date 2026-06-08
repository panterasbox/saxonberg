/**
 * MessageApi — outbound message routing + the public Scene composer.
 *
 * Public surface:
 *   - `MessageApi.scene(actor)` → fluent Scene builder for multi-audience
 *     composition with auto-stamped commandId/causingCommandId.
 *   - `MessageApi.Tags` → audience tag string constants for
 *     topic and tag values.
 *   - `MessageApi.refOf(stuff)` → wire-safe StuffRef.
 *   - `MessageApi.getSensors`, `messageContents`, `messageContainer`
 *     — low-level routing primitives. Scene.send() reuses these.
 *
 * Frame-shape and routing decisions live here. Composition (Mml) and
 * recipient selection (Scene's .toX methods) are layered on top of
 * the routing primitives, which stay generic ("deliver this object
 * to every Sensor inside this Container").
 */

import type { Stuff } from '../lib/stuff/Stuff';
import type { Sensor } from '../lib/message/Sensor';
import type { Container } from '../lib/spatial/Container';
import type { Containable } from '../lib/spatial/Containable';
import type {
  EnvelopeTemplate,
  MessageFrame,
  StuffRef,
} from '@saxonberg/types';
import { nanoid } from 'nanoid';
import { MixinApi } from './mixin';
import { SecurityApi } from './security';
import { DescribeApi } from './describe';
import { ExecutionContextApi } from './execution-context';
import { Mml } from './mml';

type SensorStuff = Stuff & Sensor;

/**
 * Options for low-level broadcast helpers.
 */
export interface MessageBroadcastOptions {
  exclude?: Stuff | null;
}

/**
 * What a producer passes to `.toSelf` / `.toTarget` / `.toPeers` /
 * `.toContents`. Plain string is treated as raw markup-already (parity
 * with how content was authored before the redesign — but new code
 * should use Mml).
 */
type Body = Mml | string;

interface AudienceFrame {
  recipientKind: 'self' | 'target' | 'peers' | 'contents';
  body: Body;
  payload?: unknown;
  // Per-audience override of the audience: tag.
  audience: 'actor' | 'target' | 'witness';
  target?: Stuff & Sensor;
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
        const body =
          af.body instanceof Mml ? af.body.toString(recipient) : af.body;
        const frame: MessageFrame = {
          id: nanoid(),
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
 * Topic strings are emitted as **dotted-path string literals** at
 * call sites (e.g., `.topic('world.speech.say')`). The authored
 * source of truth for the topic vocabulary lives on per-topic YAML
 * leaf Ideas under `seeds/lib/messaging/Topic/` (loaded into the
 * `TopicCatalogue` singleton at boot — see
 * `docs/subsystems/topics.md`). Keeping a parallel `TOPICS` constant
 * tree in code led to the same data living in two places; the tree
 * has been retired in favor of literals.
 *
 * Audience tags stay constants because they're not authored content —
 * they're framework-defined frame metadata.
 */

const TAGS = {
  Audience: {
    Actor: 'audience:actor',
    Target: 'audience:target',
    Witness: 'audience:witness',
    Bystander: 'audience:bystander',
  },
} as const;

/**
 * Message distribution and Scene factory.
 */
export class MessageApi {
  static readonly Tags = TAGS;

  /**
   * Wrap a Stuff in a wire-safe reference. Display name is resolved
   * server-side at compose time so the wire payload doesn't depend on
   * a re-resolution step on the client.
   */
  static refOf(stuff: Stuff): StuffRef {
    const display = DescribeApi.getDisplayName(stuff);
    const ref: StuffRef = { stuffId: stuff.stuffId };
    if (display) ref.displayName = display;
    return ref;
  }

  /**
   * Begin composing a Scene. Actor identity is required; per-method
   * compositional requirements (Sensor for toSelf/toTarget; Containable
   * for toPeers; Container for toContents) are enforced by the Scene
   * builder.
   */
  static scene(actor: Stuff): Scene {
    return Scene._construct(actor);
  }

  /**
   * Get all sensors (objects with SensorMixin) inside a container.
   */
  static getSensors(container: Stuff & Container): SensorStuff[] {
    return container.getContents().filter((obj): obj is typeof obj & Sensor =>
      MixinApi.isSensor(obj)
    );
  }

  /**
   * Lone delivery chokepoint — every routing helper here, every
   * Scene.send dispatch, and every MudlogApi emit goes through this
   * function. Non-MessageApi code MUST NOT call `sensor.onMessage`
   * directly: the chokepoint is where future cross-cutting concerns
   * (audit trail, debug logging, bus-level taps per §10.5, wire-
   * level filters, etc.) hook in exactly once.
   */
  static sendMessage(recipient: SensorStuff, frame: MessageFrame): void {
    recipient.onMessage(frame);
  }

  /**
   * Envelope delivery chokepoint, parallel to {@link sendMessage}.
   * The envelope `template` carries no `frameId` — stamping happens
   * per-Interactive at the wire-delivery layer in
   * `Application.sendEnvelopeToInteractive`. Avatar's
   * `handleEnvelope` is what fans the template out to connected
   * Interactives; NPCs' default no-op `handleEnvelope` means an NPC
   * envelope is server-side observable (shadows, audit) but never
   * reaches a wire.
   */
  static sendEnvelope(
    recipient: SensorStuff,
    template: EnvelopeTemplate
  ): void {
    recipient.onEnvelope(template);
  }

  /**
   * Send a message to every sensor inside a container.
   *
   * Low-level primitive — caller has already chosen the container.
   * Useful when the speaker IS the container (haunted room speaking
   * to occupants).
   */
  static messageContents(
    container: Stuff & Container,
    frame: MessageFrame,
    opts: MessageBroadcastOptions = {}
  ): void {
    const exclude = opts.exclude ?? null;
    for (const sensor of this.getSensors(container)) {
      if (exclude && (sensor as Stuff) === exclude) continue;
      this.sendMessage(sensor, frame);
    }
  }

  /**
   * Send a message to all sensors in `source`'s environment.
   *
   * Convenience wrapper for the "speaker is Containable, broadcast to
   * peers in the same location" case. Drops the message with a warning if
   * `source` has no environment.
   */
  static messageContainer(
    source: Stuff & Containable,
    frame: MessageFrame,
    opts: MessageBroadcastOptions = {}
  ): void {
    const container = source.getContainer();
    if (!container) {
      console.warn('MessageApi.messageContainer: Source not in a container');
      return;
    }
    this.messageContents(container, frame, opts);
  }
}


SecurityApi.decorateApiClass(MessageApi);
