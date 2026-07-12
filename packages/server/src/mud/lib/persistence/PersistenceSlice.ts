/**
 * PersistenceSlice — the slice-type vocabulary of the persistence spine.
 *
 * A {@link PersistedRecord}'s `state` is a map keyed by mixin/layer name to
 * that layer's **slice**: the self-contained serialization of the one
 * concern that layer owns. This module is the single concept the persistence
 * spine's type surface defines — it kills the `types.ts` reflex.
 *
 * Three slice shapes exist:
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
 *
 * The recursion seam ({@link CaptureContext} / {@link RestoreContext}) lets a
 * mixin's `captureSlice` / `restoreSlice` hook recurse into item state
 * without importing `PersistableLogic` (breaking the lib → obj/api cycle):
 * `PersistableLogic` implements the seam and passes it into every hook.
 */

/**
 * Where a captured content item sits relative to its host. Worn/equipped
 * placement lives in the host's {@link SlottedSlice} (by index), not here;
 * this records only the surface relation.
 *
 * A surface-resting item (a bottle on the back-bar, a sword on a rack) has
 * `container = the host` and `restingOn = a Surfaced sibling` in the same
 * contents list — so the relation is captured as the **index** of that
 * sibling, resolved on restore to re-`placeOn` after both are cloned.
 */
export interface Placement {
  /**
   * Index (into the same container slice's `contents`) of the Surfaced
   * sibling this item rests **on**, or undefined when it sits loose.
   */
  restingOnIndex?: number;
}

/**
 * One entry in a container slice. Either a **non-host item** (nests its own
 * captured `state`, recursing) or a **nested host reference** (`ref` = the
 * host's own `scope`; it persists itself, so it is not absorbed).
 */
export type ContentEntry =
  | {
      templatePath: string;
      state: Record<string, MixinSlice>;
      placement: Placement;
    }
  | { ref: string; placement: Placement };

/** A nested-host reference entry (narrowed by the `ref` discriminant). */
export type RefEntry = { ref: string; placement: Placement };

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

/** The tagged union stored under each layer key in a record's `state`. */
export type MixinSlice = FieldsSlice | ContainerSlice | SlottedSlice;

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
  captureItem(item: unknown, placement: Placement): ContentEntry;
  /** Compose the full per-mixin `state` map for a Stuff (recursion base). */
  captureState(item: unknown): Record<string, MixinSlice>;
  /**
   * The index of `item` in the current host's captured container order
   * (the shared ordering the Container and Slotted slices both reference),
   * or -1 when the host holds no such item. Lets the Slotted slice name a
   * worn item by position without a second capture.
   */
  indexOf(item: unknown): number;
}

/**
 * The recursion seam a `restoreSlice` hook uses to reconstitute item state
 * through the gated clone path without importing `PersistableLogic`.
 */
export interface RestoreContext {
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
}
