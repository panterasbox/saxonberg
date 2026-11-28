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
import type { FieldMeta } from "../mixin";

export type ChattelEventKind = "mint" | "transfer" | "released";

/**
 * ⭐ Why a title moved (tropes D7) — the fact the transferring site holds,
 * so the row says gift or sale BY ITSELF and a look-back after a restart
 * reads it with nothing else: `unrequited` (a gift — `give`, `title
 * transfer`), `sale` (the money leg's `txId`), `terms` (a contract's or a
 * business's terms — a tract's crop to its operator, stock taken in, a
 * repossession), `restored` (back to who held it — a consignment reclaim).
 */
export type ChattelBasis =
  | { kind: "unrequited" }
  | { kind: "sale"; txId: string }
  | { kind: "terms" }
  | { kind: "restored" };

/** The stored form of {@link ChattelBasis}; `''` on a mint, a release or a restamp. */
export type ChattelBasisKind = ChattelBasis["kind"] | "";

export class ChattelEvent extends Document {
  static collectionName = Collections.ChattelEvents;
  static fieldMeta: FieldMeta = {
    chattelId: { persistent: true },
    event: { persistent: true },
    from: { persistent: true },
    to: { persistent: true },
    actor: { persistent: true },
    at: { persistent: true },
    actId: { persistent: true },
    causeId: { persistent: true },
    basis: { persistent: true },
    txId: { persistent: true },
  };

  chattelId: string = "";
  event: ChattelEventKind = "transfer";
  from: ChattelOwner | null = null;
  to: ChattelOwner | null = null;
  /** The acting author's durable templatePath (context-derived), or "". */
  actor: string = "";
  /** Real-time epoch millis. */
  at: number = 0;
  /** ⭐ The act this title moved in (tropes D1); `''` for system work. */
  actId: string = "";
  /** The act {@link actId} follows from, or `null`. */
  causeId: string | null = null;
  /** ⭐ Why it moved — on a `transfer` only (tropes D7). */
  basis: ChattelBasisKind = "";
  /** The sale's money leg (`bank_ledger.txId`) when `basis` is `sale`. */
  txId: string = "";

  /** The chain-of-title for `chattelId`, oldest-first. */
  static async findByChattelId(chattelId: string): Promise<ChattelEvent[]> {
    const rows = await ChattelEvent.find<ChattelEvent>({ chattelId });
    return rows.sort((a, b) => a.at - b.at);
  }
}
