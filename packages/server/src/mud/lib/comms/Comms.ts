/**
 * CommsMixin — a person's comms: the words they send at a distance, who
 * they last spoke with, and (from W4) what is waiting.
 *
 * Composed on the person (`Avatar` — every played body; ⚠ never
 * `Character`: no NPC ever talks at a distance). Carries the `tell` send
 * behind the `dm` / `reply` / `broadcast` / `chat` verbs, and the DM cohort
 * state. The sender of every frame is the person (`this`).
 *
 * **What the person's comms asks before a message goes** (aether-devices
 * D2, D8): `sendOrHold` — is there a host that would carry it right now
 * (`aetherHostNow`: a born-tuned body is its own; otherwise the first
 * augment it bears that confers the aether sense and hosts apps), and does
 * that host have **Messages** installed? Messages is an app
 * (`/platform/idea/app/messages`) that does nothing by itself: it is what
 * this mixin looks for. Controllers ask and render; none decides.
 *
 * Perceiving the aether is `AetherMixin` (the gated sense a tuner
 * confers); hosting software is `AetherHostMixin`.
 */

import type { MixinConstructor } from "../mixin";
import type { Stuff } from "../stuff/Stuff";
import { MessageApi } from "../../api/message";
import { Mml } from "../../api/mml";
import type { CommandContributions } from "../../api/command";
import { ScheduleApi } from "../../api/schedule";
import { WorldClockApi } from "../../api/worldclock";
import { MqlSubscriptionApi, type SubscribableFieldDescriptor } from "../../api/mql-subscription";
import { PerceptionApi } from "../../api/perception";
import type { FieldMeta } from "../mixin";
import type { MessageFrame } from "@saxonberg/types";
import { InactiveCapabilityError } from "../security/RequiresActive";
import { MixinApi } from "../../api/mixin";
import type { AetherHost } from "../augmentation/AetherHost";
import type { Augment } from "../augmentation/Augment";

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

  /**
   * Can a message leave this person right now? `null` means go; otherwise
   * the refusal, with the words and the fix. The one question the send
   * controllers ask (D8). `commandText` is the line the player ran.
   */
  sendOrHold(commandText: string): AetherRefusal | null;

  /**
   * The words for why nothing can leave right now, or `null` — the same
   * line `sendOrHold` says, without holding anything. For a gate on a verb
   * that is not held (`forum`, `broadcast`).
   */
  cannotSendLine(): string | null;

  /**
   * Can a frame that arrived over the aether be taken now? `null` means
   * deliver; otherwise why it waits (D8, D9).
   */
  receptionRefusal(frame: MessageFrame): ReceptionRefusalReason | null;

  /**
   * Hold `frame` if it came over the aether and cannot be taken now —
   * appended to `heldInbound` and dropped from delivery. Returns whether
   * it was held. Also notices when anything held can now go, and
   * schedules the flush. Asked by the person's `filterMessage` (D8).
   */
  holdIfUnreachable(frame: MessageFrame): boolean;

  /**
   * Deliver what was held and re-run what was typed while it could not
   * go — *"While you were away…"*. Runs on its own once anything held
   * can move (the next frame, or `enter`).
   */
  flushHeld(): Promise<void>;

  /**
   * Whether this person can reach past the room, as the word the status
   * bar shows (D13): `tuned 80%`, `tuned`, `packed`, `off`, `dead`,
   * `not yours`, `no Messages`, `no tuner`.
   */
  aetherWord(): string;

  /**
   * Is this body tuned by its own nature — a shade, a born-attuned
   * species — rather than by a device? Such a body is its own host.
   * @hook Default `false`; `Avatar` answers from its species, `ShadeAvatar`
   *   answers `true`.
   */
  isBornTuned(): boolean;
}

/** Why a message cannot leave (or arrive) right now. */
export type AetherRefusalReason =
  | "none"
  | "packed"
  | "off"
  | "dead"
  | "not-yours"
  | "no-messages";

/** Why a frame over the aether waits: a send reason, or the eyes (D9). */
export type ReceptionRefusalReason = AetherRefusalReason | "cannot-see";

/** A refusal: the reason, the line that names the fix, and whether it was kept. */
export interface AetherRefusal {
  reason: AetherRefusalReason;
  line: string;
  /** Was the command kept to run when it can go? (`false` past the cap.) */
  held: boolean;
}

