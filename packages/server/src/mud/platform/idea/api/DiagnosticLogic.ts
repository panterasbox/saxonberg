// DiagnosticLogic — the hot-reloadable logic singleton behind
// DiagnosticApi. (Doc comment on the class so @internal lands on the
// reflection.)

import { ApiLogic } from '../../../lib/stuff/ApiLogic';
import { CallSecurity, Unshadowable } from '../../../lib/security/decorators';
import { SecurityPolicies } from '../../../lib/security/SecurityPolicies';
import type { Stuff } from '../../../lib/stuff/Stuff';
import type {
  DiagnosticDoc,
  DiagnosticListFilter,
  RuntimeDiagnostic,
  RawDiagnostic,
  DiagnosticEvent,
} from '@saxonberg/types';
import { Collections } from '../../../lib/persistence/Collections';
import { PersistApi } from '../../../api/persist';
import { ExecutionContextApi } from '../../../api/execution-context';
import { AccessApi } from '../../../api/access';
import { PackApi } from '../../../api/pack';
import { GroupApi } from '../../../api/group';
import { CompactApi } from '../../../api/compact';
import { ProvenanceApi } from '../../../api/provenance';
import { EventApi, Events } from '../../../api/event';
import { StuffApi } from '../../../api/stuff';
import { MixinApi } from '../../../api/mixin';
import { MudlogApi } from '../../../api/mudlog';
import { Mml } from '../../../api/mml';
import { DiagnosticChannel } from '../../../lib/diagnostics/DiagnosticChannel';

const DiagnosticApiCallers = SecurityPolicies.FromModule(
  '/api/diagnostics#DiagnosticApi'
);

/** Row lifetime in the store (TTL anchor); uniform across severities in v1. */
const TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const DEFAULT_LIMIT = 50;

/** Persistence is a no-op unless Mongo is connected (tests, pre-boot). */
function connected(): boolean {
  return PersistApi.isConnected();
}

/** The context-derived actor for the read gates (never a passed value). */
/** Is `subject` on the maintainers group of pack `id`? (An organization-maintained pack: its staff-or-head.) */
async function maintainsPack(subject: Stuff, id: string): Promise<boolean> {
  const info = await PackApi.maintainersOf(id);
  if (!info) return false;
  const m = info.maintainers;
  if ('organization' in m) {
    return AccessApi.canAtPath(subject, 'read', m.organization);
  }
  const key = subject.getIdentityPath?.() ?? subject.getTemplatePath();
  if (!key) return false;
  const group = await (await GroupApi.registry()).managed().findByName(m.group);
  return !!group?._id && (await GroupApi.isMember(key, `managed:${group._id}`));
}

