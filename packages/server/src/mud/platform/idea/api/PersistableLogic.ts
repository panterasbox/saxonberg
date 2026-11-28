// PersistableLogic — the hot-reloadable logic singleton behind
// PersistableApi. Owns the persistence spine's capture/restore/compose walk.
// (Doc comment on the class below so @internal lands on the reflection.)

import { KeyedHosts } from '../../../lib/persistence/KeyedHosts';
import { ApiLogic } from "../../../lib/stuff/ApiLogic";
import { Creature } from '../../../lib/creature/Creature';
import { CallSecurity, Unshadowable } from "../../../lib/security/decorators";
import { SecurityPolicies } from "../../../lib/security/SecurityPolicies";
import { MixinApi, type AnyConstructor } from "../../../api/mixin";
import { AppApi } from "../../../api/app";
import { AppSettingKeys } from "../../../lib/config/AppSettings";
import { SpeciesApi } from "../../../api/species";
import { StuffApi } from "../../../api/stuff";
import { ContainmentApi } from "../../../api/containment";
import type { Adornment } from "../../../lib/boundary/Adornment";
import { ParcelApi } from "../../../api/parcel";
import { MqlApi } from "../../../api/mql";
import { ChattelApi } from "../../../api/chattel";
import { Mixins } from "../../../lib/mixin";
import { ExecutionContextApi } from "../../../api/execution-context";
import { PersistedRecord } from "../../../lib/persistence/PersistedRecord";
import { PersistApi } from "../../../api/persist";
import { DiagnosticApi } from "../../../api/diagnostics";
import { MessageApi } from "../../../api/message";
import { Mml } from "../../../api/mml";
import type { Persistable } from "../../../lib/persistence/Persistable";
import { Template } from "../../../lib/stuff/Template";
import { Document } from "../../../lib/persistence/Document";
import TemplateApplier from "../TemplateApplier";
import type { Marshaller } from "../../../lib/persistence/Marshaller";
import type {
  MixinSlice,
  ContentEntry,
  RefEntry,
  ContainerSlice,
  SlottedSlice,
  FieldsSlice,
  ContentPlacement,
  HostPlacement,
  CaptureContext,
  HydrateContext,
} from "../../../lib/persistence/PersistenceSlice";
import type { Stuff } from "../../../lib/stuff/Stuff";
import type { Container } from "../../../lib/spatial/Container";
import type { Containable } from "../../../lib/spatial/Containable";
import type { Placing } from "../../../lib/spatial/Placing";
import type { Slotted } from "../../../lib/slot/Slotted";
import type { Slottable } from "../../../lib/slot/Slottable";
import type { ParcelOwner } from "../../../lib/parcel/ParcelRecord";
import { Placement, Placements } from '../../../lib/spatial/Placement';

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
/**
 * The live instance of `(scope, key)`, or null.
 *
 * ⭐ A LOOKUP, never a scan: a keyed host is filed under
 * its pair the moment it is given its key (`KeyedHosts`, written by
 * `Persistable.setPersistenceKey`). It used to loop over
 * `StuffApi.findAllByTemplatePath(scope)` — every live instance of the row.
 *
 * ⚠ **`scope` here is a ROW** (a template path) — every caller passes a
 * stored scope that is one: `cloneHost` a captured `{ref}` (written as
 * `good.getTemplatePath()`).
 */
function liveKeyed(scope: string, key: string): Stuff | null {
  return KeyedHosts.find(scope, key);
}

/**
 * Throw when another live instance of the same ROW already claims `key`.
 *
 * ⚠⚠ **The needle is the host's ROW, never the `scope` the record is
 * filed under.** The record's scope is `host.getIdentityPath()`
 * (`captureImpl` / `materializeImpl` / `restoreOrSeedImpl` all write
 * it), and for an identity-stamped host that string names a bucket
 * holding only the host itself — which the loop then skips, so the
 * assertion was **vacuous for every stamped keyed host** and a second
 * instance on an occupied key stood up silently. The market stall
 * counter was never covered by it. The row is the population that can
 * collide, so the row is what gets scanned.
 */
