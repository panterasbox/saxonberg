// PromptLogic — the hot-reloadable logic singleton behind PromptApi.
// (Doc comment on the class below so @internal lands on the reflection.)

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
import { Idea } from '../../lib/stuff/Idea';
import { CallSecurity, Unshadowable } from '../../lib/security/decorators';
import { SecurityPolicies } from '../../lib/security/SecurityPolicies';
import type { Stuff } from '../../lib/stuff/Stuff';
import type Interactive from '../Interactive';
import type { Sensor } from '../../lib/message/Sensor';
import { MessageApi } from '../../api/message';
import { MixinApi } from '../../api/mixin';
import { StuffApi } from '../../api/stuff';
import { ProseApi } from '../../api/prose';
import {
  PromptCancelledError,
  buildPromptContext,
  type PromptValidator,
  type PromptOpts,
  type ChoicePromptOpts,
  type TextPromptOpts,
  type MqlManyPromptOpts,
} from '../../api/prompt';

const PromptApiCallers = SecurityPolicies.FromModule(
  'mud/api/prompt#PromptApi'
);

/**
 * Default `prompt.format` Liquid template. Returns `here>` or `the brass
 * kettle>` after rendering. Mirrored on `EnvironmentMixin.settings` so
 * the schema validator sees the same default.
 */
const DEFAULT_PROMPT_FORMAT = '{{ focus }}>';

/** Local note alias to keep the buildNote signatures compact. */
type Note =
  | ChoicePromptNote
  | ConfirmPromptNote
  | TextPromptNote
  | MqlObjectPromptNote
  | MqlManyPromptNote;

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

/* ─────────────────────────── Module state ─────────────────────────── */
// The per-Interactive prompt registry. Module-level (not instance
// fields) so it survives the logic singleton's dest/recreate — mirrors
// the SoulLogic catalogue-ref pattern. Was `PromptApi.#resolvers` /
// `#byInteractive`.

/** promptId → ResolverRecord */
const resolvers = new Map<string, ResolverRecord>();
/** Interactive → Set<promptId>. O(N) cancelAll. */
const byInteractive = new Map<Interactive, Set<string>>();

/* ─────────────────────────── Internals ─────────────────────────── */

/**
 * Push lifecycle shared by every Tier 1 method. Generates a `promptId`,
 * stores a resolver record, ships the body `MessageFrame` (if
 * `opts.body` is set), and pushes the `PromptEnvelope`.
 */
function push<T>(
  interactive: Interactive,
  kind: ResolverRecord['kind'],
  buildNote: () => Note,
  opts?: PromptOpts<T>,
  extras?: { min?: number; max?: number }
): Promise<T> {
  const holder = requireViewer(interactive);
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
    resolvers.set(promptId, record);
    let bucket = byInteractive.get(interactive);
    if (!bucket) {
      bucket = new Set();
      byInteractive.set(interactive, bucket);
    }
    bucket.add(promptId);

    // Body MessageFrame — correlated by promptId so the client can
    // associate the long-form terminal prose with the prompt envelope.
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
 * `MessageApi.sendEnvelope` and the `world.prompt` MessageFrame delivery
 * can address it).
 */
function requireViewer(interactive: Interactive): Stuff & Sensor {
  const holder = interactive.getHolder();
  if (!holder) {
    throw new Error(
      'PromptApi: Interactive has no holder; cannot push prompt'
    );
  }
  if (!MixinApi.isSensor(holder)) {
    throw new Error(
      'PromptApi: Interactive holder is not a Sensor; cannot push prompt'
    );
  }
  return holder as Stuff & Sensor;
}

/**
 * Run the validator (sync or async). `true` → dismiss + resolve; a
 * string → emit `prompt-validation-failed` and keep the prompt alive; a
 * throw → validation-failed with the error message. The post-await guard
 * short-circuits a late result on an already-cancelled record.
 */
async function runValidateAndResolve(
  record: ResolverRecord,
  typed: unknown
): Promise<void> {
  let result: true | string;
  try {
    result = await record.validate!(typed);
  } catch (err) {
    emitValidationFailed(
      record,
      err instanceof Error ? err.message : String(err)
    );
    return;
  }
  if (record.cancelled) return;
  if (result === true) {
    dismissAndResolve(record, typed);
  } else {
    emitValidationFailed(record, result);
  }
}

function dismissAndResolve(record: ResolverRecord, typed: unknown): void {
  cleanup(record);
  emitDismissed(record, 'answered');
  record.resolve(typed);
}

