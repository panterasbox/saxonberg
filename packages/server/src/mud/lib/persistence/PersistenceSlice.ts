/**
 * PersistenceSlice — the slice-type vocabulary of the persistence spine.
 *
 * A {@link PersistedRecord}'s `state` is a map keyed by mixin/layer name to
 * that layer's **slice**: the self-contained serialization of the one
 * concern that layer owns. This module is the single concept the persistence
 * spine's type surface defines — it kills the `types.ts` reflex.
 *
 * Four slice shapes exist:
 *
 *   - **default** (`FieldsSlice`) — every ordinary mixin (`Graded`,
 *     `Propertied`, `Named`, …): that layer's declared `persistentFields`,
 *     marshalled to stored form. The default per-mixin capture; no override.
 *   - **container** (`ContainerSlice`) — `ContainerMixin`'s directly-held
 *     content, one `ContentEntry` per Containable. A non-host item nests
 *     `{ templatePath, state, placement }` (recursing through sub-containers);
 *     a **nested host** is a reference `{ ref, placement }` — never absorbed,
 *     because it persists itself.
 *   - **slotted** (`SlottedSlice`) — `SlottedMixin`'s worn/equipped
 *     occupancy, recorded by *position* (indices into the container slice),
 *     never by instance id.
 *   - **belief** (`BeliefSlice`) — `BeliefStoreMixin`'s memory, but only
 *     for a host with an explicit persistence key. See {@link BeliefSlice}.
 *
 * The recursion seam ({@link CaptureContext} / {@link HydrateContext}) lets a
 * mixin's `captureSlice` / `hydrateSlice` hook recurse into item state
 * without importing `PersistableLogic` (breaking the lib → obj/api cycle):
 * `PersistableLogic` implements the seam and passes it into every hook.
 *
 * ⭐⭐ **A contributor may also name a source that is NOT the record.**
 * `hydrationSource` + `hydrateFromSource` (below) are the other half of
 * the same framework: a mixin says where its remembered state lives, and
 * the clone pipeline drives it **whether or not the host has a record at
 * all**. That last clause is the whole original defect — `hydrateSlice`
 * ran only when a record carried the layer's slice, so a singleton with
 * no record (every `Cast`) had its memory written through on every change
 * and never read back once. The records piled up in Mongo unread while an
 * NPC's opinion of you reset on every restart.
 */

// Type-only: erased at compile time, so no runtime edge and no cycle.
import type { BeliefRecord } from '../belief/BeliefStore';

/**
 * Where a captured content item sits relative to its host. Worn/equipped
 * placement lives in the host's {@link SlottedSlice} (by index), not here;
 * this records only the placement relation.
 *
 * A placed item (a bottle on the back-bar, a ham hanging from a hook) has
 * `container = the host` and a placement host that is a **`Placing`
 * sibling in the same contents list** — so the relation is captured as
 * the **index** of that sibling plus the member's name, resolved on
 * restore to re-`place` after both are cloned.
 *
 * ⚠ Named `ContentPlacement` because `Placement` is also the vocabulary
 * Idea (`/platform/idea/Placement/<name>`) whose rows name the members
 * this struct records.
 */
export interface ContentPlacement {
  /**
   * Index (into the same container slice's `contents`) of the `Placing`
   * sibling this item is placed on, or undefined when it sits loose.
   */
  hostIndex?: number;
  /**
   * The member name (`on`, `in`, `from`) the item is placed under.
   * Undefined when it sits loose; `on` for anything captured before the
   * relation had a name.
   */
  placement?: string;
}

/**
 * One entry in a container slice. Either a **non-host item** (nests its own
 * captured `state`, recursing) or a **nested host reference** (`ref` = the
 * host's own `scope`; it persists itself, so it is not absorbed).
 *
 * `key` is the nested host's per-instance persistence key, present iff the
 * host had one at capture time. A keyed ref restores by cloning a **fresh**
 * shell and materializing its `(scope, key)` record — so many instances of
 * one template nest side by side without collapsing. A keyless ref keeps
 * the original singleton resolve (`findByTemplatePath` dedup), so every
 * record written before the key existed restores unchanged.
 */
