/**
 * PromptApi — server-side prompt substrate.
 *
 * Pattern mirrors `MqlSubscriptionApi` in `api/mql-subscription.ts`:
 * per-Interactive registry of pending prompts, outbound envelopes via
 * `MessageApi.sendEnvelope`, inbound entry points called by the
 * application dispatcher (Wave 3 in the plan; tests drive them
 * directly).
 *
 * See:
 *   - `docs/requirements/prompt-substrate-requirements.md`
 *   - `docs/plans/prompt-substrate-plan.md`
 *   - `docs/slates/prompt-stack-slate.md`
 */

import { nanoid } from 'nanoid';
import type {
  ChoicePromptNote,
  ConfirmPromptNote,
  TextPromptNote,
  MqlObjectPromptNote,
  MqlManyPromptNote,
  PromptChoice,
  PromptDismissedNote,
  PromptEnvelope,
  PromptRefreshNote,
} from '@saxonberg/types';
import type { Stuff } from '../lib/stuff/Stuff';
import type { Interactive } from '../obj/Interactive';
import type { Sensor } from '../lib/message/Sensor';
import type { Mml } from './mml';
import { MessageApi } from './message';
import { MixinApi } from './mixin';
import { StuffApi } from './stuff';
import { SecurityApi } from './security';
import { DescribeApi } from './describe';
import { ProseApi } from './prose';

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

export interface MqlManyPromptOpts extends PromptOpts<Stuff[]> {
  /** Minimum selection count. Default 0. */
  min?: number;
  /** Maximum selection count. Default unbounded. */
  max?: number;
}

/* ─────────────────────── Internal record types ─────────────────── */

/**
 * Per-prompt resolver record. The `kind` discriminator drives the
 * wire-response decode in `handleResponse`. `cancelled` is the
 * race-safety flag: a late validator result on an already-cancelled
 * record short-circuits before calling `resolve`.
 */
interface ResolverRecord {
  promptId: string;
  interactive: Interactive;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  resolve: (value: any) => void;
  reject: (err: Error) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  validate?: PromptValidator<any>;
  kind: 'choice' | 'confirm' | 'text' | 'mqlObject' | 'mqlMany';
  // mqlMany-only:
  min?: number;
  max?: number;
  cancelled: boolean;
}

/* ─────────────────────────── PromptApi ─────────────────────────── */

/**
 * `PromptApi` — owns the per-Interactive prompt stack server-side.
 *
 * Five Tier 1 methods:
 *
 *   - `choice<T>(iact, label, choices, opts?)` → `Promise<T>`
 *   - `confirm(iact, label, defaultAnswer?, opts?)` → `Promise<boolean>`
 *   - `text(iact, label, opts?)` → `Promise<string>`
 *   - `mqlObject(iact, label, matches, opts?)` → `Promise<Stuff | null>`
 *   - `mqlMany(iact, label, matches, opts?)` → `Promise<Stuff[]>`
 *
 * Inbound entry points: `handleResponse` (called by
 * `Application.processUserMessage` on `prompt-response` wire
 * messages — Wave 3 wires this), `handleCancel` (on `prompt-cancel`).
 * Both are public so tests can drive the substrate directly without
 * routing through the application dispatcher.
 *
 * Server-side cancellation: `cancel(promptId, reason?)` cancels one
 * pending prompt; `cancelAll(interactive, reason)` cancels every
 * prompt held by an Interactive (called from the controller of the
 * `prompt cancel` verb and from `Application.handleUserDisconnect`).
 *
 * Outbound envelopes ride `MessageApi.sendEnvelope(holder, template)` —
 * the same Sensor pipeline `MqlSubscriptionApi` uses. Shadow filters
 * and audit observers see prompt envelopes on the same channel they
 * see dispatch responses and subscription deltas.
 *
 * Substrate state is static (no instance methods, no Stuff-host
 * concerns); `#`-private fine on the class. Tests reset via
 * `_clearAllForTesting()`.
 */