function assertUniqueKey(scope: string, key: string, host: Stuff): void {
  const row = host.getTemplatePath() ?? scope;
  // ⭐ The pair's index, never a scan of the row.
  for (const other of KeyedHosts.all(row, key)) {
    if (other.stuffId === host.stuffId) continue;
    throw new Error(
        `PersistableLogic: two live instances of '${row}' both keyed ` +
          `'${key}' — they would clobber one record. A persistable host must ` +
          `resolve to a unique (scope, key): a singleton derives its key from ` +
          `its scope (so it must be singleton-identifiable), a multi-instance ` +
          `host (a leased room) must supply a distinct explicit key.`,
    );
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
  // (and could phantom-clone a stale container template on restore).
  // ⚠ The exemption is exactly the container slice's own SKIP LIST
  // (`ContainerMixin.captureSlice`): a HasInteractive host (an avatar) and a
  // Behaved one (a kept animal — a body that keeps itself) are filtered out
  // of every ancestor's slice, so nothing refers to them and their own
  // `place` is the only record of where they stand. (A pinned cat in a
  // bedroom that captured NO placement was stood up nowhere by the pin roll
  // — found by `ResidencyPin.test`.)
  const referredByAncestor =
    !MixinApi.isHasInteractive(host) &&
    !MixinApi.isBehaved(host) &&
    nearestPersistableHost(env) !== null;
  if (referredByAncestor) return null;
  // ⭐ Anchor on the nearest ancestor with an ADDRESS, and remember the
  // way down. A host in a chest in a room must not record the chest: a
  // chest's template path is every chest in the world. See
  // {@link HostPlacement.via}.
  const { anchor, via, carried } = placementAnchorOf(env);
  // ⚠ Carried by somebody (an avatar anywhere up the chain): no placement.
  // Every avatar shares one template path, so a `via` hop naming one
  // could land the good in a stranger's pockets; and a good in hand is
  // the owner's estate's to put back (`Estate.hydrateSlice`, inventory).
  if (carried) return null;
  const nested = via.length > 0 ? { via } : {};
  // A KEYED host container (a holding's room — residences D16): record
  // `(scope, key)` so restore re-enters the exact room through the
  // owning institution, never a fresh clone of the shared row.
  if (MixinApi.isPersistable(anchor) && anchor.isPersistenceKeyExplicit()) {
    const scope = anchor.getIdentityPath();
    const key = anchor.getPersistenceKey();
    if (scope && key) return { container: scope, containerKey: key, ...nested };
  }
  if (MixinApi.isWarrenMember(anchor)) {
    // ⚠ Only a warren that is its row's ONE record lands by that row's
    // path. A KEYED warren (an authored ship's — one `ShipWarren/authored`
    // row, a warren per ship, keyed by her path) shares its
    // row with its siblings, so its path names none of them: the room is
    // anchored by its own address below.
    const w = anchor.getWarren();
    const keyed = w !== null && MixinApi.isPersistable(w) && w.isPersistenceKeyExplicit();
    const warren = keyed ? null : w?.getTemplatePath();
    if (warren) return { startLocation: warren, ...nested };
    // ⚠ A room a keyed warren MINTED that keeps no record of its own (a
    // smack's deck): its row is every smack's deck, so
    // the row names none of them. Record the key it was stood up under,
    // exactly as a keyed room's record would.
    const minted = w?.mintedKeyOf(anchor) ?? null;
    const row = anchor.getIdentityPath();
    if (minted !== null && row) {
      // ⭐ Whose room it is (a ship's), so restore can stand HER up and
      // re-enter the room through her — no institution covers a serial.
      const structure = w?.structureOf(anchor)?.getDurableHandle() ?? null;
      return { container: row, containerKey: minted, ...(structure ? { structure } : {}), ...nested };
    }
  }
  const container = anchor.getIdentityPath();
  return container ? { container, ...nested } : null;
}

/**
 * Does this container have an address a placement can name exactly? A
 * keyed persistable host (one of many, told apart by its key), a
 * `Location` (the addressable unit of the world — singleton, or a warren
 * member whose warren re-lands it; read as `Addressable`), or a singleton. Anything else — a
 * chest, a cage, a crate — is one of an unbounded many that share a
 * template path, and is only ever named RELATIVE to an anchor.
 */
function isPlacementAnchor(stuff: Stuff): boolean {
  if (MixinApi.isPersistable(stuff) && stuff.isPersistenceKeyExplicit()) {
    return true;
  }
  // `Addressable` is composed by `Location` and nothing else — it IS the
  // "has an address" property, and reading it as a mixin keeps this file
  // off the Location class (an import cycle through the boundary tree).
  if (MixinApi.isAddressable(stuff)) return true;
  return MixinApi.isSingleton(stuff) || MixinApi.isWarrenMember(stuff);
}

/**
 * Walk outward from `env` to the nearest anchor, collecting the template
 * paths of the containers passed on the way (outermost first). The
 * outermost container is the anchor when nothing above it qualifies —
 * today's behaviour, and the best a rootless chain can do.
 */
function placementAnchorOf(env: Stuff): {
  anchor: Stuff;
  via: string[];
  /** True when a HasInteractive (somebody's pockets) is on the way up. */
  carried: boolean;
} {
  const via: string[] = [];
  let anchor: Stuff = env;
  for (let hops = 0; hops <= MAX_ANCESTOR_HOPS; hops++) {
    if (MixinApi.isHasInteractive(anchor)) return { anchor, via, carried: true };
    if (isPlacementAnchor(anchor)) break;
    const up = MixinApi.isContainable(anchor) ? anchor.getContainer() : null;
    const path = anchor.getTemplatePath();
    if (!up || !path) break;
    via.unshift(path);
    anchor = up;
  }
  return { anchor, via, carried: false };
}

/**
 * Descend from a resolved anchor along `via`, matching each hop by
 * template path among the CURRENT container's contents only — never a
 * world-wide lookup. Stops at the deepest hop that resolves: a missing
 * cage leaves the bird in the room, which is honest, rather than in the
 * first cage anywhere, which is not.
 */
function descendVia(anchor: Stuff & Container, via: string[] | undefined): Stuff & Container {
  let cur: Stuff & Container = anchor;
  for (const hop of via ?? []) {
    const next = cur
      .getContents()
      .find((item) => MixinApi.isContainer(item) && item.getTemplatePath() === hop);
    if (!next || !MixinApi.isContainer(next)) break;
    cur = next as Stuff & Container;
  }
  return cur;
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
  const anchor = await resolvePlacementAnchor(place);
  if (!anchor) {
    // ⭐ The backstop (maritime D26): you log on where you logged off,
    // and when that place no longer resolves — somebody broke the room,
    // the ship you slept on is gone — you land at the realm's default
    // start rather than nowhere. A containerless host would otherwise
    // make `Avatar.enter` throw and the login fail outright.
    const fallback = AppApi.setting(AppSettingKeys.defaultStartLocation);
    if (!fallback) return;
    try {
      const { container } = await ContainmentApi.resolveLanding(fallback);
      if (container) {
        console.warn(
          `PersistableLogic.restorePlacement: ${host.getTemplatePath()} ` +
            `could not return to its captured place; landed at '${fallback}'`,
        );
        ContainmentApi.move(host as Stuff & Containable, container);
      }
    } catch (err) {
      console.warn(
        `PersistableLogic.restorePlacement: the default start '${fallback}' ` +
          `did not resolve either:`,
        err,
      );
    }
    return;
  }
  // The anchor is exact; the way down is matched WITHIN it (see
  // `HostPlacement.via`).
  ContainmentApi.move(host as Stuff & Containable, descendVia(anchor, place.via));
}

/** Resolve a placement's anchor container, or null (logged) if it cannot be. */
async function resolvePlacementAnchor(
  place: HostPlacement,
): Promise<(Stuff & Container) | null> {
  if (place.startLocation) {
    const { container } = await ContainmentApi.resolveLanding(
      place.startLocation,
    );
    return container;
  }
  if (place.container && place.containerKey) {
    // A keyed room: re-enter through the owning institution's admit
    // (the log-out-in-your-yard seam, residences D16) — exact room,
    // exact state, never a fresh clone of the shared row.
    const { CirculationWarren } = await import(
      '../../../lib/place/CirculationWarren'
    );
    const room = await CirculationWarren.admitFor(place.containerKey);
    if (room && MixinApi.isContainer(room)) return room as Stuff & Container;
    // A structure's keyed room (a ship's deck): stand her up, then take the
    // room her warren minted under the key.
    if (place.structure) {
      const theirs = await keyedRoomOfStructure(place.structure, place.container, place.containerKey);
      if (theirs !== null) return theirs;
    }
    console.warn(
      `PersistableLogic.restorePlacement: keyed container ` +
        `'${place.container}#${place.containerKey}' unresolvable — ` +
        `host left where cloned`,
    );
    return null;
  }
  if (place.container) {
    // `singleton` returns the live room or MATERIALIZES it — after a
    // server restart the captured location isn't stood up yet (rooms are
    // lazy), and a live-only lookup would silently leave the host
    // containerless (a returning avatar then fails `Avatar.enter`). The
    // same get-or-create an exit traversal takes.
    let target: Stuff | null = null;
    try {
      target = await StuffApi.singleton<Stuff>(place.container);
    } catch (err) {
      console.warn(
        `PersistableLogic.restorePlacement: captured container ` +
          `'${place.container}' unresolvable — host left where cloned:`,
        err,
      );
    }
    if (target && MixinApi.isContainer(target)) return target as Stuff & Container;
  }
  return null;
}

/**
 * The room `key` of `structure` — a ship's keyed room — once she stands:
 * the live `row` instance her warren minted under that key, or null. She is
 * stood up by her handle as any craft is (a record, or her row).
 */
async function keyedRoomOfStructure(
  structure: string,
  row: string,
  key: string,
): Promise<(Stuff & Container) | null> {
  try {
    const { ExpanseApi } = await import('../../../api/expanse');
    const ship = await ExpanseApi.standUpCraft(structure);
    if (ship === null) return null;
    // Her rooms stand with her (her warren wakes as she does).
    if (MixinApi.isVoyaging(ship)) await ship.watchRoom();
  } catch (err) {
    console.warn(`PersistableLogic.restorePlacement: structure '${structure}' did not stand up:`, err);
    return null;
  }
  for (const r of StuffApi.findByIdentityPath<Stuff>(row)) {
    if (r.isDestroyed() || !MixinApi.isWarrenMember(r) || !MixinApi.isContainer(r)) continue;
    if (r.getWarren()?.mintedKeyOf(r) === key) return r as Stuff & Container;
  }
  return null;
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
    const held: Stuff | null = MixinApi.isContainable(cur) ? cur.getContainer() : null;
    // ⭐ A fixture is not contained — it is HUNG on its host (a room's
    // floor, a sconce). Its host is the next hop (cleanliness D31b: an
    // act that soils the floor captures the room that keeps it).
    // ⭐ A rider (persistence-model D4 — a building) is kept by the host it
    // rides: that host is the next hop.
    cur = held ?? (MixinApi.isAdornment(cur) ? cur.getAdornedTo() : null) ?? riderHost.get(cur) ?? null;
  }
  return null;
}

