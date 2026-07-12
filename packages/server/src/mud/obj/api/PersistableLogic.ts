// PersistableLogic — the hot-reloadable logic singleton behind
// PersistableApi. Owns the persistence spine's capture/restore/compose walk.
// (Doc comment on the class below so @internal lands on the reflection.)

import { ApiLogic } from "../../lib/stuff/ApiLogic";
import { CallSecurity, Unshadowable } from "../../lib/security/decorators";
import { SecurityPolicies } from "../../lib/security/SecurityPolicies";
import { MixinApi, type AnyConstructor } from "../../api/mixin";
import { StuffApi } from "../../api/stuff";
import { ContainmentApi } from "../../api/containment";
import { SlotApi } from "../../api/slot";
import { ParcelApi } from "../../api/parcel";
import { ExecutionContextApi } from "../../api/execution-context";
import { PersistedRecord } from "../../lib/persistence/PersistedRecord";
import { Document } from "../../lib/persistence/Document";
import PersistentHydrator from "../../lib/persistence/PersistentHydrator";
import type { Marshaller } from "../../lib/persistence/Marshaller";
import type {
  MixinSlice,
  ContentEntry,
  RefEntry,
  ContainerSlice,
  SlottedSlice,
  FieldsSlice,
  Placement,
  CaptureContext,
} from "../../lib/persistence/PersistenceSlice";
import type { Stuff } from "../../lib/stuff/Stuff";
import type { Container } from "../../lib/spatial/Container";
import type { Containable } from "../../lib/spatial/Containable";
import type { Surfaced } from "../../lib/spatial/Surfaced";
import type { Slotted } from "../../lib/slot/Slotted";
import type { Slottable } from "../../lib/slot/Slottable";
import type { ParcelOwner } from "../../lib/parcel/ParcelRecord";

const PersistableApiCallers = SecurityPolicies.FromModule(
  "/api/persistable#PersistableApi",
);

/* ─────────────────────────── slice shape guards ─────────────────────── */

function isFieldsSlice(slice: MixinSlice): slice is FieldsSlice {
  return "fields" in slice;
}
function isContainerSlice(slice: MixinSlice): slice is ContainerSlice {
  return "contents" in slice;
}
function isSlottedSlice(slice: MixinSlice): slice is SlottedSlice {
  return "worn" in slice;
}

/* ─────────────────────────── owner derivation ───────────────────────── */

/**
 * Map a parcel-title owner to the record's `owner` string. A player owner
 * keys on its durable `templatePath` (so the account-deletion cascade is a
 * keyed delete matching a player's path); a group owner keys on a
 * `group:<name|ref>` sentinel; the state default keys on `'core'`. Kept
 * distinct from any real player `templatePath` so the two never collide.
 */
function ownerString(owner: ParcelOwner): string {
  if (owner.kind === "player") return owner.templatePath;
  return `group:${owner.ref ?? owner.name ?? "core"}`;
}

/**
 * The record `owner` for a host `scope` — its parcel title (the
 * `DocumentLogic.selfHomeOwnerOf` precedent, generalized through
 * `ParcelApi.ownerOf`), falling back to the host's own path when the title
 * resolve fails. Never a parameter (actor-from-context rule).
 */
async function ownerOfScope(scope: string): Promise<string> {
  try {
    return ownerString(await ParcelApi.ownerOf(scope));
  } catch {
    return scope;
  }
}

/**
 * Resolve the live principal for a record `owner`: a player-owned scope
 * restores as that player when it is online (a live `Stuff` at the path),
 * else as the host itself (self / system) — an offline player's avatar is
 * never force-materialized to restore content (resolved decision #3). Group
 * / `'core'` / self-owned scopes always restore under the host principal.
 */
function principalFor(owner: string, host: Stuff): Stuff {
  if (owner.startsWith("group:")) return host;
  const live = StuffApi.findByTemplatePath(owner);
  return live ?? host;
}

/* ─────────────────────────── marshalling ────────────────────────────── */

