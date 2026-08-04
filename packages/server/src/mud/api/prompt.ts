/**
 * PromptApi — server-side prompt substrate.
 *
 * Pattern mirrors `MqlSubscriptionApi` in `api/mql-subscription.ts`:
 * per-Interactive registry of pending prompts, outbound envelopes via
 * `MessageApi.sendEnvelope`, inbound entry points called by the
 * backend inbound handler table (`backend/inbound/prompt.ts`); tests
 * drive them directly too.
 *
 * This Api is a thin forwarding shell: the registry + push lifecycle
 * live in the hot-reloadable {@link PromptLogic} singleton at
 * `/obj/api/prompt`, reached synchronously via `StuffApi.singletonSync`.
 * `dest /obj/api/prompt` reloads it.
 *
 * See:
 *   - `docs/subsystems/prompt.md`
 *   - `docs/slates/tails/prompt-stack-slate.md`
 */

import type {
  PromptChoice,
  PromptRefreshNote,
} from '@saxonberg/types';
import type { Stuff } from '../lib/stuff/Stuff';
import type Interactive from '../obj/Interactive';
import type { Mml } from './mml';
import { MixinApi } from './mixin';
import { StuffApi } from './stuff';
import { HotReloadApi } from './hot-reload';
import { SecurityApi } from './security';
import { PromptLogic } from '../obj/api/PromptLogic';
import { fileURLToPath } from 'url';

/**
 * Awaiting prompt promises reject with this when the prompt is
 * cancelled — by the player (`prompt-cancel` wire message or the
 * `prompt cancel` verb), by server-side `PromptApi.cancel` /
 * `cancelAll`, or by disconnect cleanup.
 *
 * Codebase precedent: `MqlPermissionError`, `SecurityError`,
 * `ContainmentError`. Typed `Error` subclasses give clean
 * `instanceof` branching at controller catch sites.
 *
 *   try {
 *     const sword = await PromptApi.mqlObject(iact, label, matches);
 *   } catch (err) {
 *     if (err instanceof PromptCancelledError) {
 *       // err.reason discriminates 'cancelled' vs 'host-disconnected'
 *       return abortCommand();
 *     }
 *     throw err;
 *   }
 */
export class PromptCancelledError extends Error {
  constructor(
    public readonly reason: 'cancelled' | 'host-disconnected',
  ) {
    super(`Prompt cancelled: ${reason}`);
    this.name = 'PromptCancelledError';
  }
}

/**
 * Validator predicate for `PromptApi` push opts. Returning `true`
 * resolves the await; returning a string (or a Promise that
 * resolves to one) keeps the prompt alive and emits a
 * `prompt-validation-failed` envelope carrying the message — the
 * client renders the error inline and awaits a fresh response.
 *
 * **Async-permitted** — unlike command validators (which are
 * sync-by-design because the dispatcher's validator pass is sync),
 * prompt validators run inside the prompt's already-async
 * lifecycle. Returning `Promise<true | string>` works naturally;
 * DB-uniqueness checks and external-service look-ups have a home
 * here without a sync + preload pattern.
 *
 * Substrate cancellation safety: if a prompt is cancelled while a
 * validate is in flight, the substrate discards the validator's
 * eventual result (a `cancelled` flag on the resolver record
 * prevents the late `resolve` call).
 *
 * The validator sees the **typed result T**, not the raw wire
 * string. For `confirm`, that's `boolean`; for `mqlObject`,
 * `Stuff | null`; for `mqlMany`, `Stuff[]`. The substrate handles
 * the wire-string-to-T decoding (including `mqlMany` bounds
 * enforcement and `mqlObject` stuffId lookup) BEFORE running the
 * validator.
 */
export type PromptValidator<T> = (
  response: T,
) => true | string | Promise<true | string>;

/* ─────────────────────────── Push opts ─────────────────────────── */