/** The most typed lines a person holds (D8). */
const HELD_OUTBOUND_CAP = 50;
/** The most frames a person holds; past it the oldest are kept and the rest counted. */
const HELD_INBOUND_CAP = 200;
/** The modalities that ride the aether (and so can wait). */
const AETHER_MODALITIES = new Set(["verbal-esp", "emotive-esp"]);
/** Topics whose frames need Messages on the receiving host (D9). */
const MESSAGES_TOPICS = ["speech.comms", "speech.channel", "act.emote"];

/** Which device reasons are easiest to fix, first (D2): the fix is a word. */
const FIXABILITY: readonly AetherRefusalReason[] = ["off", "packed", "dead", "not-yours"];

/** The key Messages is installed under (its row's last segment). */
const MESSAGES = "messages";

/** The line each refusal says — each names its fix (D8). */
const REFUSAL_LINES: Record<AetherRefusalReason, string> = {
  none:
    "You have nothing that reaches past this room. A phone does — the general store sells one.",
  packed: "Your phone is in your pack — ready it to send.",
  off: "Your phone is off — `switch phone on`.",
  dead: "Your phone is dead — charge it.",
  "not-yours": "That phone runs only for its owner.",
  "no-messages": "Messages isn't installed — `apps install messages`.",
};

export function CommsMixin<TBase extends MixinConstructor<Stuff>>(Base: TBase) {
  class CommsMixin extends Base implements Comms {
    static _mixinName = "CommsMixin";

    /** The status bar's AETHER row reads this off the `self` card (D13). */
    static subscribableFields: SubscribableFieldDescriptor[] = [
      { name: "aetherState", read: (stuff) => (stuff as unknown as Comms).aetherWord() },
    ];

    /** A person's own distance verbs. */
    static commandContributions: CommandContributions = {
      self: [
        "platform/cmd/social/dm.yaml",
        "platform/cmd/social/reply.yaml",
        "platform/cmd/social/broadcast.yaml",
        "platform/cmd/social/chat.yaml",
      ],
      peers: [],
      environment: [],
    };

    static fieldMeta: FieldMeta = {
      heldOutbound: { persistent: true },
      heldInbound: { persistent: true },
      heldInboundLost: { persistent: true },
    };

    /**
     * Persisted: the command lines the person ran that could not go yet,
     * in order — re-run as typed when they can (D8). Nothing is invented
     * at send time; a line that no longer resolves fails in its own words.
     */
    heldOutbound: string[] = [];

    /** Persisted: frames that arrived over the aether and could not be taken. */
    heldInbound: MessageFrame[] = [];

    /** Persisted: how many arriving frames were dropped past the cap. */
    heldInboundLost = 0;

    /** One flush in flight at a time. Runtime only. */
    private _flushScheduled = false;

    /** The AETHER word as last shown — a change pokes the card. Runtime only. */
    private _notedAetherWord: string | null = null;

    /**
     * Cohort state. Runtime-only — NOT persisted. TypeScript `private` per
     * the proxy-receiver constraint.
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
      // The person sends as themselves. Transport, not decision: the
      // controllers asked `sendOrHold` first, so an untuned sender here is
      // a caller bug — throw (P3), never send unheard.
      const operator = this as unknown as Stuff;
      if (!MixinApi.isActive(operator, "AetherMixin")) {
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
        ? Mml.compose`${Mml.actor(operator)} → ${Mml.fromMarkup(
            targets.map((t) => Mml.actor(t).toString()).join(", "),
          )}: ${parsed}`
        : Mml.compose`${Mml.actor(operator)} → ${Mml.actor(targets[0]!)}: ${parsed}`;

      MessageApi.scene(operator)
        .topic("speech.comms")
        .modality("verbal-esp")
        .meta(channelMeta)
        // ⭐ Private by the server's word (broadcast-ready D8).
        .tags([MessageApi.Tags.Privacy.Private])
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
            .map((other) => Mml.actor(other).toString())
            .join(", ");
          const cohortHint = others
            ? Mml.fromMarkup(` (also to: ${others})`)
            : Mml.fromMarkup("");
          targetBody = Mml.compose`${Mml.actor(operator)} → you${cohortHint}: ${parsed}`;
        } else {
          targetBody = Mml.compose`${Mml.actor(operator)} → you: ${parsed}`;
        }
        MessageApi.scene(operator)
          .topic("speech.comms")
          .modality("verbal-esp")
          .meta(channelMeta)
          .tags([MessageApi.Tags.Privacy.Private])
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
        // comms — a person composes it; anything else has nowhere to
        // record a cohort (and could not reply anyway).
        if (MixinApi.isComms(t)) {
          const inbound = isMulti
            ? [operator, ...targets.filter((o) => o !== t)]
            : [operator];
          t.recordInboundCohort(inbound);
        }
      }

      this._lastOutboundDmCohort = [...targets];
      this.spendOnHost();
    }

    isBornTuned(): boolean {
      return false;
    }

    aetherWord(): string {
      const now = this.aetherHostNow();
      if (!now.ok) {
        return now.reason === "none" ? "no tuner" : now.reason === "not-yours" ? "not yours" : now.reason;
      }
      if (!now.host.hasApp(MESSAGES)) return "no Messages";
      if (!MixinApi.isBattery(now.host)) return "tuned";
      const pct = now.host.chargeFraction(Math.floor(WorldClockApi.getNow().value));
      return `tuned ${Math.floor(pct * 10) * 10}%`;
    }

    /**
     * Poke the `self` card when the AETHER word changes (D13). Asked on
     * every frame the person receives: every act that re-tunes a person
     * tells them something (readying, switching, installing). The first
     * read of a session seeds silently.
     */
    private noteAetherWord(): void {
      const word = this.aetherWord();
      if (this._notedAetherWord !== null && word !== this._notedAetherWord) {
        const subject = (this as unknown as Stuff).getIdentityPath();
        if (subject) MqlSubscriptionApi.notifyDurableSubject(subject);
      }
      this._notedAetherWord = word;
    }

    sendOrHold(commandText: string): AetherRefusal | null {
      const reason = this.sendRefusal();
      if (reason === null) return null;
      const fix = REFUSAL_LINES[reason];
      if (this.heldOutbound.length >= HELD_OUTBOUND_CAP) {
        return {
          reason,
          line: `${fix} You are already holding ${HELD_OUTBOUND_CAP} — this one was not kept.`,
          held: false,
        };
      }
      this.heldOutbound.push(commandText);
      return { reason, line: `${fix} Held — it goes when you can send.`, held: true };
    }

    cannotSendLine(): string | null {
      const now = this.aetherHostNow();
      return !now.ok ? REFUSAL_LINES[now.reason] : null;
    }

    receptionRefusal(frame: MessageFrame): ReceptionRefusalReason | null {
      const now = this.aetherHostNow();
      if (!now.ok) return now.reason;
      const topic = frame.topic ?? "";
      if (
        MESSAGES_TOPICS.some((t) => topic.startsWith(t)) &&
        !now.host.hasApp(MESSAGES)
      ) {
        return "no-messages";
      }
      // D9: what a screen shows needs eyes and a waking mind. Sight is an
      // organ question with no light in it — a lit screen reads in the
      // dark. A blindness condition meets this rule with no change here.
      if (now.host.getManifestsAs() === "read" && !this.canReadAScreen()) {
        return "cannot-see";
      }
      return null;
    }

    holdIfUnreachable(frame: MessageFrame): boolean {
      const modality = frame.meta?.modality;
      const ours = frame.tags?.includes("audience:actor") ?? false;
      if (modality && AETHER_MODALITIES.has(modality) && !ours) {
        if (this.receptionRefusal(frame) !== null) {
          if (this.heldInbound.length >= HELD_INBOUND_CAP) {
            this.heldInboundLost += 1;
          } else {
            this.heldInbound.push(frame);
          }
          return true;
        }
      }
      // Delivered over the aether: the host it came through spends a read.
      if (modality && AETHER_MODALITIES.has(modality) && !ours) this.spendOnHost();
      this.scheduleFlushIfMovable();
      this.noteAetherWord();
      return false;
    }

    /**
     * A message sent or read through a host with a battery spends `useWh`
     * of it (D5). A host without one (an implant, a born-tuned body)
     * spends nothing.
     */
    private spendOnHost(): void {
      const now = this.aetherHostNow();
      if (!now.ok || !MixinApi.isBattery(now.host)) return;
      const me = this as unknown as Stuff;
      now.host.spendUse(Math.floor(WorldClockApi.getNow().value), me.stuffId);
    }

    async flushHeld(): Promise<void> {
      this._flushScheduled = false;
      const me = this as unknown as Stuff;
      // Inbound: every held frame that can be taken now, in order.
      const ready = this.heldInbound.filter((f) => this.receptionRefusal(f) === null);
      const lost = this.heldInboundLost;
      if (ready.length > 0 || (lost > 0 && this.heldInbound.length === ready.length)) {
        this.heldInbound = this.heldInbound.filter((f) => !ready.includes(f));
        this.heldInboundLost = 0;
        const lostNote = lost > 0 ? ` (${lost} more were lost — too many waited.)` : "";
        MessageApi.scene(me)
          .topic("speech.comms")
          .toSelf(Mml.fromMarkup(`\nWhile you were away…${lostNote}\n`))
          .send();
        if (MixinApi.isSensor(me)) for (const f of ready) me.onMessage(f);
      }
      // Outbound: the lines typed while nothing could carry them.
      if (this.heldOutbound.length > 0 && this.sendRefusal() === null) {
        const lines = this.heldOutbound;
        this.heldOutbound = [];
        if (!MixinApi.isCommandGiver(me)) return;
        for (const line of lines) {
          MessageApi.scene(me)
            .topic("speech.comms")
            .toSelf(Mml.compose`Sending what you held: ${line}`)
            .send();
          await me.executeCommand(line);
        }
      }
    }

    /** Is anything held, and can some of it move now? Then flush once, after this frame. */
    private scheduleFlushIfMovable(): void {
      if (this._flushScheduled) return;
      if (this.heldOutbound.length === 0 && this.heldInbound.length === 0) return;
      const outboundCan = this.heldOutbound.length > 0 && this.sendRefusal() === null;
      const inboundCan = this.heldInbound.some((f) => this.receptionRefusal(f) === null);
      if (!outboundCan && !inboundCan) return;
      this._flushScheduled = true;
      ScheduleApi.schedule(0, () => void this.flushHeld());
    }

    /** Awake, and able to perceive by sight (D9). */
    private canReadAScreen(): boolean {
      const me = this as unknown as Stuff;
      if (MixinApi.isVitals(me) && me.getConsciousness() !== "conscious") return false;
      return PerceptionApi.canPerceive(me, PerceptionApi.modalityByName("vision"));
    }

    /** Why a message cannot leave right now, or `null`. */
    private sendRefusal(): AetherRefusalReason | null {
      const now = this.aetherHostNow();
      if (!now.ok) return now.reason;
      return now.host.hasApp(MESSAGES) ? null : "no-messages";
    }

    /**
     * The host whose Messages would carry a message right now (D2): a
     * born-tuned body is its own; otherwise the first augment this body
     * bears that nothing stops (`conferralRefusal() === null`), that
     * confers the aether sense and that hosts apps. None → the most
     * fixable reason among the devices it bears, or `none`.
     */
    private aetherHostNow():
      | { ok: true; host: Stuff & AetherHost }
      | { ok: false; reason: AetherRefusalReason } {
      const me = this as unknown as Stuff;
      if (this.isBornTuned() && MixinApi.isAetherHost(me)) return { ok: true, host: me };
      let best: AetherRefusalReason | null = null;
      for (const augment of this.borneAugments()) {
        if (!MixinApi.isAetherHost(augment)) continue;
        const why = augment.conferralRefusal();
        if (why === null) {
          if (augment.confers().includes("AetherMixin")) return { ok: true, host: augment };
          continue;
        }
        if (why === "not-borne") continue;
        if (best === null || FIXABILITY.indexOf(why) < FIXABILITY.indexOf(best)) best = why;
      }
      return { ok: false, reason: best ?? "none" };
    }

    /**
     * The augments this body bears (D1): what its slots hold, and what it
     * carries — the carried devices whose verbs sit on its recency stack.
     */
    private borneAugments(): (Stuff & Augment)[] {
      const me = this as unknown as Stuff;
      const out: (Stuff & Augment)[] = [];
      const add = (o: Stuff): void => {
        if (MixinApi.isAugment(o) && !out.includes(o)) out.push(o);
      };
      if (MixinApi.isSlotted(me)) {
        for (const occupants of me.getAllOccupants().values()) {
          for (const o of occupants) add(o);
        }
      }
      if (MixinApi.isCommandGiver(me)) {
        for (const o of me.getCommandSources("environment")) add(o);
      }
      return out;
    }
  }
  return CommsMixin;
}
