// MessageLogic — the hot-reloadable logic singleton behind MessageApi.
// (Doc comment lives on the class declaration below so @internal lands
// on the reflection TypeDoc emits, not on the module.)

import { Idea } from "../../lib/stuff/Idea";
import { CallSecurity, Unshadowable } from "../../lib/security/decorators";
import { SecurityPolicies } from "../../lib/security/SecurityPolicies";
import type { Stuff } from "../../lib/stuff/Stuff";
import type { Sensor } from "../../lib/message/Sensor";
import type { Container } from "../../lib/spatial/Container";
import type { Containable } from "../../lib/spatial/Containable";
import type {
  EnvelopeTemplate,
  MessageFrame,
  StuffRef,
} from "@saxonberg/types";
import { MixinApi } from "../../api/mixin";
import { StuffApi } from "../../api/stuff";
import { Scene } from "../../lib/message/Scene";
import type { MessageBroadcastOptions } from "../../api/message";
import type TopicCatalogue from "../TopicCatalogue";

type SensorStuff = Stuff & Sensor;

const MessageApiCallers = SecurityPolicies.AnyOf(
  SecurityPolicies.FromModule("api/message#MessageApi"),
  SecurityPolicies.SelfOnly
);

/**
 * MessageLogic — the hot-reloadable logic singleton behind
 * {@link MessageApi}.
 *
 * Holds the outbound message routing primitives — `refOf`, the `scene`
 * factory, sensor enumeration, the lone `sendMessage` / `sendEnvelope`
 * delivery chokepoints, and the `messageContents` / `messageContainer`
 * broadcast wrappers. Lives at `/obj/api/message`; `MessageApi`'s
 * statics forward here via `StuffApi.singletonSync`. `dest
 * /obj/api/message` reloads it.
 *
 * The `Tags` audience constants stay on the `MessageApi` face (frame
 * metadata, not logic); the `Scene` composer is a value class re-
 * exported by the face and is not wrapped here.
 *
 * Gating (the guts-variant recipe): every public method carries
 * `AnyOf(FromModule('api/message#MessageApi'), SelfOnly)`.
 * `FromModule` admits the Api facade; `SelfOnly` admits the intra-
 * singleton `this.x()` self-calls (`messageContents` / `messageContainer`
 * calling `getSensors` / `sendMessage`), where the caller and target are
 * both this singleton. The gate is applied **per public method**, never
 * at the class level: a class-level default would also cover the
 * inherited `Stuff`/`Idea` framework methods the framework itself
 * invokes (whose caller is `StuffApi`, not `MessageApi`).
 *
 * @internal
 */
@Unshadowable
export class MessageLogic extends Idea {
  /** See {@link MessageApi.refOf}. */
  @CallSecurity(MessageApiCallers)
  public refOf(stuff: Stuff): StuffRef {
    const display = stuff.getPresentation();
    const ref: StuffRef = { stuffId: stuff.stuffId };
    if (display) ref.displayName = display;
    return ref;
  }

  /** See {@link MessageApi.scene}. */
  @CallSecurity(MessageApiCallers)
  public scene(actor: Stuff): Scene {
    return Scene._construct(actor);
  }

  /** See {@link MessageApi.getSensors}. */
  @CallSecurity(MessageApiCallers)
  public getSensors(container: Stuff & Container): SensorStuff[] {
    return container
      .getContents()
      .filter((obj): obj is typeof obj & Sensor => MixinApi.isSensor(obj));
  }

  /** See {@link MessageApi.sendMessage}. */
  @CallSecurity(MessageApiCallers)
  public sendMessage(recipient: SensorStuff, frame: MessageFrame): void {
    // A destroyed recipient is inert (its proxy no-ops every call), so a
    // dead sensor still reachable from a room is harmless here — no guard
    // needed. A *linkdead* recipient is live and still receives.
    recipient.onMessage(frame);
  }

  /** See {@link MessageApi.sendEnvelope}. */
  @CallSecurity(MessageApiCallers)
  public sendEnvelope(
    recipient: SensorStuff,
    template: EnvelopeTemplate
  ): void {
    recipient.onEnvelope(template);
  }

  /** See {@link MessageApi.messageContents}. */
  @CallSecurity(MessageApiCallers)
  public messageContents(
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

  /** See {@link MessageApi.messageContainer}. */
  @CallSecurity(MessageApiCallers)
  public messageContainer(
    source: Stuff & Containable,
    frame: MessageFrame,
    opts: MessageBroadcastOptions = {}
  ): void {
    const container = source.getContainer();
    if (!container) {
      console.warn("MessageApi.messageContainer: Source not in a container");
      return;
    }
    this.messageContents(container, frame, opts);
  }

  /** See {@link MessageApi.isCommunicative}. */
  @CallSecurity(MessageApiCallers)
  public isCommunicative(topic: string): boolean {
    const cat = StuffApi.findByTemplatePath<TopicCatalogue>(
      "/obj/TopicCatalogue"
    );
    return cat ? cat.isCommunicative(topic) : false;
  }
}
