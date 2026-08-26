/**
 * AccessRegistry — singleton Idea holding the access-substrate state
 * and behavior. Lives at `/obj/AccessRegistry`, sibling to
 * `GroupRegistry`, `SoulCatalogue`, and the other singleton catalogues
 * under `obj/`. The thin `AccessApi` facade at `api/access.ts` is the
 * only legitimate caller — every public method on this class carries
 * `@CallSecurity(FromModule('/api/access#AccessApi'))` so the
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
 * `/obj/lounge` and `/domain/lounge`. Caches
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
import { ParcelApi } from '../api/parcel';
import type { TreeAction } from '../api/access';
import { CompactApi } from '../api/compact';
import { EmploymentApi } from '../api/employment';
import { MixinApi } from '../api/mixin';
import { DiagnosticApi } from '../api/diagnostics';
import { Collections } from '../lib/persistence/Collections';
import { Template } from '../lib/stuff/Template';
import { Group } from '../lib/social/Group';
import type { GroupRef } from '../lib/social/GroupProvider';
import type { ParcelOwner } from '../lib/parcel/ParcelRecord';
import type { Stuff } from '../lib/stuff/Stuff';
import { Zone } from '../lib/zone/Zone';
import FolderZone from './FolderZone';
import Avatar from './Avatar';

/**
 * The one office that carries code trust. Named here rather than
 * imported from the governance vocabulary so this module keeps its
 * existing import surface; the key is asserted against `Office.byKey`
 * by the test beside it, so a rename cannot leave this pointing at
 * nothing.
 */
const PRIME_MINISTER = 'prime-minister';

const AccessRegistryBase = PostRegistrationMixin(Idea);

// AccessApi's logic now lives in the /obj/api/access logic singleton
// (the Api face is a thin forwarding shell). Admit both the face module
// and the logic singleton's template path so the Registry's methods stay
// callable only through the access subsystem.
const AccessApiCallers = SecurityPolicies.AnyOf(
  SecurityPolicies.FromModule('/api/access#AccessApi'),
  SecurityPolicies.FromTemplate('/obj/api/access'),
);


export default class AccessRegistry extends AccessRegistryBase {
  /** Cached GroupRef for `'core'`. Resolved lazily; survives the
   *  api/access.ts reload because it lives on the Stuff. */
  private cachedCoreRef: GroupRef | null = null;
  private cachedWizardsRef: GroupRef | null = null;
  /** Set of member keys (templatePaths) in `'wizards'` — warmed lazily, invalidated
   *  via the managed provider's onChange callback. */
  private cachedWizardPlayerIds: ReadonlySet<string> | null = null;
  /** Cancellation handle for the wizard onChange subscription. */
  private wizardCacheCancel: (() => void) | null = null;
  private cachedStreamersRef: GroupRef | null = null;
  /** Set of member keys (templatePaths) in `'streamers'` — the livestream-control axis.
   *  Warmed lazily, invalidated via the managed provider's onChange
   *  callback. Mirrors the wizard cache exactly. */
  private cachedStreamerPlayerIds: ReadonlySet<string> | null = null;
  /** Cancellation handle for the streamer onChange subscription. */
  private streamerCacheCancel: (() => void) | null = null;
  private cachedArchwizardsRef: GroupRef | null = null;
  /** Set of member keys (templatePaths) in `'archwizards'` — the wizard-conferral axis.
   *  Archwizards run `wizard grant/revoke`. Warmed lazily, invalidated
   *  via the managed provider's onChange callback. Mirrors the wizard
   *  cache exactly. */
  private cachedArchwizardPlayerIds: ReadonlySet<string> | null = null;
  /** Cancellation handle for the archwizard onChange subscription. */
  private archwizardCacheCancel: (() => void) | null = null;
  /** Set of GroupRefs that count as "author scope" — every group named by
   *  a `group`-kind parcel owner (via `ParcelApi.groupOwnerRefs`), plus
   *  `'core'`. Warmed lazily on first `isAuthor` read. */
  private cachedAuthorGroups: readonly GroupRef[] | null = null;
  /** Organization paths already diagnosed as unresolved — once-per-path. */
  private readonly reportedUnresolvedOrganizations = new Set<string>();

  public override async postRegister(_context?: unknown): Promise<void> {
    await this.seedCoreGroup();
    // Zone-ownership (lounge / Terminus) is NOT resolved here anymore.
    // Ownership moved out of the editable `domain` zone template into the
    // gated `parcels` collection (the governing security invariant); the
    // `ParcelRegistry` owns the title store + the mint-or-find group-ref
    // resolution, and `can`/`canMutateZone` consult it via `ParcelApi`.
    // This registry only seeds the tag-like groups below.
    await this.seedWizardsGroup();
    await this.seedStreamersGroup();
    await this.seedArchwizardsGroup();
  }

