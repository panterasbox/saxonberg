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

import type { MixinConstructor, FieldMeta } from '../mixin';
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
    static fieldMeta: FieldMeta = {};

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
      {
        key: 'compile.subscribe',
        type: SettingTypes.List,
        default: ['$cwd', 'global'],
        lifetime: 'persistent',
        description:
          'Channels to live-tail for author diagnostics in mudlog. ' +
          'Patterns: "*" (all), a literal channel ("zone.lounge"), a ' +
          'prefix ("lib.*"), or synthetic "$cwd" (the channel for your ' +
          'current source cwd). Mutation awaits a future `errors ' +
          'subscribe` subcommand (the settings-set list-type gap).',
      },
    ];

    static commandContributions: CommandContributions = {
      self: [
        'author/clone.yaml',
        'author/reload.yaml',
        'author/destruct.yaml',
        'author/eval.yaml',
        'author/teleport.yaml',
        // Advancement developer harness — fabricate Transcript deeds so
        // the derive-on-read Competence loop + band conferrals are
        // exercisable without lane-2's real craft verbs. Wizard-gated
        // (requiresWizard) on top of this AuthorMixin visibility.
        'author/practice.yaml',
        // Soul authoring — emote catalog mint / edit / delete / show /
        // list. Gated identically to the rest of the AuthorMixin suite:
        // non-authors don't see the verb in their recency stack.
        'social/soul.yaml',
        // Livestream control plane (PLAN §3). Afforded to the operator
        // command surface like the rest of this suite, but *authorized*
        // on the orthogonal streamer axis — `stream.yaml` carries
        // `requiresStreamer`, so an author who isn't in the `streamers`
        // group sees the verb but can't run it. The split lets a future
        // dedicated streamer-mode affordance narrow visibility without
        // touching the authorization gate.
        'stream/stream.yaml',
        // Wizard conferral — `wizard grant/revoke <player>`. Afforded on
        // the operator command surface like the rest of this suite, but
        // *authorized* on the orthogonal archwizard axis: `wizard.yaml`
        // carries `requiresArchwizard`, so an author who isn't an
        // archwizard sees the verb but can't run it.
        'author/wizard.yaml',
        // ⚠ `system/press.yaml` LEFT this list. Bare `press` is the
        // READ — the news, and the command that opens the news card —
        // so contributing it only here made the news a surface an
        // ordinary player could not ask for. It is contributed by
        // `ShelledCharacter` now, and its publishing SUBCOMMANDS carry
        // `requiresPublisher` for themselves.
        // Banking operator surface — the central-bank faucet (mint subsidy),
        // wage payment, and the P&L read. Afforded on the operator command
        // surface like the rest of this suite; each carries
        // `requiresWizard`, so a non-author sees nothing (no employment
        // relationship yet — operator == wizard in v1).
        'banking/reserve.yaml',
        'banking/house.yaml',
        // Author-diagnostics reader — `errors list/raw/clear` over the
        // diagnostics store (compile / runtime / console). Afforded here;
        // `errors.yaml` carries `requiresAuthor`, so a non-author sees
        // nothing. The finer gates (raw → wizard, clear → author-of-path)
        // are enforced in the controller / DiagnosticApi.
        'system/errors.yaml',
        // In-runtime VCS — `git status/diff/log/publish/revert` over the
        // engine source tree. Afforded on the operator command surface
        // like the rest of this suite; `git.yaml` carries `requiresWizard`
        // (it version-controls engine TS), so a non-wizard sees it but
        // can't run it. The per-affected-path `can('write')` refinement
        // stays in `GitLogic`.
        'system/git.yaml',
        // The authoring CARDS. Afforded on the operator command surface
        // like the rest of this suite; each carries `requiresWizard`
        // (they edit engine content), so a non-wizard sees the verb but
        // cannot run it — the parser floor, not a hidden verb.
        'author/cms.yaml',
        'author/studio.yaml',
      ],
      peers: [],
      environment: [],
    };
  }
  return AuthorMixin;
}