export type ContentEntry =
  | {
      templatePath: string;
      state: Record<string, MixinSlice>;
      placement: ContentPlacement;
    }
  | { ref: string; key?: string; placement: ContentPlacement };

/** A nested-host reference entry (narrowed by the `ref` discriminant). */
export type RefEntry = { ref: string; key?: string; placement: ContentPlacement };

/** The default slice — a layer's declared fields, marshalled to stored form. */
export interface FieldsSlice {
  fields: Record<string, unknown>;
}

/** `ContainerMixin`'s slice — the host's directly-held content tree. */
export interface ContainerSlice {
  contents: ContentEntry[];
}

/**
 * `SlottedMixin`'s slice — the worn/equipped occupancy, recorded by
 * *position*: each worn item is named by its index into the host's
 * container slice (never an instance id) plus the slot names it claims (a
 * Wearable may claim several). Resolved after the container slice restores,
 * so the indices resolve to freshly-cloned items.
 */
export interface SlottedSlice {
  worn: Array<{ index: number; slots: string[] }>;
}

/**
 * Where an owned good sits, from its owner's point of view — the D1
 * `place` vocabulary. Either one of the two sentinels or a **room
 * identity** (a room's persistence scope).
 */
export const ESTATE_INVENTORY = "inventory";
export const ESTATE_STORAGE = "storage";

/**
 * One good in an owner's **estate**: a good they hold title to that the
 * owner's record — not the room it happens to stand in — is authoritative
 * for. `state` is the good's captured composition, exactly the shape a
 * non-host {@link ContentEntry} nests, so restore re-uses one path.
 *
 * `place` routes the restore: `inventory` clones into the owner's own
 * container, `storage` clones **nothing** (an owned-but-unplaced good has
 * no presence in the world — that is what makes storage free), and a room
 * identity defers to that room's materialize.
 */
export interface EstateEntry {
  chattelId: string;
  templatePath: string;
  state: Record<string, MixinSlice>;
  place: string;
  /**
   * ⭐⭐ Present iff the good **persists itself** — a host with an explicit
   * persistence key of its own (a named animal).
   *
   * When it is set the entry is a **reference, not a copy**: `state` is
   * empty and the good's own `holder_snapshots` record is authoritative
   * for everything about it, including where it stands. The owner's
   * estate says only *you have title to this, and here is how to find
   * it* — which is right, because a pet's regard, hunger, handling and
   * home are the PET's state, not its owner's inventory listing.
   *
   * ⚠ Without the split, capturing an owner would snapshot the animal
   * into the owner's record and the animal would also be writing its
   * own — two copies of one creature, diverging from the first meal.
   */
  key?: string;
  /**
   * Present iff the good is **mounted** on the place rather than standing
   * in it — hung on the room's `Adornable` fixture map (residences D11).
   * `slot` is the fixture slot name to re-attach under, so a wall lamp
   * comes back on the wall and not on the floor. Absent for every good
   * that simply sits somewhere, which is every good written before the
   * marker existed.
   */
  mounted?: { slot: string };
}

/**
 * `EstateMixin`'s slice — every stamped good its host holds title to,
 * wherever it sits. The counterpart to the {@link ContainerSlice}'s skip
 * rule: a host's contents slice drops goods someone has been *stamped* as
 * owning, and this is where they persist instead.
 */
export interface EstateSlice {
  entries: EstateEntry[];
  /**
   * ⚠⚠ The estate's SUCCESSION state rides the slice, not a declared
   * field, and that is forced rather than chosen: a layer with a
   * `captureSlice` **never contributes its own `fieldMeta`** —
   * `captureState` is an `if captureSlice / else if fields` — so a
   * field declared beside a slice is silently never written.
   *
   * Optional because a record captured before the fields moved here
   * has neither; both default on restore (0 and '').
   */
  escheatedAt?: number;
  beneficiary?: string;
}

