// PersistableLogic — the hot-reloadable logic singleton behind
// PersistableApi. Owns the persistence spine's capture/restore/compose walk.
// (Doc comment on the class below so @internal lands on the reflection.)

import { ApiLogic } from "../../../lib/stuff/ApiLogic";
import { CallSecurity, Unshadowable } from "../../../lib/security/decorators";
import { SecurityPolicies } from "../../../lib/security/SecurityPolicies";
import { MixinApi, type AnyConstructor } from "../../../api/mixin";
import { SpeciesApi } from "../../../api/species";
import { StuffApi } from "../../../api/stuff";
import { ContainmentApi } from "../../../api/containment";
import { SlotApi } from "../../../api/slot";
import { ParcelApi } from "../../../api/parcel";
import { ChattelApi } from "../../../api/chattel";
import { Mixins } from "../../../lib/mixin";
import { ExecutionContextApi } from "../../../api/execution-context";
import { PersistedRecord } from "../../../lib/persistence/PersistedRecord";
import { Document } from "../../../lib/persistence/Document";
import PersistentHydrator from "../persistence/PersistentHydrator";
import type { Marshaller } from "../../../lib/persistence/Marshaller";
import type {
  MixinSlice,
  ContentEntry,
  RefEntry,
  ContainerSlice,
  SlottedSlice,
  FieldsSlice,
  Placement,
  HostPlacement,
  CaptureContext,
  RestoreContext,
  EstateEntry,
} from "../../../lib/persistence/PersistenceSlice";
import type { Stuff } from "../../../lib/stuff/Stuff";
import type { Container } from "../../../lib/spatial/Container";
import type { Containable } from "../../../lib/spatial/Containable";
import type { Surfaced } from "../../../lib/spatial/Surfaced";
import type { Slotted } from "../../../lib/slot/Slotted";
import type { Slottable } from "../../../lib/slot/Slottable";
import type { ParcelOwner } from "../../../lib/parcel/ParcelRecord";

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
 * `group:<name|ref>` sentinel; an organization owner on an
 * `organization:<templatePath>` sentinel. Kept
 * distinct from any real player `templatePath` so the two never collide.
 */
function ownerString(owner: ParcelOwner): string {
  if (owner.kind === "player") return owner.templatePath;
  if (owner.kind === "organization") return `organization:${owner.templatePath}`;
  return `group:${owner.ref ?? owner.name ?? ""}`;
}

/**
 * The record `owner` for a host `scope`. A **self-owned principal** host —
 * a `HasInteractive` player avatar — owns its own record (owner = scope), so
 * the account-deletion cascade `deleteAllFor(<avatar path>)` is a keyed
 * match. Otherwise the parcel title (the `DocumentLogic.selfHomeOwnerOf`
 * precedent, generalized through `ParcelApi.ownerOf`), falling back to the
 * host's own path when the title resolve fails. Never a parameter.
 */
async function ownerOfScope(scope: string, host: Stuff): Promise<string> {
  if (MixinApi.isHasInteractive(host)) return scope;
  try {
    const owner = await ParcelApi.ownerOf(scope);
    // Untitled ground (content-packs wave 3): the scope keys on itself.
    return owner === null ? scope : ownerString(owner);
  } catch {
    return scope;
  }
}

/** The stashed explicit key, read through the typed `Persistable`. */
function stashedKey(host: Stuff): string | null {
  return MixinApi.isPersistable(host) ? host.getPersistenceKey() : null;
}

/**
 * Stash a resolved key so a later keyless re-capture reuses it. `explicit`
 * carries the key's provenance (see `Persistable.setPersistenceKey`): an
 * establishing context's real per-instance key marks the host
 * multi-instance; a scope-derived owner does not.
 */
function stashKey(host: Stuff, key: string, explicit: boolean): void {
  if (MixinApi.isPersistable(host)) host.setPersistenceKey(key, explicit);
}

/**
 * A host's persistence opt-out, read through the typed `Persistable`
 * interface (never duck-typed): `shouldPersist()` is declared on
 * `Persistable` with a `true` default, and Avatar overrides it to
 * `!isGuest`. capture/materialize are only ever invoked on persistable
 * hosts, so the narrow succeeds; a non-persistable argument (a misuse) reads
 * as "not opted out" and proceeds.
 */
function optedOutOfPersistence(host: Stuff): boolean {
  return MixinApi.isPersistable(host) && !host.shouldPersist();
}