/* ─────────────────────────── riders (persistence-model D4) ──────────── */

/**
 * ⭐ The state slot a host's riders take in its record. A RIDER is a thing
 * with no record of its own that a kept host carries by name — a holding's
 * buildings, a building on its first kept room. Not a mixin slice: it is
 * stripped before the host's own slices restore.
 */
const RIDERS_KEY = "@riders";

/** Runtime: each host's riders by name. */
const ridersOf = new WeakMap<Stuff, Map<string, Stuff>>();
/** Runtime: the host each rider rides. */
const riderHost = new WeakMap<Stuff, Stuff>();
/** Runtime: a restored rider state whose rider was not standing yet, with the principal it restores as. */
const pendingRiders = new WeakMap<Stuff, Map<string, { state: Record<string, MixinSlice>; principal: Stuff }>>();

/** `state` with the host's live riders' states added under {@link RIDERS_KEY}. */
function withRiders(host: Stuff, state: Record<string, MixinSlice>): Record<string, MixinSlice> {
  const riders = ridersOf.get(host);
  if (!riders || riders.size === 0) return state;
  const out: Record<string, Record<string, MixinSlice>> = {};
  for (const [name, rider] of riders) {
    if (rider.isDestroyed()) continue;
    out[name] = captureState(rider);
  }
  return { ...state, [RIDERS_KEY]: { fields: {}, riders: out } as unknown as MixinSlice };
}

/** Split a record's state into the host's own slices and its riders'. */
function splitRiders(
  state: Record<string, MixinSlice>,
): { own: Record<string, MixinSlice>; riders: Record<string, Record<string, MixinSlice>> } {
  const { [RIDERS_KEY]: slot, ...own } = state;
  const riders = ((slot as unknown as { riders?: Record<string, Record<string, MixinSlice>> } | undefined)?.riders) ?? {};
  return { own, riders };
}

/** Restore each rider standing on `host`; keep the rest for {@link adoptRiderImpl}. */
async function restoreRiders(
  host: Stuff,
  riders: Record<string, Record<string, MixinSlice>>,
  principal: Stuff,
): Promise<void> {
  const live = ridersOf.get(host);
  for (const [name, state] of Object.entries(riders)) {
    const rider = live?.get(name);
    if (rider && !rider.isDestroyed()) {
      await restoreState(rider, state, principal);
      continue;
    }
    let pending = pendingRiders.get(host);
    if (!pending) pendingRiders.set(host, (pending = new Map()));
    pending.set(name, { state, principal });
  }
}

