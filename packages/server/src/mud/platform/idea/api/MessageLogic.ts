// MessageLogic — the hot-reloadable logic singleton behind MessageApi.
// (Doc comment lives on the class declaration below so @internal lands
// on the reflection TypeDoc emits, not on the module.)

import { ApiLogic } from "../../../lib/stuff/ApiLogic";
import { CallSecurity, Unshadowable } from "../../../lib/security/decorators";
import { SecurityPolicies } from "../../../lib/security/SecurityPolicies";
import type { Stuff } from "../../../lib/stuff/Stuff";
import type { Sensor } from "../../../lib/message/Sensor";
import type { Container } from "../../../lib/spatial/Container";
import type { Containable } from "../../../lib/spatial/Containable";
import type {
  EnvelopeTemplate,
  FeedDestination,
  FeedPredicate,
  MessageFrame,
  RoutingRule,
  StuffRef,
  TopicDescriptor,
} from "@saxonberg/types";
import { CATCH_ALL_RULE } from "@saxonberg/types";
import { MixinApi } from "../../../api/mixin";
import { StuffApi } from "../../../api/stuff";
import { Scene } from "../../../lib/message/Scene";
import type { MessageBroadcastOptions } from "../../../api/message";
import type TopicCatalogue from "../TopicCatalogue";

type SensorStuff = Stuff & Sensor;

const MessageApiCallers = SecurityPolicies.AnyOf(
  SecurityPolicies.FromModule("/api/message#MessageApi"),
  SecurityPolicies.SelfOnly
);

/**
 * MessageLogic — the hot-reloadable logic singleton behind
 * {@link MessageApi}.
 *
 * Holds the outbound message routing primitives — `refOf`, the `scene`
 * factory, sensor enumeration, the lone `sendMessage` / `sendEnvelope`
 * delivery chokepoints, and the `messageContents` / `messageContainer`
 * broadcast wrappers. Lives at `/platform/idea/api/message`; `MessageApi`'s
 * statics forward here via `StuffApi.singletonSync`. `dest
 * /platform/idea/api/message` reloads it.
 *
 * The `Tags` audience constants stay on the `MessageApi` face (frame
 * metadata, not logic); the `Scene` composer is a value class re-
 * exported by the face and is not wrapped here.
 *
 * Gating (the guts-variant recipe): every public method carries
 * `AnyOf(FromModule('/api/message#MessageApi'), SelfOnly)`.
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
export class MessageLogic extends ApiLogic {
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
      sensor.onMessage(frame);
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
      "/platform/idea/TopicCatalogue"
    );
    return cat ? cat.isCommunicative(topic) : false;
  }

  /** See {@link MessageApi.feedsFor}. */
  @CallSecurity(MessageApiCallers)
  public feedsFor(
    topic: string,
    rules: readonly RoutingRule[]
  ): FeedDestination[] {
    const cat = StuffApi.findByTemplatePath<TopicCatalogue>(
      "/platform/idea/TopicCatalogue"
    );
    /*
     * ⚠ An unwarmed catalogue is not a reason to drop a frame. Before
     * boot completes there are no facets to match on, so every rule
     * falls through to the catch-all — which is precisely the state the
     * catch-all exists to cover. Failing OPEN here and closed anywhere
     * else would be backwards: a lost frame is the expensive mistake.
     */
    const facets = cat?.getDescriptor(topic);
    return routeFrame(topic, facets, rules);
  }
}

/**
 * Walk the ordered table and collect the destinations.
 *
 * A module-private free function: it holds no state, and an
 * intra-singleton `this.x()` would have to satisfy the external gate
 * for no benefit (the `DiagnosticLogic` shape).
 *
 * ⚠⚠ The **catch-all is appended here**, not stored with the player's
 * rules. Storing it would make it something a client could delete by
 * writing the clientState key directly, and "every frame lands
 * somewhere" is not a default — it is an invariant.
 */
function routeFrame(
  topic: string,
  facets: TopicDescriptor | undefined,
  rules: readonly RoutingRule[]
): FeedDestination[] {
  const out: FeedDestination[] = [];
  for (const rule of [...rules, CATCH_ALL_RULE]) {
    if (!predicateMatches(rule.when, topic, facets)) continue;
    if (!out.includes(rule.to)) out.push(rule.to);
    // ⭐ `move` stops; `copy` keeps going. That single asymmetry is what
    // lets a tell reach Attention AND still land in World.
    if (rule.disposition === "move") break;
  }
  return out;
}

/**
 * Every field present must match (AND). An empty predicate matches
 * everything, which is what makes the catch-all a rule rather than a
 * special case in the walk.
 */
function predicateMatches(
  when: FeedPredicate,
  topic: string,
  facets: TopicDescriptor | undefined
): boolean {
  if (when.address !== undefined && facets?.address !== when.address) {
    return false;
  }
  if (when.actor !== undefined && facets?.actor !== when.actor) return false;
  if (when.weight !== undefined && facets?.weight !== when.weight) return false;
  if (when.topic !== undefined && !topicMatches(topic, when.topic)) {
    return false;
  }
  return true;
}

/**
 * The one TREE operation in the predicate language: an exact leaf, or a
 * `*`-suffixed prefix.
 *
 * ⚠ Both halves are needed and neither replaces the other. Facets fix
 * cross-cutting queries (*everything that matters*); only the tree
 * fixes subtree containment (*everything about speech*), which is a
 * prefix operation no facet can express.
 */
function topicMatches(topic: string, pattern: string): boolean {
  if (!pattern.endsWith("*")) return topic === pattern;
  const prefix = pattern.slice(0, -1);
  return topic === prefix.replace(/\.$/, "") || topic.startsWith(prefix);
}