/**
 * The single persistence invariant: **no two live instances may share a
 * `(scope, key)`** — they'd write the SAME record and silently clobber each
 * other. Every host is identified by `(scope = templatePath, key)`; a
 * singleton is simply the degenerate case where the key derives from the
 * scope (Avatar → self, a titled room → its parcel), so two live clones
 * resolve the SAME key and collide, while distinct keyed instances (leased
 * dorm rooms, keyed by unit parcel) never do. One uniform rule — there is no
 * "singleton vs multi-instance" mode and no marker.
 *
 * Precise, not eager: it fires only when another live instance has already
 * *claimed* this key (its key is stashed), i.e. exactly when a write would
 * clobber — not merely because two shells exist. Freshly-cloned, not-yet-keyed
 * siblings (`getPersistenceKey() === null`) own no record and don't collide.
 */
function assertUniqueKey(scope: string, key: string, host: Stuff): void {
  for (const other of StuffApi.findAllByTemplatePath(scope)) {
    if ((other as unknown) === (host as unknown)) continue;
    if (MixinApi.isPersistable(other) && other.getPersistenceKey() === key) {
      throw new Error(
        `PersistableLogic: two live instances of '${scope}' both keyed ` +
          `'${key}' — they would clobber one record. A persistable host must ` +
          `resolve to a unique (scope, key): a singleton derives its key from ` +
          `its scope (so it must be singleton-identifiable), a multi-instance ` +
          `host (a leased room) must supply a distinct explicit key.`,
      );
    }
  }
}

/**
 * Capture a **Containable top-level host**'s own durable location — the
 * `WarrenMember`-reconciled spawn/recall point (the Warren, not the transient
 * room clone) or a plain container. Mirrors the retired
 * `snapshotToTemplate` location logic, now on the record. Null for a
 * non-Containable host (a room) or one with no environment.
 */
function capturePlacement(host: Stuff): HostPlacement | null {
  if (!MixinApi.isContainable(host)) return null;
  const env = host.getContainer();
  if (!env) return null;
  // A nested host — one sitting anywhere inside another persistable host's
  // tree — is placed by its REFERRER (the ancestor whose container slice
  // holds its `{ref, key}` entry), so its own `place` would fight that
  // (and could phantom-clone a stale container template on restore). A
  // HasInteractive host (an avatar) is exempt: the container slice filters
  // it out, so nothing refs it and its own `place` stays load-bearing.
  if (
    !MixinApi.isHasInteractive(host) &&
    nearestPersistableHost(env) !== null
  ) {
    return null;
  }
  if (MixinApi.isWarrenMember(env)) {
    const warren = env.getWarren()?.getTemplatePath();
    if (warren) return { startLocation: warren };
  }
  const container = env.getIdentityPath();
  return container ? { container } : null;
}

/**
 * Re-place a Containable host at its captured location: a `startLocation`
 * resolves through `ContainmentApi.resolveLanding` (Warren → fresh host room,
 * or a singleton/cloned room — the `applyStartLocation` path); a plain
 * `container` moves into the live singleton at that path. Best-effort — a
 * missing target leaves the host where the clone placed it.
 */
async function restorePlacement(
  host: Stuff,
  place: HostPlacement | null,
): Promise<void> {
  if (!place || !MixinApi.isContainable(host)) return;
  if (place.startLocation) {
    const { container } = await ContainmentApi.resolveLanding(
      place.startLocation,
    );
    ContainmentApi.move(host as Stuff & Containable, container);
    return;
  }
  if (place.container) {
    // Live instance first, else MATERIALIZE the room — after a server
    // restart the captured location isn't stood up yet (rooms are lazy),
    // and a live-only lookup would silently leave the host containerless
    // (a returning avatar then fails `Avatar.enter`). The residency
    // re-clone path is the same one an exit traversal would take.
    let target: Stuff | null =
      StuffApi.findByTemplatePath(place.container) ?? null;
    if (!target) {
      try {
        target = await StuffApi.singletonOrClone<Stuff>(place.container);
      } catch (err) {
        console.warn(
          `PersistableLogic.restorePlacement: captured container ` +
            `'${place.container}' unresolvable — host left where cloned:`,
          err,
        );
      }
    }
    if (target && MixinApi.isContainer(target)) {
      ContainmentApi.move(
        host as Stuff & Containable,
        target as Stuff & Container,
      );
    }
  }
}

/** Containment hops the persistable-ancestor walks tolerate (cycle guard). */
const MAX_ANCESTOR_HOPS = 32;

/**
 * The nearest persistable host at-or-above `stuff` in the containment
 * chain, or null. Hop-capped, so a (malformed) containment cycle
 * terminates instead of spinning. Shared by `capturePlacement`'s
 * nested-host rule and `captureHostOf`'s walk.
 */
