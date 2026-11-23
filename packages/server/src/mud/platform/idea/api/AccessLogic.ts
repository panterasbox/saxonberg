// AccessLogic — the hot-reloadable logic singleton behind AccessApi.
// (Doc comment on the class below so @internal lands on the reflection.)

import { ApiLogic } from '../../../lib/stuff/ApiLogic';
import type { TreeAction } from '../../../api/access';
import { CallSecurity, Unshadowable } from '../../../lib/security/decorators';
import { SecurityPolicies } from '../../../lib/security/SecurityPolicies';
import { StuffApi } from '../../../api/stuff';
import { PlayerApi } from '../../../api/player';
import { TemplatePaths } from '../../../lib/paths';
import { Stuff } from '../../../lib/stuff/Stuff';
import type AccessRegistry from '../AccessRegistry';
import { ExecutionContextApi } from '../../../api/execution-context';
import { ProxyApi } from '../../../api/proxy';
import { DiagnosticApi } from '../../../api/diagnostics';
import { Refusal } from '../../../lib/errors';

const REGISTRY_PATH = TemplatePaths.accessRegistry;

const AccessApiCallers = SecurityPolicies.FromModule('/api/access#AccessApi'
);

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

/** A diagnostic's name for a principal: its identity path, else its class. */
function nameFor(who: unknown): string {
  if (who instanceof Stuff) {
    const path = who.getIdentityPath();
    if (path) return path;
  }
  return (who as { constructor?: { name?: string } } | null)?.constructor?.name ?? 'something';
}
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
 * Lives at `/platform/idea/api/access`. Holds the registry-resolution + predicate
 * orchestration; the durable state (cached refs, wizard playerId Set)
 * lives on the pinned `/platform/idea/AccessRegistry`, whose methods are gated to
 * admit this logic singleton (`FromTemplate('/platform/idea/api/access')`) as well
 * as the Api module. Each method is gated
 * `FromModule('/api/access#AccessApi')` (the Api is the only caller;
 * internal sub-logic is in module-private free functions, so there are
 * no intra-singleton self-calls).
 *
 * ## ⚠⚠ Every predicate here FAILS CLOSED when the Registry is absent
 *
 * `lookupRegistry()` returns null before `/platform/idea/AccessRegistry` is
 * registered — during early boot, and in any test that does not stand
 * one up. Five of these predicates used to answer **`true`** in that
 * window, undocumented, while `isAuthor` alone answered `false`.
 *
 * A missing authority is not a grant. `isWizard` is the code-trust
 * axis — it gates `eval`, `reload`, source-tree writes and the
 * executable code-naming fields on a content template — so an
 * unanswerable question resolving to *yes* is the worst available
 * default, and it made the most dangerous door in the system the one
 * that opened when the lock was missing.
 *
 * ⚠ The cost is real and is the reason it was ever written the other
 * way: a test that exercises a wizard-gated path now has to stand up a
 * Registry, or assert the refusal. That is the correct direction — a
 * test that passed only because the gate was absent was not testing the
 * gate.
 *
 * @internal
 */
@Unshadowable
export class AccessLogic extends ApiLogic {
  /** See {@link AccessApi.requireActor}. */
  @CallSecurity(AccessApiCallers)
  public requireActor(claimed: Stuff | null, act: string): void {
    // Claiming nobody asks for the least: a site that must not accept
    // nobody refuses it itself (D6).
    if (claimed == null) return;
    // The system acts for anyone, and the frame says so (D3).
    if (ExecutionContextApi.actingSystem() !== null) return;
    const actor = ExecutionContextApi.getActor();
    if (actor != null && ProxyApi.identityOf(actor) === ProxyApi.identityOf(claimed)) return;
    // ⭐ A lie (or code with nobody acting naming somebody). Tell the code's
    // keeper — fire and forget, a diagnostic never blocks the refusal — and
    // refuse out loud.
    const path = ExecutionContextApi.getActingCodePath();
    const by = actor == null ? 'nobody' : nameFor(actor);
    void DiagnosticApi.record({
      path,
      channel: 'call-security',
      severity: 'error',
      message: `${act}: ${by} claimed to act for ${nameFor(claimed)}`,
    }).catch(() => undefined);
    throw new Refusal('not-acting-for', { claimed });
  }

  /** See {@link AccessApi.can}. */
  @CallSecurity(AccessApiCallers)
  public async can(
    subject: Stuff | null,
    action: string,
    resource: Stuff | null
  ): Promise<boolean> {
    if (subject === null) return false;
    const reg = lookupRegistry();
    // ⚠⚠ FAIL CLOSED. See the note above the class.
    if (!reg) return false;
    if (!PlayerApi.isAvatarStuff(subject)) return false;
    return reg.can(subject, action, resource);
  }

  /** See {@link AccessApi.canAtPath}. */
  @CallSecurity(AccessApiCallers)
  public async canAtPath(
    subject: Stuff | null,
    action: TreeAction,
    path: string
  ): Promise<boolean> {
    if (subject === null) return false;
    const reg = lookupRegistry();
    // ⚠⚠ FAIL CLOSED. See the note above the class.
    if (!reg) return false;
    if (!PlayerApi.isAvatarStuff(subject)) return false;
    return reg.canAtPath(subject, action, path);
  }

  /** See {@link AccessApi.canMutateZone}. */
  @CallSecurity(AccessApiCallers)
  public async canMutateZone(
    subject: Stuff | null,
    zone: Stuff
  ): Promise<boolean> {
    if (subject === null) return false;
    const reg = lookupRegistry();
    // ⚠⚠ FAIL CLOSED. See the note above the class.
    if (!reg) return false;
    if (!PlayerApi.isAvatarStuff(subject)) return false;
    return reg.canMutateZone(subject, zone);
  }

  /** See {@link AccessApi.heldExtents}. */
  @CallSecurity(AccessApiCallers)
  public async heldExtents(subject: Stuff | null): Promise<string[]> {
    if (subject === null) return [];
    const reg = lookupRegistry();
    if (!reg) return [];
    return reg.heldExtents(subject);
  }

  /** See {@link AccessApi.isWizard}. */
  public async isWizard(subject: Stuff | null): Promise<boolean> {
    if (subject === null) return false;
    const reg = lookupRegistry();
    // ⚠⚠ FAIL CLOSED. See the note above the class.
    if (!reg) return false;
    if (!PlayerApi.isAvatarStuff(subject)) return false;
    return reg.isWizard(subject);
  }

  /** See {@link AccessApi.isArchwizard}. */
  @CallSecurity(AccessApiCallers)
  public async isArchwizard(subject: Stuff | null): Promise<boolean> {
    if (subject === null) return false;
    const reg = lookupRegistry();
    // ⚠⚠ FAIL CLOSED. See the note above the class.
    if (!reg) return false;
    if (!PlayerApi.isAvatarStuff(subject)) return false;
    return reg.isArchwizard(subject);
  }

  /** See {@link AccessApi.setWizardMembership}. */
  @CallSecurity(AccessApiCallers)
  public async setWizardMembership(
    playerId: string,
    makeWizard: boolean
  ): Promise<boolean> {
    const reg = lookupRegistry();
    if (!reg) return false;
    return reg.setWizardMembership(playerId, makeWizard);
  }

  /** See {@link AccessApi.reseedSystemGroups}. */
  @CallSecurity(AccessApiCallers)
  public async reseedSystemGroups(): Promise<void> {
    const reg = lookupRegistry();
    if (!reg) return;
    await reg.reseedSystemGroups();
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
