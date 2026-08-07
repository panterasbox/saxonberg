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
 *
 * This Api is a thin, security-gated forwarding shell: the logic lives
 * in the hot-reloadable {@link MessageLogic} singleton at
 * `/obj/api/message`, reached synchronously via
 * `StuffApi.singletonSync`. `dest /obj/api/message` reloads it. The
 * `Tags` audience constants and the `Scene` value class stay on this
 * face (frame metadata / a composer value object, not routing logic).
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
import { StuffApi } from './stuff';
import { HotReloadApi } from './hot-reload';
import { MessageLogic } from '../obj/api/MessageLogic';
import type { Scene } from '../lib/message/Scene';
import { fileURLToPath } from 'url';
import { SecurityApi } from './security';

export { Scene } from '../lib/message/Scene';

type SensorStuff = Stuff & Sensor;

const LOGIC_PATH = '/obj/api/message';
const LOGIC_CLASS_FILE = fileURLToPath(
  new URL('../obj/api/MessageLogic', import.meta.url)
);

/** Resolve the HMR-able MessageLogic singleton (sync). */
function logic(): MessageLogic {
  return StuffApi.singletonSync(
    LOGIC_PATH,
    () =>
      new ((HotReloadApi.getCurrentExport(
        LOGIC_CLASS_FILE,
        'MessageLogic'
      ) as typeof MessageLogic | null) ?? MessageLogic)()
  );
}

/**
 * Options for low-level broadcast helpers.
 */
export interface MessageBroadcastOptions {
  exclude?: Stuff | null;
}

/**
 * Topic strings are emitted as **dotted-path string literals** at
 * call sites (e.g., `.topic('speech.vocal')`). The authored
 * source of truth for the topic vocabulary lives on per-topic YAML
 * leaf Ideas under `seeds/obj/Topic/` (loaded into the
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
    return logic().refOf(stuff);
  }

  /**
   * Begin composing a Scene. Actor identity is required; per-method
   * compositional requirements (Sensor for toSelf/toTarget; Containable
   * for toPeers; Container for toContents) are enforced by the Scene
   * builder.
   */
  static scene(actor: Stuff): Scene {
    return logic().scene(actor);
  }

  /**
   * Get all sensors (objects with SensorMixin) inside a container.
   */
  static getSensors(container: Stuff & Container): SensorStuff[] {
    return logic().getSensors(container);
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
    return logic().sendMessage(recipient, frame);
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
    return logic().sendEnvelope(recipient, template);
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
    return logic().messageContents(container, frame, opts);
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
    return logic().messageContainer(source, frame, opts);
  }

  /**
   * Whether `topic` is a **communication act** (say/whisper/shout/emote/
   * chat — the topic's data-driven `communicative` flag; NOT dm /
   * narration / system). Consulted by the renown reception gate on the
   * receive path so non-comm frames never hit the bus. `false` before the
   * `TopicCatalogue` is warmed.
   */
  static isCommunicative(topic: string): boolean {
    return logic().isCommunicative(topic);
  }
}

SecurityApi.decorateApiClass(MessageApi);
