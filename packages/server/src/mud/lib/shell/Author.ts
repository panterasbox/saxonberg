/**
 * AuthorMixin — object-lifecycle and code-execution verbs on
 * `ShelledCharacter`.
 *
 * The mixin owns no state v1: the verbs are universal in capability,
 * gated by permission (deferred), and the per-target witness seams
 * (`canClone` / `canReload` / `canDestruct` / `canTeleport`) live on
 * the targets themselves rather than as actor-side configuration.
 *
 * Composition: applied to `ShelledCharacter` after `WorkspaceMixin`
 * and `AliasMixin`.
 */

import type { MixinConstructor } from '../mixin';
import type { CommandContributions } from '../../api/command';
import type { SettingsSchemaEntry } from './Environment';
import { SettingTypes } from './Environment';

export interface Author {
  // No public-method surface v1 — the verbs do their own work
  // through the lower-layer Apis. The mixin's value is the
  // commandContributions list and the schema declarations.
}

export function AuthorMixin<TBase extends MixinConstructor>(Base: TBase) {
  class AuthorMixin extends Base implements Author {
    static _mixinName = 'AuthorMixin';

    /**
     * No persistent fields v1 — the mixin contributes verbs and
     * schema only, not stored state.
     */
    static persistentFields: string[] = [];

    /**
     * Eval-side knobs declared as session-lifetime settings so they
     * round-trip through `settings get / set` even though the runtime
     * defaults are baked into `EvalScript.run`. Per the slate, these
     * register here as schema; consumption lands when the eval
     * sandbox honors them.
     */
    static settings: SettingsSchemaEntry[] = [
      {
        key: 'eval.timeoutMs',
        type: SettingTypes.Number,
        default: 1000,
        lifetime: 'session',
        description:
          'Wall-clock budget (ms) for one `eval` invocation. v1 ' +
          'declares the schema; the sandbox honors it when the ' +
          'isolated-vm migration lands.',
      },
      {
        key: 'eval.maxDepth',
        type: SettingTypes.Number,
        default: 32,
        lifetime: 'session',
        description:
          'Maximum recursion depth inside an `eval` body. Same ' +
          'declared-now, consumed-later story as eval.timeoutMs.',
      },
    ];

    static commandContributions: CommandContributions = {
      self: [
        'clone.yaml',
        'reload.yaml',
        'destruct.yaml',
        'eval.yaml',
        'teleport.yaml',
        // Soul authoring — emote catalog mint / edit / delete / show /
        // list. Gated identically to the rest of the AuthorMixin suite:
        // non-authors don't see the verb in their recency stack.
        'soul.yaml',
      ],
      environment: [],
      inventory: [],
      peers: [],
    };
  }
  return AuthorMixin;
}
