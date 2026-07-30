// CommandLogic — the hot-reloadable logic singleton behind CommandApi.
// (Doc comment lives on the class declaration below so @internal lands
// on the reflection TypeDoc emits, not on the module.)

import { ApiLogic } from '../../lib/stuff/ApiLogic';
import { CallSecurity, Unshadowable } from '../../lib/security/decorators';
import { SecurityPolicies } from '../../lib/security/SecurityPolicies';
import type { Stuff } from '../../lib/stuff/Stuff';
import type { Container } from '../../lib/spatial/Container';
import type { Containable } from '../../lib/spatial/Containable';
import type { CommandGiver } from '../../lib/command/CommandGiver';
import type { Focused } from '../../lib/command/Focused';
import { ArrayApi } from '../../api/array';
import { ShellApi } from '../../api/shell';
import { PromptApi } from '../../api/prompt';
import type Interactive from '../Interactive';
import type { Sensor } from '../../lib/message/Sensor';
import { CommandDefinition } from '../../lib/command/CommandDefinition';
import { fileURLToPath, pathToFileURL } from 'url';
import {
  dirname,
  isAbsolute,
  join,
  resolve as resolvePath,
  sep,
} from 'path';
import { readdirSync } from 'fs';
import { SecurityApi } from '../../api/security';
import Ajv, { type ValidateFunction } from 'ajv';
import type { MessageFrame, Note, Status } from '@saxonberg/types';
import {
  MqlApi,
  type MqlMany,
  type MqlManyResult,
  type MqlMatchVia,
  type MqlOneResult,
  type MqlOne,
} from '../../api/mql';
import { MixinApi } from '../../api/mixin';
import { MessageApi } from '../../api/message';
import { AccessApi } from '../../api/access';
import { GroupApi } from '../../api/group';
import { ExecutionContextApi } from '../../api/execution-context';
import {
  CommandLineApi,
  type ParsedCommand,
  type RawToken,
} from '../../api/command-line';
import type { GenderedSlot } from '../../api/mql';
import { Pronouns } from '@saxonberg/types';
import {
  CommandApi,
  collectPhaseEffects,
  validatePhaseEffect,
  SUBCOMMAND_FIELD,
  HOOKABLE_PHASES,
  IMPLEMENTED_REPLACE_HANDLERS,
  type ExecuteCommandOpts,
  type CommandContext,
  type CreateCommandContextArgs,
  type AliasExpansionInfo,
  type Parser,
  type CommandContributions,
  type InstanceContributor,
  type FieldValue,
  type ModelData,
  type CommandModel,
  type FieldValidator,
  type CommandValidator,
  type ValidatorPreloads,
  type CardinalitySpec,
  type OnExcessPolicy,
  type OnShortagePolicy,
  type CommandPhase,
  type PhaseEffect,
  type FieldDefinition,
  type PositionalDefinition,
  type OptionDefinition,
  type CommandSchemaPayload,
  type AssembleSuccess,
  type AssembleResult,
} from '../../api/command';

const CommandApiCallers = SecurityPolicies.AnyOf(
  SecurityPolicies.FromModule('/api/command#CommandApi'),
  SecurityPolicies.SelfOnly
);

/**
 * Cached command definitions by filename (load-once sharing). Module-
 * level so it survives `dest`/recreate of the singleton — the cache is
 * conceptually process-wide, keyed off the on-disk YAML.
 */
const commands: Map<string, CommandDefinition> = new Map();

// Get path to command YAML directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// The logic singleton lives one directory deeper than the face
// (`obj/api/` vs `api/`); the cmd dir is `mud/cmd`, the mud root is
// `mud/`, so the relative offsets are one extra `..` from here.
/**
 * Project's `src/mud/` — root for absolute (`/X`) validator specs AND
 * for `domain/`-prefixed content-local command bundles (a locality's
 * bespoke verb specs living with its content under
 * `domain/<sphere>/<locality>/commands/`).
 */
