/**
 * ChattelRecord — the rebuildable current-state row of per-instance
 * *chattel* ownership (movable-good title). The twin of `ParcelRecord`
 * (`lib/parcel/`), and for the same governing reason: **ownership is
 * stored SEPARATELY from the editable good it describes**, in a gated
 * collection, so a title can never be spoofed by editing the item.
 *
 * A row keys on a durable per-instance `chattelId` (minted server-side on
 * first stamp, carried by the item's `ChattelMixin._chattelId`), NOT on a
 * template path — a template path is shared across every clone of a
 * template and cannot distinguish two torches. The `owner` is a typed
 * {@link ChattelOwner} (player-only in v1; the union leaves room for a
 * group/corpo owner without a schema change).
 *
 * The `chattel` collection is the current-state cache; the append-only
 * chain-of-title lives in `chattel_events` ({@link ChattelEvent}). A
 * `transfer` appends a new event and overwrites the row's owner — prior
 * owners stay recoverable from the event log, never destroyed.
 */

import { Document } from "../persistence/Document";
import { Collections } from "../persistence/Collections";
import type { GroupRef } from "../social/GroupProvider";

/**
 * Who owns a chattel. The union mirrors `ParcelOwner` structurally (it is
 * deliberately NOT an import — `lib/chattel` does not depend on
 * `lib/parcel`; structural typing makes a `ParcelOwner` assignable here).
 *
 * **Only the `player` arm is ever *stamped*.** The `group` arm exists so
 * that `ownerOf`'s **parcel rung** — an unstamped good whose template path
 * falls under a parcel extent resolves to that parcel's owner, and a
 * parcel may be group-held — is expressible as a *resolved* answer. No
 * stored `chattel` row ever carries it, so the persisted schema is
 * untouched (the widening this docstring anticipated in v1 is read-side
 * only). See `ChattelLogic.ownerOf`.
 */
export type ChattelOwner =
  | { kind: "group"; name?: string; ref?: GroupRef }
  | { kind: "player"; templatePath: string };

export class ChattelRecord extends Document {
  static collectionName = Collections.Chattel;
  static persistentFields = ["chattelId", "owner", "titledAt"];

  /** The durable per-instance id this title is keyed on. */
  chattelId: string = "";
  /** The current owner (a typed principal), or null before first stamp. */
  owner: ChattelOwner | null = null;
  /** Real-time epoch millis of the last title change (for auditing). */
  titledAt: number = 0;

  getChattelId(): string {
    return this.chattelId;
  }

  getOwner(): ChattelOwner | null {
    return this.owner;
  }

  /** The current-state row for `chattelId`, or null. */
  static async findByChattelId(chattelId: string): Promise<ChattelRecord | null> {
    const rows = await ChattelRecord.find<ChattelRecord>({ chattelId });
    return rows[0] ?? null;
  }

  /** Every current-state row (the boot index rebuild source). */
  static async findAll(): Promise<ChattelRecord[]> {
    return ChattelRecord.find<ChattelRecord>({});
  }

  /** Drop the current-state row for `chattelId` (GC on destruct). */
  static async deleteByChattelId(chattelId: string): Promise<void> {
    const row = await ChattelRecord.findByChattelId(chattelId);
    if (row) await row.delete();
  }
}
