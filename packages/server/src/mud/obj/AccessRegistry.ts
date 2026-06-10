/**
 * AccessRegistry — singleton Idea holding the access-substrate state
 * and behavior. Lives at `/obj/AccessRegistry`, sibling to
 * `GroupRegistry`, `SoulCatalogue`, and the other singleton catalogues
 * under `obj/`. The thin `AccessApi` facade at `api/access.ts` is the
 * only legitimate caller — every public method on this class carries
 * `@CallSecurity(FromModule('mud/api/access#AccessApi'))` so the
 * security gate denies any other module's call. External code that
 * grabs the Registry instance via `StuffApi.findByTemplatePath` gets a
 * reference but `SecurityError` thrown on any method call.
 *
 * The narrow-entry pattern is applied here too: state has one home
 * (this Stuff), one calling surface (`AccessApi`), and one
 * structurally-enforced path between them.
 *
 * `postRegister` runs idempotent bootstrap seeding: mint the three
 * groups (`'core'`, `'lounge'`, `'developers'`) if absent and stamp
 * the lounge FolderZones at `/lib/lounge` and `/domain/lounge`. Caches
 * (cached GroupRefs, developer playerId Set, author-groups list) warm
 * lazily on first read and live as instance fields — reload of
 * `api/access.ts` doesn't affect them; reload of this file re-clones
 * the Registry per HotReloadApi's pattern (state resets and
 * `postRegister` re-runs idempotently).
 */

import { Idea } from '../lib/stuff/Idea';
import { PostRegistrationMixin } from '../lib/stuff/PostRegistration';
import { CallSecurity } from '../lib/security/decorators';
import { SecurityPolicies } from '../lib/security/SecurityPolicies';
import { GroupApi } from '../api/group';
import { ZoneApi } from '../api/zone';
import { StuffApi } from '../api/stuff';
import { TemplateApi } from '../api/template';
import { Template } from '../lib/stuff/Template';
import PersistentHydrator from '../lib/persistence/PersistentHydrator';
import { Group, type GroupRole } from '../lib/social/Group';
import type { GroupRef } from '../lib/social/GroupProvider';
import type { Stuff } from '../lib/stuff/Stuff';
import { Zone } from '../lib/zone/Zone';
import FolderZone from '../lib/zone/FolderZone';
import Avatar from './Avatar';

const AccessRegistryBase = PostRegistrationMixin(Idea);

const AccessApiCallers = SecurityPolicies.FromModule(
  'mud/api/access#AccessApi',
);

const FOLDER_ZONE_CLASS = '/lib/zone/FolderZone';

const LOUNGE_FOLDER_PATHS = ['/lib/lounge', '/domain/lounge'] as const;

export default class AccessRegistry extends AccessRegistryBase {
  /** Cached GroupRef for `'core'`. Resolved lazily; survives the
   *  api/access.ts reload because it lives on the Stuff. */
  private cachedCoreRef: GroupRef | null = null;
  private cachedLoungeRef: GroupRef | null = null;
  private cachedDevelopersRef: GroupRef | null = null;
  /** Set of playerIds in `'developers'` — warmed lazily, invalidated
   *  via the managed provider's onChange callback. */
  private cachedDeveloperPlayerIds: ReadonlySet<string> | null = null;
  /** Cancellation handle for the developer onChange subscription. */
  private developerCacheCancel: (() => void) | null = null;
  /** Set of GroupRefs that count as "author scope" — every group
   *  referenced by some Zone's `ownerGroup` or `accessGroups`, plus
   *  `'core'`. Warmed lazily on first `isAuthor` read. */
  private cachedAuthorGroups: readonly GroupRef[] | null = null;

  public override async postRegister(_context?: unknown): Promise<void> {
    await this.seedCoreGroup();
    await this.seedLoungeSlice();
    await this.seedDevelopersGroup();
  }

  /**
   * Resource-targeted slice walk. Returns true iff `subject` is in
   * any of the groups owning the resource's zone-tree slice.
   *
   * Walk: from `resource.getZone()` upward via
   * `ZoneApi.getEnclosingZone`, collecting the closest stamped
   * `ownerGroup` AND every `accessGroups` entry along the way. If
   * the walk finds no owners, fall back to the universal `'core'`
   * group.
   *
   * Action is a free string — this build does not filter ownership by
   * action. Role differentiation lives in `canMutateZone()`.
   */
  @CallSecurity(AccessApiCallers)
  public async can(
    subject: Stuff | null,
    _action: string,
    resource: Stuff | null,
  ): Promise<boolean> {
    if (subject === null) return false;
    const playerId = this.playerIdOf(subject);
    if (playerId === null) return false;

    const permittedGroups: GroupRef[] = [];
    let zone: Zone | null = this.zoneOf(resource);
    while (zone !== null) {
      const owner = zone.getOwnerGroup();
      if (owner) permittedGroups.push(owner);
      const access = zone.getAccessGroups();
      if (access) permittedGroups.push(...access);
      zone = await ZoneApi.getEnclosingZone(zone);
    }
    if (permittedGroups.length === 0) {
      const coreRef = await this.resolveCoreRef();
      if (coreRef) permittedGroups.push(coreRef);
    }
    for (const ref of permittedGroups) {
      if (await GroupApi.isMember(playerId, ref)) return true;
    }
    return false;
  }

