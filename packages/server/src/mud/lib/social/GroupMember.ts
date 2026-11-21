/**
 * GroupMemberMixin — **the managed groups this person belongs to,
 * resident** (naming overhaul D-B11; mql-anchors § 20). The person-side
 * twin of `PartyMemberMixin`.
 *
 * A group you belong to answers as a relation of you — `~bookclub:iffy`
 * binds Iffy when she is a fellow member and in the world — synchronously,
 * as every relation must. So the membership is read ONCE, when the body's
 * session starts (`refreshGroups`, from `Avatar.enter`), and kept current:
 * each group's own change hook re-reads it, and the paths that ADD you to
 * a group you were not yet listening to refresh you directly.
 *
 * ⚠ Not a second membership store: it holds nothing the `groups` records
 * do not, is never persisted (`runtimeState` would be wrong — there is no
 * field to capture at all), and is rebuilt at every session start. It
 * never decides membership; `GroupApi` does.
 *
 * Only the avatar family composes it — NPCs join no managed group. An
 * avatar in none holds an empty map, the same shape as a player in no
 * party.
 */

import type { MixinConstructor } from '../mixin';
import { Mixins } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import { StuffApi } from '../../api/stuff';
import { RelatingMixin, type HeldRelation, type RelatedSet } from '../relation/Relating';
import { Group } from './Group';
import type { GroupChangeHandle } from './GroupProvider';

/** One group as you hold it: its ref, its name and who is in it. */
export interface ResidentGroup {
  ref: string;
  name: string;
  memberIds: readonly string[];
}

export interface GroupMember {
  /** Re-read the groups this person belongs to (and listen to each). */
  refreshGroups(): Promise<void>;
  /** The groups this person belongs to, as last read. */
  residentGroups(): readonly ResidentGroup[];
}

/** The player-avatar identity family a roster's bare player id keys under. */
const AVATAR_IDENTITY_ROOT = '/platform/agent/Avatar';

export function GroupMemberMixin<TBase extends MixinConstructor>(Base: TBase) {
  return class GroupMemberMixin extends RelatingMixin(Base) implements GroupMember {
    static _mixinName: string = Mixins.GroupMember;

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
              console.warn(`GroupMemberMixin: could not re-read groups for ${identity}`, err),
            );
          }),
        ),
      );
    }

    /** ⭐ Each group you belong to is a relation of you (to you only). */
    public relationsFor(asker: Stuff | null): HeldRelation[] {
      const mine =
        asker === (this as unknown as Stuff)
          ? this._groups.map((g) => ({ name: g.name, meaning: `your group "${g.name}"` }))
          : [];
      return [...mine, ...super.relationsFor(asker)];
    }

    /** The fellow members of the group named `name` who are in the world. */
    public relatedBy(name: string, asker: Stuff | null): RelatedSet[] {
      const below = super.relatedBy(name, asker);
      if (asker !== (this as unknown as Stuff)) return below;
      const group = this._groups.find((g) => g.name === name);
      if (group === undefined) return below;
      const members: Stuff[] = [];
      for (const id of group.memberIds) {
        const s = StuffApi.findByIdentityPath(id.startsWith('/') ? id : `${AVATAR_IDENTITY_ROOT}/${id}`)[0];
        if (s !== undefined && !members.includes(s)) members.push(s);
      }
      return [...below, { name, meaning: `your group "${name}"`, members }];
    }

    /** A group's durable ref (`managed:<id>`), for `notify`. */
    public groupRefOf(name: string, asker: Stuff | null): string | null {
      if (asker === (this as unknown as Stuff)) {
        const group = this._groups.find((g) => g.name === name);
        if (group !== undefined) return group.ref;
      }
      return super.groupRefOf(name, asker);
    }

    /** Stop listening to every group — the body is going. */
    public onDestruct(): void {
      for (const h of this._groupHandles) h.cancel();
      this._groupHandles = [];
      super.onDestruct();
    }
  };
}
