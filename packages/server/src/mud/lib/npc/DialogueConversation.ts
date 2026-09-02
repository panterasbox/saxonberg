/**
 * DialogueConversation — the live state machine behind a branching-tree
 * conversation, plus its player-side companion hold.
 *
 * A controller's `CommandContext` dies after a single turn, but a tree
 * walk spans many player picks. So the conversation state lives on a
 * `SustainedEngagement` instance (held in the `SchedulerRegistry` active
 * set, keyed to the NPC actor — exactly where `RespirationDrain` lives),
 * NOT on the controller and NOT on the stateless brain. The `tree-
 * dialogue` brain's `open` constructs + starts this; the choice-await
 * loop then runs **detached** inside `ExecutionContextApi.runRoot` (the
 * `ScheduleApi.recurring` pattern) so its many `await`s have a
 * well-defined call-root after the originating command frame is gone.
 *
 * Slots are held on **both** participants (the AC: free slots on both at
 * end). One engagement has one actor, and slots are set per-actor, so a
 * conversation is two engagements: this `DialogueConversation` on the
 * NPC (voice+attention) and a {@link DialoguePartnerHold} on the player
 * (voice+attention). They reference each other so ending or aborting
 * either releases both, via the mutual-cancel-is-idempotent property of
 * `SchedulerApi.cancel` (a second cancel of an already-deregistered
 * engagement is a no-op).
 *
 * Interior/exterior invariant: the choice wheel is a private
 * `PromptApi.choice` to the driver's `Interactive`; both spoken halves
 * (the player's picked line and the NPC's beats) ride the ordinary
 * directed `say` Scene, so the room overhears but never sees the wheel.
 *
 * Ephemeral only: the `scratch` bag dies with
 * the engagement; cross-conversation warmth lives in regard
 * (persisted), never here.
 */

import type { Stuff } from "../stuff/Stuff";
import type { Engaged, EngagementSlot } from "../activity/Engaged";
import type { SustainedEngagement } from "../../api/scheduler";
import { SchedulerApi } from "../../api/scheduler";
import { ScheduleApi } from "../../api/schedule";
import type { AbortReason } from "@saxonberg/types";
import type Interactive from "../../platform/idea/Interactive";
import { PromptApi, PromptCancelledError } from "../../api/prompt";
import { WorldClockApi } from "../../api/worldclock";
import { SoulApi } from "../../api/soul";
import { MixinApi } from "../../api/mixin";
import { StuffApi } from "../../api/stuff";
import { EmploymentApi } from "../../api/employment";
import { CommandApi } from "../../api/command";
import { DefaultCalendar } from "../time/DefaultCalendar";
import type { Containable } from "../spatial/Containable";
import type {
  DialogueTree,
  DialogueNode,
  DialogueChoice,
  DialogueGuard,
  DialogueEffect,
  DomainDialogueEffect,
} from "./tree";
import { DialogueEffectRegistry } from "./DialogueEffects";

/** The engagement type for the NPC-side state machine. */
export const DIALOGUE_CONVERSATION_TYPE = "tree-dialogue-conversation";
/** The engagement type for the player-side companion slot hold. */
export const DIALOGUE_PARTNER_TYPE = "tree-dialogue-partner";

const CONVERSATION_SLOTS: readonly EngagementSlot[] = ["voice", "attention"];
const PROMPT_LABEL = "How do you respond?";

/** What applying a choice's effects decided about flow. */
interface FlowOutcome {
  /** End the conversation now. */
  end?: boolean;
  /** Branch to this node id (overrides the choice's `to`). */
  goto?: string;
}

/**
 * The player-side companion hold: occupies voice+attention on the driver
 * so "X is deep in conversation" is observable from the player's side
 * too and the player is genuinely occupied. Carries no logic — the
 * {@link DialogueConversation} drives everything; this just holds slots
 * and tears the conversation down if the player Stuff is destroyed.
 */
