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
     * Eval-side knobs, session-lifetime so they round-trip through
     * `settings get / set`. ⭐ `eval.timeoutMs` is ENFORCED: the
     * wall-clock budget of one invocation, sync loop, microtask loop and
     * awaited tail alike (ScriptApi.runSandboxed). There is no depth
     * knob: V8 enforces its own stack limit, and its RangeError comes
     * back as an ordinary eval error.
     */
    static settings: SettingsSchemaEntry[] = [
      {
        key: 'eval.timeoutMs',
        type: SettingTypes.Number,
        default: 5000,
        lifetime: 'session',
        description:
          'Wall-clock budget (ms) for one `eval` invocation, the awaited ' +
          'tail included. Past it the eval stops at its next await and ' +
          'answers `timed out`; host work it already started may finish.',
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
        'platform/cmd/author/clone.yaml',
        'platform/cmd/author/reload.yaml',
        'platform/cmd/author/typecheck.yaml',
        'platform/cmd/author/destruct.yaml',
        'platform/cmd/author/eval.yaml',

        // Soul authoring — emote catalog mint / edit / delete / show /
        // list. Gated identically to the rest of the AuthorMixin suite:
        // non-authors don't see the verb in their recency stack.
        'platform/cmd/social/soul.yaml',
        // ⚠ `platform/cmd/stream/stream.yaml` LEFT this list (broadcast-ready
        // D1): the stream is every played body's own, so `BroadcastMixin`
        // affords it; `requiresStreamer` still gates who may run it.
        // Wizard conferral — `wizard grant/revoke <player>`. Afforded on
        // the operator command surface like the rest of this suite, but
        // *authorized* on the orthogonal archwizard axis: `wizard.yaml`
        // carries `requiresArchwizard`, so an author who isn't an
        // archwizard sees the verb but can't run it.
        'platform/cmd/author/wizard.yaml',
        // ⚠ `platform/cmd/system/press.yaml` LEFT this list. Bare `press` is the
        // READ — the news, and the command that opens the news card —
        // so contributing it only here made the news a surface an
        // ordinary player could not ask for. It is contributed by
        // `ShelledCharacter` now, and its publishing SUBCOMMANDS carry
        // `requiresPublisher` for themselves.
        // Banking surface — the reserve (the Governor's: `requiresGovernor`)
        // and the Treasury (the Minister of Finance's, below). Each is gated
        // on a SEAT; none asks the wizard. (`house` is every character's
        // since controllers-are-io W7 — `Persona` affords it.)
        'platform/cmd/banking/reserve.yaml',
        // The Treasury's surface (economic bootstrap D9) — the Minister of
        // Finance's book and appropriation; `requiresFinanceMinister`
        // gates the act, the affordance sits beside the reserve's.
        'platform/cmd/banking/treasury.yaml',
        // The content-pack installer's operator surface — `pack status /
        // install --dry-run / sync / diff / resolve / pin`. Afforded on the
        // operator command surface like the rest of this suite, but
        // *authorized* on title: `pack.yaml` carries
        // `requiresPackInstaller` (holding /compact/executive — the PM and
        // her staff, never wizardness), so an author who is not on the
        // executive sees the verb but can't run it.
        'platform/cmd/author/pack.yaml',
        // The app-settings surface — `config [key [value]]`, three shapes
        // by arity (list · show · set; controller-liquidity W7a).
        //
        // ⭐ Gated on the Prime Minister's seat (`requiresPrimeMinister`,
        // wizard-axis D12): retuning the world's Tier B dials is the chief
        // executive's act, not authoring TypeScript. Tier C keys (taxes,
        // levies, capital controls) are refused inside, naming the seat
        // and verb that set them (`treasury set`, `reserve set`). It used
        // to carry the wizard validator — the nearest strong thing to
        // hand, which a missing authority is not.
        //
        // ⚠⚠ It was afforded NOWHERE until a live drive tried to type
        // it: view shipped, controller shipped, `ConfigController.test`
        // green — and green because it loads `config.yaml` by path and
        // calls the controller directly, so it never asked the binder
        // whether anyone could reach the verb. Same shape as `eat` and
        // `vomit` in this same build, and `feel`/`taste` before them:
        // **missing enabling data fails CLOSED and SILENT**, and only a
        // drive types the word.
        'platform/cmd/system/config.yaml',
        'platform/cmd/system/config-show.yaml',
        'platform/cmd/system/config-set.yaml',
        // Author-diagnostics reader — `errors list/raw/clear` over the
        // diagnostics store (compile / runtime / console). Afforded here;
        // what you see is what you hold (`DiagnosticApi.list` filters to
        // your extents and the packs you maintain; compile rows are open).
        // The finer gates (raw → the Prime Minister, clear → title or
        // author-of-path) are enforced in the controller / DiagnosticApi.
        'platform/cmd/system/errors.yaml',
        // In-runtime VCS — `git status/diff/log/publish/revert` over the
        // source tree. Reading is open; `publish`/`revert` ask the one
        // source-write predicate per touched file in `GitLogic` (a `.ts`:
        // the wizard axis and title; content: title).
        'platform/cmd/system/git.yaml',
        // Test-world staging — `testharness clock|weather`. Afforded on the
        // operator surface beside `git`; the view is `testOnly`, so outside
        // a test world the loader withholds it and this key resolves to
        // nothing (the verb is unknown there, by design).
        'platform/cmd/system/testharness.yaml',
        // Test-world competence staging — `practice` fabricates one
        // Transcript deed. Fabricating a record is not something anybody
        // may do in a played world, credential or not, so it is a
        // test-world verb (`testOnly`) like `testharness`, not a wizard's.
        'platform/cmd/system/practice.yaml',
        // The authoring CARDS. Opening one asks for nothing: what you can
        // read is open, and what you can write is decided per path by the
        // CMS routes (title; a `.ts` also asks for the wizard axis).
        'platform/cmd/author/cms.yaml',
        'platform/cmd/author/studio.yaml',
      ],
      peers: [],
      environment: [],
    };
  }
  return AuthorMixin;
}
