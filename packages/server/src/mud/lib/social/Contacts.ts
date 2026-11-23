/**
 * ContactsMixin — per-Avatar named lists of other players / NPCs.
 *
 * The prototypical model-B GroupProvider source: membership is a facet
 * of an Avatar (the owner), not a primary entity with members. v1
 * surface: flat `Set` (concretely stored as `ContactEntry[]`) of
 * durable identifiers, with labels as derived views ("friends" /
 * "study-group" / "ignore" — just a string field on each entry).
 *
 * NOT for: persistent group membership independent of any one Avatar
 * (use the managed provider via `Group` Document); query-driven
 * membership (use the MQL provider); anything multi-character that
 * would need to be visible across the owner's siblings.
 *
 * Storage rule: entries are durable identifiers ONLY — `playerId` for
 * Avatars, `templatePath` for NPCs. The multi-character expansion
 * implied by "contacts add iffy friend" happens at the controller layer
 * (one entry per playerId of the resolved User). The "User" concept
 * never appears in the persisted shape.
 *
 * Privacy: members-of/role-of reads are owner-only — see
 * `ContactsGroupProvider.members`. Per-list visibility tuning is a
 * future refinement.
 *
 * ⭐ **The managed groups you belong to answer here too** (naming overhaul
 * D-B11, folded in review): a contact list and a group are both named
 * sets of people a person keeps, so both are relations of you (`~friends`,
 * `~bookclub`) through one contributor. The groups are a RESIDENT READ of
 * the `groups` records — read at session start (`refreshGroups`, from
 * `Avatar.enter`), kept current by each group's change hook, never
 * persisted and never deciding membership (`GroupApi` does). A body whose
 * session never starts (an NPC) holds none.
 */

import type { MixinConstructor, FieldMeta } from '../mixin';
import type { CommandContributions } from '../../api/command';
import { RelatingMixin, type HeldRelation, type RelatedSet } from '../relation/Relating';
import { StuffApi } from '../../api/stuff';
import type { Stuff } from '../stuff/Stuff';
import { Group } from './Group';
import type { GroupChangeHandle } from './GroupProvider';

/**
 * Per-entry source of provenance. `self` = added by the owner via
 * `contacts add`. The field reserves the future
 * faction-pushed-roster mechanism (e.g., `source: 'guild:gamma'` →
 * the entry is maintained by the guild and the owner can't remove it
 * individually). v1 always writes `'self'`.
 */
export type ContactSource = 'self' | string;

export interface ContactEntryAvatar {
  kind: 'avatar';
  /**
   * playerId of the target Avatar (the durable per-character identifier).
   * Stable across the avatar's name changes, character edits, etc.
   */
  playerId: string;
  label: string;
  source: ContactSource;
  /** ms-since-epoch timestamp captured at add time. */
  addedAt: number;
}

export interface ContactEntryNpc {
  kind: 'npc';
  /**
   * Template path of the target NPC (e.g. `/platform/agent/Gus`). NPCs are
   * runtime clones; the template is the durable identifier.
   */
  templatePath: string;
  label: string;
  source: ContactSource;
  addedAt: number;
}

export type ContactEntry = ContactEntryAvatar | ContactEntryNpc;

/** One managed group as you hold it: its ref, its name and who is in it. */
export interface ResidentGroup {
  ref: string;
  name: string;
  memberIds: readonly string[];
}

export interface Contacts {
  /** Re-read the managed groups this person belongs to (and listen to each). */
  refreshGroups(): Promise<void>;
  /** The managed groups this person belongs to, as last read. */
  residentGroups(): readonly ResidentGroup[];
  /** Append a contact entry. Duplicates (same kind+ref+label) are no-ops. */
  addContact(entry: ContactEntry): boolean;
  /**
   * Remove a contact entry by ref+label. Returns true if anything was
   * removed. For avatar entries, ref = playerId; for npc entries, ref
   * = templatePath.
   */
  removeContact(kind: ContactEntry['kind'], ref: string, label: string): boolean;
  /** Read entries filtered by label. Empty array when label has no entries. */
  contactsByLabel(label: string): readonly ContactEntry[];
  /** Distinct labels used by the owner. Sorted. */
  contactLabels(): string[];
  /** Bulk-remove every entry of the given label. Returns count removed. */
  clearContactLabel(label: string): number;
  /**
   * Rename every entry of `oldLabel` to `newLabel`. Returns count
   * relabeled. No-op if no entries have `oldLabel`.
   */
  renameContactLabel(oldLabel: string, newLabel: string): number;
  /** All stored entries (read-only snapshot). */
  allContacts(): readonly ContactEntry[];
}