function cancelOne(
  record: ResolverRecord,
  reason: 'cancelled' | 'host-disconnected'
): void {
  record.cancelled = true;
  cleanup(record);
  emitDismissed(record, reason);
  record.reject(new PromptCancelledError(reason));
}

function cleanup(record: ResolverRecord): void {
  resolvers.delete(record.promptId);
  const bucket = byInteractive.get(record.interactive);
  if (bucket) {
    bucket.delete(record.promptId);
    if (bucket.size === 0) {
      byInteractive.delete(record.interactive);
    }
  }
}

function emitValidationFailed(record: ResolverRecord, message: string): void {
  const holder = record.interactive.getHolder();
  if (!holder || !MixinApi.isSensor(holder)) return;
  const template: Omit<PromptEnvelope, 'frameId'> = {
    type: 'prompt',
    promptId: record.promptId,
    outcome: { notes: [{ kind: 'prompt-validation-failed', message }] },
  };
  MessageApi.sendEnvelope(holder, template);
}

function emitDismissed(
  record: ResolverRecord,
  reason: PromptDismissedNote['reason']
): void {
  const holder = record.interactive.getHolder();
  if (!holder || !MixinApi.isSensor(holder)) return;
  const template: Omit<PromptEnvelope, 'frameId'> = {
    type: 'prompt',
    promptId: record.promptId,
    outcome: { notes: [{ kind: 'prompt-dismissed', reason }] },
  };
  MessageApi.sendEnvelope(holder, template);
}

/**
 * PromptLogic — the hot-reloadable logic singleton behind
 * {@link PromptApi}.
 *
 * Lives at `/obj/api/prompt`; `PromptApi`'s public statics forward here
 * via `StuffApi.singletonSync`. The per-Interactive prompt registry is
 * module-level state (survives dest/recreate, mirrors SoulLogic); the
 * push lifecycle, validator run, and cleanup live in module-private free
 * functions — so there are no intra-singleton `this.x()` self-calls and
 * a plain `FromModule` gate suffices. Each public method carries the
 * gate per method.
 *
 * @internal
 */
@Unshadowable
export class PromptLogic extends Idea {
  /** See {@link PromptApi.choice}. */
  @CallSecurity(PromptApiCallers)
  public choice<T extends string = string>(
    interactive: Interactive,
    label: string,
    choices: PromptChoice[],
    opts?: ChoicePromptOpts<T>
  ): Promise<T> {
    const foreground = opts?.foreground ?? true;
    return push<T>(
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
      opts
    );
  }

  /** See {@link PromptApi.confirm}. */
  @CallSecurity(PromptApiCallers)
  public confirm(
    interactive: Interactive,
    label: string,
    defaultAnswer: 'yes' | 'no' = 'no',
    opts?: PromptOpts<boolean>
  ): Promise<boolean> {
    const foreground = opts?.foreground ?? true;
    return push<boolean>(
      interactive,
      'confirm',
      (): ConfirmPromptNote => ({
        kind: 'prompt-confirm',
        label,
        defaultAnswer,
        foreground,
      }),
      opts
    );
  }

  /** See {@link PromptApi.text}. */
  @CallSecurity(PromptApiCallers)
  public text(
    interactive: Interactive,
    label: string,
    opts?: TextPromptOpts
  ): Promise<string> {
    const foreground = opts?.foreground ?? true;
    return push<string>(
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
      opts
    );
  }

  /** See {@link PromptApi.mqlObject}. */
  @CallSecurity(PromptApiCallers)
  public mqlObject(
    interactive: Interactive,
    label: string,
    matches: Stuff[],
    opts?: PromptOpts<Stuff | null>
  ): Promise<Stuff | null> {
    requireViewer(interactive);
    const projected = matches.map((s) => ({
      stuffId: s.stuffId,
      displayName: s.getPresentation(),
    }));
    const foreground = opts?.foreground ?? true;
    return push<Stuff | null>(
      interactive,
      'mqlObject',
      (): MqlObjectPromptNote => ({
        kind: 'prompt-mql-object',
        label,
        matches: projected,
        foreground,
      }),
      opts
    );
  }

  /** See {@link PromptApi.mqlMany}. */
  @CallSecurity(PromptApiCallers)
  public mqlMany(
    interactive: Interactive,
    label: string,
    matches: Stuff[],
    opts?: MqlManyPromptOpts
  ): Promise<Stuff[]> {
    requireViewer(interactive);
    const projected = matches.map((s) => ({
      stuffId: s.stuffId,
      displayName: s.getPresentation(),
    }));
    const foreground = opts?.foreground ?? true;
    return push<Stuff[]>(
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
      { min: opts?.min, max: opts?.max }
    );
  }

