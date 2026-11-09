// AppLogic — the hot-reloadable logic singleton behind AppApi.
// (Doc comment lives on the class declaration below so @internal lands
// on the reflection TypeDoc emits, not on the module.)

import { ApiLogic } from '../../../lib/stuff/ApiLogic';
import { CallSecurity, Unshadowable } from '../../../lib/security/decorators';
import { SecurityPolicies } from '../../../lib/security/SecurityPolicies';
import {
  AppSettings,
  AppSettingFallbacks,
  AppSettingKeys,
  AppSettingTiers,
  SettingTierVerbs,
  type SettingTier,
} from '../../../lib/config/AppSettings';
import { Office } from '../../../lib/governance/Office';
import { ExecutionContextApi } from '../../../api/execution-context';
import type { Stuff } from '../../../lib/stuff/Stuff';
import type { SettingWrite } from '../../../api/app';

/** The Prime Minister's seat — Tier B's setter (wizard-axis D12). */
const PRIME_MINISTER = 'prime-minister';
/** The Governor's seat — the Schedule's `reserve.*` rows are its own. */
const GOVERNOR = 'central-bank-governor';
/** The Schedule rows the Governor sets though their tier is B. */
const RESERVE_PREFIX = 'reserve.';

const AppApiCallers = SecurityPolicies.FromModule('/api/app#AppApi');

/**
 * AppLogic — the hot-reloadable logic singleton behind {@link AppApi}.
 *
 * Lives at `/platform/idea/api/app` (a stateless `Stuff` singleton, no backing
 * `Template`); `AppApi`'s public statics forward here via
 * `StuffApi.singletonSync`. Any module that grabs this singleton and
 * calls a method other than through the Api gets `SecurityError`.
 *
 * Stateless by construction (no `onCreate` override): the settings
 * state lives on the `AppSettings` cached singleton Document, not here;
 * each method reads/writes that cache. No intra-singleton self-calls.
 *
 * The `FromModule` gate is applied **per public method**, not at the
 * class level — see {@link MaterialLogic} for why.
 *
 * @internal
 */
/** Dotted key → tier, built once on first read (load on use). */
let tierByKey: Map<string, SettingTier> | null = null;
function tierIndex(): Map<string, SettingTier> {
  if (tierByKey) return tierByKey;
  const out = new Map<string, SettingTier>();
  for (const [prop, key] of Object.entries(AppSettingKeys)) {
    out.set(key, AppSettingTiers[prop as keyof typeof AppSettingKeys]);
  }
  tierByKey = out;
  return out;
}

@Unshadowable
export class AppLogic extends ApiLogic {
  /** See {@link AppApi.tierOf}. */
  @CallSecurity(AppApiCallers)
  public tierOf(key: string): SettingTier {
    return tierIndex().get(key) ?? 'B';
  }

  /** See {@link AppApi.whoSets}. */
  @CallSecurity(AppApiCallers)
  public whoSets(key: string): string {
    const tier = tierIndex().get(key) ?? 'B';
    if (tier === 'B') return "the Prime Minister's — `config`";
    const office = Office.byKey(tier.slice(2));
    return `the ${office?.getDisplayName() ?? tier.slice(2)}'s — \`${SettingTierVerbs[tier]}\``;
  }

  /** See {@link AppApi.seatFor}. */
  @CallSecurity(AppApiCallers)
  public seatFor(key: string): string | null {
    const tier = tierIndex().get(key) ?? 'B';
    return tier.startsWith('C:') ? tier.slice(2) : null;
  }

  /** See {@link AppApi.setting}. */
  @CallSecurity(AppApiCallers)
  public setting(key: string): string {
    return AppSettings.getCached().getValue(key) ?? AppSettingFallbacks[key] ?? '';
  }

  /** See {@link AppApi.settings}. */
  @CallSecurity(AppApiCallers)
  public settings(): Record<string, string> {
    return AppSettings.getCached().getValues();
  }

  /**
   * See {@link AppApi.setSetting}. ⭐ The tier rule lives HERE, on the
   * write (controller-liquidity D9): the key must be `seat`'s to set and
   * the acting principal — derived from the dispatched context, never
   * passed, so it cannot be spoofed — must hold `seat`. Every refusal
   * comes before the write.
   */
  @CallSecurity(AppApiCallers)
  public async setSetting(
    key: string,
    value: string,
    seat: string = PRIME_MINISTER
  ): Promise<SettingWrite> {
    const tier = tierIndex().get(key) ?? 'B';
    const setters = tier.startsWith('C:')
      ? [tier.slice(2)]
      : key.startsWith(RESERVE_PREFIX)
        ? [PRIME_MINISTER, GOVERNOR]
        : [PRIME_MINISTER];
    if (!setters.includes(seat)) {
      const office = Office.byKey(tier.startsWith('C:') ? tier.slice(2) : PRIME_MINISTER);
      const who =
        tier === 'B'
          ? "the Prime Minister's — `config`"
          : `the ${office?.getDisplayName() ?? tier.slice(2)}'s — \`${SettingTierVerbs[tier]}\``;
      return { ok: false, reason: 'wrong-seat', tier, whoSets: who };
    }
    // Lazy: AppApi loads at boot ahead of the Compact (the BankingLogic →
    // EmploymentApi precedent); a static import is a module cycle.
    const { CompactApi } = await import('../../../api/compact');
    const actor = (ExecutionContextApi.getActingAuthor() as Stuff | null) ?? null;
    if (!actor || !(await CompactApi.holdsOffice(actor, seat))) {
      return { ok: false, reason: 'not-seated', tier, whoSets: seat };
    }
    const row = AppSettings.getCached();
    const before = row.getValue(key) ?? '';
    row.setValue(key, value);
    await row.save();
    return { ok: true, before };
  }
}