export class DialoguePartnerHold implements SustainedEngagement {
  engagementId = "";
  readonly type = DIALOGUE_PARTNER_TYPE;
  readonly actor: Stuff & Engaged;
  startedAt = 0;
  readonly slots: ReadonlySet<EngagementSlot> = new Set(CONVERSATION_SLOTS);
  readonly interruptibleBy: ReadonlySet<AbortReason> = new Set<AbortReason>();
  readonly cancelable = true;
  private readonly conversation: DialogueConversation;

  constructor(player: Stuff & Engaged, conversation: DialogueConversation) {
    this.actor = player;
    this.conversation = conversation;
  }

  onStart(): void {
    this.startedAt = Date.now();
  }

  onAbort(_reason: AbortReason): void {
    // Tear the conversation down if the hold ends first (e.g. the player
    // Stuff was destroyed). Idempotent: a no-op if the conversation is
    // already deregistered.
    this.conversation.endExternally();
  }

  getHost(): Stuff | null {
    return this.actor;
  }
}

/**
 * The NPC-side state machine. `SchedulerRegistry` dispatches
 * `onAbort`/`getHost` through the activity-class dispatch index,
 * captured automatically at `start`.
 */
export class DialogueConversation implements SustainedEngagement {
  engagementId = "";
  readonly type = DIALOGUE_CONVERSATION_TYPE;
  readonly actor: Stuff & Engaged;
  startedAt = 0;
  readonly slots: ReadonlySet<EngagementSlot> = new Set(CONVERSATION_SLOTS);
  readonly interruptibleBy: ReadonlySet<AbortReason> = new Set<AbortReason>();
  readonly cancelable = true;

  private readonly npc: Stuff & Engaged;
  private readonly player: Stuff & Engaged;
  private readonly interactive: Interactive;
  private readonly tree: DialogueTree;
  /** Ephemeral per-conversation scratch (never persisted). */
  private readonly scratch: Record<string, string | number | boolean> = {};
  private currentNodeId = "";
  private partner: SustainedEngagement | null = null;
  private active = true;

  constructor(
    npc: Stuff & Engaged,
    player: Stuff & Engaged,
    interactive: Interactive,
    tree: DialogueTree,
  ) {
    this.actor = npc;
    this.npc = npc;
    this.player = player;
    this.interactive = interactive;
    this.tree = tree;
  }

  /* ───────────────── Engagement contract ───────────────── */

  onStart(): void {
    this.startedAt = Date.now();
  }

  /**
   * The single teardown path — invoked by `SchedulerRegistry` on any
   * cancel/terminate (graceful end, disconnect, host-destroyed, presence
   * loss). Cancels the in-flight choice, releases the player-side hold,
   * and stops the loop. All steps idempotent.
   */
  onAbort(_reason: AbortReason): void {
    this.active = false;
    // Reject any pending choice for this driver (disconnect already did
    // this; explicit cancels and presence-loss need it here). The driver
    // is mid-conversation, so its foreground prompt is this wheel.
    this.interactive.cancelPrompts("cancelled");
    if (this.partner) SchedulerApi.cancel(this.partner, "cancelled");
  }

  getHost(): Stuff | null {
    return this.npc;
  }

  /* ───────────────── wiring from the brain's open ───────────────── */

  setPartner(partner: SustainedEngagement): void {
    this.partner = partner;
  }

  /**
   * Resolve the guard-selected entry node (first entry whose guards all
   * pass). Returns false when no entry is eligible (treated as "no
   * usable tree" by the open seam). Sets the cursor on success.
   */
  async resolveEntry(): Promise<boolean> {
    for (const entry of this.tree.entry) {
      if (!this.tree.nodes[entry.node]) continue;
      if (await this.evalGuards(entry.guard)) {
        this.currentNodeId = entry.node;
        return true;
      }
    }
    return false;
  }

  /**
   * Launch the detached choice-await loop. `ScheduleApi.schedule` wraps
   * the callback in `ExecutionContextApi.runRoot` (domain code may not
   * plant call frames directly), giving the loop a fresh root so its many
   * `await`s — and the continuations that resume when the player picks —
   * outlive the originating command frame, which is gone by then.
   */
  launch(): void {
    ScheduleApi.schedule(0, () => {
      void this.drive();
    });
  }