/**
 * Pre-warm every marshaller referenced by the host and its deep contents,
 * so the subsequent **synchronous** capture snapshot can resolve them via
 * the sync registry (`StuffApi.findByTemplatePath`) without an `await`
 * mid-snapshot — the snapshot-before-yield invariant.
 */
async function preloadTreeMarshallers(host: Stuff): Promise<void> {
  const ctors = new Set<AnyConstructor>();
  ctors.add(host.constructor as AnyConstructor);
  if (MixinApi.isContainer(host)) {
    for (const item of host.getDeepContents()) {
      ctors.add(item.constructor as AnyConstructor);
    }
  }
  for (const ctor of ctors) {
    await Document.preloadFieldMarshallersFor(ctor);
  }
}

/** Marshal one layer's declared fields to stored form (synchronous). */
function captureFields(
  host: Stuff,
  fields: readonly string[],
): Record<string, unknown> {
  const marshallers = MixinApi.getAllFieldMarshallers(
    host.constructor as AnyConstructor,
  );
  const self = host as unknown as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const field of fields) {
    if (!(field in host)) continue;
    const value = self[field];
    const mPath = marshallers[field];
    if (mPath) {
      const m = StuffApi.findByTemplatePath<Marshaller<unknown, unknown>>(mPath);
      out[field] = m ? m.toStored(value) : value;
    } else {
      out[field] = value;
    }
  }
  return out;
}

/* ─────────────────────────── capture ────────────────────────────────── */

/**
 * Compose the full per-mixin `state` map for a Stuff — the capture
 * recursion base. Walks `getPersistenceContributors`: each layer either
 * runs its `captureSlice` hook (`Container` / `Slotted`) or contributes the
 * default slice (its own declared fields, marshalled). The shared
 * container-order index both `Container` and `Slotted` reference is built
 * once per host and passed on the `CaptureContext`.
 */
function captureState(host: Stuff): Record<string, MixinSlice> {
  const contributors = MixinApi.getPersistenceContributors(
    host.constructor as AnyConstructor,
  );

  // Shared content order — the Container slice's entry order, the indices
  // the Slotted slice references. Built once so both agree.
  const order: (Stuff & Containable)[] = MixinApi.isContainer(host)
    ? host.getContents()
    : [];
  const indexMap = new Map<Stuff, number>();
  order.forEach((item, i) => indexMap.set(item, i));

  const ctx: CaptureContext = {
    captureItem: (item, placement) =>
      captureItem(item as Stuff, placement),
    captureState: (item) => captureState(item as Stuff),
    indexOf: (item) => indexMap.get(item as Stuff) ?? -1,
  };

  const state: Record<string, MixinSlice> = {};
  for (const c of contributors) {
    if (c.captureSlice) {
      state[c.key] = c.captureSlice(host, ctx);
    } else if (c.fields.length > 0) {
      state[c.key] = { fields: captureFields(host, c.fields) };
    }
  }
  return state;
}

/**
 * Capture one directly-held item into a `ContentEntry`. A nested **host**
 * (composes `Persistable`) becomes a `{ ref }` — it persists itself, so it
 * is not absorbed; anything else nests its composed `state`, recursing
 * through sub-containers.
 */
function captureItem(item: Stuff, placement: Placement): ContentEntry {
  const templatePath = item.getTemplatePath() ?? "";
  if (MixinApi.isPersistable(item)) {
    return { ref: templatePath, placement };
  }
  return { templatePath, state: captureState(item), placement };
}

/* ─────────────────────────── restore ────────────────────────────────── */

/**
 * Restore a composed `state` map onto `target` — the restore recursion
 * base. Order matters: (1) merge every default (`fields`) slice into one
 * drift-guarded blob and hydrate it through the gated setter surface;
 * (2) restore the container slice (clone + place each item); (3) re-wear
 * the Slotted slice against the freshly-restored contents.
 */
