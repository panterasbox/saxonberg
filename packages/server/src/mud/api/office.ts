/**
 * OfficeApi — thin facade over the `OfficeRegistry` singleton.
 *
 * Stable caller-facing surface for the government-office substrate.
 * Every method delegates through the hot-reloadable {@link OfficeLogic}
 * singleton at `/obj/api/office` to the Registry; the Registry's methods
 * carry `@CallSecurity(AnyOf(FromModule('mud/api/office#OfficeApi'),
 * FromTemplate('/obj/api/office')))` so the security gate denies any
 * caller outside the office subsystem.
 *
 * Two surfaces:
 *   - **Public (ungated) reads** — the occupancy check + roster surface.
 *     Governance is transparent by constitutional design (Art. VII), so
 *     these carry no `@CallSecurity` (mirroring `AccessApi.isWizard`).
 *   - **Gated mutations** — `assign`/`vacate` carry the string-keyed
 *     `FromModule('mud/obj/command/governance/OfficeController')` narrow-
 *     entry (the `AccessApi.setWizardMembership` gate shape). The
 *     **authority** is enforced by the `requiresFoundingAuthority`
 *     subcommand-level validator (the meta governance-root gate), not
 *     re-checked here.
 *
 * Parameter convention (the `gated-api-actor-from-context` rule): the
 * read predicates that take a *subject* accept `Stuff | null` (an Avatar)
 * and let the Logic resolve playerId. The mutations take a resolved
 * `playerId: string` appointee (the controller resolved the MQL target).
 * The **appointer** is never a parameter — it is derived from execution
 * context by `requiresFoundingAuthority`. `vacate(officeKey)` takes no
 * player.
 */

import { SecurityApi } from './security';
import { StuffApi } from './stuff';
import { HotReloadApi } from './hot-reload';
import { CallSecurity } from '../lib/security/decorators';
import { SecurityPolicies } from '../lib/security/SecurityPolicies';
import type { Stuff } from '../lib/stuff/Stuff';
import type {
  OfficeHolderResult,
  OfficeRosterRow,
  OfficeAssignResult,
} from '../lib/governance/Office';
import { OfficeLogic } from '../obj/api/OfficeLogic';
import { fileURLToPath } from 'url';

const LOGIC_PATH = '/obj/api/office';
const LOGIC_CLASS_FILE = fileURLToPath(
  new URL('../obj/api/OfficeLogic', import.meta.url),
);

/** Resolve the HMR-able OfficeLogic singleton (sync). */
function logic(): OfficeLogic {
  return StuffApi.singletonSync(
    LOGIC_PATH,
    () =>
      new ((HotReloadApi.getCurrentExport(
        LOGIC_CLASS_FILE,
        'OfficeLogic',
      ) as typeof OfficeLogic | null) ?? OfficeLogic)(),
  );
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
    return logic().holderOf(officeKey);
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
    return logic().holdsOffice(subject, officeKey);
  }

  /**
   * Every office `subject` holds — the founder's full set when no
   * handoffs exist, a single seat for a handed-off holder, none for
   * anyone else. Public read.
   */
  public static async officesOf(subject: Stuff | null): Promise<string[]> {
    return logic().officesOf(subject);
  }

  /**
   * Is `subject` the founder? Resolves the Avatar → its `User` → the
   * configured `FOUNDER_GOOGLE_EMAIL`/`FOUNDER_TWITCH_HANDLE` credential.
   * False until the founder has logged in. Public read.
   */
  public static async isFounder(subject: Stuff | null): Promise<boolean> {
    return logic().isFounder(subject);
  }

  /**
   * The public transparency roster — every office with its branch,
   * origin, and current holder (explicit playerId or the founder
   * default). Publicly readable (Art. VII).
   */
  public static async roster(): Promise<OfficeRosterRow[]> {
    return logic().roster();
  }

  /** The configured founder display handle (offline presentation). */
  public static founderLabel(): string {
    return logic().founderLabel();
  }

  /**
   * Narrow-entry mutation: set the explicit holder of an office
   * (replacing any prior — auditable). Gated to the `OfficeController`
   * (the `office assign` verb) via the string-keyed `FromModule` policy
   * — string-keyed to avoid a value-level static-import cycle (the
   * `setWizardMembership`/`WizardController` precedent). The *authority*
   * is enforced by the `requiresFoundingAuthority` subcommand validator;
   * this method is the structurally single entry to the handoff write.
   */
  @CallSecurity(
    SecurityPolicies.FromModule(
      'mud/obj/command/governance/OfficeController',
    ),
  )
  public static async assign(
    playerId: string,
    officeKey: string,
  ): Promise<OfficeAssignResult> {
    return logic().assign(playerId, officeKey);
  }

  /**
   * Narrow-entry mutation: clear an office's explicit holder (the seat
   * reverts to the founder default). Office-only — a singular seat has
   * no empty state. Same `OfficeController` gate as `assign`.
   */
  @CallSecurity(
    SecurityPolicies.FromModule(
      'mud/obj/command/governance/OfficeController',
    ),
  )
  public static async vacate(officeKey: string): Promise<boolean> {
    return logic().vacate(officeKey);
  }

  /**
   * HMR seam: drop the cached Registry pointer so the next call
   * re-resolves. Registry state itself is unaffected.
   * @internal
   */
  public static _resetRegistryRefForReload(): void {
    logic()._resetRegistryRefForReload();
  }
}

SecurityApi.decorateApiClass(OfficeApi);
