/**
 * CommandGiverMixin — chain-of-responsibility command dispatch with a
 * recency-stack of contributing sources.
 *
 * Each giver maintains an ordered `RecencyEntry[]` (chronological,
 * earliest-pushed first; `'self'` is at index 0 and never removed).
 * Dispatch walks the stack reverse — newest source first — collects
 * every `CommandDefinition`, filters by verb, and tries each match in
 * order. A controller can return `pass: true` to defer to the next
 * match (e.g. a Throne's `sit` falling through to Avatar's intrinsic
 * `sit`).
 *
 * **Sealed mutation surface.** `pushCommandSource`,
 * `popCommandSource`, and `resetCommandSources` are `@Final` and
 * `@Unshadowable` — only the call-security gate can reach them. The
 * orchestration lives in `ContainmentApi.move`, which fires the right
 * push/pop combo after every container change. A buff or polymorph
 * shadow CANNOT corrupt the recency stack by intercepting these
 * methods.
 *
 * `onConnectionAttached` is intentionally NOT sealed: the worst case
 * if a subclass overrides without `super` is a missed initial reset,
 * which is recoverable when the next move triggers a delta.
 *
 * Schema-delivery emits to the client (system.commands.{added,
 * removed, reset}) gate on `_commandSchemaSubscribed`, which flips
 * once `onConnectionAttached` fires — pushes that happen during
 * hydration don't generate spurious frames to a not-yet-listening
 * client.
 */

import type { MixinConstructor } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import type { Containable } from '../spatial/Containable';
import type { Parser } from '../../api/parser';
import {
  resolveSetting,
  SettingTypes,
  type SettingsSchemaEntry,
} from '../shell/Environment';
import { nanoid } from 'nanoid';
import { CommandLineApi } from '../../api/command-line';
import {
  CommandApi,
  type CommandContext,
  type CommandContextInput,
  type CommandModel,
  type CommandResult,
} from '../../api/command';
import { MixinApi } from '../../api/mixin';
import { ContainmentApi } from '../../api/containment';
import { StuffApi } from '../../api/stuff';
import type { CommandController } from './CommandController';
import { CommandDefinition } from './CommandDefinition';
import type { CommandContributions } from '../../api/command';
import type { CommandSchemaPayload } from '../../api/command';
import { Final, Unshadowable } from '../security/decorators';
import { ExecutionContextApi, FrameKind } from '../../api/execution-context';
import { MudlogApi } from '../../api/mudlog';
import { Mml } from '../../api/mml';
import type { Sensor } from '../message/Sensor';
import type { Interactive } from '../../obj/Interactive';
import type { LogLevel } from '@saxonberg/types';

type ContributionsHolder = { commandContributions?: CommandContributions };

/** Extract the `commandContributions` static off any class-like value, if present. */
const getContributions = (cls: unknown): CommandContributions | undefined =>
  (cls as ContributionsHolder).commandContributions;

/** Bucket of a recency-stack entry — categorical metadata, not ordering. */
export type RecencyBucket = 'self' | 'inventory' | 'environment' | 'peers';

/** Source-key shape — `'self'` for the giver itself, otherwise a Stuff. */
export type RecencySource = Stuff | 'self';

/** One entry on the recency stack. */
export interface RecencyEntry {
  source: RecencySource;
  bucket: RecencyBucket;
  commands: CommandDefinition[];
  /** Monotonic sequence number — debug-aid, stable order tiebreaker. */
  seq: number;
}

/**
 * Public shape provided by CommandGiverMixin.
 */
export interface CommandGiver {
  getAvailableCommands(): CommandDefinition[];
  executeCommand(
    commandText: string,
    input: CommandContextInput
  ): Promise<CommandResult>;
  pushCommandSource(
    source: RecencySource,
    bucket: RecencyBucket,
    defs: CommandDefinition[]
  ): void;
  popCommandSource(source: RecencySource): void;
  resetCommandSources(reason: 'self-moved'): void;
}

/**
 * Resolve a list of YAML filenames to CommandDefinitions, deduped by
 * filename.
 */
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
 * Build the 'self' contributions from a class chain, most-derived
 * first. The concrete class's `commandProvider` beats its mixins; a
 * mixin further down the prototype chain (closer to Object) loses to
 * one further up.
 *
 * @internal — exposed for ContainmentApi orchestration.
 */