const MUD_ROOT = resolvePath(__dirname, '../..');
/** The global engine command tree — `mud/cmd`. */
const CMD_DIR = join(MUD_ROOT, 'cmd');
/** The content tree — `mud/domain` — scanned for `commands/` bundles. */
const DOMAIN_DIR = join(MUD_ROOT, 'domain');

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
  public location: (Stuff & Container) | null;
  public commandText: string;
  public executionId: string;
  public commandId: string;
  public verb: string;
  public command: CommandDefinition;
  public commandSource: Stuff;
  public interactive?: Interactive;
  public aliasExpansion?: AliasExpansionInfo;
  public bodyFields?: Record<string, unknown>;
  public barId?: string;
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
    // Default unattributed construction to the giver — the innate case.
    // Production dispatch always passes commandSource explicitly.
    this.commandSource = args.commandSource ?? args.commandGiver;
    if (args.interactive !== undefined) this.interactive = args.interactive;
    if (args.bodyFields !== undefined) this.bodyFields = args.bodyFields;
    if (args.barId !== undefined) this.barId = args.barId;
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
 * CommandLogic — the hot-reloadable logic singleton behind
 * {@link CommandApi}.
 *
 * Owns the command-pipeline orchestration: the filename-keyed
 * `CommandDefinition` cache, the YAML preload pass, the matcher
 * (`assemble` / `assembleFromStructured`), MQL resolution + validator
 * machinery, the recency-stack deltas, and schema-delta emission.
 * Lives at `/obj/api/command` (a stateless `Stuff` singleton, no
 * backing `Template`); `CommandApi`'s public statics forward here via
 * `StuffApi.singletonSync`. `dest /obj/api/command` reloads it.
 *
 * Gating (the guts-variant recipe): every public method carries
 * `AnyOf(FromModule('/api/command#CommandApi'), SelfOnly)`.
 * `FromModule` admits the Api facade forwarders; `SelfOnly` admits the
 * intra-singleton `this.x()` self-calls (e.g. `resolveModel` →
 * `this.applyCardinalityPolicy`, `resolveAndValidate` →
 * `this.resolveModel`). Module-private free functions that route back
 * through the face (`CommandApi.getCommand` / `resolveValidator` /
 * `validateAgainstJsonSchema` in the recency + coercion helpers) are
 * re-admitted by `FromModule` — the call frame is the face forwarder.
 * Shared stateless helpers stay module-private free functions —
 * off-class, ungated, un-callable from outside.
 *
 * The `FromModule`/`SelfOnly` gate is applied **per public method**,
 * not at the class level: a class-level default would also cover the
 * inherited `Stuff`/`Idea` framework methods the framework itself
 * invokes (e.g. during `register`), whose caller is `StuffApi`, and
 * they'd be denied. (Mirrors `ContainmentLogic` / `LocomotionLogic`.)
 *
 * @internal
 */
@Unshadowable
export class CommandLogic extends ApiLogic {
  /** See {@link CommandApi.getCommand}. */
  @CallSecurity(CommandApiCallers)
  public getCommand(filename: string): CommandDefinition | null {
    if (commands.has(filename)) {
      return commands.get(filename)!;
    }

    try {
      // A `domain/`-prefixed key is a content-local command bundle and
      // resolves against the MUD root; everything else is an engine verb
      // under `cmd/`. The key == the `commandContributions` string == the
      // cache key, so this mapping is the single source of resolution.
      const filePath = filename.startsWith('domain/')
        ? join(MUD_ROOT, filename)
        : join(CMD_DIR, filename);
      const command = CommandDefinition.fromFile(filePath);
      commands.set(filename, command);
      return command;
    } catch (error) {
      console.error(`CommandApi: Failed to load command ${filename}:`, error);
      return null;
    }
  }

  /** See {@link CommandApi.clearCache}. */
  @CallSecurity(CommandApiCallers)
  public clearCache(): void {
    commands.clear();
  }

  /** See {@link CommandApi.allDefinitions}. */
  @CallSecurity(CommandApiCallers)
  public allDefinitions(): CommandDefinition[] {
    return [...commands.values()];
  }

