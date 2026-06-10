/**
 * CommandApi - Command framework types and definition cache.
 *
 * Owns the public type surface for the command pipeline (View → Model →
 * Controller) and caches parsed CommandDefinitions. The static methods are a
 * plain verb/filename cache — all commands come from CommandProviders
 * (mixins, objects) in various contexts (self, environment, inventory,
 * peers), there is no "global" command registry.
 *
 * Type surface lives here deliberately: controllers and MQL consumers
 * depend on this file to get `CommandContext` and the view/model/field
 * shapes that describe YAML-declared commands.
 */

import type { Stuff } from '../lib/stuff/Stuff';
import type { Container } from '../lib/spatial/Container';
import type { Containable } from '../lib/spatial/Containable';
import type { CommandGiver } from '../lib/command/CommandGiver';
import type { Focused } from '../lib/command/Focused';
import { ArrayApi } from './array';
import { ShellApi } from './shell';
import { PromptApi } from './prompt';
import type Interactive from '../obj/Interactive';
import type { Sensor } from '../lib/message/Sensor';
import { CommandDefinition } from '../lib/command/CommandDefinition';
import { fileURLToPath, pathToFileURL } from 'url';
import { dirname, isAbsolute, join, resolve as resolvePath } from 'path';
import { readdirSync } from 'fs';
import { nanoid } from 'nanoid';
import Ajv, { type ValidateFunction } from 'ajv';
import type { MessageFrame, Note, Status } from '@saxonberg/types';
import { SecurityApi } from './security';
import {
  MqlApi,
  type MqlMany,
  type MqlManyResult,
  type MqlMatchVia,
  type MqlOneResult,
  type MqlOne,
} from './mql';
import { MixinApi } from './mixin';
import { MessageApi } from './message';
import { AccessApi } from './access';
import { GroupApi } from './group';
import { ExecutionContextApi } from './execution-context';
import { CommandLineApi, type ParsedCommand, type RawToken } from './command-line';
import type { Mml } from './mml';
import type { GenderedSlot } from './mql/pronoun-memory';
import { Pronouns } from '@saxonberg/types';

/**
 * Optional ingress carry-throughs `executeCommand` accepts from the
 * caller. The dispatcher derives everything else (commandGiver from
 * `this`, location from the giver's container, execution / command
 * ids).
 */
export interface ExecuteCommandOpts {
  /**
   * The connection/session that originated the command. Cascaded /
   * indirect commands (NPC scripting, scheduled triggers) may omit
   * this; controllers must tolerate `context.interactive` being
   * undefined.
   */
  interactive?: Interactive;

  /**
   * Set by {@link CommandApi.forceCommand} when the runtime fires a
   * command on behalf of the player (auto-look on arrival, NPC
   * scripts, scheduled triggers). The flag rides through to the
   * Command frame's metadata so hooks can ask "am I executing inside
   * a forced command?" via
   * {@link ExecutionContextApi.getCommandStack}. Player-typed input
   * defaults to `false`.
   */
  forced?: boolean;
}

/**
 * Read-only reference holder controllers see during `execute()`.
 * Built by `CommandGiverMixin.executeCommand` before any controller
 * runs; every field is guaranteed populated by the time a controller
 * inspects it (modulo `interactive`, which is genuinely optional).
 *
 *   - `commandGiver` — the thing executing the command, typed as
 *     the general `Stuff & CommandGiver`. Controllers narrow with
 *     `MixinApi.isX()` predicates or cast to a known concrete type.
 *   - `interactive`  — the connection/session that originated the
 *     input. Optional; absent for cascaded commands.
 *   - `location`     — the Container the giver is in at dispatch
 *     time. Typically a `Location` (a room), but may be any
 *     `Stuff & Container` — an Avatar inside a `Vessel` (wardrobe,
 *     ship cabin) issues commands from the vessel as the location.
 *     Controllers narrow with `MixinApi.isX()` if they need a
 *     specific surface (e.g. `isExitable` for exit listing).
 *   - `commandText`  — the original raw input.
 *   - `executionId`  — per-execution security id (call-stack tracking).
 *   - `commandId`    — per-execution attribution id stamped onto
 *     every frame composed during the synchronous span of the call.
 *   - `verb`         — the verb the matcher dispatched on.
 *   - `command`      — the matched YAML view. Useful for controllers
 *     that render help text or introspect their own schema.
 */
export interface CommandContext {
  commandGiver: Stuff & CommandGiver;
  interactive?: Interactive;
  location: Stuff & Container;
  commandText: string;
  executionId: string;
  commandId: string;
  verb: string;
  command: CommandDefinition;
  /**
   * Populated by `ShellApi.expandAliases` when the command's verb was
   * resolved through one or more alias hops. Absent when the verb was
   * typed directly. Controllers that branch on alias-vs-direct read
   * this; everyone else ignores it.
   */
  aliasExpansion?: AliasExpansionInfo;

  /**
   * Precomputed permission snapshot used by MQL pre-resolution
   * gates. Populated by the dispatcher per command via
   * `AccessApi.isAuthor` + (when admin) a `'core'` membership read;
   * the resolver stamps it onto every `MqlContext` it builds. Absent
   * for server-internal callers building MqlContexts directly.
   *
   * @internal
   */
  _mqlPermission?: {
    isAuthor: boolean;
    coreMemberIds?: ReadonlySet<string>;
  };

  /**
   * Accumulate a structured note. Auto-escalates status per the
   * {@link autoEscalationFor} table unless `setStatus` was already
   * called explicitly (in which case the explicit value sticks).
   */
  note(n: Note): void;
  /**
   * Pin the status explicitly. Subsequent `note()` calls will NOT
   * auto-escalate past the pinned value.
   */
  setStatus(s: Status): void;
  /** Read accumulator state. Returned arrays are snapshot-safe. */
  getNotes(): readonly Note[];
  getStatus(): Status;
}

/**
 * Constructor args for `CommandApi.createCommandContext`. Pulled out
 * so the factory's signature and the implementation's constructor
 * can share one shape definition.
 */
export interface CreateCommandContextArgs {
  commandGiver: Stuff & CommandGiver;
  location: Stuff & Container;
  commandText: string;
  executionId: string;
  commandId: string;
  verb: string;
  command: CommandDefinition;
  interactive?: Interactive;
}

/**
 * Status auto-escalation table. A note of the given kind implies
 * at least the returned status; the accumulator keeps the
 * strongest-seen status by rank. Internal — consumed only by
 * `CommandContextImpl.note`.
 */
function autoEscalationFor(kind: Note['kind']): Status | undefined {
  switch (kind) {
    case 'quantity-clamped':
      return 'partial';
    case 'target-declined':
      return 'partial';
    case 'quantity-clamped-rejected':
      return 'declined';
    case 'empty-result':
      return 'declined';
    case 'controller-rejected':
      return 'declined';
    case 'mixin-missing':
      return 'declined';
    case 'locomotion-gate-failed':
      return 'declined';
    case 'slot-occupied':
      return 'declined';
    case 'command-rejected':
      return 'declined';
    case 'mql-error':
      return 'declined';
    case 'validator-failed':
      return 'declined';
    case 'controller-error':
      return 'error';
    // match-ambiguous, engagement-*: no escalation
    default:
      return undefined;
  }
}

const STATUS_RANK: Record<Status, number> = {
  ok: 0,
  partial: 1,
  declined: 2,
  error: 3,
};

class CommandContextImpl implements CommandContext {
  public commandGiver: Stuff & CommandGiver;
  public location: Stuff & Container;
  public commandText: string;
  public executionId: string;
  public commandId: string;
  public verb: string;
  public command: CommandDefinition;
  public interactive?: Interactive;
  public aliasExpansion?: AliasExpansionInfo;
  public _mqlPermission?: {
    isAuthor: boolean;
    coreMemberIds?: ReadonlySet<string>;
  };

  private _notes: Note[] = [];
  private _status: Status = 'ok';
  private _statusExplicit = false;

  constructor(args: CreateCommandContextArgs) {
    this.commandGiver = args.commandGiver;
    this.location = args.location;
    this.commandText = args.commandText;
    this.executionId = args.executionId;
    this.commandId = args.commandId;
    this.verb = args.verb;
    this.command = args.command;
    if (args.interactive !== undefined) this.interactive = args.interactive;
  }

  note(n: Note): void {
    this._notes.push(n);
    if (this._statusExplicit) return;
    const implied = autoEscalationFor(n.kind);
    if (
      implied !== undefined &&
      STATUS_RANK[implied] > STATUS_RANK[this._status]
    ) {
      this._status = implied;
    }
  }

  setStatus(s: Status): void {
    this._status = s;
    this._statusExplicit = true;
  }

  getNotes(): readonly Note[] {
    return this._notes;
  }

  getStatus(): Status {
    return this._status;
  }
}

/**
 * One alias-expansion record — what the user typed, what it resolved
 * to, and the chain of intermediate alias names when the resolution
 * recursed.
 */
export interface AliasExpansionInfo {
  /** The verb the user actually typed (always the first alias name). */
  aliasName: string;
  /** The user's raw input — same string as `commandText`, surfaced here so log consumers don't have to thread two fields. */
  originalText: string;
  /** Canonical post-expansion text (`CommandLineApi.format` of the resulting `ParsedCommand`). */
  expandedText: string;
  /** Multi-step chain when recursive (e.g. `['gn', 'goodnight']`). One entry per hop in firing order; absent for single-step. */
  chain?: string[];
}

/**
 * Reserved field name used by the matcher to surface which subcommand
 * fired. YAMLs that declare subcommands cannot also declare a
 * positional field or option named `subcommand` — the load-time
 * invariant in `CommandDefinition.validate` enforces this.
 */
export const SUBCOMMAND_FIELD = 'subcommand';

/**
 * Parser-side context — what a parser may look at to decide intent.
 */
export interface ParserContext {
  /**
   * The actor running the command. NL parsers may want this for
   * disambiguation (e.g. "look at MY sword" vs "look at her sword").
   */
  commandGiver: Stuff & CommandGiver;
  /**
   * The Container the actor is currently in — surface for
   * disambiguation. Typically a `Location` but may be any
   * `Stuff & Container` (a Vessel interior, etc.).
   */
  location: Stuff & Container;
  /**
   * Available command definitions on the actor's recency stack —
   * the universe of verbs the parser is allowed to choose from.
   * Pre-filtered so the parser can ignore definitions the actor
   * can't actually fire.
   */
  available: CommandDefinition[];
}

/**
 * Result a parser yields. Exactly one of `parsed`, `bound`, or
 * `error` should be set; the dispatcher dispatches on the first
 * non-undefined field.
 *
 *   - `parsed`  — a tokenized `ParsedCommand`. The dispatcher runs
 *                 the full pipeline (match → assemble → resolve →
 *                 execute). Used by tokenizer-driven parsers (the
 *                 default `msh`).
 *   - `bound`   — a `{command, model}` pair already chosen by the
 *                 parser. Dispatcher skips match/assemble and runs
 *                 only resolve + execute. Used by NL/LLM parsers
 *                 that decide intent themselves.
 *   - `error`   — input couldn't be parsed; the dispatcher emits a
 *                 `command-rejected { reason: 'parse-failed' }` note
 *                 onto the dispatch-response envelope.
 */
export interface ParseResult {
  parsed?: ParsedCommand;
  bound?: {
    command: CommandDefinition;
    model: ModelData;
  };
  error?: string;
}

/**
 * Parser contract. A parser is a stateless transform from
 * `(text, context) → ParseResult`. Implementations live under
 * `mud/lib/command/parsers/<name>.ts` and default-export a `Parser`
 * value. Custom parsers can live anywhere; reference them by
 * absolute path (`/path/to/file`) from the `shell.parser` setting.
 */
export interface Parser {
  /** Display name. Bare-name spec resolves to `lib/command/parsers/<name>`. */
  name: string;
  /** Parse the raw input. May be sync or async. */
  parse(
    text: string,
    context: ParserContext
  ): ParseResult | Promise<ParseResult>;
}

/**
 * Per-bucket command contributions a class can declare via
 * `static commandContributions: CommandContributions`. Mixins, concrete Stuff
 * classes, and shadows all use the same shape.
 *
 * Each bucket holds YAML filenames; `CommandApi.getCommand` resolves
 * them at runtime.
 *
 *   - `self`        — commands the host can issue against itself
 *                     (e.g. `inventory`, `look`).
 *   - `inventory`   — commands the host gains when this thing is in
 *                     its inventory (e.g. a wand grants `zap`).
 *   - `environment` — commands the host gains when this thing is in
 *                     its environment (e.g. a notice board grants
 *                     `read`).
 *   - `peers`       — commands the host gains when this thing is a
 *                     peer CommandGiver in its environment (e.g. a
 *                     conversational NPC grants `tell`).
 *
 * Discovery looks for the bucket as either a filename array or
 * `undefined` (treated as no contribution). Empty arrays are fine.
 */
export interface CommandContributions {
  self?: string[];
  inventory?: string[];
  environment?: string[];
  peers?: string[];
}

/**
 * Field value union — what `model.fields[name]` can hold after the
 * matcher's resolve/validate stage.
 *
 *   - `boolean`/`string`/`number` for primitive-typed fields.
 *   - `Stuff` historically for `type: object` resolved fields;
 *     replaced by `MqlOneResult` post-Phase-7 (kept in the union for the
 *     transitional matcher path that lands raw values on the model
 *     before resolution).
 *   - `MqlOneResult` for resolved `type: object` fields — bundles
 *     stuff + via + raw + prep into a single per-field record.
 *     `MqlOneResult.stuff` is `null` when MQL produced no match.
 *   - `MqlManyResult` for resolved `type: objects` fields — same shape
 *     with `stuff` as `Stuff[]`.
 *   - `FieldValue[]` covers `multiple: true` option accumulation.
 *
 * Arrays of arrays are not produced (the matcher flattens), but the
 * type is recursive to keep callers from having to disambiguate.
 */
export type FieldValue =
  | boolean
  | string
  | number
  | Stuff
  | MqlOneResult
  | MqlManyResult
  | Record<string, unknown> // `type: 'struct'` payload values
  | FieldValue[];

/**
 * Resolved field values keyed by field name. Positional-field values
 * and option values share the same flat map per §3.3 of the
 * requirements doc.
 *
 * The index signature includes `undefined` so that typed model
 * extensions (`interface FooModel extends CommandModel { target?:
 * string }`) remain assignable. With `noUncheckedIndexedAccess`
 * enabled the read type was already `FieldValue | undefined`;
 * widening the declared shape just makes that explicit.
 */
export type ModelData = Record<string, FieldValue | undefined>;

/**
 * The controller's input model. Extends `ModelData` with the one
 * field the matcher always stamps when relevant — `subcommand` —
 * so controllers can switch on it without a per-call cast.
 *
 * Concrete controllers narrow further by declaring their own field
 * shape (`interface DropModel extends CommandModel { targets:
 * Stuff[] }`).
 *
 * Verb / commandText / executionId / commandId / the matched
 * `CommandDefinition` live on `CommandContext`; the model carries
 * field data only.
 */
