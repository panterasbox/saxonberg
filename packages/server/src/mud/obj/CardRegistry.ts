/**
 * CardRegistry — singleton Idea holding the card set's runtime state.
 *
 * Lives at `/obj/CardRegistry`. The thin `CardApi` facade at
 * `api/card.ts` is the only legitimate caller — every public method
 * carries a gate admitting that module, the `CardLogic` singleton at
 * `/obj/api/card`, and internal self-calls.
 *
 * ## ⚠ The structural call, stated
 *
 * The card set does **not** live inside `MqlSubscriptionRegistry`.
 * `inspection-pane.md` argued *"the card set IS the existing
 * subscription registry, and there is no second registry to drift"* —
 * and that argument rested on every card being a subscription. After
 * this build most cards are static (`payload` and `client` sources are
 * not MQL at all, and a prompt card never was), so the identity is
 * broken, and keeping them fused would put non-MQL state in the MQL
 * substrate.
 *
 * The drift risk therefore moves to *card ↔ its subscription handle*,
 * and it is closed by making the card **own** the handle:
 * `instanceId === subscriptionId` for a live card, every teardown goes
 * through `close`, and a test asserts zero orphan subscriptions after
 * closing every card.
 *
 * ## ⭐ One sweep, not a timer per card
 *
 * Lifetime is a **relevance window since last touched**, evicted by one
 * recurring sweep over the whole set — the `ResidencyLogic` shape. A
 * timer per card would be N clocks; the client's own husk `setInterval`
 * is deleted in the same build for the same reason. There is exactly
 * one clock and the server owns it, so `cockpit card list` and the
 * client agree.
 */

import type {
  CardCloseReason,
  CardId,
  CardOpenedEnvelope,
  CardPayload,
  CardTouchedEnvelope,
  CardClosedEnvelope,
  CardPinnedEnvelope,
  StuffDetailRecord,
  StuffRefRecord,
} from '@saxonberg/types';
import { CARDS, CARDS_BY_NAME, type CardDefinition } from '../lib/connection/Cards';
import { Idea } from '../lib/stuff/Idea';
import type { VetoResult } from '../lib/errors';
import type { EvictionContext } from '../lib/stuff/Stuff';
import { CallSecurity } from '../lib/security/decorators';
import { SecurityPolicies } from '../lib/security/SecurityPolicies';
import type { Stuff } from '../lib/stuff/Stuff';
import type { Sensor } from '../lib/message/Sensor';
import type { CommandGiver } from '../lib/command/CommandGiver';
import type Interactive from './Interactive';
import { MixinApi } from '../api/mixin';
import { MessageApi } from '../api/message';
import { SecurityApi } from '../api/security';
import { StuffApi } from '../api/stuff';
import { ShellApi } from '../api/shell';
import { Mml } from '../api/mml';
import { MqlApi } from '../api/mql';
import { PerceptionApi } from '../api/perception';
import {
  MqlSubscriptionApi,
  resolveFieldSet,
} from '../api/mql-subscription';

/**
 * Admits the Api facade, the `CardLogic` singleton — by template path
 * for a call inside one of its own proxied method frames, AND by module
 * for one that is not — and internal `this.foo()` self-calls.
 *
 * ⚠ **The module clause is what lets the SWEEP run.** `CardLogic`
 * installs one recurring `ScheduleApi` callback; by the time it fires,
 * the method frame that installed it is long gone, so there is no
 * principal for `FromTemplate` to match and the sweep would be denied
 * on every tick — silently, because a scheduled callback has no caller
 * to report to. The module identity survives, because the closure is
 * lexically in `CardLogic.ts`.
 */
const CardApiCallers = SecurityPolicies.AnyOf(
  SecurityPolicies.FromModule('/api/card#CardApi'),
  SecurityPolicies.FromModule('/obj/api/CardLogic#CardLogic'),
  SecurityPolicies.FromTemplate('/obj/api/card'),
  SecurityPolicies.SelfOnly,
);

/** A card's resolved content, whichever source produced it. */
export type CardRecord = StuffRefRecord | StuffDetailRecord;

