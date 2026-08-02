/**
 * PartyRecord — the durable persistence record behind a {@link Party}
 * Idea (the "Idea backed by a Document" shape).
 *
 * The live party is a `Party` **Idea** (state encapsulated on it,
 * MQL-visible, resolved through the Stuff graph — no central registry).
 * Its *durable* state is mirrored here, in the `parties` collection: a
 * dumb `{path, …}` row keyed on the party Idea's `templatePath`. Only
 * durable parties get a record; ad-hoc parties live only in the graph and
 * are never written.
 *
 * The collection doubles as the **queryable index for durable parties**
 * (`party list` / `muster` read `PartyRecord.find({memberIds})` /
 * `{name}` rather than enumerating live Ideas) and the **boot warm**
 * source (`PartyLogic.boot()` re-materializes each row into a Party Idea).
 */

import { Document } from "../persistence/Document";
import type { FieldMeta } from "../mixin";

export const PARTIES_COLLECTION = "parties";

export class PartyRecord extends Document {
  static collectionName = PARTIES_COLLECTION;
  static fieldMeta: FieldMeta = {
    path: { persistent: true },
    name: { persistent: true },
    founderId: { persistent: true },
    captainId: { persistent: true },
    memberIds: { persistent: true },
    combatSide: { persistent: true },
    channelRef: { persistent: true },
    formationPath: { persistent: true },
    roleAssignments: { persistent: true },
  };

  /** The live Party Idea's `templatePath` — the durable join key. */
  path: string = "";
  name: string = "";
  founderId: string = "";
  captainId: string = "";
  memberIds: string[] = [];
  combatSide: string = "";
  channelRef: string = "";
  formationPath: string = "";
  roleAssignments: Record<string, string> = {};
}
