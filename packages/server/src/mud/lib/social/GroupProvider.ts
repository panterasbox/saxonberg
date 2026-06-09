/**
 * GroupProvider — the substrate that lets multiple sources of
 * "membership" share one read surface (`GroupApi`).
 *
 * A `GroupRef` is a typed string `source:id`. The first colon-prefix
 * picks the provider; the rest is the provider's free-form id. v1
 * sources:
 *
 *   - `managed` — writable, persistent `Group` Documents.
 *   - `mql` — read-only, query-driven (`mql:species:khazadicus and online`).
 *   - `contacts` — model-B per-Avatar (`contacts:<ownerId>:<label>`).
 *
 * Providers register themselves with `GroupRegistry` at boot. The
 * registry's `membersOf` etc. delegate to the matching provider's
 * `members(id)` after stripping the `source:` prefix.
 *
 * NOT for: arbitrary cross-cutting permission gates. Provider methods
 * speak in `Stuff` and `playerId`; they don't read or write actor
 * state directly — the caller (GroupApi) is the only public-facing
 * surface and Apis pass through `SecurityApi.decorateApiClass`.
 */

import type { Stuff } from '../stuff/Stuff';
import type { GroupRole } from './Group';

/**
 * `source:id` string with the source as the first colon-delimited
 * segment. Examples:
 *   - `'managed:<groupDocumentId>'`
 *   - `'mql:species:khazadicus'`
 *   - `'contacts:<ownerPlayerId>:friend'`
 */
export type GroupRef = string;

/**
 * Listener handle returned by `onChange`. Calling `cancel()` removes
 * the listener.
 */
export interface GroupChangeHandle {
  cancel(): void;
}

export type GroupChangeListener = () => void;

/**
 * Provider contract. Concrete providers in `lib/social/providers/`.
 *
 * The split: `members` is the canonical read; `roleOf` / `isMember`
 * are optional fast-path predicates (default = derived from
 * `members`); `onChange` is best-effort live notification.
 *
 * Writable providers add `add` / `remove` / `setRole` / `create` /
 * `destroy` on top — the managed provider has them; mql / contacts
 * don't.
 */
export interface GroupProvider {
  /** First colon-prefix of the GroupRef this provider handles. */
  readonly source: string;
  /** Read members. May resolve asynchronously (e.g., live Avatar lookups). */
  members(id: string): Promise<Stuff[]>;
  roleOf?(playerId: string, id: string): Promise<GroupRole | null>;
  isMember?(playerId: string, id: string): Promise<boolean>;
  onChange?(id: string, cb: GroupChangeListener): GroupChangeHandle;
}

/**
 * Parse a `GroupRef` into `{ source, id }`. The source is the segment
 * before the first colon; the id is everything after.
 */
export function parseGroupRef(ref: GroupRef): { source: string; id: string } {
  const idx = ref.indexOf(':');
  if (idx < 0) {
    throw new Error(`GroupProvider: malformed ref '${ref}' — expected 'source:id'`);
  }
  return { source: ref.slice(0, idx), id: ref.slice(idx + 1) };
}
