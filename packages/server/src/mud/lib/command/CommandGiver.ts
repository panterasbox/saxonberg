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
import type { Location } from '../stuff/Location';
import type { Containable } from '../spatial/Containable';
import type { Parser } from '../../api/command';
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
  type CommandModel,
  type CommandResult,
  type ExecuteCommandOpts,
} from '../../api/command';
import { MixinApi } from '../../api/mixin';
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
    opts?: ExecuteCommandOpts
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
 * Mixin that adds command execution and a per-giver recency stack.
 */
export function CommandGiverMixin<TBase extends MixinConstructor<Stuff>>(Base: TBase) {
  class CommandGiverMixin extends Base {
    static _mixinName = 'CommandGiverMixin';

    /**
     * Shell-level settings the command pipeline consumes.
     *
     * `shell.parser` selects which parser turns input text into a
     * `ParseResult`. Today the only registered parser is `'msh'`, the
     * Mud SHell tokenizer-driven parser; declared as an enum so the
     * future LLM-backed parser can be added by appending to
     * `enumValues`.
     */
    static settings: SettingsSchemaEntry[] = [
      {
        key: 'shell.parser',
        type: SettingTypes.Enum,
        default: 'msh',
        enumValues: ['msh'],
        description:
          'Parser used to turn raw input into commands. ' +
          '`msh` is the default tokenizer-driven shell.',
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
      const defs = CommandApi.collectSelfDefs(this.constructor);
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
      const defs = CommandApi.collectSelfDefs(this.constructor);
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
      opts: ExecuteCommandOpts = {}
    ): Promise<CommandResult> {
      ExecutionContextApi.tagCurrentFrame(FrameKind.Command);

      // Derive the dispatch context. `verb` and `command` are
      // placeholders here — they get overwritten when the
      // parser/matcher binds; controllers always see the populated
      // form.
      const giver = this as unknown as Stuff & CommandGiver;
      const location = MixinApi.isContainable(giver)
        ? ((giver as Stuff & Containable).getContainer() as Location | null)
        : null;
      if (!location) {
        return {
          success: false,
          summary: 'No location for command',
        };
      }
      const context: CommandContext = {
        commandGiver: giver,
        location,
        commandText,
        executionId: nanoid(),
        commandId: nanoid(),
        verb: '',
        command: undefined as unknown as CommandDefinition,
      };
      if (opts.interactive !== undefined) context.interactive = opts.interactive;
      ExecutionContextApi.updateCurrentFrameMetadata({
        commandContext: context,
        causingCommandId: context.commandId,
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
      const giverAsStuff = context.commandGiver as unknown as Stuff;
      if (MixinApi.isSensor(giverAsStuff)) {
        const tail =
          result.summary !== undefined && result.summary !== ''
            ? result.summary
            : result.success
              ? 'ok'
              : 'failed';
        const level: LogLevel = result.success ? 'info' : 'warn';
        MudlogApi[level]('command', Mml.compose`${verb}: ${tail}`, {
          to: giverAsStuff as Stuff & Sensor,
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