export class PromptApi {
  /** promptId → ResolverRecord */
  static #resolvers = new Map<string, ResolverRecord>();
  /** Interactive → Set<promptId>. O(N) cancelAll. */
  static #byInteractive = new Map<Interactive, Set<string>>();

  /* ────────────────── Tier 1: choice ────────────────── */

  public static choice<T extends string = string>(
    interactive: Interactive,
    label: string,
    choices: PromptChoice[],
    opts?: ChoicePromptOpts<T>,
  ): Promise<T> {
    const foreground = opts?.foreground ?? true;
    return this.#push<T>(
      interactive,
      'choice',
      (): ChoicePromptNote => ({
        kind: 'prompt-choice',
        label,
        choices,
        foreground,
        ...(opts?.defaultChoice !== undefined
          ? { defaultChoice: opts.defaultChoice }
          : {}),
      }),
      opts,
    );
  }

  /* ────────────────── Tier 1: confirm ────────────────── */

  public static confirm(
    interactive: Interactive,
    label: string,
    defaultAnswer: 'yes' | 'no' = 'no',
    opts?: PromptOpts<boolean>,
  ): Promise<boolean> {
    const foreground = opts?.foreground ?? true;
    return this.#push<boolean>(
      interactive,
      'confirm',
      (): ConfirmPromptNote => ({
        kind: 'prompt-confirm',
        label,
        defaultAnswer,
        foreground,
      }),
      opts,
    );
  }

  /* ────────────────── Tier 1: text ────────────────── */

  public static text(
    interactive: Interactive,
    label: string,
    opts?: TextPromptOpts,
  ): Promise<string> {
    const foreground = opts?.foreground ?? true;
    return this.#push<string>(
      interactive,
      'text',
      (): TextPromptNote => ({
        kind: 'prompt-text',
        label,
        foreground,
        ...(opts?.placeholder !== undefined
          ? { placeholder: opts.placeholder }
          : {}),
      }),
      opts,
    );
  }

  /* ────────────────── Tier 1: mqlObject ────────────────── */

  public static mqlObject(
    interactive: Interactive,
    label: string,
    matches: Stuff[],
    opts?: PromptOpts<Stuff | null>,
  ): Promise<Stuff | null> {
    const viewer = this.#requireViewer(interactive);
    const projected = matches.map((s) => ({
      stuffId: s.stuffId,
      displayName: DescribeApi.getDisplayName(s, viewer),
    }));
    const foreground = opts?.foreground ?? true;
    return this.#push<Stuff | null>(
      interactive,
      'mqlObject',
      (): MqlObjectPromptNote => ({
        kind: 'prompt-mql-object',
        label,
        matches: projected,
        foreground,
      }),
      opts,
    );
  }

  /* ────────────────── Tier 1: mqlMany ────────────────── */

  public static mqlMany(
    interactive: Interactive,
    label: string,
    matches: Stuff[],
    opts?: MqlManyPromptOpts,
  ): Promise<Stuff[]> {
    const viewer = this.#requireViewer(interactive);
    const projected = matches.map((s) => ({
      stuffId: s.stuffId,
      displayName: DescribeApi.getDisplayName(s, viewer),
    }));
    const foreground = opts?.foreground ?? true;
    return this.#push<Stuff[]>(
      interactive,
      'mqlMany',
      (): MqlManyPromptNote => ({
        kind: 'prompt-mql-many',
        label,
        matches: projected,
        foreground,
        ...(opts?.min !== undefined ? { min: opts.min } : {}),
        ...(opts?.max !== undefined ? { max: opts.max } : {}),
      }),
      opts,
      { min: opts?.min, max: opts?.max },
    );
  }

  /* ────────────────── Inbound entry points ────────────────── */

  /**
   * Route a `prompt-response` wire message. Looks up the resolver,
   * decodes the response per the prompt kind, runs the validator
   * (if any), and either resolves the await or emits
   * `prompt-validation-failed` and keeps the prompt alive.
   *
   * Wave 3 wires `Application.processUserMessage` to call this on
   * inbound `prompt-response`. Public so tests can drive it.
   */
  public static handleResponse(
    interactive: Interactive,
    payload: { promptId: string; response: string },
  ): void {
    const record = this.#resolvers.get(payload.promptId);
    if (!record) return;
    if (record.interactive !== interactive) return;  // tampered

    let typed: unknown;
    switch (record.kind) {
      case 'choice':
      case 'text':
        typed = payload.response;
        break;
      case 'confirm':
        // Decode wire string → boolean before validators run, so
        // user-supplied validators see the typed value.
        typed = payload.response === 'yes';
        break;
      case 'mqlObject':
        typed = StuffApi.findById(payload.response) ?? null;
        break;
      case 'mqlMany': {
        let ids: unknown;
        try {
          ids = JSON.parse(payload.response);
        } catch {
          this.#emitValidationFailed(
            record,
            'response is not valid JSON',
          );
          return;
        }
        if (
          !Array.isArray(ids) ||
          ids.some((x) => typeof x !== 'string')
        ) {
          this.#emitValidationFailed(
            record,
            'response must be a JSON array of stuffIds',
          );
          return;
        }
        if (record.max !== undefined && ids.length > record.max) {
          this.#emitValidationFailed(
            record,
            `selected ${ids.length}, max is ${record.max}`,
          );
          return;
        }
        if (record.min !== undefined && ids.length < record.min) {
          this.#emitValidationFailed(
            record,
            `selected ${ids.length}, min is ${record.min}`,
          );
          return;
        }
        typed = (ids as string[])
          .map((id) => StuffApi.findById(id))
          .filter((s): s is Stuff => s !== undefined);
        break;
      }
    }

    if (record.validate) {
      void this.#runValidateAndResolve(record, typed);
      return;
    }
    this.#dismissAndResolve(record, typed);
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
    const record = this.#resolvers.get(payload.promptId);
    if (!record) return;
    if (record.interactive !== interactive) return;
    this.#cancelOne(record, 'cancelled');
  }

  /**
   * Server-side single-prompt cancel. Returns `true` if a record
   * was found and cancelled; `false` for unknown ids.
   */
  public static cancel(
    promptId: string,
    reason: 'cancelled' | 'host-disconnected' = 'cancelled',
  ): boolean {
    const record = this.#resolvers.get(promptId);
    if (!record) return false;
    this.#cancelOne(record, reason);
    return true;
  }

  /**
   * Server-side wholesale cancel — every prompt held by
   * `interactive`. Returns the count cancelled.
   *
   * Called from the `prompt cancel` verb controller (reason
   * `'cancelled'`) and from `Application.handleUserDisconnect`
   * (reason `'host-disconnected'`).
   */
  public static cancelAll(
    interactive: Interactive,
    reason: 'cancelled' | 'host-disconnected',
  ): number {
    const bucket = this.#byInteractive.get(interactive);
    if (!bucket) return 0;
    const count = bucket.size;
    // Snapshot ids first — `#cancelOne` mutates the bucket.
    for (const id of [...bucket]) {
      const record = this.#resolvers.get(id);
      if (record) this.#cancelOne(record, reason);
    }
    return count;
  }

  /* ────────────────── Test seams ────────────────── */

  public static _getResolverCountForTesting(): number {
    SecurityApi.assertTestOnly('_getResolverCountForTesting');
    return this.#resolvers.size;
  }

  public static _getInteractivePromptCountForTesting(
    interactive: Interactive,
  ): number {
    SecurityApi.assertTestOnly(
      '_getInteractivePromptCountForTesting',
    );
    return this.#byInteractive.get(interactive)?.size ?? 0;
  }

  public static _clearAllForTesting(): void {
    SecurityApi.assertTestOnly('_clearAllForTesting');
    this.#resolvers.clear();
    this.#byInteractive.clear();
  }

  /* ─────────────── Internals ─────────────── */

  /**
   * Push lifecycle shared by every Tier 1 method. Generates a
   * `promptId`, stores a resolver record, ships the body
   * `MessageFrame` (if `opts.body` is set), and pushes the
   * `PromptEnvelope`.
   *
   * Returns a Promise that resolves on `handleResponse` →
   * validate-pass, or rejects on `handleCancel` / `cancel*` with
   * `PromptCancelledError`.
   */
  static #push<T>(
    interactive: Interactive,
    kind: ResolverRecord['kind'],
    buildNote: () => Note,
    opts?: PromptOpts<T>,
    extras?: { min?: number; max?: number },
  ): Promise<T> {
    const holder = this.#requireViewer(interactive);
    const promptId = nanoid();

    return new Promise<T>((resolve, reject) => {
      const record: ResolverRecord = {
        promptId,
        interactive,
        resolve: resolve as (v: unknown) => void,
        reject,
        validate: opts?.validate as PromptValidator<unknown> | undefined,
        kind,
        cancelled: false,
        ...(extras?.min !== undefined ? { min: extras.min } : {}),
        ...(extras?.max !== undefined ? { max: extras.max } : {}),
      };
      this.#resolvers.set(promptId, record);
      let bucket = this.#byInteractive.get(interactive);
      if (!bucket) {
        bucket = new Set();
        this.#byInteractive.set(interactive, bucket);
      }
      bucket.add(promptId);

      // Body MessageFrame — correlated by promptId so the client
      // can associate the long-form terminal prose with the prompt
      // envelope. Carried on the per-frame payload slot
      // (`Scene.toSelf(body, payload?)`).
      if (opts?.body !== undefined) {
        MessageApi.scene(holder)
          .topic('world.prompt')
          .toSelf(opts.body, { promptId })
          .send();
      }

      const note = buildNote();
      const template: Omit<PromptEnvelope, 'frameId'> = {
        type: 'prompt',
        promptId,
        outcome: { notes: [note] },
      };
      MessageApi.sendEnvelope(holder, template);
    });
  }

  /**
   * Resolve the Interactive's holder + assert it's a Sensor (so
   * `MessageApi.sendEnvelope` and the `world.prompt` MessageFrame
   * delivery can address it).
   */
  static #requireViewer(interactive: Interactive): Stuff & Sensor {
    const holder = interactive.getHolder();
    if (!holder) {
      throw new Error(
        'PromptApi: Interactive has no holder; cannot push prompt',
      );
    }
    if (!MixinApi.isSensor(holder)) {
      throw new Error(
        'PromptApi: Interactive holder is not a Sensor; cannot push prompt',
      );
    }
    return holder as Stuff & Sensor;
  }

  /**
   * Run the validator (sync or async). If it returns `true`,
   * dismiss the prompt and resolve the await with the typed
   * response. If it returns a string, emit
   * `prompt-validation-failed` and keep the prompt alive. If the
   * validator throws, emit validation-failed with the error
   * message.
   *
   * Cancellation safety: a prompt cancelled mid-validate has its
   * `cancelled` flag set by `#cancelOne` (which also already
   * rejected the await). The post-await guard here short-circuits
   * so the late validator result doesn't call `resolve` on an
   * already-rejected Promise.
   */
  static async #runValidateAndResolve(
    record: ResolverRecord,
    typed: unknown,
  ): Promise<void> {
    let result: true | string;
    try {
      const r = await record.validate!(typed);
      result = r;
    } catch (err) {
      this.#emitValidationFailed(
        record,
        err instanceof Error ? err.message : String(err),
      );
      return;
    }
    if (record.cancelled) return;
    if (result === true) {
      this.#dismissAndResolve(record, typed);
    } else {
      this.#emitValidationFailed(record, result);
    }
  }

  static #dismissAndResolve(
    record: ResolverRecord,
    typed: unknown,
  ): void {
    this.#cleanup(record);
    this.#emitDismissed(record, 'answered');
    record.resolve(typed);
  }

  static #cancelOne(
    record: ResolverRecord,
    reason: 'cancelled' | 'host-disconnected',
  ): void {
    record.cancelled = true;
    this.#cleanup(record);
    this.#emitDismissed(record, reason);
    record.reject(new PromptCancelledError(reason));
  }

  static #cleanup(record: ResolverRecord): void {
    this.#resolvers.delete(record.promptId);
    const bucket = this.#byInteractive.get(record.interactive);
    if (bucket) {
      bucket.delete(record.promptId);
      if (bucket.size === 0) {
        this.#byInteractive.delete(record.interactive);
      }
    }
  }

  static #emitValidationFailed(
    record: ResolverRecord,
    message: string,
  ): void {
    const holder = record.interactive.getHolder();
    if (!holder || !MixinApi.isSensor(holder)) return;
    const template: Omit<PromptEnvelope, 'frameId'> = {
      type: 'prompt',
      promptId: record.promptId,
      outcome: {
        notes: [{ kind: 'prompt-validation-failed', message }],
      },
    };
    MessageApi.sendEnvelope(holder, template);
  }

  static #emitDismissed(
    record: ResolverRecord,
    reason: PromptDismissedNote['reason'],
  ): void {
    const holder = record.interactive.getHolder();
    if (!holder || !MixinApi.isSensor(holder)) return;
    const template: Omit<PromptEnvelope, 'frameId'> = {
      type: 'prompt',
      promptId: record.promptId,
      outcome: {
        notes: [{ kind: 'prompt-dismissed', reason }],
      },
    };
    MessageApi.sendEnvelope(holder, template);
  }

  /**
   * Render the giver's `prompt.format` template into a
   * `PromptRefreshNote` for inclusion in a
   * `DispatchResponseEnvelope`. Reads the template via
   * `giver.getSetting('prompt.format')` when the giver composes
   * `EnvironmentMixin`; otherwise uses the bare default
   * (`'{{ focus }}>'`).
   *
   * Called from `CommandGiverMixin.executeCommand`'s dispatch-
   * response composition site so every command response carries an
   * up-to-date base prompt. Also from
   * `Application.handleCommandMessage`'s empty-command short-circuit.
   *
   * Template render failures (Liquid syntax errors, runtime errors)
   * fall through to the default — the player still gets a usable
   * prompt rather than a broken response.
   */
  public static renderPromptRefresh(giver: Stuff): PromptRefreshNote {
    let template = DEFAULT_PROMPT_FORMAT;
    if (MixinApi.isEnvironment(giver)) {
      const fromSetting = giver.getSetting<string>('prompt.format');
      if (typeof fromSetting === 'string' && fromSetting.length > 0) {
        template = fromSetting;
      }
    }
    let rendered: string;
    try {
      rendered = ProseApi.format(
        template,
        buildPromptContext(giver),
      ).toString();
    } catch {
      try {
        rendered = ProseApi.format(
          DEFAULT_PROMPT_FORMAT,
          buildPromptContext(giver),
        ).toString();
      } catch {
        rendered = '>';
      }
    }
    return { kind: 'prompt-refresh', rendered };
  }
}