export function collectSelfDefs(
  ctor: unknown
): CommandDefinition[] {
  const filenames: string[] = [];
  // Concrete class first (most-derived).
  const ownProvider = getContributions(ctor);
  if (ownProvider?.self) filenames.push(...ownProvider.self);
  // Mixins, prototype-chain order. queryMixins walks bottom-up
  // (most-derived first) — perfect.
  const mixins = MixinApi.queryMixins(
    ctor as { prototype: unknown } & ((...args: unknown[]) => unknown)
  );
  for (const mixin of mixins) {
    const p = getContributions(mixin);
    if (p?.self) filenames.push(...p.self);
  }
  return resolveDefs(filenames);
}

/**
 * For a thing being placed into a giver's inventory, the defs the
 * thing contributes via `commandProvider.inventory`.
 */
export function collectInventoryDefs(item: Stuff): CommandDefinition[] {
  const filenames: string[] = [];
  const ownProvider = getContributions(item.constructor);
  if (ownProvider?.inventory) filenames.push(...ownProvider.inventory);
  for (const mixin of MixinApi.queryMixins(item.constructor as never)) {
    const p = getContributions(mixin);
    if (p?.inventory) filenames.push(...p.inventory);
  }
  return resolveDefs(filenames);
}

/**
 * For a thing entering a giver's environment, the defs it contributes
 * via `commandProvider.environment`.
 */
export function collectEnvironmentDefs(item: Stuff): CommandDefinition[] {
  const filenames: string[] = [];
  const ownProvider = getContributions(item.constructor);
  if (ownProvider?.environment) filenames.push(...ownProvider.environment);
  for (const mixin of MixinApi.queryMixins(item.constructor as never)) {
    const p = getContributions(mixin);
    if (p?.environment) filenames.push(...p.environment);
  }
  return resolveDefs(filenames);
}

/**
 * For a CommandGiver peer entering a giver's environment, the defs it
 * contributes via `commandContributions.peers`.
 */
export function collectPeersDefs(item: Stuff): CommandDefinition[] {
  const filenames: string[] = [];
  const ownProvider = getContributions(item.constructor);
  if (ownProvider?.peers) filenames.push(...ownProvider.peers);
  for (const mixin of MixinApi.queryMixins(item.constructor as never)) {
    const p = getContributions(mixin);
    if (p?.peers) filenames.push(...p.peers);
  }
  return resolveDefs(filenames);
}

/**
 * Resolve the parser the actor's shell is configured to use. Reads
 * the `shell.parser` setting via the standard cross-host helper —
 * if the actor's host doesn't compose EnvironmentMixin, the default
 * `'msh'` falls through.
 *
 * @internal
 */
async function resolveActorParser(actor: Stuff): Promise<Parser> {
  const spec = resolveSetting<string>(actor, 'shell.parser') ?? 'msh';
  return CommandApi.resolveParser(spec);
}

/**
 * Apply a shadow attach/detach to the recency stacks of every giver
 * the host's contributions reach. Mirrors `ContainmentApi`'s
 * orchestration: a shadow with `self` adds to the host; with
 * `inventory` adds to the host's container if it's a CommandGiver;
 * with `environment`/`peers` adds to each CommandGiver sibling in
 * the host's container.
 *
 * @internal — called from `ShadowApi.attach` and `ShadowApi.detach`.
 */
