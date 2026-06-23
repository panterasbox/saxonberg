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
import type { Parser } from '../../api/command';
import {
  SettingTypes,
  type SettingsSchemaEntry,
} from '../shell/Environment';
import { SecurityApi } from '../../api/security';
import { CommandLineApi } from '../../api/command-line';
import {
  CommandApi,
  type CommandContext,
  type CommandModel,
  type ExecuteCommandOpts,
} from '../../api/command';
import { MessageApi } from '../../api/message';
import { PromptApi, PromptCancelledError } from '../../api/prompt';
import type { EnvelopeTemplate } from '@saxonberg/types';
import { MixinApi } from '../../api/mixin';
import { ShellApi } from '../../api/shell';
import type { Alias } from '../shell/Alias';
import { StuffApi } from '../../api/stuff';
import type { CommandController } from './CommandController';
import { CommandDefinition } from './CommandDefinition';
import type { CommandSchemaPayload } from '../../api/command';
import { Final, Unshadowable } from '../security/decorators';
import { ExecutionContextApi, FrameKind } from '../../api/execution-context';
import { MudlogApi } from '../../api/mudlog';
import { Mml } from '../../api/mml';
import type { Sensor } from '../message/Sensor';
import type Interactive from '../../obj/Interactive';
import type { LogLevel, Note } from '@saxonberg/types';

/**
 * Map a framework-emitted failure note to its player-facing prose,
 * or `null` for notes that don't auto-prose (controller-side
 * failures whose authoring controller fires its own scene with
 * domain-specific wording; data-only notes with no readable detail).
 *
 * Auto-prosed kinds: `command-rejected`, `mql-error`,
 * `validator-failed`, `controller-error` — all emitted by the
 * dispatcher / validator / MQL framework, where no controller has
 * a chance to produce prose.
 *
 * Used by the dispatcher's end-of-execute sweep below: walks the
 * accumulated notes and fires a `system.command.error` scene per
 * prose-bearing note so a player typing a bad command sees WHY
 * without needing client-side envelope rendering. The structured
 * note still rides the envelope for bot/script consumers — the
 * envelope is the machine channel, the scene is the human channel.
 *
 * Lives module-private in CommandGiver because it's presentation
 * logic — prose phrasing belongs near the dispatcher that fires it,
 * not on an Api class. Each note kind below has exactly one call
 * site (the sweep loop in `executeCommand`), so no broader surface
 * is needed.
 */
function proseForFrameworkNote(note: Note): string | null {
  switch (note.kind) {
    case 'command-rejected': {
      // `reason` is enum; pair with `detail` when present.
      const tail = note.detail ? `: ${note.detail}` : '';
      switch (note.reason) {
        case 'unknown-verb':
          return `I don't understand '${note.detail ?? '?'}'.`;
        case 'parse-failed':
          return `Couldn't parse the command${tail}.`;
        case 'bind-failed':
          return `Couldn't bind that command${tail}.`;
        case 'shape-fall-through':
          return `That doesn't match any known command shape${tail}.`;
        case 'missing-subcommand':
          return `Missing subcommand${tail}.`;
        default:
          return `Command rejected${tail}.`;
      }
    }
    case 'mql-error':
      return `Couldn't resolve '${note.field}' (${note.stage}): ${note.detail}`;
    case 'validator-failed':
      // The validator's return string IS the player-facing prose.
      return note.detail;
    case 'controller-error':
      return `Something went wrong in ${note.controller}: ${note.detail}`;
    default:
      return null;
  }
}

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
 * A command paired with the resolved Stuff that affords it and the
 * bucket it flowed from. Unlike `RecencyEntry`, `source` is always a
 * concrete `Stuff`: the `'self'` sentinel is resolved to the giver
 * instance, so a consumer always sees "an object that afforded this."
 * `bucket` is a descriptive hint; nothing is required to branch on it.
 */
export interface Affordance {
  command: CommandDefinition;
  source: Stuff;
  bucket: RecencyBucket;
}

/**
 * Public shape provided by CommandGiverMixin.
 */
