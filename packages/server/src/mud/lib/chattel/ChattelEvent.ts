/**
 * ChattelEvent — the append-only chain-of-title for movable-good
 * ownership (the `parcel_events` / `renown_events` precedent). One row
 * per title act; a transfer never overwrites history, so prior owners
 * stay recoverable. Indexed on `chattelId`.
 *
 * Kinds diverge from the parcel side deliberately: chattel keeps a
 * terminal `released` event (a destroyed good's chain-of-title should
 * terminate legibly), where a parcel `retire` is a silent administrative
 * delete.
 */

import { Document } from "../persistence/Document";
import { Collections } from "../persistence/Collections";
import type { ChattelOwner } from "./ChattelRecord";

export type ChattelEventKind = "mint" | "transfer" | "released";

export class ChattelEvent extends Document {
  static collectionName = Collections.ChattelEvents;
  static persistentFields = ["chattelId", "event", "from", "to", "actor", "at"];

  chattelId: string = "";
  event: ChattelEventKind = "transfer";
  from: ChattelOwner | null = null;
  to: ChattelOwner | null = null;
  /** The acting author's durable templatePath (context-derived), or "". */
  actor: string = "";
  /** Real-time epoch millis. */
  at: number = 0;

  /** The chain-of-title for `chattelId`, oldest-first. */
  static async findByChattelId(chattelId: string): Promise<ChattelEvent[]> {
    const rows = await ChattelEvent.find<ChattelEvent>({ chattelId });
    return rows.sort((a, b) => a.at - b.at);
  }
}
