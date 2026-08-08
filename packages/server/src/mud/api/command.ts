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
import type { CommandGiver } from '../lib/command/CommandGiver';
import type Interactive from '../obj/Interactive';
import { CommandDefinition } from '../lib/command/CommandDefinition';
import { fileURLToPath } from 'url';
import type { Note, Status } from '@saxonberg/types';
import { StuffApi } from './stuff';
import { HotReloadApi } from './hot-reload';
import { ShadowApi } from './shadow';
import type { MqlManyResult, MqlOneResult } from './mql';
import type { ParsedCommand } from './command-line';
import type { Script } from '../lib/script/ast';
import { CommandLogic } from '../obj/api/CommandLogic';
import { SecurityApi } from './security';

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
   * Optional structured body side-channel from the `command` inbound
   * (`{type:'command', payload:{ text, fields? }}`). Overlaid onto the
   * bound model's `payload:`/designated body fields after the string
   * parses, via {@link CommandApi.overlayBodyFields}. The command string
   * is always parsed first; this never bypasses the parse/validate chain.
   */
  bodyFields?: Record<string, unknown>;

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

  /**
   * Which input region (command bar) the command was submitted from.
   * Threaded from the inbound `command` message so the input-mode
   * prepend ({@link CommandApi.applyInputMode}) looks up *that bar's*
   * prefix in `cockpit.inputModes`, and so `ModeController` knows which
   * bar a `mode` verb targets. Defaults to `'main'`; absent for
   * scripts / NPC / forced dispatch (no bar, no prefix applied).
   */
  barId?: string;
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
  location: (Stuff & Container) | null;
  commandText: string;
  executionId: string;
  commandId: string;
  verb: string;
  command: CommandDefinition;
  /**
   * The Stuff that afforded the executing command — the giver itself
   * for an innate (`'self'`) verb, or the granting item/peer otherwise.
   * Populated by the dispatcher from the claiming match's affordance
   * record (resolved `'self'` → giver). Falls back to the giver on the
   * bound / programmatic dispatch paths where no contextual match step
   * runs. Always a concrete Stuff. The source object's type is the
   * discriminator — there is no provisioning-category tag.
   */
  commandSource: Stuff;
  /**
   * Populated by `ShellApi.expandAliases` when the command's verb was
   * resolved through one or more alias hops. Absent when the verb was
   * typed directly. Controllers that branch on alias-vs-direct read
   * this; everyone else ignores it.
   */
  aliasExpansion?: AliasExpansionInfo;

  /**
   * Structured body side-channel carried from `ExecuteCommandOpts`. When
   * present, the dispatcher overlays it onto the bound model's
   * `payload:`/designated body fields (via
   * {@link CommandApi.overlayBodyFields}) before `resolveModel`.
   */
  bodyFields?: Record<string, unknown>;

  /**
   * The input region (command bar) this command was submitted from,
   * carried from {@link ExecuteCommandOpts.barId}. `ModeController`
   * reads it to target the right bar's entry in `cockpit.inputModes`.
   * Defaults to `'main'`.
   */
  barId?: string;

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
  location: (Stuff & Container) | null;
  commandText: string;
  executionId: string;
  commandId: string;
  verb: string;
  command: CommandDefinition;
  /**
   * The Stuff that afforded the command. Optional here: when omitted,
   * the context defaults it to `commandGiver` (the innate/giver case).
   * Production dispatch always supplies it — the claiming match's
   * resolved affordance source, or the giver fallback on the bound /
   * programmatic paths. On the context itself it is always a concrete
   * Stuff (never undefined).
   */
  commandSource?: Stuff;
  interactive?: Interactive;
  /** Structured body side-channel; see {@link CommandContext.bodyFields}. */
  bodyFields?: Record<string, unknown>;
  /** Submitting command bar; see {@link CommandContext.barId}. */
  barId?: string;
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
  location: (Stuff & Container) | null;
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
 *   - `script`  — a parsed multi-statement / block-bearing `Script`
 *                 AST. The dispatcher routes it to `ScriptApi.runAst`,
 *                 which walks it through the interpreter (each command a
 *                 gated bus dispatch). Produced by the `script` parser
 *                 for input msh can't represent (statement separators,
 *                 standalone `{ }` blocks); a bare single command is
 *                 delegated to msh and comes back as `parsed`.
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
  script?: {
    ast: Script;
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
 * **The bucket names WHO RECEIVES, from the declaring object's point of
 * view.** They are directional, and two of them are recursive:
 *
 *   - `self`        — the object itself (e.g. `inventory`, `look`).
 *   - `inventory`   — everything nested **inside** it, at any depth
 *                     (a pack affords `rummage` to what it swallowed).
 *   - `environment` — its container **chain**, outward, at any depth
 *                     (a wand in your hand — or in a case in your pack
 *                     — grants you `zap`).
 *   - `peers`       — its siblings, and one **passable** exit away
 *                     (a conversational NPC grants `tell`; a closed
 *                     door stops it).
 *
 * ⚠ `inventory` and `environment` are recursive *on purpose*. Verb
 * availability used to be direct-containment-scoped while MQL targeting
 * is arbitrarily nested, so a rock inside a bag inside your pack could
 * be NAMED by a command whose verb the rock had never lit up. It worked
 * by accident — the bag was Tangible too and afforded the same verb —
 * and the accident would have stopped covering the moment a verb came
 * from a rarer mixin. Reach now matches what the parser can address.
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
 * Per-instance dynamic command contributions — the runtime sibling of
 * the static `commandContributions`. A Stuff that composes this seam is
 * consulted **by instance** at containment-delta time (in addition to
 * its class/mixin statics) when the `inventory`/`environment`/`peers`
 * slices are pushed onto nearby givers' stacks, so a contribution can
 * depend on per-instance state (a Behaved NPC affords `talk` only when
 * it carries a dialogue tree; a `Tooled` host derives its verb families
 * from its authored `capabilities` via the capability table). Because
 * it rides the ordinary
 * push/pop/reset movement machinery, late-arrival, departure, and
 * mover relocation are all handled with no extra hooks. The hook must
 * be cheap and total (it runs on the containment hot path; a throw is
 * swallowed to an empty contribution).
 *
 * @hook
 */
export interface InstanceContributor {
  getInstanceContributions(): CommandContributions;
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
export type FieldValidator<T = void> = ((
  value: unknown,
  field: string,
  context: CommandContext,
  preloaded: T,
) => string | undefined) & {
  /**
   * Optional async preload. The dispatcher awaits each preload AFTER
   * MQL resolution but BEFORE the sync validator phase runs (see
   * `CommandApi.preloadValidatorDeps`), so the sync body's data is
   * ready before it runs.
   *
   * The preload's resolved value is passed back to the sync body as
   * its fourth argument (`preloaded`). For validators whose preload
   * just warms a singleton cache (the original use-case — e.g., a
   * `requiresAnimateTarget` validator preloading a species clade so
   * the sync `findByTemplatePath` hits warm), return `void` and the
   * sync body ignores the extra arg. For validators whose sync
   * decision is itself async (e.g., the access checks), return the
   * decision directly and the sync body reads it from `preloaded`.
   *
   * Signature mirrors the sync body — `(value, field, context)`.
   * Field validators that want per-bound-target deps inspect the
   * resolved Stuff and preload accordingly. Validators that only need
   * giver-side deps ignore `value` / `field` and read
   * `context.commandGiver`.
   *
   * ```ts
   * // Cache-warming preload (legacy shape — returns void):
   * const v: FieldValidator = (value, field, ctx) => { ... };
   * v.preload = async (value, field, ctx) => {
   *   await StuffApi.singleton(somePathFromTarget(value));
   * };
   *
   * // Decision-returning preload:
   * const v: FieldValidator<boolean> = (_v, _f, _ctx, allowed) =>
   *   allowed ? undefined : 'denied';
   * v.preload = async (_v, _f, ctx) => AccessApi.can(ctx.commandGiver, 'x', null);
   * ```
   *
   * Omit on validators that only check mixin presence or call
   * sync-pure helpers.
   */
  preload?: (
    value: unknown,
    field: string,
    context: CommandContext,
  ) => Promise<T>;
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
 * needs async work declare a `preload` hook; the dispatcher walks
 * all validators-for-this-command between MQL resolution and the
 * sync validator phase, awaits each preload, and passes each
 * resolved value back to the validator's sync body as its second
 * argument (`preloaded`).
 *
 * The `T` type parameter is the preload's return type. For preloads
 * that only warm a singleton cache (the original use-case), use
 * `T = void` and ignore the extra arg. For preloads whose result is
 * the actual decision (e.g., the access checks — `AccessApi.can` is
 * async; the sync body needs the boolean), declare `T = boolean` and
 * read the result from `preloaded`.
 */
export type CommandValidator<T = void> = ((
  context: CommandContext,
  preloaded: T,
) => string | undefined) & {
  preload?: (context: CommandContext) => Promise<T>;
};

/**
 * Resolved preload values keyed by the validator function the
 * dispatcher invoked. Populated by `preloadValidatorDeps`; consumed
 * by `runValidators`. Each entry's value matches the corresponding
 * validator's `T` parameter at runtime; the map's value type is
 * `unknown` because the map is heterogeneous (each validator may
 * declare its own `T`).
 *
 * The map's lifetime is one command — created at preload time,
 * dropped after `runValidators` returns. No cross-command state.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ValidatorPreloads = Map<(...args: any[]) => unknown, unknown>;

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
// eslint-disable-next-line no-restricted-syntax -- test-only export (white-box unit test); production callers stay inside command.ts
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
// eslint-disable-next-line no-restricted-syntax -- test-only export (white-box unit test); production callers stay inside command.ts
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
/**
 * A worked invocation for the help surface. `cmd` is the literal
 * command line a player would type; `note` is a short gloss. Authored
 * under `examples:` on a verb or subcommand; surfaced individually so
 * the help system can search and render each one. Sparing by
 * convention — only where a concrete invocation teaches something the
 * generated usage cannot.
 */
export interface ExampleDefinition {
  cmd: string;
  note?: string;
}

export interface SubcommandDefinition {
  description?: string;
  /** Multi-line authored help prose for this subcommand. */
  help?: string;
  /** Worked invocations specific to this subcommand. */
  examples?: ExampleDefinition[];
  controller?: string;
  args?: PositionalDefinition[];
  options?: Record<string, OptionDefinition>;
  /**
   * Subcommand-level validators (YAML path specs). Fire after the
   * verb-level validators and before field validators, with
   * `context.commandGiver` populated, only when this subcommand is
   * invoked — the subcommand-scoped equivalent of `CommandView.validators`.
   * An authority gate on one subcommand (a founder-only `assign`) that
   * leaves the verb's public subcommands ungated.
   */
  validators?: string[];
  /**
   * Live functions populated by `CommandApi.preloadAll`. Always
   * parallels `validators`. @internal
   */
  _resolvedValidators?: CommandValidator[];
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
  /**
   * Multi-line authored help prose for the verb — rendered below the
   * synthesized syntax block by `CommandDefinition.getHelpText()`.
   */
  help?: string;
  /**
   * **The parser floor.** What to answer when this verb is typed but
   * nothing here affords it — *"there is nothing to drink"* rather than
   * *"unknown command"*.
   *
   * Conferral controls the affordance **list**, never the **parser**
   * (requirements D23). Hiding a verb from a list is helpful; hiding it
   * from the parser teaches players that verbs evaporate, which is worse
   * than never listing them at all. So a verb that exists anywhere in
   * the catalogue always parses, and this field is the reason it gives.
   *
   * Optional — a verb without one gets a generic legible refusal rather
   * than `unknown-verb`. The mechanism is general: authoring this on a
   * capability verb satisfies the requirement for that verb, and every
   * verb benefits from the non-`unknown-verb` floor for free.
  /** Worked invocations shown under an Examples heading. */
  examples?: ExampleDefinition[];
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
  /**
   * Default async-dispatch mode for this verb (default `false`). When
   * `true`, the controller body detaches from the giver's own input
   * chain at accept-time — see {@link AssembleSuccess.reservedAsync} for
   * the per-invocation `--async` / `--sync` override and
   * `command-routing.md` for the detach seam.
   */
  async?: boolean;
}

/**
 * Schema-delivery payload for shell.control. Mirrors
 * the YAML view minus runtime-only bits.
 */
export interface CommandSchemaPayload {
  verbs: string[];
  controller?: string;
  description: string;
  /** Authored help prose (see `CommandView.help`). */
  help?: string;
  /** Worked invocations (see `CommandView.examples`). */
  examples?: ExampleDefinition[];
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

/** `assemble` success arm. `prep` carries any prepositions consumed
 *  per positional field — keyed by field name, lowercased value.
 *  Absent (or empty) when no field declared `prepositions:`. */
export interface AssembleSuccess {
  model: CommandModel;
  prep?: Record<string, string>;
  /**
   * The reserved async-override flag consumed from the token stream, if
   * any: `--async` / `--sync` (last wins). These are framework-reserved
   * flags stripped ahead of per-command option binding, not per-command
   * options — so they work on any verb. `undefined` = no override; the
   * verb's `CommandDefinition.async` spec default applies. Consumed in
   * `CommandGiverMixin._runChain` to compute the effective async mode.
   */
  reservedAsync?: 'async' | 'sync';
}

export type AssembleResult =
  | AssembleSuccess
  | { error: 'shape'; summary: string }
  | { error: 'bind'; summary: string }
  | { error: 'unknown-subcommand'; subcommand: string; available: string[] };

const LOGIC_PATH = '/obj/api/command';
const LOGIC_CLASS_FILE = fileURLToPath(
  new URL('../obj/api/CommandLogic', import.meta.url)
);

/** Resolve the HMR-able CommandLogic singleton (sync). */
function logic(): CommandLogic {
  return StuffApi.singletonSync(
    LOGIC_PATH,
    () =>
      new ((HotReloadApi.getCurrentExport(
        LOGIC_CLASS_FILE,
        'CommandLogic'
      ) as typeof CommandLogic | null) ?? CommandLogic)()
  );
}

/**
 * CommandApi - Static command definition cache
 *
 * Production dispatch never queries the cache directly; it walks each
 * giver's recency stack (`CommandGiverMixin.getAffordances()`) and
 * filters by verb, keeping each match paired with its affording
 * source. The filename-keyed map is just a 'load once, reuse' sharing
 * layer between the recency-push helpers and the YAML preload pass.
 *
 * This Api is a thin, security-gated forwarding shell: the logic lives
 * in the hot-reloadable {@link CommandLogic} singleton at
 * `/obj/api/command`, reached synchronously via
 * `StuffApi.singletonSync`. `dest /obj/api/command` reloads it.
 */
export class CommandApi {
  /**
   * Get a command definition by filename, loading it if not cached.
   * Returns the cached instance on repeat calls so the recency-push
   * pipeline never re-parses the same YAML.
   */
  static getCommand(filename: string): CommandDefinition | null {
    return logic().getCommand(filename);
  }

  /**
   * Clear the filename cache. Used by tests; production should
   * prefer `invalidate(filename)` to drop a single entry when a
   * YAML changes on disk.
   */
  static clearCache(): void {
    logic().clearCache();
  }

  /**
   * Every loaded `CommandDefinition` — the whole filename-keyed cache,
   * not the per-giver affordance set. Populated by `preloadAll` at
   * boot (which runs before `HelpCatalogue` warms), so the help index's
   * commands projector sees the complete verb roster. Returns a snapshot
   * array; ordering follows insertion.
   */
  static allDefinitions(): CommandDefinition[] {
    return logic().allDefinitions();
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
    return logic().invalidate(filename);
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
  static preloadAll(): Promise<{ loaded: number; failed: string[] }> {
    return logic().preloadAll();
  }

  /**
   * Collect the `self`-bucket command contributions from a class
   * chain. The concrete class wins over its mixins; mixins later in
   * the prototype chain (closer to Object) lose to earlier ones.
   * Used at host registration to seed the `'self'` recency entry.
   */
  static collectSelfDefs(ctor: unknown): CommandDefinition[] {
    return logic().collectSelfDefs(ctor);
  }

  /**
   * **What a class actually affords in one bucket**, unioned across its
   * whole mixin chain.
   *
   * The read that matters, and the one to reach for over the raw
   * `commandContributions` static: that static is a *static*, so on a
   * class composing two capability mixins the outermost declaration
   * SHADOWS the inner ones on the class object — while dispatch walks
   * the chain and unions. A scroll composing `Marked` and `Labelled`
   * affords both `read` and `label`; reading the static would see only
   * one of them and be wrong about the other.
   */
  static collectContributions(
    ctor: unknown,
    bucket: 'self' | 'inventory' | 'environment' | 'peers',
  ): CommandDefinition[] {
    return logic().collectContributions(ctor, bucket);
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
    logic().applyContainmentDelta(item, from, to);
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
    logic().applyShadowDelta(host, shadow, op);
  }

  /**
   * Inject the command-recency-stack delta into the shadow subsystem
   * (a boot-lifecycle call from
   * `BootstrapManager.installFrameworkWiring` — never a module-scope
   * side effect). `shadow.ts` doesn't statically import `command`
   * (that edge was a layering inversion that pulled the whole command
   * closure onto the boot path); instead `ShadowApi.attach`/`detach`
   * call the registered hook synchronously. The hook is a LATE-BOUND
   * thunk (property lookup per call), not the static's value, so it
   * always dispatches through the security-wrapped facade. Idempotent.
   * @internal
   */
  static installShadowBridge(): void {
    ShadowApi._registerCommandShadowHook((host, shadow, op) =>
      CommandApi.applyShadowDelta(host, shadow, op)
    );
  }

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
    return logic().createCommandContext(args);
  }

  /**
   * Apply a bar's input-mode prefix to a raw command line — the
   * load-bearing pre-tokenize step on the command-entry hot path
   * (server-authoritative input mode, per-bar).
   *
   * Pure and total: given the raw text and the resolved prefix for the
   * submitting bar, return the text the interpreter should actually
   * dispatch. Three rules, in order:
   *
   *   1. **No prefix** (the bar is unset) → verbatim no-op.
   *   2. **`/`-escape** → strip the leading slash and run the rest raw
   *      (a one-off un-moded command; `/look` lexes as `look`).
   *   3. **`mode`-management** → the `mode` verb itself is exempt, so
   *      `mode off` / `mode chat x` always reach the interpreter
   *      un-prefixed regardless of the active mode.
   *
   * Otherwise the prefix is prepended: `chat`-mode + `hello` →
   * `chat hello`. Kept here (not in `msh`) so the tokenizer stays
   * Stuff-unaware; the per-bar lookup happens at the call site.
   */
  static applyInputMode(rawText: string, modePrefix: string): string {
    if (!modePrefix) return rawText; // (1) unset bar — verbatim no-op
    const t = rawText.trimStart();
    if (t.startsWith('/')) return t.slice(1); // (2) escape → run raw
    if (t.split(/\s+/)[0]?.toLowerCase() === 'mode') return rawText; // (3) exempt
    return `${modePrefix} ${rawText}`;
  }

  /**
   * Recency-stack delta for a hosted-update host/unhost (the aether
   * hosting relation). A hosted update contributes its
   * `self`-bucket command definitions to its host's stack with the
   * update Stuff as the recency source, so `getAffordances()` resolves
   * `commandSource` to the update (the "verb dispatch routes through
   * the augment/update" pattern). Hosting surfaces the verbs;
   * unhosting retires them — gain/lose-post-spawn live.
   *
   * Called by `AetherMixin.hostUpdate` / `unhostUpdate`.
   */
  static applyHostedUpdateDelta(
    host: Stuff,
    update: Stuff,
    op: 'host' | 'unhost'
  ): void {
    logic().applyHostedUpdateDelta(host, update, op);
  }

  /**
   * Collect each hosted update's `self`-bucket command definitions for
   * a host, paired with the update as the affording source. Used by
   * `CommandGiverMixin`'s self-seeding (both `postRegister` and the
   * lazy `_ensureSelfEntry` safety net) so a host that gained updates
   * outside a delta (e.g. a test that hosts then reads affordances)
   * still surfaces their verbs. Returns `[]` for a non-host.
   */
  static collectHostedUpdateDefs(
    host: Stuff
  ): Array<{ source: Stuff; defs: CommandDefinition[] }> {
    return logic().collectHostedUpdateDefs(host);
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
  static resolveParser(spec: string): Promise<Parser> {
    return logic().resolveParser(spec);
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
  static resolveValidator(
    spec: string,
    fromYaml: string
  ): Promise<FieldValidator> {
    return logic().resolveValidator(spec, fromYaml);
  }

  /**
   * Resolve a verb-level validator spec to a live `CommandValidator`.
   * Same path-resolution as `resolveValidator`, but the runtime
   * signature is `(context) => string | undefined` rather than the
   * field-level `(value, field, context) => …`.
   */
  static resolveCommandValidator(
    spec: string,
    fromYaml: string
  ): Promise<CommandValidator> {
    return logic().resolveCommandValidator(spec, fromYaml);
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
    ctx: { commandGiver: Stuff & CommandGiver; location: (Stuff & Container) | null }
  ): AssembleResult {
    return logic().assemble(parsed, command, ctx);
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
    ctx: { commandGiver: Stuff & CommandGiver; location: (Stuff & Container) | null }
  ): { model: CommandModel } | { error: string } {
    return logic().assembleFromStructured(payload, command, ctx);
  }

  /**
   * Overlay a structured body side-channel (`fields`) onto an
   * already-bound model, **restricted to the command's `payload:`-block
   * fields + the designated body field** (a greedy `string` positional
   * arg). Options/flags and object/MQL selectors are unreachable — the
   * structural narrowness that keeps `fields` from filling a selector.
   *
   * Called by `CommandGiver.executeCommand` after the model is bound from
   * the parsed string and BEFORE `resolveModel`, so the same resolve →
   * validate → controller → envelope chain runs. The command string is
   * always parsed first; this is purely additive, never a string-less
   * dispatch path. Tiebreak: `fields` wins when both inline-greedy and
   * the side-channel supply the body.
   */
  static overlayBodyFields(
    model: CommandModel,
    fields: Record<string, unknown>,
    command: CommandDefinition,
  ): void {
    return logic().overlayBodyFields(model, fields, command);
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
   * MQL path-literal preloading (e.g. ensuring `/obj/species/...`
   * referenced in a `:race(...)` filter is live) is NOT covered
   * here; it lands when a verb actually needs it. Today the only
   * preload consumer is `requiresAnimate`.
   */
  static preloadValidatorDeps(
    command: CommandDefinition,
    context: CommandContext,
    resolved: CommandModel,
    subcommand?: string
  ): Promise<ValidatorPreloads> {
    return logic().preloadValidatorDeps(command, context, resolved, subcommand);
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
  static applyCardinalityPolicy(
    spec: { type?: string; cardinality?: CardinalitySpec; onExcess?: OnExcessPolicy; onShortage?: OnShortagePolicy },
    stuff: Stuff[],
    fname: string,
    context: CommandContext,
  ): Promise<Stuff[] | null> {
    return logic().applyCardinalityPolicy(spec, stuff, fname, context);
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
  static resolveModel(
    model: CommandModel,
    context: CommandContext,
    prep: Record<string, string> = {}
  ): Promise<{ resolved: CommandModel } | { result: 'failed' }> {
    return logic().resolveModel(model, context, prep);
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
    context: CommandContext,
    preloads?: ValidatorPreloads,
  ): { ok: true } | { result: 'failed' } {
    return logic().runValidators(resolved, context, preloads);
  }

  /**
   * Back-compat wrapper: resolve MQL then run validators in a single
   * sync call. NOT used by the dispatcher (which interleaves an
   * async validator-preload phase between MQL resolve and the sync
   * validator phase via `preloadValidatorDeps`). Kept for tests and
   * one-off callers that want the combined sync surface.
   */
  static resolveAndValidate(
    model: CommandModel,
    context: CommandContext,
    prep: Record<string, string> = {}
  ): Promise<{ resolved: CommandModel } | { result: 'failed' }> {
    return logic().resolveAndValidate(model, context, prep);
  }

  /**
   * Emit a `shell.control` frame to a
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
    logic().emitSchemaDelta(recipient, kind, payload);
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
    return logic().forceCommand(giver, text, opts);
  }

  /**
   * Project a `CommandDefinition` to a wire-safe schema payload for
   * client-side widget rendering. Used by `shell.control ({added,
   * reset}`.
   */
  static getCommandSchemaPayload(cmd: CommandDefinition): CommandSchemaPayload {
    return logic().getCommandSchemaPayload(cmd);
  }

  /**
   * Validate a parsed command **spec** (the YAML view) against
   * `cmd/command.schema.json`. Returns `null` when it conforms, or the
   * full Ajv error trail — every complaint at once, because the audience
   * is an author who just mistyped a spec.
   *
   * Distinct from {@link CommandApi.validateAgainstJsonSchema}, which
   * checks a runtime *field value* against an inline schema authored on a
   * `type: struct` field and reports only the first error.
   *
   * Called by `CommandDefinition.fromYaml`: `ajv` lives outside
   * `src/mud/`, so the mudlib value object asks for the verdict rather
   * than compiling the schema itself (docs/architecture.md § The import
   * boundary).
   */
  static validateCommandView(view: unknown): string | null {
    return logic().validateCommandView(view);
  }

  /**
   * Validate `value` against a JSON Schema fragment. Returns a
   * friendly error string on failure, `null` on success. Compiled
   * validators are cached by JSON-stringified schema so repeated
   * calls against the same fragment skip recompilation.
   *
   * Used by the matcher's struct path and by `WriteController`, which
   * reads a class's static `dataSchema` after the (async) class load
   * and validates with the same machinery.
   */
  static validateAgainstJsonSchema(
    schema: Record<string, unknown>,
    value: unknown,
  ): string | null {
    return logic().validateAgainstJsonSchema(schema, value);
  }
}

SecurityApi.decorateApiClass(CommandApi);
