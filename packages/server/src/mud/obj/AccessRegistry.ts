/**
 * AccessRegistry — singleton Idea holding the access-substrate state
 * and behavior. Lives at `/obj/AccessRegistry`, sibling to
 * `GroupRegistry`, `SoulCatalogue`, and the other singleton catalogues
 * under `obj/`. The thin `AccessApi` facade at `api/access.ts` is the
 * only legitimate caller — every public method on this class carries
 * `@CallSecurity(FromModule('api/access#AccessApi'))` so the
 * security gate denies any other module's call. External code that
 * grabs the Registry instance via `StuffApi.findByTemplatePath` gets a
 * reference but `SecurityError` thrown on any method call.
 *
 * The narrow-entry pattern is applied here too: state has one home
 * (this Stuff), one calling surface (`AccessApi`), and one
 * structurally-enforced path between them.
 *
 * `postRegister` runs idempotent bootstrap seeding: mint the
 * groups (`'core'`, `'lounge'`, `'wizards'`, `'streamers'`,
 * `'archwizards'`) if absent and stamp the lounge FolderZones at
 * `/lib/lounge` and `/domain/lounge`. Caches
 * (cached GroupRefs, wizard playerId Set, author-groups list) warm
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
import { TemplatePaths } from '../lib/paths';

const AccessRegistryBase = PostRegistrationMixin(Idea);

// AccessApi's logic now lives in the /obj/api/access logic singleton
// (the Api face is a thin forwarding shell). Admit both the face module
// and the logic singleton's template path so the Registry's methods stay
// callable only through the access subsystem.
const AccessApiCallers = SecurityPolicies.AnyOf(
  SecurityPolicies.FromModule('api/access#AccessApi'),
  SecurityPolicies.FromTemplate('/obj/api/access'),
);

const FOLDER_ZONE_CLASS = TemplatePaths.folderZone;

const LOUNGE_FOLDER_PATHS = ['/lib/lounge', '/domain/lounge'] as const;

export default class AccessRegistry extends AccessRegistryBase {
  /** Cached GroupRef for `'core'`. Resolved lazily; survives the
   *  api/access.ts reload because it lives on the Stuff. */
  private cachedCoreRef: GroupRef | null = null;
  private cachedLoungeRef: GroupRef | null = null;
  private cachedWizardsRef: GroupRef | null = null;
  /** Set of playerIds in `'wizards'` — warmed lazily, invalidated
   *  via the managed provider's onChange callback. */
  private cachedWizardPlayerIds: ReadonlySet<string> | null = null;
  /** Cancellation handle for the wizard onChange subscription. */
  private wizardCacheCancel: (() => void) | null = null;
  private cachedStreamersRef: GroupRef | null = null;
  /** Set of playerIds in `'streamers'` — the livestream-control axis.
   *  Warmed lazily, invalidated via the managed provider's onChange
   *  callback. Mirrors the wizard cache exactly. */
  private cachedStreamerPlayerIds: ReadonlySet<string> | null = null;
  /** Cancellation handle for the streamer onChange subscription. */
  private streamerCacheCancel: (() => void) | null = null;
  private cachedArchwizardsRef: GroupRef | null = null;
  /** Set of playerIds in `'archwizards'` — the wizard-conferral axis.
   *  Archwizards run `wizard grant/revoke`. Warmed lazily, invalidated
   *  via the managed provider's onChange callback. Mirrors the wizard
   *  cache exactly. */
  private cachedArchwizardPlayerIds: ReadonlySet<string> | null = null;
  /** Cancellation handle for the archwizard onChange subscription. */
  private archwizardCacheCancel: (() => void) | null = null;
  /** Set of GroupRefs that count as "author scope" — every group
   *  referenced by some Zone's `ownerGroup` or `accessGroups`, plus
   *  `'core'`. Warmed lazily on first `isAuthor` read. */
  private cachedAuthorGroups: readonly GroupRef[] | null = null;

  public override async postRegister(_context?: unknown): Promise<void> {
    await this.seedCoreGroup();
    await this.seedLoungeSlice();
    await this.seedWizardsGroup();
    await this.seedStreamersGroup();
    await this.seedArchwizardsGroup();
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
   * Orthogonal wizard axis — is the actor in `'wizards'`? This is the
   * code-trust capability: it determines who can write TypeScript
   * source, run `eval`, `reload` modules, AND set the executable
   * code-naming fields (`class` / `hydratorClass` / `behaviors[].brain`)
   * on a content template (see the code-field gate in `TemplateLogic`).
   * Doesn't matter what slices they own; the question is whether they
   * have escape capability. A non-wizard author is a "protowizard" —
   * content-write access without code trust.
   */
  @CallSecurity(AccessApiCallers)
  public async isWizard(subject: Stuff | null): Promise<boolean> {
    if (subject === null) return false;
    const playerId = this.playerIdOf(subject);
    if (playerId === null) return false;
    const cache = await this.ensureWizardCache();
    return cache.has(playerId);
  }

  /**
   * Orthogonal streamer axis — is the actor in `'streamers'`? Gates
   * the livestream control plane (the `stream` verb and, later, the
   * scene / lower-third / afk mutators). Distinct from the wizard
   * axis: a streamer drives the broadcast overlay without necessarily
   * holding TypeScript-escape capability.
   */
  @CallSecurity(AccessApiCallers)
  public async isStreamer(subject: Stuff | null): Promise<boolean> {
    if (subject === null) return false;
    const playerId = this.playerIdOf(subject);
    if (playerId === null) return false;
    const cache = await this.ensureStreamerCache();
    return cache.has(playerId);
  }

  /**
   * Orthogonal archwizard axis — is the actor in `'archwizards'`?
   * Archwizards confer/revoke wizard status (the `wizard grant/revoke`
   * verb, authorized by the `requiresArchwizard` validator). Operator/
   * root-managed for now (env seed + the `group` verb); the Prime
   * Minister office above them is deferred.
   */
  @CallSecurity(AccessApiCallers)
  public async isArchwizard(subject: Stuff | null): Promise<boolean> {
    if (subject === null) return false;
    const playerId = this.playerIdOf(subject);
    if (playerId === null) return false;
    const cache = await this.ensureArchwizardCache();
    return cache.has(playerId);
  }

  /**
   * Narrow-entry mutation: add or remove `playerId` from the `'wizards'`
   * group. Reachable only through `AccessApi.setWizardMembership`, which
   * carries the `FromController(WizardController)` policy — the archwizard
   * authorization itself is enforced by the verb's `requiresArchwizard`
   * validator, not here. Fires `managed().fireChange` so the lazy wizard
   * cache invalidates. Returns true iff membership changed.
   */
  @CallSecurity(AccessApiCallers)
  public async setWizardMembership(
    playerId: string,
    makeWizard: boolean,
  ): Promise<boolean> {
    const id = (playerId ?? '').trim();
    if (id.length === 0) return false;
    const reg = await GroupApi.registry();
    const provider = reg.managed();
    const wizards = await provider.findByName('wizards');
    if (!wizards || !wizards._id) return false;
    const changed = makeWizard
      ? wizards.addMember(id, 'member')
      : wizards.removeMember(id);
    if (changed) {
      await wizards.save();
      provider.fireChange(wizards._id);
      this.cachedWizardPlayerIds = null;
    }
    return changed;
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

  private async ensureWizardCache(): Promise<ReadonlySet<string>> {
    if (this.cachedWizardPlayerIds) return this.cachedWizardPlayerIds;
    const reg = await GroupApi.registry();
    const provider = reg.managed();
    const wiz = await provider.findByName('wizards');
    if (!wiz || !wiz._id) {
      this.cachedWizardPlayerIds = new Set();
      return this.cachedWizardPlayerIds;
    }
    this.cachedWizardsRef = `managed:${wiz._id}`;
    const cache = new Set(wiz.memberIds);
    this.cachedWizardPlayerIds = cache;
    this.wizardCacheCancel?.();
    const handle = provider.onChange?.(wiz._id, () => {
      this.cachedWizardPlayerIds = null;
    });
    this.wizardCacheCancel = handle?.cancel ?? null;
    return cache;
  }

  private async ensureStreamerCache(): Promise<ReadonlySet<string>> {
    if (this.cachedStreamerPlayerIds) return this.cachedStreamerPlayerIds;
    const reg = await GroupApi.registry();
    const provider = reg.managed();
    const streamers = await provider.findByName('streamers');
    if (!streamers || !streamers._id) {
      this.cachedStreamerPlayerIds = new Set();
      return this.cachedStreamerPlayerIds;
    }
    this.cachedStreamersRef = `managed:${streamers._id}`;
    const cache = new Set(streamers.memberIds);
    this.cachedStreamerPlayerIds = cache;
    this.streamerCacheCancel?.();
    const handle = provider.onChange?.(streamers._id, () => {
      this.cachedStreamerPlayerIds = null;
    });
    this.streamerCacheCancel = handle?.cancel ?? null;
    return cache;
  }

  private async ensureArchwizardCache(): Promise<ReadonlySet<string>> {
    if (this.cachedArchwizardPlayerIds) return this.cachedArchwizardPlayerIds;
    const reg = await GroupApi.registry();
    const provider = reg.managed();
    const arch = await provider.findByName('archwizards');
    if (!arch || !arch._id) {
      this.cachedArchwizardPlayerIds = new Set();
      return this.cachedArchwizardPlayerIds;
    }
    this.cachedArchwizardsRef = `managed:${arch._id}`;
    const cache = new Set(arch.memberIds);
    this.cachedArchwizardPlayerIds = cache;
    this.archwizardCacheCancel?.();
    const handle = provider.onChange?.(arch._id, () => {
      this.cachedArchwizardPlayerIds = null;
    });
    this.archwizardCacheCancel = handle?.cancel ?? null;
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

  private async seedWizardsGroup(): Promise<void> {
    const reg = await GroupApi.registry();
    const provider = reg.managed();
    let wizards = await provider.findByName('wizards');
    if (!wizards) {
      // One-time migration (wizard-authority): the code-trust axis was
      // renamed `developers` → `wizards`. The SeederManager is
      // insert-only and this group is seeded here (not a seed YAML), so
      // a fresh mint would strand the legacy `developers` doc and its
      // members. Rename the existing doc forward so its `_id`,
      // `memberIds`, and `memberRoles` carry over verbatim. Re-running
      // against an already-migrated DB is a no-op (`wizards` already
      // exists; `developers` is gone).
      const legacy = await provider.findByName('developers');
      if (legacy) {
        legacy.name = 'wizards';
        await legacy.save();
        console.info(
          '[AccessRegistry] migrated legacy `developers` group → `wizards`',
        );
        wizards = legacy;
      } else {
        const g = new Group();
        g.name = 'wizards';
        g.owner = 'system';
        await g.save();
        wizards = g;
      }
    }
    if (!wizards._id) return;
    this.cachedWizardsRef = `managed:${wizards._id}`;

    // Seed membership from WIZARD_PLAYER_IDS (comma-separated Avatar
    // playerIds) — deploy-time config alongside STREAMER_PLAYER_IDS, read
    // straight from the env so there's no boot-ordering dependency on
    // AppSettings. Additive + idempotent (never removes), matching the
    // merge-missing philosophy of the lounge/core/streamer seeding; drop a
    // member via `wizard revoke`. Runs before any `isWizard` read, so the
    // lazy member cache picks the seeded ids up on first use.
    const ids = (process.env.WIZARD_PLAYER_IDS ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    let changed = false;
    for (const id of ids) {
      if (wizards.addMember(id)) changed = true;
    }
    if (changed) {
      await wizards.save();
      // Drop the (possibly already-warmed) member cache so the next
      // isWizard read reflects the freshly-seeded members.
      this.cachedWizardPlayerIds = null;
    }
  }

  private async seedStreamersGroup(): Promise<void> {
    const reg = await GroupApi.registry();
    const provider = reg.managed();
    let streamers = await provider.findByName('streamers');
    if (!streamers) {
      const g = new Group();
      g.name = 'streamers';
      g.owner = 'system';
      await g.save();
      streamers = g;
    }
    if (!streamers._id) return;
    this.cachedStreamersRef = `managed:${streamers._id}`;

    // Seed membership from STREAMER_PLAYER_IDS (comma-separated Avatar
    // playerIds) — deploy-time config alongside BROADCAST_TOKEN, read
    // straight from the env so there's no boot-ordering dependency on
    // AppSettings. Additive + idempotent (never removes), matching the
    // merge-missing philosophy of the lounge/core seeding; drop a
    // member via the `group` verb. Runs before any `isStreamer` read,
    // so the lazy member cache picks the seeded ids up on first use.
    const ids = (process.env.STREAMER_PLAYER_IDS ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    let changed = false;
    for (const id of ids) {
      if (streamers.addMember(id)) changed = true;
    }
    if (changed) {
      await streamers.save();
      // Drop the (possibly already-warmed) member cache so the next
      // isStreamer read reflects the freshly-seeded members.
      this.cachedStreamerPlayerIds = null;
    }
  }

  private async seedArchwizardsGroup(): Promise<void> {
    const reg = await GroupApi.registry();
    const provider = reg.managed();
    let archwizards = await provider.findByName('archwizards');
    if (!archwizards) {
      const g = new Group();
      g.name = 'archwizards';
      g.owner = 'system';
      await g.save();
      archwizards = g;
    }
    if (!archwizards._id) return;
    this.cachedArchwizardsRef = `managed:${archwizards._id}`;

    // Seed membership from ARCHWIZARD_PLAYER_IDS (comma-separated Avatar
    // playerIds) — the operator/root floor that owns wizard conferral.
    // Additive + idempotent (never removes), mirroring the streamer/
    // wizard env seed. Runs before any `isArchwizard` read.
    const ids = (process.env.ARCHWIZARD_PLAYER_IDS ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    let changed = false;
    for (const id of ids) {
      if (archwizards.addMember(id)) changed = true;
    }
    if (changed) {
      await archwizards.save();
      this.cachedArchwizardPlayerIds = null;
    }
  }

  public override onDestruct(): void {
    this.wizardCacheCancel?.();
    this.wizardCacheCancel = null;
    this.streamerCacheCancel?.();
    this.streamerCacheCancel = null;
    this.archwizardCacheCancel?.();
    this.archwizardCacheCancel = null;
    super.onDestruct();
  }
}