/** See {@link PersistableApi.adoptRider}. */
async function adoptRiderImpl(host: Stuff, name: string, rider: Stuff): Promise<void> {
  if (!MixinApi.isPersistable(host)) {
    throw new TypeError(`PersistableLogic.adoptRider: '${host.getTemplatePath()}' keeps no record to ride`);
  }
  let riders = ridersOf.get(host);
  if (!riders) ridersOf.set(host, (riders = new Map()));
  riders.set(name, rider);
  riderHost.set(rider, host);
  const pending = pendingRiders.get(host)?.get(name);
  if (!pending) return;
  pendingRiders.get(host)!.delete(name);
  await ExecutionContextApi.run(rider, pending.principal, "persistenceRestore", undefined, async () => {
    ExecutionContextApi.tagActingAuthor(pending.principal);
    await restoreState(rider, pending.state, pending.principal);
  });
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
    const cap = field.charAt(0).toUpperCase() + field.slice(1);
    if (!(field in host)) {
      // ⚠ A declared BOOLEAN noun with no slot of its own still has a
      // value, read by its predicate. `Switchable`'s `on` lives in the
      // bistate core, so this check skipped it and every switch came back in
      // its row's state after a restore (a phone switched off woke up on —
      // aether-devices drive, step 14). ⛔ Only `is<Field>()`: a slotless
      // field read through `get<Field>()` (a Location's `coords`, null until
      // its zone places it) restored as `setCoords(null)` and killed the
      // boot — a slotless non-boolean stays uncaptured, as before.
      const read = self[`is${cap}`];
      if (typeof read !== "function") continue;
      const v = (read as () => unknown).call(host);
      if (typeof v !== "boolean") continue;
      out[field] = v;
      continue;
    }
    let value = self[field];
    // ⚠ A function is never data. `Sealable`'s noun `open` is also its
    // verb `open()`, so the bracket read found the method, the snapshot
    // stored it, and the restore's `setOpen` refused it — the whole
    // place failed to come back (the sugar estate's cistern, drive 25).
    // The boolean-noun convention says where the value is: `isOpen()`.
    if (typeof value === "function") {
      const read = self[`is${cap}`] ?? self[`get${cap}`];
      if (typeof read !== "function") continue;
      value = (read as () => unknown).call(host);
    }
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
            !MixinApi.isHasInteractive(item) &&
            !MixinApi.isBehaved(item),
        )
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
 * ⭐ **The shutdown sweep, ASKED not remembered.** The world's
 * persistable singletons — venue rooms, stock counters — capture at
 * establish and at the residency sweep; a stop between two sweeps would
 * lose everything consigned or placed since (the libations live drive
 * watched a dev restart empty the cash-and-carry counter).
 *
 * Who wants a capture is `PersistableMixin`'s own knowledge, including
 * the Avatar exclusion, so this asks the population and each host
 * answers for itself. ⚠ A `PersistableRegistry` that hosts enrolled
 * themselves into was tried and removed: it was a third index of Stuff
 * holding no fact the objects did not already hold, maintained on every
 * key-set and every destruct forever, to save one sweep at process exit.
 *
 * ⭐ It lives HERE rather than in the bootstrapper because the
 * registry-wide read is gated on the calling function, and a backend
 * class has no dispatched frame to be recognized by.
 *
 * ⭐ Bounded (db-performance D8): hosts are prepared six at a time (the
 * pool, less headroom for the estate flushes a prepare makes) and written
 * twenty-five records to a `saveMany` as they are ready, so a process
 * killed at any moment has kept every batch already written. Returns
 * what it saved, what failed (logged, never fatal at exit) and how long
 * it took — the line the operator reads.
 */
async function captureAtShutdownImpl(): Promise<ShutdownCaptureReport> {
  const t0 = Date.now();
  // A capture already queued for a record finishes first: the sweep's
  // write of that record must land after it, not beside it.
  await Promise.allSettled([...recordWrites.values()]);
  const queue: Stuff[] = [];
  for (const stuff of StuffApi.findByMixin('PersistableMixin')) {
    if (!MixinApi.isPersistable(stuff)) continue;
    if (!stuff.capturesAtShutdown()) continue;
    queue.push(stuff);
  }
  let captured = 0;
  let failed = 0;
  let chunk: PreparedCapture[] = [];
  const writes: Promise<void>[] = [];
  /** Write what is prepared, as one batch; a kill after it has lost none of it. */
  const flush = (): void => {
    if (chunk.length === 0) return;
    const batch = chunk;
    chunk = [];
    writes.push(
      writeBatch(batch).then((r) => {
        captured += r.captured;
        failed += r.failed;
        for (const f of r.failures) reportSaveFailure(f.scope, f.owner, f.error);
      }),
    );
  };
  const worker = async (): Promise<void> => {
    for (let host = queue.shift(); host !== undefined; host = queue.shift()) {
      try {
        const prepared = await prepareCapture(host);
        if (!prepared) continue;
        chunk.push(prepared);
        for (const d of prepared.dependents) if (!d.isDestroyed()) queue.push(d);
        if (chunk.length >= SHUTDOWN_WRITE_CHUNK) flush();
      } catch (err) {
        failed += 1;
        console.error(
          `PersistableLogic.captureAtShutdown: failed for ` +
            `${host.getTemplatePath() ?? host.stuffId}:`,
          err,
        );
      }
    }
  };
  await Promise.all(Array.from({ length: SHUTDOWN_PREPARE_CONCURRENCY }, worker));
  flush();
  await Promise.all(writes);
  return { captured, failed, ms: Date.now() - t0 };
}

/**
 * Capture one directly-held item into a `ContentEntry`. A nested **host**
 * (composes `Persistable`) becomes a `{ ref }` — it persists itself, so it
 * is not absorbed; anything else nests its composed `state`, recursing
 * through sub-containers.
 */
