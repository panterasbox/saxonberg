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
 * The client gets one `shell.control` `schema:reset` when
 * `_commandSchemaSubscribed` flips at `onConnectionAttached`. ⭐ Pushes and
 * pops send nothing: a frame per verb per mover per person in the room went
 * to a client that discards them, and it was half of what a crowd cost
 * (controllers-are-io D27).
 */

import type { MixinConstructor } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import type { Parser } from '../../api/command';
import {
  SettingTypes,
  type SettingsSchemaEntry,
} from '../shell/Environment';
import { SecurityApi } from '../../api/security';
import { CommandLineApi, type ParsedCommand } from '../../api/command-line';
import {
  CommandApi,
  type AssembleResult,
  type AssembleSuccess,
  type CardinalityHow,
  type CommandContext,
  type CommandModel,
  type ExecuteCommandOpts,
} from '../../api/command';
import { MqlApi } from '../../api/mql';
import { MessageApi } from '../../api/message';
import { PromptApi, PromptCancelledError } from '../../api/prompt';
import type { EnvelopeTemplate } from '@saxonberg/types';
import { MixinApi } from '../../api/mixin';
import { ShellApi } from '../../api/shell';
import type { Alias } from '../shell/Alias';
import { StuffApi } from '../../api/stuff';
import { DiagnosticApi } from '../../api/diagnostics';
import type { CommandController } from './CommandController';
import { CommandDefinition } from './CommandDefinition';
import type { CommandSchemaPayload } from '../../api/command';
import { Final, Unshadowable } from '../security/decorators';
import { ExecutionContextApi, FrameKind } from '../../api/execution-context';
import { MudlogApi } from '../../api/mudlog';
import { Mml } from '../../api/mml';
import { EventApi } from '../../api/event';
import { WorldClockApi } from '../../api/worldclock';
import { ScriptApi } from '../../api/script';
import { CommandDispatchedEvent } from '../events/CommandDispatchedEvent';
import type { Sensor } from '../message/Sensor';
import type Interactive from '../../platform/idea/Interactive';
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
 * accumulated notes and fires a `shell.error` scene per
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
        // ⭐ `verb@source` and the fail-closed script: the detail is
        // already the sentence.
        case 'source-not-found':
        case 'source-affords-nothing':
        case 'needs-input':
          return note.detail ? `${capitalize(note.detail)}.` : `Command rejected.`;
        default:
          return `Command rejected${tail}.`;
      }
    }
    case 'other-offer': {
      // ⭐ The other offer (D3): a binder fact, said by the dispatcher.
      const who = note.source.displayName ? capitalize(note.source.displayName) : 'Something else here';
      const form = CommandLineApi.format({
        verb: note.verb,
        rawTokens: [{ kind: 'word', value: note.verb, raw: note.verb, pos: 0 }],
        source: '',
        start: 0,
        scope: note.scopedForm,
      });
      return `${who} also answers \`${note.verb}\` — \`${form}\`.`;
    }
    case 'mql-error':
      return `Couldn't resolve '${note.field}' (${note.stage}): ${note.detail}`;
    case 'registry-scan':
      // ⭐ The office holder's receipt. It says the SHAPE they typed and
      // whether an index answered it, because those two together are
      // what tells them whether to keep doing it.
      return (
        `Registry read: ${note.scanned} object${note.scanned === 1 ? '' : 's'} ` +
        `for '${note.field}' (` +
        (note.indexed ? 'indexed' : `unindexed shape ${note.shape}`) +
        `).`
      );
    case 'validator-failed':
      // The validator's return string IS the player-facing prose.
      return note.detail;
    case 'controller-error':
      return `Something went wrong in ${note.controller}: ${note.detail}`;
    default:
      return null;
  }
}

/** Upper-case the first character of a sentence. */
function capitalize(text: string): string {
  return text.length === 0 ? text : text[0]!.toUpperCase() + text.slice(1);
}

/**
 * ⭐ Is affordance `a` FROM source `s`? Its own source, or — a catalogue
 * pushed on the giver's `self` bucket — the giver itself (`cast@me`).
 */
function affordsFrom(a: Affordance, s: Stuff, giver: Stuff): boolean {
  return a.source === s || (s === giver && a.bucket === 'self');
}

/** The one typed discriminant over an `assemble` result. */
function isAssembled(r: AssembleResult): r is AssembleSuccess {
  return !('error' in r);
}

/** How many other offers a refused line may look at before it stops looking. */
const MAX_OFFER_PROBES = 6;

/** Do two resolved lines bind the same things, slot for slot? */
function sameBinding(a: CommandModel, b: CommandModel): boolean {
  const ids = (v: unknown): unknown => {
    const stuff = (v as { stuff?: unknown } | null | undefined)?.stuff;
    if (Array.isArray(stuff)) return stuff.map((s: Stuff) => s.stuffId);
    if (stuff instanceof Object) return (stuff as Stuff).stuffId;
    return v;
  };
  const line = (m: CommandModel): string =>
    JSON.stringify(Object.entries(m).map(([k, v]) => [k, ids(v)]).sort());
  return line(a) === line(b);
}

/** True when `thing` sits (at any depth) inside `holder`. */
function isWithin(thing: Stuff, holder: Stuff): boolean {
  let at: Stuff | null = MixinApi.isContainable(thing) ? thing.getContainer() : null;
  for (let depth = 0; at !== null && depth < 32; depth++) {
    if (at === holder) return true;
    at = MixinApi.isContainable(at) ? at.getContainer() : null;
  }
  return false;
}

/** `parsed` without its `verb@source` scope (a batch's per-source re-run). */
function unscoped(parsed: ParsedCommand): ParsedCommand {
  const { scope: _scope, ...rest } = parsed;
  return rest;
}