/**
 * Shared push-opts shape across all five Tier 1 methods. Per the
 * requirements doc:
 *
 *   - `foreground` (default `true`): foreground push tells the
 *     client to auto-focus the new prompt; background push joins
 *     the stack without seizing input.
 *   - `validate`: optional predicate the substrate runs against the
 *     decoded typed response before resolving the await; returning
 *     a string keeps the prompt alive and emits a
 *     `prompt-validation-failed` envelope.
 *   - `body`: optional long-form prose for the terminal scroll. The
 *     substrate emits a `MessageFrame` on `world.prompt` with
 *     `payload: { promptId }` so the client can correlate the
 *     body frame with the prompt envelope (click-to-focus, visual
 *     association in deep stacks).
 */
export interface PromptOpts<T> {
  foreground?: boolean;
  validate?: PromptValidator<T>;
  body?: string | Mml;
}

export interface ChoicePromptOpts<T extends string = string>
  extends PromptOpts<T> {
  defaultChoice?: T;
}

export interface TextPromptOpts extends PromptOpts<string> {
  placeholder?: string;
}

export interface ComposePromptOpts extends PromptOpts<string> {
  placeholder?: string;
  /**
   * Text the composer opens with. Pass the **current** body when the
   * prompt is an edit — without it the box opens empty and posting
   * replaces the whole article, so "edit" silently means "retype".
   */
  initial?: string;
  /** Hint the client may show an "open in editor" escalation affordance. */
  allowEditorEscalation?: boolean;
}

export interface MqlManyPromptOpts extends PromptOpts<Stuff[]> {
  /** Minimum selection count. Default 0. */
  min?: number;
  /** Maximum selection count. Default unbounded. */
  max?: number;
}

/* ─────────────────────────── PromptApi ─────────────────────────── */

const LOGIC_PATH = '/obj/api/prompt';
const LOGIC_CLASS_FILE = fileURLToPath(
  new URL('../obj/api/PromptLogic', import.meta.url)
);

/** Resolve the HMR-able PromptLogic singleton (sync). */
function logic(): PromptLogic {
  return StuffApi.singletonSync(
    LOGIC_PATH,
    () =>
      new ((HotReloadApi.getCurrentExport(
        LOGIC_CLASS_FILE,
        'PromptLogic'
      ) as typeof PromptLogic | null) ?? PromptLogic)()
  );
}

/**
 * `PromptApi` — owns the per-Interactive prompt stack server-side
 * (state lives in the {@link PromptLogic} singleton).
 *
 * Five Tier 1 methods (`choice`/`confirm`/`text`/`mqlObject`/`mqlMany`),
 * inbound entry points (`handleResponse`/`handleCancel`), and
 * server-side cancellation (`cancel`/`cancelAll`). Outbound envelopes
 * ride `MessageApi.sendEnvelope`. Tests reset via `_clearAllForTesting`.
 */
export class PromptApi {
  /* ────────────────── Tier 1: choice ────────────────── */

  public static choice<T extends string = string>(
    interactive: Interactive,
    label: string,
    choices: PromptChoice[],
    opts?: ChoicePromptOpts<T>,
  ): Promise<T> {
    return logic().choice(interactive, label, choices, opts);
  }

  /* ────────────────── Tier 1: confirm ────────────────── */

  public static confirm(
    interactive: Interactive,
    label: string,
    defaultAnswer: 'yes' | 'no' = 'no',
    opts?: PromptOpts<boolean>,
  ): Promise<boolean> {
    return logic().confirm(interactive, label, defaultAnswer, opts);
  }

  /* ────────────────── Tier 1: text ────────────────── */

  public static text(
    interactive: Interactive,
    label: string,
    opts?: TextPromptOpts,
  ): Promise<string> {
    return logic().text(interactive, label, opts);
  }

  /* ────────────────── Tier 1: compose ────────────────── */

  /**
   * Multiline body-composition prompt — the interactive route to a post
   * body. The client renders a `<textarea>` (markdown; optional live MML
   * preview). A shared capability (forums first; CMS/wiki later); the
   * response is the raw markdown string.
   */
  public static compose(
    interactive: Interactive,
    label: string,
    opts?: ComposePromptOpts,
  ): Promise<string> {
    return logic().compose(interactive, label, opts);
  }

  /* ────────────────── Tier 1: mqlObject ────────────────── */

  public static mqlObject(
    interactive: Interactive,
    label: string,
    matches: Stuff[],
    opts?: PromptOpts<Stuff | null>,
  ): Promise<Stuff | null> {
    return logic().mqlObject(interactive, label, matches, opts);
  }

