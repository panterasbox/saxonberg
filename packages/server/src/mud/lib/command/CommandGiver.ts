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
 * ⭐ Every mutation pokes `WhichSource` (the which build): what the line
 * accepts just changed, so a kept `which` card re-reads. A poke with no
 * subscriber stands nothing up. The client is otherwise sent nothing — the
 * `shell.control` schema push it never read was retired by the which build
 * (a frame per verb per mover per person in the room had been half of what
 * a crowd cost, controllers-are-io D27).
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
import { PerceptionApi } from '../../api/perception';
import { MqlApi } from '../../api/mql';
import { MessageApi } from '../../api/message';
import { PromptApi, PromptCancelledError } from '../../api/prompt';
import type { EnvelopeTemplate } from '@saxonberg/types';
import { SUBSCRIPTION_SOURCES } from '@saxonberg/types';
import { SubscriptionApi } from '../../api/subscription';
import { MixinApi } from '../../api/mixin';
import { ShellApi } from '../../api/shell';
import type { Alias } from '../shell/Alias';
import { StuffApi } from '../../api/stuff';
import { DiagnosticApi } from '../../api/diagnostics';
import { PlayerApi } from '../../api/player';
import { AccessApi } from '../../api/access';
import type { CommandController } from './CommandController';
import { CommandDefinition } from './CommandDefinition';
import { CallSecurity, Final, Unshadowable } from '../security/decorators';
import { SecurityPolicies } from '../security/SecurityPolicies';
import { Refusal } from '../errors';
import type { AugmentRefusal } from '../augmentation/Augment';
import { ExecutionContextApi, FrameKind, OMNI_SCOPE } from '../../api/execution-context';
import { ProxyApi } from '../../api/proxy';
import { MudlogApi } from '../../api/mudlog';
import { Mml } from '../../api/mml';
import { EventApi } from '../../api/event';
import { WorldClockApi } from '../../api/worldclock';
import { ScriptApi } from '../../api/script';
import { CommandDispatchedEvent } from '../events/CommandDispatchedEvent';
import type { Sensor } from '../message/Sensor';
import type Interactive from '../../platform/idea/Interactive';
import type { LogLevel, Note, RefusedNote } from '@saxonberg/types';

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
function proseForFrameworkNote(note: Note): string | Mml | null {
  switch (note.kind) {
    case 'command-rejected': {
      // ⭐ The quote hint (controller-liquidity D3): the fitted line is a
      // link — the player taps the form that would have run.
      if (note.reason === 'bind-failed' && note.suggestion) {
        const link = Mml.link(`mudcmd:${encodeURIComponent(note.suggestion)}`, note.suggestion);
        return Mml.compose`Too many words — quote a name with a space in it: ${link}`;
      }
      // ⭐ Worded from their rows by the emit sweep (failure-model D4).
      if (ROWED_REJECTIONS.has(note.reason)) return null;
      // `reason` is enum; pair with `detail` when present.
      const tail = note.detail ? `: ${note.detail}` : '';
      switch (note.reason) {
        case 'unknown-verb': {
          // ⭐ The old `source::verb` spelling is told the new one, once
          // (naming overhaul D-B8 — `@` is a player address now).
          const old = /^([^@\s]+)@(.+)$/.exec(note.detail ?? '');
          if (old) return `I don't understand '${note.detail}' — a source comes first now: ${old[2]}::${old[1]}.`;
          return `I don't understand '${note.detail ?? '?'}'.`;
        }
        case 'shape-fall-through':
          return `That doesn't match any known command shape${tail}.`;
        case 'missing-subcommand':
          return `Missing subcommand${tail}.`;
        // ⭐ `source::verb` and the fail-closed script: the detail is
        // already the sentence.
        case 'source-not-found':
        case 'source-affords-nothing':
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
    // ⭐ The detail is the defect's worded sentence (`CommandApi.
    // reportFailure`) — never the exception's own text.
    case 'controller-error':
      return note.detail;
    default:
      return null;
  }
}

/**
 * ⭐ Word one `refused` note from its row and say it to the giver. With
 * `at` (a script stopped at that line), the line is the `script-stopped`
 * row's, carrying the refusal's own sentence as its `why`. A code no row
 * ships says `went-wrong` and records a diagnostic.
 */
async function sayRefusal(giver: Stuff & Sensor, ctx: CommandContext, note: RefusedNote): Promise<void> {
  let line: Mml;
  let topic = 'shell.error';
  try {
    const worded = await CommandApi.wordReason(note.reason, note.facts);
    if (worded !== null) {
      line = worded.line;
      topic = worded.topic;
    } else {
      void DiagnosticApi.record({
        path: ctx.command?.resolvedController ?? null,
        message: `refusal '${note.reason}' has no reason row`,
        stack: null,
      }).catch(() => undefined);
      line = (await CommandApi.wordReason('went-wrong', {}))?.line ?? Mml.compose`Something went wrong.`;
    }
    if (note.at !== undefined) {
      const stopped = await CommandApi.wordReason('script-stopped', { line: note.at, why: line });
      if (stopped !== null) {
        line = stopped.line;
        topic = stopped.topic;
      }
    }
  } catch (err: unknown) {
    // @quiet the rows could not be read (the store is down): say the
    // plainest thing, and let the developer see why in the log.
    console.error('[dispatch] could not word a refusal', note.reason, err);
    line = Mml.compose`That didn't work.`;
  }
  MessageApi.scene(giver).topic(topic).toSelf(line).send();
}

/**
 * The dispatcher's rejections that have reason rows (failure-model D4): a
 * script's `on parse-failed` handles them as it handles any refusal. The
 * other six stay on the legacy arms above.
 */
const ROWED_REJECTIONS: ReadonlySet<string> = new Set(['needs-input', 'parse-failed', 'bind-failed']);

/**
 * Word a rowed `command-rejected` note (D4) and say it; a `suggestion` on
 * it is appended as the line to tap.
 */
async function sayRejection(giver: Stuff & Sensor, note: Extract<Note, { kind: 'command-rejected' }>): Promise<void> {
  let line: Mml;
  try {
    const worded = await CommandApi.wordReason(note.reason, note.detail ? { detail: note.detail } : {});
    line = worded?.line ?? Mml.compose`That didn't work${note.detail ? `: ${note.detail}` : ''}.`;
  } catch (err: unknown) {
    // @quiet the row could not be read: the plain line is said instead.
    console.error('[dispatch] could not word a rejection', note.reason, err);
    line = Mml.compose`That didn't work${note.detail ? `: ${note.detail}` : ''}.`;
  }
  if (note.suggestion) {
    const link = Mml.link(`mudcmd:${encodeURIComponent(note.suggestion)}`, note.suggestion);
    line = Mml.compose`${line} Did you mean ${link}?`;
  }
  MessageApi.scene(giver).topic('shell.error').toSelf(line).send();
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

/** `parsed` without its `source::verb` scope (a batch's per-source re-run). */
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


/**
 * Assemble + fire the single dispatch-response envelope for a completed
 * dispatch (the finish tail extracted from `executeCommand`). Runs the
 * framework-failure prose sweep, then sends the typed-note envelope +
 * `prompt-refresh`. Behaviour-preserving for the sync path; for an async
 * command the detached body calls this in its `finally` so the one
 * (late) envelope carries the body's accumulated notes + final status.
 */
async function emitDispatchResponse(ctx: CommandContext): Promise<void> {
  const giverAsStuff = ctx.commandGiver as unknown as Stuff;
  // ⭐⭐ One pass, in note order (failure-model D4): a `refused` note — and
  // the three rowed dispatcher rejections — is worded HERE from its reason's
  // row (the controller handed over the code and the facts and said
  // nothing); any other framework note by the dispatcher's own prose. Note
  // order is the order things happened, so a defect's sentence comes before
  // the line saying where a script stopped. Controller-side notes are
  // skipped (controllers fire their own scenes).
  if (MixinApi.isSensor(giverAsStuff)) {
    const sensor = giverAsStuff as Stuff & Sensor;
    for (const note of ctx.getNotes()) {
      if (note.kind === 'refused') {
        await sayRefusal(sensor, ctx, note);
        continue;
      }
      if (
        note.kind === 'command-rejected' &&
        ROWED_REJECTIONS.has(note.reason) &&
        // the quote hint keeps its own sentence (controller-liquidity D3)
        !(note.reason === 'bind-failed' && note.suggestion)
      ) {
        await sayRejection(sensor, note);
        continue;
      }
      const prose = proseForFrameworkNote(note);
      if (prose === null) continue;
      MessageApi.scene(sensor)
        .topic('shell.error')
        .toSelf(prose instanceof Mml ? prose : Mml.compose`${prose}`)
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
  // ⭐ Rooted AT the giver (call-security pass): the detached body's
  // controller is the giver's own, exactly as on the synchronous path, and
  // `CommandController.execute` admits only the giver its context names.
  void ExecutionContextApi.runRoot(ctx.commandGiver, 'executeAsyncBody', () => {
    ExecutionContextApi.tagCurrentFrame(FrameKind.Command);
    ExecutionContextApi.updateCurrentFrameMetadata({
      commandContext: ctx,
      causingCommandId: causingId,
      forced: false,
    });
    return fn();
  }, { acting: { actor: ctx.commandGiver } });
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
 * ⭐ What a `source::verb` named, after the scope filter: every resolved
 * candidate that affords the verb, in resolver order, and how the scope
 * named them (a set, a count, a name) — the cardinality `how`.
 */
export interface ScopedSources {
  /** The scope as typed before the `::`. */
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
 * `source::verb`. `ok: false` — the scope refused the line; `note` says
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
   * filter and the `source::verb` scope filter (D2). Synchronous.
   */
  matchAffordances(parsed: ParsedCommand): AffordanceMatch;
  executeCommand(
    commandText: string,
    opts?: ExecuteCommandOpts
  ): Promise<void>;
  /**
   * The sources whose verbs sit on this giver's recency stack in `bucket`
   * — for `environment`, everything this body carries at any depth that
   * affords a verb outward (kept exact on every move by the containment
   * chokepoint). A read of the stack; the `'self'` sentinel is excluded.
   */
  getCommandSources(bucket: RecencyBucket): Stuff[];
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
   * orchestration (the hosted-app delta) can guarantee the `'self'`
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
    source?: Stuff,
    line?: string
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
 * ⭐ The record of a keeper driving a body: a `force` diagnostic at the
 * body's row (its keepers read it in `errors`), and — when somebody else
 * owns the body as chattel (a pet, a beast) — one at the owner's home, so
 * the owner is told who made their animal do what.
 */
async function recordDrive(body: Stuff, compeller: Compeller, line: string): Promise<void> {
  const what = `${compeller.name} made ${body.getIdentityPath() ?? body.getTemplatePath() ?? 'a body'} run \`${line}\``;
  const rows: Array<{ path: string | null }> = [{ path: body.getTemplatePath() }];
  if (MixinApi.isChattel(body)) {
    const owner = await body.chattelOwner().catch(() => null);
    if (owner?.kind === 'player') {
      const id = owner.templatePath.slice(owner.templatePath.lastIndexOf('/') + 1);
      const actorPath = (compeller.actor as Stuff | null)?.getIdentityPath() ?? null;
      if (owner.templatePath !== actorPath) rows.push({ path: `/home/${id}` });
    }
  }
  for (const { path } of rows) {
    await DiagnosticApi.record({ path, channel: 'force', severity: 'info', message: what }).catch(() => undefined);
  }
}

/** Who compelled a command, as the gate reads it (call-security pass D8). */
interface Compeller {
  /** The acting person or object; `null` when nobody is acting. */
  actor: unknown | null;
  /** Its name for a diagnostic. */
  name: string;
  /** Running in a sandbox circle or a governed `eval` (D14). */
  sandboxed: boolean;
}

/**
 * ⭐ Is `giver` being asked to run a command by somebody else's code? `null`
 * when it is the giver's own act: it is acting already (its brain, its
 * player's line, a continuation it started), the system is acting, or the
 * call came from the giver's own code — the caller of `executeCommand`,
 * looking past the giver's own `forceCommand` (an arrival reflex, a login
 * `embody`, the socket root). Identity as in `requireActor`: the same
 * object, never an id. Read before the command frame is tagged.
 */
function compelledBy(giver: Stuff): Compeller | null {
  if (ExecutionContextApi.actingSystem() !== null) return null;
  const self = ProxyApi.identityOf(giver);
  const actor = ExecutionContextApi.getActor();
  if (actor != null && ProxyApi.identityOf(actor) === self) return null;
  const stack = ExecutionContextApi.getCallStack();
  let i = stack.length - 1;
  let caller: unknown = stack[i]?.caller ?? null;
  while (
    i > 0 &&
    stack[i - 1]!.method === 'forceCommand' &&
    ProxyApi.identityOf(stack[i - 1]!.target) === self
  ) {
    i -= 1;
    caller = stack[i]!.caller;
  }
  if (caller != null && ProxyApi.identityOf(caller) === self) return null;
  const scope = ExecutionContextApi.getCircleScope();
  return {
    actor: actor ?? null,
    name: actor == null ? 'nobody' : ((actor as Stuff).getIdentityPath() ?? 'something'),
    sandboxed: (scope !== null && scope !== OMNI_SCOPE) || ExecutionContextApi.getJurisdictionBound() !== null,
  };
}

/** A device's refusal, as the aether rows word it (aether-devices D8). */
const DEVICE_REFUSAL_ROWS: Readonly<Record<AugmentRefusal, string>> = {
  'not-borne': 'aether-none',
  packed: 'aether-packed',
  off: 'aether-off',
  dead: 'aether-dead',
  'not-yours': 'aether-not-yours',
};

/**
 * Why the DEVICE hosting the app that lent this affordance will not run
 * it now (stream arrival D16), or null — an affordance from anything else,
 * or from an app on a person or on a working device, is never refused.
 *
 * @nothing the affordance was not lent by an app on a device, or the device
 * runs: there is no device refusal, and the match proceeds.
 */
function lentDeviceRefusal(source: unknown): Refusal | null {
  if (source === 'self' || source === null || typeof source !== 'object') return null;
  const s = source as Stuff;
  if (!MixinApi.isAetherHosted(s)) return null;
  const host = s.getHost();
  if (!host || MixinApi.isCommandGiver(host) || !MixinApi.isAugment(host)) return null;
  const why = host.conferralRefusal();
  return why === null ? null : new Refusal(DEVICE_REFUSAL_ROWS[why], {});
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

    getCommandSources(bucket: RecencyBucket): Stuff[] {
      const out: Stuff[] = [];
      for (const e of this._commandStack) {
        if (e.bucket === bucket && e.source !== 'self' && !out.includes(e.source)) {
          out.push(e.source);
        }
      }
      return out;
    }

    /** Monotonic sequence allocator for stack entries. */
    private _commandSeq = 0;

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
      this._seedHostedAppSources();
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
     * ⭐ The verb filter, then the `source::verb` scope filter (D2). The
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
        resolved = MqlApi.resolveMany(ShellApi.expandQueryAliases(parsed.scope, giver), { commandGiver: giver, scope: '~reachable' });
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
      // ⭐ Only what the giver perceives can be the source they named (D23).
      const named = [...new Set(PerceptionApi.perceived(giver, resolved.stuff, resolved.ordinal))];
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
      // helpers, ad-hoc scripts): surface any apps' verbs
      // even when the host gained them outside a host/unhost delta.
      // Idempotent — `pushCommandSource` dedupes by (source, bucket).
      this._seedHostedAppSources();
    }

    /**
     * Push each app's `self`-bucket command contributions
     * onto this giver's recency stack, with the update Stuff as the
     * affording source (so `getAffordances()` resolves `commandSource`
     * to the update — the "verb dispatch routes through the
     * augment/update" pattern). Idempotent. No-op for a non-host.
     *
     * @internal
     */
    private _seedHostedAppSources(): void {
      const giver = this as unknown as Stuff;
      for (const { source, defs } of CommandApi.collectHostedAppDefs(
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
      SubscriptionApi.poke(SUBSCRIPTION_SOURCES.which, this as unknown as Stuff);
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
      const before = this._commandStack.length;
      this._commandStack = this._commandStack.filter((e) => e.source !== source);
      if (this._commandStack.length !== before) SubscriptionApi.poke(SUBSCRIPTION_SOURCES.which, this as unknown as Stuff);
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
      SubscriptionApi.poke(SUBSCRIPTION_SOURCES.which, this as unknown as Stuff);
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

    /**
     * ⭐ A command another body's code asked of this one (call-security pass
     * D8–D9). Refused outright unless every verb that could claim the line
     * is compellable with consent on BOTH keys — the view's `compellable:`
     * and its controller class's `static compellable` — and then this body's
     * OWN player is asked, worded by the engine from the line after this
     * body's aliases. Nobody to ask is `cannot-consent`; no is
     * `compel-declined`. Every refusal is THROWN to the compelling code,
     * before any validator, binder or controller has run. Code with nobody
     * acting, or sandboxed code (`eval`, a circle), never compels (D14).
     */
    @CallSecurity(SecurityPolicies.SelfOnly)
    async _askCompelled(commandText: string, compeller: Compeller): Promise<Interactive | undefined> {
      // The compeller is the gate's own read of who is acting; proven here,
      // so the method answers for nobody else (and only the giver calls it).
      AccessApi.requireActor(compeller.actor as Stuff | null);
      const giver = this as unknown as Stuff & CommandGiver;
      const refuse = (reason: string, why: string): never => {
        void DiagnosticApi.record({
          path: ExecutionContextApi.getActingCodePath(),
          channel: 'call-security',
          severity: 'warning',
          message: `${why}: ${compeller.name} tried to make ${giver.getIdentityPath() ?? 'a body'} run \`${commandText}\``,
        }).catch(() => undefined);
        throw new Refusal(reason, { who: giver });
      };
      if (compeller.actor === null) return refuse('not-compellable', 'compelled with nobody acting');
      if (compeller.sandboxed) return refuse('not-compellable', 'compelled from sandboxed code');
      // ⭐⭐ The KEEPER drives a body nobody plays (owner ruling 2026-11-19):
      // whoever holds title over an NPC's or an animal's ROW authored its
      // mind, and may make it do anything — no consent to ask, no never-list
      // (a player's body is never theirs to drive). Ownership of a pet is
      // title to a THING, not its will: the owner does not drive it, and is
      // told when its keeper does. Every drive is recorded.
      if (!PlayerApi.isAvatarStuff(giver)) {
        const row = giver.getTemplatePath();
        const keeper = row !== null && (await AccessApi.canAtPath(compeller.actor as Stuff, 'write-template', row));
        if (!keeper) return refuse('cannot-consent', `drove a body whose row it does not keep`);
        await recordDrive(giver, compeller, commandText);
        return undefined;
      }
      const parser = await resolveActorParser(giver);
      const parsed = await parser.parse(commandText, {
        commandGiver: giver,
        location: MixinApi.isContainable(giver) ? giver.getContainer() : null,
        available: this.getAvailableCommands(),
      });
      if (!parsed.parsed) return refuse('not-compellable', 'compelled a line that is not one command');
      let line = parsed.parsed;
      let lineText = commandText;
      if (MixinApi.isAlias(giver)) {
        const expanded = ShellApi.expandAliases(line, giver as Stuff & Alias);
        line = expanded.parsed;
        if (expanded.expansion) lineText = expanded.expansion.expandedText;
      }
      const second = line.rawTokens[1];
      const word = second && second.kind === 'word' ? second.value.toLowerCase() : undefined;
      const claimants = this.getAvailableCommands().filter((d) => d.verbs.includes(line.verb));
      if (claimants.length === 0) return refuse('not-compellable', 'compelled a verb this body has not got');
      for (const d of claimants) {
        const sub = word !== undefined && d.getSubcommand(word) ? word : undefined;
        if (d.compellableFor(sub) !== 'consent') return refuse('not-compellable', 'compelled a never-verb');
        const path = sub !== undefined ? d.controllerForSubcommand(sub) : d.resolvedController;
        if (!path) return refuse('not-compellable', 'compelled a verb with no controller');
        // ⭐ The second key: the CLASS must agree (D11) — a view alone is
        // content anyone with title can save.
        const controller = await StuffApi.clone<CommandController>(path);
        const agrees = (controller.constructor as { compellable?: unknown }).compellable === true;
        await StuffApi.destruct(controller);
        if (!agrees) return refuse('not-compellable', `the view at ${d.filePath} says consent and ${path} does not`);
      }
      const interactive = MixinApi.isHasInteractive(giver) ? [...giver.getInteractives()][0] : undefined;
      if (!interactive) throw new Refusal('cannot-consent', { who: giver });
      const asker = compeller.actor as Stuff;
      let yes = false;
      try {
        yes = await interactive.promptConfirm(
          // ⭐ As THIS body knows the asker (recognition-aware) — the realtor
          // is "a land agent" to someone he has not introduced himself to;
          // the drive found the name leaking through the presentation.
          `${asker.describeFor(giver)} would have you run \`${lineText}\`. Let them?`,
          'no',
        );
      } catch {
        // @quiet a prompt that ends unanswered (cancelled, disconnected) is a no.
        yes = false;
      }
      if (!yes) throw new Refusal('compel-declined', { who: giver });
      return interactive;
    }

    async executeCommand(
      commandText: string,
      opts: ExecuteCommandOpts = {}
    ): Promise<void> {
      // ⭐⭐ The compulsion gate (call-security pass D8) — read BEFORE this
      // frame is tagged, so "who is acting" is still whoever asked.
      const compeller = compelledBy(this as unknown as Stuff);
      if (compeller !== null) {
        // ⭐ Once its player has said yes, the command's outcome — a
        // refusal included — is THEIRS to read: it reports to the client
        // that consented (a forced command had no client to report to, and
        // the walk found a refused purchase saying nothing at all).
        const consented = await this._askCompelled(commandText, compeller);
        opts = { ...opts, interactive: opts.interactive ?? consented };
      }
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
            ...(parseResult.suggestion !== undefined ? { suggestion: parseResult.suggestion } : {}),
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
              throw new Refusal('parse-failed', { detail: `${head.word} must lead a command word` });
            }
            if (detach) {
              detachedContexts.add(outer);
              runDetachedBody(outer.commandId, outer, async () => {
                try {
                  await ScriptApi.runAst(script);
                } catch (error: unknown) {
                  await CommandApi.reportFailure(error, outer, 'script');
                } finally {
                  await emitDispatchResponse(outer);
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
        if (error instanceof PromptCancelledError) {
          claimingCtx.note({
            kind: 'controller-rejected',
            reason: error.reason === 'host-disconnected'
              ? 'host-disconnected'
              : 'cancelled',
            detail: `prompt ${error.reason}`,
          });
        } else {
          // The throw can originate inside a controller's execute(),
          // inside resolveAndValidate, or anywhere else. Attribute to
          // whichever context is currently flowing through the chain;
          // the one routine classifies it (a refusal, a content error, a
          // bug) and words it — never with the exception's own text.
          await CommandApi.reportFailure(
            error,
            claimingCtx,
            outer.command?.resolvedController ?? null,
          );
        }
      }

      // Fire the dispatch-response envelope — assembling the framework-
      // failure prose sweep + typed-note envelope + prompt-refresh (see
      // `emitDispatchResponse`). EXCEPT when an async command detached
      // its controller body in `_executeOne`: then the detached run owns
      // firing the single (late) envelope once the body completes, so we
      // fire nothing here at accept-time.
      if (!detachedContexts.has(claimingCtx)) {
        await emitDispatchResponse(claimingCtx);
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
      // the blessed consumers may listen. The optional location templatePath
      // and actor identity feed the producer faucet's credit routing; the
      // consumer tap ignores them. See docs/subsystems/participation.md.
      if (args.verb !== undefined && args.originInteractiveId !== undefined) {
        EventApi.fire(
          new CommandDispatchedEvent({
            subjectId: giverAsStuff.stuffId,
            commandId: args.dispatchId,
            at: WorldClockApi.getNow().rawValue(),
            realAt: Date.now(),
            locationTemplatePath:
              args.location?.getTemplatePath() ?? undefined,
            // The person, never the lineage: every player body is cloned
            // from one row, so a lineage actor is every player at once.
            actorIdentityPath: giverAsStuff.getIdentityPath() ?? undefined,
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
    /** ⭐ The giver's own dispatch only (call-security pass): a side door around the compulsion gate otherwise. */
    @CallSecurity(SecurityPolicies.SelfOnly)
    async _runChain(
      parsed: ReturnType<typeof CommandLineApi.parsePipeline>['commands'][0],
      outer: CommandContext,
      scopeSource?: Stuff
    ): Promise<CommandContext> {
      // ── ① The scope filter (`source::verb`, D2) — FIRST, so the chain
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
      const sourced = scopeSource
        ? allMatches.filter((a) => affordsFrom(a, scopeSource!, giverStuff))
        : allMatches;
      // ⭐ A view of subcommands (no fallthrough) is tried before the
      // verb's SHAPES (controller-liquidity W7a, build): its words are
      // claimed first wherever its host listed it, so `watch horizon` is
      // never a stream called "horizon", and a word it does not know falls
      // on to the shapes (below). A stable sort: every other view keeps
      // its contribution order. `lint:verb-collisions` reads the same rule.
      const subcommandsFirst = (a: Affordance): number =>
        a.command.hasSubcommands() && !a.command.fallthrough ? 0 : 1;
      const ordered = [...sourced].sort((a, b) => subcommandsFirst(a) - subcommandsFirst(b));
      // ⭐⭐ **Held, never silent** (stream arrival D16): a verb lent by an
      // app on a DEVICE whose device will not run right now (off, dead,
      // packed, not yours) is passed over for the verb's other offer — the
      // desk, an app on a second device. With no other offer the command
      // is refused with that device's row, which names the fix. In the
      // dispatcher, so no app author can forget it; it moves nothing and
      // chooses nothing the player cannot see with `affordances`.
      let deviceRefusal: Refusal | null = null;
      const matches = ordered.filter((a) => {
        const why = lentDeviceRefusal(a.source);
        if (why === null) return true;
        deviceRefusal ??= why;
        return false;
      });
      if (matches.length === 0 && deviceRefusal !== null) {
        outer.verb = parsed.verb;
        outer.refuse(deviceRefusal);
        return outer;
      }
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
              // ⭐ An emote to someone elsewhere needs a tuner at both ends
              // (aether-devices D7, D8): the sender's half is asked here,
              // and a line that cannot go is HELD whole and re-run when it
              // can. Within the room nothing is asked — the room carries it.
              if (
                bound.target &&
                !speaker.sharesPlaceWith(bound.target) &&
                MixinApi.isComms(speaker)
              ) {
                const refusal = speaker.sendOrHold(outer.commandText);
                if (refusal) {
                  // The reason's row words it (failure-model D11).
                  outer.refuse(refusal);
                  return outer;
                }
              }
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
      /** ⭐ The first view that would have fit with one name quoted (D3). */
      let quoteHint: string | undefined;
      let quoteLine: string | undefined;
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
            if (quoteHint === undefined && built.quoteHint !== undefined) {
              quoteHint = built.quoteHint;
              quoteLine = built.quoteLine;
            }
            continue; // fall through
          }
          // ⭐ A word this view's subcommands do not know is a question for
          // the verb's next SHAPE, when it has one (controller-liquidity
          // W7a, build): `watch horizon` is `watch.yaml`'s subcommand and
          // `watch shroud` is `watch-stream.yaml`'s shape, so `watch.yaml`
          // not knowing `shroud` must not end the line. The LAST view's
          // unknown word still refuses, naming the valid words — so a verb
          // with one view is unchanged — and when every later view
          // shape-fails too, the refusal lists every shape the verb has.
          if (
            built.error === 'unknown-subcommand' &&
            affordance !== matches[matches.length - 1]
          ) {
            continue;
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
          } else if (built.refusal !== undefined) {
            // ⭐ A slot whose value will not do refuses with its own row
            // (`bad-duration`, naming overhaul D-C6), worded at emit.
            outer.refuse(new Refusal(built.refusal.reason, built.refusal.facts));
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
      // ⭐ Every match returned a shape error, and one of them would have
      // fit with a multi-word name quoted: say THAT (D3) — it is the
      // player's actual mistake, and the fix is in the sentence.
      if (quoteHint !== undefined) {
        outer.note({
          kind: 'command-rejected',
          reason: 'bind-failed',
          detail: quoteHint,
          ...(quoteLine !== undefined ? { suggestion: quoteLine } : {}),
        });
        return outer;
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
     * settled ctx, with the `source::verb` form that names it. Returns `settled`.
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
     * The source form (`<source>::verb`) that names `source` for this giver, by one rule —
     * `me` · `me:i:<handle>` · `me:e` · `me:e:i:<handle>` · `<handle>`,
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
      // ⭐ What immediately holds you is `me:e` (naming overhaul D-B3: `~here`
      // is the enclosing PLACE, which may lie past a boat or a bed).
      if (source === here) return 'me:e';
      const byId = `#${source.stuffId}`;
      const handle = MixinApi.isPerceptible(source) ? source.getPrimaryKeyword() : null;
      if (!handle) return byId;
      // A source the giver does not perceive is never offered by its word.
      // ⚠ The `:[n]` below indexes MQL's UNIVERSAL list (D23), so the proof
      // resolves unfiltered — the index means the same for everyone.
      if (!PerceptionApi.perceives(giver, source)) return byId;
      const base = isWithin(source, giver) ? 'me:i:' : here && isWithin(source, here) ? 'me:e:i:' : '';
      const resolve = (form: string): Stuff[] => {
        try {
          return MqlApi.resolveMany(form, { commandGiver: giver, scope: '~reachable' }).stuff;
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
    /** ⭐ The giver's own dispatch only (call-security pass): a side door around the compulsion gate otherwise. */
    @CallSecurity(SecurityPolicies.SelfOnly)
    async _executeOne(
      command: CommandDefinition,
      model: CommandModel,
      context: CommandContext,
      opts?: { async?: boolean }
    ): Promise<void> {
      // Controller resolution stays synchronous — a subcommand with no
      // resolvable controller rejects here, never detaching a phantom
      // body (and its envelope fires the normal sync way).
      const sub = model.subcommand;
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
            await CommandApi.reportFailure(error, context, controllerPath);
          } finally {
            if (controller) controller.releaseAfterDispatch();
            await emitDispatchResponse(context);
          }
        });
        return;
      }

      let controller: CommandController | null = null;
      try {
        controller = await StuffApi.clone<CommandController>(controllerPath);
        await controller.execute(model, context);
      } catch (error: unknown) {
        await CommandApi.reportFailure(error, context, controllerPath);
      } finally {
        if (controller) controller.releaseAfterDispatch();
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
      source?: Stuff,
      line = ''
    ): Promise<CommandContext> {
      const giver = this as unknown as Stuff & CommandGiver;
      const location = MixinApi.isContainable(giver)
        ? giver.getContainer()
        : null;
      const ctx = CommandApi.createCommandContext({
        commandGiver: giver,
        location,
        // The script line, so a stop can name it (failure-model D5).
        commandText: line,
        scriptLine: line,
        executionId: SecurityApi.uuid(),
        commandId: SecurityApi.uuid(),
        verb: command.getPrimaryVerb(),
        command,
        // ⭐ A scripted `source::verb` names its source; otherwise the giver.
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