export type CommandModel = ModelData & {
  /**
   * Stamped by the matcher when the active YAML declares
   * `subcommands:` and the input named one. Absent for flat verbs
   * (no `subcommands:` block) and for subcommanded verbs invoked
   * without a subcommand (the controller decides what that means).
   */
  subcommand?: string;
};

/**
 * Field validator function type.
 *
 * Returns `undefined` when the field is valid, or an error message string
 * when it is invalid.
 *
 * Sync by design — see {@link CommandValidator} for the rationale and
 * the `preload` escape hatch for sync validators that need
 * singleton-backed reads.
 */
export type FieldValidator = ((
  value: unknown,
  field: string,
  context: CommandContext
) => string | undefined) & {
  /**
   * Optional async preload that ensures any singletons this
   * validator's sync body resolves via `StuffApi.findByTemplatePath`
   * are live. The dispatcher awaits all validator preloads AFTER
   * MQL resolution but BEFORE the sync validator phase runs (see
   * `CommandApi.preloadValidatorDeps`), so the sync
   * `findByTemplatePath` calls inside the validator always hit a
   * populated cache.
   *
   * Signature mirrors the sync body — `(value, field, context)` —
   * so a field validator that wants per-bound-target deps can
   * inspect the resolved Stuff and preload accordingly (e.g.
   * a `requiresAnimateTarget` validator could read the bound
   * Stuff's `_speciesPath` and ensure its clade ancestors).
   * Validators that only need giver-side deps ignore `value` /
   * `field` and read `context.commandGiver`.
   *
   * ```ts
   * const v: FieldValidator = (value, field, ctx) => { ... };
   * v.preload = async (value, field, ctx) => {
   *   const target = (value as { stuff?: Stuff } | undefined)?.stuff;
   *   if (!target) return;
   *   await StuffApi.singleton(somePathFromTarget(target));
   * };
   * ```
   *
   * Omit on validators that only check mixin presence or call
   * sync-pure helpers.
   */
  preload?: (
    value: unknown,
    field: string,
    context: CommandContext
  ) => Promise<void>;
};

/**
 * Verb-level validator function type.
 *
 * Verb-level validators fire BEFORE field-level validators with
 * `context.commandGiver` populated. They guard command-shape
 * preconditions that don't tie to a specific arg — animacy, mobility,
 * vocal capacity. Returns `undefined` when the precondition holds, or
 * an error message string when it doesn't.
 *
 * Sync by design — the validator phase runs inside
 * `CommandApi.runValidators` (sync). Validators whose sync body
 * needs singletons declare an async `preload` hook; the dispatcher
 * walks all validators-for-this-command between MQL resolution and
 * the sync validator phase and awaits each preload, so the sync body
 * always sees a populated cache. Preload signature mirrors the sync
 * body — `(context)` — so verb-level validators that need
 * giver-side deps read `context.commandGiver`.
 */
export type CommandValidator = ((
  context: CommandContext
) => string | undefined) & {
  preload?: (context: CommandContext) => Promise<void>;
};

/**
 * Shared shape between positional args and option-bound fields:
 * type, arity flags, validators, default. `name` is added by
 * `PositionalDefinition` (positionals carry their name in-band so
 * the YAML's `args:` array is self-documenting).
 *
 * `validators` is the YAML form — a list of validator path specs
 * (see `ValidationApi.resolve`). After `CommandApi.preloadAll`
 * resolves them, the live functions land on `_resolvedValidators`;
 * the matcher reads only that field. Schema delivery uses the
 * string form.
 */
/**
 * Authorial cardinality constraint on an `objects` field. Describes
 * how many results the controller wants from MQL resolution. Default
 * is `{ min: 0, max: Infinity }` (take everything resolved). Setting
 * `exactly: N` is sugar for `min: N, max: N`.
 */
export interface CardinalitySpec {
  min?: number;
  max?: number;
  exactly?: number;
}

/**
 * What to do when MQL resolves more results than the cardinality
 * permits.
 *
 * - `'top'` — pick the highest-scored match. **`object` only** (the
 *   default for `object` fields; preserves pre-cardinality behavior).
 * - `'take-all'` — execute with all resolved Stuffs. **`objects`
 *   only** (the default for `objects` when `max` is unset).
 * - `'prompt'` — push `mqlObject` (cardinality 1) or `mqlMany`
 *   (cardinality K) and await the player's selection.
 * - `'truncate'` — silently take the top `max` matches. **`objects`
 *   only.**
 * - `'error'` — fail the command with a structured note.
 */
export type OnExcessPolicy = 'top' | 'take-all' | 'prompt' | 'truncate' | 'error';

/**
 * What to do when MQL resolves fewer results than `cardinality.min`.
 * v1 ships one value: `'error'`. ("Prompt to widen your MQL query"
 * is deferred per requirements doc non-goals.)
 */
export type OnShortagePolicy = 'error';

/* ──────── dispatcher phases + option-declared effects ────────
 *
 * Named lifecycle phases the dispatcher runs between parse and
 * emit. Options declared in YAML can attach `effects:` against any
 * phase to skip or replace its default behavior — the substrate's
 * mechanism for "this flag changes the framework's lifecycle, not
 * the verb's semantics."
 *
 * Concrete examples (current + anticipated):
 *
 *   - `look --peek` → `{ phase: 'focus-update', action: 'skip' }`
 *     Render prose without updating the focus chain. The only
 *     phase that has a real hookable implementation today.
 *
 *   - `--async` → `{ phase: 'dispatch', action: 'replace',
 *                    with: 'deferred-dispatch' }`
 *     Defer controller execution to a background queue.
 *
 *   - `--dryrun` / `--explain` → `{ phase: 'dispatch',
 *                                   action: 'replace',
 *                                   with: 'explain-plan' }`
 *     Resolve + validate, then dump the plan instead of running.
 *
 *   - `--force` → `{ phase: 'confirm-prompt', action: 'skip' }`
 *
 *   - `--quiet` → `{ phase: 'emit-scene', action: 'skip' }`
 *
 * Most of the phases above don't have hookable implementations
 * yet — they're named placeholders the YAML schema accepts and the
 * dispatcher throws against until the matching substrate ships.
 * The vocabulary is documented up-front so feature work lands by
 * filling phases in, not by inventing new schema fields.
 */

/**
 * Names of the lifecycle phases an option's `effects:` can target.
 *
 * **Implementation status:**
 *  - `focus-update` — hookable. Per-arg focus chain push/replace
 *    fires inside the arg-resolution loop. `skip` is honored.
 *  - `dispatch` — placeholder. Controller execution. `replace`
 *    handlers (`deferred-dispatch`, `explain-plan`) throw at run
 *    time until the substrate lands.
 *  - `validate`, `confirm-prompt`, `emit-scene` — placeholders.
 *    Schema validates against the name; the dispatcher throws if
 *    a player command actually triggers a phase that hasn't been
 *    made hookable yet (e.g. `--force` reaching the unimplemented
 *    `confirm-prompt` phase).
 *
 * Adding a phase to this list documents new vocabulary; the
 * dispatcher only honors effects against phases its code path
 * has actually instrumented.
 */
export const COMMAND_PHASES = [
  'focus-update',
  'validate',
  'confirm-prompt',
  'dispatch',
  'emit-scene',
] as const;

export type CommandPhase = (typeof COMMAND_PHASES)[number];

/**
 * Subset of `COMMAND_PHASES` whose dispatcher path currently honors
 * effects. Used by `consumePhaseEffects` to throw a clear error when
 * content reaches for a phase that's schema-valid but not yet wired
 * through to runtime behavior.
 *
 * Adding a phase here is the substrate-side completion signal — the
 * dispatcher's phase walk consults effects and the runtime honors
 * `skip` / `replace` for that phase.
 */
export const HOOKABLE_PHASES = new Set<CommandPhase>([
  'focus-update',
]);

/**
 * Names of registered `replace` handlers — the value an effect
 * carries in its `with:` slot when `action === 'replace'`.
 *
 * The schema validates that a referenced handler exists in this
 * set; the runtime dispatcher resolves the name to a handler
 * implementation. Adding a handler here documents the vocabulary;
 * a runtime dispatch entry must accompany it for `replace` to
 * actually fire.
 *
 * Today both handler names are placeholders — the vocabulary is
 * documented so authoring conventions stabilize, but any command
 * whose option declares `replace` against them throws at dispatch
 * time. Each becomes real when its substrate ships.
 */
export const REPLACE_HANDLERS = ['deferred-dispatch', 'explain-plan'] as const;

export type ReplaceHandler = (typeof REPLACE_HANDLERS)[number];

/**
 * Subset of `REPLACE_HANDLERS` whose runtime implementation exists.
 * Effects referencing a handler outside this set are schema-valid
 * but throw at dispatch time.
 */
export const IMPLEMENTED_REPLACE_HANDLERS = new Set<ReplaceHandler>([]);

/**
 * The shape an option declares in YAML under `effects:`. Discriminated
 * on `action`; `replace` requires a `with` handler name.
 */
export type PhaseEffect =
  | { phase: CommandPhase; action: 'skip' }
  | { phase: CommandPhase; action: 'replace'; with: ReplaceHandler };

/**
 * Validate that a value parsed from YAML conforms to `PhaseEffect`.
 * Returns null on success, an error message on failure.
 * `validateCommandEffects` (below) calls this once per effect at
 * load time.
 */
export function validatePhaseEffect(value: unknown): string | null {
  if (value === null || typeof value !== 'object') {
    return 'effect must be an object';
  }
  const obj = value as Record<string, unknown>;
  const phase = obj.phase;
  if (typeof phase !== 'string' || !COMMAND_PHASES.includes(phase as CommandPhase)) {
    return `effect phase '${String(phase)}' is not one of ${COMMAND_PHASES.join(', ')}`;
  }
  const action = obj.action;
  if (action === 'skip') {
    if ('with' in obj) {
      return `effect action 'skip' does not accept 'with'`;
    }
    return null;
  }
  if (action === 'replace') {
    const handler = obj.with;
    if (typeof handler !== 'string') {
      return `effect action 'replace' requires a string 'with' handler name`;
    }
    if (!(REPLACE_HANDLERS as readonly string[]).includes(handler)) {
      return (
        `effect 'with' handler '${handler}' is not one of ` +
        REPLACE_HANDLERS.join(', ')
      );
    }
    return null;
  }
  return `effect action must be 'skip' or 'replace' (got '${String(action)}')`;
}

/**
 * Walk the verb's active option-definition map and collect every
 * `PhaseEffect` whose option is truthy on the bound model and whose
 * declared phase matches `phase`.
 *
 * The dispatcher passes its `collectActiveOptionDefs(...)` output as
 * `optionDefs` — that map's keys are already field-keys (`field ??
 * name`), so the lookup against `activeModel` is direct.
 *
 * An option's effects fire when the bound model's value at that
 * field is truthy. Boolean options are the natural fit; other types
 * coerce per JS truthiness.
 */
export function collectPhaseEffects(
  phase: CommandPhase,
  activeModel: Record<string, unknown>,
  optionDefs: Record<string, { effects?: PhaseEffect[] }>,
): PhaseEffect[] {
  const out: PhaseEffect[] = [];
  for (const [fieldName, def] of Object.entries(optionDefs)) {
    const effects = def.effects;
    if (!effects || effects.length === 0) continue;
    if (!activeModel[fieldName]) continue;
    for (const effect of effects) {
      if (effect.phase === phase) out.push(effect);
    }
  }
  return out;
}

export interface FieldDefinition {
  /**
   * - `string` / `number` / `boolean` — primitive coerce-on-bind.
   * - `object` — singular MQL field; the dispatcher resolves the
   *   bound text via `MqlApi.resolveOne` (when `onExcess: 'top'`) or
   *   `MqlApi.resolveMany` (otherwise — full list needed for
   *   counting / prompting). Implicit cardinality `{ exactly: 1 }`.
   * - `objects` — plural MQL field; the dispatcher resolves via
   *   `MqlApi.resolveMany`. `multiple: true` is NOT used for MQL
   *   fields — the cardinality is the type plus the optional
   *   `cardinality` knob.
   * - `struct` — structured-input-only blob (`Record<string, unknown>`).
   *   Cannot be bound from text — `msh` returns a clear error if a
   *   verb's positional or option of this type appears in tokenised
   *   input. Used by widget/editor clients via
   *   `assembleFromStructured`. Validated against the optional
   *   `schema` (JSON Schema) before user-defined validators fire.
   */
  type?: 'string' | 'number' | 'boolean' | 'object' | 'objects' | 'struct';
  /**
   * Cardinality constraint for `objects` fields. Ignored on other
   * field types. Defaults to `{ min: 0, max: Infinity }`.
   */
  cardinality?: CardinalitySpec;
  /**
   * Policy when MQL resolves too many results.
   *
   *   - `'object'` field default: `'top'` (preserves pre-cardinality
   *     behavior; pick the highest-scored match).
   *   - `'objects'` field default: `'prompt'` if `cardinality.max` is
   *     set, `'take-all'` otherwise.
   *
   * `'top'` and `'take-all'` are mutually exclusive between field
   * types (schema validation rejects `'top'` on `objects`,
   * `'take-all'` on `object`, etc.).
   */
  onExcess?: OnExcessPolicy;
  /**
   * Policy when MQL resolves fewer results than `cardinality.min`.
   * v1 only value: `'error'`. Future values land additively.
   */
  onShortage?: OnShortagePolicy;
  /**
   * Optional JSON Schema fragment for `type: 'struct'` fields. Run
   * by ajv during the structured-input coercion step; failure yields
   * a friendly error pointing at the offending property.
   */
  schema?: Record<string, unknown>;
  required?: boolean;
  /**
   * Greedy positional: consumes the remainder of the original input
   * verbatim (whitespace preserved, escapes processed, quotes
   * literal). Must be the last positional in its block.
   */
  greedy?: boolean;
  multiple?: boolean;
  validators?: string[];
  /**
   * Populated by `CommandApi.preloadAll` once the YAML's validator
   * specs have been dynamic-imported. Always parallels `validators`
   * 1-to-1; absence means preload hasn't run for this YAML yet.
   * @internal
   */
  _resolvedValidators?: FieldValidator[];
  /**
   * Value the matcher fills when the player provides no input for
   * this field. The default runs through shell-side variable
   * interpolation just like player-typed text — `default: "$focus"`
   * resolves to the giver's current focus at bind time.
   *
   * `required: true` + `default:` is allowed: the default replaces
   * the missing input, no shape error. The "missing required arg"
   * message only fires when the field is required AND has no
   * default AND the player supplied nothing.
   */
  default?: string;
  /**
   * MQL scope fragment(s) the dispatcher tries when resolving this
   * field. Each fragment runs through `ShellApi.expandVariables`
   * (so `$focus` / stored vars expand at resolve time) and is tried
   * in order; first non-empty result wins.
   *
   * The YAML/spec record accepts `string | string[]`. After
   * `CommandDefinition` construction, the runtime value is always
   * `string[] | undefined` — `normaliseShape` coerces a bare string
   * into a singleton array, so consumers don't have to branch.
   *
   * The array form is the explicit fallback chain — a verb that
   * wants drill-first-then-broad declares
   * `scope: ['$focus', 'reachable']` so a drilled player searches
   * the focus first with the room as fallback. Verbs that should
   * ignore drill declare a non-`$focus` fragment (e.g.
   * `scope: 'inventory'` for `drop`, `scope: 'peers'` for `get`).
   *
   * Default when omitted: `['$focus']` — the drill chain IS the
   * scope. The resolver's empty-scope fallback to `reachable`
   * stays as the safety net for when the focus chain stops resolving
   * (typically after movement into a different room). Only
   * meaningful for `type: object` / `type: objects` fields.
   */
  scope?: string | string[];
  /**
   * Focus management policy for this field. Three modes:
   *
   *   - `extend` — append the post-desugar input fragment to the
   *     giver's current focus with `:` as the separator. With
   *     same-anchor + via.detailPath compaction (re-resolving the
   *     same target doesn't double-add). The drill-additive default
   *     for inspection-shaped verbs (`look`, `examine`, `read`,
   *     `open`, `close`).
   *
   *   - `replace` — set focus to the post-desugar input fragment
   *     wholesale. For navigation/anchoring verbs that should reset
   *     the trail rather than extend it.
   *
   *   - `none` (default) — focus unchanged. Most commands (`get`,
   *     `drop`, `say`) don't manage focus.
   *
   * Pronoun substitution applies in all extending paths: when raw
   * is itself a pronoun (`it`/`him`/`her`/`them`/`$$`), the stored
   * fragment from pronoun memory replaces the literal pronoun string
   * before the focus is updated, so the trail tracks the actual
   * referent rather than the unstable pronoun.
   *
   * Empty resolutions never touch focus regardless of mode — the
   * resolveAndValidate gate is "if resolved.stuff is non-null".
   *
   * Renamed from the v1 `updates_scope?: boolean` field — the field
   * manages **focus**, not scope. The boolean's `true` setting is
   * equivalent to `'extend'` under the new drill-additive default.
   */
  updates_focus?: 'extend' | 'replace' | 'none';
  /**
   * Optional list of prepositions the matcher will consume as a
   * leading boundary marker for this positional field. Lowercased.
   * Typing `look at flower` against `prepositions: [at]` consumes
   * the `at` and binds `target = "flower"`; typing `look flower`
   * binds `target = "flower"` directly. The consumed preposition
   * lands on `ctx.prep[fieldName]`.
   *
   * For multi-field commands, *later* fields' declared prepositions
   * also serve as termination boundaries for an earlier greedy
   * field — `give the red flower to bob` splits correctly because
   * `recipient: prepositions: [to]` tells the matcher to stop the
   * greedy `gift` at `to`.
   *
   * Prepositions are always optional: declaring `prepositions: [to]`
   * means "consume `to` if it appears here," not "require `to`."
   */
  prepositions?: string[];
}