  /**
   * Role-gated check used when the target IS a Zone Template
   * (transfer ownership, mutate `accessGroups`, destruct the slice).
   * Requires `'owner'` role in the zone's primary (closest)
   * `ownerGroup`. `'admin'` / `'member'` roles and members of
   * secondary `accessGroups` are not authorized for zone-mutation
   * ops in this build.
   */
  @CallSecurity(AccessApiCallers)
  public async canMutateZone(
    subject: Stuff | null,
    zone: Stuff,
  ): Promise<boolean> {
    if (subject === null) return false;
    if (!(zone instanceof Zone)) return false;
    const playerId = this.playerIdOf(subject);
    if (playerId === null) return false;
    let z: Zone | null = zone;
    let primary: GroupRef | undefined;
    while (z !== null && primary === undefined) {
      primary = z.getOwnerGroup();
      if (primary === undefined) {
        z = await ZoneApi.getEnclosingZone(z);
      }
    }
    if (primary === undefined) {
      const coreRef = await this.resolveCoreRef();
      if (coreRef) primary = coreRef;
    }
    if (primary === undefined) return false;
    const role: GroupRole | null = await GroupApi.roleOf(playerId, primary);
    return role === 'owner';
  }

  /**
   * Broad "is the actor a member of any group with content scope?"
   * used by MQL pre-gates that can't be resource-targeted. True for
   * any Avatar whose playerId is in `'core'` or any Group that's
   * stamped as a Zone's `ownerGroup` / `accessGroups` anywhere in
   * the tree.
   */
  @CallSecurity(AccessApiCallers)
  public async isAuthor(subject: Stuff | null): Promise<boolean> {
    if (subject === null) return false;
    const playerId = this.playerIdOf(subject);
    if (playerId === null) return false;
    const groups = await this.ensureAuthorGroups();
    for (const ref of groups) {
      if (await GroupApi.isMember(playerId, ref)) return true;
    }
    return false;
  }

  /**
   * Orthogonal developer axis — is the actor in `'developers'`?
   * Determines who can write TypeScript source, run `eval`, or
   * `reload` modules. Doesn't matter what slices they own; the
   * question is whether they have escape capability.
   */
  @CallSecurity(AccessApiCallers)
  public async isDeveloper(subject: Stuff | null): Promise<boolean> {
    if (subject === null) return false;
    const playerId = this.playerIdOf(subject);
    if (playerId === null) return false;
    const cache = await this.ensureDeveloperCache();
    return cache.has(playerId);
  }

