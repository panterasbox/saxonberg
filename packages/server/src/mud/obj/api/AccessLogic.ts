// AccessLogic — the hot-reloadable logic singleton behind AccessApi.
// (Doc comment on the class below so @internal lands on the reflection.)

import { Idea } from '../../lib/stuff/Idea';
import { CallSecurity, Unshadowable } from '../../lib/security/decorators';
import { SecurityPolicies } from '../../lib/security/SecurityPolicies';
import { StuffApi } from '../../api/stuff';
import { TemplatePaths } from '../../lib/paths';
import type { Stuff } from '../../lib/stuff/Stuff';
import type AccessRegistry from '../AccessRegistry';

const REGISTRY_PATH = TemplatePaths.accessRegistry;

const AccessApiCallers = SecurityPolicies.FromModule(
  'mud/api/access#AccessApi'
);

/**
 * Avatar-shaped sniff: only Avatar instances carry a non-empty
 * playerId. NPCs and props fail closed without touching the Registry.
 * Keeping this check at the facade lets the predicates short-circuit
 * cheaply for the common case (NPC chains, prop targets) without forcing
 * the Registry to lazy-resolve.
 */
function playerIdOfQuick(subject: Stuff): string | null {
  const av = subject as Stuff & { getPlayerId?: () => string };
  if (typeof av.getPlayerId !== 'function') return null;
  const id = av.getPlayerId();
  return id && id.length > 0 ? id : null;
}

/**
 * Resolve the Registry without forcing a clone. In production the
 * Registry is cloned by `AppBootstrap`, so this returns it cheaply. In
 * test harnesses without a live Registry it returns `null` — the public
 * predicates use the fallback-decision option to choose permit vs deny
 * per-method. Module-level cache mirrors the former
 * `AccessApi.#registryRef`; it survives the logic singleton's
 * `dest`/recreate and is cleared by the reload seam below.
 */
let registryRef: AccessRegistry | null = null;
function lookupRegistry(): AccessRegistry | null {
  if (registryRef) return registryRef;
  const reg = StuffApi.findByTemplatePath<AccessRegistry>(REGISTRY_PATH);
  if (reg) registryRef = reg;
  return reg ?? null;
}

/**
 * AccessLogic — the hot-reloadable logic singleton behind
 * {@link AccessApi}.
 *
 * Lives at `/obj/api/access`. Holds the registry-resolution + predicate
 * orchestration; the durable state (cached refs, developer playerId Set)
 * lives on the pinned `/obj/AccessRegistry`, whose methods are gated to
 * admit this logic singleton (`FromTemplate('/obj/api/access')`) as well
 * as the Api module. Each method is gated
 * `FromModule('mud/api/access#AccessApi')` (the Api is the only caller;
 * internal sub-logic is in module-private free functions, so there are
 * no intra-singleton self-calls).
 *
 * @internal
 */
@Unshadowable
export class AccessLogic extends Idea {
  /** See {@link AccessApi.can}. */
  @CallSecurity(AccessApiCallers)
  public async can(
    subject: Stuff | null,
    action: string,
    resource: Stuff | null
  ): Promise<boolean> {
    if (subject === null) return false;
    const reg = lookupRegistry();
    if (!reg) return true;
    if (playerIdOfQuick(subject) === null) return false;
    return reg.can(subject, action, resource);
  }

  /** See {@link AccessApi.canMutateZone}. */
  @CallSecurity(AccessApiCallers)
  public async canMutateZone(
    subject: Stuff | null,
    zone: Stuff
  ): Promise<boolean> {
    if (subject === null) return false;
    const reg = lookupRegistry();
    if (!reg) return true;
    if (playerIdOfQuick(subject) === null) return false;
    return reg.canMutateZone(subject, zone);
  }

  /** See {@link AccessApi.isAuthor}. */
  @CallSecurity(AccessApiCallers)
  public async isAuthor(subject: Stuff | null): Promise<boolean> {
    if (subject === null) return false;
    const reg = lookupRegistry();
    if (!reg) return false;
    if (playerIdOfQuick(subject) === null) return false;
    return reg.isAuthor(subject);
  }

  /** See {@link AccessApi.isDeveloper}. */
  @CallSecurity(AccessApiCallers)
  public async isDeveloper(subject: Stuff | null): Promise<boolean> {
    if (subject === null) return false;
    const reg = lookupRegistry();
    if (!reg) return true;
    if (playerIdOfQuick(subject) === null) return false;
    return reg.isDeveloper(subject);
  }

  /** See {@link AccessApi.isStreamer}. */
  @CallSecurity(AccessApiCallers)
  public async isStreamer(subject: Stuff | null): Promise<boolean> {
    if (subject === null) return false;
    const reg = lookupRegistry();
    if (!reg) return true;
    if (playerIdOfQuick(subject) === null) return false;
    return reg.isStreamer(subject);
  }

  /** See {@link AccessApi.resolveSourceFolderZone}. */
  @CallSecurity(AccessApiCallers)
  public async resolveSourceFolderZone(
    sourcePath: string
  ): Promise<Stuff | null> {
    const reg = lookupRegistry();
    if (!reg) return null;
    return reg.resolveSourceFolderZone(sourcePath);
  }

  /** See {@link AccessApi._resetRegistryRefForReload}. */
  @CallSecurity(AccessApiCallers)
  public _resetRegistryRefForReload(): void {
    registryRef = null;
  }
}