/**
 * Positional argument definition — appears in YAML's `args:` array
 * for syntax variants and subcommands. The array's index IS the
 * positional slot number; `name` becomes the model field key the
 * bound value lands on.
 */
export interface PositionalDefinition extends FieldDefinition {
  name: string;
}

/**
 * YAML option definition.
 *
 * Verb-scoped or subcommand-scoped — the scope is structural (which
 * `options:` block the entry sits under). After binding, all options
 * land in the unified `model.fields` keyed by `field` (defaults to
 * the option name).
 */
export interface OptionDefinition {
  short?: string;
  /**
   * Same type taxonomy as positional fields. `struct` is
   * structured-input-only — text-input rejects it with a clear
   * error. `object` / `objects` run through the matcher's MQL
   * resolution (see `scope` below); the controller receives an
   * `MqlOneResult` / `MqlManyResult` wrapper, not the raw string.
   */
  type: 'boolean' | 'string' | 'number' | 'object' | 'objects' | 'struct';
  /** Optional JSON Schema fragment — see `FieldDefinition.schema`. */
  schema?: Record<string, unknown>;
  /** Cardinality / onExcess / onShortage — see `FieldDefinition`. */
  cardinality?: CardinalitySpec;
  onExcess?: OnExcessPolicy;
  onShortage?: OnShortagePolicy;
  /** Field name to land on; defaults to the option's own name. */
  field?: string;
  /**
   * MQL scope fragment(s) the dispatcher tries when resolving this
   * option's value. Same precedence + expander rules as a
   * positional's `scope`. Only meaningful for `type: object` /
   * `type: objects`. Default when omitted: `['$focus']`.
   */
  scope?: string | string[];
  /**
   * Used by payload fields (the structured-form-only family) to
   * declare that the client MUST attach this key. Enforced by
   * `assembleFromStructured` against `command.payload` only —
   * verb-scoped options ignore it (options are by convention
   * optional).
   */
  required?: boolean;
  /**
   * If true, repeated occurrences accumulate into an array. False
   * (the default) means a second occurrence is a bind error.
   */
  multiple?: boolean;
  default?: unknown;
  description?: string;
  validators?: string[];
  /** @internal — populated by `CommandApi.preloadAll`. */
  _resolvedValidators?: FieldValidator[];
  /**
   * Lifecycle effects this option applies to the dispatcher when the
   * bound model value is truthy. Each entry names a phase from
   * `COMMAND_PHASES` and an action (`skip` or `replace`). The
   * dispatcher's phase walk consults the option set at every gated
   * point and honors matching effects.
   *
   * Concrete shapes (see the phase taxonomy at the top of this file):
   *
   *   `look --peek`:
   *     options:
   *       peek:
   *         type: boolean
   *         effects:
   *           - { phase: focus-update, action: skip }
   *
   *   Future `--async`:
   *     options:
   *       async:
   *         type: boolean
   *         effects:
   *           - { phase: dispatch, action: replace, with: deferred-dispatch }
   *
   * Schema validates phase + handler names against the documented
   * vocabulary at YAML load time; the dispatcher throws at runtime
   * when an effect targets a phase or replacement handler that
   * hasn't been wired into the substrate yet.
   */
  effects?: PhaseEffect[];
}

/**
 * YAML subcommand definition. Positionals come from the ordered
 * `args:` array; options are an unordered map keyed by option name.
 *
 * `controller:` (Option E) is the per-subcommand override — when
 * present the framework clones that controller template instead of
 * the verb-level `controller`. Existing subcommanded verbs
 * (`settings`, `alias`, `var`, `help`, `player`) leave it absent
 * and continue to share their verb-level controller.
 */
export interface SubcommandDefinition {
  description?: string;
  controller?: string;
  args?: PositionalDefinition[];
  options?: Record<string, OptionDefinition>;
}

/**
 * Command View - YAML command definition (the "View" in MVC).
 *
 * `args` and `subcommands` are mutually exclusive at the top level;
 * having both is a load-time error. Either may be absent (a verb
 * with no positionals and no subcommands is a zero-arg command like
 * `ping` or `inventory`).
 *
 * `validators` is the verb-level validator list — fires before field
 * validators with `context.commandGiver` populated. Used for
 * command-shape preconditions (animacy, future mobility / vocal
 * checks).
 */
export interface CommandView {
  verbs: string[];
  /**
   * Verb-level controller template name. Optional only when every
   * subcommand declares its own `controller:` (Option E — the verb
   * has no meaningful bare-verb behavior).
   */
  controller?: string;
  description: string;
  args?: PositionalDefinition[];
  subcommands?: Record<string, SubcommandDefinition>;
  options?: Record<string, OptionDefinition>;
  /**
   * Structured-form-only fields. Populated exclusively through
   * `CommandApi.assembleFromStructured` (the `msh` text-input path
   * doesn't see these). Use for content the client composes via a
   * GUI / editor buffer / non-textual UI — code bodies, JSON
   * blobs, anything that doesn't ride well through tokenization.
   *
   * Field shape mirrors `OptionDefinition` (type / schema /
   * validators / scope / multiple / default / field). The
   * `short` / `prepositions` / `greedy` ergonomics don't apply
   * here — payload fields aren't keyboardable.
   */
  payload?: Record<string, OptionDefinition>;
  validators?: string[];
  /**
   * Opt-in flag permitting top-level `args:` AND `subcommands:` to
   * coexist. The matcher tries subcommands first; on an unknown first
   * token, it falls through to Phase 3a — binding the token + remaining
   * tokens against the top-level `args:`. Required together with both
   * fields; the YAML validator refuses any other combination.
   *
   * Used by `chat <channel> <message>` so the reserved-subcommand check
   * (mute/who/make/...) takes precedence while bare posts (chat gossip
   * hi) still bind through the top-level args.
   */
  fallthrough?: boolean;
}

/**
 * Schema-delivery payload for system.commands.{added,reset}. Mirrors
 * the YAML view minus runtime-only bits.
 */
export interface CommandSchemaPayload {
  verbs: string[];
  controller?: string;
  description: string;
  args?: PositionalDefinition[];
  subcommands?: Record<string, SubcommandDefinition>;
  options?: Record<string, OptionDefinition>;
  /**
   * Structured-form-only fields. Surfaces to widget / editor
   * clients so they know which keys to attach to their structured
   * payloads.
   */
  payload?: Record<string, OptionDefinition>;
  fallthrough?: boolean;
}

// Get path to command YAML directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const CMD_DIR = join(__dirname, '../cmd');
/** Project's `src/mud/` — root for absolute (`/X`) validator specs. */
const MUD_ROOT = resolvePath(__dirname, '..');

/**
 * CommandApi - Static command definition cache
 *
 * Production dispatch never queries the cache directly; it walks each
 * giver's recency stack (`CommandGiverMixin.getAvailableCommands()`)
 * and filters via `CommandApi.matchVerbContextual`. The filename-keyed
 * map below is just a "load once, reuse" sharing layer between the
 * recency-push helpers and the YAML preload pass.
 */
export class CommandApi {
  /** Cached command definitions by filename (load-once sharing) */
  static #commands: Map<string, CommandDefinition> = new Map();

  /**
   * Get a command definition by filename, loading it if not cached.
   * Returns the cached instance on repeat calls so the recency-push
   * pipeline never re-parses the same YAML.
   */
  static getCommand(filename: string): CommandDefinition | null {
    if (this.#commands.has(filename)) {
      return this.#commands.get(filename)!;
    }

    try {
      const filePath = join(CMD_DIR, filename);
      const command = CommandDefinition.fromFile(filePath);
      this.#commands.set(filename, command);
      return command;
    } catch (error) {
      console.error(`CommandApi: Failed to load command ${filename}:`, error);
      return null;
    }
  }

  /**
   * Clear the filename cache. Used by tests; production should
   * prefer `invalidate(filename)` to drop a single entry when a
   * YAML changes on disk.
   */
  static clearCache(): void {
    this.#commands.clear();
  }

  /**
   * Drop the cached `CommandDefinition` for one YAML so the next
   * `getCommand(filename)` re-reads from disk. The escape hatch
   * for dev edits — command YAMLs don't auto-reload (the cache
   * outlives file edits), so the workflow is: edit YAML → call
   * `CommandApi.invalidate('foo.yaml')` → next push reloads.
   *
   * Note: live recency-stack entries that already hold a reference
   * to the old `CommandDefinition` keep using it until they pop.
   * The next `applyContainmentDelta` / `applyShadowDelta` push will
   * pick up the reloaded definition.
   *
   * Returns `true` if the entry existed and was removed.
   */
  static invalidate(filename: string): boolean {
    return this.#commands.delete(filename);
  }

  /**
   * Eager boot-time load: walk every YAML under `mud/cmd/`, parse
   * it, and resolve every validator reference into a live function.
   * After preload, every cached `CommandDefinition` has its
   * `FieldDefinition._resolvedValidators` populated.
   *
   * Returns the count of YAMLs that loaded successfully and the list
   * of files that failed (parse error, validator-resolve error, etc).
   */
  static async preloadAll(): Promise<{ loaded: number; failed: string[] }> {
    let entries: string[];
    try {
      entries = readdirSync(CMD_DIR);
    } catch (err) {
      console.error(`CommandApi: cannot read cmd dir at ${CMD_DIR}:`, err);
      return { loaded: 0, failed: [] };
    }
    const yamls = entries.filter((f) => f.endsWith('.yaml'));
    const failed: string[] = [];
    let loaded = 0;
    for (const file of yamls) {
      const cmd = this.getCommand(file);
      if (!cmd) {
        failed.push(file);
        continue;
      }
      try {
        await resolveCommandValidators(cmd);
        validateCommandEffects(cmd);
        loaded += 1;
      } catch (err) {
        console.error(
          `CommandApi: validator preload failed for ${file}:`,
          err
        );
        failed.push(file);
      }
    }
    return { loaded, failed };
  }

  /**
   * Collect the `self`-bucket command contributions from a class
   * chain. The concrete class wins over its mixins; mixins later in
   * the prototype chain (closer to Object) lose to earlier ones.
   * Used at host registration to seed the `'self'` recency entry.
   */
  static collectSelfDefs(ctor: unknown): CommandDefinition[] {
    return collectBucketDefs(ctor, 'self');
  }

  /**
   * Recency-stack delta for a successful containment move. Source-
   * side pops, dest-side pushes; if the moving item is itself a
   * CommandGiver, its env+peers slice is rebuilt from the new
   * neighborhood.
   *
   * Called by `ContainmentApi.move` after `setContainer` succeeds,
   * before notification hooks fire.
   */
  static applyContainmentDelta(
    item: Stuff,
    from: (Stuff & Container) | null,
    to: (Stuff & Container) | null
  ): void {
    applyContainmentDeltaImpl(item, from, to);
  }

  /**
   * Recency-stack delta for a shadow attach/detach. A shadow whose
   * class declares `commandContributions` lands on the host's stack
   * (and on reachable peers' stacks per bucket) on attach; detach
   * pops the shadow from every giver.
   *
   * Called by `ShadowApi.attach` and `ShadowApi.detach` around the
   * atomic install/remove.
   */
  static applyShadowDelta(
    host: Stuff,
    shadow: Stuff,
    op: 'attach' | 'detach'
  ): void {
    applyShadowDeltaImpl(host, shadow, op);
  }

  /**
   * Resolve a parser spec to a `Parser` instance.
   *
   * Spec conventions:
   *   - Bare name (no `/`) → `<src>/mud/lib/command/parsers/<name>.ts`.
   *   - Absolute path (`/X`) → `<src>/mud/X.ts`.
   *
   * The default framework parser is `'msh'` (Mud SHell — the
   * tokenizer-driven shell). Custom parsers can live anywhere under
   * `mud/`; reference them by absolute path from the
   * `shell.parser` setting.
   *
   * @throws Error if the spec is malformed, the file isn't found,
   *         or the module's default export isn't a Parser-shaped
   *         object.
   */
  /**
   * Construct a fresh `CommandContext` for one dispatch attempt.
   * The dispatcher mints a per-`_executeOne` context so the
   * accumulator captures exactly the claiming attempt's notes —
   * see {@link CommandGiverMixin._runChain}. Tests use this to
   * drive controllers directly with a synthetic ctx.
   */
  static createCommandContext(
    args: CreateCommandContextArgs,
  ): CommandContext {
    return new CommandContextImpl(args);
  }

