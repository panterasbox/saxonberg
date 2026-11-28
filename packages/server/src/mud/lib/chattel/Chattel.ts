/**
 * ChattelMixin — the durable per-instance **identity** a movable good
 * carries so its ownership can be keyed unspoofably in the chattel
 * registry (`obj/ChattelRegistry`), the twin of the parcel title.
 *
 * The mixin carries only the good's *identity* (`_chattelId`), never its
 * *owner* — ownership is a gated registry fact resolved `stamp ??
 * authorOf` (see `ChattelApi.ownerOf`). The id is:
 *
 *   - **server-minted** — empty until `ChattelApi.stamp`/`transfer` mints
 *     one via the registry; the mutator `_setChattelId` is gated to the
 *     chattel logic singleton alone, so no author/player can forge an
 *     identity.
 *   - **durable across the persistence round-trip** — declared in
 *     `persistentFields`, so the drift-guarded capture/restore re-applies
 *     it (the id rides the Avatar-inventory snapshot; the registry row is
 *     independently durable in Mongo). A stamped good, logged out and back,
 *     resolves to the same owner.
 *
 * Composed at the movable-good tier (`Thing`), so pets/apartments/
 * ranching/retail all get per-instance identity for free. Fungible stacks
 * (`Stackable`) are deliberately out of scope — a stack that splits/merges
 * has no stable per-instance id; `ChattelApi` refuses to stamp a stack, so a
 * stack's `_chattelId` stays empty and it is owned-by-possession.
 */

import type { MixinConstructor, FieldMeta } from "../mixin";
import type { Stuff } from "../stuff/Stuff";
import { CallSecurity, Final, Unshadowable } from "../security/decorators";
import { SecurityPolicies } from "../security/SecurityPolicies";
import { StuffApi } from "../../api/stuff";
import { MixinApi } from "../../api/mixin";
import { AccessApi } from "../../api/access";
// eslint-disable-next-line no-restricted-imports -- the F1 object face: a good's chattelOwner()/stampChattel()/transferChattel() forward into the chattel logic singleton exactly as the api/chattel facade does (the Combustible/Energized precedent)
import { ChattelLogic } from "../../platform/idea/api/ChattelLogic";
import type { ChattelOwner } from "./ChattelRecord";
import type { ChattelBasis } from "./ChattelEvent";
import type { MarkupAugmenter } from "../../api/mml";

/** The outcome of a stamp/transfer — the minted id, or a refusal reason. */
export type ChattelStampResult =
  | { ok: true; chattelId: string }
  | { ok: false; reason: string };

/** Resolve the HMR-able ChattelLogic singleton (the title registry face). */
function chattelLogic(): ChattelLogic {
  return StuffApi.singletonSync(
    "/platform/idea/api/chattel",
    () => new ChattelLogic(),
  );
}

/**
 * Build the typed owner principal for a Stuff: an organization takes the
 * `organization` arm; anything else is a player.
 */
function ownerKeyOf(owner: Stuff): ChattelOwner {
  const templatePath = owner.getIdentityPath() ?? "";
  return MixinApi.isOrganization(owner)
    ? { kind: "organization", templatePath }
    : { kind: "player", templatePath };
}

/**
 * The id-minting contract: chattel identity has no in-world participant
 * (no domain Idea mints it — the chattel logic singleton is the minting
 * authority), so the gate names that one caller by its stable template
 * path instead of admitting the whole Api tier.
 */
const ByChattelLogic = SecurityPolicies.FromTemplate("/platform/idea/api/chattel");

/** The public method surface a chattel-bearing good exposes. */
export interface Chattel {
  /** The durable per-instance id, or "" before first stamp. */
  getChattelId(): string;
  /** Privileged: set the server-minted id — chattel-logic-only. */
  _setChattelId(id: string): void;

