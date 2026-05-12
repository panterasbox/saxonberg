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
import type { Interactive } from '../obj/Interactive';
import type { Sensor } from '../lib/message/Sensor';
import { CommandDefinition } from '../lib/command/CommandDefinition';
import { fileURLToPath, pathToFileURL } from 'url';
import { dirname, isAbsolute, join, resolve as resolvePath } from 'path';
import { readdirSync } from 'fs';
import { nanoid } from 'nanoid';
import Ajv, { type ValidateFunction } from 'ajv';
import type { MessageFrame, Note, Status } from '@saxonberg/types';
import { SecurityApi } from './security';
import { DispatchApi } from './dispatch';
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
   * Accumulate a structured note. Auto-escalates status per
   * {@link DispatchApi.autoEscalation} unless `setStatus` was already
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
 * Construct a fresh `CommandContext` for one dispatch attempt.
 * The dispatcher uses this for each `_executeOne` attempt; only the
 * claiming attempt's context becomes the envelope, contexts from
 * passing attempts are discarded.
 */
export function createCommandContext(args: {
  commandGiver: Stuff & CommandGiver;
  location: Stuff & Container;
  commandText: string;
  executionId: string;
  commandId: string;
  verb: string;
  command: CommandDefinition;
  interactive?: Interactive;
}): CommandContext {
  return new CommandContextImpl(args);
}

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

  private _notes: Note[] = [];
  private _status: Status = 'ok';
  private _statusExplicit = false;

  constructor(args: {
    commandGiver: Stuff & CommandGiver;
    location: Stuff & Container;
    commandText: string;
    executionId: string;
    commandId: string;
    verb: string;
    command: CommandDefinition;
    interactive?: Interactive;
  }) {
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
    const implied = DispatchApi.autoEscalation(n.kind);
    if (
      implied !== undefined &&
      DispatchApi.rank(implied) > DispatchApi.rank(this._status)
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
 *   - `error`   — input couldn't be parsed; the summary surfaces
 *                 to the actor via the standard auto-emit path.
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
 */
export type FieldValidator = (
  value: unknown,
  field: string,
  context: CommandContext
) => string | undefined;

/**
 * Verb-level validator function type.
 *
 * Verb-level validators fire BEFORE field-level validators with
 * `context.commandGiver` populated. They guard command-shape
 * preconditions that don't tie to a specific arg — animacy, mobility,
 * vocal capacity. Returns `undefined` when the precondition holds, or
 * an error message string when it doesn't.
 *
 * Sync by design: the dispatch pipeline can't await mid-binding.
 */
export type CommandValidator = (
  context: CommandContext
) => string | undefined;

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
export interface FieldDefinition {
  /**
   * - `string` / `number` / `boolean` — primitive coerce-on-bind.
   * - `object` — singular MQL field; the dispatcher resolves the
   *   bound text via `MqlApi.resolveOne`, picking the highest-scored
   *   match (or failing the command on no match).
   * - `objects` — plural MQL field; the dispatcher resolves via
   *   `MqlApi.resolveMany`. `multiple: true` is NOT used for MQL
   *   fields — the cardinality is the type.
   * - `struct` — structured-input-only blob (`Record<string, unknown>`).
   *   Cannot be bound from text — `msh` returns a clear error if a
   *   verb's positional or option of this type appears in tokenised
   *   input. Used by widget/editor clients via
   *   `assembleFromStructured`. Validated against the optional
   *   `schema` (JSON Schema) before user-defined validators fire.
   */
  type?: 'string' | 'number' | 'boolean' | 'object' | 'objects' | 'struct';
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
   * order so chain-of-responsibility dispatch tries the newest match
   * first. Multiple matches are NOT deduped — that's the job of the
   * `pass: true` mechanic.
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
    if (command.hasSubcommands() && i < tokens.length && !stopped) {
      const t = tokens[i]!;
      if (t.kind === 'word') {
        const sName = t.value;
        const sDef = command.getSubcommand(sName);
        if (!sDef) {
          const list = command.getSubcommandNames().join(', ');
          return {
            error: 'shape',
            summary: `Unknown subcommand '${sName}'. Available: ${list}`,
          };
        }
        subcommand = sName;
        scope = sName;
        i++;
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
   * Run MQL resolution on `type: object` fields and execute
   * validators. On success the resolved model is returned; on
   * failure the matcher emits a structured note onto the
   * dispatch context (mql-error / validator-failed) and returns
   * `{ result: 'failed' }` so the dispatcher can short-circuit
   * without re-inspecting the context.
   *
   * Reads `command` from `context`; the active subcommand (if any)
   * is read from `model.subcommand`, which the matcher stamped at
   * bind time.
   */
  static resolveAndValidate(
    model: CommandModel,
    context: CommandContext,
    prep: Record<string, string> = {}
  ): { resolved: CommandModel } | { result: 'failed' } {
    const command = context.command;
    const subcommand =
      typeof model[SUBCOMMAND_FIELD] === 'string'
        ? (model[SUBCOMMAND_FIELD] as string)
        : undefined;
    const fieldDefs = collectActiveFieldDefs(subcommand, command);
    const resolved: ModelData = { ...model };

    const giver = context.commandGiver;
    const focused = MixinApi.isFocused(giver) ? giver : null;
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
            r = MqlApi.resolveMany(raw, { commandGiver: giver, scope });
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
        // Empty results are a normal outcome — pass `[]` through
        // on the wrapper and let the controller decide what
        // no-match means in its domain. Don't update scope or
        // pronoun memory on empty (no anchor to anchor on).
        const bound: MqlManyResult = { stuff: r.stuff, raw };
        if (r.via) bound.via = r.via;
        if (r.quantity) bound.quantity = r.quantity;
        if (fieldPrep !== undefined) bound.prep = fieldPrep;
        resolved[fname] = bound;
        if (r.stuff.length > 0 && focused) {
          // Multi-cardinality results don't update player scope (no
          // single anchor to extend or re-anchor from). Pronoun memory
          // only updates for Focused givers — others have no stash.
          focused.getPronounMemory().update(r, raw, slotForGenderRouting);
        }
      } else {
        let r: MqlOne;
        try {
          r = { stuff: null };
          for (const scope of tries) {
            r = MqlApi.resolveOne(raw, { commandGiver: giver, scope });
            if (r.stuff !== null) break;
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
        // `null` (empty) is a normal outcome — pass it through on
        // the wrapper and let the controller decide what no-match
        // means.
        const bound: MqlOneResult = { stuff: r.stuff, raw };
        if (r.via) bound.via = r.via;
        if (r.quantity) bound.quantity = r.quantity;
        if (fieldPrep !== undefined) bound.prep = fieldPrep;
        resolved[fname] = bound;
        if (r.stuff !== null && focused) {
          if (focusMode !== 'none') {
            updatePlayerFocus(focused, raw, r.stuff, r.via, focusMode);
          }
          const asMany: MqlMany = { stuff: [r.stuff] };
          if (r.via) asMany.via = r.via;
          focused.getPronounMemory().update(asMany, raw, slotForGenderRouting);
        }
      }
    }

    // Resolve `type: object` / `type: objects` options.
    //
    // Same shape as the positional loop above: walk the active
    // option set, find string-typed values, run them through MQL
    // with the option's `scope:` (default `['$focus']`). Options
    // never update player focus — that's a positional-side
    // concept (the player drilled INTO the target via that arg);
    // an option saying `--mql foo` is a side-channel reference,
    // not an inspection drill.
    const optionDefs = collectActiveOptionDefs(subcommand, command);
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
            r = MqlApi.resolveMany(raw, { commandGiver: giver, scope });
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
        const bound: MqlManyResult = { stuff: r.stuff, raw };
        if (r.via) bound.via = r.via;
        if (r.quantity) bound.quantity = r.quantity;
        resolved[fname] = bound;
        if (r.stuff.length > 0 && focused) {
          focused.getPronounMemory().update(r, raw, slotForGenderRouting);
        }
      } else {
        let r: MqlOne;
        try {
          r = { stuff: null };
          for (const scope of tries) {
            r = MqlApi.resolveOne(raw, { commandGiver: giver, scope });
            if (r.stuff !== null) break;
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
        const bound: MqlOneResult = { stuff: r.stuff, raw };
        if (r.via) bound.via = r.via;
        if (r.quantity) bound.quantity = r.quantity;
        resolved[fname] = bound;
        if (r.stuff !== null && focused) {
          const asMany: MqlMany = { stuff: [r.stuff] };
          if (r.via) asMany.via = r.via;
          focused.getPronounMemory().update(asMany, raw, slotForGenderRouting);
        }
      }
    }

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

    // Field validators.
    for (const [fname, def] of Object.entries(fieldDefs)) {
      const err = runValidators(def._resolvedValidators, resolved[fname], fname, context);
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

    // Verb-option validators.
    for (const [name, opt] of Object.entries(command.verbOptions)) {
      const fname = opt.field ?? name;
      const err = runValidators(opt._resolvedValidators, resolved[fname], fname, context);
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
    // option-shaped at the matcher level).
    for (const [name, opt] of Object.entries(command.payload)) {
      const fname = opt.field ?? name;
      const err = runValidators(opt._resolvedValidators, resolved[fname], fname, context);
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

    return { resolved };
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
        ? MessageApi.Topics.system.commands.added
        : kind === 'removed'
          ? MessageApi.Topics.system.commands.removed
          : MessageApi.Topics.system.commands.reset;

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
  | { error: 'bind'; summary: string };

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

  // Naive append. The chain accumulates user intent, not actual
  // navigability — the next query's scope try-list with the
  // reachable fallback handles cases where the chain stops resolving.
  giver.setFocus(currentFocus + ':' + fragment);
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