  static async resolveParser(spec: string): Promise<Parser> {
    const absolutePath = resolveParserSpec(spec);
    const fileUrl = pathToFileURL(absolutePath).href;
    let mod: { default?: unknown };
    try {
      mod = (await import(fileUrl)) as { default?: unknown };
    } catch (err) {
      throw new Error(
        `parser '${spec}' (resolved to ${absolutePath}) could not be loaded: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    }
    const candidate = mod.default;
    if (
      !candidate ||
      typeof candidate !== 'object' ||
      typeof (candidate as Parser).name !== 'string' ||
      typeof (candidate as Parser).parse !== 'function'
    ) {
      throw new Error(
        `parser '${spec}' (resolved to ${absolutePath}) must default-export an object with { name, parse }`
      );
    }
    return candidate as Parser;
  }

  /**
   * Resolve a YAML-declared validator reference to its
   * `FieldValidator` function.
   *
   * Path conventions:
   *   - `/X`     → `<src>/mud/X.ts` (mud-rooted absolute).
   *   - `./X`, `../X` → relative to `fromYaml`'s directory.
   *
   * Bare names and package specifiers are rejected — the path tells
   * you exactly where the validator lives, no implicit search paths.
   *
   * The JS module cache handles repeat loads; no bespoke registry.
   *
   * @throws Error if the spec is malformed, the file isn't found,
   *         or the module's default export isn't a function.
   */
  static async resolveValidator(
    spec: string,
    fromYaml: string
  ): Promise<FieldValidator> {
    const absolutePath = resolveValidatorSpec(spec, fromYaml);
    const fileUrl = pathToFileURL(absolutePath).href;
    let mod: { default?: unknown };
    try {
      mod = (await import(fileUrl)) as { default?: unknown };
    } catch (err) {
      throw new Error(
        `validator '${spec}' (resolved to ${absolutePath}) could not be loaded: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    }
    const fn = mod.default;
    if (typeof fn !== 'function') {
      throw new Error(
        `validator '${spec}' (resolved to ${absolutePath}) must default-export a function; got ${typeof fn}`
      );
    }
    return fn as FieldValidator;
  }

  /**
   * Resolve a verb-level validator spec to a live `CommandValidator`.
   * Same path-resolution as `resolveValidator`, but the runtime
   * signature is `(context) => string | undefined` rather than the
   * field-level `(value, field, context) => …`.
   */
  static async resolveCommandValidator(
    spec: string,
    fromYaml: string
  ): Promise<CommandValidator> {
    const absolutePath = resolveValidatorSpec(spec, fromYaml);
    const fileUrl = pathToFileURL(absolutePath).href;
    let mod: { default?: unknown };
    try {
      mod = (await import(fileUrl)) as { default?: unknown };
    } catch (err) {
      throw new Error(
        `verb-level validator '${spec}' (resolved to ${absolutePath}) could not be loaded: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    }
    const fn = mod.default;
    if (typeof fn !== 'function') {
      throw new Error(
        `verb-level validator '${spec}' (resolved to ${absolutePath}) must default-export a function; got ${typeof fn}`
      );
    }
    return fn as CommandValidator;
  }

  /**
   * Filter the available command list down to those whose verb
   * matches `verb` (case-insensitive). The input list comes from the
   * giver's recency stack, top-of-stack first; the output preserves
   * order so the assemble-stage chain-of-responsibility tries the
   * newest match first. The execute-stage `pass: true` deferral is
   * gone; same-verb collisions are resolved at the assemble stage
   * (shape vs bind), or via dynamic contributions on the recency
   * stack — see `command-routing.md`.
   */
  static matchVerbContextual(
    verb: string,
    available: CommandDefinition[]
  ): CommandDefinition[] {
    return available.filter((cmd) => cmd.hasVerb(verb));
  }

  /**
   * Bind a `ParsedCommand` to a `CommandDefinition`.
   *
   * Two-tier option scope: tokens before the subcommand are bound
   * against the verb-scoped options; tokens after are bound against
   * the active subcommand's options. Positional fields fill the
   * `fields:` block in insertion order. A `greedy: true` field grabs
   * the slice of `parsed.source` from the first unconsumed positional
   * through end-of-input, preserving whitespace and quotes-as-literal
   * (per spec §2.4).
   *
   * Returns `{ error: 'shape', summary }` for cases the chain should
   * fall through on (pattern doesn't fit, unknown subcommand,
   * leftover positionals, missing required positional). Returns
   * `{ error: 'bind', summary }` for cases that stop the chain
   * (unknown option, malformed option value, repeated non-multi
   * option, boolean given a value, value-bearing option missing its
   * value).
   */
  static assemble(
    parsed: ParsedCommand,
    command: CommandDefinition,
    ctx: { commandGiver: Stuff & CommandGiver; location: Stuff & Container }
  ): AssembleResult {
    const tokens = parsed.rawTokens;
    if (tokens.length === 0 || tokens[0]?.kind !== 'word') {
      return { error: 'shape', summary: 'No verb' };
    }

    const expand = makeExpander(ctx.commandGiver);
    const fields: ModelData = {};
    let i = 1;
    let stopped = false;

    // Phase 1: verb-scope options before any subcommand/positional.
    while (i < tokens.length) {
      const t = tokens[i]!;
      if (t.kind === 'word') break;
      if (stopped) break;
      if (t.kind === 'stop-options') {
        stopped = true;
        i++;
        continue;
      }
      const r = bindOptionToken(command, 'verb', tokens, i, fields);
      if (!r.ok) return { error: 'bind', summary: r.summary };
      i = r.nextIndex;
    }

    // Phase 2: subcommand (if the verb has them).
    let subcommand: string | undefined;
    let scope: 'verb' | string = 'verb';
    // Phase 3a fallthrough bookkeeping. When set, Phase 4 binds against
    // `command.args` instead of erroring; `fallthroughCandidate`
    // surfaces in the unknown-subcommand error if Phase 4 bind fails.
    let fallthroughActive = false;
    let fallthroughCandidate: string | undefined;
    if (command.hasSubcommands() && i < tokens.length && !stopped) {
      const t = tokens[i]!;
      if (t.kind === 'word') {
        const sName = t.value;
        const sDef = command.getSubcommand(sName);
        if (sDef) {
          subcommand = sName;
          scope = sName;
          i++;
        } else if (command.fallthrough && command.args.length > 0) {
          // Phase 3a: opt-in fallthrough. Don't consume the token —
          // leave it for Phase 3 to collect as a positional. Remember
          // it for the bind-failure → unknown-subcommand error surface.
          fallthroughActive = true;
          fallthroughCandidate = sName;
        } else {
          return {
            error: 'unknown-subcommand',
            subcommand: sName,
            available: command.getSubcommandNames(),
          };
        }
      }
    }

    // Phase 3: collect positionals / bind sub-scope options.
    const positionals: WordToken[] = [];
    while (i < tokens.length) {
      const t = tokens[i]!;
      if (!stopped && t.kind === 'stop-options') {
        stopped = true;
        i++;
        continue;
      }
      if (
        !stopped &&
        (t.kind === 'short-flags' ||
          t.kind === 'long-flag' ||
          t.kind === 'long-with-value')
      ) {
        const r = bindOptionToken(command, scope, tokens, i, fields);
        if (!r.ok) return { error: 'bind', summary: r.summary };
        i = r.nextIndex;
        continue;
      }
      // word — positional.
      if (t.kind === 'word') positionals.push(t);
      i++;
    }

    // Phase 4: bind positionals against the active args array(s).
    let prep: Record<string, string> = {};
    if (subcommand) {
      const sub = command.getSubcommand(subcommand)!;
      const r = bindPositionals(positionals, sub.args ?? [], parsed, expand);
      if ('error' in r) return r;
      Object.assign(fields, r.bound);
      prep = r.prep;
    } else if (fallthroughActive) {
      // Phase 3a — verb opted into fallthrough. Bind the un-consumed
      // candidate + remaining tokens against the top-level args. On
      // bind failure, surface the ORIGINAL unknown-subcommand error
      // pointing at the candidate — the slate's required behavior.
      const r = bindPositionals(positionals, command.args, parsed, expand);
      if ('error' in r) {
        return {
          error: 'unknown-subcommand',
          subcommand: fallthroughCandidate ?? '',
          available: command.getSubcommandNames(),
        };
      }
      Object.assign(fields, r.bound);
      prep = r.prep;
    } else if (command.hasSubcommands()) {
      // Subcommanded verb without a subcommand — still legal; the
      // controller decides what to do with `model.subcommand ===
      // undefined`. Leftover positionals fail shape.
      if (positionals.length > 0) {
        return {
          error: 'shape',
          summary: `${command.getPrimaryVerb()} requires a subcommand. Use: ${command.getUsage()}`,
        };
      }
    } else {
      // Flat verb — single bind against the top-level args.
      const r = bindPositionals(positionals, command.args, parsed, expand);
      if ('error' in r) return r;
      Object.assign(fields, r.bound);
      prep = r.prep;
    }

    // Apply option defaults that didn't fire.
    applyOptionDefaults(command.verbOptions, fields);
    if (subcommand) {
      const subDef = command.getSubcommand(subcommand);
      applyOptionDefaults(subDef?.options ?? {}, fields);
      fields[SUBCOMMAND_FIELD] = subcommand;
    }

    const out: AssembleSuccess = { model: fields };
    if (Object.keys(prep).length > 0) out.prep = prep;
    return out;
  }

  /**
   * Build a `CommandModel` from a structured-form payload (widget
   * input). The structured path skips parse/match: the client has
   * already chosen verb/subcommand and field keys. The matcher
   * still validates field-name legality and runs type coercion;
   * `type: object` fields go through MQL in `resolveAndValidate`
   * just like the text path.
   */
  static assembleFromStructured(
    payload: {
      verb: string;
      subcommand?: string;
      fields?: Record<string, unknown>;
      raw?: string;
    },
    command: CommandDefinition,
    _ctx: { commandGiver: Stuff & CommandGiver; location: Stuff & Container }
  ): { model: CommandModel } | { error: string } {
    const allowed = command.getAllFieldNames();
    const fields: ModelData = {};
    for (const [k, v] of Object.entries(payload.fields ?? {})) {
      if (!allowed.has(k)) {
        return { error: `unknown field: ${k}` };
      }
      const fdef = lookupFieldDefinition(command, payload.subcommand, k);
      const odef = lookupOptionDefinition(command, payload.subcommand, k);
      const type = fdef?.type ?? odef?.type;
      const schema = fdef?.schema ?? odef?.schema;
      const coerceResult = coerceStructuredValue(type, v, schema, k);
      if (!coerceResult.ok) {
        return { error: `field ${k}: ${coerceResult.error}` };
      }
      fields[k] = coerceResult.value;
    }

    applyOptionDefaults(command.verbOptions, fields);
    applyOptionDefaults(command.payload, fields);
    if (payload.subcommand) {
      const subDef = command.getSubcommand(payload.subcommand);
      if (!subDef) {
        return { error: `unknown subcommand: ${payload.subcommand}` };
      }
      applyOptionDefaults(subDef.options ?? {}, fields);
      fields[SUBCOMMAND_FIELD] = payload.subcommand;
    }

    // Required-payload check: structured-form-only fields with
    // `required: true` MUST be supplied by the client. Default
    // (if any) already filled above; if still missing, error.
    for (const [name, def] of Object.entries(command.payload)) {
      if (!def.required) continue;
      const fname = def.field ?? name;
      if (fields[fname] === undefined) {
        return { error: `missing required payload field: ${fname}` };
      }
    }

    return { model: fields };
  }

  /**
   * Walk every validator attached to `command` (verb-level + field +
   * verb-option + payload + per-subcommand) and await any `preload`
   * hooks they declare. Idempotent — `StuffApi.singleton(path)` is
   * a no-op if the singleton already exists.
   *
   * The dispatcher calls this AFTER `resolveModel` (so field
   * validators get the bound MQL result, not the raw query string)
   * and BEFORE `runValidators` (so sync validators see a populated
   * singleton cache). Validators without a `preload` are skipped.
   *
   * Preload signatures mirror the validators' sync bodies — verb-
   * level preloads receive `(context)`, field-level preloads receive
   * `(value, field, context)`. Field preloads inspect the bound
   * `value` to compute per-target deps (e.g. a
   * `requiresAnimateTarget` preload reads the bound Stuff's
   * `_speciesPath`).
   *
   * MQL path-literal preloading (e.g. ensuring `/lib/species/...`
   * referenced in a `:race(...)` filter is live) is NOT covered
   * here; it lands when a verb actually needs it. Today the only
   * preload consumer is `requiresAnimate`.
   */
  static async preloadValidatorDeps(
    command: CommandDefinition,
    context: CommandContext,
    resolved: CommandModel,
    subcommand?: string
  ): Promise<void> {
    const preloads: Promise<void>[] = [];
    const collectField = (
      list: FieldValidator[] | undefined,
      fname: string
    ): void => {
      if (!list) return;
      const value = resolved[fname];
      for (const v of list) {
        if (typeof v.preload === 'function') {
          preloads.push(v.preload(value, fname, context));
        }
      }
    };
    const collectCmd = (list: CommandValidator[] | undefined): void => {
      if (!list) return;
      for (const v of list) {
        if (typeof v.preload === 'function') preloads.push(v.preload(context));
      }
    };

    collectCmd(command._resolvedValidators);
    const fieldDefs = collectActiveFieldDefs(subcommand, command);
    for (const [fname, def] of Object.entries(fieldDefs)) {
      collectField(def._resolvedValidators, fname);
    }
    for (const [name, opt] of Object.entries(command.verbOptions)) {
      const fname = opt.field ?? name;
      collectField(opt._resolvedValidators, fname);
    }
    for (const [name, opt] of Object.entries(command.payload)) {
      const fname = opt.field ?? name;
      collectField(opt._resolvedValidators, fname);
    }
    if (subcommand) {
      const subOpts = command.getSubcommand(subcommand)?.options ?? {};
      for (const [name, opt] of Object.entries(subOpts)) {
        const fname = opt.field ?? name;
        collectField(opt._resolvedValidators, fname);
      }
    }

    if (preloads.length > 0) await Promise.all(preloads);
  }

  /**
   * Apply the cardinality / onExcess / onShortage policy to a
   * resolved MQL candidate list.
   *
   * Decision matrix:
   *
   *   type=object (implicit `{ exactly: 1 }`):
   *     0 matches → pass through (resolveModel lands `stuff=null`)
   *     1 match   → pass through
   *     >1 match  → onExcess decides:
   *                   'top'    → first match wins (default)
   *                   'error'  → controller-rejected:ambiguous, null
   *                   'prompt' → await PromptApi.mqlObject; player
   *                              picks; cancel propagates as
   *                              PromptCancelledError (caught in
   *                              CommandGiver). No Interactive on
   *                              the context degrades to ambiguous.
   *
   *   type=objects (default `{ min: undefined, max: undefined }`):
   *     under min  → onShortage='error', controller-rejected:insufficient
   *     over max   → onExcess decides:
   *                   'truncate' → cut to max
   *                   'error'    → controller-rejected:too-many, null
   *                   'prompt'   → await PromptApi.mqlMany; player
   *                                picks within bounds; cancel
   *                                propagates as PromptCancelledError.
   *     in-range   → pass through
   *
   * The async prompt paths only fire when an Interactive is
   * attached to the context (Avatar dispatch). Programmatic /
   * scripted dispatch paths fall back to the degrade-to-error
   * branch, since there's nobody to ask.
   *
   * Returns the filtered stuff list, or `null` when the policy
   * dictates failure (an error note has been added to the
   * context). Throws `PromptCancelledError` when the player
   * cancels — the caller (CommandGiver) catches and emits a
   * cancelled-shape `controller-rejected` note.
   */
  static async applyCardinalityPolicy(
    spec: { type?: string; cardinality?: CardinalitySpec; onExcess?: OnExcessPolicy; onShortage?: OnShortagePolicy },
    stuff: Stuff[],
    fname: string,
    context: CommandContext,
  ): Promise<Stuff[] | null> {
    if (spec.type === 'object') {
      const policy = spec.onExcess ?? 'top';
      if (stuff.length === 0) return [];
      if (stuff.length === 1) return stuff;
      // stuff.length > 1
      if (policy === 'top') return [stuff[0]!];
      if (policy === 'error') {
        context.note({
          kind: 'controller-rejected',
          reason: 'ambiguous',
          detail: `${fname}: ambiguous (${stuff.length} matches)`,
        });
        return null;
      }
      // 'prompt' — push mqlObject and await the player's pick. If
      // no Interactive is on the context (e.g. NPC dispatch path),
      // there's no way to disambiguate; degrade to top with a note.
      if (!context.interactive) {
        context.note({
          kind: 'controller-rejected',
          reason: 'ambiguous',
          detail: `${fname}: ambiguous (${stuff.length} matches) and no Interactive to disambiguate`,
        });
        return null;
      }
      const picked = await PromptApi.mqlObject(
        context.interactive,
        `which ${fname}?`,
        stuff,
      );
      if (picked === null) {
        // Pass null through as a no-match — controller will fail
        // with its standard no-match path.
        return [];
      }
      return [picked];
    }

    if (spec.type === 'objects') {
      const card = spec.cardinality ?? {};
      const min = card.exactly ?? card.min ?? 0;
      const max = card.exactly ?? card.max ?? Number.POSITIVE_INFINITY;

      if (stuff.length < min) {
        context.note({
          kind: 'controller-rejected',
          reason: 'insufficient',
          detail: `${fname}: expected at least ${min}, got ${stuff.length}`,
        });
        return null;
      }
      if (stuff.length <= max) return stuff;

      // stuff.length > max
      const policy = spec.onExcess ?? (max === Number.POSITIVE_INFINITY ? 'take-all' : 'prompt');
      if (policy === 'take-all') return stuff;
      if (policy === 'truncate') return stuff.slice(0, max);
      if (policy === 'error') {
        context.note({
          kind: 'controller-rejected',
          reason: 'too-many',
          detail: `${fname}: got ${stuff.length}, max ${max}`,
        });
        return null;
      }
      // 'prompt' — push mqlMany with bounds and await.
      if (!context.interactive) {
        context.note({
          kind: 'controller-rejected',
          reason: 'too-many',
          detail: `${fname}: got ${stuff.length}, max ${max}, no Interactive to narrow`,
        });
        return null;
      }
      const picks = await PromptApi.mqlMany(
        context.interactive,
        `pick ${min}-${max} ${fname}`,
        stuff,
        { min, max: Number.isFinite(max) ? max : undefined },
      );
      return picks;
    }

    return stuff;
  }

  /**
   * Run MQL resolution on `type: object` / `type: objects` fields and
   * options. Returns the bound model with `MqlOneResult` /
   * `MqlManyResult` wrappers where strings used to be; the rest of
   * the fields pass through.
   *
   * Does NOT run validators — that's {@link runValidators}. The split
   * exists so the dispatcher can insert an async preload phase between
   * MQL resolution and validation: field validator preloads need the
   * resolved value to compute their deps (e.g. `requiresAnimateTarget`
   * reads the bound target's `_speciesPath`).
   *
   * Async since `applyCardinalityPolicy` (called per resolved field)
   * can push a PromptApi prompt and await the player's pick. The
   * await propagates `PromptCancelledError` to the caller.
   *
   * Reads `command` from `context`; the active subcommand (if any)
   * is read from `model.subcommand`, which the matcher stamped at
   * bind time.
   */
  static async resolveModel(
    model: CommandModel,
    context: CommandContext,
    prep: Record<string, string> = {}
  ): Promise<{ resolved: CommandModel } | { result: 'failed' }> {
    const command = context.command;
    const subcommand =
      typeof model[SUBCOMMAND_FIELD] === 'string'
        ? (model[SUBCOMMAND_FIELD] as string)
        : undefined;
    const fieldDefs = collectActiveFieldDefs(subcommand, command);
    const resolved: ModelData = { ...model };

    const giver = context.commandGiver;
    const focused = MixinApi.isFocused(giver) ? giver : null;

    // Precompute the MQL permission snapshot once per command. The
    // resolver consults it synchronously to gate pre-resolution
    // operators (`:online`, path seeds, `prop:` filters etc.); the
    // `:admin` predicate's per-target check reads `coreMemberIds`.
    // Best-effort: if the AccessRegistry isn't reachable (no DB,
    // test harness without bootstrap) the snapshot stays absent
    // and the resolver permits — matching the legacy server-internal
    // -caller default for paths that build their own MqlContext.
    if (context._mqlPermission === undefined) {
      try {
        const isAuthor = await AccessApi.isAuthor(giver);
        let coreMemberIds: Set<string> | undefined;
        if (isAuthor) {
          const reg = await GroupApi.registry();
          const core = await reg.managed().findByName('core');
          if (core?._id) {
            const coreRef = `managed:${core._id}`;
            const members = await GroupApi.membersOf(coreRef);
            coreMemberIds = new Set<string>();
            for (const m of members) {
              const pid = (m as { getPlayerId?: () => string }).getPlayerId?.();
              if (pid) coreMemberIds.add(pid);
            }
          }
        }
        context._mqlPermission = { isAuthor, coreMemberIds };
      } catch {
        // AccessRegistry unreachable — leave snapshot absent so the
        // resolver permits (server-internal-caller compatibility).
      }
    }
    const permission = context._mqlPermission;

    // Option-definition map for the active verb / subcommand,
    // collected once and reused. The positional resolve loop
    // consults it for phase-effect gating (e.g. `--peek` skipping
    // focus-update); the option resolve loop below iterates it as
    // its own spec map.
    const optionDefs = collectActiveOptionDefs(subcommand, command);
    // Resolve positional `type: object` / `type: objects` fields.
    // Options of the same types are resolved in a parallel loop
    // below — they share the resolution shape but live in a
    // separate spec map.
    for (const [fname, def] of Object.entries(fieldDefs)) {
      const raw = resolved[fname];
      if (def.type !== 'object' && def.type !== 'objects') continue;
      if (typeof raw !== 'string' || raw.length === 0) continue;

      // Build the scope try-list. The YAML's `scope:` is authoritative
      // — it's the explicit ordered fallback chain. Each entry runs
      // through ShellApi.expandVariables so authors can reference
      // synthetic vars (`$focus`) and stored vars at resolve time. A
      // YAML that wants drill-first-then-broad declares
      // `scope: ['$focus', 'reachable']`.
      //
      // When YAML omits `scope:` entirely, the default is `['$focus']`
      // — the drill chain IS the scope. The resolver's empty-scope
      // fallback to reachable stays as the safety net for when the
      // chain stops resolving (typically after the player walks into
      // a different room and the old chain doesn't make sense).
      //
      // `def.scope` is normalised to `string[] | undefined` by
      // CommandDefinition.normaliseShape, so no Array.isArray here.
      const yamlScopes = (def.scope as string[] | undefined) ?? ['$focus'];
      const tries: string[] = yamlScopes.map((s) =>
        ShellApi.expandVariables(s, giver)
      );

      const focusMode: 'extend' | 'replace' | 'none' =
        def.updates_focus ?? 'none';
      const fieldPrep = prep[fname];

      if (def.type === 'objects') {
        let r: MqlMany;
        try {
          r = { stuff: [] };
          for (const scope of tries) {
            r = MqlApi.resolveMany(raw, { commandGiver: giver, scope, permission });
            if (r.stuff.length > 0) break;
          }
        } catch (err) {
          context.note({
            kind: 'mql-error',
            field: fname,
            stage: 'resolve',
            detail: err instanceof Error ? err.message : String(err),
          });
          return { result: 'failed' };
        }
        // Apply cardinality / onExcess policy. Returns the
        // filtered stuff list or null on policy-driven failure.
        const filtered = await CommandApi.applyCardinalityPolicy(def, r.stuff, fname, context);
        if (filtered === null) return { result: 'failed' };
        const bound: MqlManyResult = { stuff: filtered, raw };
        if (r.via) bound.via = r.via;
        if (r.quantity) bound.quantity = r.quantity;
        if (fieldPrep !== undefined) bound.prep = fieldPrep;
        resolved[fname] = bound;
        if (filtered.length > 0 && focused) {
          focused.getPronounMemory().update({ stuff: filtered }, raw, slotForGenderRouting);
        }
      } else {
        // type: object. When `onExcess` policy is anything other
        // than 'top' (the default), the resolver needs the full
        // candidate list to count / prompt / fail; switch to
        // resolveMany. `onExcess: 'top'` keeps the cheap
        // resolveOne path.
        const useTop = (def.onExcess ?? 'top') === 'top';
        let stuff: Stuff[] = [];
        let via: MqlMany['via'] | undefined;
        let quantity: MqlMany['quantity'] | undefined;
        try {
          for (const scope of tries) {
            if (useTop) {
              const r: MqlOne = MqlApi.resolveOne(raw, { commandGiver: giver, scope, permission });
              if (r.stuff !== null) {
                stuff = [r.stuff];
                via = r.via;
                quantity = r.quantity;
                break;
              }
            } else {
              const r: MqlMany = MqlApi.resolveMany(raw, { commandGiver: giver, scope, permission });
              if (r.stuff.length > 0) {
                stuff = r.stuff;
                via = r.via;
                quantity = r.quantity;
                break;
              }
            }
          }
        } catch (err) {
          context.note({
            kind: 'mql-error',
            field: fname,
            stage: 'resolve',
            detail: err instanceof Error ? err.message : String(err),
          });
          return { result: 'failed' };
        }
        // Apply cardinality / onExcess policy.
        const filtered = await CommandApi.applyCardinalityPolicy(def, stuff, fname, context);
        if (filtered === null) return { result: 'failed' };
        const picked = filtered[0] ?? null;
        const bound: MqlOneResult = { stuff: picked, raw };
        if (via) bound.via = via;
        if (quantity) bound.quantity = quantity;
        if (fieldPrep !== undefined) bound.prep = fieldPrep;
        resolved[fname] = bound;
        if (picked !== null && focused) {
          // Phase-effect gate for `focus-update`. Options declare
          // `effects: [{phase: focus-update, action: skip}]` (e.g.
          // `look --peek`) to suppress the focus chain update for
          // this dispatch. Pronoun memory still updates — only the
          // focus push is held back. `replace` against this phase
          // is not honored today and throws to surface the gap.
          const focusEffects = focusMode !== 'none'
            ? consumePhaseEffects('focus-update', resolved, optionDefs)
            : [];
          const skipFocus = focusEffects.some((e) => e.action === 'skip');
          if (focusMode !== 'none' && !skipFocus) {
            updatePlayerFocus(focused, raw, picked, via, focusMode);
          }
          const asMany: MqlMany = { stuff: [picked] };
          if (via) asMany.via = via;
          focused.getPronounMemory().update(asMany, raw, slotForGenderRouting);
        }
      }
    }

    // Resolve `type: object` / `type: objects` options.
    //
    // Same shape as the positional loop above: walk the active
    // option set (collected once above the positional loop), find
    // string-typed values, run them through MQL with the option's
    // `scope:` (default `['$focus']`). Options never update player
    // focus — that's a positional-side concept (the player drilled
    // INTO the target via that arg); an option saying `--mql foo`
    // is a side-channel reference, not an inspection drill.
    for (const [fname, def] of Object.entries(optionDefs)) {
      const raw = resolved[fname];
      if (def.type !== 'object' && def.type !== 'objects') continue;
      if (typeof raw !== 'string' || raw.length === 0) continue;

      const yamlScopes = (def.scope as string[] | undefined) ?? ['$focus'];
      const tries: string[] = yamlScopes.map((s) =>
        ShellApi.expandVariables(s, giver)
      );

      if (def.type === 'objects') {
        let r: MqlMany;
        try {
          r = { stuff: [] };
          for (const scope of tries) {
            r = MqlApi.resolveMany(raw, { commandGiver: giver, scope, permission });
            if (r.stuff.length > 0) break;
          }
        } catch (err) {
          context.note({
            kind: 'mql-error',
            field: fname,
            stage: 'resolve',
            detail: err instanceof Error ? err.message : String(err),
          });
          return { result: 'failed' };
        }
        const filtered = await CommandApi.applyCardinalityPolicy(def, r.stuff, fname, context);
        if (filtered === null) return { result: 'failed' };
        const bound: MqlManyResult = { stuff: filtered, raw };
        if (r.via) bound.via = r.via;
        if (r.quantity) bound.quantity = r.quantity;
        resolved[fname] = bound;
        if (filtered.length > 0 && focused) {
          focused.getPronounMemory().update({ stuff: filtered }, raw, slotForGenderRouting);
        }
      } else {
        const useTop = (def.onExcess ?? 'top') === 'top';
        let stuff: Stuff[] = [];
        let via: MqlMany['via'] | undefined;
        let quantity: MqlMany['quantity'] | undefined;
        try {
          for (const scope of tries) {
            if (useTop) {
              const r: MqlOne = MqlApi.resolveOne(raw, { commandGiver: giver, scope, permission });
              if (r.stuff !== null) {
                stuff = [r.stuff];
                via = r.via;
                quantity = r.quantity;
                break;
              }
            } else {
              const r: MqlMany = MqlApi.resolveMany(raw, { commandGiver: giver, scope, permission });
              if (r.stuff.length > 0) {
                stuff = r.stuff;
                via = r.via;
                quantity = r.quantity;
                break;
              }
            }
          }
        } catch (err) {
          context.note({
            kind: 'mql-error',
            field: fname,
            stage: 'resolve',
            detail: err instanceof Error ? err.message : String(err),
          });
          return { result: 'failed' };
        }
        const filtered = await CommandApi.applyCardinalityPolicy(def, stuff, fname, context);
        if (filtered === null) return { result: 'failed' };
        const picked = filtered[0] ?? null;
        const bound: MqlOneResult = { stuff: picked, raw };
        if (via) bound.via = via;
        if (quantity) bound.quantity = quantity;
        resolved[fname] = bound;
        if (picked !== null && focused) {
          const asMany: MqlMany = { stuff: [picked] };
          if (via) asMany.via = via;
          focused.getPronounMemory().update(asMany, raw, slotForGenderRouting);
        }
      }
    }

    return { resolved };
  }

  /**
   * Run every sync validator attached to `command` against the
   * already-resolved model in `context`. Order matches the bind
   * pipeline: verb-level first, then field, option, payload, and
   * per-subcommand option validators. First failure short-circuits
   * with a structured `validator-failed` note on `context`.
   *
   * Companion to {@link resolveModel} — call this after MQL
   * resolution (and after the dispatcher's async preload phase) so
   * field validator sync bodies see bound values.
   */
  static runValidators(
    resolved: CommandModel,
    context: CommandContext
  ): { ok: true } | { result: 'failed' } {
    const command = context.command;
    const subcommand =
      typeof resolved[SUBCOMMAND_FIELD] === 'string'
        ? (resolved[SUBCOMMAND_FIELD] as string)
        : undefined;
    const fieldDefs = collectActiveFieldDefs(subcommand, command);

    // Verb-level validators run BEFORE field validators. They guard
    // command-shape preconditions (animacy, mobility, vocal capacity)
    // that don't tie to a specific arg. First failure short-circuits.
    if (command._resolvedValidators) {
      for (const v of command._resolvedValidators) {
        const err = v(context);
        if (err) {
          context.note({
            kind: 'validator-failed',
            validator: 'verb',
            detail: err,
          });
          return { result: 'failed' };
        }
      }
    }

    // Field validators. Optional positionals that didn't bind
    // short-circuit (same rule as options below) so authors don't
    // have to write null-tolerant fallbacks in every validator.
    for (const [fname, def] of Object.entries(fieldDefs)) {
      const v = resolved[fname];
      if (v === undefined && def.required === false) continue;
      const err = runValidators(def._resolvedValidators, v, fname, context);
      if (err) {
        context.note({
          kind: 'validator-failed',
          field: fname,
          validator: 'field',
          detail: err,
        });
        return { result: 'failed' };
      }
    }

    // Verb-option validators. Options are optional unless the YAML
    // explicitly says otherwise; an absent option short-circuits its
    // validator chain so authors don't have to teach every field
    // validator (e.g. `mustBeAgent`) to tolerate `null`.
    for (const [name, opt] of Object.entries(command.verbOptions)) {
      const fname = opt.field ?? name;
      const v = resolved[fname];
      if (v === undefined && opt.required !== true) continue;
      const err = runValidators(opt._resolvedValidators, v, fname, context);
      if (err) {
        context.note({
          kind: 'validator-failed',
          field: fname,
          validator: 'option',
          detail: err,
        });
        return { result: 'failed' };
      }
    }
    // Payload-field validators — same shape as options (payload is
    // option-shaped at the matcher level). Same absent-on-optional
    // short-circuit.
    for (const [name, opt] of Object.entries(command.payload)) {
      const fname = opt.field ?? name;
      const v = resolved[fname];
      if (v === undefined && opt.required !== true) continue;
      const err = runValidators(opt._resolvedValidators, v, fname, context);
      if (err) {
        context.note({
          kind: 'validator-failed',
          field: fname,
          validator: 'payload',
          detail: err,
        });
        return { result: 'failed' };
      }
    }
    if (subcommand) {
      const subOpts = command.getSubcommand(subcommand)?.options ?? {};
      for (const [name, opt] of Object.entries(subOpts)) {
        const fname = opt.field ?? name;
        const err = runValidators(opt._resolvedValidators, resolved[fname], fname, context);
        if (err) {
          context.note({
            kind: 'validator-failed',
            field: fname,
            validator: `subcommand:${subcommand}`,
            detail: err,
          });
          return { result: 'failed' };
        }
      }
    }

    return { ok: true };
  }

  /**
   * Back-compat wrapper: resolve MQL then run validators in a single
   * sync call. NOT used by the dispatcher (which interleaves an
   * async validator-preload phase between MQL resolve and the sync
   * validator phase via `preloadValidatorDeps`). Kept for tests and
   * one-off callers that want the combined sync surface.
   */
  static async resolveAndValidate(
    model: CommandModel,
    context: CommandContext,
    prep: Record<string, string> = {}
  ): Promise<{ resolved: CommandModel } | { result: 'failed' }> {
    const resolved = await this.resolveModel(model, context, prep);
    if ('result' in resolved) return resolved;
    const validated = this.runValidators(resolved.resolved, context);
    if ('result' in validated) return validated;
    return resolved;
  }

  /**
   * Emit a `system.commands.{added,removed,reset}` frame to a
   * recipient. Stamps `commandId` / `causingCommandId` from the
   * ambient ExecutionContext when present (so a recency-stack
   * mutation triggered inside a command is auto-attributed). Skips
   * silently when the recipient isn't a Sensor — schema delivery is
   * best-effort.
   */
  static emitSchemaDelta(
    recipient: Stuff,
    kind: 'added' | 'removed' | 'reset',
    payload: CommandSchemaPayload | { verb: string } | CommandSchemaPayload[]
  ): void {
    if (!MixinApi.isSensor(recipient)) return;
    const topic =
      kind === 'added'
        ? 'system.commands.added'
        : kind === 'removed'
          ? 'system.commands.removed'
          : 'system.commands.reset';

    const meta: MessageFrame['meta'] = { timestamp: Date.now() };
    const ctx = ExecutionContextApi.getCurrentCommandContext();
    if (ctx?.commandId) meta.commandId = ctx.commandId;
    const causing = ExecutionContextApi.getCurrentCausingCommandId();
    if (causing) meta.causingCommandId = causing;

    const frame: MessageFrame = {
      id: nanoid(),
      topic,
      tags: [],
      body: '',
      meta,
      payload,
    };
    MessageApi.sendMessage(recipient as Stuff & Sensor, frame);
  }

  /**
   * Programmatic command invocation — fire `text` on `giver` exactly
   * as if the player had typed it, but stamp `forced: true` on the
   * resulting Command frame so hooks can tell the two apart.
   *
   * Used by:
   *   - The auto-look-on-arrival hook (`look` after a successful
   *     traversal), so the dispatcher's normal `updates_focus` path
   *     re-anchors the focus chain for the new room.
   *   - Future system-fired commands (event-triggered actions, NPC
   *     scripts, scheduled tasks).
   *
   * Player-typed commands continue to flow through `executeCommand`
   * directly with `forced` defaulting to `false`. Hooks that need to
   * distinguish (e.g., a cinematic-locked NPC blocking auto-look)
   * walk the stack via {@link ExecutionContextApi.getCommandStack}
   * and look for forced ancestors.
   */
  static forceCommand(
    giver: Stuff & CommandGiver,
    text: string,
    opts: ExecuteCommandOpts = {}
  ): Promise<void> {
    return giver.executeCommand(text, { ...opts, forced: true });
  }

  /**
   * Project a `CommandDefinition` to a wire-safe schema payload for
   * client-side widget rendering. Used by `system.commands.{added,
   * reset}`.
   */
  static getCommandSchemaPayload(cmd: CommandDefinition): CommandSchemaPayload {
    const out: CommandSchemaPayload = {
      verbs: cmd.verbs,
      controller: cmd.controller,
      description: cmd.description,
    };
    if (cmd.args.length > 0) out.args = cmd.args;
    if (Object.keys(cmd.subcommands).length > 0) out.subcommands = cmd.subcommands;
    if (Object.keys(cmd.verbOptions).length > 0) out.options = cmd.verbOptions;
    if (Object.keys(cmd.payload).length > 0) out.payload = cmd.payload;
    if (cmd.fallthrough) out.fallthrough = true;
    return out;
  }
}

/* ─────────────────── Matcher helpers ─────────────────── */

/** `assemble` success arm. `prep` carries any prepositions consumed
 *  per positional field — keyed by field name, lowercased value.
 *  Absent (or empty) when no field declared `prepositions:`. */
export interface AssembleSuccess {
  model: CommandModel;
  prep?: Record<string, string>;
}

export type AssembleResult =
  | AssembleSuccess
  | { error: 'shape'; summary: string }
  | { error: 'bind'; summary: string }
  | { error: 'unknown-subcommand'; subcommand: string; available: string[] };

interface BindOk {
  ok: true;
  nextIndex: number;
}
interface BindErr {
  ok: false;
  summary: string;
}

function bindOptionToken(
  command: CommandDefinition,
  scope: 'verb' | string,
  tokens: RawToken[],
  i: number,
  fields: ModelData
): BindOk | BindErr {
  const t = tokens[i]!;
  const scopeLabel = scope === 'verb' ? 'verb-level' : `${scope}-level`;

  if (t.kind === 'short-flags') {
    const flags = t.flags;
    let f = 0;
    while (f < flags.length) {
      const ch = flags[f]!;
      const opt = command.getOption(scope, ch);
      if (!opt) {
        return { ok: false, summary: `unknown option -${ch} at ${scopeLabel}` };
      }
      const fname = opt.def.field ?? opt.name;
      if (opt.def.type === 'boolean') {
        const r = applyOptionValue(fields, fname, opt.def, true, opt.name);
        if (!r.ok) return r;
        f++;
        continue;
      }
      // Value-bearing short flag — peel everything after this char as
      // the value, or consume the next word token if nothing left.
      const tail = flags.substring(f + 1);
      let value: string;
      let nextI: number;
      if (tail.length > 0) {
        value = tail;
        nextI = i + 1;
      } else {
        const next = tokens[i + 1];
        if (!next || next.kind !== 'word') {
          return { ok: false, summary: `option -${ch} requires a value` };
        }
        value = next.value;
        nextI = i + 2;
      }
      const coerced = coerceOptionValue(opt.def.type, value);
      if (!coerced.ok) {
        return { ok: false, summary: `option -${ch}: ${coerced.error}` };
      }
      const apply = applyOptionValue(fields, fname, opt.def, coerced.value, opt.name);
      if (!apply.ok) return apply;
      return { ok: true, nextIndex: nextI };
    }
    return { ok: true, nextIndex: i + 1 };
  }

  if (t.kind === 'long-flag') {
    const opt = command.getOption(scope, t.name);
    if (!opt) {
      return { ok: false, summary: `unknown option --${t.name} at ${scopeLabel}` };
    }
    const fname = opt.def.field ?? opt.name;
    if (opt.def.type === 'boolean') {
      const r = applyOptionValue(fields, fname, opt.def, true, opt.name);
      if (!r.ok) return r;
      return { ok: true, nextIndex: i + 1 };
    }
    const next = tokens[i + 1];
    if (!next || next.kind !== 'word') {
      return { ok: false, summary: `option --${t.name} requires a value` };
    }
    const coerced = coerceOptionValue(opt.def.type, next.value);
    if (!coerced.ok) {
      return { ok: false, summary: `option --${t.name}: ${coerced.error}` };
    }
    const r = applyOptionValue(fields, fname, opt.def, coerced.value, opt.name);
    if (!r.ok) return r;
    return { ok: true, nextIndex: i + 2 };
  }

  if (t.kind === 'long-with-value') {
    const opt = command.getOption(scope, t.name);
    if (!opt) {
      return { ok: false, summary: `unknown option --${t.name} at ${scopeLabel}` };
    }
    const fname = opt.def.field ?? opt.name;
    if (opt.def.type === 'boolean') {
      return {
        ok: false,
        summary: `boolean option --${t.name} cannot take a value`,
      };
    }
    const coerced = coerceOptionValue(opt.def.type, t.value);
    if (!coerced.ok) {
      return { ok: false, summary: `option --${t.name}: ${coerced.error}` };
    }
    const r = applyOptionValue(fields, fname, opt.def, coerced.value, opt.name);
    if (!r.ok) return r;
    return { ok: true, nextIndex: i + 1 };
  }

  return { ok: false, summary: 'option binding error' };
}

function applyOptionValue(
  fields: ModelData,
  fname: string,
  def: OptionDefinition,
  value: FieldValue,
  optName: string
): BindOk | BindErr {
  if (def.multiple) {
    const existing = fields[fname];
    if (Array.isArray(existing)) existing.push(value);
    else fields[fname] = [value];
    return { ok: true, nextIndex: -1 };
  }
  if (def.type === 'boolean') {
    // Idempotent — repeated boolean flags collapse to true.
    fields[fname] = value;
    return { ok: true, nextIndex: -1 };
  }
  if (fname in fields) {
    return {
      ok: false,
      summary: `option --${optName} specified more than once`,
    };
  }
  fields[fname] = value;
  return { ok: true, nextIndex: -1 };
}

interface CoerceOk {
  ok: true;
  value: FieldValue;
}
interface CoerceErr {
  ok: false;
  error: string;
}

function coerceOptionValue(
  type: OptionDefinition['type'],
  raw: string
): CoerceOk | CoerceErr {
  switch (type) {
    case 'string':
    case 'object':
    case 'objects':
      // object/objects keep the raw text — the matcher's
      // resolveAndValidate runs MQL on it. Plural-cardinality for
      // options (`type: objects`) comes from the resolution, not
      // from `multiple: true` (which is for accumulating repeated
      // `--opt v --opt v` tokens).
      return { ok: true, value: raw };
    case 'number': {
      const n = Number(raw);
      if (!Number.isFinite(n)) return { ok: false, error: `not a number: ${raw}` };
      return { ok: true, value: n };
    }
    case 'boolean':
      // Boolean options never take a value via this path (long-with-
      // value is rejected upstream). If we still got here, it's a
      // bug; surface as error.
      return { ok: false, error: 'boolean cannot take a value' };
    case 'struct':
      // struct options require structured input; the text path can't
      // meaningfully bind them.
      return {
        ok: false,
        error: 'requires structured input; cannot bind from text',
      };
  }
}

function coerceStructuredValue(
  type: FieldDefinition['type'] | OptionDefinition['type'] | undefined,
  raw: unknown,
  schema?: Record<string, unknown>,
  fieldName?: string
): CoerceOk | CoerceErr {
  if (type === undefined) {
    // No declared type — accept as-is.
    return { ok: true, value: raw as FieldValue };
  }
  if (type === 'string') {
    if (typeof raw !== 'string') {
      return { ok: false, error: `expected string, got ${typeof raw}` };
    }
    return { ok: true, value: raw };
  }
  if (type === 'number') {
    if (typeof raw !== 'number' || !Number.isFinite(raw)) {
      return { ok: false, error: `expected number, got ${typeof raw}` };
    }
    return { ok: true, value: raw };
  }
  if (type === 'boolean') {
    if (typeof raw !== 'boolean') {
      return { ok: false, error: `expected boolean, got ${typeof raw}` };
    }
    return { ok: true, value: raw };
  }
  if (type === 'struct') {
    if (
      raw === null ||
      typeof raw !== 'object' ||
      Array.isArray(raw)
    ) {
      return {
        ok: false,
        error: `expected struct (plain object), got ${
          raw === null ? 'null' : Array.isArray(raw) ? 'array' : typeof raw
        }`,
      };
    }
    if (schema) {
      const schemaErr = validateAgainstJsonSchema(schema, raw);
      if (schemaErr !== null) {
        return {
          ok: false,
          error: fieldName
            ? `field '${fieldName}' failed schema: ${schemaErr}`
            : `failed schema: ${schemaErr}`,
        };
      }
    }
    // Cast through — `Record<string, unknown>` doesn't fit FieldValue's
    // narrower union, but struct values are by contract opaque to the
    // matcher and narrowed by the controller via its typed model
    // interface.
    return { ok: true, value: raw as FieldValue };
  }
  // type: 'object' / 'objects' — accept strings (MQL string) or
  // pre-resolved values (Stuff/array). The structured path can carry
  // pre-resolved objects for forms.
  return { ok: true, value: raw as FieldValue };
}

/**
 * Validate a structured value against a JSON Schema fragment. Returns
 * a friendly error string on failure, `null` on success.
 *
 * Compiled validators are cached by JSON-stringified schema so
 * repeated invocations against the same struct field skip
 * recompilation.
 */
const _structAjv = new Ajv({ allErrors: false, strict: false });
const _compiledStructSchemas = new Map<string, ValidateFunction>();

/**
 * Validate `value` against a JSON Schema fragment. Returns a friendly
 * error string on failure, `null` on success. Compiled validators are
 * cached by JSON-stringified schema so repeated calls against the
 * same fragment skip recompilation.
 *
 * Exported because some validation lives outside the matcher's sync
 * struct path — e.g. `WriteController` reads a class's static
 * `dataSchema` after the (async) class load and validates with the
 * same machinery.
 */
export function validateAgainstJsonSchema(
  schema: Record<string, unknown>,
  value: unknown
): string | null {
  const key = JSON.stringify(schema);
  let validate = _compiledStructSchemas.get(key);
  if (!validate) {
    try {
      validate = _structAjv.compile(schema);
      _compiledStructSchemas.set(key, validate);
    } catch (e) {
      return `invalid JSON Schema: ${(e as Error).message}`;
    }
  }
  const ok = validate(value);
  if (ok) return null;
  const errs = validate.errors ?? [];
  const first = errs[0];
  if (!first) return 'schema validation failed';
  const path = first.instancePath || '<root>';
  return `${path}: ${first.message ?? 'invalid'}`;
}

type WordToken = Extract<RawToken, { kind: 'word' }>;

function bindPositionals(
  positionals: WordToken[],
  args: PositionalDefinition[],
  parsed: ParsedCommand,
  expand: (text: string) => string,
):
  | { bound: ModelData; prep: Record<string, string> }
  | { error: 'shape'; summary: string } {
  const bound: ModelData = {};
  const prep: Record<string, string> = {};
  let pi = 0;

  for (let ai = 0; ai < args.length; ai++) {
    const def = args[ai]!;
    const name = def.name;

    // Peek for a leading preposition this field declared. Consume
    // exactly one; later prepositions on the same field are bound as
    // ordinary positional content.
    if (
      def.prepositions &&
      def.prepositions.length > 0 &&
      pi < positionals.length
    ) {
      const head = positionals[pi]!.value.toLowerCase();
      if (def.prepositions.includes(head)) {
        prep[name] = head;
        pi++;
      }
    }

    if (def.greedy) {
      if (pi >= positionals.length) {
        if (def.default !== undefined) {
          bound[name] = expand(def.default);
          return { bound, prep };
        }
        if (def.required !== false) {
          return {
            error: 'shape',
            summary:
              def.type === 'struct'
                ? `field '${name}' requires structured input; cannot bind from text`
                : `missing required arg: ${name}`,
          };
        }
        // Greedy must be last per the load-time invariant; we
        // don't loop further.
        return { bound, prep };
      }
      if (def.type === 'struct') {
        return {
          error: 'shape',
          summary: `field '${name}' requires structured input; cannot bind from text`,
        };
      }
      const first = positionals[pi]!;
      // Greedy fields stop at the next *later* field's declared
      // preposition (boundary lookahead). Scan forward for a token
      // that matches one of those, and slice up to it.
      const laterPreps = collectLaterPrepositions(args, ai);
      let stopAt = positionals.length;
      if (laterPreps.size > 0) {
        for (let k = pi; k < positionals.length; k++) {
          const tk = positionals[k]!.value.toLowerCase();
          if (laterPreps.has(tk)) {
            stopAt = k;
            break;
          }
        }
      }
      if (stopAt === pi) {
        // The boundary preposition appeared with nothing before it
        // — the greedy field has no content. Default fills if
        // declared; else required→shape error / optional→absent.
        if (def.default !== undefined) {
          bound[name] = expand(def.default);
        } else if (def.required !== false) {
          return {
            error: 'shape',
            summary: `missing required arg: ${name}`,
          };
        }
      } else if (stopAt < positionals.length) {
        // Build the substring from the original source to preserve
        // whitespace, but cut it just before the boundary token.
        const startInSource = first.pos - parsed.start;
        const last = positionals[stopAt - 1]!;
        const endInSource = last.pos + last.value.length - parsed.start;
        const slice = parsed.source.substring(startInSource, endInSource);
        const processed = CommandLineApi.processOutsideEscapes(slice).trimEnd();
        bound[name] = expand(processed);
      } else {
        const startInSource = first.pos - parsed.start;
        const slice = parsed.source.substring(startInSource);
        const processed = CommandLineApi.processOutsideEscapes(slice);
        bound[name] = expand(processed);
      }
      pi = stopAt;
      // After the greedy field consumes (or skips), continue binding
      // remaining positionals to subsequent fields.
      continue;
    }

    // Boundary lookahead extends to non-greedy fields too: if the
    // next available token belongs to a later field's `prepositions`
    // list, this field has no input — apply the default (or fail
    // when required without default).
    const laterPreps = collectLaterPrepositions(args, ai);
    const nextBelongsToLater =
      pi < positionals.length &&
      laterPreps.has(positionals[pi]!.value.toLowerCase());

    if (def.required) {
      if (pi >= positionals.length || nextBelongsToLater) {
        if (def.default !== undefined) {
          bound[name] = expand(def.default);
          continue;
        }
        return {
          error: 'shape',
          summary:
            def.type === 'struct'
              ? `field '${name}' requires structured input; cannot bind from text`
              : `missing required arg: ${name}`,
        };
      }
      if (def.type === 'struct') {
        return {
          error: 'shape',
          summary: `field '${name}' requires structured input; cannot bind from text`,
        };
      }
      bound[name] = expand(positionals[pi]!.value);
      pi++;
      continue;
    }

    // Optional positional.
    if (pi < positionals.length && !nextBelongsToLater) {
      if (def.type === 'struct') {
        return {
          error: 'shape',
          summary: `field '${name}' requires structured input; cannot bind from text`,
        };
      }
      bound[name] = expand(positionals[pi]!.value);
      pi++;
    } else if (def.default !== undefined) {
      bound[name] = expand(def.default);
    }
  }

  if (pi < positionals.length) {
    // Leftover positionals — this verb's grammar didn't fit, let
    // the chain try another match.
    return { error: 'shape', summary: 'too many arguments' };
  }

  return { bound, prep };
}

/**
 * Build a per-call expander. Returns the identity function when
 * the giver doesn't compose `EnvironmentMixin` or has
 * `shell.interpolate-vars` set to false — callers stay branch-free.
 */
function makeExpander(giver: Stuff): (text: string) => string {
  if (!MixinApi.isEnvironment(giver)) return (s) => s;
  const enabled = giver.getSetting<boolean>('shell.interpolate-vars');
  if (enabled === false) return (s) => s;
  return (text) => ShellApi.expandVariables(text, giver);
}

/** Collect every later positional's declared prepositions into one
 *  set. Used as the greedy-field termination lookahead — `give the
 *  red flower to bob` stops the greedy `gift` at `to` because
 *  `recipient` declared `prepositions: [to]`. */
function collectLaterPrepositions(
  args: PositionalDefinition[],
  fromIdx: number
): Set<string> {
  const out = new Set<string>();
  for (let i = fromIdx + 1; i < args.length; i++) {
    const ps = args[i]!.prepositions;
    if (!ps) continue;
    for (const p of ps) out.add(p.toLowerCase());
  }
  return out;
}

function applyOptionDefaults(
  scope: Record<string, OptionDefinition>,
  fields: ModelData
): void {
  for (const [name, def] of Object.entries(scope)) {
    const fname = def.field ?? name;
    if (!(fname in fields) && def.default !== undefined) {
      fields[fname] = def.default as FieldValue;
    }
  }
}

function lookupFieldDefinition(
  command: CommandDefinition,
  subcommand: string | undefined,
  fname: string
): FieldDefinition | undefined {
  if (subcommand) {
    const sub = command.getSubcommand(subcommand);
    return (sub?.args ?? []).find((a) => a.name === fname);
  }
  return command.args.find((a) => a.name === fname);
}

function lookupOptionDefinition(
  command: CommandDefinition,
  subcommand: string | undefined,
  fname: string
): OptionDefinition | undefined {
  for (const [name, def] of Object.entries(command.verbOptions)) {
    if ((def.field ?? name) === fname) return def;
  }
  // Payload fields share the OptionDefinition shape — same coercion
  // and resolution treatment as a verb-scoped option, just only
  // populated through the structured-form path.
  for (const [name, def] of Object.entries(command.payload)) {
    if ((def.field ?? name) === fname) return def;
  }
  if (subcommand) {
    const sub = command.getSubcommand(subcommand);
    for (const [name, def] of Object.entries(sub?.options ?? {})) {
      if ((def.field ?? name) === fname) return def;
    }
  }
  return undefined;
}

function collectActiveFieldDefs(
  subcommand: string | undefined,
  command: CommandDefinition
): Record<string, FieldDefinition> {
  const out: Record<string, FieldDefinition> = {};
  if (subcommand) {
    for (const a of command.getSubcommand(subcommand)?.args ?? []) {
      out[a.name] = a;
    }
  } else {
    for (const a of command.args) out[a.name] = a;
  }
  return out;
}

/**
 * Dispatcher-side wrapper around `collectPhaseEffects` that enforces
 * the substrate's implementation status: a `replace` action whose
 * handler isn't in `IMPLEMENTED_REPLACE_HANDLERS` throws, and any
 * effect targeting a phase outside `HOOKABLE_PHASES` throws.
 *
 * Callers consume the returned list to decide phase behavior (e.g.
 * any entry with `action: 'skip'` → bypass the phase). Effects pass
 * load-time validation (`validatePhaseEffect`); this gate catches
 * vocabulary that's documented but unimplemented at the runtime
 * boundary so half-built features can't sneak through.
 */
function consumePhaseEffects(
  phase: CommandPhase,
  activeModel: Record<string, unknown>,
  optionDefs: Record<string, OptionDefinition>,
): PhaseEffect[] {
  const effects = collectPhaseEffects(phase, activeModel, optionDefs);
  if (effects.length === 0) return effects;
  if (!HOOKABLE_PHASES.has(phase)) {
    throw new Error(
      `Command phase '${phase}' is named in the vocabulary but the ` +
        `dispatcher has not made it hookable yet — an option declared ` +
        `an effect against it but no substrate honors the gate.`,
    );
  }
  for (const effect of effects) {
    if (effect.action === 'replace' &&
        !IMPLEMENTED_REPLACE_HANDLERS.has(effect.with)) {
      throw new Error(
        `Replace handler '${effect.with}' is documented but not yet ` +
          `implemented — an option declared 'replace' against phase ` +
          `'${phase}' with this handler name.`,
      );
    }
  }
  return effects;
}

/**
 * Collect every option active for the current call, keyed by the
 * option's effective field name (`opt.field ?? optName`). Verb-
 * scoped options are always active; subcommand-scoped options are
 * included only when the matched subcommand owns them.
 *
 * Used by `resolveAndValidate` to run MQL on `type: object` /
 * `type: objects` options the same way it does for positional
 * fields.
 */
function collectActiveOptionDefs(
  subcommand: string | undefined,
  command: CommandDefinition
): Record<string, OptionDefinition> {
  const out: Record<string, OptionDefinition> = {};
  for (const [name, def] of Object.entries(command.verbOptions)) {
    out[def.field ?? name] = def;
  }
  // Payload fields participate in MQL resolution too — they're
  // option-shaped at the matcher level, just populated through the
  // structured-form path instead of via flag tokens.
  for (const [name, def] of Object.entries(command.payload)) {
    out[def.field ?? name] = def;
  }
  if (subcommand) {
    const subOpts = command.getSubcommand(subcommand)?.options ?? {};
    for (const [name, def] of Object.entries(subOpts)) {
      out[def.field ?? name] = def;
    }
  }
  return out;
}

/**
 * Walk every `validators: [...]` block on a CommandDefinition and
 * resolve each spec into a live function via
 * `CommandApi.resolveValidator`. Stores the result on
 * `_resolvedValidators`. Idempotent — calling twice just re-resolves
 * (the JS module cache makes the second pass cheap).
 */
async function resolveCommandValidators(
  cmd: CommandDefinition
): Promise<void> {
  const yamlPath = cmd.filePath;
  const resolveOne = async (
    target: { validators?: string[]; _resolvedValidators?: FieldValidator[] }
  ): Promise<void> => {
    if (!target.validators || target.validators.length === 0) return;
    const fns: FieldValidator[] = [];
    for (const spec of target.validators) {
      fns.push(await CommandApi.resolveValidator(spec, yamlPath));
    }
    target._resolvedValidators = fns;
  };

  for (const a of cmd.args) await resolveOne(a);
  for (const sub of Object.values(cmd.subcommands)) {
    for (const a of sub.args ?? []) await resolveOne(a);
    for (const opt of Object.values(sub.options ?? {})) {
      await resolveOne(opt);
    }
  }
  for (const opt of Object.values(cmd.verbOptions)) {
    await resolveOne(opt);
  }
  for (const opt of Object.values(cmd.payload)) {
    await resolveOne(opt);
  }

  // Verb-level (top-level) validators — different signature, so the
  // resolver dispatches to `resolveCommandValidator` (not the field
  // form). Stored on `cmd._resolvedValidators` (not on a target).
  if (cmd.validators.length > 0) {
    const fns: CommandValidator[] = [];
    for (const spec of cmd.validators) {
      fns.push(await CommandApi.resolveCommandValidator(spec, yamlPath));
    }
    cmd._resolvedValidators = fns;
  }
}

/**
 * Walk every option-bearing slot on a command and validate each
 * `effects:` entry against the `PhaseEffect` shape (phase name in
 * `COMMAND_PHASES`, action `'skip' | 'replace'`, `replace` carries a
 * `with` handler name from `REPLACE_HANDLERS`).
 *
 * Load-time only — runtime gating (whether the named phase or
 * handler is actually wired into the dispatcher) lives in
 * `consumePhaseEffects`. Authors can declare effects against
 * documented-but-unimplemented vocabulary; the schema accepts them,
 * the dispatcher throws if a real command tries to fire the gate.
 *
 * Throws on the first malformed effect with a message naming the
 * verb, option, and the validator's failure detail.
 */
function validateCommandEffects(cmd: CommandDefinition): void {
  const checkOptions = (
    optionsMap: Record<string, OptionDefinition>,
    scope: string,
  ): void => {
    for (const [optName, def] of Object.entries(optionsMap)) {
      const effects = def.effects;
      if (!effects) continue;
      if (!Array.isArray(effects)) {
        throw new Error(
          `${scope} option '${optName}': effects must be an array`,
        );
      }
      for (let i = 0; i < effects.length; i++) {
        const msg = validatePhaseEffect(effects[i]);
        if (msg !== null) {
          throw new Error(
            `${scope} option '${optName}' effects[${i}]: ${msg}`,
          );
        }
      }
    }
  };
  checkOptions(cmd.verbOptions, cmd.filePath);
  checkOptions(cmd.payload, `${cmd.filePath} (payload)`);
  for (const [subName, sub] of Object.entries(cmd.subcommands)) {
    if (sub.options) {
      checkOptions(sub.options, `${cmd.filePath}#${subName}`);
    }
  }
}

/** Path resolver for parser specs. See `CommandApi.resolveParser`. */
function resolveParserSpec(spec: string): string {
  if (spec.startsWith('/')) {
    return resolvePath(MUD_ROOT, spec.slice(1) + '.ts');
  }
  if (spec.includes('/')) {
    throw new Error(
      `parser spec '${spec}' must be a bare name or start with '/' (mud-rooted absolute)`
    );
  }
  // Bare name — framework default location.
  return resolvePath(MUD_ROOT, 'lib/command/parsers', spec + '.ts');
}

/* ────────── recency-stack orchestration helpers ────────── */

type ContributionsHolder = { commandContributions?: CommandContributions };
type Bucket = 'self' | 'inventory' | 'environment' | 'peers';

/** Read the `commandContributions` static off a class-like value. */
function getContributions(cls: unknown): CommandContributions | undefined {
  return (cls as ContributionsHolder).commandContributions;
}

/** Resolve a list of YAML filenames to CommandDefinitions, deduped. */
function resolveDefs(filenames: string[] | undefined): CommandDefinition[] {
  if (!filenames || filenames.length === 0) return [];
  const out: CommandDefinition[] = [];
  const seen = new Set<string>();
  for (const fname of filenames) {
    if (seen.has(fname)) continue;
    seen.add(fname);
    const cmd = CommandApi.getCommand(fname);
    if (cmd) out.push(cmd);
  }
  return out;
}

/**
 * Walk a class chain — concrete first, then mixins — and collect
 * the named bucket's filenames into a deduped CommandDefinition[].
 */
function collectBucketDefs(
  ctor: unknown,
  bucket: Bucket
): CommandDefinition[] {
  const filenames: string[] = [];
  const own = getContributions(ctor);
  const ownList = own?.[bucket];
  if (ownList) filenames.push(...ownList);
  const mixins = MixinApi.queryMixins(
    ctor as { prototype: unknown } & ((...args: unknown[]) => unknown)
  );
  for (const mixin of mixins) {
    const mlist = getContributions(mixin)?.[bucket];
    if (mlist) filenames.push(...mlist);
  }
  return resolveDefs(filenames);
}

function applyContainmentDeltaImpl(
  item: Stuff,
  from: (Stuff & Container) | null,
  to: (Stuff & Container) | null
): void {
  // Source side: pop from anyone whose stack carried item.
  if (from) {
    if (MixinApi.isCommandGiver(from)) {
      (from as Stuff & CommandGiver).popCommandSource(item);
    }
    for (const sibling of from.getContents()) {
      if (sibling === item) continue;
      if (MixinApi.isCommandGiver(sibling)) {
        (sibling as Stuff & CommandGiver).popCommandSource(item);
      }
    }
  }

  // Dest side: push to anyone whose stack now carries item.
  if (to) {
    if (MixinApi.isCommandGiver(to)) {
      const defs = collectBucketDefs(item.constructor, 'inventory');
      if (defs.length > 0) {
        (to as Stuff & CommandGiver).pushCommandSource(item, 'inventory', defs);
      }
    }
    const envDefs = collectBucketDefs(item.constructor, 'environment');
    const peerDefs = MixinApi.isCommandGiver(item)
      ? collectBucketDefs(item.constructor, 'peers')
      : [];
    if (envDefs.length > 0 || peerDefs.length > 0) {
      for (const sibling of to.getContents()) {
        if (sibling === item) continue;
        if (!MixinApi.isCommandGiver(sibling)) continue;
        const siblingCG = sibling as Stuff & CommandGiver;
        if (envDefs.length > 0) {
          siblingCG.pushCommandSource(item, 'environment', envDefs);
        }
        if (peerDefs.length > 0) {
          siblingCG.pushCommandSource(item, 'peers', peerDefs);
        }
      }
    }
  }

  // Self-move: item is a CommandGiver entering a container. Drop
  // any prior env+peers slice and push contributions from each
  // neighbor in the new container — this is what makes "I just
  // walked into a room" see the room's existing contents on the
  // giver's own stack.
  if (MixinApi.isCommandGiver(item) && to) {
    const itemCG = item as Stuff & CommandGiver;
    if (from) itemCG.resetCommandSources('self-moved');
    for (const neighbor of to.getContents()) {
      if ((neighbor as Stuff) === item) continue;
      const envDefs = collectBucketDefs(neighbor.constructor, 'environment');
      const peerDefs = MixinApi.isCommandGiver(neighbor)
        ? collectBucketDefs(neighbor.constructor, 'peers')
        : [];
      if (envDefs.length > 0) {
        itemCG.pushCommandSource(neighbor, 'environment', envDefs);
      }
      if (peerDefs.length > 0) {
        itemCG.pushCommandSource(neighbor, 'peers', peerDefs);
      }
    }
  }
}

function applyShadowDeltaImpl(
  host: Stuff,
  shadow: Stuff,
  op: 'attach' | 'detach'
): void {
  const push = (
    cg: Stuff & CommandGiver,
    bucket: Bucket,
    defs: CommandDefinition[]
  ): void => {
    if (defs.length === 0) return;
    cg.pushCommandSource(shadow, bucket, defs);
  };

  if (op === 'attach') {
    if (MixinApi.isCommandGiver(host)) {
      push(
        host as Stuff & CommandGiver,
        'self',
        collectBucketDefs(shadow.constructor, 'self')
      );
    }
    if (!MixinApi.isContainable(host)) return;
    const container = (host as Stuff & Containable).getContainer();
    if (!container) return;
    if (MixinApi.isCommandGiver(container)) {
      push(
        container as Stuff & CommandGiver,
        'inventory',
        collectBucketDefs(shadow.constructor, 'inventory')
      );
    }
    const envDefs = collectBucketDefs(shadow.constructor, 'environment');
    const peerDefs = MixinApi.isCommandGiver(host)
      ? collectBucketDefs(shadow.constructor, 'peers')
      : [];
    if (envDefs.length === 0 && peerDefs.length === 0) return;
    for (const sibling of container.getContents()) {
      if ((sibling as Stuff) === host) continue;
      if (!MixinApi.isCommandGiver(sibling)) continue;
      const siblingCG = sibling as Stuff & CommandGiver;
      push(siblingCG, 'environment', envDefs);
      push(siblingCG, 'peers', peerDefs);
    }
    return;
  }

  // detach: pop the shadow from every reachable giver.
  if (MixinApi.isCommandGiver(host)) {
    (host as Stuff & CommandGiver).popCommandSource(shadow);
  }
  if (!MixinApi.isContainable(host)) return;
  const container = (host as Stuff & Containable).getContainer();
  if (!container) return;
  if (MixinApi.isCommandGiver(container)) {
    (container as Stuff & CommandGiver).popCommandSource(shadow);
  }
  for (const sibling of container.getContents()) {
    if ((sibling as Stuff) === host) continue;
    if (!MixinApi.isCommandGiver(sibling)) continue;
    (sibling as Stuff & CommandGiver).popCommandSource(shadow);
  }
}

/** Path resolver for validator specs. See `CommandApi.resolveValidator`. */
function resolveValidatorSpec(spec: string, fromYaml: string): string {
  if (spec.startsWith('/')) {
    return resolvePath(MUD_ROOT, spec.slice(1) + '.ts');
  }
  if (spec.startsWith('./') || spec.startsWith('../')) {
    if (!isAbsolute(fromYaml)) {
      throw new Error(
        `relative validator spec '${spec}' requires an absolute YAML path (got '${fromYaml}')`
      );
    }
    return resolvePath(dirname(fromYaml), spec + '.ts');
  }
  throw new Error(
    `validator spec '${spec}' must start with '/' (mud-rooted absolute) or './' / '../' (relative to YAML)`
  );
}

function runValidators(
  validators: FieldValidator[] | undefined,
  value: unknown,
  fname: string,
  context: CommandContext
): string | undefined {
  if (!validators) return undefined;
  for (const v of validators) {
    const err = v(value, fname, context);
    if (err) return err;
  }
  return undefined;
}

/**
 * Map a Stuff to the pronoun-memory slot it routes to. Used by the
 * dispatcher's post-resolve update so `look bob` (a he/him NPC)
 * lands `bob` in the `him` slot, not the generic `it`. Stuff
 * without `GenderedMixin` defaults to `it`.
 */
function slotForGenderRouting(stuff: Stuff): GenderedSlot {
  if (!MixinApi.isGendered(stuff)) return 'it';
  switch (stuff.getPronouns()) {
    case Pronouns.He:
      return 'him';
    case Pronouns.She:
      return 'her';
    case Pronouns.They:
      return 'them';
    case Pronouns.It:
      return 'it';
  }
}


/**
 * Drill-additive focus update. Three modes:
 *
 *   - `extend` (default for inspection verbs): append the input
 *     fragment to the current focus with `:` as the separator. When
 *     the resolved (Stuff, via) is "deeper than" the current focus's
 *     resolved (Stuff, via) — same Stuff, current via.detailPath is
 *     a prefix of the new — append only the new via tail to avoid
 *     double-counting (`look bookcase` → `here:bookcase`, then
 *     `look book` → `here:bookcase:book`, not `here:bookcase:bookcase:book`).
 *     When the resolved (Stuff, via) is exactly the current one,
 *     focus is unchanged (re-resolving the same target).
 *
 *   - `replace`: set focus to the post-desugar input fragment
 *     wholesale.
 *
 *   - `none`: caller filters this case out before calling here.
 *
 * Pronoun carve-out: when raw is itself a dynamic pronoun
 * (`it`/`him`/`her`/`them`/`$$`), substitute the stored fragment
 * from pronoun memory so the focus chain tracks the actual referent
 * rather than the unstable pronoun string. Applies to both extend
 * and replace modes.
 */
function updatePlayerFocus(
  giver: Stuff & CommandGiver & Focused,
  raw: string,
  stuff: Stuff,
  via: MqlMatchVia | undefined,
  mode: 'extend' | 'replace'
): void {
  const fragment = resolvePronounFragment(giver, raw) ?? raw;

  if (mode === 'replace') {
    giver.setFocus(fragment);
    return;
  }

  // Extend mode.
  const currentFocus = giver.getFocus();
  const currentMany = MqlApi.resolveMany(currentFocus, {
    commandGiver: giver,
    scope: currentFocus,
  });
  if (currentMany.stuff.length > 1) {
    // Current focus resolves to multiple Stuffs — an ambiguous
    // fragment, often left over from a disambiguation prompt
    // (`look brass` → multi-match → PromptApi.mqlObject pick →
    // focus extended with raw fragment 'brass'). The same-stuff
    // short-circuit below assumes a single-anchor focus the
    // player is drilling into; that premise doesn't hold here,
    // and worse, resolveOne picks the top match nondeterministically
    // relative to the player's intent, so a follow-up `look <X>`
    // where X happens to match the top-scored brass-match would
    // silently no-op. Replace focus to escape the multi-anchor
    // state.
    giver.setFocus(fragment);
    return;
  }
  const currentAnchor = MqlApi.resolveOne(currentFocus, {
    commandGiver: giver,
    scope: currentFocus,
  });
  const sameStuff =
    currentAnchor.stuff && currentAnchor.stuff.stuffId === stuff.stuffId;
  if (sameStuff) {
    const oldPath = currentAnchor.via?.detailPath ?? [];
    const newPath = via?.detailPath ?? [];
    if (ArrayApi.equal(oldPath, newPath)) {
      // Re-resolved the same target — leave focus alone.
      return;
    }
    if (ArrayApi.isPrefix(oldPath, newPath)) {
      // Compaction: same anchor, deeper via — append only the new
      // tail segments. Joining with `:` matches the new chain
      // separator.
      const tail = newPath.slice(oldPath.length).join(':');
      giver.setFocus(currentFocus + ':' + tail);
      return;
    }
  }

  // Target is a different Stuff than the current focus anchor, AND
  // doesn't carry a `via.detailPath` that would compose meaningfully
  // through the chain operator. The MQL chain step `:keyword` only
  // walks into the prior match's keywords + detail tree — it doesn't
  // re-enter the here-neighborhood for adornments / peers / etc. So
  // a fragment like `here:rose` (rose is a peer) or `here:door` (door
  // is an adornment on the location) parses fine but resolves to
  // nothing — the `:rose` step looks for "rose" on the location's
  // own keywords/details, not in the room's contents or fixtures.
  //
  // Replacing focus with the new fragment alone lets the substrate's
  // `$focus` expansion succeed via the reachable scope (which DOES
  // walk peers + here + inventory), so subscriptions like `me.focus`
  // pick up the new target. The prior chain was structurally
  // descriptive but broken-by-construction; replacing is the
  // honest move.
  giver.setFocus(fragment);
}

/**
 * If `raw` is a dynamic pronoun (`it`, `him`, `her`, `them`, `$$`),
 * return the original fragment from pronoun memory — `null`
 * otherwise (or when the slot is empty). Lookups are
 * case-insensitive on the trimmed input.
 */
function resolvePronounFragment(
  focused: Stuff & Focused,
  raw: string
): string | null {
  const s = raw.trim().toLowerCase();
  let slot: 'it' | 'him' | 'her' | 'them' | 'last' | null = null;
  if (s === 'it') slot = 'it';
  else if (s === 'him') slot = 'him';
  else if (s === 'her') slot = 'her';
  else if (s === 'them') slot = 'them';
  else if (s === '$$') slot = 'last';
  if (slot === null) return null;
  return focused.getPronounMemory().readFragment(slot);
}


SecurityApi.decorateApiClass(CommandApi);
