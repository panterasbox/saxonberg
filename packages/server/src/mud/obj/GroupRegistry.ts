/**
 * GroupRegistry — singleton Idea holding the GroupProvider table.
 *
 * Mirrors `EventRegistry`'s shape (registries hold code, in contrast
 * to catalogues which hold data — see naming convention in the build
 * plan). Each `GroupProvider` is a code-shaped handler; the registry
 * dispatches `membersOf(ref)` etc. by stripping the `source:` prefix
 * and routing to the matching provider.
 *
 * Providers are registered at `postRegister` time — the three v1
 * shapes (managed, mql, contacts) instantiate together. New providers
 * (future) register through `register(provider)`.
 *
 * Not a persisted record. Seed YAML is `{ class: /obj/GroupRegistry,
 * data: {} }`.
 */

import { Idea } from '../lib/stuff/Idea';
import { PostRegistrationMixin } from '../lib/stuff/PostRegistration';
import { parseGroupRef, type GroupProvider, type GroupRef, type GroupChangeHandle, type GroupChangeListener } from '../lib/social/GroupProvider';
import { ManagedGroupProvider } from '../lib/social/providers/ManagedGroupProvider';
import { MqlGroupProvider } from '../lib/social/providers/MqlGroupProvider';
import { ContactsGroupProvider } from '../lib/social/providers/ContactsGroupProvider';
import { ChannelGroupProvider } from '../lib/social/providers/ChannelGroupProvider';
import type { Stuff } from '../lib/stuff/Stuff';
import type { GroupRole } from '../lib/social/Group';
import { PlayerApi } from '../api/player';
import type { VetoResult } from '../lib/errors';

const GroupRegistryBase = PostRegistrationMixin(Idea);

export class GroupRegistry extends GroupRegistryBase {
  /** Provider source → provider instance. */
  private providers: Map<string, GroupProvider> = new Map();

  /** Managed-provider instance — public for the controller-side surfaces that need to write through it. */
  private managedRef: ManagedGroupProvider | null = null;
  /** Contacts-provider instance — exposed so the contacts controller can fire change notifications. */
  private contactsRef: ContactsGroupProvider | null = null;
  /** Channel-provider instance — exposed so ChannelCatalogue can fire change notifications. */
  private channelRef: ChannelGroupProvider | null = null;

  public override async postRegister(_context?: unknown): Promise<void> {
    const managed = new ManagedGroupProvider();
    const mql = new MqlGroupProvider();
    const contacts = new ContactsGroupProvider();
    const channel = new ChannelGroupProvider();
    this.providers.set(managed.source, managed);
    this.providers.set(mql.source, mql);
    this.providers.set(contacts.source, contacts);
    this.providers.set(channel.source, channel);
    this.managedRef = managed;
    this.contactsRef = contacts;
    this.channelRef = channel;
  }

  public register(provider: GroupProvider): void {
    this.providers.set(provider.source, provider);
  }

  public async membersOf(ref: GroupRef): Promise<Stuff[]> {
    const { source, id } = parseGroupRef(ref);
    const provider = this.providers.get(source);
    if (!provider) {
      throw new Error(`GroupRegistry: no provider for source '${source}'`);
    }
    return provider.members(id);
  }

  public async roleOf(
    playerId: string,
    ref: GroupRef,
  ): Promise<GroupRole | null> {
    const { source, id } = parseGroupRef(ref);
    const provider = this.providers.get(source);
    if (!provider) return null;
    if (provider.roleOf) {
      return provider.roleOf(playerId, id);
    }
    // Default: not a role-bearing provider — return `'member'` if
    // membership exists, else null. Narrow each Stuff via the
    // PlayerApi predicate rather than duck-typing the `getPlayerId`
    // shape: only Avatars carry playerIds, and the predicate is the
    // canonical identity check.
    const members = await provider.members(id);
    const found = members.some(
      (s) => PlayerApi.isAvatarStuff(s) && s.getPlayerId() === playerId,
    );
    return found ? 'member' : null;
  }

  public async isMember(
    playerId: string,
    ref: GroupRef,
  ): Promise<boolean> {
    const { source, id } = parseGroupRef(ref);
    const provider = this.providers.get(source);
    if (!provider) return false;
    if (provider.isMember) return provider.isMember(playerId, id);
    return (await this.roleOf(playerId, ref)) !== null;
  }

  public onMembershipChange(
    ref: GroupRef,
    cb: GroupChangeListener,
  ): GroupChangeHandle {
    const { source, id } = parseGroupRef(ref);
    const provider = this.providers.get(source);
    if (!provider || !provider.onChange) {
      return { cancel: () => undefined };
    }
    return provider.onChange(id, cb);
  }

  /** Internal — managed-provider reference for the controller-side write surface. */
  public managed(): ManagedGroupProvider {
    if (!this.managedRef) {
      throw new Error('GroupRegistry: not yet initialized');
    }
    return this.managedRef;
  }

  /** Internal — contacts-provider reference for `ContactsController.fireChange`. */
  public contacts(): ContactsGroupProvider {
    if (!this.contactsRef) {
      throw new Error('GroupRegistry: not yet initialized');
    }
    return this.contactsRef;
  }

  /** Internal — channel-provider reference for `ChannelCatalogue.fireMembershipChange`. */
  public channel(): ChannelGroupProvider {
    if (!this.channelRef) {
      throw new Error('GroupRegistry: not yet initialized');
    }
    return this.channelRef;
  }

  public canDestruct(): VetoResult {
    return {
      ok: false,
      reason:
        'GroupRegistry is a system singleton and cannot be destructed; ' +
        'use forceDestruct (admin-gated) if you really mean it',
    };
  }
}
