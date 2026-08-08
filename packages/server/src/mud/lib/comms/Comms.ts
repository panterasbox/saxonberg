/**
 * CommsMixin — the comms capability, as a hosted *update*.
 *
 * Carries Aether transmission: the `tell` send (the `dm` / `reply` /
 * `broadcast` / `chat` verb family) and the DM cohort state. Composes
 * around a bare `Idea` (the incorporeal `CommsUpdate`, hosted on aether
 * attunement) and could equally compose around a `Thing` (the future
 * radio) — no corporeal assumption.
 *
 * **Comms transmits on behalf of its host (the operator).** A comms
 * update has no presence of its own — it is not a `Sensor`, has no name,
 * and can't be a scene speaker. `tell` resolves its operator via
 * `getHost()` (the `AetherHosted` back-ref) and routes every
 * speaker-as-actor and speaker-as-name use through the host: the
 * self-echo frame, the mention resolver, and the emitted speaker name.
 *
 * **Soft pairing with `AetherHostedMixin`.** `CommsMixin` reads
 * `getHost()`, which a co-composed `AetherHostedMixin` provides — comms
 * is always co-composed with it (on `CommsUpdate` today, and on the
 * future radio's hosted comms update). The two mixins stay orthogonal
 * (so the bound can't be expressed on the union-typed mixin
 * constructor), so `tell` reaches `getHost()` through a single
 * documented cast naming that pairing.
 *
 * Residual `AetherMixin` keeps attunement (the ESP perception
 * modalities + the host collection); it no longer carries transmission.
 * Net: **attunement = perceive the aether + host software; the comms
 * update = transmit on it.**
 */

import type { MixinConstructor } from "../mixin";
import type { Stuff } from "../stuff/Stuff";
import { MessageApi } from "../../api/message";
import { Mml } from "../../api/mml";
import type { CommandContributions } from "../../api/command";
import { InactiveCapabilityError } from "../security/RequiresActive";
import { MixinApi } from "../../api/mixin";
import { MqlApi } from "../../api/mql";
import type { CommandGiver } from "../command/CommandGiver";
import type { AetherHosted } from "../augmentation/AetherHosted";

/**
 * ⭐ `<spoiler>` is the one piece of markup a conversation admits.
 *
 * Chat is where a spoiler gets blurted — "the boss is a mimic" lands
 * in a channel long before anybody writes the article — so a
 * collapsible is worth having here, and the client already renders one
 * click-to-reveal. The APPETITE half of the reveal model is all that
 * applies: a chat line carries no authored capability level, so there
 * is nothing to gate, only something to fold.
 *
 * ⚠ `'spoiler'` and not `'inert'`, let alone `'all'`. A chat line has
 * no render pipeline behind it, and the tags a player must never be
 * able to write are the ones that ACT or CLAIM: `<link>`/`<mention>`
 * become clickables that issue commands, and `<speech>`/`<name>` are
 * identity the composer emits on the server's authority. Headings and
 * tables are merely absurd in a spoken line; those are the ones that
 * would be a hole.
 */
const CHAT_SPOILERS = { tags: 'spoiler' } as const;

export interface Comms {
  /**
   * Send a private message to one or more targets over the Aether,
   * on behalf of this update's host (the operator). Single-target
   * produces the classic `tell` rendering; multi-target stamps the
   * full cohort + optional `meta.channelId` and adds a "(also to: …)"
   * hint to per-recipient frames.
   */
  tell(
    target: Stuff | readonly Stuff[],
    text: string,
    opts?: { channelId?: string },
  ): void;

  /**
   * Most-recent cohort this update's operator addressed. Read by the
   * `dm .` pronoun verb. `null` until the operator has sent.
   */
  getLastOutboundCohort(): readonly Stuff[] | null;

  /**
   * Most-recent cohort that addressed this update's operator. For a
   * 1:1 inbound this is `[sender]`; for a multi-party DM it's
   * `[sender, ...siblings]` so a reply-all has every party. Read by
   * `reply`.
   */
  getLastInboundCohort(): readonly Stuff[] | null;

  /**
   * Stamp this update's inbound cohort. Called by the sending comms
   * update on each recipient's comms update after `tell` composes the
   * frames.
   */
  recordInboundCohort(cohort: readonly Stuff[]): void;
}

