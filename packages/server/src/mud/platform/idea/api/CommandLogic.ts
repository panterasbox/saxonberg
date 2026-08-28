// CommandLogic — the hot-reloadable logic singleton behind CommandApi.
// (Doc comment lives on the class declaration below so @internal lands
// on the reflection TypeDoc emits, not on the module.)

import { ApiLogic } from '../../../lib/stuff/ApiLogic';
import { NON_TEMPLATE_DIRS } from '../../../lib/paths';
import { CallSecurity, Unshadowable } from '../../../lib/security/decorators';
import { SecurityPolicies } from '../../../lib/security/SecurityPolicies';
import type { Stuff } from '../../../lib/stuff/Stuff';
import type { Container } from '../../../lib/spatial/Container';
import type { Containable } from '../../../lib/spatial/Containable';
import type { CommandGiver } from '../../../lib/command/CommandGiver';
import type { Focused } from '../../../lib/command/Focused';
import { ArrayApi } from '../../../api/array';
import { ShellApi } from '../../../api/shell';
import { PromptApi } from '../../../api/prompt';
import type Interactive from '../Interactive';
import type { Sensor } from '../../../lib/message/Sensor';
import { CommandDefinition } from '../../../lib/command/CommandDefinition';
import { fileURLToPath, pathToFileURL } from 'url';
import {
  dirname,
  isAbsolute,
  join,
  resolve as resolvePath,
  sep,
} from 'path';
import { readFileSync, readdirSync, existsSync } from 'fs';
import { DocumentApi } from '../../../api/document';
import { PersistApi } from '../../../api/persist';
import { PackApi } from '../../../api/pack';
import type { StoredDocument } from '../../../lib/document/StoredDocument';
import { SecurityApi } from '../../../api/security';
import Ajv, { type ValidateFunction } from 'ajv';
import { CARD_IDS } from '@saxonberg/types';
import { SourceTreeApi } from '../../../api/source-tree';
import type {
  MessageFrame,
  Note,
  Status,
  AffordanceEntry,
} from '@saxonberg/types';
import {
  MqlApi,
  type MqlMany,
  type MqlManyResult,
  type MqlMatchVia,
  type MqlOneResult,
  type MqlOne,
} from '../../../api/mql';
import { MixinApi } from '../../../api/mixin';
import { Mixins, MixinRefusals, type MixinName } from '../../../lib/mixin';
import { PerceptionApi } from '../../../api/perception';
import { RecognitionApi } from '../../../api/recognition';
import { MessageApi } from '../../../api/message';
import { AccessApi } from '../../../api/access';
import { GroupApi } from '../../../api/group';
import { ExecutionContextApi } from '../../../api/execution-context';
import {
  CommandLineApi,
  type ParsedCommand,
  type RawToken,
} from '../../../api/command-line';
import type { GenderedSlot } from '../../../api/mql';
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
  type AffordanceResolution,
  type FieldValidator,
  type CommandValidator,
  type ValidatorPreloads,
  type MixinRequirement,
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
} from '../../../api/command';

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
 * for `world/`-prefixed content-local command bundles (a locality's
 * bespoke verb specs living with its content under
 * `world/<sphere>/<locality>/commands/`).
 */
const MUD_ROOT = resolvePath(__dirname, '../../..');

/** `/platform/cmd/perception/look` → `platform/cmd/perception/look.yaml`: the key is the path. */
function viewKeyOf(docPath: string): string {
  return `${docPath.replace(/^\//, '')}.yaml`;
}

/** Is there a document store to serve views from? (A stubbed PM is not one.) */
function storeAvailable(): boolean {
  try {
    return PersistApi.isConnected();
  } catch {
    return false;
  }
}

/**
 * The packs' `content/` roots — what views are read from OFFLINE (no
 * document store: a unit test, a stripped boot). A checkout with no
 * resolvable packs reads nothing. Never consulted while a store exists.
 */
/**
 * Has `preloadAll` served the views from a document store? Once it has,
 * the store is the ONLY source and a miss is a miss (content-packs wave
 * 3 — no disk fallback). Until then (offline: a unit test, a stripped
 * boot) the packs' own files are read. Reset by `clearCache`.
 */
let servedFromStore = false;

let offlineRoots: string[] | null = null;
function offlineContentRoots(): string[] {
  if (offlineRoots) return offlineRoots;
  try {
    offlineRoots = PackApi.contentRoots();
  } catch {
    offlineRoots = [];
  }
  return offlineRoots;
}

/**
 * The pack file for a view key, offline: the key IS the content-relative
 * path (`platform/cmd/perception/look.yaml`, `world/<…>/cmd/<verb>.yaml`)
 * — the same files the installer reads. Null when no pack ships it.
 */
function offlineFileFor(key: string): string | null {
  for (const root of offlineContentRoots()) {
    const file = join(root, key);
    if (existsSync(file)) return file;
  }
  return null;
}

