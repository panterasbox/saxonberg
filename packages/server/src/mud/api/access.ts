/**
 * AccessApi — thin facade over the `AccessRegistry` singleton.
 *
 * Stable caller-facing surface for the access substrate. Every method
 * delegates to the Registry; the Registry's methods carry
 * `@CallSecurity(FromModule('mud/api/access#AccessApi'))` so the
 * security gate denies any caller outside this module. External code
 * that grabs the Registry Stuff via `StuffApi.findByTemplatePath`
 * cannot call its methods; this Api is the only legitimate path.
 *
 * State lives on the Registry (cached refs, developer playerId Set,
 * etc.) — the cached pointer below is a lookup convenience, not
 * domain state. Reload of this file invalidates only the cached
 * pointer; reload of `obj/AccessRegistry.ts` re-clones the Stuff per
 * HotReloadApi's pattern (state resets, `postRegister` re-runs
 * idempotently, caches re-warm lazily).
 *
 * The narrow-entry pattern: `AccessApi` is reachable from anywhere,
 * mediating every call into the Registry. State has one home, one
 * calling surface, and one structurally-enforced path between them.
 */

import { SecurityApi } from './security';
import { StuffApi } from './stuff';
import type { Stuff } from '../lib/stuff/Stuff';
import type AccessRegistry from '../obj/AccessRegistry';

/**
 * Avatar-shaped sniff: only Avatar instances carry a non-empty
 * playerId. NPCs and props fail closed without touching the
 * Registry. Keeping this check at the facade lets the predicates
 * short-circuit cheaply for the common case (NPC chains, prop
 * targets) without forcing the Registry to lazy-resolve.
 */
function playerIdOfQuick(subject: Stuff): string | null {
  const av = subject as Stuff & { getPlayerId?: () => string };
  if (typeof av.getPlayerId !== 'function') return null;
  const id = av.getPlayerId();
  return id && id.length > 0 ? id : null;
}

const REGISTRY_PATH = '/obj/AccessRegistry';

export class AccessApi {
  static #registryRef: AccessRegistry | null = null;

  /**
   * Resolve the Registry without forcing a clone. In production the
   * Registry is cloned by `AppBootstrap`, so this returns it cheaply.
   * In test harnesses without a live Registry it returns `null` —
   * the public predicates use the fallback-decision option to choose
   * permit vs deny per-method.
   */
  static #lookupRegistry(): AccessRegistry | null {
    if (AccessApi.#registryRef) return AccessApi.#registryRef;
    const reg = StuffApi.findByTemplatePath<AccessRegistry>(REGISTRY_PATH);
    if (reg) AccessApi.#registryRef = reg;
    return reg ?? null;
  }

  /**
   * Resource-targeted slice walk. Returns true iff `subject` is a
   * member of any group owning the resource's zone-tree slice. NPCs
   * and null subjects fail closed. When the walk finds no owners,
   * falls back to the universal `'core'` group.
   */
  public static async can(
    subject: Stuff | null,
    action: string,
    resource: Stuff | null,
  ): Promise<boolean> {
    if (subject === null) return false;
    const reg = AccessApi.#lookupRegistry();
    if (!reg) return true;
    if (playerIdOfQuick(subject) === null) return false;
    return reg.can(subject, action, resource);
  }

  /**
   * Role-gated check used when the target IS a Zone Template
   * (transfer ownership, mutate `accessGroups`, destruct the slice).
   * Requires `'owner'` role in the zone's primary `ownerGroup`.
   */
  public static async canMutateZone(
    subject: Stuff | null,
    zone: Stuff,
  ): Promise<boolean> {
    if (subject === null) return false;
    const reg = AccessApi.#lookupRegistry();
    if (!reg) return true;
    if (playerIdOfQuick(subject) === null) return false;
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
    const reg = AccessApi.#lookupRegistry();
    if (!reg) return false;
    if (playerIdOfQuick(subject) === null) return false;
    return reg.isAuthor(subject);
  }

  /**
   * Orthogonal developer axis. True iff `subject` is an Avatar
   * whose playerId is in the `'developers'` group.
   */
  public static async isDeveloper(subject: Stuff | null): Promise<boolean> {
    if (subject === null) return false;
    const reg = AccessApi.#lookupRegistry();
    if (!reg) return true;
    if (playerIdOfQuick(subject) === null) return false;
    return reg.isDeveloper(subject);
  }

  /**
   * Walk a source-tree path against the template tree
   * most-specific-first, returning the closest extant FolderZone
   * instance. Workspace controllers in source/mirror mode pass the
   * resolved zone as the access resource.
   */
  public static async resolveSourceFolderZone(
    sourcePath: string,
  ): Promise<Stuff | null> {
    const reg = AccessApi.#lookupRegistry();
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
    AccessApi.#registryRef = null;
  }
}

SecurityApi.decorateApiClass(AccessApi);