function actor(): Stuff | null {
  return (ExecutionContextApi.getActingAuthor() as Stuff | null) ?? null;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Build a persisted row from resolved parts. */
function makeRow(
  parts: Omit<DiagnosticDoc, '_id' | 'ts' | 'expiresAt'>
): DiagnosticDoc {
  const now = Date.now();
  return { ...parts, ts: now, expiresAt: new Date(now + TTL_MS) };
}

async function insert(row: DiagnosticDoc): Promise<void> {
  await PersistApi.save(
    Collections.Diagnostics,
    row as unknown as Record<string, unknown>
  );
}

/** Fire the per-row event the author-push router (and future subscribers) consume. */
function fire(row: DiagnosticDoc): void {
  const ev: DiagnosticEvent = {
    source: row.source,
    channel: row.channel,
    path: row.path,
    author: row.author,
    severity: row.severity,
    message: row.message,
    ts: row.ts,
  };
  EventApi.emit(Events.Diagnostic, ev);
}

/** Resolve an online Avatar for an author `templatePath`; undefined = offline. */
function onlineAuthor(authorPath: string): Stuff | undefined {
  try {
    return StuffApi.findByTemplatePath(authorPath) as Stuff | undefined;
  } catch {
    return undefined;
  }
}

/** The ops fallback for an unstaffed pack's diagnostics: the executive. */
const EXECUTIVE = '/compact/executive';

/** One frame to one online recipient — best-effort, never throws. */
function pushTo(av: Stuff, ev: DiagnosticEvent): void {
  if (!MixinApi.isSensor(av)) return;
  try {
    MudlogApi.error(
      `diagnostic.${ev.channel}`,
      Mml.text(`⚠ ${ev.channel}: ${ev.message}`),
      { to: av, payload: ev }
    );
  } catch {
    // delivery is best-effort; a failed push never loses the stored row.
  }
}

/**
 * Who a pack channel's diagnostic goes to (content-packs wave 3, D7): the
 * pack's maintainers — its group's online members, or an organization's
 * staff and head — else the executive (`/compact/executive`'s committee).
 */
async function packRecipients(packId: string): Promise<Stuff[]> {
  const info = await PackApi.maintainersOf(packId);
  const m = info?.staffed ? info.maintainers : null;
  if (m && 'group' in m) {
    const group = await (await GroupApi.registry()).managed().findByName(m.group);
    return group?._id ? GroupApi.membersOf(`managed:${group._id}`) : [];
  }
  return CompactApi.committeeMembersOf(m && 'organization' in m ? m.organization : EXECUTIVE);
}

/** Best-effort push — store-is-truth, push-is-courtesy. A pack channel routes to its maintainers; anything else to the author. */
function pushToAuthor(ev: DiagnosticEvent): void {
  if (ev.channel.startsWith('pack.')) {
    void packRecipients(ev.channel.slice('pack.'.length))
      .then((who) => { for (const av of who) pushTo(av, ev); })
      .catch(() => undefined);
    return;
  }
  if (!ev.author) return;
  const av = onlineAuthor(ev.author);
  if (!av) return;
  pushTo(av, ev);
}

/** Map a raw Mongo doc to the wire shape (stringify `_id`). */
function toDoc(raw: Record<string, unknown>): DiagnosticDoc {
  const id = raw._id;
  return {
    ...(raw as unknown as DiagnosticDoc),
    _id: id != null ? String(id) : undefined,
  };
}

/**
 * DiagnosticLogic — the hot-reloadable logic singleton behind
 * {@link DiagnosticApi}.
 *
 * Lives at `/platform/idea/api/diagnostics` (a stateless `Stuff` singleton, no
 * backing `Template`); `DiagnosticApi`'s public statics forward here via
 * `StuffApi.singletonSync`. Owns the `diagnostics` collection — the
 * single searchable store the three producers write and both readers
 * (the `errors` verb, the CMS panel) read. Plain-scalar rows, so it uses
 * the raw `getCollection` surface directly (the `HotReloadApi`
 * convention), not a `Document` subclass.
 *
 * Two write paths (`record` for runtime, `recordDiagnostics` for the
 * compile batch), two reads (`list`, gated to author-tier with a
 * non-wizard compile-row redaction; `clear`, wizard-or-author-of-path),
 * and the idempotent author-push `startRouter`. Member state is TS
 * `private` (proxy-wrapped Stuff — `#` would throw); internal sub-logic
 * is module-private free functions so there are no intra-singleton
 * `this.x()` calls to trip the gate.
 *
 * @internal
 */
@Unshadowable
export class DiagnosticLogic extends ApiLogic {
  private routerStarted = false;

  /** See {@link DiagnosticApi.record}. */
  @CallSecurity(DiagnosticApiCallers)
  public async record(d: RuntimeDiagnostic): Promise<void> {
    if (!connected()) return;
    const author = d.path ? await ProvenanceApi.authorOf(d.path) : null;
    const row = makeRow({
      source: 'runtime',
      severity: d.severity ?? 'error',
      channel: d.channel ?? DiagnosticChannel.pathToChannel(d.path),
      path: d.path,
      author,
      versionId: null,
      code: null,
      line: null,
      col: null,
      message: d.message,
      stack: d.stack ?? null,
    });
    await insert(row);
    fire(row); // runtime is always live
  }

  /** See {@link DiagnosticApi.recordDiagnostics}. */
  @CallSecurity(DiagnosticApiCallers)
  public async recordDiagnostics(
    path: string,
    versionId: string,
    diags: readonly RawDiagnostic[],
    opts: { live: boolean }
  ): Promise<void> {
    if (!connected()) return;
    const channel = DiagnosticChannel.pathToChannel(path);
    const author = await ProvenanceApi.authorOf(path);
    // Supersede: a recheck fully replaces this file's compile rows, so a
    // fixed file clears (empty `diags` → nothing re-inserted).
    await PersistApi.deleteMany(Collections.Diagnostics, {
      source: 'compile',
      path,
    });
    for (const d of diags) {
      const row = makeRow({
        source: 'compile',
        severity: d.severity,
        channel,
        path,
        author,
        versionId,
        code: d.code ?? null,
        line: d.line ?? null,
        col: d.col ?? null,
        message: d.message,
        stack: null,
      });
      await insert(row);
      if (opts.live) fire(row);
    }
  }

  /** See {@link DiagnosticApi.list}. */
  @CallSecurity(DiagnosticApiCallers)
  public async list(filter: DiagnosticListFilter): Promise<DiagnosticDoc[]> {
    if (!connected()) return [];
    const subject = actor();
    if (subject === null) return [];
    const isWiz = await AccessApi.isWizard(subject);
    // Non-wizards can't see TS-source compile diagnostics (wizard-tier content).
    if (!isWiz && filter.source === 'compile') return [];
    // The within-your-extent pattern (content-packs wave 3): a row is
    // yours to read when its path is under an extent you hold, or it is
    // a pack's channel and you maintain that pack. No author tier.
    const held = await AccessApi.heldExtents(subject);
    const maintains = new Map<string, boolean>();
    const readable = async (row: DiagnosticDoc): Promise<boolean> => {
      if (row.path && held.some((e) => row.path === e || row.path!.startsWith(e + '/'))) return true;
      if (row.channel.startsWith('pack.')) {
        const id = row.channel.slice('pack.'.length);
        if (!maintains.has(id)) maintains.set(id, await maintainsPack(subject, id));
        return maintains.get(id)!;
      }
      // Compile rows have no path: the wizard axis alone reads them.
      return row.source === 'compile' && isWiz;
    };

    const q: Record<string, unknown> = {};
    if (filter.channels && filter.channels.length) {
      q.channel = { $in: filter.channels };
    }
    if (filter.severity) q.severity = filter.severity;
    if (filter.source) q.source = filter.source;
    else if (!isWiz) q.source = { $ne: 'compile' };
    if (filter.author) q.author = filter.author;
    // `mine`: the spoof-safe "my content" lens — author resolved from the
    // context actor here, never the caller. A subject with no durable
    // templatePath matches nothing.
    if (filter.mine) q.author = subject?.getIdentityPath() ?? '__no_author__';
    if (filter.since) q.ts = { $gte: filter.since };
    if (filter.pathPrefix) {
      q.path = { $regex: `^${escapeRegex(filter.pathPrefix)}` };
    }

    const rows = await PersistApi.find(Collections.Diagnostics, q, {
      sort: { ts: -1 },
      limit: filter.limit ?? DEFAULT_LIMIT,
    });
    const out: DiagnosticDoc[] = [];
    for (const row of rows.map(toDoc)) {
      if (filter.mine || (await readable(row))) out.push(row);
    }
    return out;
  }

  /**
   * See {@link DiagnosticApi.clear}. Returns the delete count, or `-1`
   * when the actor is neither a wizard nor the author of `path`.
   */
  @CallSecurity(DiagnosticApiCallers)
  public async clear(path: string): Promise<number> {
    if (!connected()) return 0;
    const subject = actor();
    let ok = await AccessApi.isWizard(subject);
    if (!ok && subject) {
      const owner = await ProvenanceApi.authorOf(path);
      ok = !!owner && owner === subject.getIdentityPath();
    }
    if (!ok) return -1;
    return PersistApi.deleteMany(Collections.Diagnostics, { path });
  }

  /**
   * See {@link DiagnosticApi.startRouter}. Registers the single
   * author-push listener; idempotent (a second call is a no-op).
   */
  @CallSecurity(DiagnosticApiCallers)
  public startRouter(): void {
    if (this.routerStarted) return;
    this.routerStarted = true;
    EventApi.on(Events.Diagnostic, (payload: unknown) => {
      pushToAuthor(payload as DiagnosticEvent);
    });
  }
}