/** Every view key the packs ship, offline: every tree's `cmd` dirs (not the `idea/cmd` controller mirror). */
function offlineViewKeys(): string[] {
  const keys: string[] = [];
  for (const root of offlineContentRoots()) {
    if (!existsSync(root)) continue;
    for (const e of readdirSync(root, { withFileTypes: true })) {
      if (!e.isDirectory() || e.name.startsWith('.')) continue;
      if (NON_TEMPLATE_DIRS.has(e.name)) continue;
      for (const f of readdirSync(join(root, e.name), { recursive: true }) as string[]) {
        const norm = f.split(sep).join('/');
        if (!norm.endsWith('.yaml') || norm.split('/').includes('__tests__')) continue;
        const dirs = norm.split('/').slice(0, -1);
        const at = dirs.lastIndexOf('cmd');
        if (at < 0 || dirs[at - 1] === 'idea') continue;
        keys.push(`${e.name}/${norm}`);
      }
    }
  }
  return keys.filter((k, i) => keys.indexOf(k) === i);
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
    // A lost-update guard firing is the command being REFUSED, not the
    // command erroring: the page is fine, the edit is not applied, and
    // the author is expected to reapply it. `declined` is what the
    // client renders as "that didn't go through", which is exactly
    // right, whereas `error` would read as the wiki being broken.
    case 'wiki-edit-conflict':
      return 'declined';
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
 * Lives at `/platform/idea/api/command` (a stateless `Stuff` singleton, no
 * backing `Template`); `CommandApi`'s public statics forward here via
 * `StuffApi.singletonSync`. `dest /platform/idea/api/command` reloads it.
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

    // Once the preload served the store's views, a miss is a miss
    // (content-packs wave 3 — there is no disk fallback). OFFLINE the
    // packs' files are the source and are read directly. The key == the
    // `commandContributions` string == the cache key == the pack file
    // (`cmd/<key>`, or `<key>` for a `world/`-prefixed locality view),
    // so this mapping is the single source of resolution.
    if (servedFromStore) return null;
    const filePath = offlineFileFor(filename);
    if (!filePath) {
      console.error(`CommandApi: no pack ships command view ${filename}`);
      return null;
    }
    try {
      // The read lives here, in the Api tier: `CommandDefinition` is a
      // mudlib value object and may not touch `fs` (the import boundary).
      // The wrapper preserves the operator-facing context — without it a
      // missing spec surfaces as a bare ENOENT with no indication of
      // which command failed to load.
      let command: CommandDefinition;
      try {
        command = CommandDefinition.fromYaml(readFileSync(filePath, 'utf-8'), join(MUD_ROOT, filename));
      } catch (error) {
        throw new Error(`Failed to load command definition from ${filePath}: ${error}`);
      }
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
    offlineRoots = null;
    servedFromStore = false;
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

  /** See {@link CommandApi.reload}. */
  @CallSecurity(CommandApiCallers)
  public async reload(docPath: string): Promise<boolean> {
    const key = viewKeyOf(docPath);
    commands.delete(key);
    if (!storeAvailable()) return false;
    const doc = await DocumentApi.read(docPath);
    if (!doc || doc.getKind() !== 'command-view') return false;
    const cmd = CommandDefinition.fromView(doc.getData(), join(MUD_ROOT, key));
    await resolveCommandValidators(cmd);
    validateCommandEffects(cmd);
    commands.set(key, cmd);
    return true;
  }

  /** See {@link CommandApi.preloadAll}. */
  @CallSecurity(CommandApiCallers)
  public async preloadAll(): Promise<{ loaded: number; failed: string[] }> {
    const failed: string[] = [];
    let loaded = 0;

    // ── The STORE: every installed `command-view` document. A malformed
    // stored view is a `failed` entry, never a throw — the pack gate
    // keeps them out, the CMS chokepoint refuses them. With a store, that
    // is the whole preload: a view the store lacks is a miss, not a file
    // (content-packs wave 3 — no disk fallback).
    if (storeAvailable()) {
      let stored: StoredDocument[] = [];
      try {
        stored = await DocumentApi.listOfKind('command-view');
      } catch (err) {
        console.error('CommandApi: could not read the command-view store:', err);
      }
      servedFromStore = true;
      for (const doc of stored) {
        const key = viewKeyOf(doc.getPath());
        try {
          const cmd = CommandDefinition.fromView(doc.getData(), join(MUD_ROOT, key));
          await resolveCommandValidators(cmd);
          validateCommandEffects(cmd);
          commands.set(key, cmd);
          loaded += 1;
        } catch (err) {
          console.error(`CommandApi: stored command view ${doc.getPath()} failed:`, err);
          failed.push(key);
        }
      }
      return { loaded, failed };
    }

    // ── OFFLINE (no store — a unit test, a stripped boot): the packs'
    // files ARE the source, read directly — `content/cmd/**` (the engine
    // verbs, grouped into subdirs; the subdir-qualified string is the
    // cache key + the `commandContributions` reference) and
    // `content/world/**/cmd/**` (a locality's own verbs, keyed
    // `world/`-prefixed).
    for (const file of offlineViewKeys()) {
      if (commands.has(file)) continue;
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
        console.error(`CommandApi: validator preload failed for ${file}:`, err);
        failed.push(file);
      }
    }
    return { loaded, failed };
  }

  /** See {@link CommandApi.collectContributions}. */
  @CallSecurity(CommandApiCallers)
  public collectContributions(
    ctor: unknown,
    bucket: 'self' | 'inventory' | 'environment' | 'peers',
  ): CommandDefinition[] {
    return collectBucketDefs(ctor, bucket);
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

  /** See {@link CommandApi.resolveValidators}. */
  @CallSecurity(CommandApiCallers)
  public resolveValidators(cmd: CommandDefinition): Promise<void> {
    return resolveCommandValidators(cmd);
  }

  /** See {@link CommandApi.resolveRequirement}. */
  @CallSecurity(CommandApiCallers)
  public resolveRequirement(
    requires: MixinRequirement,
    where: string,
  ): Promise<FieldValidator | null> {
    return requirementValidator(requires, where);
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
    const expandDefault = makeDefaultExpander(ctx.commandGiver);
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
      const r = bindPositionals(positionals, sub.args ?? [], parsed, expand, expandDefault);
      if ('error' in r) return r;
      Object.assign(fields, r.bound);
      prep = r.prep;
    } else if (fallthroughActive) {
      // Phase 3a — verb opted into fallthrough. Bind the un-consumed
      // candidate + remaining tokens against the top-level args. On
      // bind failure, surface the ORIGINAL unknown-subcommand error
      // pointing at the candidate — the slate's required behavior.
      const r = bindPositionals(positionals, command.args, parsed, expand, expandDefault);
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
      const r = bindPositionals(positionals, command.args, parsed, expand, expandDefault);
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

    // No MQL permission snapshot (content-packs wave 3): resolving a
    // query is never a permission — the verb's own gate decides what the
    // giver may DO with what resolved.

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

      // A scope's answer counts only if something in it can satisfy
      // the field's `requires:`; otherwise the scan moves on to the
      // next scope (the `$focus` → `reachable` chain is a chain, not a
      // first-name-match-wins). No `requires:` → every match counts.
      const terms =
        (def as { _requirementTerms?: RequirementTerm[] })._requirementTerms ?? [];
      const admissible = (s: Stuff): boolean => terms.every((t) => t.test(s));

      if (def.type === 'objects') {
        let r: MqlMany;
        try {
          r = { stuff: [] };
          // The first raw match is kept as the fallback: when NOTHING in
          // any scope is admissible, bind it anyway so the field's
          // validator can say why ("that has no mass") rather than the
          // scan pretending it saw nothing.
          let firstRaw: MqlMany | null = null;
          for (const scope of tries) {
            const got = MqlApi.resolveMany(raw, { commandGiver: giver, scope });
            if (got.stuff.length > 0 && !firstRaw) firstRaw = got;
            const kept = got.stuff.filter(admissible);
            if (kept.length > 0) {
              r = { ...got, stuff: kept };
              break;
            }
          }
          if (r.stuff.length === 0 && firstRaw) r = firstRaw;
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
          let firstRaw: MqlMany | null = null;
          for (const scope of tries) {
            if (useTop && terms.length === 0) {
              const r: MqlOne = MqlApi.resolveOne(raw, { commandGiver: giver, scope });
              if (r.stuff !== null) {
                stuff = [r.stuff];
                via = r.via;
                quantity = r.quantity;
                break;
              }
            } else {
              // With `requires:` the cheap top-one path can't be used —
              // the top match may be the inadmissible one — so the
              // scope is resolved in full and the first admissible
              // match is the top. The first raw match is the fallback
              // when nothing anywhere is admissible (see above).
              const r: MqlMany = MqlApi.resolveMany(raw, { commandGiver: giver, scope });
              if (r.stuff.length > 0 && !firstRaw) firstRaw = r;
              const kept = r.stuff.filter(admissible);
              if (kept.length > 0) {
                stuff = useTop ? [kept[0] as Stuff] : kept;
                via = r.via;
                quantity = r.quantity;
                break;
              }
            }
          }
          if (stuff.length === 0 && firstRaw) {
            stuff = useTop ? [firstRaw.stuff[0] as Stuff] : firstRaw.stuff;
            via = firstRaw.via;
            quantity = firstRaw.quantity;
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
      // Same `requires:`-aware scan as the positional loop.
      const terms =
        (def as { _requirementTerms?: RequirementTerm[] })._requirementTerms ?? [];
      const admissible = (s: Stuff): boolean => terms.every((t) => t.test(s));

      if (def.type === 'objects') {
        let r: MqlMany;
        try {
          r = { stuff: [] };
          // The first raw match is kept as the fallback: when NOTHING in
          // any scope is admissible, bind it anyway so the field's
          // validator can say why ("that has no mass") rather than the
          // scan pretending it saw nothing.
          let firstRaw: MqlMany | null = null;
          for (const scope of tries) {
            const got = MqlApi.resolveMany(raw, { commandGiver: giver, scope });
            if (got.stuff.length > 0 && !firstRaw) firstRaw = got;
            const kept = got.stuff.filter(admissible);
            if (kept.length > 0) {
              r = { ...got, stuff: kept };
              break;
            }
          }
          if (r.stuff.length === 0 && firstRaw) r = firstRaw;
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
          let firstRaw: MqlMany | null = null;
          for (const scope of tries) {
            if (useTop && terms.length === 0) {
              const r: MqlOne = MqlApi.resolveOne(raw, { commandGiver: giver, scope });
              if (r.stuff !== null) {
                stuff = [r.stuff];
                via = r.via;
                quantity = r.quantity;
                break;
              }
            } else {
              // With `requires:` the cheap top-one path can't be used —
              // the top match may be the inadmissible one — so the
              // scope is resolved in full and the first admissible
              // match is the top. The first raw match is the fallback
              // when nothing anywhere is admissible (see above).
              const r: MqlMany = MqlApi.resolveMany(raw, { commandGiver: giver, scope });
              if (r.stuff.length > 0 && !firstRaw) firstRaw = r;
              const kept = r.stuff.filter(admissible);
              if (kept.length > 0) {
                stuff = useTop ? [kept[0] as Stuff] : kept;
                via = r.via;
                quantity = r.quantity;
                break;
              }
            }
          }
          if (stuff.length === 0 && firstRaw) {
            stuff = useTop ? [firstRaw.stuff[0] as Stuff] : firstRaw.stuff;
            via = firstRaw.via;
            quantity = firstRaw.quantity;
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
    // validator (e.g. a relational one) to tolerate `null`.
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
    const meta: MessageFrame['meta'] = { timestamp: Date.now() };
    const ctx = ExecutionContextApi.getCurrentCommandContext();
    if (ctx?.commandId) meta.commandId = ctx.commandId;
    const causing = ExecutionContextApi.getCurrentCausingCommandId();
    if (causing) meta.causingCommandId = causing;

    // ⭐ `shell.control` carries every "server changes your interface"
    // frame — schema deltas, `clear`, layout, mode, style. They are one
    // subject, so they are one topic; WHICH control it is rides a tag,
    // the way a log line's level does. This used to be three topics
    // (`system.commands.{added,removed,reset}`), which put the
    // discriminator in the tree and minted three keys nobody authored.
    const frame: MessageFrame = {
      id: SecurityApi.uuid(),
      topic: 'shell.control',
      tags: ['control:schema', `schema:${kind}`],
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

  /** See {@link CommandApi.validateCommandView}. */
  @CallSecurity(CommandApiCallers)
  public validateCommandView(view: unknown): string | null {
    const validate = commandSpecValidator();
    if (!validate(view)) {
      return (validate.errors ?? [])
        .map((e) => `  ${e.instancePath || '/'} ${e.message ?? ''}`)
        .join('\n');
    }
    /*
     * ⭐ `opens_card` resolves against the CATALOGUE, not against the
     * schema.
     *
     * JSON Schema could carry the enum, but then the vocabulary would
     * live in two places and the copy in the schema would drift the
     * first time a card is added. Checking the real `CARD_IDS` here
     * means a typo fails at BOOT — the same posture as the lint family —
     * rather than at first invocation, where it would look like the card
     * silently not opening.
     */
    const raw = (view as { opens_card?: unknown }).opens_card;
    const declared =
      raw === undefined ? [] : Array.isArray(raw) ? raw : [raw];
    for (const id of declared) {
      if (
        typeof id !== 'string' ||
        !(CARD_IDS as readonly string[]).includes(id)
      ) {
        return (
          `  /opens_card '${String(id)}' is not a card ` +
          `(known: ${CARD_IDS.join(', ')})`
        );
      }
    }
    return null;
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

  /** See {@link CommandApi.resolveAffordances}. */
  @CallSecurity(CommandApiCallers)
  public resolveAffordances(
    target: Stuff,
    viewer: Stuff & CommandGiver,
  ): Promise<AffordanceResolution | null> {
    return resolveAffordancesImpl(target, viewer);
  }
}

/* ─────────────────── Affordance resolution ─────────────────── */

/**
 * Execution/command id stamped on a resolution probe's context.
 *
 * ⚠ A fixed, recognisable sentinel rather than a fresh id per probe:
 * a menu opening is not a command, and anything downstream that
 * correlates by command id (attribution, the accountability ledger,
 * `causingCommandId`) must never mistake a probe for one.
 */
const AFFORDANCE_PROBE_ID = 'affordance-probe';

/**
 * The object-shaped field types. A verb can take our target as an
 * argument only if it declares one of these somewhere.
 */
const OBJECT_FIELD_TYPES = new Set(['object', 'objects']);

/**
 * Every object-shaped **positional** a definition declares, in slot
 * order.
 *
 * ⚠ Options are deliberately excluded, and the live drive is what
 * proved it: `cd` declares `--mql` as an object option, so counting
 * options put `cd` — and every other shell verb with an MQL escape
 * hatch — in the menu of every object in the world. A radial's subject
 * binds to what the verb is ABOUT, and that is a positional. An option
 * is a modifier the player types on purpose.
 */
function objectFields(cmd: CommandDefinition): string[] {
  const names: string[] = [];
  for (const arg of cmd.args) {
    if (arg.type && OBJECT_FIELD_TYPES.has(arg.type)) names.push(arg.name);
  }
  return names;
}

/**
 * See {@link CommandApi.resolveAffordances}.
 *
 * ⚠ **Every gate here DELETES.** Nothing is returned present-and-
 * flagged, because a response admitting that a hidden verb exists
 * leaks the fact that it exists — the honest-fog rule. That is why the
 * error case carries one reason code and why an unidentified thing
 * reports an empty composition rather than a redacted one.
 */
async function resolveAffordancesImpl(
  target: Stuff,
  viewer: Stuff & CommandGiver,
): Promise<AffordanceResolution | null> {
  // Gate 1 — perception. You cannot have a menu for something you
  // cannot perceive, and "no such object" and "not for you" must be
  // the same answer.
  if (!PerceptionApi.perceives(viewer, target)) return null;

  // Gate 2 — identification. ⭐ An unidentified thing tells you
  // nothing about ITSELF: no composition, and none of the verbs it
  // contributes, because a contributed verb IS a statement about what
  // the thing is (an unidentified wand must not offer `recharge`).
  // Your own verbs still apply — `get` and `look` are facts about you.
  const identified =
    !MixinApi.isIdentifiable(target) ||
    RecognitionApi.knowsTrueType(viewer, target);

  // ⚠ Deduped: a mixin composed at two points in the chain is returned
  // twice by `getActiveMixins`, and the live drive showed
  // `TangibleMixin` twice on an aether implant. A menu grouping by
  // composition would have painted the group twice.
  const composition = identified
    ? [
        ...new Set(
          MixinApi.getActiveMixins(target)
            .map((m) => m._mixinName ?? m.name)
            .filter((n): n is string => !!n),
        ),
      ]
    : [];

  const seen = new Set<string>();
  const entries: AffordanceEntry[] = [];

  for (const affordance of viewer.getAffordances()) {
    const cmd = affordance.command;
    const verb = cmd.verbs[0];
    if (!verb || seen.has(verb)) continue;

    const fromTarget = affordance.source === target;
    const fields = objectFields(cmd);

    if (fromTarget) {
      if (!identified) continue;
    } else if (fields.length === 0) {
      // One of the viewer's own verbs that takes no object at all —
      // `look` with no argument, `score`. Not an affordance OF this
      // target, so it does not belong in this target's menu.
      continue;
    }

    seen.add(verb);
    /*
     * ⭐ Carry `fromTarget` ONTO the entry. It was computed here and
     * used only as a filter, so nothing downstream could tell *this
     * subject affords it* from *the actor can always do it* — which is
     * why a card's action row said `cast · defend · destruct` on
     * everything.
     */
    entries.push({
      ...(await evaluateAffordance(cmd, verb, target, viewer, fields)),
      source: fromTarget ? ('subject' as const) : ('actor' as const),
    });
  }

  entries.sort((a, b) => a.verb.localeCompare(b.verb));
  return { verbs: entries, composition };
}

/**
 * Run one verb's declared validators against a context with `target`
 * bound, without dispatching.
 *
 * ⚠ The reason string is the validator's **own return value**,
 * verbatim. Validators already speak player-facing prose — a
 * validator's return is exactly what the player would have been shown
 * had they typed the verb — so re-wording here would be inventing a
 * second, driftable copy of every refusal in the game.
 */
async function evaluateAffordance(
  cmd: CommandDefinition,
  verb: string,
  target: Stuff,
  viewer: Stuff & CommandGiver,
  fields: string[],
): Promise<AffordanceEntry> {
  const bound = fields[0];
  const context = CommandApi.createCommandContext({
    commandGiver: viewer,
    location: MixinApi.isContainable(viewer) ? viewer.getContainer() : null,
    commandText: verb,
    executionId: AFFORDANCE_PROBE_ID,
    commandId: AFFORDANCE_PROBE_ID,
    verb,
    command: cmd,
    commandSource: target,
  });

  // ⚠ Bound as an `MqlOneResult`, not a bare Stuff: field validators
  // reach for `MqlApi.effectiveTarget(value, …)`, whose door-behind-an-
  // exit rule needs the wrapper's shape. A bare Stuff survives
  // `extractStuffs` and then silently fails the richer readers.
  //
  // `raw` is the probe's own marker rather than player text — nobody
  // typed this binding.
  const binding: MqlOneResult = { stuff: target, raw: AFFORDANCE_PROBE_ID };
  const model: CommandModel = bound ? { [bound]: binding } : {};

  // ⚠⚠ The dispatcher runs an ASYNC preload phase between MQL
  // resolution and the sync validator bodies, and it is not optional:
  // `requiresAnimate` reports a live avatar inanimate until its species
  // singletons are warm. Skipping this made every verb resolve
  // `disabled` with one nonsense reason — and the tests still passed,
  // because "everything is disabled" is a perfectly well-formed menu.
  const preloads = await CommandApi.preloadValidatorDeps(cmd, context, model);
  const outcome = CommandApi.runValidators(model, context, preloads);

  if ('result' in outcome) {
    // The note the failing validator filed carries its own words.
    const note = context
      .getNotes()
      .find((n) => n.kind === 'validator-failed') as
      | { detail?: string; field?: string }
      | undefined;

    // ⚠⚠ A refusal aimed at an UNBOUND operand is not a refusal.
    // `put`'s `target` field declares `requires: [VisibleMixin,
    // ContainerMixin|SurfacedMixin]`, and with no container picked yet
    // the whole chain runs against `undefined` — which without this
    // branch reports `put` flatly unavailable on every object in the
    // game. The only honest reading is "you have not chosen the other
    // half yet."
    if (note?.field && note.field !== bound && fields.includes(note.field)) {
      return {
        verb,
        description: cmd.description,
        state: 'pending-operand',
        operand: note.field,
        category: cmd.category,
      };
    }

    return {
      verb,
      description: cmd.description,
      state: 'disabled',
      reason: note?.detail ?? 'You cannot do that here.',
      category: cmd.category,
    };
  }

  // ⭐ Passed every check a menu CAN evaluate — but a second object
  // field is an operand no radial can know (`put <thing> in <what?>`).
  // Reporting that plainly `enabled` would promise a click that then
  // stalls on a prompt.
  const operand = fields[1];
  if (operand) {
    return {
      verb,
      description: cmd.description,
      state: 'pending-operand',
      operand,
      category: cmd.category,
    };
  }

  return {
    verb,
    description: cmd.description,
    state: 'enabled',
    category: cmd.category,
  };
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
  expandDefault: (text: string) => string = expand,
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
          bound[name] = expandDefault(def.default);
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
          bound[name] = expandDefault(def.default);
        } else if (def.required !== false) {
          return {
            error: 'shape',
            summary: `missing required arg: ${name}`,
          };
        }
      } else if (stopAt < positionals.length) {
        // Build the substring from the original source to preserve
        // whitespace, but cut it just before the boundary token.
        // ⚠ `raw.length`, not `value.length`: a quoted or escaped token's
        // source span is longer than its stripped value, so measuring by
        // the value cuts the last word short (`"hello world"` → `"hello
        // worl`). `raw` is the verbatim slice, which is what it is for.
        const startInSource = first.pos - parsed.start;
        const last = positionals[stopAt - 1]!;
        const endInSource = last.pos + last.raw.length - parsed.start;
        const slice = parsed.source.substring(startInSource, endInSource);
        const processed = CommandLineApi.processOutsideEscapes(slice).trimEnd();
        bound[name] = expand(processed);
      } else {
        // ⚠ Cut at the LAST POSITIONAL's end, not at end-of-source.
        // Option tokens were already bound and skipped in Phase 3, but
        // they are still present in the raw source — so slicing to the
        // end swallows them into the text. `press post Some headline
        // --as /compact/press` bound the publisher correctly AND
        // published a headline reading "Some headline --as
        // /compact/press". (The boundary-preposition branch above always
        // cut at a token end and never had this.)
        //
        // Found by driving the verb in a browser: every controller suite
        // constructs a bound model directly, so nothing exercised the
        // greedy binder against trailing options.
        const startInSource = first.pos - parsed.start;
        const last = positionals[positionals.length - 1]!;
        const endInSource = last.pos + last.raw.length - parsed.start;
        const slice = parsed.source.substring(startInSource, endInSource);
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
          bound[name] = expandDefault(def.default);
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
      bound[name] = expandDefault(def.default);
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

/**
 * The expander for a view's AUTHORED `default:` — always the shell's,
 * whoever the giver is. A giver with no shell environment (an NPC driven
 * by a brain or a dialogue dispatch) keeps its typed text literal (see
 * `makeExpander` — pinned by shell.test), but a default like `"$focus"`
 * is the view author's word, not the giver's: it reached MQL raw as a
 * bare `$` on every forced `sense` before this.
 */
function makeDefaultExpander(giver: Stuff): (text: string) => string {
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
 * One term of a `requires:` declaration — a predicate the bound Stuff
 * must satisfy, paired with the sentence to say when it doesn't.
 */
interface RequirementTerm {
  test: (s: Stuff) => boolean;
  refusal: string;
}

/**
 * The `class:` escape, and the whole of it.
 *
 * ⚠⚠ **This map is closed on purpose.** Composition is the project's
 * answer to "what kind of thing is this", and `requires:` speaks mixins
 * for that reason. The exception is the handful of **top-level Stuff
 * types** where `instanceof` is the sanctioned check — see CLAUDE.md's
 * inter-stuff rules — because they are the type hierarchy itself rather
 * than a capability bolted onto it.
 *
 * Exactly one is in use: `class:Agent`, the "is this a person" gate
 * behind `whisper`, `dm`, `give`, `introduce` and sixteen more. A
 * second entry is a design conversation, not a map edit — the pull
 * toward "just add the class" is the pull that made `plant` refuse with
 * `instanceof Seed`, and the answer there was a mixin.
 *
 * Loaded by **dynamic import at spec-load**, not a top-level import:
 * `Agent` composes command mixins, so importing the class here would
 * close a cycle through this very module. Load-time only, so it costs
 * one import per boot and nothing per dispatch.
 */
const CLASS_REQUIREMENTS: Record<
  string,
  { module: string; export: string; refusal: string }
> = {
  Agent: {
    module: '../../../lib/stuff/Agent',
    export: 'Agent',
    refusal: "{} isn't a person",
  },
};

/**
 * Parse a `requires:` declaration into its AND-terms.
 *
 * The grammar is two characters wide: **the list is AND, `|` inside an
 * entry is OR.** `[VisibleMixin, ContainableMixin]` means both;
 * `CombustibleMixin|FurnaceMixin` means either. `'any'` parses to no
 * terms at all, which is how "deliberately unconstrained" ends up
 * costing nothing at dispatch.
 *
 * ⚠ Throws on a name that isn't in the {@link Mixins} registry. That
 * throw is the point of the whole mechanism — it is what makes a
 * declaration *checkable* where the `targetKind: 'any'` marker it
 * replaced was only an assertion. It fires at spec-load, so a typo is a
 * boot failure and a lint failure, never a validator that silently
 * never fires.
 *
 * An alternation reports its FIRST member's phrase: the alternation
 * exists because the members are the same idea from two directions
 * (`ignite` takes a Combustible or a Furnace; "won't burn" is true of
 * failing both), so listing every branch's sentence would be worse copy,
 * not more information.
 *
 * One entry may instead be `class:<Name>` — see
 * {@link CLASS_REQUIREMENTS}, which is closed and has one member.
 */
async function parseRequirement(
  requires: MixinRequirement,
  where: string,
): Promise<RequirementTerm[]> {
  if (requires === 'any') return [];
  const entries = Array.isArray(requires) ? requires : [requires];
  const known = new Set<string>(Object.values(Mixins));
  const terms: RequirementTerm[] = [];
  for (const entry of entries) {
    const names = String(entry)
      .split('|')
      .map((n) => n.trim())
      .filter((n) => n.length > 0);
    if (names.length === 0) {
      throw new Error(`${where}: empty \`requires\` entry`);
    }

    if (names.length === 1 && names[0]!.startsWith('class:')) {
      const className = names[0]!.slice('class:'.length);
      const spec = CLASS_REQUIREMENTS[className];
      if (!spec) {
        throw new Error(
          `${where}: \`requires: class:${className}\` — not one of the ` +
            `sanctioned top-level types (${Object.keys(CLASS_REQUIREMENTS).join(', ')}). ` +
            `A capability wants a mixin, not a class.`,
        );
      }
      const mod = (await import(spec.module)) as Record<string, unknown>;
      const ctor = mod[spec.export] as (new (...a: never[]) => object) | undefined;
      if (typeof ctor !== 'function') {
        throw new Error(
          `${where}: \`class:${className}\` resolved to no export ` +
            `\`${spec.export}\` in ${spec.module}`,
        );
      }
      terms.push({
        test: (s) => s instanceof ctor,
        refusal: spec.refusal,
      });
      continue;
    }

    for (const name of names) {
      if (!known.has(name)) {
        throw new Error(
          `${where}: \`requires: ${name}\` is not a mixin — ` +
            `no such entry in the Mixins registry (lib/mixin.ts)`,
        );
      }
    }
    const mixinNames = names as MixinName[];
    const first = mixinNames[0]!;
    terms.push({
      test: (s) => mixinNames.some((n) => MixinApi.hasMixin(s, n)),
      // The fallback is deliberately usable rather than a placeholder:
      // a mixin with no authored phrase is worse copy, not a broken
      // verb. `lint:arg-kinds` reports the gap.
      refusal: MixinRefusals[first] ?? `{} isn't the right kind of thing`,
    });
  }
  return terms;
}

/**
 * Build the field validator a `requires:` declaration stands for.
 *
 * Returns `null` for `'any'` — nothing to check, and no function to
 * call on every bind.
 *
 * ⚠ **The door rule is the framework's, not each validator's.** Single
 * bindings go through `MqlApi.effectiveTarget`, whose direct-first /
 * door-second walk is what makes `open north` work as well as
 * `open oak`. That used to be copy-pasted into the six validators whose
 * authors happened to remember it; declaring the kind gets it
 * everywhere, including the twenty-odd slots that silently didn't have
 * it.
 *
 * ⚠ Absent bindings pass. An optional positional that didn't bind, or
 * an operand the player hasn't chosen yet, is not a wrong kind — the
 * affordance resolver reads that distinction to report
 * `pending-operand` rather than flatly refusing a two-operand verb on
 * every object in the world.
 */
async function requirementValidator(
  requires: MixinRequirement,
  where: string,
): Promise<FieldValidator | null> {
  const terms = await parseRequirement(requires, where);
  if (terms.length === 0) return null;

  const fails = (s: Stuff, term: RequirementTerm): boolean => !term.test(s);

  return (value, field) => {
    if (value === undefined || value === null) return undefined;

    // ⚠⚠ SINGULAR ONLY. `MqlOneResult` and `MqlManyResult` both carry a
    // `stuff` key — the plural one holds an ARRAY — so the key's
    // presence does not tell them apart, and `Array.isArray` is the
    // whole discriminator. Without it every `type: objects` field hands
    // an array to `effectiveTarget`, whose predicate answers a
    // well-formed `false` for it; the refusal path then calls
    // `getPresentation()` on the array and throws. Measured: `get`,
    // `drop` and every other plural verb, on an EMPTY result too, since
    // `[]` is truthy. Nothing in the shipped controller tests would have
    // caught it — they bind their own models and skip the binder.
    //
    // `effectiveTarget` wants a type guard, and composition is not a
    // TS-narrowable fact, so the guard asserts only `object` — the
    // check itself is the `test` inside it.
    const one = value as MqlOneResult;
    if (
      one &&
      typeof one === 'object' &&
      'stuff' in one &&
      one.stuff &&
      !Array.isArray(one.stuff)
    ) {
      for (const term of terms) {
        const found = MqlApi.effectiveTarget(
          one,
          (s): s is Stuff & object => !fails(s, term),
        );
        if (!found) {
          return term.refusal.replace('{}', one.stuff.getPresentation());
        }
      }
      return undefined;
    }

    const stuffs = MqlApi.extractStuffs(value);
    if (stuffs === null) return `${field} must be an object`;
    for (const stuff of stuffs) {
      for (const term of terms) {
        if (fails(stuff as Stuff, term)) {
          return term.refusal.replace('{}', stuff.getPresentation());
        }
      }
    }
    return undefined;
  };
}

/**
 * Walk every `validators: [...]` block on a CommandDefinition and
 * resolve each spec into a live function via
 * `CommandApi.resolveValidator`. Stores the result on
 * `_resolvedValidators`. Idempotent — calling twice just re-resolves
 * (the JS module cache makes the second pass cheap).
 *
 * ⭐ Also the home of `requires:` synthesis. A declared kind becomes a
 * validator here and is **prepended** to the slot's chain, so the rest
 * of the engine — dispatch, the affordance resolver, the preload phase
 * — needs to know nothing about the declaration. It sees a validator,
 * which it already knows how to run. Prepended rather than appended
 * because "that isn't the kind of thing you can do this to" is the
 * cheapest and most informative refusal a slot has: a relational check
 * reporting "you can't reach it" about a rock you were never going to
 * seal is a worse sentence, arrived at more expensively.
 */
async function resolveCommandValidators(
  cmd: CommandDefinition
): Promise<void> {
  const yamlPath = cmd.filePath;
  const resolveOne = async (
    target: {
      validators?: string[];
      requires?: MixinRequirement;
      _resolvedValidators?: FieldValidator[];
      _requirementTerms?: RequirementTerm[];
    },
    where: string,
  ): Promise<void> => {
    const fns: FieldValidator[] = [];
    if (target.requires !== undefined) {
      // The parsed terms ride the def as well: the scope scan filters
      // candidates by them BEFORE binding (below), so a `$focus` match
      // that can never satisfy `requires:` — the room "Dave's Bar" for
      // `talk dave` — falls through to the next scope instead of
      // shadowing the barkeep. The validator stays as the post-bind
      // check for a field bound by structured input.
      target._requirementTerms = await parseRequirement(target.requires, where);
      const synthesized = await requirementValidator(target.requires, where);
      if (synthesized) fns.push(synthesized);
    }
    for (const spec of target.validators ?? []) {
      fns.push(await CommandApi.resolveValidator(spec, yamlPath));
    }
    if (fns.length > 0) target._resolvedValidators = fns;
  };

  for (const a of cmd.args) await resolveOne(a, `${yamlPath} arg \`${a.name}\``);
  for (const [subName, sub] of Object.entries(cmd.subcommands)) {
    for (const a of sub.args ?? []) {
      await resolveOne(a, `${yamlPath} ${subName} arg \`${a.name}\``);
    }
    for (const [optName, opt] of Object.entries(sub.options ?? {})) {
      await resolveOne(opt, `${yamlPath} ${subName} option \`--${optName}\``);
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
  for (const [optName, opt] of Object.entries(cmd.verbOptions)) {
    await resolveOne(opt, `${yamlPath} option \`--${optName}\``);
  }
  for (const [fieldName, opt] of Object.entries(cmd.payload)) {
    await resolveOne(opt, `${yamlPath} payload \`${fieldName}\``);
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

/**
 * Every container in `s`'s ancestor chain, innermost first, capped.
 *
 * The cap is a cycle/pathology backstop, not a design limit — containment
 * is a tree, but a corrupted graph must not hang the command layer.
 */
const CONTAINMENT_WALK_CAP = 16;

function ancestorsOf(s: Stuff): Stuff[] {
  const out: Stuff[] = [];
  let cursor: Stuff | null = MixinApi.isContainable(s)
    ? (s as Stuff & Containable).getContainer()
    : null;
  let depth = CONTAINMENT_WALK_CAP;
  while (cursor !== null && depth-- > 0) {
    out.push(cursor);
    cursor = MixinApi.isContainable(cursor)
      ? (cursor as Stuff & Containable).getContainer()
      : null;
  }
  return out;
}

/** `s` plus everything nested inside it, at any depth, capped. */
function selfAndDescendants(s: Stuff, depth = CONTAINMENT_WALK_CAP): Stuff[] {
  const out: Stuff[] = [s];
  if (depth <= 0 || !MixinApi.isContainer(s)) return out;
  for (const child of (s as Stuff & Container).getContents()) {
    out.push(...selfAndDescendants(child, depth - 1));
  }
  return out;
}

/**
 * The rooms whose occupants count as `s`'s peers: its own container, plus
 * every room one exit away.
 *
 * Adjacency is one hop and **passable exits only** — a closed door is a
 * closed door, and a verb that lit up through it would be claiming a
 * reach the world does not have. Cross-room verb affordance is a
 * deliberately small extension: it says "you can see who is next door
 * well enough to address them", not that distance has stopped existing.
 */
function peerScopesOf(container: Stuff): Stuff[] {
  const out: Stuff[] = [container];
  if (!MixinApi.isExitable(container)) return out;
  for (const exit of container.getExits().values()) {
    // A closed door is a closed door, and so is a blocked exit — a verb
    // lighting up through one would claim a reach the world does not
    // have. The DOOR is a separate object hanging off the exit, not the
    // exit itself; asking `isSealable(exit)` looked right and would
    // never have fired.
    if (exit.isBlocked()) continue;
    const door = exit.getDoor();
    if (door !== null && !door.isOpen()) continue;
    // ⚠ `getDestination()` THROWS when the target zone is not faulted
    // in yet. Redistributing affordances must never force world-loading
    // — a containment delta is a hot path and an unloaded room simply is
    // not an adjacent peer scope until something else pulls it in.
    let dest: Stuff | null = null;
    try {
      dest = exit.getDestination();
    } catch {
      continue;
    }
    if (dest !== null && !out.includes(dest)) out.push(dest);
  }
  return out;
}

/**
 * Redistribute command affordances after `item` moved from `from` to `to`.
 *
 * **The buckets name WHO RECEIVES, from the declaring object's point of
 * view**, and they are directional:
 *
 * | Bucket | Receiver |
 * |---|---|
 * | `self` | the object itself |
 * | `inventory` | everything nested **inside** it, at any depth |
 * | `environment` | its container **chain**, outward, at any depth |
 * | `peers` | its siblings, and one passable exit away |
 *
 * ⚠ **`inventory` and `environment` are RECURSIVE, and that is the
 * point.** Verb availability used to be direct-containment-scoped while
 * MQL targeting is arbitrarily-nested — so a rock inside a bag inside
 * your pack could be *named* by a command whose verb the rock had never
 * lit up. It worked anyway, by accident, because the bag was also
 * Tangible and afforded the same verb itself. The moment a verb came
 * from a rarer mixin the accident would have stopped covering for it.
 * Reach now matches what the parser can address.
 */
function applyContainmentDeltaImpl(
  item: Stuff,
  from: (Stuff & Container) | null,
  to: (Stuff & Container) | null
): void {
  const moved = selfAndDescendants(item);

  // ── Source side: every stack that carried anything in the moved
  // subtree drops it. Popping by source is idempotent, so popping a
  // source that was never pushed is free.
  if (from) {
    const oldScopes = [from, ...ancestorsOf(from), ...peerScopesOf(from)];
    for (const scope of oldScopes) {
      for (const holder of selfAndDescendants(scope)) {
        if (!MixinApi.isCommandGiver(holder)) continue;
        for (const m of moved) {
          (holder as Stuff & CommandGiver).popCommandSource(m);
        }
      }
    }
    // And the moved subtree drops whatever the old surroundings gave it.
    for (const m of moved) {
      if (!MixinApi.isCommandGiver(m)) continue;
      (m as Stuff & CommandGiver).resetCommandSources('self-moved');
    }
  }

  if (!to) return;

  const ancestors = [to, ...ancestorsOf(to)];

  // ── `environment`: the moved subtree grants OUTWARD, to every
  // container above it. This is what makes a rock in a bag in your pack
  // still hand you `throw`.
  for (const m of moved) {
    const defs = collectBucketDefsForInstance(m, 'environment');
    if (defs.length === 0) continue;
    for (const anc of ancestors) {
      if (!MixinApi.isCommandGiver(anc)) continue;
      (anc as Stuff & CommandGiver).pushCommandSource(m, 'environment', defs);
    }
  }

  // ── `inventory`: every container above grants INWARD, to the whole
  // moved subtree. A pack that affords `rummage` affords it to what it
  // swallowed, however deep.
  for (const anc of ancestors) {
    const defs = collectBucketDefsForInstance(anc, 'inventory');
    if (defs.length === 0) continue;
    for (const m of moved) {
      if (!MixinApi.isCommandGiver(m)) continue;
      (m as Stuff & CommandGiver).pushCommandSource(anc, 'inventory', defs);
    }
  }

  // ── `peers`: sideways, both directions, across the peer scopes.
  //
  // Ungated by CommandGiver on the CONTRIBUTOR side: a job board is not a
  // command giver and still posts its verb to everyone in the room. Only
  // the RECEIVER has to be able to hold a command.
  const scopes = peerScopesOf(to);
  for (const scope of scopes) {
    if (!MixinApi.isContainer(scope)) continue;
    for (const sibling of (scope as Stuff & Container).getContents()) {
      if (moved.includes(sibling)) continue;

      const theirs = collectBucketDefsForInstance(sibling, 'peers');
      if (theirs.length > 0) {
        for (const m of moved) {
          if (!MixinApi.isCommandGiver(m)) continue;
          (m as Stuff & CommandGiver).pushCommandSource(sibling, 'peers', theirs);
        }
      }
      if (!MixinApi.isCommandGiver(sibling)) continue;
      for (const m of moved) {
        const mine = collectBucketDefsForInstance(m, 'peers');
        if (mine.length === 0) continue;
        (sibling as Stuff & CommandGiver).pushCommandSource(m, 'peers', mine);
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
    // A shadow rides its host, so it distributes exactly as the host
    // would: outward along the container chain, inward to the host's
    // contents, sideways to peers. Same directional model as the
    // containment path — a shadow must not have a different reach from
    // the thing it is shadowing.
    const envDefs = collectBucketDefs(shadow.constructor, 'environment');
    for (const anc of ancestorsOf(host)) {
      if (!MixinApi.isCommandGiver(anc)) continue;
      push(anc as Stuff & CommandGiver, 'environment', envDefs);
    }

    const invDefs = collectBucketDefs(shadow.constructor, 'inventory');
    if (invDefs.length > 0 && MixinApi.isContainer(host)) {
      for (const inner of selfAndDescendants(host)) {
        if (inner === host || !MixinApi.isCommandGiver(inner)) continue;
        push(inner as Stuff & CommandGiver, 'inventory', invDefs);
      }
    }

    if (!MixinApi.isContainable(host)) return;
    const container = (host as Stuff & Containable).getContainer();
    if (!container) return;
    const peerDefs = collectBucketDefs(shadow.constructor, 'peers');
    if (peerDefs.length === 0) return;
    for (const scope of peerScopesOf(container)) {
      if (!MixinApi.isContainer(scope)) continue;
      for (const sibling of (scope as Stuff & Container).getContents()) {
        if ((sibling as Stuff) === host) continue;
        if (!MixinApi.isCommandGiver(sibling)) continue;
        push(sibling as Stuff & CommandGiver, 'peers', peerDefs);
      }
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

/**
 * The compiled `cmd/command.schema.json` validator, loaded lazily so the
 * cost lands on the first spec parsed rather than at module import.
 *
 * `allErrors: true` — unlike the per-field struct validator above, this
 * one reports the whole trail, because its audience is an author who
 * just mistyped a command spec and wants every complaint at once.
 *
 * It lives here rather than in `CommandDefinition` because `ajv` sits
 * outside `src/mud/` (docs/architecture.md § The import boundary); the
 * value object calls `CommandApi.validateCommandView` instead.
 */
let _specValidate: ValidateFunction | null = null;

function commandSpecValidator(): ValidateFunction {
  if (_specValidate) return _specValidate;
  const schema = SourceTreeApi.readJsonResource<object>(
    import.meta.url,
    '../../../lib/command/command.schema.json',
  );
  _specValidate = new Ajv({ allErrors: true, strict: false }).compile(schema);
  return _specValidate;
}