  /**
   * Resource-targeted ownership check. Returns true iff `subject` holds
   * (or is a member of the group holding) the title governing the
   * resource's zone.
   *
   * Title now lives in the `parcels` registry, not the zone tree: resolve
   * the resource's zone templatePath, then `ParcelApi.ownerOf(path)` (the
   * total title → self-home → state chain, longest-prefix over parcel
   * extents). Dispatch on the owner kind — a **group** owner resolves to a
   * ref (mint-or-find by name) and checks `GroupApi.isMember`; a
   * **player** owner is an identity match. Byte-identical to the former
   * zone-tree walk for the migrated areas: no seed used `accessGroups`, so
   * the old flat-union collapses to the single nearest owner (or `core`
   * for untitled content), which is exactly what `ownerOf` returns.
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
    const memberKey = this.memberKeyOf(subject);
    if (memberKey === null) return false;
    const path = this.zoneOf(resource)?.getTemplatePath() ?? '';
    const owner = await ParcelApi.ownerOf(path);
    return this.subjectIsOwnerMember(subject, memberKey, owner);
  }

  /**
   * Path-targeted title check (the document store's gate, D11): the
   * covering owner via `ParcelApi.ownerOf(path)` — rung 1 a parcel, rung
   * 2 the self-home, rung 3 the state — then the `can()` dispatch of
   * that owner, verbatim. No zone step, no `core` literal: `ownerOf`'s
   * rung 3 IS the state default.
   */
  @CallSecurity(AccessApiCallers)
  public async canAtPath(
    subject: Stuff | null,
    _action: TreeAction,
    path: string,
  ): Promise<boolean> {
    if (subject === null) return false;
    const memberKey = this.memberKeyOf(subject);
    if (memberKey === null) return false;
    const owner = await ParcelApi.ownerOf(path);
    return this.subjectIsOwnerMember(subject, memberKey, owner);
  }

  /**
   * Role-gated check used when the target IS a Zone Template (transfer
   * ownership, destruct the slice). For a **group** owner requires the
   * `'owner'` role in the parcel's governing group (`'admin'`/`'member'`
   * are not authorized for zone-mutation ops); for a **player** owner an
   * identity match. Resolves title via `ParcelApi.ownerOf(zone-path)` —
   * the covering parcel's owner is the nearest-ancestor owner the former
   * upward walk found; untitled → the state's `core`, still requiring the
   * `'owner'` role there (byte-identical).
   */
  @CallSecurity(AccessApiCallers)
  public async canMutateZone(
    subject: Stuff | null,
    zone: Stuff,
  ): Promise<boolean> {
    if (subject === null) return false;
    if (!(zone instanceof Zone)) return false;
    const memberKey = this.memberKeyOf(subject);
    if (memberKey === null) return false;
    const owner = await ParcelApi.ownerOf(zone.getTemplatePath() ?? '');
    return this.subjectHasOwnerRole(subject, memberKey, owner);
  }