/**
 * Contexts whose dispatch-response envelope is fired by a *detached*
 * async body (in `_executeOne`), not by `executeCommand`'s synchronous
 * finish tail. Keyed on the claiming `CommandContext` — weak so a
 * completed dispatch's ctx is collectable. No race: single-threaded, and
 * the sync `has()` check in `executeCommand` runs before the detached
 * run's microtask fires. Kept off the public `CommandContext` surface
 * (member-privacy / export-discipline).
 */
const detachedContexts = new WeakSet<CommandContext>();

/**
 * The dispatches that have already asked for a missing object (`Ring
 * what?`), so the line the answer completes is never asked about again.
 */
const ASKED = new WeakSet<CommandContext>();

/** A malformed leading `--async` on a script line — noted, then unwound. */
class ScriptLineRefused extends Error {}

/** Frame `target` marker for a detached async command body. */
const ASYNC_BODY_TARGET = { module: 'CommandGiverMixin' } as const;

/**
 * Assemble + fire the single dispatch-response envelope for a completed
 * dispatch (the finish tail extracted from `executeCommand`). Runs the
 * framework-failure prose sweep, then sends the typed-note envelope +
 * `prompt-refresh`. Behaviour-preserving for the sync path; for an async
 * command the detached body calls this in its `finally` so the one
 * (late) envelope carries the body's accumulated notes + final status.
 */
/**
 * Author-diagnostics: record a controller throw (store row + author push).
 * `controllerPath` is the already-resolved `/`-rooted controller template
 * path (see `CommandDefinition.resolvedController` /
 * `controllerForSubcommand`). Fire-and-forget and fully swallowing — a
 * controller-error note is already the giver's surface, and diagnostics
 * capture must never break dispatch or leak an unhandled rejection (e.g. a
 * disconnected store).
 */
function recordControllerThrow(
  controllerPath: string | undefined,
  error: unknown
): void {
  const message = error instanceof Error ? error.message : String(error);
  void DiagnosticApi.record({
    path: controllerPath ?? null,
    message: `${controllerPath ?? '?'}: ${message}`,
    stack: error instanceof Error ? (error.stack ?? null) : null,
  }).catch(() => {
    // diagnostics never breaks dispatch
  });
}

function emitDispatchResponse(ctx: CommandContext): void {
  const giverAsStuff = ctx.commandGiver as unknown as Stuff;
  // Framework-failure prose sweep: dispatcher / validator / MQL notes
  // get an auto-rendered `shell.error` scene so the player
  // sees WHY without the client rendering envelopes. Controller-side
  // notes are skipped (controllers fire their own scenes).
  if (MixinApi.isSensor(giverAsStuff)) {
    for (const note of ctx.getNotes()) {
      const prose = proseForFrameworkNote(note);
      if (prose === null) continue;
      MessageApi.scene(giverAsStuff as Stuff & Sensor)
        .topic('shell.error')
        .toSelf(Mml.compose`${prose}`)
        .send();
    }
  }
  // Every response carries a `prompt-refresh` note so the client's
  // base-prompt area updates after every command.
  const notes = [
    ...ctx.getNotes(),
    PromptApi.renderPromptRefresh(giverAsStuff),
  ];
  // ⭐ Mark a FORCED command's envelope. The auto-`sense` on arrival
  // fires its own dispatch-response inside `run`'s, and a correlator
  // that takes "the next dispatch-response" reads the sense's `[]`
  // as the run's outcome (the nutrition-and-fitness drive read a
  // `pace-broken` note one command late for exactly this reason). The
  // innermost Command frame at emit time is this command's.
  const stack = ExecutionContextApi.getCommandStack();
  const forced = stack[stack.length - 1]?.forced === true;
  const envelopeTemplate: EnvelopeTemplate = {
    type: 'dispatch-response',
    dispatchId: ctx.commandId,
    ...(forced ? { forced: true as const } : {}),
    outcome: {
      status: ctx.getStatus(),
      notes,
    },
  };
  if (MixinApi.isSensor(giverAsStuff)) {
    (giverAsStuff as Stuff & Sensor).onEnvelope(envelopeTemplate);
  }
  // A giver with nobody on the wire — an NPC driven by a brain or a
  // dialogue `dispatch` effect — gets the same envelope and no reader.
  // Its refusals are the developer's to see: "NPCs do their jobs" has to
  // fail out loud, or a hand that never consigns and a barkeep who never
  // hires look like patience. One line per declined forced command.
  // `getInteractives()` can be undefined on an avatar mid-teardown or
  // mid-relogin (observed live: 44 dispatch crashes across rapid
  // session cycling) — an interactive-less moment reads as unread.
  const unread =
    !MixinApi.isHasInteractive(giverAsStuff) ||
    (giverAsStuff.getInteractives()?.size ?? 0) === 0;
  const status = ctx.getStatus();
  if (unread && status !== 'ok') {
    const why = ctx
      .getNotes()
      .filter((n) => n.kind !== 'prompt-refresh')
      .map((n) => {
        const r = n as { reason?: string; detail?: unknown; validator?: string; field?: string };
        return `${n.kind}${r.field ? `[${r.field}]` : ''}${r.reason ? `:${r.reason}` : ''}${
          r.detail !== undefined ? `(${typeof r.detail === 'string' ? r.detail : JSON.stringify(r.detail)})` : ''
        }`;
      })
      .join(' ');
    console.warn(
      `[dispatch] ${giverAsStuff.getPresentation()} "${ctx.commandText}" → ${status}: ${why}`,
    );
    // ⭐ An NPC's command that needed an answer nobody could give is the
    // AUTHOR's to fix (a brain that dispatches an ambiguous line): it goes
    // to the diagnostics store, not only the log.
    for (const n of ctx.getNotes()) {
      if (n.kind !== 'command-rejected' || n.reason !== 'needs-input') continue;
      void DiagnosticApi.record({
        path: ctx.command?.resolvedController ?? null,
        message: `${giverAsStuff.getPresentation()} "${ctx.commandText}": ${n.detail ?? 'needs input'}`,
        stack: null,
      }).catch(() => {
        // diagnostics never breaks dispatch
      });
    }
  }
}