export function ContactsMixin<TBase extends MixinConstructor>(Base: TBase) {
  return class ContactsMixin extends RelatingMixin(Base) implements Contacts {
    static _mixinName = 'ContactsMixin';

    /**
     * The hydrator round-trips `_contacts` by reflection. Entries are
     * structured objects (kind / ref-field / label / source / addedAt)
     * stored as plain JSON; this departs from the "scalars only"
     * default but mirrors the precedent set by `AliasMixin.aliases`
     * (a `Record<string, string|null>` stored directly). When richer
     * per-entry state appears, the upgrade path is a marshaller-backed
     * `Set<ContactEntry>` runtime.
     */
    static fieldMeta: FieldMeta = {
      _contacts: { persistent: true, runtimeState: true },
    };

    static commandContributions: CommandContributions = {
      // `group` rides alongside `contacts` here: both are personal-
      // list management verbs an animate Contacts-bearing being uses
      // to organize who-they-know. ContactsMixin is composed on every
      // Avatar, so this exposes `group` everywhere `contacts` is
      // exposed. NPCs that compose ContactsMixin in their own content
      // gain both verbs uniformly.
      self: ['platform/cmd/social/contacts.yaml', 'platform/cmd/social/group.yaml'],
      peers: [],
      environment: [],
    };

    /**
     * Persistent storage. Default `[]` matches the Alias.aliases
     * legacy-tolerant pattern — existing avatar docs without the
     * field hydrate cleanly.
     */
    _contacts: ContactEntry[] = [];

    addContact(entry: ContactEntry): boolean {
      const ref = refOf(entry);
      const exists = this._contacts.some(
        (e) =>
          e.kind === entry.kind &&
          refOf(e) === ref &&
          e.label === entry.label,
      );
      if (exists) return false;
      this._contacts.push(entry);
      return true;
    }

    /* ── fork/merge slice (sandbox Decision Q; epistemic) ──
     * Fork: the current list travels so `dm <friend>` resolves inside a
     * projection. Merge: entries the fork gained (people met in-circle)
     * union back — knowledge is identity-real; duplicates dedup via the
     * ordinary addContact guard. */

    forkSlice_Contacts(): unknown {
      return this._contacts.map((e) => ({ ...e }));
    }

    mergeSlice_Contacts(slice: unknown): void {
      if (!Array.isArray(slice)) return;
      for (const entry of slice as ContactEntry[]) {
        if (!entry || typeof entry !== 'object') continue;
        this.addContact({ ...entry });
      }
    }

    removeContact(
      kind: ContactEntry['kind'],
      ref: string,
      label: string,
    ): boolean {
      const before = this._contacts.length;
      this._contacts = this._contacts.filter(
        (e) => !(e.kind === kind && refOf(e) === ref && e.label === label),
      );
      return this._contacts.length < before;
    }

    contactsByLabel(label: string): readonly ContactEntry[] {
      return this._contacts.filter((e) => e.label === label);
    }

    contactLabels(): string[] {
      const set = new Set<string>();
      for (const e of this._contacts) set.add(e.label);
      return [...set].sort();
    }

    clearContactLabel(label: string): number {
      const before = this._contacts.length;
      this._contacts = this._contacts.filter((e) => e.label !== label);
      return before - this._contacts.length;
    }

    renameContactLabel(oldLabel: string, newLabel: string): number {
      let n = 0;
      for (const e of this._contacts) {
        if (e.label === oldLabel) {
          e.label = newLabel;
          n++;
        }
      }
      return n;
    }

    allContacts(): readonly ContactEntry[] {
      return this._contacts;
    }

    /* ── the managed groups you belong to, resident (D-B11) ── */

    /** The groups as last read — transient, never captured. */
    private _groups: ResidentGroup[] = [];
    /** One change subscription per group held. */
    private _groupHandles: GroupChangeHandle[] = [];

    public residentGroups(): readonly ResidentGroup[] {
      return this._groups;
    }

    public async refreshGroups(): Promise<void> {
      const self = this as unknown as Stuff;
      const identity = self.getIdentityPath() ?? '';
      const playerId = identity.split('/').filter(Boolean).pop() ?? '';
      if (identity === '') return;
      const rows = await Group.find<Group>({ memberIds: { $in: [identity, playerId] } });
      this._groups = rows
        .filter((g) => g._id !== undefined)
        .map((g) => ({ ref: `managed:${g._id}`, name: g.name, memberIds: [...g.memberIds] }));
      for (const h of this._groupHandles) h.cancel();
      // Lazy: the Api reaches this mixin's host; a static import cycles.
      const { GroupApi } = await import('../../api/group');
      this._groupHandles = await Promise.all(
        this._groups.map((g) =>
          GroupApi.onMembershipChange(g.ref as never, () => {
            void this.refreshGroups().catch((err: unknown) =>
              console.warn(`ContactsMixin: could not re-read groups for ${identity}`, err),
            );
          }),
        ),
      );
    }

    /** Stop listening to every group — the body is going. */
    public onDestruct(): void {
      for (const h of this._groupHandles) h.cancel();
      this._groupHandles = [];
      super.onDestruct();
    }

    /* ── relations (naming overhaul D-B5): each list and each group is `~<name>`, owner-only ── */

    /** ⭐ Your lists and your groups, each a relation — to you only. */
    public relationsFor(asker: Stuff | null): HeldRelation[] {
      const mine =
        asker === (this as unknown as Stuff)
          ? [
              ...this.contactLabels().map((label) => ({ name: label, meaning: `your list "${label}"` })),
              ...this._groups.map((g) => ({ name: g.name, meaning: `your group "${g.name}"` })),
            ]
          : [];
      return [...mine, ...super.relationsFor(asker)];
    }

    /** The people on the list named `name` who are in the world (to you only). */
    public relatedBy(name: string, asker: Stuff | null): RelatedSet[] {
      const below = super.relatedBy(name, asker);
      if (asker !== (this as unknown as Stuff)) return below;
      const sets: RelatedSet[] = [];
      const entries = this.contactsByLabel(name);
      if (entries.length > 0) {
        const ids = entries.map((e) => (e.kind === 'avatar' ? `${AVATAR_IDENTITY_ROOT}/${e.playerId}` : e.templatePath));
        sets.push({ name, meaning: `your list "${name}"`, members: residentOf(ids) });
      }
      const group = this._groups.find((g) => g.name === name);
      if (group !== undefined) {
        const ids = group.memberIds.map((id) => (id.startsWith('/') ? id : `${AVATAR_IDENTITY_ROOT}/${id}`));
        sets.push({ name, meaning: `your group "${name}"`, members: residentOf(ids) });
      }
      return [...sets, ...below];
    }

    /**
     * A list's durable group ref (`contacts:<you>:<label>`) — what `notify`
     * stores. `friends` and `foes` are reserved lists and stand even empty.
     */
    public groupRefOf(name: string, asker: Stuff | null): string | null {
      const self = this as unknown as Stuff;
      if (asker === self && (this.contactsByLabel(name).length > 0 || name === 'friends' || name === 'foes')) {
        const playerId = self.getPlayerId();
        if (playerId) return `contacts:${playerId}:${name}`;
      }
      if (asker === self) {
        const group = this._groups.find((g) => g.name === name);
        if (group !== undefined) return group.ref;
      }
      return super.groupRefOf(name, asker);
    }
  };
}

/** The player-avatar identity family a contact's `playerId` keys under (D17). */
const AVATAR_IDENTITY_ROOT = '/platform/agent/Avatar';

/** The bodies in the world for these identity paths, each once (an absent one is skipped). */
function residentOf(ids: readonly string[]): Stuff[] {
  const out: Stuff[] = [];
  for (const id of ids) {
    const s = StuffApi.findByIdentityPath(id)[0];
    if (s !== undefined && !out.includes(s)) out.push(s);
  }
  return out;
}

function refOf(e: ContactEntry): string {
  return e.kind === 'avatar' ? e.playerId : e.templatePath;
}