export function applyShadowDelta(
  host: Stuff,
  shadow: Stuff,
  op: 'attach' | 'detach'
): void {
  const push = (
    cg: Stuff & CommandGiver,
    bucket: RecencyBucket,
    defs: CommandDefinition[]
  ): void => {
    if (defs.length === 0) return;
    cg.pushCommandSource(shadow, bucket, defs);
  };

  if (op === 'attach') {
    // self bucket → push to host itself if it's a CG.
    if (MixinApi.isCommandGiver(host)) {
      push(
        host as Stuff & CommandGiver,
        'self',
        collectSelfDefs(shadow.constructor)
      );
    }

    // inventory/environment/peers reach OTHER givers via the host's
    // container. Host needs to be Containable to find them.
    if (!MixinApi.isContainable(host)) return;
    const container = (host as Stuff & Containable).getContainer();
    if (!container) return;

    // inventory: if the container holding host is a CG, the shadow's
    // inventory contributions land on the holder.
    if (MixinApi.isCommandGiver(container)) {
      push(
        container as Stuff & CommandGiver,
        'inventory',
        collectInventoryDefs(shadow)
      );
    }

    // environment + peers: walk the host's siblings.
    const envDefs = collectEnvironmentDefs(shadow);
    const peerDefs = MixinApi.isCommandGiver(host)
      ? collectPeersDefs(shadow)
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

  // detach: pop the shadow from every reachable giver. popCommandSource
  // is idempotent on missing source, so fan-out without feasibility
  // checks is safe.
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

/**
 * Mixin that adds command execution and a per-giver recency stack.
 */
export function CommandGiverMixin<TBase extends MixinConstructor<Stuff>>(Base: TBase) {
  class CommandGiverMixin extends Base {
    static _mixinName = 'CommandGiverMixin';

    /**
     * Shell-level settings the command pipeline consumes.
     *
     * `shell.parser` selects which parser turns input text into a
     * `ParseResult` (see `mud/api/parser.ts`). Bare names resolve
     * to `<src>/mud/lib/parsers/<name>.ts`; absolute paths resolve
     * to `<src>/mud/<rest>.ts`. The default `'msh'` is the Mud SHell
     * tokenizer-driven parser.
     */
    static settings: SettingsSchemaEntry[] = [
      {
        key: 'shell.parser',
        type: SettingTypes.String,
        default: 'msh',
        description:
          'Parser used to turn raw input into commands. Bare name ' +
          '(e.g. `msh`) resolves to `/lib/parsers/<name>`; absolute ' +
          'path (`/X`) resolves to `<src>/mud/X.ts`.',
      },
    ];

    /**
     * Recency stack — chronological. Index 0 is `'self'`. Idempotency
     * is by (source, bucket); a single source can land multiple
     * entries when its class declares contributions to several
     * buckets (e.g. a Visible thing both `environment` and `peers`).
     * Pop-by-source removes EVERY entry sourced from that source.
     *
     * TypeScript `private` (not `#`-private): instance methods are
     * dispatched through the call-security Proxy via
     * `method.apply(proxy, args)`, and `#`-private slots aren't
     * reachable through a proxy receiver. The sealed-surface
     * guarantee (push/pop/reset only) comes from
     * `@Final @Unshadowable`, not field privacy.
     */
    private _commandStack: RecencyEntry[] = [];

    /** Monotonic sequence allocator for stack entries. */
    private _commandSeq = 0;

    /**
     * Set after the first connection attaches; gates schema-delta
     * emission so hydration-time pushes don't fire spurious frames
     * to a not-yet-listening client.
     */
    private _commandSchemaSubscribed = false;

    /**
     * Build the `'self'` entry once, at registration. Walks the class
     * chain (concrete first, then mixins prototype-bottom-up) and
     * dedupes by YAML filename so a mixin and its consumer can't
     * double-contribute the same command.
     */
    public async postRegister(_context?: unknown): Promise<void> {
      // Chain super in case the host composes PostRegistrationMixin
      // (which is a no-op default but custom subclasses may override).
      const sup = (Base.prototype as { postRegister?: (c?: unknown) => unknown })
        .postRegister;
      if (typeof sup === 'function') {
        await sup.call(this, _context);
      }
      const defs = collectSelfDefs(this.constructor);
      this.pushCommandSource('self', 'self', defs);
    }

    /**
     * Walk the recency stack newest-first and concatenate every
     * source's `CommandDefinition`s. The dispatch chain decides; we
     * don't dedup. Most-recent first is what makes "I just walked
     * into the room" override "the throne in here".
     *
     * Lazily seeds the `'self'` entry on first read so callers that
     * skip `postRegister` (test helpers like `makeStuff`, ad-hoc
     * scripts) still see the giver's own contributions. Production
     * code goes through `postRegister`; this branch is the safety net.
     */
    getAvailableCommands(): CommandDefinition[] {
      this._ensureSelfEntry();
      const out: CommandDefinition[] = [];
      for (let i = this._commandStack.length - 1; i >= 0; i--) {
        out.push(...this._commandStack[i]!.commands);
      }
      return out;
    }

    /**
     * Idempotent self-entry seed. Public so ContainmentApi
     * orchestration can guarantee the entry exists before calling
     * push for inventory/environment changes; tests use it
     * indirectly via getAvailableCommands.
     *
     * @internal
     */
    _ensureSelfEntry(): void {
      const exists = this._commandStack.some(
        (e) => e.source === 'self' && e.bucket === 'self'
      );
      if (exists) return;
      const defs = collectSelfDefs(this.constructor);
      this.pushCommandSource('self', 'self', defs);
    }

    /**
     * Append a new source to the stack. No-op (with warning) if the
     * source is already present — guards the orchestration against
     * double-fires under hot-reload or buggy callers.
     */
    @Final
    @Unshadowable
    pushCommandSource(
      source: RecencySource,
      bucket: RecencyBucket,
      defs: CommandDefinition[]
    ): void {
      // Idempotent on (source, bucket). Same-source DIFFERENT bucket
      // is allowed — a contributor with both `environment` and
      // `peers` buckets lands two entries, one per bucket.
      const exists = this._commandStack.some(
        (e) => e.source === source && e.bucket === bucket
      );
      if (exists) return;

      const entry: RecencyEntry = {
        source,
        bucket,
        commands: defs,
        seq: this._commandSeq++,
      };
      this._commandStack.push(entry);

      // Schema-delta emission. Gated so hydration-time pushes don't
      // fire to a not-yet-connected client.
      if (this._commandSchemaSubscribed) {
        for (const def of defs) {
          CommandApi.emitSchemaDelta(
            this as unknown as Stuff,
            'added',
            CommandApi.getCommandSchemaPayload(def)
          );
        }
      }
    }

    /**
     * Remove the entry for `source`. No-op if absent.
     */
    @Final
    @Unshadowable
    popCommandSource(source: RecencySource): void {
      // Remove every entry sourced from `source`, across all
      // buckets. A source contributing to multiple buckets has
      // multiple entries; one detach call clears them all.
      const removed: CommandDefinition[] = [];
      this._commandStack = this._commandStack.filter((e) => {
        if (e.source === source) {
          removed.push(...e.commands);
          return false;
        }
        return true;
      });

      if (removed.length > 0 && this._commandSchemaSubscribed) {
        for (const def of removed) {
          CommandApi.emitSchemaDelta(this as unknown as Stuff, 'removed', {
            verb: def.getPrimaryVerb(),
          });
        }
      }
    }

    /**
     * Drop every entry whose bucket is `'environment'` or `'peers'`.
     * Used during a self-move; ContainmentApi follows up with the
     * appropriate `pushCommandSource` calls for the new environment.
     */
    @Final
    @Unshadowable
    resetCommandSources(reason: 'self-moved'): void {
      void reason;
      const removed: CommandDefinition[] = [];
      const kept: RecencyEntry[] = [];
      for (const e of this._commandStack) {
        if (e.bucket === 'environment' || e.bucket === 'peers') {
          removed.push(...e.commands);
          continue;
        }
        kept.push(e);
      }
      this._commandStack = kept;

      if (this._commandSchemaSubscribed) {
        for (const def of removed) {
          CommandApi.emitSchemaDelta(this as unknown as Stuff, 'removed', {
            verb: def.getPrimaryVerb(),
          });
        }
      }
    }

    /**
     * Mark the schema-subscription gate open. The first connection
     * attach is when client-side schema delivery becomes meaningful —
     * earlier pushes are pre-subscription bookkeeping.
     */
    onConnectionAttached(_conn: Interactive): void {
      if (this._commandSchemaSubscribed) return;
      this._commandSchemaSubscribed = true;
      // Emit a single `system.commands.reset` carrying the full set
      // — the client uses this as its baseline schema view.
      this._ensureSelfEntry();
      const payloads: CommandSchemaPayload[] = [];
      const seenVerbs = new Set<string>();
      for (let i = this._commandStack.length - 1; i >= 0; i--) {
        for (const def of this._commandStack[i]!.commands) {
          const v = def.getPrimaryVerb();
          if (seenVerbs.has(v)) continue;
          seenVerbs.add(v);
          payloads.push(CommandApi.getCommandSchemaPayload(def));
        }
      }
      CommandApi.emitSchemaDelta(this as unknown as Stuff, 'reset', payloads);
    }

    /**
     * Whether the host has subscribed to schema deltas. Read by step-6
     * emission helpers; tests use it to assert hydration silence.
     *
     * @internal
     */
    _isSchemaSubscribed(): boolean {
      return this._commandSchemaSubscribed;
    }

    async executeCommand(
      commandText: string,
      input: CommandContextInput
    ): Promise<CommandResult> {
      ExecutionContextApi.tagCurrentFrame(FrameKind.Command);

      const commandId = nanoid();
      // Promote the input shape to a full CommandContext. `verb` and
      // `command` are placeholders here — they get overwritten when
      // the parser/matcher binds; controllers always see the
      // populated form.
      const context = input as CommandContextInput as CommandContext;
      context.commandId = commandId;
      context.verb = '';
      ExecutionContextApi.updateCurrentFrameMetadata({
        commandContext: context,
        causingCommandId: commandId,
      });

      let verb = '';
      let result: CommandResult;
      try {
        const parser = await resolveActorParser(context.commandGiver);
        const parserCtx = {
          commandGiver: context.commandGiver,
          location: context.location,
          available: this.getAvailableCommands(),
        };
        const parseResult = await parser.parse(commandText, parserCtx);

        if (parseResult.error !== undefined) {
          result = { success: false, summary: parseResult.error };
        } else if (parseResult.parsed) {
          verb = parseResult.parsed.verb;
          result = await this._runChain(parseResult.parsed, context);
        } else if (parseResult.bound) {
          // Parser already chose the command and built the model;
          // skip parse + match. Run resolve + execute only.
          context.command = parseResult.bound.command;
          context.verb = parseResult.bound.command.getPrimaryVerb();
          verb = context.verb;
          const validated = CommandApi.resolveAndValidate(
            parseResult.bound.model,
            context
          );
          if ('result' in validated) {
            result = validated.result;
          } else {
            result = await this._executeOne(
              parseResult.bound.command,
              validated.resolved,
              context
            );
          }
        } else {
          result = { success: false, summary: 'Parser returned no result' };
        }
      } catch (error: unknown) {
        result = {
          success: false,
          summary:
            error instanceof Error
              ? error.message
              : 'Command execution failed',
        };
      }

      // Auto-emit MudlogApi command-outcome entry. Recipient defaults
      // to the giver — only if it's a Sensor.
      const giver = context.commandGiver as unknown as Stuff;
      if (MixinApi.isSensor(giver)) {
        const tail =
          result.summary !== undefined && result.summary !== ''
            ? result.summary
            : result.success
              ? 'ok'
              : 'failed';
        const level: LogLevel = result.success ? 'info' : 'warn';
        MudlogApi[level]('command', Mml.compose`${verb}: ${tail}`, {
          to: giver as Stuff & Sensor,
          payload: {
            verb,
            success: result.success,
            commandText,
            executionId: context.executionId,
          },
        });
      }

      return result;
    }

    /**
     * Walk the verb's match list in recency order. Shape errors fall
     * through, bind/resolve errors stop, controller `pass: true`
     * cascades. Final unmatched returns "No handler claimed".
     */
    async _runChain(
      parsed: ReturnType<typeof CommandLineApi.parsePipeline>['commands'][0],
      context: CommandContext
    ): Promise<CommandResult> {
      const matches = CommandApi.matchVerbContextual(
        parsed.verb,
        this.getAvailableCommands()
      );
      if (matches.length === 0) {
        return {
          success: false,
          summary: `Unknown command: ${parsed.verb}`,
        };
      }

      for (const command of matches) {
        const built = CommandApi.assemble(parsed, command, {
          commandGiver: context.commandGiver,
          location: context.location,
        });
        if ('error' in built) {
          if (built.error === 'shape') continue; // fall through
          return { success: false, summary: built.summary }; // bind error stops
        }
        // Populate dispatch identity on the context for resolve /
        // validate / execute. The active subcommand (if any) is
        // already stamped onto `built.model.subcommand` by the
        // matcher.
        context.verb = parsed.verb;
        context.command = command;
        const validated = CommandApi.resolveAndValidate(built.model, context);
        if ('result' in validated) return validated.result;
        const interim = await this._executeOne(
          command,
          validated.resolved,
          context
        );
        if (interim.pass !== true) return interim;
        // pass:true — try next match.
      }
      return {
        success: false,
        summary: `No handler claimed '${parsed.verb}'`,
      };
    }

    /**
     * Clone-per-execution controller dispatch. The clone is destructed
     * in `finally` regardless of outcome.
     */
    async _executeOne(
      command: CommandDefinition,
      model: CommandModel,
      context: CommandContext
    ): Promise<CommandResult> {
      let controller: CommandController | null = null;
      try {
        controller = await StuffApi.clone<CommandController>(
          `/obj/command/${command.controller}`
        );
        return await controller.execute(model, context);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          success: false,
          summary: `Failed to execute command: ${message}`,
        };
      } finally {
        if (controller) StuffApi.destruct(controller);
      }
    }
  }
  return CommandGiverMixin;
}

// Re-export for ContainmentApi orchestration.
export { CommandApi, ContainmentApi };
