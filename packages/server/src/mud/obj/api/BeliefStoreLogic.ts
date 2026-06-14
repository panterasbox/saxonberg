// BeliefStoreLogic — the hot-reloadable logic singleton behind
// BeliefStoreApi. (Doc comment on the class below so @internal lands on
// the reflection.)

import { Idea } from '../../lib/stuff/Idea';
import { CallSecurity, Unshadowable } from '../../lib/security/decorators';
import { SecurityPolicies } from '../../lib/security/SecurityPolicies';
import type { Stuff } from '../../lib/stuff/Stuff';
import type { BeliefRecord } from '../../lib/belief/BeliefStore';
import BeliefDocument from '../../lib/belief/BeliefDocument';
import { MixinApi } from '../../api/mixin';
import { PersistenceManager } from '../../../backend/PersistenceManager';

const BeliefStoreApiCallers = SecurityPolicies.FromModule(
  'mud/api/belief#BeliefStoreApi'
);

/** Has this record learned anything worth persisting? */
function isLearned(record: BeliefRecord): boolean {
  return record.knownAs !== null || record.payload.typeKnown === true;
}

/** Persistence is a no-op unless Mongo is connected (tests, pre-boot). */
function active(): boolean {
  return PersistenceManager.get().isConnected();
}

/** The durable per-viewer key, or `null` for a session-ephemeral viewer. */
function viewerKey(viewer: Stuff): string | null {
  return viewer.getTemplatePath();
}

/**
 * Per-record write-through. Persists a learned record (upsert keyed by
 * `{viewerId, realm, referent}`); no-ops for a bare stranger record, a
 * keyless viewer, or a closed connection. Shared by `writeRecord` and
 * `evictAndFlush` (a module-private function rather than an
 * intra-singleton self-call, which the call-security gate would deny).
 */
async function writeRecordImpl(
  viewer: Stuff,
  record: BeliefRecord
): Promise<void> {
  if (!active()) return;
  const viewerId = viewerKey(viewer);
  if (!viewerId || !isLearned(record)) return;
  const [existing] = await BeliefDocument.find({
    viewerId,
    realm: record.realm,
    referent: record.referent,
  });
  const doc = existing ?? new BeliefDocument();
  doc.applyRecord(viewerId, record);
  await doc.save();
}

/**
 * BeliefStoreLogic — the hot-reloadable logic singleton behind
 * {@link BeliefStoreApi}.
 *
 * Lives at `/obj/api/belief` (a stateless `Stuff` singleton, no backing
 * `Template`); `BeliefStoreApi`'s public statics forward here via
 * `StuffApi.singletonSync`. Persistence shape and the no-read naming
 * constraint are documented on the Api face.
 *
 * Internal sub-logic (the former static `#active`/`#viewerKey` helpers
 * and the `writeRecord` self-call) lives in module-private free
 * functions, so there are no intra-singleton `this.x()` calls to trip
 * the gate. Each public method carries the `FromModule` gate per method.
 *
 * @internal
 */
@Unshadowable
export class BeliefStoreLogic extends Idea {
  /** See {@link BeliefStoreApi.hydrate}. */
  @CallSecurity(BeliefStoreApiCallers)
  public async hydrate(viewer: Stuff): Promise<void> {
    if (!active() || !MixinApi.isBeliefStore(viewer)) return;
    const viewerId = viewerKey(viewer);
    if (!viewerId) return;
    const docs = await BeliefDocument.find({ viewerId });
    for (const doc of docs) viewer.loadBelief(doc.toRecord());
  }

  /** See {@link BeliefStoreApi.writeRecord}. */
  @CallSecurity(BeliefStoreApiCallers)
  public async writeRecord(
    viewer: Stuff,
    record: BeliefRecord
  ): Promise<void> {
    return writeRecordImpl(viewer, record);
  }

  /** See {@link BeliefStoreApi.deleteRecord}. */
  @CallSecurity(BeliefStoreApiCallers)
  public async deleteRecord(
    viewer: Stuff,
    realm: string,
    referent: string
  ): Promise<void> {
    if (!active()) return;
    const viewerId = viewerKey(viewer);
    if (!viewerId) return;
    const docs = await BeliefDocument.find({ viewerId, realm, referent });
    for (const doc of docs) await doc.delete();
  }

  /** See {@link BeliefStoreApi.evictAndFlush}. */
  @CallSecurity(BeliefStoreApiCallers)
  public async evictAndFlush(viewer: Stuff): Promise<void> {
    if (!MixinApi.isBeliefStore(viewer)) return;
    if (active()) {
      const viewerId = viewerKey(viewer);
      if (viewerId) {
        for (const record of viewer.allBeliefs()) {
          if (isLearned(record)) await writeRecordImpl(viewer, record);
        }
      }
    }
    viewer.clearBeliefs();
  }
}