async function restoreState(
  target: Stuff,
  state: Record<string, MixinSlice>,
  principal: Stuff,
): Promise<void> {
  // (1) Fields — drift-guarded to the class's declared persistent fields,
  // so a forged record cannot inject `class`/`hydratorClass`/`brain` (which
  // are Template-level, never persistent fields) nor any undeclared key.
  const allowed = new Set(
    MixinApi.getAllPersistentFields(target.constructor as AnyConstructor),
  );
  const fieldData: Record<string, unknown> = {};
  let containerSlice: ContainerSlice | null = null;
  let slottedSlice: SlottedSlice | null = null;
  for (const slice of Object.values(state)) {
    if (isFieldsSlice(slice)) {
      for (const [field, value] of Object.entries(slice.fields)) {
        if (allowed.has(field)) fieldData[field] = value;
      }
    } else if (isContainerSlice(slice)) {
      containerSlice = slice;
    } else if (isSlottedSlice(slice)) {
      slottedSlice = slice;
    }
  }
  // Hydrate through the standard two-phase Hydrator: prefers `set<Field>`
  // (the invariant-enforcing gated setter surface), un-marshals rich values,
  // and only bracket-assigns setterless pure-storage fields (already
  // drift-guarded to declared persistent fields). No raw-target write.
  const hydrator = await StuffApi.singleton<PersistentHydrator>(
    PersistentHydrator.templatePath,
  );
  await hydrator.hydrate(target, fieldData);

  // (2) Container contents — cloned through the gated path, placed into the
  // target. Index-aligned with the slice so the Slotted pass resolves.
  const restored: (Stuff | null)[] = [];
  if (containerSlice) {
    for (const entry of containerSlice.contents) {
      restored.push(await restoreItem(entry, target, principal));
    }
    // Surface pass — a resting item re-`placeOn`s its Surfaced sibling.
    containerSlice.contents.forEach((entry, i) => {
      const idx = entry.placement.restingOnIndex;
      if (idx === undefined) return;
      const item = restored[i];
      const surface = restored[idx];
      if (item && surface && MixinApi.isSurfaced(surface)) {
        ContainmentApi.placeOn(
          item as Stuff & Containable,
          surface as Stuff & Surfaced,
        );
      }
    });
  }

  // (3) Slotted occupancy — re-wear each worn item into its slots via the
  // gated multi-slot chokepoint, resolved by content index (no instance id).
  if (slottedSlice && MixinApi.isSlotted(target)) {
    for (const { index, slots } of slottedSlice.worn) {
      const item = restored[index];
      if (item && MixinApi.isSlottable(item)) {
        SlotApi.occupyAll(
          target as Stuff & Slotted,
          item as Stuff & Slottable,
          slots,
        );
      }
    }
  }
}

/**
 * Reconstitute one `ContentEntry` into a live Stuff placed inside `host`.
 * A `{ ref }` follows the reference — cloning the nested host's shell (which
 * self-materializes its own records via `postRegister`); anything else is
 * cloned through the gated path and has its own `state` applied (recursion).
 */
async function restoreItem(
  entry: ContentEntry,
  host: Stuff,
  principal: Stuff,
): Promise<Stuff | null> {
  if ("ref" in entry) {
    const nested = await cloneHost((entry as RefEntry).ref);
    if (nested && MixinApi.isContainable(nested) && MixinApi.isContainer(host)) {
      ContainmentApi.move(
        nested as Stuff & Containable,
        host as Stuff & Container,
      );
    }
    return nested;
  }
  if (!entry.templatePath) return null;
  const clone = await StuffApi.clone<Stuff>(entry.templatePath);
  await restoreState(clone, entry.state, principal);
  if (MixinApi.isContainable(clone) && MixinApi.isContainer(host)) {
    ContainmentApi.move(
      clone as Stuff & Containable,
      host as Stuff & Container,
    );
  }
  return clone;
}

/**
 * Resolve a nested host by `scope` — the single live instance if one is
 * already registered at the path (a host is a singleton), else clone it
 * once. Cloning fires the host's `postRegister`, which self-materializes its
 * own records — so the reference walk reconstructs the whole tree.
 */