/**
 * A belief-holding host's own memory, when that host persists itself.
 *
 * ⭐ Only a host with an **explicit persistence key** contributes one. An
 * Avatar's beliefs live in the `beliefs` collection keyed by its minted
 * identity, so its slice is empty and its record is byte-identical to
 * what it was; a named animal has no minted identity, so its opinion of
 * you is part of *its* state and rides *its* record. The split is
 * decided in exactly one place — `viewerKey` in
 * `lib/belief/BeliefStore.ts` — so no host can ever write to both.
 */
export interface BeliefSlice {
  beliefs: BeliefRecord[];
}

/** The tagged union stored under each layer key in a record's `state`. */
export type MixinSlice =
  | FieldsSlice
  | ContainerSlice
  | SlottedSlice
  | EstateSlice
  | BeliefSlice;

/**
 * A Containable top-level host's own durable spawn/recall location — the
 * `PersistedRecord.place` shape. `startLocation` (a `WarrenMember`-reconciled
 * Warren/room ref, resolved via `ContainmentApi.resolveLanding`) takes
 * precedence over a plain `container` templatePath.
 */
export interface HostPlacement {
  container?: string;
  /**
   * The container's explicit persistence key, when it is a KEYED host
   * (a holding's room — many share one row, so `container` alone would
   * collapse them; residences D16). Restore re-enters through the
   * owning institution's admit.
   */
  containerKey?: string;
  startLocation?: string;
  /**
   * The way DOWN from the anchor to where the host actually stood, as the
   * template paths of the intermediate containers, outermost first — a
   * cage on a table in a room is `[table, cage]` under `container: room`.
   *
   * ⭐ `container` names the nearest ancestor with an ADDRESS (a keyed
   * host, a Location, a singleton), never an intermediate container: a
   * chest's template path is every chest in the world, so "find the
   * first live chest" could land the host anywhere. Restore resolves the
   * anchor exactly, then descends hop by hop **within it** — matching each
   * hop among that container's contents only — and stops at the deepest
   * hop it can find. Absent when the host stood directly in the anchor.
   */
  via?: string[];
}

/**
 * The recursion seam a `captureSlice` hook uses to descend into item state
 * without importing `PersistableLogic`. `PersistableLogic` implements it.
 */
export interface CaptureContext {
  /**
   * Capture one directly-held item into a `ContentEntry`: a nested host
   * becomes a `{ ref }`; anything else nests its composed `state`. The
   * host recursion (sub-containers) rides `captureState`.
   */
  captureItem(item: unknown, placement: ContentPlacement): ContentEntry;
  /** Compose the full per-mixin `state` map for a Stuff (recursion base). */
  captureState(item: unknown): Record<string, MixinSlice>;
  /**
   * The index of `item` in the current host's captured container order
   * (the shared ordering the Container and Slotted slices both reference),
   * or -1 when the host holds no such item. Lets the Slotted slice name a
   * worn item by position without a second capture.
   */
  indexOf(item: unknown): number;
  /**
   * Report a good this host **skipped** because someone is stamped as
   * owning it (the D2 skip rule). Capture is synchronous and cannot write
   * to another principal's record, so the skipped goods are collected here
   * and flushed into their owners' estates by `PersistableLogic` after the
   * state build — the only path by which a good standing in a room that
   * goes dormant, whose owner is offline, is captured by anybody at all.
   */
  noteOwnedGood(item: unknown): void;
}

/**
 * The recursion seam a `hydrateSlice` hook uses to reconstitute item state
 * through the gated clone path without importing `PersistableLogic`.
 *
 * ⚠ Called `RestoreContext` until 2026-10-01. The pair reads
 * capture / hydrate now, because *hydrate* is this build's word for
 * filling an instance from what the world remembered about it.
 */