export interface CommandGiver {
  getAvailableCommands(): CommandDefinition[];
  getAffordances(): Affordance[];
  executeCommand(
    commandText: string,
    opts?: ExecuteCommandOpts
  ): Promise<void>;
  pushCommandSource(
    source: RecencySource,
    bucket: RecencyBucket,
    defs: CommandDefinition[]
  ): void;
  popCommandSource(source: RecencySource): void;
  resetCommandSources(reason: 'self-moved'): void;
  /**
   * Idempotent self-entry seed. On the interface so command-routing
   * orchestration (the hosted-update delta) can guarantee the `'self'`
   * entry exists before layering other sources on the stack.
   * @internal
   */
  _ensureSelfEntry(): void;
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
  const spec = ShellApi.resolveSetting<string>(actor, 'shell.parser') ?? 'msh';
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
      this._seedHostedUpdateSources();
    }

    /**
     * Walk the recency stack newest-first and pair every command with
     * the resolved Stuff that affords it and its bucket. The `'self'`
     * sentinel resolves to the giver instance, so every record's
     * `source` is a concrete Stuff. Standing state — depends only on
     * the current stack, not on any command being in flight. The
     * dispatch chain decides ordering; we don't dedup.
     *
     * Lazily seeds the `'self'` entry on first read so callers that
     * skip `postRegister` (test helpers like `makeStuff`, ad-hoc
     * scripts) still see the giver's own contributions. Production
     * code goes through `postRegister`; this branch is the safety net.
     */
    getAffordances(): Affordance[] {
      this._ensureSelfEntry();
      const giver = this as unknown as Stuff;
      const out: Affordance[] = [];
      for (let i = this._commandStack.length - 1; i >= 0; i--) {
        const entry = this._commandStack[i]!;
        const source = entry.source === 'self' ? giver : entry.source;
        for (const command of entry.commands) {
          out.push({ command, source, bucket: entry.bucket });
        }
      }
      return out;
    }

    /**
     * Newest-first list of every command the giver can run. The
     * flattened projection of {@link getAffordances} (which carries the
     * affording source + bucket); callers that only need the verbs use
     * this, callers that need attribution use `getAffordances`.
     */
    getAvailableCommands(): CommandDefinition[] {
      return this.getAffordances().map((a) => a.command);
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
      if (!exists) {
        const defs = CommandApi.collectSelfDefs(this.constructor);
        this.pushCommandSource('self', 'self', defs);
      }
      // Safety net for the no-`postRegister` construction path (test
      // helpers, ad-hoc scripts): surface any hosted updates' verbs
      // even when the host gained them outside a host/unhost delta.
      // Idempotent — `pushCommandSource` dedupes by (source, bucket).
      this._seedHostedUpdateSources();
    }

    /**
     * Push each hosted update's `self`-bucket command contributions
     * onto this giver's recency stack, with the update Stuff as the
     * affording source (so `getAffordances()` resolves `commandSource`
     * to the update — the "verb dispatch routes through the
     * augment/update" pattern). Idempotent. No-op for a non-host.
     *
     * @internal
     */
    private _seedHostedUpdateSources(): void {
      const giver = this as unknown as Stuff;
      for (const { source, defs } of CommandApi.collectHostedUpdateDefs(
        giver
      )) {
        this.pushCommandSource(source, 'self', defs);
      }
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
    ): Promise<void> {
      ExecutionContextApi.tagCurrentFrame(FrameKind.Command);

      // Derive the dispatch context. `verb` and `command` are
      // placeholders here — they get overwritten when the
      // parser/matcher binds; controllers always see the populated
      // form.
      const giver = this as unknown as Stuff & CommandGiver;
      // The dispatch location is whichever Container holds the giver
      // — typically a Location (room) but may be a Vessel (entered
      // wardrobe/ship). Controllers narrow with MixinApi predicates
      // when they need a specific surface.
      // Location is OPTIONAL context, not a precondition to dispatch.
      // An incorporeal giver (e.g. `Login` during char-gen) legitimately
      // has no location; an embodied giver glitched into nowhere still
      // needs to dispatch recovery verbs (`help`, `recall`). So we always
      // proceed with a possibly-null location. Verbs that read location
      // (`look`, the sense verbs) degrade to an empty-result response
      // when it's null rather than being gated — the resolve set is just
      // empty, so they answer as they would for any empty query.
      const location = MixinApi.isContainable(giver)
        ? giver.getContainer()
        : null;
      const commandId = SecurityApi.uuid();
      const originInteractiveId = opts.interactive?.stuffId;
      const outer = CommandApi.createCommandContext({
        commandGiver: giver,
        location,
        commandText,
        executionId: SecurityApi.uuid(),
        commandId,
        verb: '',
        command: undefined as unknown as CommandDefinition,
        // Giver fallback for paths with no contextual match step (the
        // bound short-circuit, programmatic dispatch, pre-match
        // failures). A claiming match overrides this with its
        // affordance's resolved source in `_runChain`.
        commandSource: giver,
        interactive: opts.interactive,
        bodyFields: opts.bodyFields,
      });
      ExecutionContextApi.updateCurrentFrameMetadata({
        commandContext: outer,
        causingCommandId: outer.commandId,
        forced: opts.forced ?? false,
      });

      // `claimingCtx` is the CommandContext whose accumulator becomes
      // the envelope. Per slate § Dispatch context: the dispatcher
      // mints a fresh ctx per `_executeOne` attempt, and the
      // claiming attempt's ctx wins. Failures before/after the
      // claim use the outer ctx.
      let claimingCtx: CommandContext = outer;
      try {
        const parser = await resolveActorParser(outer.commandGiver);
        const parserCtx = {
          commandGiver: outer.commandGiver,
          location: outer.location,
          available: this.getAvailableCommands(),
        };
        const parseResult = await parser.parse(commandText, parserCtx);

        if (parseResult.error !== undefined) {
          outer.note({
            kind: 'command-rejected',
            reason: 'parse-failed',
            detail: parseResult.error,
          });
          this._emitInputEcho({
            rawText: commandText,
            parseError: parseResult.error,
            dispatchId: outer.commandId,
            originInteractiveId,
          });
        } else if (parseResult.parsed) {
          let parsed = parseResult.parsed;
          let expandedText: string | undefined;
          // Alias expansion: only on the parsed branch (the bound /
          // LLM short-circuit picked the verb directly), only when
          // the giver carries AliasMixin. NPCs without aliases skip.
          if (MixinApi.isAlias(outer.commandGiver)) {
            const expanded = ShellApi.expandAliases(
              parsed,
              outer.commandGiver as Stuff & Alias,
            );
            parsed = expanded.parsed;
            if (expanded.expansion) {
              outer.aliasExpansion = {
                ...expanded.expansion,
                originalText: commandText,
              };
              expandedText = expanded.expansion.expandedText;
            }
          }
          this._emitInputEcho({
            rawText: commandText,
            expandedText,
            verb: parsed.verb,
            dispatchId: outer.commandId,
            originInteractiveId,
          });
          claimingCtx = await this._runChain(parsed, outer);
        } else if (parseResult.bound) {
          // Parser already chose the command and built the model;
          // skip parse + match. Run resolve + execute only.
          outer.command = parseResult.bound.command;
          outer.verb = parseResult.bound.command.getPrimaryVerb();
          this._emitInputEcho({
            rawText: commandText,
            verb: outer.verb,
            dispatchId: outer.commandId,
            originInteractiveId,
          });
          const resolved = await CommandApi.resolveModel(
            parseResult.bound.model,
            outer,
          );
          if (!('result' in resolved)) {
            const boundSubcommand =
              typeof (resolved.resolved as { subcommand?: unknown })
                .subcommand === 'string'
                ? ((resolved.resolved as { subcommand?: string }).subcommand)
                : undefined;
            const preloads = await CommandApi.preloadValidatorDeps(
              parseResult.bound.command,
              outer,
              resolved.resolved,
              boundSubcommand,
            );
            const validated = CommandApi.runValidators(
              resolved.resolved,
              outer,
              preloads,
            );
            if (!('result' in validated)) {
              await this._executeOne(
                parseResult.bound.command,
                resolved.resolved,
                outer
              );
            }
          }
        } else {
          outer.note({
            kind: 'command-rejected',
            reason: 'parse-failed',
            detail: 'Parser returned no result',
          });
        }
      } catch (error: unknown) {
        // PromptCancelledError is the "player cancelled mid-
        // disambiguation" path. It's not a controller error — emit
        // a cancelled-shape note and let the dispatch-response
        // envelope ride the standard outcome flow. The originating
        // command never executes.
        if (error instanceof PromptCancelledError) {
          claimingCtx.note({
            kind: 'controller-rejected',
            reason: error.reason === 'host-disconnected'
              ? 'host-disconnected'
              : 'cancelled',
            detail: `prompt ${error.reason}`,
          });
        } else {
          const detail =
            error instanceof Error ? error.message : String(error);
          // The throw can originate inside a controller's execute(),
          // inside resolveAndValidate, or anywhere else. Attribute to
          // whichever context is currently flowing through the chain.
          claimingCtx.note({
            kind: 'controller-error',
            controller: outer.command?.controller ?? '?',
            detail,
          });
        }
      }

      // Framework-failure prose sweep: each accumulated note that
      // came from the dispatcher / validator / MQL framework gets
      // an auto-rendered scene on `system.command.error` so a
      // player typing a bad command sees WHY without needing the
      // client to render envelopes. Controller-side notes
      // (controller-rejected, mixin-missing, etc.) are skipped —
      // controllers are expected to fire their own domain-specific
      // scenes when they care to surface prose.
      //
      // Envelope vs. scene split: scene is the human channel
      // (prose, MML), envelope is the machine channel (typed notes
      // for bots / replay / scripting). Both fire here for
      // framework failures so neither consumer is short-changed.
      const giverAsStuff = outer.commandGiver as unknown as Stuff;
      if (MixinApi.isSensor(giverAsStuff)) {
        for (const note of claimingCtx.getNotes()) {
          const prose = proseForFrameworkNote(note);
          if (prose === null) continue;
          MessageApi.scene(giverAsStuff as Stuff & Sensor)
            .topic('system.command.error')
            .toSelf(Mml.compose`${prose}`)
            .send();
        }
      }

      // Assemble the dispatch-response envelope template. No
      // `frameId` — that's stamped per-Interactive at the wire
      // delivery layer in `Application.sendEnvelopeToInteractive`.
      // Sensor pipeline (Avatar.handleEnvelope) multiplexes the
      // template to every connected Interactive.
      //
      // Every response carries a `prompt-refresh` Note rendered from
      // the giver's `prompt.format` setting (default `{{ focus }}>`)
      // so the client's base-prompt area updates after every command —
      // the MUD-style refresh model. See
      // `docs/subsystems/prompt.md` (Wave 7) for the full design.
      const notes = [
        ...claimingCtx.getNotes(),
        PromptApi.renderPromptRefresh(giverAsStuff),
      ];
      const envelopeTemplate: EnvelopeTemplate = {
        type: 'dispatch-response',
        dispatchId: outer.commandId,
        outcome: {
          status: claimingCtx.getStatus(),
          notes,
        },
      };
      if (MixinApi.isSensor(giverAsStuff)) {
        MessageApi.sendEnvelope(giverAsStuff as Stuff & Sensor, envelopeTemplate);
      }
    }

    /**
     * Emit the input-echo MudlogApi frame at start-of-dispatch.
     * Fires exactly once per `executeCommand` regardless of the
     * branch taken (parsed / bound / parse-error). Topic
     * `system.log.command.{info|warn}`; payload `kind: 'issued'`.
     * Multi-device echo, audit trail, replay capture all consume
     * this; clients filter their own echo by comparing
     * `originInteractiveId` against their stashed
     * `selfInteractiveId`.
     */
    private _emitInputEcho(args: {
      rawText: string;
      expandedText?: string;
      verb?: string;
      parseError?: string;
      dispatchId: string;
      originInteractiveId?: string;
    }): void {
      const giverAsStuff = this as unknown as Stuff;
      if (!MixinApi.isSensor(giverAsStuff)) return;

      const level: LogLevel = args.parseError !== undefined ? 'warn' : 'info';
      const body =
        args.expandedText !== undefined
          ? Mml.compose`${args.rawText} → ${args.expandedText}`
          : Mml.compose`${args.rawText}`;

      const payload: {
        kind: 'issued';
        rawText: string;
        expandedText?: string;
        verb?: string;
        parseError?: string;
        dispatchId: string;
        originInteractiveId?: string;
      } = {
        kind: 'issued',
        rawText: args.rawText,
        dispatchId: args.dispatchId,
      };
      if (args.expandedText !== undefined) payload.expandedText = args.expandedText;
      if (args.verb !== undefined) payload.verb = args.verb;
      if (args.parseError !== undefined) payload.parseError = args.parseError;
      if (args.originInteractiveId !== undefined) {
        payload.originInteractiveId = args.originInteractiveId;
      }

      MudlogApi[level]('command', body, {
        to: giverAsStuff as Stuff & Sensor,
        payload,
      });
    }

    /**
     * Walk the verb's match list at the assemble stage. Shape
     * errors fall through to the next match; the first claiming
     * match (bind succeeds + validators pass) runs `_executeOne`
     * exclusively. Bind errors stop the chain on the outer ctx.
     *
     * Returns the `CommandContext` whose accumulator the dispatcher
     * uses for the dispatch-response envelope: a fresh per-attempt
     * ctx for the claiming match, or the outer ctx for pre-match
     * failures (unknown verb, all-shape-fall-through, bind error).
     *
     * Chain-of-responsibility lives at the assemble stage only;
     * `pass: true` retired with `CommandResult`. Content patterns
     * that need "I might handle this depending on state" use
     * dynamic contributions on the recency stack.
     */
    async _runChain(
      parsed: ReturnType<typeof CommandLineApi.parsePipeline>['commands'][0],
      outer: CommandContext
    ): Promise<CommandContext> {
      // Match against affordances (not bare defs) so each matched
      // definition arrives paired with its resolved affording source;
      // the claiming attempt threads that source onto its context.
      const matches = this.getAffordances().filter((a) =>
        a.command.hasVerb(parsed.verb)
      );
      if (matches.length === 0) {
        // Catalog-emote fallback: an unknown verb may be an authored
        // catalog emote (wave, smile, bow, …) OR a free-form prefix
        // (`;hello world`) that didn't match the catalog. Both paths
        // dispatch via SoulMixin without a controller — the rendering
        // is the mixin's responsibility; catalog emotes do not have
        // their own YAML.
        const speaker = outer.commandGiver as Stuff;
        if (MixinApi.isSoul(speaker)) {
          try {
            const { SoulApi } = await import('../../api/soul');
            const { EmoteGrammarRunner } = await import(
              '../../lib/social/EmoteGrammar'
            );
            const emote = await SoulApi.resolve(parsed.verb);
            if (emote) {
              const rest = parsed.rawTokens
                .slice(1)
                .filter((t) => t.kind === 'word')
                .map((t) => (t as { value: string }).value);
              const bound = await EmoteGrammarRunner.bind(emote, rest, speaker);
              const opts: { target?: Stuff; fills?: Record<string, string> } = {
                fills: bound.fills,
              };
              if (bound.target) opts.target = bound.target;
              speaker.emote(emote, opts);
              return outer;
            }
            if (parsed.emotePrefixed) {
              // Catalog miss with the prefix flag set — fall back to
              // free-form. Reconstruct the body from the source slice
              // so original spacing survives.
              const body = parsed.source.trim() || parsed.verb;
              speaker.emoteFree(body);
              return outer;
            }
          } catch (err) {
            // Catalog dispatch failed — surface as a generic
            // command-rejected note. Don't crash; the catalog path
            // is best-effort.
            outer.note({
              kind: 'command-rejected',
              reason: 'unknown-verb',
              detail: `emote dispatch failed: ${
                err instanceof Error ? err.message : String(err)
              }`,
            });
            return outer;
          }
        }
        outer.note({
          kind: 'command-rejected',
          reason: 'unknown-verb',
          detail: parsed.verb,
        });
        return outer;
      }

      for (const affordance of matches) {
        const command = affordance.command;
        const built = CommandApi.assemble(parsed, command, {
          commandGiver: outer.commandGiver,
          location: outer.location,
        });
        if (!('error' in built) && outer.bodyFields) {
          // Body side-channel: overlay the structured fields onto the
          // bound model's payload/designated body fields ONLY (never
          // selectors/flags), after the string parse, before resolve.
          CommandApi.overlayBodyFields(built.model, outer.bodyFields, command);
        }
        if ('error' in built) {
          if (built.error === 'shape') continue; // fall through
          // Bind / unknown-subcommand errors stop the chain. Emit on
          // the outer ctx — we never reached _executeOne for any
          // attempt.
          if (built.error === 'unknown-subcommand') {
            const list = built.available.join(', ');
            outer.note({
              kind: 'command-rejected',
              reason: 'unknown-subcommand',
              detail: `unknown subcommand '${built.subcommand}'; valid: ${list}`,
            });
          } else {
            outer.note({
              kind: 'command-rejected',
              reason: 'bind-failed',
              detail: built.summary,
            });
          }
          outer.verb = parsed.verb;
          outer.command = command;
          return outer;
        }
        // Mint a fresh CommandContext for this attempt. Identity
        // fields (commandId, executionId) ride through from the
        // outer ctx so attribution stays stable; the accumulator
        // and verb/command are per-attempt.
        const attempt = CommandApi.createCommandContext({
          commandGiver: outer.commandGiver,
          location: outer.location,
          commandText: outer.commandText,
          executionId: outer.executionId,
          commandId: outer.commandId,
          verb: parsed.verb,
          command,
          commandSource: affordance.source,
          interactive: outer.interactive,
        });
        if (outer.aliasExpansion !== undefined) {
          attempt.aliasExpansion = outer.aliasExpansion;
        }
        // Dispatch pipeline: MQL resolve → async preload → sync
        // validators. Splitting MQL out of the sync validator phase
        // lets field-level validator preloads inspect the bound
        // result (e.g. `requiresAnimateTarget` reads the resolved
        // target's `_speciesPath`).
        const resolved = await CommandApi.resolveModel(
          built.model,
          attempt,
          built.prep
        );
        if ('result' in resolved) return attempt;
        const subcommandHint =
          typeof (resolved.resolved as { subcommand?: unknown }).subcommand === 'string'
            ? ((resolved.resolved as { subcommand?: string }).subcommand)
            : undefined;
        const preloads = await CommandApi.preloadValidatorDeps(
          command,
          attempt,
          resolved.resolved,
          subcommandHint,
        );
        const validated = CommandApi.runValidators(
          resolved.resolved,
          attempt,
          preloads,
        );
        if ('result' in validated) return attempt;
        await this._executeOne(command, resolved.resolved, attempt);
        return attempt;
      }
      // Every match returned a shape error.
      outer.note({
        kind: 'command-rejected',
        reason: 'shape-fall-through',
        detail: parsed.verb,
      });
      return outer;
    }

    /**
     * Clone-per-execution controller dispatch. The clone is destructed
     * in `finally` regardless of outcome.
     *
     * Option E (per-subcommand controller): when the bound model
     * carries a `subcommand` and the subcommand declares its own
     * `controller:`, that template wins; otherwise falls back to the
     * verb-level controller. A subcommanded verb with no resolvable
     * controller (subcommand omitted, no verb-level fallback) returns
     * a player-facing failure rather than throwing.
     */
    async _executeOne(
      command: CommandDefinition,
      model: CommandModel,
      context: CommandContext
    ): Promise<void> {
      const sub = (model as { subcommand?: string }).subcommand;
      const controllerName = sub
        ? command.controllerForSubcommand(sub)
        : command.controller;
      if (!controllerName) {
        context.note({
          kind: 'command-rejected',
          reason: 'missing-subcommand',
          detail: command.getPrimaryVerb(),
        });
        return;
      }
      let controller: CommandController | null = null;
      try {
        controller = await StuffApi.clone<CommandController>(
          `/obj/command/${controllerName}`
        );
        await controller.execute(model, context);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        context.note({
          kind: 'controller-error',
          controller: controllerName,
          detail: message,
        });
      } finally {
        if (controller) StuffApi.destruct(controller);
      }
    }
  }
  return CommandGiverMixin;
}
