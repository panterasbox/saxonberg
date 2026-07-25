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
 * (`Globbable`) are deliberately out of scope — a stack that splits/merges
 * has no stable per-instance id; `ChattelApi` refuses to stamp a glob, so a
 * glob's `_chattelId` stays empty and it is owned-by-possession.
 */

import type { MixinConstructor } from "../mixin";
import type { Stuff } from "../stuff/Stuff";
import { CallSecurity, Final, Unshadowable } from "../security/decorators";
import { SecurityPolicies } from "../security/SecurityPolicies";

/**
 * The id-minting contract: chattel identity has no in-world participant
 * (no domain Idea mints it — the chattel logic singleton is the minting
 * authority), so the gate names that one caller by its stable template
 * path instead of admitting the whole Api tier.
 */
const ByChattelLogic = SecurityPolicies.FromTemplate("/obj/api/chattel");

/** The public method surface a chattel-bearing good exposes. */
export interface Chattel {
  /** The durable per-instance id, or "" before first stamp. */
  getChattelId(): string;
  /** Privileged: set the server-minted id — chattel-logic-only. */
  _setChattelId(id: string): void;
}

export function ChattelMixin<TBase extends MixinConstructor<Stuff>>(
  Base: TBase,
) {
  class ChattelMixin extends Base implements Chattel {
    static _mixinName = "ChattelMixin";

    static persistentFields = ["_chattelId"];

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
    public onDestruct(): void {
      const id = this._chattelId;
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
