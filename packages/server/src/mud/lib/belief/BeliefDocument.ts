/**
 * BeliefDocument — the persisted form of one {@link BeliefRecord}, one
 * document per `{viewerId, realm, referent}` in the dedicated `beliefs`
 * collection.
 *
 * A plain `Document` (not Stuff): the row IS the belief. The live store
 * is the in-memory `BeliefStoreMixin` map; these documents are its
 * durable backing, hydrated in on session establish and written through
 * per-record. Keeping each record its own row (vs. one-big-doc-per-
 * viewer) avoids the 16MB cap and per-encounter whole-array rewrites —
 * the `ContactsMixin` anti-precedent.
 *
 * `viewerId` is the durable per-viewer key (`templatePath`); the
 * `beliefs` collection is indexed on it (see
 * `PersistenceManager.createIndexes`) so hydrate and the future
 * per-player cleanup cascade stay O(rows-for-this-viewer).
 */

import { Document } from '../persistence/Document';
import { Collections } from '../persistence/Collections';
import type { BeliefRecord, BeliefPayload } from './BeliefStore';
import type { FieldMeta } from '../mixin';

export default class BeliefDocument extends Document {
  static collectionName = Collections.Beliefs;
  static fieldMeta: FieldMeta = {
    viewerId: { persistent: true },
    realm: { persistent: true },
    referent: { persistent: true },
    knownAs: { persistent: true },
    firstSeen: { persistent: true },
    lastSeen: { persistent: true },
    payload: { persistent: true },
  };

  /** Durable owner key (the viewer's `templatePath`). */
  viewerId = '';
  realm = '';
  referent = '';
  knownAs: string | null = null;
  firstSeen = 0;
  lastSeen = 0;
  payload: BeliefPayload = {};

  /** Copy a runtime record onto this document for `save()`. */
  applyRecord(viewerId: string, record: BeliefRecord): void {
    this.viewerId = viewerId;
    this.realm = record.realm;
    this.referent = record.referent;
    this.knownAs = record.knownAs;
    this.firstSeen = record.firstSeen;
    this.lastSeen = record.lastSeen;
    this.payload = record.payload;
  }

  /** Project this document back to a runtime record for the in-memory store. */
  toRecord(): BeliefRecord {
    return {
      realm: this.realm,
      referent: this.referent,
      knownAs: this.knownAs ?? null,
      firstSeen: this.firstSeen,
      lastSeen: this.lastSeen,
      payload: this.payload ?? {},
    };
  }
}