  /**
   * Broad "is the actor a member of any group with content scope?"
   * used by MQL pre-gates that can't be resource-targeted. True for
   * any Avatar whose playerId is in `'core'` or any group named by a
   * `group`-kind parcel owner (the repointed author scope — see
   * `ensureAuthorGroups`).
   */
  @CallSecurity(AccessApiCallers)
  public async isAuthor(subject: Stuff | null): Promise<boolean> {
    if (subject === null) return false;
    const memberKey = this.memberKeyOf(subject);
    if (memberKey === null) return false;
    const groups = await this.ensureAuthorGroups();
    for (const ref of groups) {
      if (await GroupApi.isMember(memberKey, ref)) return true;
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
    const memberKey = this.memberKeyOf(subject);
    if (memberKey === null) return false;
    const cache = await this.ensureWizardCache();
    if (cache.has(memberKey)) return true;
    return this.holdsPrimeMinister(subject);
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
    const memberKey = this.memberKeyOf(subject);
    if (memberKey === null) return false;
    const cache = await this.ensureStreamerCache();
    return cache.has(memberKey);
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
    const memberKey = this.memberKeyOf(subject);
    if (memberKey === null) return false;
    const cache = await this.ensureArchwizardCache();
    if (cache.has(memberKey)) return true;
    return this.holdsPrimeMinister(subject);
  }

  /**
   * ⭐⭐ **The backstop: whoever holds the Prime Minister's office is a
   * wizard and an archwizard, derived — never stored.**
   *
   * The world ships with NO wizards and no seeded operator identities.
   * There is exactly one credential anywhere in the system — the
   * founder's provider id, read by `OfficeRegistry` — and it does one
   * thing: it makes the founder the DEFAULT HOLDER of the offices until
   * somebody is seated explicitly. Everything downstream of that is
   * playerIds.
   *
   * ⚠⚠ **Derived is the whole point.** A stored grant survives the
   * handoff that was supposed to end it: hand the office on and the old
   * holder keeps code trust, silently, because a group row outlives the
   * seat. Asking the office each time means authority follows the seat
   * in both directions, which is the codebase's own rule — *check
   * offices, never the founder.*
   *
   * ⚠ It is a floor, not a ceiling: an explicit `wizards` membership
   * still stands on its own, and the group cache is consulted FIRST so
   * an ordinary wizard costs no office read. The cost of this path is
   * one indexed lookup on the refusal branch, which is what
   * `OfficeRegistry` already does per check by design.
   */
  private async holdsPrimeMinister(subject: Stuff): Promise<boolean> {
    try {
      return await CompactApi.holdsOffice(subject, PRIME_MINISTER);
    } catch {
      // ⚠ Fail CLOSED and stay quiet. This is a backstop on top of the
      // ordinary group answer, so a governance substrate that is not up
      // yet must not turn a plain "no" into a throw at a security gate.
      return false;
    }
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
    // Store the member key (templatePath), not the bare playerId — the
    // `wizard grant <playerId>` verb + the env seed both speak account ids;
    // membership keys uniformly on `/obj/Avatar/<playerId>`.
    const memberKey = Avatar.getTemplatePath(id);
    const changed = makeWizard
      ? wizards.addMember(memberKey, 'member')
      : wizards.removeMember(memberKey);
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
   * up to `/obj/lounge` (match, extant FolderZone) → returns it.
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

  /**
   * The uniform group-membership key for any subject — its **identity**
   * path (a player as `/obj/Avatar/<id>`, an NPC as its own path). Null
   * for an unregistered subject (no path). Authority groups (wizards /
   * streamers / archwizards / author scopes) hold player keys only, so
   * an NPC's path simply isn't in them — no player-vs-NPC branch is
   * needed anywhere.
   *
   * `getIdentityPath()` rather than `getTemplatePath()` because
   * authority belongs to the PERSON, not the body they are currently
   * wearing: a projection (the sandbox wire body) reports the real
   * `/obj/Avatar/<id>` it acts as, so a wizard is still a wizard inside
   * their own circle — which is the whole point of having one. Every
   * ordinary object returns its templatePath here, unchanged.
   */
  private memberKeyOf(subject: Stuff): string | null {
    const path = subject.getIdentityPath();
    return path && path.length > 0 ? path : null;
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

  /**
   * Does `subject` hold (or belong to the group holding) `owner`? A
   * `player` owner is an identity match; a `group` owner resolves to a
   * ref (mint-or-find by name, via `ParcelApi`) and checks membership.
   * The `can()` (content-access) dispatch.
   */
  private async subjectIsOwnerMember(
    subject: Stuff,
    playerId: string,
    owner: ParcelOwner,
  ): Promise<boolean> {
    if (owner.kind === 'player') return this.subjectOwnsAsPlayer(subject, owner);
    if (owner.kind === 'organization') {
      return this.subjectHoldsOrganization(subject, owner);
    }
    const ref = await ParcelApi.resolveOwnerRef(owner);
    if (!ref) return false;
    return GroupApi.isMember(playerId, ref);
  }

  /**
   * Does `subject` hold `owner` with mutation authority? A `player` owner
   * is an identity match; a `group` owner requires the `'owner'` role.
   * The `canMutateZone()` dispatch.
   */
  private async subjectHasOwnerRole(
    subject: Stuff,
    playerId: string,
    owner: ParcelOwner,
  ): Promise<boolean> {
    if (owner.kind === 'player') return this.subjectOwnsAsPlayer(subject, owner);
    // An organization's staff and head all count as `'owner'` — the
    // chart, not a group role, is the authority structure.
    if (owner.kind === 'organization') {
      return this.subjectHoldsOrganization(subject, owner);
    }
    const ref = await ParcelApi.resolveOwnerRef(owner);
    if (!ref) return false;
    return (await GroupApi.roleOf(playerId, ref)) === 'owner';
  }

  /**
   * The `organization`-kind dispatch (wave 3, D2): the title is held by
   * everyone holding a non-exited position in the organization
   * (`EmploymentApi.holdsPosition`) and by its appointing authority
   * (`EmploymentApi.holdsAuthority` — for an office that is
   * `CompactApi.holdsOffice`, founder default included). The organization
   * **must be resident** (`/compact/executive` and the corpos are `boot:`
   * entries for exactly this reason); a non-resident or non-organization
   * target fails CLOSED with one diagnostic per path.
   */
  private async subjectHoldsOrganization(
    subject: Stuff,
    owner: ParcelOwner & { kind: 'organization' },
  ): Promise<boolean> {
    const org = StuffApi.findByTemplatePath(owner.templatePath);
    if (!org || !MixinApi.isOrganization(org)) {
      this.reportUnresolvedOrganization(owner.templatePath);
      return false;
    }
    if (EmploymentApi.holdsPosition(subject, org)) return true;
    try {
      return await EmploymentApi.holdsAuthority(
        subject,
        org.getAppointingAuthority(),
      );
    } catch {
      // Fail closed: a governance substrate that is not up must not turn
      // a plain "no" into a throw at a security gate.
      return false;
    }
  }

  /** Once per path: an organization-held title whose organization is not
   *  resident admits nobody, and that is worth one line, not a flood. */
  private reportUnresolvedOrganization(templatePath: string): void {
    if (this.reportedUnresolvedOrganizations.has(templatePath)) return;
    this.reportedUnresolvedOrganizations.add(templatePath);
    void DiagnosticApi.record({
      path: templatePath,
      channel: 'access.organization-owner',
      severity: 'warning',
      message:
        `A title is held by organization '${templatePath}', which is not ` +
        `resident (or is not an OrganizationMixin host) — the title admits ` +
        `nobody until it is. List it under the owning pack's boot: entries.`,
    });
  }

  /**
   * Identity match for a `player`-kind owner: true iff `subject` is that
   * individual. Handles both stored forms — a title held directly at the
   * Avatar's own `templatePath` (`/obj/Avatar/<key>`, a transferred title)
   * and the self-home form (`/home/<key>`, resolution rung 2).
   */
  private subjectOwnsAsPlayer(
    subject: Stuff,
    owner: ParcelOwner & { kind: 'player' },
  ): boolean {
    // Identity, not body — a player inside their circle still holds
    // their own titles (see `memberKeyOf`).
    const subjectPath = subject.getIdentityPath();
    if (!subjectPath) return false;
    if (owner.templatePath === subjectPath) return true;
    const key = subjectPath.split('/').filter(Boolean).pop();
    return key !== undefined && owner.templatePath === `/home/${key}`;
  }

  private async ensureAuthorGroups(): Promise<readonly GroupRef[]> {
    if (this.cachedAuthorGroups) return this.cachedAuthorGroups;
    // The author scope is now the parcel layer's group owners + `core`
    // (the template-`data` scan for `ownerGroup`/`ownerGroupName` is
    // retired — ownership no longer lives in `domain`).
    const refs = new Set<GroupRef>(await ParcelApi.groupOwnerRefs());
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

  /**
   * ⭐⭐ **Re-establish the system groups after they have been deleted.**
   *
   * The nightly reset wipes `groups`, and the system groups (`core`,
   * `wizards`, `archwizards`, `streamers`) live there beside the player
   * ones. They are minted in CODE rather than by a seed file — and the
   * seeder is insert-only and runs at boot — so without this the world
   * would come back every morning with no `core` group at all, every
   * `can` read failing closed, and the founder locked out of a running
   * process until somebody restarted it.
   *
   * ⚠ The cached refs are dropped FIRST. They hold `managed:<_id>`
   * strings pointing at rows the wipe just deleted; re-seeding without
   * clearing them mints new groups that nothing ever consults, which
   * reads exactly like the feature working.
   *
   * ⚠ This restores the GROUPS, not the founder's membership of them.
   * `WIZARD_PLAYER_IDS` names character ids, and a wipe takes the
   * characters — see `AccessApi.reseedSystemGroups` for the honest
   * limit and what actually closes it.
   */
  @CallSecurity(AccessApiCallers)
  public async reseedSystemGroups(): Promise<void> {
    this.cachedCoreRef = null;
    this.cachedWizardsRef = null;
    this.cachedStreamersRef = null;
    this.cachedArchwizardsRef = null;
    this.cachedWizardPlayerIds = null;
    this.cachedStreamerPlayerIds = null;
    this.cachedArchwizardPlayerIds = null;
    this.cachedAuthorGroups = null;
    await this.postRegister();
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
    g.owner = Group.systemOwner();
    await g.save();
    if (g._id) this.cachedCoreRef = `managed:${g._id}`;
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
        g.owner = Group.systemOwner();
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
      if (wizards.addMember(Avatar.getTemplatePath(id))) changed = true;
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
      g.owner = Group.systemOwner();
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
      if (streamers.addMember(Avatar.getTemplatePath(id))) changed = true;
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
      g.owner = Group.systemOwner();
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
      if (archwizards.addMember(Avatar.getTemplatePath(id))) changed = true;
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

