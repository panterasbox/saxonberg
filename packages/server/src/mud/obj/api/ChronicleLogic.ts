// ChronicleLogic — the hot-reloadable logic singleton behind
// ChronicleApi. (Doc comment on the class below so @internal lands on
// the reflection.)

import { Idea } from '../../lib/stuff/Idea';
import { CallSecurity, Unshadowable } from '../../lib/security/decorators';
import { SecurityPolicies } from '../../lib/security/SecurityPolicies';
import type { Stuff } from '../../lib/stuff/Stuff';
import ChronicleEntry from '../../lib/chronicle/ChronicleEntry';
import type {
  ChronicleEntryFields,
  ChronicleClaimSeed,
} from '../../lib/chronicle/ChronicleEntry';
import { ProseApi } from '../../api/prose';
import { WorldClockApi } from '../../api/worldclock';
import { PersistApi } from '../../api/persist';

const ChronicleApiCallers = SecurityPolicies.FromModule('/api/chronicle#ChronicleApi'
);

/** Persistence is a no-op unless Mongo is connected (tests, pre-boot). */
function active(): boolean {
  return PersistApi.isConnected();
}

/** The durable owner key, or `null` for a session-ephemeral owner. */
function ownerKey(owner: Stuff): string | null {
  return owner.getTemplatePath();
}

/**
 * The single build seam: resolve a caller's fields into one persisted
 * {@link ChronicleEntry}. Renders prose when a `template` is given
 * (the one "deed text via ProseApi" point), and stamps the game-time
 * witness onto a deed when `when` is omitted (the one "timestamp is the
 * witness" point) so callers never re-derive game-time. A claim forces
 * `when = null` and keeps `order`; a deed forces `order = null`.
 *
 * A module-private free function rather than an intra-singleton
 * self-call, which the call-security gate would deny (the caller would
 * be `ChronicleLogic`, not the `ChronicleApi` the gate allows).
 */
async function buildAndSave(
  ownerId: string,
  fields: ChronicleEntryFields
): Promise<void> {
  const entry = new ChronicleEntry();
  entry.owner = ownerId;
  entry.kind = fields.kind ?? 'deed';
  entry.text =
    fields.template !== undefined
      ? ProseApi.format(fields.template, fields.vars ?? {}).toString()
      : (fields.text ?? '');
  entry.when =
    entry.kind === 'deed'
      ? (fields.when ?? WorldClockApi.getNow().rawValue())
      : null;
  entry.order = entry.kind === 'claim' ? (fields.order ?? null) : null;
  entry.where = fields.where ?? null;
  entry.who = fields.who ?? [];
  entry.tags = fields.tags ?? [];
  entry.key = fields.key ?? null;
  await entry.save();
}

/** Shared mint path — no-ops without a durable owner key / connection. */
async function recordImpl(
  owner: Stuff,
  fields: ChronicleEntryFields
): Promise<void> {
  if (!active()) return;
  const ownerId = ownerKey(owner);
  if (!ownerId) return;
  await buildAndSave(ownerId, fields);
}

/**
 * Category-first idempotent mint: the first entry under `key` (for this
 * owner) wins; later calls no-op. The find-then-save-on-write-path
 * mirror of the belief upsert — a read on the *write* path only. Race is
 * benign under per-socket command serialization (the same argument
 * `belief.md` makes).
 */
async function recordOnceImpl(
  owner: Stuff,
  key: string,
  fields: ChronicleEntryFields
): Promise<void> {
  if (!active()) return;
  const ownerId = ownerKey(owner);
  if (!ownerId) return;
  const [existing] = await ChronicleEntry.find({ owner: ownerId, key });
  if (existing) return;
  await buildAndSave(ownerId, { ...fields, key });
}

/**
 * ChronicleLogic — the hot-reloadable logic singleton behind
 * {@link ChronicleApi}.
 *
 * Lives at `/obj/api/chronicle` (a stateless `Stuff` singleton, no
 * backing `Template`); `ChronicleApi`'s public statics forward here via
 * `StuffApi.singletonSync`. The dumb-store / smart-consumers framing and
 * the singularity patterns are documented on the Api face.
 *
 * Internal sub-logic (the `active`/`ownerKey` helpers and the shared
 * mint path) lives in module-private free functions, so there are no
 * intra-singleton `this.x()` calls to trip the gate. Each public method
 * carries the `FromModule` gate.
 *
 * @internal
 */
@Unshadowable
export class ChronicleLogic extends Idea {
  /** See {@link ChronicleApi.record}. */
  @CallSecurity(ChronicleApiCallers)
  public async record(
    owner: Stuff,
    fields: ChronicleEntryFields
  ): Promise<void> {
    return recordImpl(owner, fields);
  }

  /** See {@link ChronicleApi.recordDeed}. */
  @CallSecurity(ChronicleApiCallers)
  public async recordDeed(
    owner: Stuff,
    fields: ChronicleEntryFields
  ): Promise<void> {
    return recordImpl(owner, { ...fields, kind: 'deed' });
  }

  /** See {@link ChronicleApi.recordOnce}. */
  @CallSecurity(ChronicleApiCallers)
  public async recordOnce(
    owner: Stuff,
    key: string,
    fields: ChronicleEntryFields
  ): Promise<void> {
    return recordOnceImpl(owner, key, fields);
  }

  /** See {@link ChronicleApi.entriesFor}. */
  @CallSecurity(ChronicleApiCallers)
  public async entriesFor(owner: Stuff): Promise<ChronicleEntry[]> {
    if (!active()) return [];
    const ownerId = ownerKey(owner);
    if (!ownerId) return [];
    return ChronicleEntry.find({ owner: ownerId });
  }

  /** See {@link ChronicleApi.seedClaims}. */
  @CallSecurity(ChronicleApiCallers)
  public async seedClaims(
    owner: Stuff,
    seeds: ChronicleClaimSeed[]
  ): Promise<void> {
    if (!active()) return;
    const ownerId = ownerKey(owner);
    if (!ownerId) return;
    for (const seed of seeds) {
      await buildAndSave(ownerId, {
        kind: 'claim',
        text: seed.text,
        order: seed.order,
      });
    }
  }
}
