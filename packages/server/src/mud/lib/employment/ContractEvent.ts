/**
 * ContractEvent — the append-only event chain of one gig (the
 * `chattel_events` / `parcel_events` shape): one row per lifecycle act,
 * nothing overwritten, indexed on `contractId`. Money legs live **only**
 * in `bank_ledger`; an event that moved money carries the linking `txId`.
 *
 * The **`fulfilled`** row is special: it carries no money (`txId` empty) —
 * it is the engine-sealed proof-of-delivery, written only by the gated
 * logic *after* the engine itself verified the condition at the
 * destination (call security is the authentication; the narrowest
 * instance of the future general trusted-recording instrument). `complete`
 * redeems it even after later state drift.
 */

import { Document } from "../persistence/Document";
import { Collections } from "../persistence/Collections";
import type { FieldMeta } from "../mixin";

export const CONTRACT_EVENT_KINDS = [
  "posted",
  "claimed",
  "fulfilled",
  "breached",
  "released-back",
  "settled",
  "reverted",
] as const;

export type ContractEventKind = (typeof CONTRACT_EVENT_KINDS)[number];

export class ContractEvent extends Document {
  static collectionName = Collections.ContractEvents;
  static fieldMeta: FieldMeta = {
    contractId: { persistent: true },
    event: { persistent: true },
    actor: { persistent: true },
    counterparty: { persistent: true },
    txId: { persistent: true },
    memo: { persistent: true },
    at: { persistent: true },
    realAt: { persistent: true },
  };

  contractId = "";
  event: ContractEventKind = "posted";
  /** The acting principal's durable key (context-derived), or "system". */
  actor = "";
  /** The other side of the act (payee on settle, issuer on revert), or "". */
  counterparty = "";
  /** The `bank_ledger` transaction this event's money legs rode, or "". */
  txId = "";
  /** Free-text note (`unfundable`, an expiry reason, …). */
  memo = "";
  /** Game-time SECONDS. */
  at = 0;
  /** Real-time epoch MILLISECONDS. */
  realAt = 0;

  /** The event chain for `contractId`, oldest-first (the ChattelEvent shape). */
  static async findByContractId(contractId: string): Promise<ContractEvent[]> {
    const rows = await ContractEvent.find<ContractEvent>({ contractId });
    return rows.sort((a, b) => a.at - b.at || a.realAt - b.realAt);
  }
}