  /**
   * Walk a source-tree path against the template tree
   * most-specific-first, returning the closest extant FolderZone
   * instance. Used by workspace controllers in source/mirror mode to
   * compute the resource zone before calling `can()`.
   *
   * `lib/lounge/foo.ts` → tries `/lib/lounge/foo` (no match) → walks
   * up to `/lib/lounge` (match, extant FolderZone) → returns it.
   * `lib/security/SecurityPolicies.ts` → walks up → no FolderZone
   * match → returns `null` (caller falls through to `'core'`).
   */
  @CallSecurity(AccessApiCallers)
  public async resolveSourceFolderZone(
    sourcePath: string,
  ): Promise<Stuff | null> {
    let candidate = sourcePath.replace(/^\.\//, '').replace(/\/+$/, '');
    if (!candidate.startsWith('/')) candidate = '/' + candidate;
    while (candidate.length > 0 && candidate !== '/') {
      const tpl = await Template.findByPath(candidate);
      if (tpl && (await ZoneApi.isFolderClass(tpl.class))) {
        try {
          const cloned = await StuffApi.singleton<Stuff>(candidate);
          if (cloned instanceof FolderZone) return cloned;
        } catch {
          // Singleton resolution failure (template missing, class
          // import broken, etc.) treats this candidate as not
          // matching. Walk further up.
        }
      }
      const lastSlash = candidate.lastIndexOf('/');
      if (lastSlash <= 0) break;
      candidate = candidate.slice(0, lastSlash);
    }
    return null;
  }

  // ── Private helpers ──

  private playerIdOf(subject: Stuff): string | null {
    if (subject instanceof Avatar) {
      const id = subject.getPlayerId();
      return id && id.length > 0 ? id : null;
    }
    return null;
  }

  private zoneOf(resource: Stuff | null): Zone | null {
    if (resource === null) return null;
    if (resource instanceof Zone) return resource;
    return resource.getZone();
  }

  private async resolveCoreRef(): Promise<GroupRef | null> {
    if (this.cachedCoreRef) return this.cachedCoreRef;
    const reg = await GroupApi.registry();
    const core = await reg.managed().findByName('core');
    if (!core || !core._id) return null;
    this.cachedCoreRef = `managed:${core._id}`;
    return this.cachedCoreRef;
  }

  private async ensureAuthorGroups(): Promise<readonly GroupRef[]> {
    if (this.cachedAuthorGroups) return this.cachedAuthorGroups;
    const refs = new Set<GroupRef>();
    const allTemplates = await Template.findDescendants('/');
    for (const t of allTemplates) {
      if (!(await ZoneApi.isFolderClass(t.class))) continue;
      const owner = t.data?.ownerGroup as GroupRef | undefined;
      if (owner) refs.add(owner);
      const access = t.data?.accessGroups as readonly GroupRef[] | undefined;
      if (access) for (const r of access) refs.add(r);
    }
    const coreRef = await this.resolveCoreRef();
    if (coreRef) refs.add(coreRef);
    const list = [...refs];
    this.cachedAuthorGroups = list;
    return list;
  }

  private async ensureDeveloperCache(): Promise<ReadonlySet<string>> {
    if (this.cachedDeveloperPlayerIds) return this.cachedDeveloperPlayerIds;
    const reg = await GroupApi.registry();
    const provider = reg.managed();
    const dev = await provider.findByName('developers');
    if (!dev || !dev._id) {
      this.cachedDeveloperPlayerIds = new Set();
      return this.cachedDeveloperPlayerIds;
    }
    this.cachedDevelopersRef = `managed:${dev._id}`;
    const cache = new Set(dev.memberIds);
    this.cachedDeveloperPlayerIds = cache;
    this.developerCacheCancel?.();
    const handle = provider.onChange?.(dev._id, () => {
      this.cachedDeveloperPlayerIds = null;
    });
    this.developerCacheCancel = handle?.cancel ?? null;
    return cache;
  }

  // ── Seeding (idempotent; called from postRegister) ──

  private async seedCoreGroup(): Promise<void> {
    const reg = await GroupApi.registry();
    const provider = reg.managed();
    const existing = await provider.findByName('core');
    if (existing && existing._id) {
      this.cachedCoreRef = `managed:${existing._id}`;
      return;
    }
    const g = new Group();
    g.name = 'core';
    g.owner = 'system';
    await g.save();
    if (g._id) this.cachedCoreRef = `managed:${g._id}`;
  }

  private async seedLoungeSlice(): Promise<void> {
    const reg = await GroupApi.registry();
    const provider = reg.managed();
    let lounge = await provider.findByName('lounge');
    if (!lounge) {
      const g = new Group();
      g.name = 'lounge';
      g.owner = 'system';
      await g.save();
      lounge = g;
    }
    if (!lounge._id) return;
    const loungeRef: GroupRef = `managed:${lounge._id}`;
    this.cachedLoungeRef = loungeRef;
    for (const path of LOUNGE_FOLDER_PATHS) {
      const existing = await Template.findByPath(path);
      if (existing) {
        // Only stamp the ownerGroup when missing — never overwrite an
        // existing owner. Idempotent.
        if (!existing.data?.ownerGroup) {
          existing.data = { ...existing.data, ownerGroup: loungeRef };
          await existing.save();
        }
        continue;
      }
      await TemplateApi.saveTemplate(
        path,
        FOLDER_ZONE_CLASS,
        { ownerGroup: loungeRef },
        PersistentHydrator.templatePath,
      );
    }
  }

  private async seedDevelopersGroup(): Promise<void> {
    const reg = await GroupApi.registry();
    const provider = reg.managed();
    const existing = await provider.findByName('developers');
    if (existing && existing._id) {
      this.cachedDevelopersRef = `managed:${existing._id}`;
      return;
    }
    const g = new Group();
    g.name = 'developers';
    g.owner = 'system';
    await g.save();
    if (g._id) this.cachedDevelopersRef = `managed:${g._id}`;
  }

  public override onDestruct(): void {
    this.developerCacheCancel?.();
    this.developerCacheCancel = null;
    super.onDestruct();
  }
}

