/**
 * ParcelEvent — one row in the append-only **chain-of-title** log
 * (`parcel_events`): every title event (genesis at `subdivide`, handoff
 * at `transfer`) recorded permanently.
 *
 * The `parcels` rows are the current-state cache; this log is the
 * immutable history (the `bank_ledger`→`bank_accounts` /
 * `renown_events`→`renown` sibling shape). A `transfer` is therefore
 * **never a destructive overwrite** — the prior owner stays recoverable
 * from the log, preserving ownership lineage (the real-estate-metagame
 * provenance seam, slate §L). 0a writes the trail; rebuild-from-log and
 * the chain-of-title *readout* are deferred consumers.
 *
 * Write-gated to `ParcelApi` + the seed installer (the governing security
 * invariant — access-check data content edits can never reach).
 */

import { Document } from "../persistence/Document";
import type { ParcelOwner } from "./ParcelRecord";
import type { FieldMeta } from "../mixin";

/** The kind of title event a row records. */
export type ParcelEventKind = "subdivide" | "transfer";

export class ParcelEvent extends Document {
  static collectionName = "parcel_events";
  static fieldMeta: FieldMeta = {
    extent: { persistent: true },
    event: { persistent: true },
    from: { persistent: true },
    to: { persistent: true },
    actor: { persistent: true },
    at: { persistent: true },
  };

  /** The parcel's `extent` (the title this event concerns). */
  extent: string = "";

  /** `subdivide` (genesis) or `transfer` (handoff). */
  event: ParcelEventKind = "transfer";

  /** The prior owner (null at genesis / when unheld). */
  from: ParcelOwner | null = null;

  /** The new owner. */
  to: ParcelOwner | null = null;

  /** The acting principal's durable `templatePath` (from context, never a param). */
  actor: string = "";

  /** Epoch-ms timestamp of the event. */
  at: number = 0;

  /** Every title event for `extent`, oldest-first (the lineage readout). */
  static async findByExtent(extent: string): Promise<ParcelEvent[]> {
    const rows = await ParcelEvent.find<ParcelEvent>({ extent });
    return rows.sort((a, b) => a.at - b.at);
  }
}