export function CommsMixin<TBase extends MixinConstructor<Stuff>>(Base: TBase) {
  class CommsMixin extends Base implements Comms {
    static _mixinName = "CommsMixin";

    /**
     * Verbs the comms capability grants. These flow into the host's
     * recency stack via the hosted-update self-seeding
     * (`CommandApi.collectHostedUpdateDefs` + `applyHostedUpdateDelta`),
     * with the comms update as `commandSource`.
     */
    static commandContributions: CommandContributions = {
      self: [
        "social/dm.yaml",
        "social/reply.yaml",
        "social/broadcast.yaml",
        "social/chat.yaml",
      ],
      peers: [],
      environment: [],
    };

    /**
     * Cohort state. Runtime-only — NOT persisted. Resets implicitly on
     * destruct (the update dies with its host). TypeScript `private`
     * per the proxy-receiver constraint.
     */
    private _lastInboundDmCohort: Stuff[] | null = null;
    private _lastOutboundDmCohort: Stuff[] | null = null;

    getLastInboundCohort(): readonly Stuff[] | null {
      return this._lastInboundDmCohort;
    }

    getLastOutboundCohort(): readonly Stuff[] | null {
      return this._lastOutboundDmCohort;
    }

    recordInboundCohort(cohort: readonly Stuff[]): void {
      this._lastInboundDmCohort = [...cohort];
    }

    tell(
      target: Stuff | readonly Stuff[],
      text: string,
      opts?: { channelId?: string },
    ): void {
      // Resolve the operator (the host this update is plugged into).
      // An unhosted comms update has no one to send as; an operator
      // that isn't an aether host can't transmit.
      // CommsMixin and AetherHostedMixin compose orthogonally, so the
      // `getHost` back-ref isn't on this mixin's own `this` type; it's
      // co-composed on the update class (CommsUpdate / the radio's
      // hosted comms). The cast names that pairing contract.
      const operator = (this as unknown as AetherHosted).getHost();
      if (!operator || !MixinApi.isAether(operator)) {
        throw new InactiveCapabilityError("AetherMixin", "tell");
      }

      const targets: readonly Stuff[] = Array.isArray(target)
        ? target
        : [target as Stuff];
      if (targets.length === 0) return;

      const parsed = Mml.markdownToMml(
        text,
        Mml.perceiverMentionResolver(operator),
        CHAT_SPOILERS,
      );
      const isMulti = targets.length > 1;
      const channelMeta = opts?.channelId ? { channelId: opts.channelId } : {};
      const recipientRefs = targets.map((t) => MessageApi.refOf(t));

      // Self-frame body. Single-target: "X → Y: msg". Multi: cohort
      // names spelled out so the operator sees who they hit.
      const selfBody = isMulti
        ? Mml.compose`${Mml.name(operator)} → ${Mml.fromMarkup(
            targets.map((t) => Mml.name(t).toString()).join(", "),
          )}: ${parsed}`
        : Mml.compose`${Mml.name(operator)} → ${Mml.name(targets[0]!)}: ${parsed}`;

      MessageApi.scene(operator)
        .topic("speech.comms")
        .modality("verbal-esp")
        .meta(channelMeta)
        .toSelf(selfBody)
        .payload(
          isMulti
            ? {
                speaker: MessageApi.refOf(operator),
                recipients: recipientRefs,
                text,
              }
            : {
                speaker: MessageApi.refOf(operator),
                target: MessageApi.refOf(targets[0]!),
                text,
              },
        )
        .send();

      // Per-target frames (one Scene per target — Scene.toTarget caps
      // at one per call; the cohort case needs N).
      for (const t of targets) {
        if (!MixinApi.isSensor(t)) continue;
        let targetBody;
        if (isMulti) {
          const others = targets
            .filter((other) => other !== t)
            .map((other) => Mml.name(other).toString())
            .join(", ");
          const cohortHint = others
            ? Mml.fromMarkup(` (also to: ${others})`)
            : Mml.fromMarkup("");
          targetBody = Mml.compose`${Mml.name(operator)} → you${cohortHint}: ${parsed}`;
        } else {
          targetBody = Mml.compose`${Mml.name(operator)} → you: ${parsed}`;
        }
        MessageApi.scene(operator)
          .topic("speech.comms")
          .modality("verbal-esp")
          .meta(channelMeta)
          .toTarget(t, targetBody)
          .payload(
            isMulti
              ? {
                  speaker: MessageApi.refOf(operator),
                  recipients: recipientRefs,
                  text,
                }
              : {
                  speaker: MessageApi.refOf(operator),
                  target: MessageApi.refOf(t),
                  text,
                },
          )
          .send();
        // Stamp the recipient's inbound cohort on the recipient's own
        // comms update (the recipient's OWN reachable scan — the MQL
        // `reachable` pool anchored on the recipient, not the sender).
        // A recipient who is attuned but has no comms update receives
        // the dm but has nowhere to record the cohort — null-guard,
        // don't throw (they can't reply anyway).
        const recipientComms =
          MqlApi.resolveMany("person", {
            // Recipients here are Characters (CommandGivers); the
            // static type at this seam is only `Stuff`.
            commandGiver: t as unknown as Stuff & CommandGiver,
            scope: "person",
          }).stuff.find((s): s is Stuff & Comms => MixinApi.isComms(s)) ??
          null;
        if (recipientComms) {
          const inbound = isMulti
            ? [operator, ...targets.filter((o) => o !== t)]
            : [operator];
          recipientComms.recordInboundCohort(inbound);
        }
      }

      this._lastOutboundDmCohort = [...targets];
    }
  }
  return CommsMixin;
}
