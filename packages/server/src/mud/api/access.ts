/**
 * AccessApi — thin facade over the `AccessRegistry` singleton.
 *
 * Stable caller-facing surface for the access substrate. The facade
 * talks to the Registry **directly** — there is no `AccessLogic` tier
 * (it held no logic; the antipattern sweep collapsed it). The Registry's
 * methods carry `@CallSecurity(FromModule('/api/access#AccessApi'))` so
 * the security gate denies any caller outside this facade. External code
 * that grabs the Registry Stuff via `StuffApi.findByTemplatePath` cannot
 * call its methods; this Api is the only legitimate path. Behavior
 * hot-reloads with the Registry itself (an `/obj/` singleton).
 *
 * State lives on the Registry (cached refs, wizard playerId Set, etc.);
 * the cached pointer below is a lookup convenience, not domain state.
 *
 * The narrow-entry pattern: `AccessApi` is reachable from anywhere,
 * mediating every call into the Registry. State has one home, one
 * calling surface, and one structurally-enforced path between them.
 *
 * **No-Registry test path** (per-method fallback decision): the broad
 * capability predicates (`can`/`canMutateZone`/`isWizard`/`isStreamer`/
 * `isArchwizard`) fail *open* — the dispatcher already pre-gated the
 * resolver in those harnesses — while `isAuthor` fails closed.
 */

import { StuffApi } from './stuff';
import { PlayerApi } from './player';
import { CallSecurity } from '../lib/security/decorators';
import { SecurityPolicies } from '../lib/security/SecurityPolicies';
import { TemplatePaths } from '../lib/paths';
import type { Stuff } from '../lib/stuff/Stuff';
import type AccessRegistry from '../obj/AccessRegistry';

const REGISTRY_PATH = TemplatePaths.accessRegistry;

/**
 * Resolve the Registry without forcing a clone. In production the
 * Registry is cloned by `AppBootstrap`, so this returns it cheaply. In
 * test harnesses without a live Registry it returns `null` — the public
 * predicates use the fallback-decision option to choose permit vs deny
 * per-method (see the class doc). Cleared by the reload seam below.
 */
let registryRef: AccessRegistry | null = null;
function lookupRegistry(): AccessRegistry | null {
  if (registryRef) return registryRef;
  const reg = StuffApi.findByTemplatePath<AccessRegistry>(REGISTRY_PATH);
  if (reg) registryRef = reg;
  return reg ?? null;
}

export class AccessApi {
  /**
   * Resource-targeted slice walk. Returns true iff `subject` is a
   * member of any group owning the resource's zone-tree slice. NPCs
   * and null subjects fail closed. When the walk finds no owners,
   * falls back to the universal `'core'` group.
   */
  public static async can(
    subject: Stuff | null,
    action: string,
    resource: Stuff | null
  ): Promise<boolean> {
    if (subject === null) return false;
    const reg = lookupRegistry();
    if (!reg) return true;
    if (!PlayerApi.isAvatarStuff(subject)) return false;
    return reg.can(subject, action, resource);
  }

  /**
   * Role-gated check used when the target IS a Zone Template
   * (transfer ownership, mutate `accessGroups`, destruct the slice).
   * Requires `'owner'` role in the zone's primary `ownerGroup`.
   */
  public static async canMutateZone(
    subject: Stuff | null,
    zone: Stuff
  ): Promise<boolean> {
    if (subject === null) return false;
    const reg = lookupRegistry();
    if (!reg) return true;
    if (!PlayerApi.isAvatarStuff(subject)) return false;
    return reg.canMutateZone(subject, zone);
  }

  /**
   * Broad "is the actor a member of any group with content scope?".
   * Used by MQL pre-gates that can't be resource-targeted. Fail-
   * closed in the no-Registry test path (the absent permission
   * snapshot already permits the resolver from the dispatcher side).
   */
  public static async isAuthor(subject: Stuff | null): Promise<boolean> {
    if (subject === null) return false;
    const reg = lookupRegistry();
    if (!reg) return false;
    if (!PlayerApi.isAvatarStuff(subject)) return false;
    return reg.isAuthor(subject);
  }