async function cloneHost(scope: string): Promise<Stuff | null> {
  if (!scope) return null;
  const existing = StuffApi.findByTemplatePath(scope);
  if (existing) return existing;
  return StuffApi.clone<Stuff>(scope);
}

/* ─────────────────────────── impl entry points ──────────────────────── */

async function captureImpl(host: Stuff): Promise<void> {
  const scope = host.getTemplatePath();
  if (!scope) {
    throw new Error("PersistableLogic.capture: host has no templatePath stamp");
  }
  const owner = await ownerOfScope(scope);
  // Warm marshallers, THEN take the synchronous snapshot (atomic — the
  // last sync block before the save), so concurrent triggers each write a
  // valid full snapshot (last-write-wins).
  await preloadTreeMarshallers(host);
  const state = captureState(host);
  const rec =
    (await PersistedRecord.findByScopeAndOwner(scope, owner)) ??
    new PersistedRecord();
  rec.scope = scope;
  rec.owner = owner;
  rec.state = state;
  await rec.save();
}

async function materializeImpl(host: Stuff): Promise<void> {
  const scope = host.getTemplatePath();
  if (!scope) return;
  const records = await PersistedRecord.findByScope(scope);
  for (const record of records) {
    const principal = principalFor(record.getOwner(), host);
    // Run the restore AS the owning principal: a pushed frame whose acting
    // author is the principal, so `getActingAuthor` and any principal-based
    // gate resolve to it, and restore is isolated from the ambient frame.
    // Atomic per record — a mid-tree throw aborts this record's restore
    // (leaving the prior record untouched) without corrupting siblings.
    await ExecutionContextApi.run(
      host,
      principal,
      "persistenceRestore",
      undefined,
      () => {
        ExecutionContextApi.tagActingAuthor(principal);
        return restoreState(host, record.getState(), principal);
      },
    );
  }
}

async function hasRecordImpl(scope: string): Promise<boolean> {
  const records = await PersistedRecord.findByScope(scope);
  return records.length > 0;
}

async function deleteAllForImpl(owner: string): Promise<number> {
  return PersistedRecord.deleteByOwner(owner);
}

/**
 * PersistableLogic — the hot-reloadable logic singleton behind
 * {@link PersistableApi}.
 *
 * Lives at `/obj/api/persistable` (a stateless `Stuff` singleton, no backing
 * `Template`); `PersistableApi`'s statics forward here via
 * `StuffApi.singletonSync`. All capture/restore logic lives in module-private
 * functions (the `DocumentLogic` / `ScriptLogic` precedent), so there are no
 * intra-singleton `this.x()` calls to trip the gate. Each public method
 * carries the `FromModule` gate; `ApiLogic` makes it residency-exempt.
 *
 * It plants a principal frame around restore (`ExecutionContextApi.run` +
 * `tagActingAuthor`) — the single reviewed frame-mutator touchpoint, admitted
 * by a narrow allowlist entry in `execution-context.ts` (the
 * `SchedulerRegistry` / `EventSubscriptions` precedent).
 *
 * @internal
 */
@Unshadowable
export class PersistableLogic extends ApiLogic {
  /** See {@link PersistableApi.capture}. */
  @CallSecurity(PersistableApiCallers)
  public async capture(host: Stuff): Promise<void> {
    return captureImpl(host);
  }

  /** See {@link PersistableApi.materialize}. */
  @CallSecurity(PersistableApiCallers)
  public async materialize(host: Stuff): Promise<void> {
    return materializeImpl(host);
  }

  /** See {@link PersistableApi.hasRecord}. */
  @CallSecurity(PersistableApiCallers)
  public async hasRecord(scope: string): Promise<boolean> {
    return hasRecordImpl(scope);
  }

  /** See {@link PersistableApi.deleteAllFor}. */
  @CallSecurity(PersistableApiCallers)
  public async deleteAllFor(owner: string): Promise<number> {
    return deleteAllForImpl(owner);
  }
}