  /** End from the partner side / external trigger (idempotent). */
  endExternally(): void {
    this.end();
  }

  /** Re-check co-presence when the host perceives movement; end if broken. */
  reviewPresence(): void {
    if (!this.active) return;
    if (!this.coPresent()) this.end();
  }

  /* ───────────────── the loop ───────────────── */

  private async drive(): Promise<void> {
    try {
      while (this.active) {
        const node = this.tree.nodes[this.currentNodeId];
        if (!node) return this.end();
        if (node.beat) this.speak(this.npc, node.beat, this.player);
        if (node.terminal) return this.end();
        if (!this.coPresent()) return this.end();

        const choices = await this.visibleChoices(node);
        if (!this.active) return;
        if (choices.length === 0) return this.end();

        const promptChoices = choices.map((c, i) => ({
          label: c.line,
          response: String(i),
        }));

        // The prompt label echoes the NPC's current beat — prefixed with
        // who you're talking to (recognition-aware, so it reads "Mara: …"
        // once she's introduced herself, else by description) — pinned
        // beside the choices since the spoken copy in the feed scrolls
        // away. Falls back to the generic ask for a beatless node.
        const promptLabel = node.beat
          ? `${this.npc.describeFor(this.player)}: ${node.beat}`
          : PROMPT_LABEL;
        let picked: string;
        try {
          picked = await this.interactive.promptChoice(
            promptLabel,
            promptChoices,
          );
        } catch (err) {
          if (err instanceof PromptCancelledError) {
            // Disconnect / explicit cancel / presence-loss. onAbort may
            // already have run (active=false); otherwise tear down now.
            if (this.active) this.end();
            return;
          }
          throw err;
        }
        if (!this.active) return;

        const choice = choices[Number(picked)];
        if (!choice) return this.end();

        // The exterior half: the player's character speaks the line.
        this.speak(this.player, choice.line, this.npc);

        const flow = await this.applyEffects(choice.effects);
        if (!this.active) return;
        if (flow.end) return this.end();

        const next = flow.goto ?? choice.to;
        if (!next) return this.end();
        this.currentNodeId = next;
      }
    } catch {
      // Defensive: a detached loop must never leak an unhandled
      // rejection. Any unexpected error ends the conversation cleanly.
      this.end();
    }
  }

  /* ───────────────── flow control ───────────────── */

  /** Cancel the NPC-side engagement (drives onAbort → full teardown). */
  private end(): void {
    if (!this.active) {
      // Already torn down by onAbort; nothing to cancel.
      return;
    }
    SchedulerApi.cancel(this, "cancelled");
  }

  private coPresent(): boolean {
    if (!MixinApi.isContainable(this.npc)) return false;
    if (!MixinApi.isContainable(this.player)) return false;
    const a = (this.npc as Stuff & Containable).getContainer();
    const b = (this.player as Stuff & Containable).getContainer();
    return a !== null && a === b;
  }

  private speak(speaker: Stuff, text: string, target: Stuff): void {
    if (MixinApi.isVocal(speaker)) speaker.say(text, target);
  }

  /* ───────────────── guards ───────────────── */

  private async visibleChoices(
    node: DialogueNode,
  ): Promise<DialogueChoice[]> {
    const out: DialogueChoice[] = [];
    for (const choice of node.choices ?? []) {
      if (await this.evalGuards(choice.guard)) out.push(choice);
    }
    return out;
  }

  private async evalGuards(guards?: DialogueGuard[]): Promise<boolean> {
    if (!guards || guards.length === 0) return true;
    for (const g of guards) {
      if (!(await this.evalGuard(g))) return false;
    }
    return true;
  }

  private async evalGuard(g: DialogueGuard): Promise<boolean> {
    const actual = await this.readFact(g.fact);
    if (actual === undefined) return false; // unknown fact fails closed
    return compare(actual, g.op, g.value);
  }