SecurityApi.decorateApiClass(PromptApi);

// Local note alias to keep the buildNote signatures compact.
type Note =
  | ChoicePromptNote
  | ConfirmPromptNote
  | TextPromptNote
  | MqlObjectPromptNote
  | MqlManyPromptNote;

/* ─────────────────── Base-prompt rendering ─────────────────── */

/**
 * Default `prompt.format` Liquid template. Returns `here>` or
 * `the brass kettle>` after rendering. Mirrored on
 * `EnvironmentMixin.settings` so the schema validator sees the
 * same default.
 */
const DEFAULT_PROMPT_FORMAT = '{{ focus }}>';

/**
 * Build the Liquid render context for the base-prompt template.
 * v1 exposes a single variable, `focus`, sourced from
 * `FocusedMixin.getFocus()` when present (otherwise the empty
 * string). Future tokens (`posture`, `location.name`, `time`)
 * land additively here.
 *
 * Module-local helper for `PromptApi.renderPromptRefresh`; exported
 * solely so the prompt-format unit test can exercise it in isolation
 * (no production consumer outside this file).
 */
// eslint-disable-next-line no-restricted-syntax -- test-only export (white-box unit test); no production consumer outside this file
export function buildPromptContext(
  giver: Stuff,
): Record<string, unknown> {
  return {
    focus: MixinApi.isFocused(giver) ? giver.getFocus() : '',
  };
}
