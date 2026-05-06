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
 * depend on this file to get `CommandContext`, `CommandResult`, etc., and
 * the view/model/field shapes that describe YAML-declared commands.
 */

import type { Stuff } from '../lib/stuff/Stuff';
import type { Location } from '../lib/stuff/Location';
import type { CommandGiver } from '../lib/command/CommandGiver';
import type { Interactive } from '../obj/Interactive';
import type { Sensor } from '../lib/message/Sensor';
import { CommandDefinition } from '../lib/command/CommandDefinition';
import { fileURLToPath, pathToFileURL } from 'url';
import { dirname, isAbsolute, join, resolve as resolvePath } from 'path';
import { readdirSync } from 'fs';
import { nanoid } from 'nanoid';
import type { MessageFrame } from '@saxonberg/types';
import { SecurityApi } from './security';
import { MqlApi } from './mql';
import { MixinApi } from './mixin';
import { MessageApi } from './message';
import { ExecutionContextApi } from './execution-context';
import { CommandLineApi, type ParsedCommand, type RawToken } from './command-line';
import type { Parser } from './parser';
import type { Mml } from './mml';

/**
 * Caller-supplied input to `CommandGiverMixin.executeCommand`. The
 * dispatcher reads these fields from the caller and fills in the
 * remaining `CommandContext` slots (`commandId`, `verb`, `command`)
 * before any controller sees the context.
 */
export interface CommandContextInput {
  commandGiver: Stuff & CommandGiver;
  interactive: Interactive;
  location: Location;
  /** Original raw input text (pre-parse). */
  commandText: string;
  /** Per-execution security id (call-stack tracking). */
  executionId: string;
}

/**
 * Command execution context - read-only reference holder.
 *
 * `commandGiver` is the thing executing the command, typed as the general
 * `Stuff & CommandGiver` rather than any specific subclass (e.g. Avatar).
 * Controllers narrow with `MixinApi.isX()` predicates or cast to a known
 * concrete type (Character, Avatar) when they need class-specific surface.
 *
 * `interactive` carries the connection/session that originated the command.
 * Cascaded / indirect commands may null this out in the future; today every
 * path sets it.
 *
 * `verb` and `command` carry the dispatch identity — they're stamped by
 * `CommandGiverMixin` after the matcher binds. The active subcommand (if
 * any) lands as `model.subcommand` on the bound model — controllers
 * branch on it with the same `model.X` shape they use for every other
 * field (see `PlayerController`'s name/pronouns/show switch).
 */
export interface CommandContext extends CommandContextInput {
  /**
   * Command-attribution id stamped onto every frame composed during
   * the synchronous span of `executeCommand`. Set by `CommandGiverMixin`
   * before invoking the controller; carried through ExecutionContext.
   */
  commandId: string;
  /** The verb the matcher dispatched on (case-preserved from input). */
  verb: string;
  /** The matched YAML view — useful for help/usage rendering and
   * controllers that introspect their own schema. */
  command: CommandDefinition;
}

/**
 * Reserved field name used by the matcher to surface which subcommand
 * fired. YAMLs that declare subcommands cannot also declare a
 * positional field or option named `subcommand` — the load-time
 * invariant in `CommandDefinition.validate` enforces this.
 */
export const SUBCOMMAND_FIELD = 'subcommand';

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
 * Command execution result.
 *
 * Purely semantic — `success` answers "did the command achieve its
 * goal?" without coupling to messaging. All prose is fired via Scene
 * inside the controller body. `summary`, when present, decorates the
 * auto-emitted MudlogApi command-outcome entry — the default tail is
 * `'ok'` (success) or `'failed'` (failure).
 *
 * `pass: true` opts the controller out of the dispatch — the chain
 * tries the next match. A passing controller MUST NOT have observable
 * side effects (no Scene firing, no world-state mutation).
 */
export interface CommandResult {
  success: boolean;
  pass?: boolean;
  summary?: Mml | string;
}

/**
 * Field value union — what `model.fields[name]` can hold after the
 * matcher's resolve/validate stage. The `Stuff` arm covers
 * `type: object` fields after MQL resolves them; `FieldValue[]` covers
 * `multiple: true` accumulation. Arrays of arrays are not produced
 * (the matcher flattens), but the type is recursive to keep callers
 * from having to disambiguate.
 */
export type FieldValue = boolean | string | number | Stuff | FieldValue[];

/**
 * Resolved field values keyed by field name. Positional-field values
 * and option values share the same flat map per §3.3 of the
 * requirements doc.
 *
 * This IS the controller's input model — `CommandController.execute`
 * takes `(model: CommandModel, context: CommandContext)` where
 * `CommandModel === ModelData`. Verb / subcommand / raw / command-spec
 * live on `CommandContext`; the model carries field data only.
 */
export type ModelData = Record<string, FieldValue>;

/** Alias for `ModelData` — the controller's view of the bound input. */
export type CommandModel = ModelData;

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
  type?: 'string' | 'number' | 'boolean' | 'object';
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
  default?: unknown;
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
  type: 'boolean' | 'string' | 'number' | 'object';
  /** Field name to land on; defaults to the option's own name. */
  field?: string;
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
 */
