/**
 * ChattelRegistry — the movable-good title index (the twin of
 * `ParcelRegistry`). Owns the in-memory `chattelId → ChattelOwner` map
 * over the `chattel` collection + the mint-a-fresh-id seam, and is the
 * sole writer of `chattel` / `chattel_events`.
 *
 * Ownership is keyed on a durable per-instance id (not a path), and stored
 * SEPARATELY from the editable good it gates — the governing security
 * invariant it shares with the parcel registry. Every method admits only
 * the `ChattelApi` face module or the `ChattelLogic` singleton's template
 * path (`AnyOf(FromModule, FromTemplate)`, the parcel/access precedent).
 *
 * A transfer appends a `chattel_events` row and overwrites the current
 * owner — never a destructive overwrite of history. A `release` (GC on a
 * destroyed good) deletes the current-state row but appends a terminal
 * `released` event, so the chain-of-title terminates legibly (the
 * deliberate divergence from parcel `retire`, which is a silent delete).
 */

import { Idea } from "../../lib/stuff/Idea";
import { PostRegistrationMixin } from "../../lib/stuff/PostRegistration";
import { CallSecurity } from "../../lib/security/decorators";
import { SecurityPolicies } from "../../lib/security/SecurityPolicies";
import { ExecutionContextApi } from "../../api/execution-context";
import { SecurityApi } from "../../api/security";
import {
  ChattelRecord,
  type ChattelOwner,
} from "../../lib/chattel/ChattelRecord";
import { ChattelEvent, type ChattelEventKind } from "../../lib/chattel/ChattelEvent";
import type { VetoResult } from "../../lib/errors";
import type { Stuff } from "../../lib/stuff/Stuff";

const ChattelRegistryBase = PostRegistrationMixin(Idea);

// Admit both the Api face module and the logic singleton's template path,
// mirroring `ParcelRegistry`/`AccessRegistry`'s two-caller policy.
const ChattelApiCallers = SecurityPolicies.AnyOf(
  SecurityPolicies.FromModule("/api/chattel#ChattelApi"),
  SecurityPolicies.FromTemplate("/platform/idea/api/chattel"),
);

export default class ChattelRegistry extends ChattelRegistryBase {
  /** The current-state title index, keyed on the durable per-instance id. */
  private index = new Map<string, ChattelOwner>();

  public override async postRegister(_context?: unknown): Promise<void> {
    await this.rebuildIndex();
  }

  public canEvict(): VetoResult {
    return { ok: false, reason: "system singleton; never culled" };
  }

  /** A fresh, collision-resistant per-instance id. */
  @CallSecurity(ChattelApiCallers)
  public newId(): string {
    return `ch-${SecurityApi.uuid()}`;
  }

  /** The current owner of `chattelId`, or null (no title on file). */
  @CallSecurity(ChattelApiCallers)
  public ownerOf(chattelId: string): ChattelOwner | null {
    return this.index.get(chattelId) ?? null;
  }

  /**
   * Record where the owner keeps a titled good — the **by-room index**
   * half of a `place` write (the good's own field is the other half, and
   * `ChattelLogic.setPlace` writes both in one call). A no-op for a good
   * with no title on file: an unstamped good has no owner to keep it.
   */
  @CallSecurity(ChattelApiCallers)
  public async setPlace(chattelId: string, place: string): Promise<void> {
    if (!this.index.has(chattelId)) return;
    const record = await ChattelRecord.findByChattelId(chattelId);
    if (!record) return;
    record.place = place;
    await record.save();
  }

  /** Every titled good the index says is placed in `place`. */
  @CallSecurity(ChattelApiCallers)
  public async placedIn(place: string): Promise<ChattelRecord[]> {
    return ChattelRecord.findByPlace(place);
  }

  /**
   * Every titled good placed at or **under** `placePrefix` — a whole unit's
   * worth, across all its rooms. The lease-end sweep's input.
   */
  @CallSecurity(ChattelApiCallers)
  public async placedUnder(placePrefix: string): Promise<ChattelRecord[]> {
    const all = await ChattelRecord.findAll();
    return all.filter((r) => r.place.startsWith(placePrefix));
  }

  /** Establish title — the initial stamp (a `mint` event). */
  @CallSecurity(ChattelApiCallers)
  public async stamp(chattelId: string, owner: ChattelOwner): Promise<void> {
    const prior = this.index.get(chattelId) ?? null;
    await this.upsert(chattelId, owner);
    await this.appendEvent(prior ? "transfer" : "mint", chattelId, prior, owner);
    this.index.set(chattelId, owner);
  }

  /** Re-stamp title to a new owner — auditable (a `transfer` event). */
  @CallSecurity(ChattelApiCallers)
  public async transfer(
    chattelId: string,
    newOwner: ChattelOwner,
  ): Promise<void> {
    const prior = this.index.get(chattelId) ?? null;
    await this.upsert(chattelId, newOwner);
    await this.appendEvent("transfer", chattelId, prior, newOwner);
    this.index.set(chattelId, newOwner);
  }

  /**
   * GC a destroyed good's title — delete the current-state row + drop the
   * index entry, but append a terminal `released` event (the legible
   * chain-of-title terminus that parcel `retire` omits).
   */
  @CallSecurity(ChattelApiCallers)
  public async release(chattelId: string): Promise<void> {
    const prior = this.index.get(chattelId) ?? null;
    await ChattelRecord.deleteByChattelId(chattelId);
    await this.appendEvent("released", chattelId, prior, null);
    this.index.delete(chattelId);
  }

  /** Rebuild the in-memory index from the `chattel` collection (boot / reload). */
  @CallSecurity(ChattelApiCallers)
  public async rebuildIndexNow(): Promise<void> {
    await this.rebuildIndex();
  }

  // --- ungated privates (intra-singleton self-calls resolve to the
  // Registry, which is outside the ChattelApi allowlist) ---

  private async upsert(chattelId: string, owner: ChattelOwner): Promise<void> {
    const record =
      (await ChattelRecord.findByChattelId(chattelId)) ?? new ChattelRecord();
    record.chattelId = chattelId;
    record.owner = owner;
    record.titledAt = Date.now();
    await record.save();
  }

  private async appendEvent(
    kind: ChattelEventKind,
    chattelId: string,
    from: ChattelOwner | null,
    to: ChattelOwner | null,
  ): Promise<void> {
    const event = new ChattelEvent();
    event.chattelId = chattelId;
    event.event = kind;
    event.from = from;
    event.to = to;
    event.actor = this.actingAuthorPath();
    event.at = Date.now();
    await event.save();
  }

  private actingAuthorPath(): string {
    const actor = ExecutionContextApi.getActingAuthor() as Stuff | null;
    return actor?.getTemplatePath() ?? "";
  }

  private async rebuildIndex(): Promise<void> {
    this.index.clear();
    for (const record of await ChattelRecord.findAll()) {
      const id = record.getChattelId();
      const owner = record.getOwner();
      if (id.length > 0 && owner) this.index.set(id, owner);
    }
  }
}