/** One open card. */
export interface CardState {
  interactive: Interactive;
  /**
   * Server-minted. **IS the MQL subscription id when the card is live**,
   * which is what lets a live card's deltas keep riding
   * `mql-subscription-delta` with no join table.
   */
  instanceId: string;
  cardId: CardId;
  /**
   * ⭐ The normalized command that produced it — the card's IDENTITY.
   * Two opens with the same key are one card.
   */
  key: string;
  /** Effective: the catalogue default, overridden by the player. */
  pinned: boolean;
  openedAt: number;
  /** The relevance window reads this; `touch` resets it. */
  lastTouchedAt: number;
  /**
   * When the content was resolved — the honesty stamp. Static cards
   * only: a live card has no stale answer, and stamping one would
   * invite the refresh control that hides a wake which never fires.
   */
  takenAt?: number;
  title?: string;
  subjectId?: string;
  promptId?: string;
  /** The MML the controller already emitted; absent when `noProse`. */
  prose?: string;
  records?: CardRecord[];
  payload?: CardPayload;
}

/** What a caller supplies when opening or touching a card. */
export interface CardOpenOptions {
  /** The normalized command. Falls back to the definition's own. */
  key?: string;
  subjectId?: string;
  promptId?: string;
  /**
   * ⭐ The MML the controller **already emitted to the terminal**.
   *
   * Materialized here, against this card's own viewer, with the same
   * `Mml.toString(recipient)` the Scene composer uses to build the
   * frame — so the card's prose and the scrollback's are one payload
   * rendered once, not two renderings that can drift. That is what
   * makes `terminal` mode a real mode rather than a second renderer,
   * and what makes the equality assertion literal.
   *
   * Ignored when the card declares `noProse`.
   */
  prose?: Mml;
  /** Overrides the catalogue default (an arrangement never does). */
  pinned?: boolean;
  /**
   * ⭐ A `payload`-source card's body, **supplied by the controller that
   * already computed it**.
   *
   * The alternative — a producer on this side re-deriving the roster,
   * the releases, the wiki page — would be two computations of one
   * answer, which is the two-copies-of-one-sentence shape at the level
   * of data rather than words. `WhoController` already builds
   * `RosterRow[]` to render its prose; the card carries that same array,
   * so the card and the scrollback cannot disagree.
   *
   * Validated against the catalogue's declared `producer`: a card that
   * says it carries a roster and is handed releases is a programming
   * error, not a rendering variation.
   */
  payload?: CardPayload;
}

export default class CardRegistry extends Idea {
  /**
   * Residency veto — a load-bearing process-lifetime singleton is never
   * culled by the self-eviction sweep.
   */
  public canEvict(_context: EvictionContext): VetoResult {
    return { ok: false, reason: 'system singleton; never culled' };
  }

  private cards: Map<Interactive, Map<string, CardState>> = new Map();

  /* ─── public surface ─── */