function captureItem(item: Stuff, placement: ContentPlacement): ContentEntry {
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
    // lazily does so in `getPersistenceKey`, and that mint is what makes it
    // explicit.
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
  // so a forged record cannot inject `class`/`brain` (which
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
  // Apply through the standard property phase: prefers `set<Field>` (the
  // invariant-enforcing gated setter surface), un-marshals rich values,
  // and only bracket-assigns setterless pure-storage fields (already
  // drift-guarded to declared persistent fields). No raw-target write.
  //
  // ⚠ RESTORE mode, which is NOT go-live: this replays a record of what
  // this instance actually had, so a `birthOnly` field is exactly what
  // it must write back. Phases 2 and 3 are skipped by selection — an
  // instruction or seed field never appears in a captured field slice.
  const applier = await StuffApi.singleton<TemplateApplier>(
    TemplateApplier.templatePath,
  );
  await applier.apply(target, fieldData, { mode: 'restore' });

  // (2) Container contents — cloned through the gated path, placed into the
  // target. Index-aligned with the slice so the Slotted pass resolves.
  const restored: (Stuff | null)[] = [];
  if (containerSlice) {
    for (const entry of containerSlice.contents) {
      restored.push(await restoreItem(entry, target, principal));
    }
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
        // Re-seated, not put on: a part wounded since cannot refuse what
        // it already held (`restoring` skips the body-state gate).
        (target as Stuff & Slotted).occupyAll(
          item as Stuff & Slottable,
          slots,
          { restoring: true },
        );
      }
    }
  }

  // (3b) Placement pass — a placed item re-`place`s onto its `Placing`
  // sibling, under the placement the slice recorded: a member path, or a
  // host's own region name (size and carrying D26). ⭐ A region of THIS
  // container (no `hostIndex` — a pocket's key, W9) went straight into its
  // region in `restoreItem` and is skipped here. ⭐ The
  // member loads first (documents D7), so the restored thing's sync reads —
  // its enclosing scope, `look`'s drill-in — find it. ⭐ AFTER the slotted
  // pass: a worn belt's hanging length is its wearer's waist (D27), so its
  // pouches are re-hung on the belt as worn, not as a strap lying flat.
  if (containerSlice) {
    for (const [i, entry] of containerSlice.contents.entries()) {
      const idx = entry.placement.hostIndex;
      if (idx === undefined) continue;
      const item = restored[i];
      const host = restored[idx];
      if (item && host && MixinApi.isPlacing(host)) {
        const placement = entry.placement.placement ?? Placements.ON;
        await ContainmentApi.placements().ensure(host.getPlacementEntry(placement)?.member ?? placement);
        ContainmentApi.move(item as Stuff & Containable, host as Stuff & Placing, placement);
      }
    }
  }

  // (4) Any layer carrying its OWN async restore hook. `Container` and
  // `Slotted` are handled by the explicit passes above (their ordering
  // against each other is load-bearing and cannot be a generic loop); this
  // dispatches the rest — the fixtures slice (`Adornable`, which re-hangs
  // what somebody hung). Runs last, so it lands in a container that has
  // already been restored.
  const ctx: HydrateContext = {
    restoreItem: (entry, host) =>
      restoreItem(entry as ContentEntry, host as Stuff, principal),
    standUpKeyed: (scope, key) => cloneHost(scope, key),
    applyFields: async (t, fields) => {
      const live = t as Stuff;
      const ok = new Set(
        MixinApi.getAllPersistentFields(live.constructor as AnyConstructor),
      );
      const data: Record<string, unknown> = {};
      for (const [f, v] of Object.entries(fields)) if (ok.has(f)) data[f] = v;
      if (Object.keys(data).length === 0) return;
      await applier.apply(live, data, { mode: 'restore' });
    },
  };
  const contributors = MixinApi.getPersistenceContributors(
    target.constructor as AnyConstructor,
  );
  for (const c of contributors) {
    if (!c.hydrateSlice) continue;
    const slice = state[c.key];
    if (slice) await c.hydrateSlice(target, slice, ctx);
  }
  // A slice no layer claims (a retired one — size-and-carrying W10's
  // carrier homes) is skipped, and said, never an error.
  const claimed = new Set(contributors.map((c) => c.key));
  for (const key of Object.keys(state)) {
    if (!claimed.has(key)) {
      console.warn(
        `PersistableLogic: skipped an unclaimed '${key}' slice restoring ` +
          `${target.getTemplatePath() ?? target.stuffId} — no layer restores it.`,
      );
    }
  }
}

/**
 * **The record is authoritative.** A non-host content item is restored by
 * re-cloning its template, and a clone re-runs the template's `props:`
 * — so a container that declares born-with contents (a stocked chest, a
 * pre-planted pot) arrives holding a fresh set of them, which then collides
 * with the recorded set: doubled contents, and a `Slotted` re-occupy that
 * throws because the born-with occupant already claimed the slot.
 *
 * A *host* never has this problem: `PersistableMixin.applyProps` only
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
      const put = (): void =>
        ContainmentApi.move(nested as Stuff & Containable, host as Stuff & Container);
      if (host instanceof Creature && !nested.isAgent()) host.admitWhile(nested, put);
      else put();
    }
    return nested;
  }
  if (!entry.templatePath) return null;
  const clone = await StuffApi.clone<Stuff>(entry.templatePath);
  clearSeededContents(clone, entry.state);
  await restoreState(clone, entry.state, principal);
  if (MixinApi.isContainable(clone) && MixinApi.isContainer(host)) {
    // ⭐ A region of the host itself (a pocket — W9, D-W9-7): straight into
    // it, one move. A stale record (the row lost the pocket, or its member
    // no longer encloses) is logged and the host's arrival decides.
    const region = await selfRegionOf(entry, host);
    const put = (): void =>
      region !== null
        ? ContainmentApi.move(clone as Stuff & Containable, host as unknown as Stuff & Placing, region)
        : ContainmentApi.move(clone as Stuff & Containable, host as Stuff & Container);
    // ⭐ A body admits what it carried (the flip's veto, D11; W8 — every
    // body, so a hog or a fish restored with contents is not refused): the
    // record is replayed — re-seated and re-placed by the passes after
    // this; whatever is still loose is a broken record, reported loudly by
    // the body's `onRestored` and never placed (no migrations).
    if (host instanceof Creature) host.admitWhile(clone, put);
    else put();
  }
  return clone;
}

/**
 * The region of `host` itself that `entry` records (size and carrying W9,
 * D-W9-7) — `placement` with no host field — when the host still offers it
 * and its member still encloses; else `null` (a stale record is logged).
 */