export interface SubcommandDefinition {
  description?: string;
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
 */
export interface CommandView {
  verbs: string[];
  controller: string;
  description: string;
  args?: PositionalDefinition[];
  subcommands?: Record<string, SubcommandDefinition>;
  options?: Record<string, OptionDefinition>;
}

/**
 * Schema-delivery payload for system.commands.{added,reset}. Mirrors
 * the YAML view minus runtime-only bits.
 */
export interface CommandSchemaPayload {
  verbs: string[];
  controller: string;
  description: string;
  args?: PositionalDefinition[];
  subcommands?: Record<string, SubcommandDefinition>;
  options?: Record<string, OptionDefinition>;
}

// Get path to command YAML directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const CMD_DIR = join(__dirname, '../cmd');
/** Project's `src/mud/` — root for absolute (`/X`) validator specs. */
const MUD_ROOT = resolvePath(__dirname, '..');

/**
 * CommandApi - Static command definition cache
 */
export class CommandApi {
  /** Cached command definitions by filename (performance) */
  static #commands: Map<string, CommandDefinition> = new Map();

  /** Verb → CommandDefinition lookup map (performance) */
  static #verbMap: Map<string, CommandDefinition> = new Map();

  /**
   * Get a command definition by filename, loading it if not cached.
   */
  static getCommand(filename: string): CommandDefinition | null {
    if (this.#commands.has(filename)) {
      return this.#commands.get(filename)!;
    }

    try {
      const filePath = join(CMD_DIR, filename);
      const command = CommandDefinition.fromFile(filePath);

      this.#commands.set(filename, command);

      for (const verb of command.verbs) {
        if (typeof verb !== 'string') {
          console.error(
            `CommandApi: Invalid verb in ${filename}: expected string, got ${typeof verb}. ` +
              `Verb value: ${JSON.stringify(verb)}`
          );
          continue;
        }

        const lowerVerb = verb.toLowerCase();
        if (this.#verbMap.has(lowerVerb)) {
          console.warn(`CommandApi: Verb '${verb}' from ${filename} is already registered`);
        }
        this.#verbMap.set(lowerVerb, command);
      }

      return command;
    } catch (error) {
      console.error(`CommandApi: Failed to load command ${filename}:`, error);
      return null;
    }
  }

  /**
   * Match verb to cached CommandDefinition.
   *
   * @deprecated for production dispatch — use the per-giver recency
   * stack via `CommandGiverMixin.getAvailableCommands()` and
   * `matchVerbContextual` (lands in step 3). Still used by command
   * tests for cache introspection.
   */
  static matchVerb(verb: string): CommandDefinition | null {
    return this.#verbMap.get(verb.toLowerCase()) || null;
  }

  /**
   * Get all cached commands.
   */
  static getAllCommands(): CommandDefinition[] {
    return Array.from(this.#commands.values());
  }

  /**
   * Clear cache (useful for testing/reloading).
   */
  static clearCache(): void {
    this.#commands.clear();
    this.#verbMap.clear();
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
   * Resolve a parser spec to a `Parser` instance.
   *
   * Spec conventions:
   *   - Bare name (no `/`) → `<src>/mud/lib/parsers/<name>.ts`.
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
   * Synchronous boot-time sweep — kept for tests / paths that don't
   * need validator resolution. Production servers should call
   * `preloadAll()` instead.
   */
  static sweepYamls(): { loaded: number; failed: string[] } {
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
      if (cmd) loaded += 1;
      else failed.push(file);
    }
    return { loaded, failed };
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
    _ctx: { commandGiver: Stuff & CommandGiver; location: Location }
  ): AssembleResult {
    const tokens = parsed.rawTokens;
    if (tokens.length === 0 || tokens[0]?.kind !== 'word') {
      return { error: 'shape', summary: 'No verb' };
    }

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
    if (subcommand) {
      const sub = command.getSubcommand(subcommand)!;
      const r = bindPositionals(positionals, sub.args ?? [], parsed);
      if ('error' in r) return r;
      Object.assign(fields, r.bound);
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
      const r = bindPositionals(positionals, command.args, parsed);
      if ('error' in r) return r;
      Object.assign(fields, r.bound);
    }

    // Apply option defaults that didn't fire.
    applyOptionDefaults(command.verbOptions, fields);
    if (subcommand) {
      const subDef = command.getSubcommand(subcommand);
      applyOptionDefaults(subDef?.options ?? {}, fields);
      fields[SUBCOMMAND_FIELD] = subcommand;
    }

    return { model: fields };
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
    _ctx: { commandGiver: Stuff & CommandGiver; location: Location }
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
      const coerceResult = coerceStructuredValue(type, v);
      if (!coerceResult.ok) {
        return { error: `field ${k}: ${coerceResult.error}` };
      }
      fields[k] = coerceResult.value;
    }

    applyOptionDefaults(command.verbOptions, fields);
    if (payload.subcommand) {
      const subDef = command.getSubcommand(payload.subcommand);
      if (!subDef) {
        return { error: `unknown subcommand: ${payload.subcommand}` };
      }
      applyOptionDefaults(subDef.options ?? {}, fields);
      fields[SUBCOMMAND_FIELD] = payload.subcommand;
    }

    return { model: fields };
  }