  /**
   * Open a card, or **touch** the one that already carries this key.
   *
   * ⭐ Dedup is the whole identity model: `who` twice is one card,
   * `look a` / `look b` / `look a` is two with `a` back in front.
   * Returns the card's instance id.
   */
  @CallSecurity(CardApiCallers)
  public open(
    interactive: Interactive,
    cardId: CardId,
    opts: CardOpenOptions = {},
  ): string | null {
    const def = CARDS_BY_NAME[cardId];
    if (!def) return null;

    const key = opts.key ?? def.command;
    const existing = this.findByKey(interactive, key);
    if (existing) {
      this.touchState(existing, opts);
      return existing.instanceId;
    }

    const holder = this.viewerOf(interactive);
    if (!holder) return null;

    const now = Date.now();
    const state: CardState = {
      interactive,
      instanceId: `card-${SecurityApi.uuid()}`,
      cardId,
      key,
      pinned: opts.pinned ?? def.pinnedByDefault,
      openedAt: now,
      lastTouchedAt: now,
      ...(opts.subjectId ? { subjectId: opts.subjectId } : {}),
      ...(opts.promptId ? { promptId: opts.promptId } : {}),
      ...(opts.prose && !def.noProse
        ? { prose: opts.prose.toString(holder) }
        : {}),
    };

    /*
     * ⚠ A LIVE card's instance id IS its subscription id, and the
     * subscription is registered `silent` so the initial resolve lands
     * on `card-opened` rather than as a second envelope the client
     * would have to reconcile against it. Two envelopes for one open is
     * how a card ends up briefly showing nothing.
     */
    if (def.live && def.source.kind === 'mql') {
      const initial = MqlSubscriptionApi.handleSubscribe({
        interactive,
        subscriptionId: state.instanceId,
        query: def.source.query,
        cardinality: def.source.cardinality,
        fields: def.source.fields,
        locationDependent: def.source.locationDependent === true,
        silent: true,
      });
      if (initial === null) return null;
      state.records = initial as CardRecord[];
      state.title = initial[0]?.displayName as string | undefined;
    } else {
      this.resolveInto(def, state, holder, opts);
      state.takenAt = now;
    }

    let bucket = this.cards.get(interactive);
    if (!bucket) {
      bucket = new Map();
      this.cards.set(interactive, bucket);
    }
    bucket.set(state.instanceId, state);

    const template: Omit<CardOpenedEnvelope, 'frameId'> = {
      type: 'card-opened',
      instanceId: state.instanceId,
      cardId,
      key,
      live: def.live,
      pinned: state.pinned,
      ...(state.takenAt !== undefined ? { takenAt: state.takenAt } : {}),
      ...(state.title !== undefined ? { title: state.title } : {}),
      ...(state.subjectId ? { subjectId: state.subjectId } : {}),
      ...(state.promptId ? { promptId: state.promptId } : {}),
      ...(state.prose ? { prose: state.prose } : {}),
      ...(state.records ? { result: state.records } : {}),
      ...(state.payload ? { payload: state.payload } : {}),
    };
    MessageApi.sendEnvelope(holder, template);
    return state.instanceId;
  }

  /**
   * Bring a card forward and reset its window; re-resolve it if static.
   * Returns false when no card carries that key.
   */
  @CallSecurity(CardApiCallers)
  public touchCard(
    interactive: Interactive,
    key: string,
    opts: CardOpenOptions = {},
  ): boolean {
    const found = this.findByKey(interactive, key);
    if (!found) return false;
    this.touchState(found, opts);
    return true;
  }

  /**
   * Pin / unpin.
   *
   * ⚠⚠ **`cardRef` resolves by KEY first**, then catalogue name, then
   * instance id — and the order is a defect found by DRIVING.
   *
   * Two `who` cards can be open at once (`who` and `who --here` are
   * different commands, so they are different cards). Resolving by
   * catalogue name first meant both cards' pin controls sent
   * `cockpit card pin who`, and the server acted on whichever it found
   * first: **two controls, identical labels, acting on one thing.** A
   * control that does not act on the card it is on is worse than a
   * missing one.
   *
   * The KEY is the card's identity and is unique by construction, so it
   * is the ref the client sends. The catalogue name still resolves —
   * `cockpit card pin place` is the form the verb's own help shows, and
   * it is unambiguous whenever only one card of that kind is open. The
   * instance id resolves last and is never SHOWN: it is a server-minted
   * `card-<uuid>`, and printing that at a player is the transport
   * leaking into the interface.
   */
  @CallSecurity(CardApiCallers)
  public setPinned(
    interactive: Interactive,
    cardRef: string,
    pinned: boolean | null,
  ): boolean {
    const bucket = this.cards.get(interactive);
    if (!bucket) return false;
    let state: CardState | undefined;
    for (const candidate of bucket.values()) {
      if (candidate.key === cardRef) {
        state = candidate;
        break;
      }
    }
    if (!state) {
      for (const candidate of bucket.values()) {
        if (candidate.cardId === cardRef) {
          state = candidate;
          break;
        }
      }
    }
    state ??= bucket.get(cardRef);
    if (!state) return false;

    // `null` = hand the decision back to the catalogue's own default.
    const next = pinned ?? CARDS[state.cardId].pinnedByDefault;
    state.pinned = next;
    // Unpinning restarts the window rather than backdating it: a card
    // the player just touched a control on is a card they are looking
    // at, and ageing it out on the next sweep would be a surprise.
    state.lastTouchedAt = Date.now();

    const holder = this.viewerOf(interactive);
    if (holder) {
      const template: Omit<CardPinnedEnvelope, 'frameId'> = {
        type: 'card-pinned',
        instanceId: state.instanceId,
        pinned: next,
      };
      MessageApi.sendEnvelope(holder, template);
    }
    return true;
  }