/**
 * Run a detached async command body under a fresh root frame, tagged as
 * a Command frame carrying the originating dispatch's `CommandContext` +
 * `causingCommandId`, so the body's Scenes stamp `commandId ==
 * dispatchId` and `PromptApi` stays reachable (the planted `interactive`
 * on `ctx`). Mirrors `ScheduleApi.planRun`'s runRoot + metadata pattern.
 * Not awaited by the caller — that is the whole point (the giver's input
 * chain frees at accept-time). ALS keeps the frame live across awaits.
 */
function runDetachedBody(
  causingId: string,
  ctx: CommandContext,
  fn: () => Promise<void>
): void {
  void ExecutionContextApi.runRoot(ASYNC_BODY_TARGET, 'executeAsyncBody', () => {
    ExecutionContextApi.tagCurrentFrame(FrameKind.Command);
    ExecutionContextApi.updateCurrentFrameMetadata({
      commandContext: ctx,
      causingCommandId: causingId,
      forced: false,
    });
    return fn();
  });
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
/**
 * ⭐ What a `verb@source` named, after the scope filter: every resolved
 * candidate that affords the verb, in resolver order, and how the scope
 * named them (a set, a count, a name) — the cardinality `how`.
 */
export interface ScopedSources {
  /** The scope as typed after the `@`. */
  raw: string;
  sources: Stuff[];
  how: CardinalityHow;
}

/**
 * The result of {@link CommandGiver.matchAffordances} — shared by the
 * dispatcher and the script binder so both read one line one way.
 *
 * `ok: true` — `matches` are the affordances whose view has the verb
 * (unfiltered by source; the caller keeps those {@link ScopedSources}
 * afford), `usage` every matching view's `getUsage()` joined `' · '` (the
 * all-shapes-failed answer), `scope` present when the line was
 * `verb@source`. `ok: false` — the scope refused the line; `note` says
 * why (`source-not-found`, `source-affords-nothing`, or an `mql-error`).
 */
export type AffordanceMatch =
  | { ok: true; matches: Affordance[]; usage: string; scope?: ScopedSources }
  | { ok: false; note: Note };

export interface CommandGiver {
  getAvailableCommands(): CommandDefinition[];
  getAffordances(): Affordance[];
  /**
   * Match a parsed line against the giver's affordances — the verb
   * filter and the `verb@source` scope filter (D2). Synchronous.
   */
  matchAffordances(parsed: ParsedCommand): AffordanceMatch;
  executeCommand(
    commandText: string,
    opts?: ExecuteCommandOpts
  ): Promise<void>;
  forceCommand(commandText: string, opts?: ExecuteCommandOpts): Promise<void>;
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
  /**
   * Run a pre-bound `{ command, model }` through the dispatcher's bound
   * tail — resolve → validator-preload → validators → execute — minting
   * a fresh per-command `CommandContext` and returning it (with its
   * notes). The scripting interpreter's dispatch primitive.
   * @internal
   */
  _dispatchBound(
    command: CommandDefinition,
    model: CommandModel,
    prep?: Record<string, string>,
    source?: Stuff
  ): Promise<CommandContext>;
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
  const spec = ShellApi.resolveSetting<string>(actor, 'shell.parser') ?? 'script';
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
        default: 'script',
        enumValues: ['msh', 'script'],
        description:
          'Parser used to turn raw input into commands. `script` (the ' +
          'default) is the command-native scripting parser — the prompt ' +
          'IS the interpreter: multi-statement scripts, blocks, and $vars ' +
          'run inline, while a bare single command is delegated to `msh` ' +
          'and parses byte-identically. Set to `msh` to opt out of the ' +
          'interpreter entirely.',
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
    public async onCreate(_context?: unknown): Promise<void> {
      await super.onCreate(_context);
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
     * skip `onCreate` (test helpers like `makeStuff`, ad-hoc
     * scripts) still see the giver's own contributions. Production
     * code goes through `onCreate`; this branch is the safety net.
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
     * ⭐ The verb filter, then the `verb@source` scope filter (D2). The
     * scope resolves as MQL with the binder's own context (`reachable`,
     * so `me` / `here` / `#id` anchor and a bare name searches what the
     * giver can reach). Nothing resolved → `source-not-found`; resolved
     * but none affords the verb → `source-affords-nothing`. An unknown
     * verb is left to the caller (the emote fallback), scope or not.
     */
    matchAffordances(parsed: ParsedCommand): AffordanceMatch {
      const giver = this as unknown as Stuff & CommandGiver;
      const matches = this.getAffordances().filter((a) =>
        a.command.hasVerb(parsed.verb)
      );
      const usage = [...new Set(matches.map((a) => a.command.getUsage()))].join(' · ');
      if (parsed.scope === undefined || matches.length === 0) {
        return { ok: true, matches, usage };
      }
      let resolved;
      try {
        resolved = MqlApi.resolveMany(parsed.scope, { commandGiver: giver, scope: 'reachable' });
      } catch (err) {
        return {
          ok: false,
          note: {
            kind: 'mql-error',
            field: 'source',
            stage: 'resolve',
            detail: err instanceof Error ? err.message : String(err),
          },
        };
      }
      const named = [...new Set(resolved.stuff)];
      if (named.length === 0) {
        return {
          ok: false,
          note: {
            kind: 'command-rejected',
            reason: 'source-not-found',
            detail: `nothing you can reach answers to '${parsed.scope}'`,
          },
        };
      }
      const sources = named.filter((s) => matches.some((a) => affordsFrom(a, s, giver)));
      if (sources.length === 0) {
        const what = named.length === 1 ? named[0]!.getPresentation() : `'${parsed.scope}'`;
        return {
          ok: false,
          note: {
            kind: 'command-rejected',
            reason: 'source-affords-nothing',
            detail: `${what} does not answer \`${parsed.verb}\``,
          },
        };
      }
      const how: CardinalityHow = { raw: parsed.scope };
      if (resolved.isSet) how.isSet = true;
      if (resolved.quantity) how.quantity = resolved.quantity;
      return { ok: true, matches, usage, scope: { raw: parsed.scope, sources, how } };
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
      // Safety net for the no-`onCreate` construction path (test
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
      this._commandStack = this._commandStack.filter((e) => e.source !== source);
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
      this._commandStack = this._commandStack.filter(
        (e) => e.bucket !== 'environment' && e.bucket !== 'peers',
      );
    }

    /**
     * Mark the schema-subscription gate open. The first connection
     * attach is when client-side schema delivery becomes meaningful —
     * earlier pushes are pre-subscription bookkeeping.
     */
    onConnectionAttached(_conn: Interactive): void {
      if (this._commandSchemaSubscribed) return;
      this._commandSchemaSubscribed = true;
      // Emit a single `shell.control` carrying the full set
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

    /**
     * Runtime-fired command (a brain's literal verb, a dialogue
     * effect, an auto-sense) — `executeCommand` with `forced: true`
     * stamped, so downstream attribution can tell a player's own
     * keystroke from a system-driven act. The one home for the
     * `forced` stamp (was `forceCommand` (the giver's own method since the OO sweep), retired by the
     * OO sweep — the giver holds the verb).
     */
    async forceCommand(
      commandText: string,
      opts: ExecuteCommandOpts = {}
    ): Promise<void> {
      return this.executeCommand(commandText, { ...opts, forced: true });
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

      // Server-authoritative input mode (per-bar). For real player input
      // only (interactive && !forced && the giver carries client state),
      // look up the submitting bar's prefix in `cockpit.inputModes` and
      // prepend it before anything parses. Scripts / NPC / forced
      // dispatch carry no barId and bypass — verbatim. `applyInputMode`
      // is pure (the `/`-escape and `mode`-exempt rules live there); the
      // per-bar lookup happens here at the call site. The echo reflects
      // the dispatched text, since `commandText` is reassigned.
      // A submission with NO barId (an affordance click, a script, a
      // programmatic dispatch) is deliberately un-moded: preview equals
      // send. Only a real bar submission (carrying its barId) consults
      // that bar's prefix.
      if (
        opts.barId !== undefined &&
        opts.interactive &&
        !opts.forced &&
        // ⭐ The narrow is the CLIENT's, not the connection's:
        // `cockpit.inputModes` is one client's key, so a giver whose
        // client does not declare it genuinely has no input modes and
        // `getClientState` would throw rather than return a default.
        MixinApi.isSaxonbergClient(giver)
      ) {
        const modes = giver.getClientState<Record<string, string>>(
          'cockpit.inputModes',
        );
        const prefix = modes?.[opts.barId] ?? '';
        commandText = CommandApi.applyInputMode(commandText, prefix);
      }

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
      // Idle reset: any command line a real player submits marks their
      // session active (a single transient `Date` assignment, gated to an
      // interactive origin — NPC / programmatic / cascaded dispatch carries
      // no Interactive and no-ops). Idle is *derived on read* from this in
      // `SocialApi.statusOf`; nothing is stored, scheduled, or fanned out.
      opts.interactive?.touchInput();
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
        barId: opts.barId,
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
            location: outer.location,
          });
          // ⭐ A streamer on air: the overlay hears the VERB they typed —
          // refused or not — and never its arguments (broadcast-ready D6).
          // A forced command (the arrival `look`) is the runtime's, not
          // the streamer's, so it does not count.
          if (!opts.forced && MixinApi.isBroadcastHost(giver)) giver.noteVerb(parsed.verb);
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
            location: outer.location,
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
              // Bound path carries no token stream, so no reserved flag —
              // the spec default is the effective async mode.
              await this._executeOne(
                parseResult.bound.command,
                resolved.resolved,
                outer,
                { async: parseResult.bound.command.async }
              );
            }
          }
        } else if (parseResult.script) {
          // Multi-statement / block-bearing input: hand the parsed AST
          // to the interpreter, which dispatches each command over this
          // same bus (gated, attributed, scope-re-checked). The actor is
          // derived from the ambient command frame's giver; the run's
          // notes are threaded back onto `outer` so they ride the
          // dispatch-response envelope assembled below.
          this._emitInputEcho({
            rawText: commandText,
            verb: 'script',
            dispatchId: outer.commandId,
            originInteractiveId,
            location: outer.location,
          });
          // ⭐ A leading `--async` on the bare script line detaches the
          // run the way `_executeOne` detaches a controller body: the
          // input chain frees at once, and the detached run fires the
          // one (late) envelope when the script settles (D23).
          const script = parseResult.script.ast;
          const head = script.statements[0]?.commands[0];
          if (head && (head.word === '--async' || head.word === '--sync')) {
            const detach = head.word === '--async';
            const next = head.args[0];
            if (next === undefined) {
              script.statements.shift();
            } else if (next.kind === 'literal') {
              head.word = next.value;
              head.args = head.args.slice(1);
            } else {
              outer.note({
                kind: 'command-rejected',
                reason: 'parse-failed',
                detail: `${head.word} must lead a command word`,
              });
              throw new ScriptLineRefused();
            }
            if (detach) {
              detachedContexts.add(outer);
              runDetachedBody(outer.commandId, outer, async () => {
                try {
                  await ScriptApi.runAst(script);
                } catch (error: unknown) {
                  outer.note({
                    kind: 'controller-error',
                    controller: 'script',
                    detail: error instanceof Error ? error.message : String(error),
                  });
                } finally {
                  emitDispatchResponse(outer);
                }
              });
            } else {
              await ScriptApi.runAst(script);
            }
          } else {
            await ScriptApi.runAst(script);
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
        if (error instanceof ScriptLineRefused) {
          // Already noted on `outer`; nothing more to say.
        } else if (error instanceof PromptCancelledError) {
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
          const controllerPath = outer.command?.resolvedController;
          claimingCtx.note({
            kind: 'controller-error',
            controller: controllerPath ?? '?',
            detail,
          });
          // The note above is the giver's surface; this is the developer's.
          recordControllerThrow(controllerPath, error);
        }
      }

      // Fire the dispatch-response envelope — assembling the framework-
      // failure prose sweep + typed-note envelope + prompt-refresh (see
      // `emitDispatchResponse`). EXCEPT when an async command detached
      // its controller body in `_executeOne`: then the detached run owns
      // firing the single (late) envelope once the body completes, so we
      // fire nothing here at accept-time.
      if (!detachedContexts.has(claimingCtx)) {
        emitDispatchResponse(claimingCtx);
        // The caller's own read of the outcome (pblive's control socket
        // echoes ✓/⚠, broadcast-ready D11) — the same status the
        // envelope carries.
        if (opts.onOutcome) opts.onOutcome(claimingCtx.getStatus());
      }
    }

    /**
     * Emit the input-echo MudlogApi frame at start-of-dispatch.
     * Fires exactly once per `executeCommand` regardless of the
     * branch taken (parsed / bound / parse-error). Topic
     * `shell.diagnostic`; payload `kind: 'issued'`.
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
      location?: Stuff | null;
    }): void {
      const giverAsStuff = this as unknown as Stuff;
      if (!MixinApi.isSensor(giverAsStuff)) return;

      // Participation capture (consumer-influence quantity faucet): a
      // RECOGNIZED command (a verb bound — parse failures carry no `verb`)
      // from an INTERACTIVE origin (a real player, never NPC / programmatic
      // / cascaded dispatch) credits the giver an active time-bucket. The
      // per-(subject, bucket) dedup at the faucet collapses bursts. Fire-and-
      // forget; never blocks dispatch.
      //
      // The event's RECEIVE side is locked to ConsumerLogic + ProducerLogic
      // via `EventApi.restrictSubscribe` (it fires on private commands too —
      // inventory / settings / whisper / dm / char-gen — so an open-subscribe
      // broadcast would be a snooping side-channel). Emit stays open; only
      // the blessed consumers may listen. The optional location/actor
      // templatePaths feed the producer faucet's credit routing; the consumer
      // tap ignores them. See docs/subsystems/participation.md.
      if (args.verb !== undefined && args.originInteractiveId !== undefined) {
        EventApi.fire(
          new CommandDispatchedEvent({
            subjectId: giverAsStuff.stuffId,
            commandId: args.dispatchId,
            at: WorldClockApi.getNow().rawValue(),
            realAt: Date.now(),
            locationTemplatePath:
              args.location?.getTemplatePath() ?? undefined,
            actorTemplatePath: giverAsStuff.getTemplatePath() ?? undefined,
          })
        );
      }

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
      outer: CommandContext,
      scopeSource?: Stuff
    ): Promise<CommandContext> {
      // ── ① The scope filter (`verb@source`, D2) — FIRST, so the chain
      // below sees only what the named source affords. An unscoped line
      // passes straight through: `matches` is today's verb filter.
      // Match against affordances (not bare defs) so each matched
      // definition arrives paired with its resolved affording source;
      // the claiming attempt threads that source onto its context.
      const giverStuff = this as unknown as Stuff;
      const matched = this.matchAffordances(scopeSource ? unscoped(parsed) : parsed);
      if (!matched.ok) {
        outer.verb = parsed.verb;
        outer.note(matched.note);
        return outer;
      }
      if (matched.scope) {
        const picked = await this._pickSources(matched.scope, outer, parsed.verb);
        if (picked === null) return outer;
        // A plural scope (`wind@all watches`) is a BATCH: the chain once
        // per source, each its own attempt, folded into one envelope.
        if (picked.length > 1) return this._runBatch(parsed, outer, picked);
        scopeSource = picked[0];
      }
      const allMatches = matched.matches;
      const matches = scopeSource
        ? allMatches.filter((a) => affordsFrom(a, scopeSource!, giverStuff))
        : allMatches;
      // ── ② The chain (unchanged below, but for `scopeSource` riding into
      // `assemble` and each refusal handing to ③ `_otherOffer`).
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
              '../social/EmoteGrammar'
            );
            const emote = await SoulApi.resolve(parsed.verb);
            if (emote) {
              const rest = parsed.rawTokens
                .slice(1)
                .filter((t) => t.kind === 'word')
                .map((t) => (t as { value: string }).value);
              const bound = new EmoteGrammarRunner(emote).bind(rest, speaker);
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
        // Nothing here affords this verb. That IS an unknown verb from
        // the actor's position — a verb reaches you by being contributed
        // (`commandContributions`, `self` for one that should always be
        // available), and a refusal with a reason is a validator's job.
        // Both models already exist; a third that dispatches a message
        // for a verb nobody assigned is a shadow affordance.
        outer.note({
          kind: 'command-rejected',
          reason: 'unknown-verb',
          detail: parsed.verb,
        });
        return outer;
      }

      /** The first view that refused an argument, if a later one is tried. */
      let firstRefused: CommandContext | undefined;
      /** The first view whose only problem is a missing object — askable. */
      let askable: { command: CommandDefinition; field: string } | undefined;
      for (const affordance of matches) {
        const command = affordance.command;
        const built = CommandApi.assemble(
          parsed,
          command,
          { commandGiver: outer.commandGiver, location: outer.location },
          scopeSource ? { scopeSource } : {},
        );
        if (isAssembled(built) && outer.bodyFields) {
          // Body side-channel: overlay the structured fields onto the
          // bound model's payload/designated body fields ONLY (never
          // selectors/flags), after the string parse, before resolve.
          CommandApi.overlayBodyFields(built.model, outer.bodyFields, command);
        }
        if (!isAssembled(built)) {
          if (built.error === 'shape') {
            // ⭐ A line that left out a required OBJECT is not wrong, it
            // is unfinished — remember it, and ask for it if nobody else
            // claims the line (below).
            const def = built.missing
              ? command.args.find((a) => a.name === built.missing)
              : undefined;
            if (!askable && def && (def.type === 'object' || def.type === 'objects')) {
              askable = { command, field: def.name };
            }
            continue; // fall through
          }
          if (firstRefused) return this._otherOffer(parsed, allMatches, firstRefused);
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
          // ⚠⚠ The submitting command line. Without it a controller
          // sees `context.barId === undefined` and falls back to
          // `'main'`, while the input-mode reader above looks up the
          // REAL barId — so `cockpit cli` wrote its prefix to one key
          // and the prepend read another, and the feature was inert
          // through any client that sends a barId other than `main`.
          // Found by driving it: the browser sends `barId: "world"`.
          barId: outer.barId,
          // `--strict` / `--loose` on the line (D23).
          ...(built.reservedFiltered ? { filterPolicy: built.reservedFiltered } : {}),
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
        if ('result' in resolved) return this._otherOffer(parsed, allMatches, firstRefused ?? attempt);
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
        if ('result' in validated) {
          // ⭐ Two views of one verb coexist BY TARGET: an argument of the
          // wrong kind for this view is a question for the next one, not a
          // refusal (found by the potash drive: holding a tallow crock put
          // the shaker's `pour` first, and `pour crock into kettle` died on
          // "isn't a vessel you can work in" while the bulk `pour` never
          // ran). A refusal about the ACTOR stops here; only a field's
          // refusal falls through, and the first one stands if nobody
          // claims the line.
          const fieldRefused = attempt
            .getNotes()
            .some((n) => n.kind === 'validator-failed' && (n as { validator?: string }).validator === 'field');
          if (fieldRefused && affordance !== matches[matches.length - 1]) {
            firstRefused ??= attempt;
            continue;
          }
          return this._otherOffer(parsed, allMatches, firstRefused ?? attempt);
        }
        // Effective async = per-invocation reserved flag over the verb's
        // spec default. `--async`/`--sync` were stripped during assemble.
        const effectiveAsync = built.reservedAsync
          ? built.reservedAsync === 'async'
          : command.async;
        await this._executeOne(command, resolved.resolved, attempt, {
          async: effectiveAsync,
        });
        // ⚠ The act may have ended the giver (a login handing off to its
        // body): a destroyed Stuff answers every call with nothing, and the
        // dispatch still needs its context back.
        if ((this as unknown as Stuff).isDestroyed()) return attempt;
        return this._otherOffer(parsed, allMatches, attempt);
      }
      if (firstRefused) return this._otherOffer(parsed, allMatches, firstRefused);
      // ⭐⭐ "Ring what?" — the line named the verb and not its object.
      // Ask, offering what is in reach and fits the field; the answer
      // (a pick from the list, or any thing clicked elsewhere on screen)
      // goes where the object goes, as `#<id>`, and the line runs again
      // exactly as if it had been typed — so every gate a typed object
      // meets, this one meets. Asked once: a second shape failure after
      // the answer is a real one.
      if (askable && outer.interactive && !ASKED.has(outer)) {
        ASKED.add(outer);
        const candidates = CommandApi.objectCandidates(
          askable.command,
          askable.field,
          outer.commandGiver as Stuff & CommandGiver,
        );
        const verb = parsed.verb;
        const picked = await outer.interactive.promptMqlObject(
          `${verb.charAt(0).toUpperCase()}${verb.slice(1)} what?`,
          candidates,
        );
        // (Cancelling throws PromptCancelledError, which the dispatch's
        // own catch reports; a null pick is the same answer.)
        if (picked === null) {
          outer.note({ kind: 'controller-rejected', reason: 'cancelled', detail: 'prompt cancelled' });
          return outer;
        }
        const arg = askable.command.args.find((a) => a.name === askable!.field) as
          | { prepositions?: string[] }
          | undefined;
        const prep = arg?.prepositions?.[0];
        const line = `${CommandLineApi.format(parsed)} ${prep ? `${prep} ` : ''}#${picked.stuffId}`;
        const reparsed = CommandLineApi.parsePipeline(line).commands[0];
        if (reparsed) return this._runChain(reparsed, outer);
      }
      // Every match returned a shape error: say every shape the verb has
      // (`throw <item> · throw <item> to <person> · …`), the player's
      // answer to a malformed line.
      outer.note({
        kind: 'command-rejected',
        reason: 'shape-fall-through',
        detail: matched.usage || parsed.verb,
      });
      return outer;
    }

    /**
     * ⭐ Which of the named sources the line runs from (D2). One → it. A
     * set or a count (`@inventory`, `@all watches`, `@2 watches`) → the
     * batch. A NAME matching several → the cardinality policy with
     * `onExcess: prompt`: the player is asked; a script or NPC is
     * refused `needs-input` and never waits. `null` = refused (noted).
     */
    private async _pickSources(
      scope: ScopedSources,
      outer: CommandContext,
      verb: string,
    ): Promise<Stuff[] | null> {
      const { sources, how } = scope;
      if (sources.length === 1) return sources;
      const q = how.quantity?.value;
      if (how.isSet || q?.kind === 'all') return sources;
      if (q?.kind === 'count') return sources.slice(0, Math.max(1, q.n));
      outer.verb = verb;
      const picked = await CommandApi.applyCardinalityPolicy(
        { type: 'object', onExcess: 'prompt' },
        sources,
        'source',
        outer,
        { raw: scope.raw },
      );
      if (picked === null) return null;
      if (picked.length === 0) {
        outer.note({
          kind: 'command-rejected',
          reason: 'source-not-found',
          detail: `no source chosen for '${scope.raw}'`,
        });
        return null;
      }
      return picked;
    }

    /**
     * The batch (D2): `_runChain` once per source, each its own attempt
     * ctx, every attempt's notes folded onto `outer` — one envelope for
     * the line. ⚠ An `--async` attempt fires its own late envelope.
     */
    private async _runBatch(
      parsed: ParsedCommand,
      outer: CommandContext,
      sources: Stuff[],
    ): Promise<CommandContext> {
      outer.verb = parsed.verb;
      for (const source of sources) {
        const ctx = await this._runChain(parsed, outer, source);
        if (ctx === outer) continue;
        for (const n of ctx.getNotes()) outer.note(n);
      }
      return outer;
    }

    /**
     * ③ **The other offer** (D3). When the chain settled on a refusal — a
     * field's `validator-failed` or a `controller-rejected` on the claiming
     * attempt — probe every remaining same-verb affordance from a
     * DIFFERENT source with the binder alone: `assemble` with that source
     * as `scopeSource`, a speculative `resolveModel` with no Interactive,
     * preloads, validators. The controller is never run, and nothing
     * prompts. The first that passes becomes an `other-offer` note on the
     * settled ctx, with the `@` form that names it. Returns `settled`.
     *
     * ⚠ The giver's own `self` verbs are not probed: an offer is another
     * object here answering the verb, and the giver binding itself as the
     * target is not one.
     */
    private async _otherOffer(
      parsed: ParsedCommand,
      all: Affordance[],
      settled: CommandContext,
    ): Promise<CommandContext> {
      if (detachedContexts.has(settled)) return settled;
      // ⭐ The offer is a sentence for a person: a script or an NPC has nobody
      // to read it, and every refused beat would pay the probe.
      if (!settled.interactive) return settled;
      const refused = settled.getNotes().some(
        (n) =>
          (n.kind === 'validator-failed' && n.field !== undefined) ||
          n.kind === 'controller-rejected',
      );
      if (!refused) return settled;
      const giver = this as unknown as Stuff & CommandGiver;
      const tried = settled.commandSource;
      // ⚠ Bounded, nearest first: a counter's every piece of stock offers the
      // same verb, and probing them all held one refused `repair jerkin` for
      // 48 seconds on a store floor (the crafting drive).
      let probes = 0;
      for (const a of all) {
        if (a.source === tried || a.source === giver) continue;
        if (++probes > MAX_OFFER_PROBES) break;
        if (!(await this._probeOffer(parsed, a, settled))) continue;
        const scopedForm = this._scopedFormFor(a.source);
        settled.note({
          kind: 'other-offer',
          verb: parsed.verb,
          source: MessageApi.refOf(a.source),
          scopedForm,
        });
        break;
      }
      return settled;
    }

    /** Would affordance `a` take the line, from its own source? Binder only. */
    private async _probeOffer(
      parsed: ParsedCommand,
      a: Affordance,
      settled: CommandContext,
    ): Promise<boolean> {
      const built = CommandApi.assemble(
        parsed,
        a.command,
        { commandGiver: settled.commandGiver, location: settled.location },
        { scopeSource: a.source },
      );
      if (!isAssembled(built)) return false;
      // The same view, and the source took no slot: the same line. No resolve.
      const plain =
        a.command === settled.command
          ? CommandApi.assemble(parsed, a.command, {
              commandGiver: settled.commandGiver,
              location: settled.location,
            })
          : null;
      if (plain !== null && isAssembled(plain) && JSON.stringify(plain.model) === JSON.stringify(built.model)) {
        return false;
      }
      // No `interactive`: a cardinality prompt refuses instead of asking.
      const probe = CommandApi.createCommandContext({
        commandGiver: settled.commandGiver,
        location: settled.location,
        commandText: settled.commandText,
        executionId: settled.executionId,
        commandId: settled.commandId,
        verb: parsed.verb,
        command: a.command,
        commandSource: a.source,
      });
      const resolved = await CommandApi.resolveModel(built.model, probe, built.prep, {
        speculative: true,
      });
      if (resolved.result !== undefined) return false;
      // ⭐ Another source of the SAME view whose line binds the same things is
      // the same act, not another offer: `harvest #pot` has no second answer in
      // the plant inside it, and `harvest turnip`'s first answer is no offer of
      // itself. Compared as bound, so a word two things answer to still can.
      if (plain !== null && isAssembled(plain)) {
        const line = await CommandApi.resolveModel(plain.model, probe, plain.prep, { speculative: true });
        if (line.result === undefined && sameBinding(line.resolved, resolved.resolved)) return false;
      }
      const sub = (resolved.resolved as { subcommand?: unknown }).subcommand;
      const preloads = await CommandApi.preloadValidatorDeps(
        a.command,
        probe,
        resolved.resolved,
        typeof sub === 'string' ? sub : undefined,
      );
      return CommandApi.runValidators(resolved.resolved, probe, preloads).result === undefined;
    }

    /**
     * The `@` form that names `source` for this giver, by one rule —
     * `me` · `me:i:<handle>` · `here` · `here:i:<handle>` · `<handle>`,
     * with MQL's index (`here:i:wheat:[2]`) when the handle alone is
     * ambiguous — PROVED by resolving it once. `#<id>` when no worded
     * form proves out.
     *
     * ⚠ Contents are `:i` in MQL (`me:watch` is a FEATURE of me, not a
     * thing I carry), and the natural ordinal (`2nd wheat`) desugars only
     * at the head of a query, never after a chain prefix — so the index
     * is the formal `:[n]`, which also needs no quoting.
     */
    private _scopedFormFor(source: Stuff): string {
      const giver = this as unknown as Stuff & CommandGiver;
      if (source === giver) return 'me';
      const here = MixinApi.isContainable(giver) ? giver.getContainer() : null;
      if (source === here) return 'here';
      const byId = `#${source.stuffId}`;
      const handle = MixinApi.isPerceptible(source) ? source.getPrimaryKeyword() : null;
      if (!handle) return byId;
      const base = isWithin(source, giver) ? 'me:i:' : here && isWithin(source, here) ? 'here:i:' : '';
      const resolve = (form: string): Stuff[] => {
        try {
          return MqlApi.resolveMany(form, { commandGiver: giver, scope: 'reachable' }).stuff;
        } catch {
          return [];
        }
      };
      const plain = `${base}${handle}`;
      const got = [...new Set(resolve(plain))];
      if (got.length === 1 && got[0] === source) return plain;
      const at = got.indexOf(source);
      if (at >= 0) {
        const nth = `${base}${handle}:[${at + 1}]`;
        const proved = resolve(nth);
        if (proved.length === 1 && proved[0] === source) return nth;
      }
      return byId;
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
      context: CommandContext,
      opts?: { async?: boolean }
    ): Promise<void> {
      // Controller resolution stays synchronous — a subcommand with no
      // resolvable controller rejects here, never detaching a phantom
      // body (and its envelope fires the normal sync way).
      const sub = (model as { subcommand?: string }).subcommand;
      const controllerPath = sub
        ? command.controllerForSubcommand(sub)
        : command.resolvedController;
      if (!controllerPath) {
        context.note({
          kind: 'command-rejected',
          reason: 'missing-subcommand',
          detail: command.getPrimaryVerb(),
        });
        return;
      }

      // Async: spawn the controller body detached (a fresh root frame,
      // NOT awaited) so the giver's input chain frees at accept-time.
      // The detached run owns firing the single (late) dispatch-response
      // in its `finally` — a late throw still surfaces a user-visible
      // `controller-error` envelope (never a silent log). `executeCommand`
      // skips its finish tail for this ctx (the `detachedContexts` mark).
      if (opts?.async) {
        detachedContexts.add(context);
        const causingId = context.commandId;
        runDetachedBody(causingId, context, async () => {
          let controller: CommandController | null = null;
          try {
            controller = await StuffApi.clone<CommandController>(
              controllerPath
            );
            await controller.execute(model, context);
          } catch (error: unknown) {
            const message =
              error instanceof Error ? error.message : String(error);
            context.note({
              kind: 'controller-error',
              controller: controllerPath,
              detail: message,
            });
            recordControllerThrow(controllerPath, error);
          } finally {
            if (controller) StuffApi.destruct(controller);
            emitDispatchResponse(context);
          }
        });
        return;
      }

      let controller: CommandController | null = null;
      try {
        controller = await StuffApi.clone<CommandController>(controllerPath);
        await controller.execute(model, context);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        context.note({
          kind: 'controller-error',
          controller: controllerPath,
          detail: message,
        });
        recordControllerThrow(controllerPath, error);
      } finally {
        if (controller) StuffApi.destruct(controller);
      }
    }

    /**
     * Run a pre-bound `{ command, model }` through the dispatcher's
     * bound tail — resolve → validator-preload → validators → execute —
     * minting a fresh per-command `CommandContext` and returning it
     * (with its accumulated notes). This is the scripting interpreter's
     * dispatch primitive: a scripted command is resolved (scope
     * re-checked), validated, and executed exactly like a typed one,
     * but the envelope is the script driver's to assemble (the run
     * aggregates per-statement notes), not this method's.
     *
     * Distinct from the inline `bound` branch in `executeCommand` (which
     * runs on the outer ctx and emits the envelope); this mints its own
     * ctx so each scripted statement carries its own attribution + note
     * set. Mirrors that branch's resolve/validate/execute sequence.
     */
    async _dispatchBound(
      command: CommandDefinition,
      model: CommandModel,
      prep: Record<string, string> = {},
      source?: Stuff
    ): Promise<CommandContext> {
      const giver = this as unknown as Stuff & CommandGiver;
      const location = MixinApi.isContainable(giver)
        ? giver.getContainer()
        : null;
      const ctx = CommandApi.createCommandContext({
        commandGiver: giver,
        location,
        commandText: '',
        executionId: SecurityApi.uuid(),
        commandId: SecurityApi.uuid(),
        verb: command.getPrimaryVerb(),
        command,
        // ⭐ A scripted `verb@source` names its source; otherwise the giver.
        commandSource: source ?? giver,
      });
      const resolved = await CommandApi.resolveModel(model, ctx, prep);
      if ('result' in resolved) return ctx;
      const subcommand =
        typeof (resolved.resolved as { subcommand?: unknown }).subcommand ===
        'string'
          ? (resolved.resolved as { subcommand?: string }).subcommand
          : undefined;
      const preloads = await CommandApi.preloadValidatorDeps(
        command,
        ctx,
        resolved.resolved,
        subcommand
      );
      const validated = CommandApi.runValidators(
        resolved.resolved,
        ctx,
        preloads
      );
      if ('result' in validated) return ctx;
      await this._executeOne(command, resolved.resolved, ctx);
      return ctx;
    }
  }
  return CommandGiverMixin;
}