  /**
   * Run MQL resolution on `type: object` fields and execute
   * validators. On success the resolved model is returned; on
   * failure the matcher emits a `CommandResult` with the failure
   * summary and the chain treats it as a stop (this stage NEVER
   * yields `pass: true` — only `controller.execute` does).
   *
   * Reads `command` from `context`; the active subcommand (if any)
   * is read from `model.subcommand`, which the matcher stamped at
   * bind time.
   */
  static resolveAndValidate(
    model: CommandModel,
    context: CommandContext
  ): { resolved: CommandModel } | { result: CommandResult } {
    const command = context.command;
    const subcommand =
      typeof model[SUBCOMMAND_FIELD] === 'string'
        ? (model[SUBCOMMAND_FIELD] as string)
        : undefined;
    const fieldDefs = collectActiveFieldDefs(subcommand, command);
    const resolved: ModelData = { ...model };

    for (const [fname, def] of Object.entries(fieldDefs)) {
      const raw = resolved[fname];
      if (def.type !== 'object') continue;
      if (typeof raw !== 'string' || raw.length === 0) continue;
      if (def.multiple) {
        const objects = MqlApi.resolveMany(raw, {
          commandGiver: context.commandGiver,
          location: context.location,
        });
        if (objects.length === 0) {
          return {
            result: { success: false, summary: `You don't see any '${raw}' here` },
          };
        }
        resolved[fname] = objects as unknown as FieldValue;
      } else {
        const obj = MqlApi.resolve(raw, {
          commandGiver: context.commandGiver,
          location: context.location,
        });
        if (!obj) {
          return {
            result: { success: false, summary: `You don't see any '${raw}' here` },
          };
        }
        resolved[fname] = obj as unknown as FieldValue;
      }
    }

    // Field validators.
    for (const [fname, def] of Object.entries(fieldDefs)) {
      const err = runValidators(def._resolvedValidators, resolved[fname], fname, context);
      if (err) return { result: { success: false, summary: err } };
    }

    // Verb-option validators.
    for (const [name, opt] of Object.entries(command.verbOptions)) {
      const fname = opt.field ?? name;
      const err = runValidators(opt._resolvedValidators, resolved[fname], fname, context);
      if (err) return { result: { success: false, summary: err } };
    }
    if (subcommand) {
      const subOpts = command.getSubcommand(subcommand)?.options ?? {};
      for (const [name, opt] of Object.entries(subOpts)) {
        const fname = opt.field ?? name;
        const err = runValidators(opt._resolvedValidators, resolved[fname], fname, context);
        if (err) return { result: { success: false, summary: err } };
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
    return out;
  }
}

/* ─────────────────── Matcher helpers ─────────────────── */

export type AssembleResult =
  | { model: CommandModel }
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
  }
}

function coerceStructuredValue(
  type: FieldDefinition['type'] | OptionDefinition['type'] | undefined,
  raw: unknown
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
  // type: 'object' — accept strings (MQL string) or pre-resolved
  // values (Stuff/array). The structured path can carry pre-resolved
  // objects for forms.
  return { ok: true, value: raw as FieldValue };
}

type WordToken = Extract<RawToken, { kind: 'word' }>;

function bindPositionals(
  positionals: WordToken[],
  args: PositionalDefinition[],
  parsed: ParsedCommand
):
  | { bound: ModelData }
  | { error: 'shape'; summary: string } {
  const bound: ModelData = {};
  let pi = 0;

  for (let ai = 0; ai < args.length; ai++) {
    const def = args[ai]!;
    const name = def.name;

    if (def.greedy) {
      if (pi >= positionals.length) {
        if (def.required !== false) {
          return {
            error: 'shape',
            summary: `missing required arg: ${name}`,
          };
        }
        if (def.default !== undefined) {
          bound[name] = def.default as FieldValue;
        }
        // Greedy must be last per the load-time invariant; we
        // don't loop further.
        return { bound };
      }
      const first = positionals[pi]!;
      const startInSource = first.pos - parsed.start;
      const slice = parsed.source.substring(startInSource);
      bound[name] = CommandLineApi.processOutsideEscapes(slice);
      // All remaining positionals are absorbed by greedy.
      return { bound };
    }

    if (def.required) {
      if (pi >= positionals.length) {
        return {
          error: 'shape',
          summary: `missing required arg: ${name}`,
        };
      }
      bound[name] = positionals[pi]!.value;
      pi++;
      continue;
    }

    // Optional positional.
    if (pi < positionals.length) {
      bound[name] = positionals[pi]!.value;
      pi++;
    } else if (def.default !== undefined) {
      bound[name] = def.default as FieldValue;
    }
  }

  if (pi < positionals.length) {
    // Leftover positionals — this verb's grammar didn't fit, let
    // the chain try another match.
    return { error: 'shape', summary: 'too many arguments' };
  }

  return { bound };
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
  return resolvePath(MUD_ROOT, 'lib/parsers', spec + '.ts');
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

SecurityApi.decorateApiClass(CommandApi);