  // The title face (F1) — forwards into ChattelLogic.
  /** The owner — `stamp ?? parcel-extent ?? authorOf`; null when nobody. */
  chattelOwner(): Promise<ChattelOwner | null>;
  /** Who is STAMPED on this good, synchronously — the title rung only. */
  stampedOwner(): ChattelOwner | null;
  /** Has someone been stamped as owning this good? (sync — capture walk). */
  isStamped(): boolean;
  /**
   * ⭐ Its room is going dormant, not away: the destruct that follows is
   * the room's, and the title outlives it. Called only by a persistable
   * container's destruct cascade.
   */
  keepTitleThroughDestruct(): void;
  /**
   * Re-derive placement from where the good now IS. Called by the
   * movement primitive itself on every move (`ContainmentApi.move`) —
   * nobody calls it by hand. A FRESH arrival (a good from nowhere) also
   * derives its title (see ChattelLogic's `derivedMinter`).
   */
  followCustody(arrival?: { fresh: boolean; to: Stuff | null }): Promise<void>;
  /**
   * Establish ownership — mint the durable id and title it to `owner`.
   * `bound` binds the title: it can never be transferred (D10).
   */
  stampChattel(owner: Stuff, opts?: { bound?: boolean }): Promise<ChattelStampResult>;
  /** Is this good's title bound — never transferable? Sync dry read. */
  isTitleBound(): boolean;
  /**
   * Transfer ownership — re-stamp to `newOwner` (chain-of-title event),
   * stating WHY it moved (tropes D7): a gift, a sale (its money leg), terms
   * or a restoration. The basis is a fact the caller holds; the row keeps it.
   */
  transferChattel(newOwner: Stuff, basis: ChattelBasis): Promise<ChattelStampResult>;
  /**
   * ⭐ This good was handed from `from` to `to` (tropes D7): its title
   * follows it — a gift, unrequited — when it was `from`'s and is not lent
   * (`{ lend: true }`) or bound. A good `from` held but did not own only
   * changed hands. `from` must be the one acting. Answers whether the
   * title passed.
   */
  handedOver(from: Stuff, to: Stuff, opts?: { lend?: boolean }): Promise<boolean>;
}

/**
 * ⭐ The title line a good on a COUNTER appends to its own `look`
 * (economic bootstrap D11): *held on the farm outfit's terms until sold;
 * the shop asks …* — or *on consignment for … at …*. The shelf knows the
 * listing; the good asks its container. A good in nobody's shop says
 * nothing. Sync and pure, like every augmenter.
 */
function titleLineAugmenter(text: string, host: Stuff, _viewer: Stuff): string {
  const shelf = MixinApi.isContainable(host) ? host.getContainer() : null;
  if (!shelf) return text;
  const line = (shelf as { termsLineFor?: (item: Stuff) => string }).termsLineFor?.(host) ?? "";
  return line ? `${text} ${line}` : text;
}

