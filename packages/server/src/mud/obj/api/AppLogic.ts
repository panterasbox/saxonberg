// AppLogic — the hot-reloadable logic singleton behind AppApi.
// (Doc comment lives on the class declaration below so @internal lands
// on the reflection TypeDoc emits, not on the module.)

import { Idea } from '../../lib/stuff/Idea';
import { CallSecurity, Unshadowable } from '../../lib/security/decorators';
import { SecurityPolicies } from '../../lib/security/SecurityPolicies';
import { AppSettings } from '../../lib/config/AppSettings';

const AppApiCallers = SecurityPolicies.FromModule('/api/app#AppApi');

/**
 * AppLogic — the hot-reloadable logic singleton behind {@link AppApi}.
 *
 * Lives at `/obj/api/app` (a stateless `Stuff` singleton, no backing
 * `Template`); `AppApi`'s public statics forward here via
 * `StuffApi.singletonSync`. Any module that grabs this singleton and
 * calls a method other than through the Api gets `SecurityError`.
 *
 * Stateless by construction (no `PostRegistrationMixin`): the settings
 * state lives on the `AppSettings` cached singleton Document, not here;
 * each method reads/writes that cache. No intra-singleton self-calls.
 *
 * The `FromModule` gate is applied **per public method**, not at the
 * class level — see {@link MaterialLogic} for why.
 *
 * @internal
 */
@Unshadowable
export class AppLogic extends Idea {
  /** See {@link AppApi.setting}. */
  @CallSecurity(AppApiCallers)
  public setting(key: string): string {
    return AppSettings.getCached().getValue(key) ?? '';
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
