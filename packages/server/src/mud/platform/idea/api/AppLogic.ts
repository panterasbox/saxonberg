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

  /** See {@link AppApi.setSetting}. */
  @CallSecurity(AppApiCallers)
  public async setSetting(key: string, value: string): Promise<void> {
    const row = AppSettings.getCached();
    row.setValue(key, value);
    await row.save();
  }
}