  private async readFact(
    fact: string,
  ): Promise<string | number | boolean | undefined> {
    if (fact === "regard") {
      return MixinApi.isBeliefStore(this.npc)
        ? this.npc.regardFor(this.player)
        : 0;
    }
    const colon = fact.indexOf(":");
    if (colon <= 0) return undefined;
    const ns = fact.slice(0, colon);
    const key = fact.slice(colon + 1);
    switch (ns) {
      case "trait":
        return MixinApi.isDispositioned(this.npc)
          ? (await this.npc.traitPosition(key)).position
          : 0;
      case "time":
        return key === "hour" ? this.worldHour() : undefined;
      case "state":
        return this.scratch[key];
      case "position": {
        const organization = StuffApi.findByTemplatePath(key);
        if (!organization || !MixinApi.isOrganization(organization)) return false;
        return EmploymentApi.holdsPosition(this.player, organization);
      }
      default:
        return undefined;
    }
  }

  private worldHour(): number {
    return DefaultCalendar.singleton().decompose(WorldClockApi.getNow()).hour;
  }

  /* ───────────────── effects ───────────────── */

  private async applyEffects(
    effects?: DialogueEffect[],
  ): Promise<FlowOutcome> {
    const flow: FlowOutcome = {};
    for (const effect of effects ?? []) {
      switch (effect.verb) {
        case "set-state":
          this.scratch[effect.key] = effect.value;
          break;
        case "regard":
          if (MixinApi.isBeliefStore(this.npc)) {
            this.npc.adjustRegard(this.player, effect.delta);
          }
          break;
        case "say":
          this.speak(this.npc, effect.line, this.player);
          break;
        case "emote":
          await this.npcEmote(effect.emote);
          break;
        case "goto":
          flow.goto = effect.node;
          break;
        case "end":
          flow.end = true;
          break;
        case "dispatch":
          await this.dispatch(effect.command);
          break;
        default: {
          // A domain effect (banking's `bank-circle`, etc.) — apply through the
          // registered handler; the substrate never imports the domain. The
          // authored config is open data, so it reaches here as a domain effect.
          const domain = effect as DomainDialogueEffect;
          await DialogueEffectRegistry.get(domain.verb)?.apply({
            npc: this.npc,
            player: this.player,
            effect: domain,
          });
        }
      }
    }
    return flow;
  }

  /**
   * Run a command AS THE NPC — the "NPCs do their jobs" seam. `$player`
   * renders to the interlocutor's name (co-present, so the command's MQL
   * resolves it). Dispatched via `forceCommand`, so the boundary is the
   * TARGET controller's `execute()`-level authorization (the NPC can only
   * accomplish what a controller will let this NPC actor do — see
   * `docs/subsystems/npc-dialogue.md § dispatch`). No-op if the NPC is not a
   * command giver.
   */
  private async dispatch(command: string): Promise<void> {
    const npc = this.npc;
    if (!MixinApi.isCommandGiver(npc)) return;
    // `$player` is the player BY IDENTITY (`#<stuffId>`, the viewer-free
    // MQL seed), never by name: the NPC names people by what it
    // recognizes, and a stranger it has not been introduced to is
    // "a human" to it — `appoint alice …` from Dave found "no such
    // person" the first time the live drive took his job.
    const text = command.replaceAll("$player", `#${this.player.stuffId}`);
    await npc.forceCommand(text);
  }

  private async npcEmote(verb: string): Promise<void> {
    if (!MixinApi.isSoul(this.npc)) return;
    const emote = await SoulApi.resolve(verb);
    if (emote) this.npc.emote(emote, { target: this.player });
  }
}

/** Apply a comparison operator to a fact value and an authored value. */
function compare(
  actual: string | number | boolean,
  op: DialogueGuard["op"],
  expected: string | number | boolean,
): boolean {
  switch (op) {
    case "eq":
      return actual === expected;
    case "ne":
      return actual !== expected;
    case "gt":
      return actual > expected;
    case "gte":
      return actual >= expected;
    case "lt":
      return actual < expected;
    case "lte":
      return actual <= expected;
  }
}

