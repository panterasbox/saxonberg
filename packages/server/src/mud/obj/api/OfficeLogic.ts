// OfficeLogic — the hot-reloadable logic singleton behind OfficeApi.
// (Doc comment on the class below so @internal lands on the reflection.)

import { ApiLogic } from '../../lib/stuff/ApiLogic';
import { CallSecurity, Unshadowable } from '../../lib/security/decorators';
import { SecurityPolicies } from '../../lib/security/SecurityPolicies';
import { StuffApi } from '../../api/stuff';
import { TemplatePaths } from '../../lib/paths';
import type { Stuff } from '../../lib/stuff/Stuff';
import type {
  OfficeHolderResult,
  OfficeRosterRow,
  OfficeAssignResult,
} from '../../lib/governance/Office';
import type OfficeRegistry from '../OfficeRegistry';

const REGISTRY_PATH = TemplatePaths.officeRegistry;

const OfficeApiCallers = SecurityPolicies.FromModule('/api/office#OfficeApi',
);

/**
 * Avatar-shaped sniff: only Avatar instances carry a non-empty
 * playerId. NPCs and props fail closed without touching the Registry.
 * Lets the read predicates short-circuit cheaply for the common case.
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
 * predicates then fail **closed** (see the closed-fail note below).
 */
let registryRef: OfficeRegistry | null = null;
function lookupRegistry(): OfficeRegistry | null {
  if (registryRef) return registryRef;
  const reg = StuffApi.findByTemplatePath<OfficeRegistry>(REGISTRY_PATH);
  if (reg) registryRef = reg;
  return reg ?? null;
}

/**
 * OfficeLogic — the hot-reloadable logic singleton behind
 * {@link OfficeApi}.
 *
 * Lives at `/obj/api/office`. Holds registry resolution + the playerId
 * short-circuit; durable state lives on `/obj/OfficeRegistry`, whose
 * methods admit this logic singleton (`FromTemplate('/obj/api/office')`)
 * as well as the Api module. Each method is gated
 * `FromModule('/api/office#OfficeApi')` (the Api is the only caller).
 *
 * **No-registry test path fails CLOSED.** Unlike `AccessApi.can`/
 * `isWizard` (which fail *open* because the dispatcher already pre-gated
 * the resolver), governance has no dispatcher-side pre-gate to lean on:
 * a missing Registry means "we cannot prove this player holds office /
 * is the founder", so `holdsOffice`/`isFounder` return `false`,
 * `officesOf`/`roster` return `[]`, `holderOf` returns an `unknown`
 * result, and the mutations no-op. Failing open here would silently
 * grant office authority.
 *
 * @internal
 */
@Unshadowable
export class OfficeLogic extends ApiLogic {
  /** See {@link OfficeApi.holderOf}. */
  @CallSecurity(OfficeApiCallers)
  public async holderOf(officeKey: string): Promise<OfficeHolderResult> {
    const reg = lookupRegistry();
    if (!reg) return { kind: 'unknown', officeKey };
    return reg.holderOf(officeKey);
  }

  /** See {@link OfficeApi.holdsOffice}. */
  @CallSecurity(OfficeApiCallers)
  public async holdsOffice(
    subject: Stuff | null,
    officeKey: string,
  ): Promise<boolean> {
    if (subject === null) return false;
    const reg = lookupRegistry();
    if (!reg) return false;
    const playerId = playerIdOfQuick(subject);
    if (playerId === null) return false;
    return reg.holdsOffice(playerId, officeKey);
  }

  /** See {@link OfficeApi.officesOf}. */
  @CallSecurity(OfficeApiCallers)
  public async officesOf(subject: Stuff | null): Promise<string[]> {
    if (subject === null) return [];
    const reg = lookupRegistry();
    if (!reg) return [];
    const playerId = playerIdOfQuick(subject);
    if (playerId === null) return [];
    return reg.officesOf(playerId);
  }

  /** See {@link OfficeApi.isFounder}. */
  @CallSecurity(OfficeApiCallers)
  public async isFounder(subject: Stuff | null): Promise<boolean> {
    if (subject === null) return false;
    const reg = lookupRegistry();
    if (!reg) return false;
    const playerId = playerIdOfQuick(subject);
    if (playerId === null) return false;
    return reg.isFounder(playerId);
  }

  /** See {@link OfficeApi.roster}. */
  @CallSecurity(OfficeApiCallers)
  public async roster(): Promise<OfficeRosterRow[]> {
    const reg = lookupRegistry();
    if (!reg) return [];
    return reg.roster();
  }

  /** See {@link OfficeApi.founderLabel}. */
  @CallSecurity(OfficeApiCallers)
  public founderLabel(): string {
    const reg = lookupRegistry();
    if (!reg) return '(founder unset)';
    return reg.founderLabel();
  }

  /** See {@link OfficeApi.assign}. */
  @CallSecurity(OfficeApiCallers)
  public async assign(
    playerId: string,
    officeKey: string,
  ): Promise<OfficeAssignResult> {
    const reg = lookupRegistry();
    if (!reg) return { changed: false, priorHolderId: null, ok: false };
    return reg.assign(playerId, officeKey);
  }

  /** See {@link OfficeApi.vacate}. */
  @CallSecurity(OfficeApiCallers)
  public async vacate(officeKey: string): Promise<boolean> {
    const reg = lookupRegistry();
    if (!reg) return false;
    return reg.vacate(officeKey);
  }

  /** See {@link OfficeApi._resetRegistryRefForReload}. */
  @CallSecurity(OfficeApiCallers)
  public _resetRegistryRefForReload(): void {
    registryRef = null;
  }
}