  /**
   * Orthogonal wizard axis — the code-trust capability. True iff
   * `subject` is an Avatar whose playerId is in the `'wizards'` group.
   * Gates every TypeScript-authoring/execution door (`eval`, `reload`,
   * source writes, CMS source read/write) AND the executable
   * code-naming fields on a content template (`class` /
   * `hydratorClass` / `behaviors[].brain`). A content author who is not
   * a wizard is a "protowizard": content-write access without code
   * trust.
   */
  public static async isWizard(subject: Stuff | null): Promise<boolean> {
    if (subject === null) return false;
    const reg = lookupRegistry();
    if (!reg) return true;
    if (!PlayerApi.isAvatarStuff(subject)) return false;
    return reg.isWizard(subject);
  }

  /**
   * Orthogonal streamer axis. True iff `subject` is an Avatar whose
   * playerId is in the `'streamers'` group. Gates the livestream
   * control plane (the `stream` verb). Distinct from the wizard
   * axis — a streamer drives the broadcast overlay without holding
   * TypeScript-escape capability.
   */
  public static async isStreamer(subject: Stuff | null): Promise<boolean> {
    if (subject === null) return false;
    const reg = lookupRegistry();
    if (!reg) return true;
    if (!PlayerApi.isAvatarStuff(subject)) return false;
    return reg.isStreamer(subject);
  }

  /**
   * Orthogonal archwizard axis. True iff `subject` is an Avatar whose
   * playerId is in the `'archwizards'` group. Archwizards confer/revoke
   * wizard status via `wizard grant/revoke` (the `requiresArchwizard`
   * validator). Operator/root-managed; the Prime Minister office above
   * them is deferred.
   */
  public static async isArchwizard(subject: Stuff | null): Promise<boolean> {
    if (subject === null) return false;
    const reg = lookupRegistry();
    if (!reg) return true;
    if (!PlayerApi.isAvatarStuff(subject)) return false;
    return reg.isArchwizard(subject);
  }

  /**
   * Narrow-entry mutation: add (`makeWizard=true`) or remove the player
   * from the `'wizards'` group. Gated to the `WizardController` (the
   * `wizard grant/revoke` verb) via the string-keyed `FromModule` policy
   * — string-keyed to avoid a value-level static-import cycle. The
   * controller is cloned per execution, and `FromModule` matches it by
   * its class module id (code provenance), so the cloned instance is
   * admitted directly. The *authority* (the giver's archwizard status) is
   * enforced by the verb's `requiresArchwizard` validator; this method is
   * the structurally single entry to the membership write. Returns true
   * iff membership changed.
   */
  @CallSecurity(
    SecurityPolicies.FromModule('/obj/command/author/WizardController')
  )
  public static async setWizardMembership(
    playerId: string,
    makeWizard: boolean
  ): Promise<boolean> {
    const reg = lookupRegistry();
    if (!reg) return false;
    return reg.setWizardMembership(playerId, makeWizard);
  }

  /**
   * Walk a source-tree path against the template tree
   * most-specific-first, returning the closest extant FolderZone
   * instance. Workspace controllers in source/mirror mode pass the
   * resolved zone as the access resource.
   */
  public static async resolveSourceFolderZone(
    sourcePath: string
  ): Promise<Stuff | null> {
    const reg = lookupRegistry();
    if (!reg) return null;
    return reg.resolveSourceFolderZone(sourcePath);
  }

  /**
   * HMR seam: drop the cached Registry pointer so the next call
   * re-resolves. Called by the HotReloadApi when `api/access.ts` is
   * reloaded. Registry state itself is unaffected.
   * @internal
   */
  public static _resetRegistryRefForReload(): void {
    registryRef = null;
  }
}