  /** Close one card, stating the reason. */
  @CallSecurity(CardApiCallers)
  public close(
    interactive: Interactive,
    instanceId: string,
    reason: CardCloseReason,
  ): boolean {
    const bucket = this.cards.get(interactive);
    const state = bucket?.get(instanceId);
    if (!bucket || !state) return false;
    this.teardown(state);
    bucket.delete(instanceId);
    if (bucket.size === 0) this.cards.delete(interactive);

    const holder = this.viewerOf(interactive);
    if (holder) {
      const template: Omit<CardClosedEnvelope, 'frameId'> = {
        type: 'card-closed',
        instanceId,
        reason,
      };
      MessageApi.sendEnvelope(holder, template);
    }
    return true;
  }

  /** The open cards for one interactive — the `cockpit card list` report. */
  @CallSecurity(CardApiCallers)
  public list(interactive: Interactive): {
    instanceId: string;
    cardId: CardId;
    key: string;
    pinned: boolean;
    live: boolean;
  }[] {
    const bucket = this.cards.get(interactive);
    if (!bucket) return [];
    return [...bucket.values()].map((s) => ({
      instanceId: s.instanceId,
      cardId: s.cardId,
      key: s.key,
      pinned: s.pinned,
      live: CARDS[s.cardId].live,
    }));
  }

  /**
   * ⭐⭐ Open exactly the cards an arrangement names — the SERVER
   * resolving a workspace, not the client replaying it.
   *
   * ⚠ **Subject cards are skipped.** An arrangement is a statement about
   * a WORKSPACE; a card about a particular person is a statement about a
   * MOMENT, and restoring one next week would be restoring an answer to
   * a question nobody is asking.
   */
  @CallSecurity(CardApiCallers)
  public applyArrangement(
    interactive: Interactive,
    wanted: readonly CardId[],
  ): { opened: number; closed: number } {
    const want = new Set<CardId>(
      wanted.filter((c) => !this.isSubjectCard(c)),
    );
    const bucket = this.cards.get(interactive);
    let closed = 0;

    if (bucket) {
      for (const [instanceId, state] of [...bucket.entries()]) {
        if (this.isSubjectCard(state.cardId)) continue;
        if (want.has(state.cardId)) {
          // Already open and still wanted — leave it alone rather than
          // closing and reopening, which would blank the card and lose
          // its pin for no reason the player asked for.
          want.delete(state.cardId);
          continue;
        }
        this.close(interactive, instanceId, 'rearranged');
        closed++;
      }
    }

    let opened = 0;
    for (const cardId of want) {
      if (this.open(interactive, cardId) !== null) opened++;
    }
    return { opened, closed };
  }

  /**
   * ⭐ A prompt settled — close the card that was waiting on it.
   *
   * This is where the retired `unanswered` hold's guarantee lives now.
   * A prompt card opens PINNED, so the sweep never reaches it; the only
   * thing that ends it is the answer.
   */
  @CallSecurity(CardApiCallers)
  public notifyPromptSettled(
    interactive: Interactive,
    promptId: string,
  ): void {
    const bucket = this.cards.get(interactive);
    if (!bucket) return;
    for (const [instanceId, state] of [...bucket.entries()]) {
      if (state.promptId !== promptId) continue;
      this.close(interactive, instanceId, 'answered');
    }
  }

  /** Drop every card for an interactive (disconnect). No envelopes. */
  @CallSecurity(CardApiCallers)
  public cancelAllForInteractive(interactive: Interactive): void {
    const bucket = this.cards.get(interactive);
    if (!bucket) return;
    for (const state of bucket.values()) this.teardown(state);
    this.cards.delete(interactive);
  }