function nearestPersistableHost(stuff: Stuff): Stuff | null {
  let cur: Stuff | null = stuff;
  for (let hops = 0; cur && hops <= MAX_ANCESTOR_HOPS; hops++) {
    if (MixinApi.isPersistable(cur)) return cur;
    cur = MixinApi.isContainable(cur) ? cur.getContainer() : null;
  }
  return null;
}

/**
 * Resolve the live principal for a record `owner`: a player-owned scope
 * restores as that player when it is online (a live `Stuff` at the path),
 * else as the host itself (self / system) — an offline player's avatar is
 * never force-materialized to restore content (resolved decision #3). Group
 * / untitled / self-owned scopes always restore under the host principal.
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

/**
 * Detach an object-valued captured field from the live instance.
 *
 * A capture is documented as **the last synchronous block before the save**,
 * so that concurrent triggers each write a valid full snapshot. That
 * guarantee only holds if the snapshot is a *copy*: an object-valued
 * persistent field (a `reserves` record, a growth `profile`, a `details`
 * map, a `keywords` array) is otherwise stored by REFERENCE, and any
 * mutation between the capture and the save — a plant watered in the same
 * turn, an inventory shuffled — silently rewrites the snapshot that was
 * supposed to be frozen.
 *
 * A persistent field is about to be BSON-serialized, so it holds plain data
 * by construction and a JSON round-trip is faithful. Anything that will not
 * round-trip (a live reference that should have had a marshaller) is left
 * alone rather than mangled — the save path fails loudly on those already.
 */