async function selfRegionOf(entry: ContentEntry, host: Stuff): Promise<string | null> {
  if (entry.placement === undefined) return null;
  const at = entry.placement;
  if (at.placement === undefined || at.hostIndex !== undefined) return null;
  const offered =
    MixinApi.isPlacing(host) && host.getPlacements().includes(at.placement)
      ? host.getPlacementEntry(at.placement)
      : null;
  if (offered !== null && (await ContainmentApi.placements().ensure(offered.member)).getEncloses()) {
    return at.placement;
  }
  console.warn(
    `PersistableLogic: ${host.getTemplatePath() ?? host.stuffId} offers no enclosing region ` +
      `'${at.placement}' any more — the restored thing lands where the host's arrival puts it`,
  );
  return null;
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
async function cloneHost(scope: string, key?: string, zoneFrom?: string): Promise<Stuff | null> {
  if (!scope) return null;
  if (key !== undefined) {
    // ⭐⭐ RESOLVE FIRST. A keyed host's identity is the pair, and two
    // records can both refer to one (a chest carried between two
    // persistable rooms, one record stale): minting unconditionally made
    // the second `assertUniqueKey` THROW and abort that whole room's
    // restore mid-tree. Resolving returns the standing instance, and the
    // caller that holds a `{ref, key}` moves it in — so the last record
    // to materialize wins the stale-vs-fresh argument, which is arbitrary
    // but never fatal, and the stale record heals on its next capture.
    const live = liveKeyed(scope, key);
    if (live) return live;
    // ⭐ A room a warren owns is stood up BY its warren, never alone:
    // minted here it would stand outside the warren, and the warren's next
    // wake would mint a second copy under the same key. A key an
    // institution covers (a holding's room, a dorm's unit) goes through its
    // `admitFor` — the seam a parked character re-enters a keyed room by —
    // whose answer must be this very pair. Anything else (a ship's hold:
    // her ship stands her rooms up with her) is refused. ⚠ Asked of the
    // CLASS, before anything is cloned (zone-instancing): a copy's room
    // cloned from its row outside its copy would land in the plan's zone
    // row, which refuses a room.
    if (!(await standsUpAloneByClass(scope))) {
      const owned = await roomOwnedByInstitution(scope, key);
      if (owned) return owned;
      console.warn(
        `PersistableLogic.standUpKeyed: '${scope}#${key}' is a room its ` +
          `warren stands up — not minted alone`,
      );
      return null;
    }
    const nested = await StuffApi.clone<Stuff>(scope, undefined, zoneFrom !== undefined ? { zoneFrom } : undefined);
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

/**
 * May an instance of `scope`'s class stand up alone by its key? Answered by
 * the class (every `standsUpAlone` is a constant of its class), so the
 * question is settled before a shell is minted. A row that is not a
 * persistable answers yes — it is cloned as before.
 */
async function standsUpAloneByClass(scope: string): Promise<boolean> {
  const row = await Template.findByPath(scope);
  if (!row) return true;
  const cls = (await StuffApi.loadClassByPath(row.class)) as AnyConstructor & {
    prototype: { standsUpAlone?: () => boolean };
  };
  if (!MixinApi.hasMixin(cls, Mixins.Persistable)) return true;
  return cls.prototype.standsUpAlone!() !== false;
}

/**
 * The keyed room an institution re-enters for `key` when it is exactly
 * `(scope, key)`, else `null`. Only a key that is a PATH can lie under an
 * institution's extent (a ship's room is keyed by her serial).
 */
async function roomOwnedByInstitution(
  scope: string,
  key: string,
): Promise<Stuff | null> {
  if (!key.startsWith('/')) return null;
  const { CirculationWarren } = await import(
    '../../../lib/place/CirculationWarren'
  );
  const room = await CirculationWarren.admitFor(key);
  if (room === null) return null;
  if (
    MixinApi.isPersistable(room) &&
    room.getTemplatePath() === scope &&
    room.getPersistenceKey() === key
  ) {
    return room;
  }
  return null;
}

/** What the shutdown sweep saved (db-performance D8) — the line the operator reads. */
export interface ShutdownCaptureReport {
  /** Records written. */
  captured: number;
  /** Hosts whose prepare threw, and records in a batch that failed. */
  failed: number;
  /** Wall ms the sweep took. */
  ms: number;
}

/* ─────────────────────────── impl entry points ──────────────────────── */

/**
 * A capture made ready to write: the record (scope, owner, state, place)
 * and the hosts whose records follow it (db-performance D8).
 */
interface PreparedCapture {
  /** The per-record queue key — `scope` NUL `owner`. */
  id: string;
  record: PersistedRecord;
  dependents: (Stuff & Persistable)[];
}

/** The row's key on `holder_snapshots` (its unique index). */
const RECORD_KEY = ['scope', 'owner'] as const;

/**
 * ⭐ One capture: prepare it, write it as ONE keyed upsert in the record's
 * own queue, then the records it owns. (Before db-performance W4 the write
 * was a find then a save — two round trips, and not atomic, which is why
 * the queue exists; a keyed upsert is one round trip and atomic against
 * the unique `{scope, owner}` index, and the queue still orders two
 * captures of one record.)
 */
async function captureImpl(host: Stuff, key?: string): Promise<void> {
  const prepared = await prepareCapture(host, key);
  if (!prepared) return;
  try {
    await serialRecordWrite(prepared.id, () => writeRecords([prepared]));
    savedAgain(prepared.record.scope);
  } catch (err) {
    // ⭐ A refused save is TOLD (persistence-model D10): a diagnostic, and the
    // first of a streak to whoever it concerns — then rethrown to the caller.
    reportSaveFailure(prepared.record.scope, prepared.record.owner, err);
    throw err;
  }
  // ⭐ The records this host owns follow it (tracts build D26): a tract's
  // fields are written with the tract, each under its own key. Each goes
  // through its own record's write queue.
  for (const dependent of prepared.dependents) {
    if (!dependent.isDestroyed()) await captureImpl(dependent);
  }
}

/**
 * Everything a capture does before its write: resolve the record's key,
 * take the synchronous snapshot, send goods titled to others to their
 * estates. `null` when there is nothing to write (an opted-out host, or one
 * destructed during the awaits).
 */
async function prepareCapture(host: Stuff, key?: string): Promise<PreparedCapture | null> {
  // ⭐ Only a host keeps a record (persistence-model D1): a thing is kept by
  // its container, and a capture of one is a caller that has not caught up.
  if (!MixinApi.isPersistable(host)) {
    throw new TypeError(
      `PersistableLogic.capture: '${host.getTemplatePath() ?? host.stuffId}' keeps no record of its own — capture its host (captureHostOf)`,
    );
  }
  if (optedOutOfPersistence(host)) return null; // guest / opted-out host
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
  // The destruct backstop fires-and-forgets; a destruct that finished
  // during the awaits above has evacuated the host, and a snapshot of an
  // inert shell would overwrite the last good record with nothing.
  if (host.isDestroyed()) return null;
  // The records this host owns, read while it stands: the write below
  // awaits, and a host destructed meanwhile (a warren put to sleep) is
  // inert — but what it owned must still be written.
  const dependents = MixinApi.isPersistable(host) ? host.dependentPersistables() : [];
  const state = withRiders(host, captureState(host));
  const place = capturePlacement(host);
  // The snapshot above is taken synchronously; the write is the caller's
  // — one keyed upsert, so two captures of a host with no record yet can
  // no longer both INSERT and die on the unique index (a ship's first
  // commissioning capture and the one her mooring kicks off raced, and
  // `buy smack` threw E11000).
  const record = new PersistedRecord();
  record.scope = scope;
  record.owner = owner;
  record.state = state;
  record.place = place;
  record.writtenAt = Date.now();
  // ⭐ The residency pin rides the record (persistence-model N8).
  record.pinned = MixinApi.isPersistable(host) && host.pinsResidency() && host.isPersistenceKeyExplicit();
  return { id: `${scope}\u0000${owner}`, record, dependents };
}

/**
 * Runtime, test world only: the record scopes whose writes are refused
 * ({@link PersistableApi.refuseSavesOf}) — the staged twin of a save the
 * database turned down.
 */
const refusedScopes = new Set<string>();

/** Write `batch` as one `saveMany`; a refused scope throws as the database would. */
async function writeRecords(batch: readonly PreparedCapture[]): Promise<void> {
  const refused = batch.find((c) => refusedScopes.has(c.record.scope));
  if (refused) {
    throw new Error(`the records refused '${refused.record.scope}' (a staged refusal)`);
  }
  const rows = await Promise.all(batch.map((c) => c.record.toBatchWrite({ key: RECORD_KEY })));
  await PersistApi.saveMany(PersistedRecord.collectionName, rows);
}

/**
 * ⭐ Write a batch of prepared records (persistence-model D10). One
 * `saveMany`; when it throws, the batch is written again ONE record at a
 * time, so a refused record fails alone and every batch-mate is saved.
 * Each failure is named.
 */
async function writeBatch(
  batch: readonly PreparedCapture[],
): Promise<{ captured: number; failed: number; failures: SaveFailure[] }> {
  try {
    await writeRecords(batch);
    return { captured: batch.length, failed: 0, failures: [] };
  } catch (err) {
    // @quiet not swallowed: a lone record's failure is RETURNED (named), and a
    // larger batch is retried one record at a time just below.
    if (batch.length === 1) {
      const only = batch[0]!;
      return { captured: 0, failed: 1, failures: [{ scope: only.record.scope, owner: only.record.owner, error: err }] };
    }
  }
  let captured = 0;
  const failures: SaveFailure[] = [];
  for (const one of batch) {
    try {
      await writeRecords([one]);
      captured += 1;
    } catch (err) {
      // @quiet not swallowed: the failure is RETURNED, named, for the caller to report.
      failures.push({ scope: one.record.scope, owner: one.record.owner, error: err });
    }
  }
  return { captured, failed: failures.length, failures };
}

/** A record a write refused. */
interface SaveFailure {
  scope: string;
  owner: string;
  error: unknown;
}

/** Runtime: the scopes whose last save was refused — a streak is told once. */
const failingScopes = new Set<string>();

/** A save of `scope` landed: its streak (if any) is over. */
function savedAgain(scope: string): void {
  failingScopes.delete(scope);
}

/**
 * ⭐⭐ **A refused save is reported where it is written** (persistence-model
 * D10). Every failure is a diagnostic on the `persistence` channel (the
 * `errors` verb lists it); the FIRST failure of a streak is also one line
 * to whoever it concerns — the host when it is a connected body, else each
 * connected body standing in the kept place. A second failure is not told
 * again until a save lands. Never thrown from here.
 */
function reportSaveFailure(scope: string, owner: string, error: unknown): void {
  const why = error instanceof Error ? error.message : String(error);
  void DiagnosticApi.record({
    path: scope,
    severity: 'error',
    channel: 'persistence',
    message: `a save of ${scope} (${owner}) was refused: ${why}`,
  }).catch((err: unknown) => console.error('PersistableLogic: recording a refused save failed:', err));
  console.error(`PersistableLogic: a save of '${scope}' (${owner}) was refused:`, error);
  if (failingScopes.has(scope)) return;
  failingScopes.add(scope);
  const live = StuffApi.findByIdentityPath<Stuff>(scope)[0] ?? StuffApi.findByTemplatePath<Stuff>(scope) ?? null;
  if (live === null) return;
  const told: Stuff[] = MixinApi.isHasInteractive(live)
    ? [live]
    : MixinApi.isContainer(live)
      ? live.getContents().filter((c) => MixinApi.isHasInteractive(c))
      : [];
  const line = MixinApi.isHasInteractive(live)
    ? Mml.compose`Something went wrong saving you just now — what you carry since your last save may not be kept. The operators have been told.`
    : Mml.compose`Something went wrong saving this place just now — what changed here may not be kept. The operators have been told.`;
  for (const body of told) {
    try {
      MessageApi.scene(body).topic('shell.error').toSelf(line).send();
    } catch (err) {
      // @quiet a body that cannot be told now is told by the diagnostic above.
      console.warn('PersistableLogic: telling a body of a refused save failed:', err);
    }
  }
}

/** How many hosts the shutdown sweep prepares at once. */
const SHUTDOWN_PREPARE_CONCURRENCY = 6;
/** Records per shutdown `saveMany`. */
const SHUTDOWN_WRITE_CHUNK = 25;

/** Runtime: the in-flight record write per `(scope, owner)` — the queue {@link serialRecordWrite} keeps. */
const recordWrites = new Map<string, Promise<void>>();

/** Run `write` after any earlier write of the same record has settled — two captures of one record land in order. */
function serialRecordWrite(id: string, write: () => Promise<void>): Promise<void> {
  const prior = recordWrites.get(id) ?? Promise.resolve();
  const mine = prior.catch(() => undefined).then(write);
  recordWrites.set(id, mine);
  void mine
    .finally(() => {
      if (recordWrites.get(id) === mine) recordWrites.delete(id);
    })
    .catch(() => undefined);
  return mine;
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
  if (record) {
    await restoreRecord(host, record);
    // The cast is transient (capture's third skip), so a restored room
    // comes back without its troupe — re-seed any `cast:` entry that has
    // no live instance. Walks the retained `_bornWithCast`, so it is a
    // no-op for a host that declares no cast.
    if (MixinApi.isPersistable(host)) await host.reseedCast();
  }
}

/** Restore one record onto `host` under its owning principal (shared by the
 * keyed and keyless materialize paths). */

/**
 * A place's durable name — the id a pet's home and a bonded animal's
 * return are recorded by: its durable handle, else its identity path.
 */
function placeIdOf(host: Stuff): string {
  return host.getDurableHandle() ?? host.getIdentityPath() ?? "";
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
      const { own, riders } = splitRiders(record.getState());
      await restoreState(host, own, principal);
      await restoreRiders(host, riders, principal);
      // A Containable top-level host re-places itself at its captured
      // location (overriding the clone-time template spawn).
      await restorePlacement(host, record.getPlace());
    },
  );
  // ...and last, put a resting body back on the thing it was resting on.
  reoccupyRestingHost(host);
  // The host re-arms what ran on its fields (a craft re-starts its voyage).
  if (MixinApi.isPersistable(host)) {
    try {
      await host.onRestored();
    } catch (err) {
      console.warn(
        `PersistableLogic: onRestored failed for ${host.getTemplatePath()}:`,
        err,
      );
    }
  }
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
    (seat as unknown as Stuff & Slotted).occupyAll(
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
  // ⚠ Keyless: `captureImpl` reuses the stashed key itself. Passing it in
  // as `key` told the stash it was EXPLICIT, so the first soiled floor
  // turned a singleton kept place into a keyed holding — and an avatar
  // captured inside it recorded a `#key` placement only a warren can
  // resolve (the cleanliness drive's restart: the cook woke in the lounge).
  await captureImpl(host);
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
  // No record: lay the declared `props:` fixtures down ONCE, then
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

  /** See {@link PersistableApi.captureAtShutdown}. */
  @CallSecurity(PersistableApiCallers)
  public async captureAtShutdown(): Promise<ShutdownCaptureReport> {
    return captureAtShutdownImpl();
  }

  /** See {@link PersistableApi.pinned}. */
  @CallSecurity(PersistableApiCallers)
  public async pinned(): Promise<Array<{ scope: string; key: string }>> {
    return (await PersistedRecord.findPinned()).map((r) => ({ scope: r.getScope(), key: r.getOwner() }));
  }

  /** See {@link PersistableApi.adoptRider}. */
  @CallSecurity(PersistableApiCallers)
  public async adoptRider(host: Stuff, name: string, rider: Stuff): Promise<void> {
    return adoptRiderImpl(host, name, rider);
  }

  /** See {@link PersistableApi.refuseSavesOf}. */
  @CallSecurity(PersistableApiCallers)
  public refuseSavesOf(scope: string, on: boolean): void {
    if (on) refusedScopes.add(scope);
    else refusedScopes.delete(scope);
  }

  /** See {@link PersistableApi.captureBatch}. */
  @CallSecurity(PersistableApiCallers)
  public async captureBatch(hosts: readonly Stuff[]): Promise<ShutdownCaptureReport & { refused: string[] }> {
    const t0 = Date.now();
    const prepared: PreparedCapture[] = [];
    for (const host of hosts) {
      const p = await prepareCapture(host);
      if (p) prepared.push(p);
    }
    const r = await writeBatch(prepared);
    for (const f of r.failures) reportSaveFailure(f.scope, f.owner, f.error);
    return { captured: r.captured, failed: r.failed, ms: Date.now() - t0, refused: r.failures.map((f) => f.scope) };
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

  /** See {@link PersistableApi.standUpKeyed}. */
  @CallSecurity(PersistableApiCallers)
  public async standUpKeyed(
    scope: string,
    key: string,
    opts?: { zoneFrom?: string },
  ): Promise<Stuff | null> {
    return cloneHost(scope, key, opts?.zoneFrom);
  }

  /** See {@link PersistableApi.placeIdOf}. */
  @CallSecurity(PersistableApiCallers)
  public placeIdOf(host: Stuff): string {
    return placeIdOf(host);
  }

  /** See {@link PersistableApi.storedField}. */
  @CallSecurity(PersistableApiCallers)
  public async storedField(scope: string, mixin: string, field: string): Promise<unknown> {
    for (const row of await PersistedRecord.findByScope(scope)) {
      const slice = row.getState()[mixin];
      if (slice === undefined || !('fields' in slice)) continue;
      const value = (slice.fields as Record<string, unknown> | undefined)?.[field];
      if (value !== undefined) return value;
    }
    return undefined;
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
      { acting: { system: 'persistence' }, circleScope: OMNI_SCOPE }
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
      { acting: { system: 'persistence' }, circleScope: '*' }
    );
  }
}