  /**
   * ⭐ **The sweep.** One pass over the whole set, evicting the cold
   * tail — not a timer per card (AC 8).
   *
   * Pinned cards are skipped entirely: pinned-ness IS the lifetime axis,
   * and a clock that could end a pinned card would make the axis a
   * suggestion. Returns how many closed, for the test and the log.
   */
  @CallSecurity(CardApiCallers)
  public sweep(fallbackMs: number, now: number = Date.now()): number {
    let closed = 0;
    for (const [interactive, bucket] of [...this.cards.entries()]) {
      /*
       * ⭐⭐ **The `cards.window` SETTING is the window — there is no
       * second source.**
       *
       * `fallbackMs` is reached only when the holder carries no
       * settings schema at all (a holderless moment, an NPC body). For
       * a player it never wins, and that is deliberate: a parameter
       * that could disagree with the setting is a number with two
       * homes, and the one the player cannot see is the one that would
       * quietly be in force.
       *
       * ⭐ Read PER PLAYER inside the loop. One sweep, many windows —
       * which is what lets a player shorten theirs to watch a card age
       * out and say so, without changing anybody else's.
       */
      const holder = this.viewerOf(interactive);
      const seconds = holder
        ? ShellApi.resolveSetting<number>(holder as Stuff, 'cards.window')
        : undefined;
      const effective =
        typeof seconds === 'number' && seconds > 0 ? seconds * 1000 : fallbackMs;
      for (const [instanceId, state] of [...bucket.entries()]) {
        if (state.pinned) continue;
        if (now - state.lastTouchedAt < effective) continue;
        this.close(interactive, instanceId, 'aged-out');
        closed++;
      }
    }
    return closed;
  }

  /* ─── test seams ─── */

  @CallSecurity(CardApiCallers)
  public _getSize(): number {
    let count = 0;
    for (const bucket of this.cards.values()) count += bucket.size;
    return count;
  }

  @CallSecurity(CardApiCallers)
  public _clearAll(): void {
    for (const bucket of this.cards.values()) {
      for (const state of bucket.values()) this.teardown(state);
    }
    this.cards.clear();
  }

  /* ─── internal helpers ─── */

  private isSubjectCard(cardId: CardId): boolean {
    const source = CARDS[cardId].source;
    return source.kind === 'mql' && source.needsSubject === true;
  }

  private findByKey(
    interactive: Interactive,
    key: string,
  ): CardState | undefined {
    const bucket = this.cards.get(interactive);
    if (!bucket) return undefined;
    for (const state of bucket.values()) {
      if (state.key === key) return state;
    }
    return undefined;
  }

  /**
   * Bring forward, reset the window, re-resolve if static, and say so.
   *
   * ⚠ **A pinned card holds its position.** The feed is
   * newest-touched-first for unpinned cards; a pinned card that jumped
   * around is worse than one that sits still, so `openedAt` — which is
   * what the feed sorts the pinned block on — is left alone.
   */
  private touchState(state: CardState, opts: CardOpenOptions): void {
    const def = CARDS[state.cardId];
    const holder = this.viewerOf(state.interactive);
    state.lastTouchedAt = Date.now();
    if (!state.pinned) state.openedAt = state.lastTouchedAt;
    if (opts.subjectId) state.subjectId = opts.subjectId;
    if (opts.promptId) state.promptId = opts.promptId;
    if (opts.prose && !def.noProse && holder) {
      state.prose = opts.prose.toString(holder);
    }

    if (!def.live && holder) {
      this.resolveInto(def, state, holder, opts);
      state.takenAt = state.lastTouchedAt;
    }

    if (!holder) return;
    /*
     * ⚠⚠ **A live card's touch carries NO body.** `state.records` is the
     * subscription's *first* resolve and is never written again — the
     * substrate emits deltas straight at the client and does not report
     * back here. Shipping that stale array on every touch means a bare
     * `look` in a new room re-asserts the room you left, and it does it
     * confidently, over a client that had already been told the truth.
     *
     * The rule the two axes imply: **whoever owns the body owns every
     * update to it.** A static card's body is re-resolved here on each
     * touch; a live card's body belongs to its subscription, and touch
     * is only about the card's PLACE in the feed.
     */
    const carriesBody = !def.live;
    const template: Omit<CardTouchedEnvelope, 'frameId'> = {
      type: 'card-touched',
      instanceId: state.instanceId,
      key: state.key,
      ...(state.takenAt !== undefined ? { takenAt: state.takenAt } : {}),
      ...(state.title !== undefined ? { title: state.title } : {}),
      ...(state.prose ? { prose: state.prose } : {}),
      ...(carriesBody && state.records ? { result: state.records } : {}),
      ...(carriesBody && state.payload ? { payload: state.payload } : {}),
    };
    MessageApi.sendEnvelope(holder, template);
  }