  /** See {@link PromptApi.handleResponse}. */
  @CallSecurity(PromptApiCallers)
  public handleResponse(
    interactive: Interactive,
    payload: { promptId: string; response: string }
  ): void {
    const record = resolvers.get(payload.promptId);
    if (!record) return;
    if (record.interactive !== interactive) return; // tampered

    let typed: unknown;
    switch (record.kind) {
      case 'choice':
      case 'text':
        typed = payload.response;
        break;
      case 'confirm':
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
          emitValidationFailed(record, 'response is not valid JSON');
          return;
        }
        if (!Array.isArray(ids) || ids.some((x) => typeof x !== 'string')) {
          emitValidationFailed(
            record,
            'response must be a JSON array of stuffIds'
          );
          return;
        }
        if (record.max !== undefined && ids.length > record.max) {
          emitValidationFailed(
            record,
            `selected ${ids.length}, max is ${record.max}`
          );
          return;
        }
        if (record.min !== undefined && ids.length < record.min) {
          emitValidationFailed(
            record,
            `selected ${ids.length}, min is ${record.min}`
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
      void runValidateAndResolve(record, typed);
      return;
    }
    dismissAndResolve(record, typed);
  }

  /** See {@link PromptApi.handleCancel}. */
  @CallSecurity(PromptApiCallers)
  public handleCancel(
    interactive: Interactive,
    payload: { promptId: string }
  ): void {
    const record = resolvers.get(payload.promptId);
    if (!record) return;
    if (record.interactive !== interactive) return;
    cancelOne(record, 'cancelled');
  }

  /** See {@link PromptApi.cancel}. */
  @CallSecurity(PromptApiCallers)
  public cancel(
    promptId: string,
    reason: 'cancelled' | 'host-disconnected' = 'cancelled'
  ): boolean {
    const record = resolvers.get(promptId);
    if (!record) return false;
    cancelOne(record, reason);
    return true;
  }

  /** See {@link PromptApi.cancelAll}. */
  @CallSecurity(PromptApiCallers)
  public cancelAll(
    interactive: Interactive,
    reason: 'cancelled' | 'host-disconnected'
  ): number {
    const bucket = byInteractive.get(interactive);
    if (!bucket) return 0;
    const count = bucket.size;
    // Snapshot ids first — `cancelOne` mutates the bucket.
    for (const id of [...bucket]) {
      const record = resolvers.get(id);
      if (record) cancelOne(record, reason);
    }
    return count;
  }

  /**
   * See {@link PromptApi._getResolverCountForTesting}. The
   * `assertTestOnly` caller-check runs on the face static (its stack
   * window can't see the test frame through this singleton's forwarding
   * frames); this just reads the count.
   */
  @CallSecurity(PromptApiCallers)
  public _getResolverCountForTesting(): number {
    return resolvers.size;
  }

  /** See {@link PromptApi._getInteractivePromptCountForTesting}. */
  @CallSecurity(PromptApiCallers)
  public _getInteractivePromptCountForTesting(
    interactive: Interactive
  ): number {
    return byInteractive.get(interactive)?.size ?? 0;
  }

  /** See {@link PromptApi._clearAllForTesting}. */
  @CallSecurity(PromptApiCallers)
  public _clearAllForTesting(): void {
    resolvers.clear();
    byInteractive.clear();
  }

  /** See {@link PromptApi.renderPromptRefresh}. */
  @CallSecurity(PromptApiCallers)
  public renderPromptRefresh(giver: Stuff): PromptRefreshNote {
    let template = DEFAULT_PROMPT_FORMAT;
    if (MixinApi.isEnvironment(giver)) {
      const fromSetting = giver.getSetting<string>('prompt.format');
      if (typeof fromSetting === 'string' && fromSetting.length > 0) {
        template = fromSetting;
      }
    }
    let rendered: string;
    try {
      rendered = ProseApi.format(template, buildPromptContext(giver)).toString();
    } catch {
      try {
        rendered = ProseApi.format(
          DEFAULT_PROMPT_FORMAT,
          buildPromptContext(giver)
        ).toString();
      } catch {
        rendered = '>';
      }
    }
    return { kind: 'prompt-refresh', rendered };
  }
}