export interface HydrateContext {
  /**
   * Reconstitute one `ContentEntry` into a live Stuff placed inside
   * `host`: a `{ ref }` follows the reference (materializes the nested
   * host), anything else clones + applies its `state`. Returns the live
   * item (for Slotted re-wear), or null on a ref that could not resolve.
   */
  restoreItem(
    entry: ContentEntry,
    host: unknown,
  ): Promise<unknown | null>;

  /**
   * Resolve-or-mint the host keyed `(scope, key)` — a good that persists
   * **itself** and so is not rebuilt from a nested `state` but stood up
   * from its own record, which restores its own placement. The estate's
   * keyed entries use it: an owner arriving stands its animals up, and
   * finds them already standing when the boot roll got there first.
   */
  standUpKeyed(scope: string, key: string): Promise<unknown | null>;
}

/**
 * ⭐⭐ **Where a mixin's remembered state lives, when it is not the
 * host's own record.**
 *
 * Declared as a static on the mixin's returned class, beside
 * `captureSlice` / `hydrateSlice`, and read by the same prototype-chain
 * walk (`MixinApi.getPersistenceContributors`). `required` is REQUIRED,
 * deliberately: the shape forces every source to say out loud whether it
 * may be missing, because that was previously implicit and was wrong.
 *
 * ⭐⭐ **WHEN is not a property here, and the absence is the design.**
 * A source always runs at mint, before the host is observable. There was
 * an `eager: boolean` for one wave, and it was a category error: it
 * asserted that eager initialization and runtime fetching are two modes
 * of one operation.
 *
 * They are not. **Hydration is an initialization step with a terminus**
 * — performed once, then done — which is precisely why freshness is not
 * one of its questions. Fetching the same data later, on a live object,
 * is a different mandate using the same call: it owns invalidation,
 * refresh, eviction, and *who is authoritative between the fetch and the
 * first write*. That is a state machine, and its shape is the
 * property's own, not this interface's — a belief cache invalidates on
 * nothing (memory leads after birth and the write-through keeps Mongo in
 * step), while a grid-reachability cache invalidates when a feeder is
 * cut. One boolean could never have carried both.
 *
 * ⚠ And the omission is not theoretical. `BeliefStore.adjustRegard` is a
 * read-modify-write off the in-memory map with a write-through to Mongo:
 * a window in which the map is unfilled means `regardFor` honestly
 * answers `0`, the next nudge computes `0 + 1`, and a stored `12` is
 * overwritten by a `1` — memory lost, silently. A lazy source would have
 * had to answer that before it could be used at all, and answering it is
 * the cache's job.
 *
 * ⭐ If something ever genuinely needs runtime fetching, it wants a cache
 * designed as one, with those answers given per property. `WarmedIndex`
 * is the nearest prior art for the roster-shaped case.
 */
export interface HydrationSource {
  /**
   * What the source is, for diagnostics and for the `remembers:` line an
   * author reads — a collection name (`'beliefs'`), a document tree
   * path, a pack's own store.
   */
  name: string;
  /**
   * ⚠ **`true` means a host that cannot reach this source must not come
   * into the world.** The clone fails and the half-built object is
   * unregistered, naming the mixin and the row.
   *
   * `false` means an unreachable source is a recorded skip. Every test
   * run and all of early boot are the `false` case (Mongo is not
   * connected), which is exactly why the flag exists: the alternative is
   * a framework that either bricks the test suite or swallows a real
   * outage, and nothing in between.
   */
  required: boolean;
}

/**
 * What a `hydrateFromSource` call reports back. ⭐ Three outcomes, not a
 * boolean: *filled*, *this host does not keep its state here*, and *the
 * source is not reachable right now* are three different facts, and
 * collapsing the last two is how a real outage reads as a design choice.
 */
export type HydrateOutcome =
  | { status: 'hydrated' }
  | { status: 'skipped'; reason: string }
  | { status: 'unreachable'; reason: string };
