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
import { CallSecurity } from "../../lib/security/decorators";
import { SecurityPolicies } from "../../lib/security/SecurityPolicies";
import { ExecutionContextApi } from "../../api/execution-context";
import { SecurityApi } from "../../api/security";
import { PersistApi } from "../../api/persist";
import {
  ChattelRecord,
  type ChattelOwner,
} from "../../lib/chattel/ChattelRecord";
import { ChattelEvent, type ChattelBasis, type ChattelEventKind } from "../../lib/chattel/ChattelEvent";
import type { VetoResult } from "../../lib/errors";
import { Stuff } from "../../lib/stuff/Stuff";

import type { BoundaryRole } from '../../lib/security/BoundaryRole';
const ChattelRegistryBase = Idea;

// Admit both the Api face module and the logic singleton's template path,
// mirroring `ParcelRegistry`/`AccessRegistry`'s two-caller policy.
const ChattelApiCallers = SecurityPolicies.AnyOf(
  SecurityPolicies.FromModule("/api/chattel#ChattelApi"),
  SecurityPolicies.FromTemplate("/platform/idea/api/chattel"),
);

export default class ChattelRegistry extends ChattelRegistryBase {
  /**
   * engine bookkeeping that happens to be Stuff-shaped: a registry holds the framework's own index, not world state anybody stands in.
   *
   * ⭐ Declared, not enumerated. This was one of twenty-seven
   * template-path strings in `api/security.ts`, listed there
   * *"because each is a singleton rather than a class of many"* —
   * which a static on the class makes irrelevant. See
   * `lib/security/BoundaryRole.ts`.
   */
  static boundaryRole: BoundaryRole = 'infrastructure';

  /** The current-state title index, keyed on the durable per-instance id. */
  private index = new Map<string, ChattelOwner>();

  /** The ids whose title is bound — never transferable (aether-devices D10). */
  private boundIds = new Set<string>();


  public override async onCreate(_context?: unknown): Promise<void> {
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

  /** Is the title on `chattelId` bound — never transferable? Sync. */
  @CallSecurity(ChattelApiCallers)
  public isBound(chattelId: string): boolean {
    return this.boundIds.has(chattelId);
  }

  /** Establish title — the initial stamp (a `mint` event); `bound` binds it. */
  @CallSecurity(ChattelApiCallers)
  public async stamp(
    chattelId: string,
    owner: ChattelOwner,
    bound = false,
  ): Promise<void> {
    const prior = this.index.get(chattelId) ?? null;
    await this.upsert(chattelId, owner, bound);
    if (bound) this.boundIds.add(chattelId);
    await this.appendEvent(prior ? "transfer" : "mint", chattelId, prior, owner);
    this.index.set(chattelId, owner);
  }

  /** Re-stamp title to a new owner — auditable (a `transfer` event). */
  @CallSecurity(ChattelApiCallers)
  public async transfer(
    chattelId: string,
    newOwner: ChattelOwner,
    basis: ChattelBasis,
  ): Promise<void> {
    const prior = this.index.get(chattelId) ?? null;
    await this.upsert(chattelId, newOwner);
    await this.appendEvent("transfer", chattelId, prior, newOwner, basis);
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
    this.boundIds.delete(chattelId);
  }

  /** Rebuild the in-memory index from the `chattel` collection (boot / reload). */
  @CallSecurity(ChattelApiCallers)
  public async rebuildIndexNow(): Promise<void> {
    await this.rebuildIndex();
  }

  // --- ungated privates (intra-singleton self-calls resolve to the
  // Registry, which is outside the ChattelApi allowlist) ---

  /**
   * Title the row — one keyed write of the owner and the time (db-performance
   * H4; it was a find then a save). The write names its fields, so a field
   * the stamp gains is one more name in the list: `bound` (aether-devices
   * D10) is written when the stamp binds, and never cleared here.
   */
  private async upsert(
    chattelId: string,
    owner: ChattelOwner,
    bound = false,
  ): Promise<void> {
    const record = new ChattelRecord();
    record.chattelId = chattelId;
    record.owner = owner;
    if (bound) record.bound = true;
    record.titledAt = Date.now();
    await PersistApi.saveMany(ChattelRecord.collectionName, [
      await record.toBatchWrite({
        key: ['chattelId'],
        fields: bound ? ['owner', 'titledAt', 'bound'] : ['owner', 'titledAt'],
      }),
    ]);
  }

  private async appendEvent(
    kind: ChattelEventKind,
    chattelId: string,
    from: ChattelOwner | null,
    to: ChattelOwner | null,
    basis?: ChattelBasis,
  ): Promise<void> {
    const event = new ChattelEvent();
    event.chattelId = chattelId;
    event.event = kind;
    event.from = from;
    event.to = to;
    event.actor = this.actingPersonPath();
    event.at = Date.now();
    const act = ExecutionContextApi.getCurrentAct();
    event.actId = act?.actId ?? "";
    event.causeId = act?.causeId ?? null;
    if (basis) {
      event.basis = basis.kind;
      if (basis.kind === "sale") event.txId = basis.txId;
    }
    await event.save();
  }

  /**
   * ⭐ Who is ACTING, as a durable person key (tropes D4): never the
   * labor-plane author, and never `getTemplatePath()` — every player shares
   * one lineage path.
   */
  private actingPersonPath(): string {
    const actor = ExecutionContextApi.getActor();
    return actor instanceof Stuff ? actor.getIdentityPath() ?? "" : "";
  }

  private async rebuildIndex(): Promise<void> {
    this.index.clear();
    this.boundIds.clear();
    for (const record of await ChattelRecord.findAll()) {
      const id = record.getChattelId();
      const owner = record.getOwner();
      if (id.length > 0 && owner) this.index.set(id, owner);
      if (id.length > 0 && record.isBound()) this.boundIds.add(id);
    }
  }
}