  /**
   * Fill a static card's body.
   *
   * Three sources, three answers: `mql` resolves the server-owned query
   * (a subject card by direct lookup **behind the perception gate**);
   * `payload` takes what the controller already computed; `client` and
   * `prompt` have no server-side body at all.
   */
  private resolveInto(
    def: CardDefinition,
    state: CardState,
    viewer: Stuff & Sensor,
    opts: CardOpenOptions,
  ): void {
    if (def.source.kind === 'payload') {
      const supplied = opts.payload;
      if (supplied && supplied.kind !== def.source.producer) {
        throw new Error(
          `CardRegistry: card '${state.cardId}' carries a ` +
            `'${def.source.producer}' payload; got '${supplied.kind}'`,
        );
      }
      if (supplied) state.payload = supplied;
      return;
    }
    if (def.source.kind !== 'mql') return;

    const giver = viewer as unknown as Stuff & CommandGiver;
    const fields = resolveFieldSet(def.source.fields);
    let stuffList: Stuff[];
    if (def.source.needsSubject === true) {
      const subject = state.subjectId
        ? this.resolveSubject(state.subjectId, viewer)
        : null;
      stuffList = subject ? [subject] : [];
    } else {
      const expanded = ShellApi.expandVariables(def.source.query, giver);
      const ctx = { commandGiver: giver, scope: expanded };
      if (def.source.cardinality === 'one') {
        const one = MqlApi.resolveOne(expanded, ctx);
        stuffList = one.stuff ? [one.stuff] : [];
      } else {
        stuffList = MqlApi.resolveMany(expanded, ctx).stuff;
      }
    }
    state.records = stuffList.map(
      (s) =>
        MqlSubscriptionApi.projectFields(
          s,
          fields,
          viewer,
        ) as unknown as CardRecord,
    );
    state.title = state.records[0]?.displayName as string | undefined;
  }

  /**
   * ⚠ **One teardown path.** A live card owns its subscription handle
   * (`instanceId === subscriptionId`), so every close unsubscribes here
   * and nowhere else — which is what makes the orphan-count test a real
   * guarantee rather than an assertion about the happy path.
   */
  private teardown(state: CardState): void {
    if (!CARDS[state.cardId].live) return;
    MqlSubscriptionApi.handleUnsubscribe(state.interactive, state.instanceId);
  }

  /**
   * The Sensor behind an interactive, or null. A card is a message to a
   * viewer; without one there is nobody to send to.
   *
   * ⚠ **Fails soft on a partial interactive.** The card layer runs
   * inside `Avatar.enter`, and a session must never fail because a
   * workspace convenience could not resolve a viewer — the cost of
   * being wrong here is a missing card, and the cost of throwing is a
   * player who cannot log in.
   */
  private viewerOf(interactive: Interactive): (Stuff & Sensor) | null {
    const get = (interactive as { getHolder?: () => unknown }).getHolder;
    if (typeof get !== 'function') return null;
    const holder = get.call(interactive) as Stuff | null;
    if (!holder || !MixinApi.isSensor(holder)) return null;
    if (!MixinApi.isCommandGiver(holder)) return null;
    return holder as Stuff & Sensor;
  }

  /**
   * ⚠⚠ Resolve a subject card's Stuff **behind the perception gate**,
   * never via an `#<stuffId>` MQL seed. That seed is authoring-tier and
   * ungated, so a card built on it would answer for anything whose id
   * the viewer had ever seen on a frame — a peep-hole into every room in
   * the game, looking exactly like the feature working.
   */
  @CallSecurity(CardApiCallers)
  public resolveSubject(
    subjectId: string,
    viewer: Stuff & Sensor,
  ): Stuff | null {
    const found = StuffApi.findById(subjectId);
    if (!found) return null;
    return PerceptionApi.perceives(viewer, found) ? found : null;
  }
}