  /** See {@link CommandApi.invalidate}. */
  @CallSecurity(CommandApiCallers)
  public invalidate(filename: string): boolean {
    return commands.delete(filename);
  }

  /** See {@link CommandApi.preloadAll}. */
  @CallSecurity(CommandApiCallers)
  public async preloadAll(): Promise<{ loaded: number; failed: string[] }> {
    let entries: string[];
    try {
      // Recursive walk so verbs can be grouped into subdirs
      // (e.g. `cmd/charactergen/enroll.yaml`). Relative paths come
      // back subdir-qualified; `getCommand` resolves them via `join`,
      // and the same qualified string is the cache key + the value
      // `commandContributions` reference.
      entries = readdirSync(CMD_DIR, { recursive: true }) as string[];
    } catch (err) {
      console.error(`CommandApi: cannot read cmd dir at ${CMD_DIR}:`, err);
      return { loaded: 0, failed: [] };
    }
    const yamls = entries
      // Normalize to forward slashes so cache keys match the
      // subdir-qualified references authored in YAML / contributions.
      .map((f) => f.split(sep).join('/'))
      .filter((f) => f.endsWith('.yaml'));

    // Content-local command bundles: a locality's bespoke verbs live with
    // its content under `domain/<sphere>/<locality>/cmd/`. Scan the content
    // tree for any `cmd/` bundle and key each `domain/`-prefixed so
    // `getCommand` resolves it against the MUD root. Guarded in its own
    // try/catch — a repo without a `domain/` dir must not crash.
    try {
      const domainEntries = readdirSync(DOMAIN_DIR, {
        recursive: true,
      }) as string[];
      for (const f of domainEntries) {
        const norm = f.split(sep).join('/');
        if (!norm.endsWith('.yaml')) continue;
        if (!norm.split('/').includes('cmd')) continue;
        yamls.push('domain/' + norm);
      }
    } catch (err) {
      // No content tree (or unreadable) — nothing content-local to load.
    }

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

  /** See {@link CommandApi.collectSelfDefs}. */
  @CallSecurity(CommandApiCallers)
  public collectSelfDefs(ctor: unknown): CommandDefinition[] {
    return collectBucketDefs(ctor, 'self');
  }

  /** See {@link CommandApi.applyContainmentDelta}. */
  @CallSecurity(CommandApiCallers)
  public applyContainmentDelta(
    item: Stuff,
    from: (Stuff & Container) | null,
    to: (Stuff & Container) | null
  ): void {
    applyContainmentDeltaImpl(item, from, to);
  }

  /** See {@link CommandApi.applyShadowDelta}. */
  @CallSecurity(CommandApiCallers)
  public applyShadowDelta(
    host: Stuff,
    shadow: Stuff,
    op: 'attach' | 'detach'
  ): void {
    applyShadowDeltaImpl(host, shadow, op);
  }

  /** See {@link CommandApi.applyHostedUpdateDelta}. */
  @CallSecurity(CommandApiCallers)
  public applyHostedUpdateDelta(
    host: Stuff,
    update: Stuff,
    op: 'host' | 'unhost'
  ): void {
    applyHostedUpdateDeltaImpl(host, update, op);
  }

  /** See {@link CommandApi.collectHostedUpdateDefs}. */
  @CallSecurity(CommandApiCallers)
  public collectHostedUpdateDefs(
    host: Stuff
  ): Array<{ source: Stuff; defs: CommandDefinition[] }> {
    return collectHostedUpdateDefsImpl(host);
  }

  /** See {@link CommandApi.createCommandContext}. */
  @CallSecurity(CommandApiCallers)
  public createCommandContext(
    args: CreateCommandContextArgs,
  ): CommandContext {
    return new CommandContextImpl(args);
  }

  /** See {@link CommandApi.resolveParser}. */
  @CallSecurity(CommandApiCallers)
  public async resolveParser(spec: string): Promise<Parser> {
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

  /** See {@link CommandApi.resolveValidator}. */
  @CallSecurity(CommandApiCallers)
  public async resolveValidator(
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

  /** See {@link CommandApi.resolveCommandValidator}. */
  @CallSecurity(CommandApiCallers)
  public async resolveCommandValidator(
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

  /** See {@link CommandApi.assemble}. */
  @CallSecurity(CommandApiCallers)
  public assemble(
    parsed: ParsedCommand,
    command: CommandDefinition,
    ctx: { commandGiver: Stuff & CommandGiver; location: (Stuff & Container) | null }
  ): AssembleResult {
    const tokens = parsed.rawTokens;
    if (tokens.length === 0 || tokens[0]?.kind !== 'word') {
      return { error: 'shape', summary: 'No verb' };
    }

    const expand = makeExpander(ctx.commandGiver);
    const fields: ModelData = {};
    let i = 1;
    let stopped = false;
    // Reserved framework flags `--async` / `--sync` — stripped ahead of
    // per-command option binding (the `--` stop-options precedent), so
    // they work on any verb without it declaring an option. Last wins;
    // never reach `bindOptionToken` (so no "unknown option" error).
    // Only before the stop-options boundary; after `--` they're literals.
    let reservedAsync: 'async' | 'sync' | undefined;

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
      if (t.kind === 'long-flag' && (t.name === 'async' || t.name === 'sync')) {
        reservedAsync = t.name;
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
        t.kind === 'long-flag' &&
        (t.name === 'async' || t.name === 'sync')
      ) {
        reservedAsync = t.name;
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
    if (reservedAsync !== undefined) out.reservedAsync = reservedAsync;
    return out;
  }

  /** See {@link CommandApi.assembleFromStructured}. */
  @CallSecurity(CommandApiCallers)
  public assembleFromStructured(
    payload: {
      verb: string;
      subcommand?: string;
      fields?: Record<string, unknown>;
      raw?: string;
    },
    command: CommandDefinition,
    _ctx: { commandGiver: Stuff & CommandGiver; location: (Stuff & Container) | null }
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

  /** See {@link CommandApi.overlayBodyFields}. */
  @CallSecurity(CommandApiCallers)
  public overlayBodyFields(
    model: CommandModel,
    fields: Record<string, unknown>,
    command: CommandDefinition,
  ): void {
    const subcommand =
      typeof model[SUBCOMMAND_FIELD] === 'string'
        ? (model[SUBCOMMAND_FIELD] as string)
        : undefined;
    for (const [k, v] of Object.entries(fields)) {
      // Structural narrowness: `fields` may ONLY reach the command's
      // `payload:`-block fields (structured-only) or a designated body
      // field — a greedy `string` positional arg. Options (flags) and
      // object/MQL selectors are unreachable, so the side-channel can
      // never fill a selector or toggle a flag.
      const payloadDef = lookupPayloadField(command, k);
      const argDef = lookupFieldDefinition(command, subcommand, k);
      const isBodyArg =
        argDef !== undefined &&
        argDef.type === 'string' &&
        argDef.greedy === true;
      if (!payloadDef && !isBodyArg) continue; // can't reach selectors/flags.

      const type = payloadDef?.type ?? argDef?.type;
      const schema = payloadDef?.schema ?? argDef?.schema;
      const coerced = coerceStructuredValue(type, v, schema, k);
      if (!coerced.ok) continue; // leave unset → downstream validation rejects.
      // Lean `fields` wins when both inline-greedy and the side-channel
      // supply the body.
      model[k] = coerced.value;
    }
  }

  /** See {@link CommandApi.preloadValidatorDeps}. */
  @CallSecurity(CommandApiCallers)
  public async preloadValidatorDeps(
    command: CommandDefinition,
    context: CommandContext,
    resolved: CommandModel,
    subcommand?: string
  ): Promise<ValidatorPreloads> {
    type Pending = { v: (...args: never[]) => unknown; p: Promise<unknown> };
    const pending: Pending[] = [];
    const collectField = (
      list: FieldValidator[] | undefined,
      fname: string
    ): void => {
      if (!list) return;
      const value = resolved[fname];
      for (const v of list) {
        if (typeof v.preload === 'function') {
          pending.push({
            v: v as (...args: never[]) => unknown,
            p: v.preload(value, fname, context) as Promise<unknown>,
          });
        }
      }
    };
    const collectCmd = (list: CommandValidator[] | undefined): void => {
      if (!list) return;
      for (const v of list) {
        if (typeof v.preload === 'function') {
          pending.push({
            v: v as (...args: never[]) => unknown,
            p: v.preload(context) as Promise<unknown>,
          });
        }
      }
    };

    collectCmd(command._resolvedValidators);
    if (subcommand) {
      collectCmd(command.getSubcommand(subcommand)?._resolvedValidators);
    }
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

    const out: ValidatorPreloads = new Map();
    if (pending.length === 0) return out;
    const values = await Promise.all(pending.map((e) => e.p));
    for (let i = 0; i < pending.length; i++) {
      out.set(pending[i]!.v, values[i]);
    }
    return out;
  }

  /** See {@link CommandApi.applyCardinalityPolicy}. */
  @CallSecurity(CommandApiCallers)
  public async applyCardinalityPolicy(
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

  /** See {@link CommandApi.resolveModel}. */
  @CallSecurity(CommandApiCallers)
  public async resolveModel(
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
              // Uniform member key = templatePath (matches the `isAdmin`
              // predicate's `target.getTemplatePath()` lookup).
              const key = m.getTemplatePath();
              if (key) coreMemberIds.add(key);
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
        const filtered = await this.applyCardinalityPolicy(def, r.stuff, fname, context);
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
        const filtered = await this.applyCardinalityPolicy(def, stuff, fname, context);
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
        const filtered = await this.applyCardinalityPolicy(def, r.stuff, fname, context);
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
        const filtered = await this.applyCardinalityPolicy(def, stuff, fname, context);
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

  /** See {@link CommandApi.runValidators}. */
  @CallSecurity(CommandApiCallers)
  public runValidators(
    resolved: CommandModel,
    context: CommandContext,
    preloads?: ValidatorPreloads,
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
        const err = v(
          context,
          preloads?.get(v as (...args: never[]) => unknown) as never,
        );
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

    // Subcommand-level validators run after the verb-level gates and
    // before field validators (the same authority/precondition phase,
    // scoped to the invoked subcommand). They let one subcommand carry
    // an authority gate the verb's other subcommands don't — e.g. a
    // founder-only `assign` under a verb whose bare roster is public.
    if (subcommand) {
      const subValidators = command.getSubcommand(subcommand)
        ?._resolvedValidators;
      if (subValidators) {
        for (const v of subValidators) {
          const err = v(
            context,
            preloads?.get(v as (...args: never[]) => unknown) as never,
          );
          if (err) {
            context.note({
              kind: 'validator-failed',
              validator: `subcommand:${subcommand}`,
              detail: err,
            });
            return { result: 'failed' };
          }
        }
      }
    }

    // Field validators. Optional positionals that didn't bind
    // short-circuit (same rule as options below) so authors don't
    // have to write null-tolerant fallbacks in every validator.
    for (const [fname, def] of Object.entries(fieldDefs)) {
      const v = resolved[fname];
      if (v === undefined && def.required === false) continue;
      const err = runValidators(def._resolvedValidators, v, fname, context, preloads);
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
      const err = runValidators(opt._resolvedValidators, v, fname, context, preloads);
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
      const err = runValidators(opt._resolvedValidators, v, fname, context, preloads);
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
        const err = runValidators(opt._resolvedValidators, resolved[fname], fname, context, preloads);
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

  /** See {@link CommandApi.resolveAndValidate}. */
  @CallSecurity(CommandApiCallers)
  public async resolveAndValidate(
    model: CommandModel,
    context: CommandContext,
    prep: Record<string, string> = {}
  ): Promise<{ resolved: CommandModel } | { result: 'failed' }> {
    const resolved = await this.resolveModel(model, context, prep);
    if ('result' in resolved) return resolved;
    const subcommand =
      typeof (resolved.resolved as { subcommand?: unknown }).subcommand ===
      'string'
        ? ((resolved.resolved as { subcommand?: string }).subcommand)
        : undefined;
    const preloads = await this.preloadValidatorDeps(
      context.command,
      context,
      resolved.resolved,
      subcommand,
    );
    const validated = this.runValidators(resolved.resolved, context, preloads);
    if ('result' in validated) return validated;
    return resolved;
  }

  /** See {@link CommandApi.emitSchemaDelta}. */
  @CallSecurity(CommandApiCallers)
  public emitSchemaDelta(
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
      id: SecurityApi.uuid(),
      topic,
      tags: [],
      body: '',
      meta,
      payload,
    };
    MessageApi.sendMessage(recipient as Stuff & Sensor, frame);
  }

  /** See {@link CommandApi.forceCommand}. */
  @CallSecurity(CommandApiCallers)
  public forceCommand(
    giver: Stuff & CommandGiver,
    text: string,
    opts: ExecuteCommandOpts = {}
  ): Promise<void> {
    return giver.executeCommand(text, { ...opts, forced: true });
  }

  /** See {@link CommandApi.getCommandSchemaPayload}. */
  @CallSecurity(CommandApiCallers)
  public getCommandSchemaPayload(cmd: CommandDefinition): CommandSchemaPayload {
    const out: CommandSchemaPayload = {
      verbs: cmd.verbs,
      // Report the RESOLVED `/`-rooted path dispatch actually clones (the
      // controller-path refactor), not the raw relative/authored value.
      controller: cmd.resolvedController ?? cmd.controller,
      description: cmd.description,
    };
    if (cmd.help) out.help = cmd.help;
    if (cmd.examples && cmd.examples.length > 0) out.examples = cmd.examples;
    if (cmd.args.length > 0) out.args = cmd.args;
    if (Object.keys(cmd.subcommands).length > 0) out.subcommands = cmd.subcommands;
    if (Object.keys(cmd.verbOptions).length > 0) out.options = cmd.verbOptions;
    if (Object.keys(cmd.payload).length > 0) out.payload = cmd.payload;
    if (cmd.fallthrough) out.fallthrough = true;
    return out;
  }

  /** See {@link CommandApi.validateAgainstJsonSchema}. */
  @CallSecurity(CommandApiCallers)
  public validateAgainstJsonSchema(
    schema: Record<string, unknown>,
    value: unknown,
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
}

/* ─────────────────── Matcher helpers ─────────────────── */

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
      const schemaErr = CommandApi.validateAgainstJsonSchema(schema, raw);
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

/**
 * Resolve a `payload:`-block field by its model name (the structured-only
 * fields the body side-channel may fill). Returns undefined when `fname`
 * is not a payload field.
 */
function lookupPayloadField(
  command: CommandDefinition,
  fname: string
): OptionDefinition | undefined {
  for (const [name, def] of Object.entries(command.payload)) {
    if ((def.field ?? name) === fname) return def;
  }
  return undefined;
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
    // Subcommand-level validators — command-shaped (take `context`),
    // like verb-level, so they dispatch to `resolveCommandValidator`
    // (not the field form). Stored on `sub._resolvedValidators`.
    if (sub.validators && sub.validators.length > 0) {
      const fns: CommandValidator[] = [];
      for (const spec of sub.validators) {
        fns.push(await CommandApi.resolveCommandValidator(spec, yamlPath));
      }
      sub._resolvedValidators = fns;
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
 * Walk a class chain — concrete first, then mixins — and collect the
 * named bucket's static contribution filenames (deduping is deferred to
 * {@link resolveDefs}).
 */
function bucketFilenames(ctor: unknown, bucket: Bucket): string[] {
  const filenames: string[] = [];
  const ownList = getContributions(ctor)?.[bucket];
  if (ownList) filenames.push(...ownList);
  const mixins = MixinApi.queryMixins(
    ctor as { prototype: unknown } & ((...args: unknown[]) => unknown)
  );
  for (const mixin of mixins) {
    const mlist = getContributions(mixin)?.[bucket];
    if (mlist) filenames.push(...mlist);
  }
  return filenames;
}

/**
 * Per-instance dynamic contribution filenames for `bucket`, via the
 * optional {@link InstanceContributor} seam. Defensive: the hook runs on
 * the containment hot path, so a throw is swallowed to no contribution.
 */
function instanceBucketFilenames(instance: Stuff, bucket: Bucket): string[] {
  const fn = (instance as Partial<InstanceContributor>)
    .getInstanceContributions;
  if (typeof fn !== 'function') return [];
  try {
    return fn.call(instance)?.[bucket] ?? [];
  } catch {
    return [];
  }
}

/**
 * The named bucket's contributions off a **class** only (static). Used
 * where no instance is in hand (shadows, hosted updates, self-seed).
 */
function collectBucketDefs(
  ctor: unknown,
  bucket: Bucket
): CommandDefinition[] {
  return resolveDefs(bucketFilenames(ctor, bucket));
}

/**
 * The named bucket's contributions off a live **instance** — its
 * class/mixin statics PLUS any per-instance {@link InstanceContributor}
 * contributions. Used at the `inventory`/`environment`/`peers`
 * containment-delta push sites so a contribution can depend on
 * per-instance state (a tool's authored `capabilities`, a Behaved
 * host's dialogue tree) and still ride the ordinary movement
 * push/pop/reset lifecycle.
 */
function collectBucketDefsForInstance(
  instance: Stuff,
  bucket: Bucket
): CommandDefinition[] {
  return resolveDefs([
    ...bucketFilenames(instance.constructor, bucket),
    ...instanceBucketFilenames(instance, bucket),
  ]);
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
      const defs = collectBucketDefsForInstance(item, 'inventory');
      if (defs.length > 0) {
        (to as Stuff & CommandGiver).pushCommandSource(item, 'inventory', defs);
      }
    }
    const envDefs = collectBucketDefsForInstance(item, 'environment');
    const peerDefs = MixinApi.isCommandGiver(item)
      ? collectBucketDefsForInstance(item, 'peers')
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
      const envDefs = collectBucketDefsForInstance(neighbor, 'environment');
      const peerDefs = MixinApi.isCommandGiver(neighbor)
        ? collectBucketDefsForInstance(neighbor, 'peers')
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

function applyHostedUpdateDeltaImpl(
  host: Stuff,
  update: Stuff,
  op: 'host' | 'unhost'
): void {
  if (!MixinApi.isCommandGiver(host)) return;
  const cg = host as Stuff & CommandGiver;
  if (op === 'host') {
    // Keep `'self'` at index 0 — seed the giver's own self entry
    // before layering the update's contributions on top.
    cg._ensureSelfEntry();
    const defs = collectBucketDefs(update.constructor, 'self');
    if (defs.length > 0) cg.pushCommandSource(update, 'self', defs);
    return;
  }
  cg.popCommandSource(update);
}

function collectHostedUpdateDefsImpl(
  host: Stuff
): Array<{ source: Stuff; defs: CommandDefinition[] }> {
  // `isAether` is the composition check (and narrows `host` to an
  // `AetherHost`). Transmission-time gating (attunement active) rides
  // the validators / controller / `tell` guard, mirroring how
  // augment-gated verbs surfaced-but-refused before this build.
  if (!MixinApi.isAether(host)) return [];
  const out: Array<{ source: Stuff; defs: CommandDefinition[] }> = [];
  for (const u of host.getHostedUpdates()) {
    const defs = collectBucketDefs(u.constructor, 'self');
    if (defs.length > 0) out.push({ source: u, defs });
  }
  return out;
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
  context: CommandContext,
  preloads?: ValidatorPreloads,
): string | undefined {
  if (!validators) return undefined;
  for (const v of validators) {
    const err = v(
      value,
      fname,
      context,
      preloads?.get(v as (...args: never[]) => unknown) as never,
    );
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