export function ChattelMixin<TBase extends MixinConstructor<Stuff>>(
  Base: TBase,
) {
  class ChattelMixin extends Base implements Chattel {
    static _mixinName = "ChattelMixin";

    /** The title line for a good on a counter — see {@link titleLineAugmenter}. */
    static markupAugmenters: MarkupAugmenter[] = [titleLineAugmenter];

    static fieldMeta: FieldMeta = {
      _chattelId: { persistent: true },
    };

    /**
     * The durable per-instance id. Empty until minted by the chattel
     * logic on first stamp. Plain field (not `#`): the persistence
     * hydrator bracket-assigns it on restore (there is no `set_chattelId`
     * for it to prefer), while the gated `_setChattelId` is the only
     * *programmatic* mutation path.
     */
    public _chattelId: string = "";

    public getChattelId(): string {
      return this._chattelId;
    }

    /**
     * Server-mint the id. Gated to the chattel logic singleton (the
     * minting authority), `@Final @Unshadowable` so the identity write
     * is unspoofable by a subclass override or a shadow.
     */
    @CallSecurity(ByChattelLogic)
    @Final
    @Unshadowable
    public _setChattelId(id: string): void {
      this._chattelId = id;
    }


    /**
     * GC the chattel registry row when the good is genuinely destroyed
     * (consumed, explicitly destructed, or culled loose in a transient
     * room). Safe to release unconditionally: (1) chattel ids are UUIDs,
     * never reused, so a leaked/stale row can never be inherited by a
     * future clone; and (2) player-held goods **evacuate** (move to the
     * room) rather than destruct when their Avatar host is evicted — so
     * `onDestruct` never fires on an inventory item whose id is riding a
     * snapshot, and its durable row survives the relog. Fire-and-forget:
     * the id is captured synchronously (the item is still live here) and
     * the async release runs after `destroy()`. Dynamic import dodges the
     * bootstrap Api cycle (the diagnostics precedent).
     *
     * @hook Witness — chains `super.onDestruct()` so composed layers run.
     */
    // ------- the title face (F1) — forwards into ChattelLogic -------

    /** See {@link Chattel.chattelOwner} — the three-rung total resolve. */
    public chattelOwner(): Promise<ChattelOwner | null> {
      return chattelLogic().ownerOf(this as unknown as Stuff);
    }

    /**
     * Who is stamped on this good, from the in-memory title index —
     * **synchronously**, which is the whole reason it exists beside the
     * async {@link chattelOwner}: a caller inside a filter (the MQL
     * `:mine` predicate) cannot await.
     *
     * ⚠ The *stamp* rung only. `chattelOwner()` resolves all three rungs
     * (stamp → parcel → author); this answers the narrow question "whose
     * name is on it", and answers `null` before the registry warms.
     */
    public stampedOwner(): ChattelOwner | null {
      return chattelLogic().stampedOwnerOf(this as unknown as Stuff);
    }

    /** See {@link Chattel.handedOver} — the good decides its own title. */
    @Final
    @Unshadowable
    public async handedOver(from: Stuff, to: Stuff, opts?: { lend?: boolean }): Promise<boolean> {
      AccessApi.requireActor(from);
      if (opts?.lend === true || this.isTitleBound()) return false;
      const owner = this.stampedOwner();
      if (owner === null || owner.kind === "group" || owner.templatePath !== from.getIdentityPath()) {
        return false;
      }
      const moved = await this.transferChattel(to, { kind: "unrequited" });
      return moved.ok;
    }

    /**
     * See {@link Chattel.isStamped}. Synchronous, and that is the point
     * — the persistence capture walk cannot await, and the stamp IS the
     * minted id.
     */
    public isStamped(): boolean {
      return this._chattelId !== "";
    }


    /** See {@link Chattel.followCustody} — records, never judges. */
    @Final
    @Unshadowable
    public followCustody(arrival?: { fresh: boolean; to: Stuff | null }): Promise<void> {
      return chattelLogic().followCustody(this as unknown as Stuff, arrival);
    }

    /**
     * See {@link Chattel.stampChattel}. Sealed — the chain-of-title
     * invariant lives in the logic singleton and no subclass or shadow
     * may interpose on the title write.
     */
    @Final
    @Unshadowable
    public stampChattel(
      owner: Stuff,
      opts: { bound?: boolean } = {},
    ): Promise<ChattelStampResult> {
      return chattelLogic().stamp(this as unknown as Stuff, ownerKeyOf(owner), opts);
    }

    public isTitleBound(): boolean {
      return chattelLogic().isBound(this as unknown as Stuff);
    }

    /** See {@link Chattel.transferChattel} — auditable re-stamp. */
    @Final
    @Unshadowable
    public transferChattel(newOwner: Stuff, basis: ChattelBasis): Promise<ChattelStampResult> {
      return chattelLogic().transfer(
        this as unknown as Stuff,
        ownerKeyOf(newOwner),
        basis,
      );
    }

    /**
     * Set by {@link keepTitleThroughDestruct}: this instance dies with a
     * room going dormant, and its title (and its owner's estate entry,
     * which names that room) must survive it so the room's next overlay
     * lays it down again.
     */
    private _titleOutlivesThis = false;

    /**
     * See {@link Chattel.keepTitleThroughDestruct}. ⭐ A
     * smack slept with a player's oakum in her hold: the hold
     * was captured, the owned good flushed to its owner's estate, and then
     * the hold's destruct destructed the oakum and RELEASED its title — so
     * the estate entry named a good the registry no longer had, and the
     * next overlay laid nothing down. Every dormant room did the same.
     */
    // Only the destruct cascade: `ContainerMixin.cleanupOnDestruct` is a
    // static run inside `StuffApi.destruct`, so the frame it calls from is
    // StuffApi's — there is no container instance to name.
    @CallSecurity(SecurityPolicies.FromModule('/api/stuff#StuffApi'))
    @Final
    @Unshadowable
    public keepTitleThroughDestruct(): void {
      this._titleOutlivesThis = true;
    }

    public onDestruct(): void {
      const id = this._titleOutlivesThis ? '' : this._chattelId;
      if (id) {
        void import("../../api/chattel")
          .then(({ ChattelApi }) => ChattelApi.release(id))
          .catch((err) =>
            console.warn(
              `ChattelMixin.onDestruct: chattel release failed for ${id}`,
              err,
            ),
          );
      }
      super.onDestruct();
    }
  }
  return ChattelMixin;
}