function detachValue(value: unknown): unknown {
  if (value === null || typeof value !== "object") return value;
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return value;
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
    // A null/undefined marshalled field round-trips as-is: the marshaller's
    // `toStored` expects a live value (a Quantity), so an unset optional field
    // (e.g. a room's lazily-null `_temperature`) is stored raw, not marshalled.
    if (mPath && value != null) {
      const m = StuffApi.findByTemplatePath<Marshaller<unknown, unknown>>(mPath);
      out[field] = detachValue(m ? m.toStored(value) : value);
    } else {
      out[field] = detachValue(value);
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
/**
 * Goods a host **skipped** during the current synchronous capture because
 * someone is stamped as owning them (the D2 skip rule). Capture cannot
 * await, so the skipped goods land here and `captureImpl` flushes them into
 * their owners' estates immediately afterwards.
 *
 * Module-scope because the capture walk is a recursive sync function and the
 * flush is its caller — the same shape the shared content-order index has.
 * Cleared at the start of every capture, so a throw mid-walk cannot leak
 * entries into the next one.
 */
const skippedOwnedGoods = new Set<Stuff>();

/**
 * Push each skipped good's fresh state into its owner's estate — the ONLY
 * path by which a good standing in a room that goes dormant, whose owner is
 * offline, is captured by anybody at all. Without it a skipped good would be
 * captured by nobody and destroyed with the room.
 *
 * A live owner is patched in memory (their own next capture then carries
 * it); an offline owner's stored record is read-modify-written, because
 * there is no instance to hold the entry.
 */
async function flushSkippedOwnedGoods(goods: Iterable<Stuff>): Promise<void> {
  for (const good of goods) {
    if (good.isDestroyed() || !MixinApi.isChattel(good)) continue;
    const chattelId = good.getChattelId();
    if (!chattelId) continue;
    const owner = await ChattelApi.ownerOf(good);
    if (owner?.kind !== "player") continue;
    const entry: EstateEntry = {
      chattelId,
      templatePath: good.getTemplatePath() ?? "",
      state: captureState(good),
      place: good.getPlace(),
    };
    const live = StuffApi.findByTemplatePath<Stuff>(owner.templatePath);
    if (live && MixinApi.isEstate(live)) {
      live._putEstateEntry(entry, good);
      continue;
    }
    await patchStoredEstate(owner.templatePath, entry);
  }
}

/**
 * Read-modify-write one estate entry into an offline owner's stored record.
 * Scoped to the owner's own `(scope, owner)` record — the same row their
 * next materialize reads — so an offline owner learns about a good that
 * moved while they were away.
 */
async function patchStoredEstate(
  ownerPath: string,
  entry: EstateEntry,
): Promise<void> {
  const rec = (await PersistedRecord.findByScope(ownerPath))[0];
  if (!rec) return; // no record yet — the owner has never been captured
  const key = Mixins.Estate;
  const existing = rec.state[key];
  const entries =
    existing && "entries" in existing ? [...existing.entries] : [];
  const at = entries.findIndex((e) => e.chattelId === entry.chattelId);
  if (at >= 0) entries[at] = entry;
  else entries.push(entry);
  rec.state = { ...rec.state, [key]: { entries } };
  await rec.save();
}

function captureState(host: Stuff): Record<string, MixinSlice> {
  const contributors = MixinApi.getPersistenceContributors(
    host.constructor as AnyConstructor,
  );

  // Shared content order — the Container slice's entry order, the indices
  // the Slotted slice references. Built once so both agree; must apply the
  // SAME two filters `ContainerMixin.captureSlice` does (HasInteractive AND
  // the D2 stamped-good skip), or the Slotted indices drift from the
  // emitted entries.
  const order: (Stuff & Containable)[] = MixinApi.isContainer(host)
    ? host
        .getContents()
        .filter(
          (item) =>
            !MixinApi.isHasInteractive(item) && !ChattelApi.isOwnerPersisted(item),
        )
    : [];
  const indexMap = new Map<Stuff, number>();
  order.forEach((item, i) => indexMap.set(item, i));

  const ctx: CaptureContext = {
    captureItem: (item, placement) =>
      captureItem(item as Stuff, placement),
    captureState: (item) => captureState(item as Stuff),
    indexOf: (item) => indexMap.get(item as Stuff) ?? -1,
    noteOwnedGood: (item) => skippedOwnedGoods.add(item as Stuff),
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
    // A MULTI-INSTANCE nested host records its per-instance key alongside
    // the ref, so restore can distinguish siblings cloned from one
    // template. A singleton does not: its stashed owner is scope-derived,
    // and emitting it would send the restore down the keyed branch and
    // clone a duplicate of a host that is already live. The field is
    // OMITTED (not null) in that case — keyless records stay
    // byte-identical to the pre-key shape.
    // Read the key BEFORE the provenance flag: a host that mints its key
    // lazily (a cultivated Plant) does so in `getPersistenceKey`, and that
    // mint is what makes it explicit.
    const stashed = item.getPersistenceKey();
    const key =
      stashed !== null && item.isPersistenceKeyExplicit()
        ? stashed
        : undefined;
    return key !== undefined
      ? { ref: templatePath, key, placement }
      : { ref: templatePath, placement };
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
  // An organism's slots are DEFINED by its body plan, and the species that
  // names the plan was itself just restored by the field hydrate above —
  // so the anatomy must be preloaded here, between fields and occupancy
  // (a fresh mint gets this from installDefaultLoadout; a restoring host
  // runs the loadout only AFTER materialize, so it can't cover this).
  if (slottedSlice && MixinApi.isSlotted(target)) {
    if (MixinApi.isOrganism(target)) {
      try {
        await SpeciesApi.preloadAnatomy(target);
      } catch (err) {
        console.warn(
          `PersistableLogic: anatomy preload failed for ` +
            `${target.getTemplatePath()}:`,
          err,
        );
      }
    }
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

  // (4) Any layer carrying its OWN async restore hook. `Container` and
  // `Slotted` are handled by the explicit passes above (their ordering
  // against each other is load-bearing and cannot be a generic loop); this
  // dispatches the rest — today, `EstateMixin`. Runs last, so an estate's
  // `inventory` goods land in a container that has already been restored.
  const ctx: RestoreContext = {
    restoreItem: (entry, host) =>
      restoreItem(entry as ContentEntry, host as Stuff, principal),
  };
  for (const c of MixinApi.getPersistenceContributors(
    target.constructor as AnyConstructor,
  )) {
    if (!c.restoreSlice) continue;
    const slice = state[c.key];
    if (slice) await c.restoreSlice(target, slice, ctx);
  }
}

/**
 * **The record is authoritative.** A non-host content item is restored by
 * re-cloning its template, and a clone re-runs the template's `populates:`
 * — so a container that declares born-with contents (a stocked chest, a
 * pre-planted pot) arrives holding a fresh set of them, which then collides
 * with the recorded set: doubled contents, and a `Slotted` re-occupy that
 * throws because the born-with occupant already claimed the slot.
 *
 * A *host* never has this problem: `PersistableMixin.applyPopulates` only
 * retains the specs, and `seedBornWith` runs on the no-record branch alone.
 * This is the same rule for the non-host case — clear what the clone seeded
 * before applying what the record says.
 *
 * Scoped by the record: contents are cleared only when the captured state
 * actually carries a `ContainerMixin` slice (the record speaks to contents),
 * and slots only when it carries a `SlottedMixin` one. A record that says
 * nothing about contents leaves the born-with set alone.
 */
function clearSeededContents(
  clone: Stuff,
  state: Record<string, MixinSlice>,
): void {
  const slices = Object.values(state);
  if (slices.some(isSlottedSlice) && MixinApi.isSlotted(clone)) {
    for (const [slot, occupants] of clone.getAllOccupants()) {
      for (const occupant of [...occupants]) clone.vacate(slot, occupant);
    }
  }
  if (slices.some(isContainerSlice) && MixinApi.isContainer(clone)) {
    for (const item of [...clone.getContents()]) {
      StuffApi.destruct(item);
    }
  }
}

/**
 * Reconstitute one `ContentEntry` into a live Stuff placed inside `host`.
 * A `{ ref }` follows the reference — cloning the nested host's shell (and,
 * when the ref carries a key, materializing that instance's own record);
 * anything else is cloned through the gated path, has whatever the clone
 * seeded cleared, and has its own `state` applied (recursion).
 */
async function restoreItem(
  entry: ContentEntry,
  host: Stuff,
  principal: Stuff,
): Promise<Stuff | null> {
  if ("ref" in entry) {
    const refEntry = entry as RefEntry;
    const nested = await cloneHost(refEntry.ref, refEntry.key);
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
  clearSeededContents(clone, entry.state);
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
 * Resolve a nested host by `scope` (+ optional per-instance `key`).
 *
 * **Keyed** (`{ref, key}`): the host is one of possibly many instances of
 * its template, so the path dedup would collapse siblings — instead clone
 * a fresh shell, stamp the key, and materialize its `(scope, key)` record.
 * **Keyless** (`{ref}`): the original singleton walk — the single live
 * instance at the path if one is registered, else clone once and
 * self-restore with a keyless materialize. Every record written before
 * the key existed takes this branch unchanged.
 *
 * The spine no longer auto-materializes on register (D1); this walk is
 * the nested host's establishing context, reconstructing the whole tree.
 */
async function cloneHost(scope: string, key?: string): Promise<Stuff | null> {
  if (!scope) return null;
  if (key !== undefined) {
    const nested = await StuffApi.clone<Stuff>(scope);
    if (nested && MixinApi.isPersistable(nested)) {
      nested.setPersistenceKey(key);
      await materializeImpl(nested, key);
    }
    return nested;
  }
  // Keyless = one instance per path, which is exactly `StuffApi.singleton`:
  // it returns the live instance when one is registered, and on a mint it
  // IS the persistable singleton's establishing context (restore-or-seed
  // under the scope-derived key). Routing through it keeps the two ways a
  // singleton host can come to life — walked to / booted, or restored as
  // a room's nested `{ ref }` — on one path, so neither can mint a second.
  return StuffApi.singleton<Stuff>(scope);
}

/* ─────────────────────────── impl entry points ──────────────────────── */

async function captureImpl(host: Stuff, key?: string): Promise<void> {
  if (optedOutOfPersistence(host)) return; // guest / opted-out host
  const scope = host.getIdentityPath();
  if (!scope) {
    throw new Error("PersistableLogic.capture: host has no templatePath stamp");
  }
  // Resolve the record key (== owner): the explicit key wins; else the
  // stashed key (a keyless re-capture reuses the materialize/first-capture
  // key); else the scope-derived key (a singleton's self/parcel owner). Then
  // enforce the single invariant: no live sibling has already claimed it.
  const owner = key ?? stashedKey(host) ?? (await ownerOfScope(scope, host));
  stashKey(host, owner, key !== undefined);
  assertUniqueKey(scope, owner, host);
  // Warm marshallers, THEN take the synchronous snapshot (atomic — the
  // last sync block before the save), so concurrent triggers each write a
  // valid full snapshot (last-write-wins).
  await preloadTreeMarshallers(host);
  skippedOwnedGoods.clear();
  const state = captureState(host);
  const place = capturePlacement(host);
  // The skip rule's other half: goods this host does not persist because
  // someone else holds title go to their owners' estates, now, before the
  // host's record is written and long before the host destructs.
  const skipped = [...skippedOwnedGoods];
  skippedOwnedGoods.clear();
  if (skipped.length > 0) await flushSkippedOwnedGoods(skipped);
  const rec =
    (await PersistedRecord.findByScopeAndOwner(scope, owner)) ??
    new PersistedRecord();
  rec.scope = scope;
  rec.owner = owner;
  rec.state = state;
  rec.place = place;
  await rec.save();
}

async function materializeImpl(host: Stuff, key?: string): Promise<void> {
  if (optedOutOfPersistence(host)) return; // guest / opted-out host
  const scope = host.getIdentityPath();
  if (!scope) return;
  // Resolve the key the SAME way capture does (explicit → stashed →
  // scope-derived), so restore is the exact inverse: one `(scope, key)`
  // record, keyed identically. A missing record is a clean no-op (the
  // establishing context seeds instead). No keyless "restore every record"
  // mode — a scope holds one record per key, and each host restores its own.
  const owner = key ?? stashedKey(host) ?? (await ownerOfScope(scope, host));
  stashKey(host, owner, key !== undefined);
  assertUniqueKey(scope, owner, host);
  const record = await PersistedRecord.findByScopeAndOwner(scope, owner);
  if (record) await restoreRecord(host, record);
}

/** Restore one record onto `host` under its owning principal (shared by the
 * keyed and keyless materialize paths). */
/**
 * The **room identity** an owned good's `place` names — a host's persistence
 * scope, plus its per-instance key when it has one (many leased units share
 * one `DormRoom` template, so the scope alone would collapse them).
 */
function placeIdOf(host: Stuff): string {
  const scope = host.getIdentityPath() ?? "";
  // Only an EXPLICIT key qualifies — the same rule `captureItem` applies to
  // a nested host ref. A keyless host's stashed key is scope-DERIVED (the
  // singleton's self/parcel owner), so folding it in would give one room two
  // different identities either side of its first capture: the place written
  // when it was fresh would never match the place looked up after it had
  // been materialized once.
  const key =
    MixinApi.isPersistable(host) && host.isPersistenceKeyExplicit()
      ? host.getPersistenceKey()
      : null;
  return key ? `${scope}#${key}` : scope;
}

/**
 * The **room overlay** (D4): after a host has restored its own record —
 * its fixtures — lay down the owned goods whose `place` names it.
 *
 * Order is load-bearing and is the whole decision: fixtures first, so a
 * placed good can rest on a surface that exists. The host captures nothing
 * owner-side on the way down; the owner's record is authoritative for
 * chattel, and a host going dormant simply forgets furniture it never
 * owned.
 *
 * Each good is cloned **as its owner**, not as the host — so provenance and
 * every principal-based gate resolve to the person whose good it is, in a
 * room that may belong to somebody else entirely.
 */
async function overlayOwnedGoods(host: Stuff): Promise<void> {
  if (!MixinApi.isContainer(host)) return;
  const placeId = placeIdOf(host);
  if (!placeId) return;
  const placed = await ChattelApi.placedIn(placeId);
  for (const { chattelId, owner } of placed) {
    if (owner?.kind !== "player") continue;
    const ownerHost = StuffApi.findByTemplatePath<Stuff>(owner.templatePath);
    let entry: EstateEntry | null = null;
    if (ownerHost && MixinApi.isEstate(ownerHost)) {
      entry = ownerHost.getEstateEntry(chattelId);
    }
    if (!entry) entry = await storedEstateEntry(owner.templatePath, chattelId);
    if (!entry || entry.place !== placeId) continue;
    const principal = ownerHost ?? host;
    const good = await ExecutionContextApi.run(
      host,
      principal,
      "chattelOverlay",
      undefined,
      async () => {
        ExecutionContextApi.tagActingAuthor(principal);
        return PersistableLogicRestoreDetached(entry, host, principal);
      },
    );
    if (good && ownerHost && MixinApi.isEstate(ownerHost)) {
      ownerHost._putEstateEntry(entry, good);
    }
  }
}

/** Read one estate entry out of an offline owner's stored record. */
async function storedEstateEntry(
  ownerPath: string,
  chattelId: string,
): Promise<EstateEntry | null> {
  // By SCOPE, not `(scope, owner)`: a host's record key is scope-DERIVED
  // unless it was given an explicit one, so the owner column is not
  // reliably the principal's own path.
  for (const rec of await PersistedRecord.findByScope(ownerPath)) {
    const slice = rec.getState()[Mixins.Estate];
    if (!slice || !("entries" in slice)) continue;
    const hit = slice.entries.find((e) => e.chattelId === chattelId);
    if (hit) return hit;
  }
  return null;
}

/** `restoreDetached`'s body, reachable from module scope. */
async function PersistableLogicRestoreDetached(
  entry: EstateEntry,
  container: Stuff,
  principal: Stuff,
): Promise<Stuff | null> {
  return restoreItem(
    { templatePath: entry.templatePath, state: entry.state, placement: {} },
    container,
    principal,
  );
}

async function restoreRecord(host: Stuff, record: PersistedRecord): Promise<void> {
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
    async () => {
      ExecutionContextApi.tagActingAuthor(principal);
      await restoreState(host, record.getState(), principal);
      // A Containable top-level host re-places itself at its captured
      // location (overriding the clone-time template spawn).
      await restorePlacement(host, record.getPlace());
    },
  );
  // Fixtures first, THEN the owned goods placed here (D4). Outside the
  // principal frame above, because each good is cloned as ITS OWN owner.
  await overlayOwnedGoods(host);
  // ...and last, put a resting body back on the thing it was resting on.
  reoccupyRestingHost(host);
}

/**
 * **You wake where you slept** (D10). `PosedMixin` persists the posture,
 * but `getOccupiedHost()` is a live scan, so without this the bed is gone
 * on restore and `currentRestQuality()` reads 1.0 on the very reconcile
 * that was meant to pay out.
 *
 * Runs LAST, after the host has been re-placed and its room has laid down
 * both its fixtures and the goods placed in it — Wave 4's ordering, one
 * step further. A bed can only be re-occupied once it exists.
 *
 * Every failure degrades to the room floor — standing, 1.0, **no error and
 * no teleport**. Restoring a player must never fail because their furniture
 * moved: sold, redecorated, or someone else got there first.
 */
function reoccupyRestingHost(host: Stuff): void {
  if (!MixinApi.isPosed(host) || !MixinApi.isSlottable(host)) return;
  const path = host.getRestingOnPath();
  const slot = host.getRestingSlot();
  if (!path || !slot) return;
  const room = MixinApi.isContainable(host) ? host.getContainer() : null;
  if (!room || !MixinApi.isContainer(room)) return;
  const seat = room
    .getContents()
    .find(
      (item) =>
        item.getTemplatePath() === path &&
        MixinApi.isSlotted(item) &&
        MixinApi.isPostured(item),
    );
  if (!seat) return; // the bed is gone — wake on the floor
  try {
    SlotApi.occupyAll(
      seat as unknown as Stuff & Slotted,
      host as unknown as Stuff & Slottable,
      [slot],
    );
  } catch {
    // Full, no longer admits the posture, or refused by `fitsSlot`. The
    // avatar simply stands in the room; nothing is thrown at the player.
  }
}

/**
 * Capture the persistence host responsible for `stuff`: the thing itself
 * when it is a host, else the nearest persistable containment ancestor
 * (hop-capped, so a containment cycle terminates). A clean no-op when no
 * host is found — the thing lives in transient space and has no record to
 * refresh. The mutating-act capture every husbandry-family phase shares.
 */
async function captureHostOfImpl(stuff: Stuff): Promise<void> {
  const host = nearestPersistableHost(stuff);
  if (!host) return;
  await captureImpl(host, stashedKey(host) ?? undefined);
}

/**
 * The keyed-holder ground pattern, in one place: key the host, then either
 * restore its record or lay down its born-with fixtures and capture them.
 *
 * This is the decision every multi-instance holder makes — the one a
 * `DormWarren` makes per unit and a smallholding makes per lot. Extracted
 * because the alternative is each holder hand-rolling the same six lines
 * and getting the branch subtly wrong (capturing on the restore path,
 * re-seeding a restored room, forgetting to stash the key).
 *
 * The scope is the host's own `templatePath`, exactly as `capture` and
 * `materialize` derive it — so a caller supplies only the key.
 *
 * Returns `true` when an existing record was restored, `false` when the
 * host was seeded fresh. Callers that want to know whether this is a
 * first provision (to wire exits, announce, bill) read that.
 */
async function restoreOrSeedImpl(host: Stuff, key: string): Promise<boolean> {
  if (!MixinApi.isPersistable(host)) {
    throw new TypeError(
      "PersistableLogic.restoreOrSeed: host does not compose " +
        `PersistableMixin (${host.getTemplatePath() ?? "unregistered"})`,
    );
  }
  const scope = host.getIdentityPath();
  if (!scope) {
    throw new Error(
      "PersistableLogic.restoreOrSeed: host has no templatePath stamp",
    );
  }
  host.setPersistenceKey(key);
  if (await hasRecordImpl(scope, key)) {
    await materializeImpl(host, key);
    return true;
  }
  // No record: lay the declared `populates:` fixtures down ONCE, then
  // capture them so the next standup restores rather than re-seeds.
  await host.seedBornWith();
  await captureImpl(host, key);
  return false;
}

async function hasRecordImpl(scope: string, key?: string): Promise<boolean> {
  if (key !== undefined) {
    return (await PersistedRecord.findByScopeAndOwner(scope, key)) !== null;
  }
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
 * Lives at `/platform/idea/api/persistable` (a stateless `Stuff` singleton, no backing
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
  public async capture(host: Stuff, key?: string): Promise<void> {
    return captureImpl(host, key);
  }

  /** See {@link PersistableApi.materialize}. */
  @CallSecurity(PersistableApiCallers)
  public async materialize(host: Stuff, key?: string): Promise<void> {
    return materializeImpl(host, key);
  }

  /** See {@link PersistableApi.captureHostOf}. */
  @CallSecurity(PersistableApiCallers)
  public async captureHostOf(stuff: Stuff): Promise<void> {
    return captureHostOfImpl(stuff);
  }

  /** See {@link PersistableApi.restoreOrSeed}. */
  @CallSecurity(PersistableApiCallers)
  public async restoreOrSeed(host: Stuff, key: string): Promise<boolean> {
    return restoreOrSeedImpl(host, key);
  }

  /** See {@link PersistableApi.placeIdOf}. */
  @CallSecurity(PersistableApiCallers)
  public placeIdOf(host: Stuff): string {
    return placeIdOf(host);
  }

  /** See {@link PersistableApi.captureDetached}. */
  @CallSecurity(PersistableApiCallers)
  public captureDetached(item: Stuff): Record<string, MixinSlice> {
    return captureState(item);
  }

  /** See {@link PersistableApi.restoreDetached}. */
  @CallSecurity(PersistableApiCallers)
  public async restoreDetached(
    entry: EstateEntry,
    container: Stuff,
    principal: Stuff,
  ): Promise<Stuff | null> {
    return PersistableLogicRestoreDetached(entry, container, principal);
  }

  /** See {@link PersistableApi.hasRecord}. */
  @CallSecurity(PersistableApiCallers)
  public async hasRecord(scope: string, key?: string): Promise<boolean> {
    return hasRecordImpl(scope, key);
  }

  /** See {@link PersistableApi.deleteAllFor}. */
  @CallSecurity(PersistableApiCallers)
  public async deleteAllFor(owner: string): Promise<number> {
    return deleteAllForImpl(owner);
  }

  /** See {@link PersistableApi.forkRuntimeState}. */
  @CallSecurity(PersistableApiCallers)
  public async forkRuntimeState(source: Stuff, fork: Stuff): Promise<void> {
    const { ShadowApi } = await import('../../../api/shadow');
    const { OMNI_SCOPE } = await import('../../../api/execution-context');

    // COLLECT under a system root: the fork deliberately spans the
    // boundary (the source is the field body, the fork is circle-born),
    // and this singleton is the sanctioned frame-mutator for exactly
    // this choreography. Reads only — slices and follow factories.
    const collected = ExecutionContextApi.runRoot(
      null,
      'fork.collect',
      () => {
        const slices = MixinApi.isForkable(source)
          ? source.collectForkSlices()
          : null;
        const factories: Array<() => Stuff> = [];
        const seen = new Set<object>();
        for (const shadows of ShadowApi.getAllShadows(source).values()) {
          for (const shadow of shadows) {
            if (seen.has(shadow)) continue;
            seen.add(shadow);
            const describe = (
              shadow as { describeFork?: () => (() => Stuff) | null }
            ).describeFork;
            if (typeof describe !== 'function') continue;
            const factory = describe.call(shadow);
            if (typeof factory === 'function') factories.push(factory);
          }
        }
        return { slices, factories };
      },
      { circleScope: OMNI_SCOPE }
    );

    // APPLY in the caller's ambient context (the circle root at a
    // crossing) — the fork and any shadow followers are minted/mutated
    // in-scope, so followers are circle-stamped and die with the vessel.
    if (collected.slices && MixinApi.isForkable(fork)) {
      fork.applyForkedState(collected.slices);
    }
    for (const factory of collected.factories) {
      const follower = await StuffApi.create(factory);
      ShadowApi.attach(
        fork,
        follower as Parameters<typeof ShadowApi.attach>[1]
      );
    }
  }

  /** See {@link PersistableApi.mergeRuntimeState}. */
  @CallSecurity(PersistableApiCallers)
  public mergeRuntimeState(
    source: Stuff,
    fork: Stuff,
    allowlist: readonly string[]
  ): void {
    if (!MixinApi.isForkable(source) || !MixinApi.isForkable(fork)) return;
    // The merge spans the boundary too (fork = circle vessel, source =
    // field body): run under a system root, with the ALLOWLIST as the
    // actual policy — epistemic-only for the sandbox.
    ExecutionContextApi.runRoot(
      null,
      'fork.merge',
      () => {
        source.applyForkedState(fork.collectForkSlices(), allowlist);
      },
      { circleScope: '*' }
    );
  }
}
