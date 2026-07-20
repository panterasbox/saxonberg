/**
 * OfficeApi — thin facade over the `OfficeRegistry` singleton.
 *
 * Stable caller-facing surface for the government-office substrate. The
 * facade talks to the Registry **directly** — there is no `OfficeLogic`
 * tier (it held no logic; the antipattern sweep collapsed it). The
 * Registry's methods carry
 * `@CallSecurity(FromModule('/api/office#OfficeApi'))` so the security
 * gate denies any caller outside this facade; behavior hot-reloads with
 * the Registry itself (an `/obj/` singleton).
 *
 * Two surfaces:
 *   - **Public (ungated) reads** — the occupancy check + roster surface.
 *     Governance is transparent by constitutional design (Art. VII), so
 *     these carry no `@CallSecurity` (mirroring `AccessApi.isWizard`).
 *   - **Gated mutations** — `assign`/`vacate` carry the string-keyed
 *     `FromModule('/obj/command/governance/OfficeController')` narrow-
 *     entry. `FromModule` matches the cloned controller by its class
 *     module id (code provenance), so the per-execution clone is admitted
 *     directly. The **authority** is enforced by the
 *     `requiresFoundingAuthority` subcommand-level validator (the meta
 *     governance-root gate), not re-checked here.
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
 * Parameter convention (the `gated-api-actor-from-context` rule): the
 * read predicates that take a *subject* accept `Stuff | null` (an Avatar)
 * and resolve playerId here. The mutations take a resolved
 * `playerId: string` appointee (the controller resolved the MQL target).
 * The **appointer** is never a parameter — it is derived from execution
 * context by `requiresFoundingAuthority`. `vacate(officeKey)` takes no
 * player.
 */

import { StuffApi } from './stuff';
import { CallSecurity } from '../lib/security/decorators';
import { SecurityPolicies } from '../lib/security/SecurityPolicies';
import { TemplatePaths } from '../lib/paths';
import type { Stuff } from '../lib/stuff/Stuff';
import type {
  OfficeHolderResult,
  OfficeRosterRow,
  OfficeAssignResult,
} from '../lib/governance/Office';
import type OfficeRegistry from '../obj/OfficeRegistry';

const REGISTRY_PATH = TemplatePaths.officeRegistry;

/**
 * Avatar-shaped sniff: only Avatar instances carry a non-empty
 * playerId. NPCs and props fail closed without touching the Registry.
 */
function playerIdOfQuick(subject: Stuff): string | null {
  const id = subject.getPlayerId();
  return id && id.length > 0 ? id : null;
}

/**
 * Resolve the Registry without forcing a clone. In production the
 * Registry is cloned by `AppBootstrap`, so this returns it cheaply. In
 * test harnesses without a live Registry it returns `null` — the public
 * predicates then fail **closed** (see the class doc).
 */
let registryRef: OfficeRegistry | null = null;
function lookupRegistry(): OfficeRegistry | null {
  if (registryRef) return registryRef;
  const reg = StuffApi.findByTemplatePath<OfficeRegistry>(REGISTRY_PATH);
  if (reg) registryRef = reg;
  return reg ?? null;
}

export class OfficeApi {
  /**
   * Who holds an office — the explicit handed-off holder if one is
   * stored, else the founder (presented by handle even while offline).
   * Public read.
   */
  public static async holderOf(
    officeKey: string,
  ): Promise<OfficeHolderResult> {
    const reg = lookupRegistry();
    if (!reg) return { kind: 'unknown', officeKey };
    return reg.holderOf(officeKey);
  }

  /**
   * Does `subject` (an Avatar) hold `officeKey`? Explicit-holder match,
   * OR (no explicit holder AND the subject is the founder). Public read.
   * Non-Avatar / null subjects fail closed.
   */
  public static async holdsOffice(
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

  /**
   * Every office `subject` holds — the founder's full set when no
   * handoffs exist, a single seat for a handed-off holder, none for
   * anyone else. Public read.
   */
  public static async officesOf(subject: Stuff | null): Promise<string[]> {
    if (subject === null) return [];
    const reg = lookupRegistry();
    if (!reg) return [];
    const playerId = playerIdOfQuick(subject);
    if (playerId === null) return [];
    return reg.officesOf(playerId);
  }

  /**
   * Is `subject` the founder? Resolves the Avatar → its `User` → the
   * configured `FOUNDER_GOOGLE_EMAIL`/`FOUNDER_TWITCH_HANDLE` credential.
   * False until the founder has logged in. Public read.
   */
  public static async isFounder(subject: Stuff | null): Promise<boolean> {
    if (subject === null) return false;
    const reg = lookupRegistry();
    if (!reg) return false;
    const playerId = playerIdOfQuick(subject);
    if (playerId === null) return false;
    return reg.isFounder(playerId);
  }

  /**
   * The public transparency roster — every office with its branch,
   * origin, and current holder (explicit playerId or the founder
   * default). Publicly readable (Art. VII).
   */
  public static async roster(): Promise<OfficeRosterRow[]> {
    const reg = lookupRegistry();
    if (!reg) return [];
    return reg.roster();
  }

  /** The configured founder display handle (offline presentation). */
  public static founderLabel(): string {
    const reg = lookupRegistry();
    if (!reg) return '(founder unset)';
    return reg.founderLabel();
  }

  /**
   * Narrow-entry mutation: set the explicit holder of an office
   * (replacing any prior — auditable). Gated to the `OfficeController`
   * (the `office assign` verb) via the string-keyed `FromModule` policy
   * — string-keyed to avoid a value-level static-import cycle. The
   * controller is cloned per execution, and `FromModule` matches it by
   * its **class module id** (code provenance), so the cloned instance is
   * admitted directly — no `FromTemplate` arm needed. The *authority* is
   * enforced by the `requiresFoundingAuthority` subcommand validator;
   * this method is the structurally single entry to the handoff write.
   */
  @CallSecurity(
    SecurityPolicies.FromModule('/obj/command/governance/OfficeController'),
  )
  public static async assign(
    playerId: string,
    officeKey: string,
  ): Promise<OfficeAssignResult> {
    const reg = lookupRegistry();
    if (!reg) return { changed: false, priorHolderId: null, ok: false };
    return reg.assign(playerId, officeKey);
  }

  /**
   * Narrow-entry mutation: clear an office's explicit holder (the seat
   * reverts to the founder default). Office-only — a singular seat has
   * no empty state. Same `OfficeController` `FromModule` gate as `assign`.
   */
  @CallSecurity(
    SecurityPolicies.FromModule('/obj/command/governance/OfficeController'),
  )
  public static async vacate(officeKey: string): Promise<boolean> {
    const reg = lookupRegistry();
    if (!reg) return false;
    return reg.vacate(officeKey);
  }

  /**
   * HMR seam: drop the cached Registry pointer so the next call
   * re-resolves. Registry state itself is unaffected.
   * @internal
   */
  public static _resetRegistryRefForReload(): void {
    registryRef = null;
  }
}