  /* ────────────────── Tier 1: mqlMany ────────────────── */

  public static mqlMany(
    interactive: Interactive,
    label: string,
    matches: Stuff[],
    opts?: MqlManyPromptOpts,
  ): Promise<Stuff[]> {
    return logic().mqlMany(interactive, label, matches, opts);
  }

  /* ────────────────── Inbound entry points ────────────────── */

  /**
   * Route a `prompt-response` wire message. Looks up the resolver,
   * decodes the response per the prompt kind, runs the validator (if
   * any), and either resolves the await or emits
   * `prompt-validation-failed` and keeps the prompt alive.
   */
  public static handleResponse(
    interactive: Interactive,
    payload: { promptId: string; response: string },
  ): void {
    logic().handleResponse(interactive, payload);
  }

  /**
   * Route a `prompt-cancel` wire message. Reject the await with
   * `PromptCancelledError { reason: 'cancelled' }` and emit a
   * `prompt-dismissed` envelope.
   */
  public static handleCancel(
    interactive: Interactive,
    payload: { promptId: string },
  ): void {
    logic().handleCancel(interactive, payload);
  }

  /**
   * Server-side single-prompt cancel. Returns `true` if a record was
   * found and cancelled; `false` for unknown ids.
   */
  public static cancel(
    promptId: string,
    reason: 'cancelled' | 'host-disconnected' = 'cancelled',
  ): boolean {
    return logic().cancel(promptId, reason);
  }

  /**
   * Server-side wholesale cancel — every prompt held by `interactive`.
   * Returns the count cancelled. Called from the `prompt cancel` verb
   * controller and `Application.handleUserDisconnect`.
   */
  public static cancelAll(
    interactive: Interactive,
    reason: 'cancelled' | 'host-disconnected',
  ): number {
    return logic().cancelAll(interactive, reason);
  }

  /* ────────────────── Test seams ────────────────── */

  public static _getResolverCountForTesting(): number {
    // The test-only assertion inspects the caller's stack; it must run
    // at the face (where the test is the direct caller), not inside the
    // logic singleton (whose forwarding frames push the .test.ts frame
    // past assertTestOnly's stack window).
    SecurityApi.assertTestOnly('_getResolverCountForTesting');
    return logic()._getResolverCountForTesting();
  }

  public static _getInteractivePromptCountForTesting(
    interactive: Interactive,
  ): number {
    SecurityApi.assertTestOnly('_getInteractivePromptCountForTesting');
    return logic()._getInteractivePromptCountForTesting(interactive);
  }

  public static _clearAllForTesting(): void {
    SecurityApi.assertTestOnly('_clearAllForTesting');
    logic()._clearAllForTesting();
  }

  /**
   * Render the giver's `prompt.format` template into a
   * `PromptRefreshNote` for inclusion in a `DispatchResponseEnvelope`.
   * Reads the template via `giver.getSetting('prompt.format')` when the
   * giver composes `EnvironmentMixin`; otherwise the bare default
   * (`'{{ focus }}>'`). Render failures fall through to the default.
   */
  public static renderPromptRefresh(giver: Stuff): PromptRefreshNote {
    return logic().renderPromptRefresh(giver);
  }
}

/* ─────────────────── Base-prompt rendering ─────────────────── */

/**
 * Build the Liquid render context for the base-prompt template. v1
 * exposes a single variable, `focus`, sourced from
 * `FocusedMixin.getFocus()` when present (otherwise the empty string).
 * Future tokens (`posture`, `location.name`, `time`) land additively
 * here.
 *
 * Module-local helper for `PromptLogic.renderPromptRefresh`; exported
 * solely so the prompt-format unit test can exercise it in isolation
 * (no production consumer outside the prompt subsystem).
 */
// eslint-disable-next-line no-restricted-syntax -- test-only export (white-box unit test); consumed only inside the prompt subsystem
export function buildPromptContext(
  giver: Stuff,
): Record<string, unknown> {
  return {
    focus: MixinApi.isFocused(giver) ? giver.getFocus() : '',
  };
}

SecurityApi.decorateApiClass(PromptApi);
