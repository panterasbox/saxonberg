// DiagnosticLogic — the hot-reloadable logic singleton behind
// DiagnosticApi. (Doc comment on the class so @internal lands on the
// reflection.)

import { ApiLogic } from '../../lib/stuff/ApiLogic';
import { CallSecurity, Unshadowable } from '../../lib/security/decorators';
import { SecurityPolicies } from '../../lib/security/SecurityPolicies';
import type { Stuff } from '../../lib/stuff/Stuff';
import type {
  DiagnosticDoc,
  DiagnosticListFilter,
  RuntimeDiagnostic,
  RawDiagnostic,
  DiagnosticEvent,
} from '@saxonberg/types';
import {
  PersistenceManager,
  Collections,
} from '../../../backend/PersistenceManager';
import { PersistApi } from '../../api/persist';
import { ExecutionContextApi } from '../../api/execution-context';
import { AccessApi } from '../../api/access';
import { ProvenanceApi } from '../../api/provenance';
import { EventApi, Events } from '../../api/event';
import { StuffApi } from '../../api/stuff';
import { MixinApi } from '../../api/mixin';
import { MudlogApi } from '../../api/mudlog';
import { Mml } from '../../api/mml';
import { DiagnosticChannel } from '../../lib/diagnostics/DiagnosticChannel';

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

function collection() {
  return PersistenceManager.get().getCollection(Collections.Diagnostics);
}

/** The context-derived actor for the read gates (never a passed value). */
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
  const col = collection();
  await col.insertOne(row as Parameters<typeof col.insertOne>[0]);
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

/** Best-effort author push — store-is-truth, push-is-courtesy. */
function pushToAuthor(ev: DiagnosticEvent): void {
  if (!ev.author) return;
  const av = onlineAuthor(ev.author);
  if (!av || !MixinApi.isSensor(av)) return;
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
 * Lives at `/obj/api/diagnostics` (a stateless `Stuff` singleton, no
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
      channel: DiagnosticChannel.pathToChannel(d.path),
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
    await collection().deleteMany({ source: 'compile', path });
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
    const isWiz = await AccessApi.isWizard(subject);
    // Author-tier OR wizard: a wizard edits engine source/TS, so is exactly
    // who needs compile diagnostics — reads admit either axis (a null /
    // unattributable context still fails closed).
    if (!isWiz && !(await AccessApi.isAuthor(subject))) return [];
    // Non-wizards can't see TS-source compile diagnostics (wizard-tier content).
    if (!isWiz && filter.source === 'compile') return [];

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
    if (filter.mine) q.author = subject?.getTemplatePath() ?? '__no_author__';
    if (filter.since) q.ts = { $gte: filter.since };
    if (filter.pathPrefix) {
      q.path = { $regex: `^${escapeRegex(filter.pathPrefix)}` };
    }

    const rows = await collection()
      .find(q)
      .sort({ ts: -1 })
      .limit(filter.limit ?? DEFAULT_LIMIT)
      .toArray();
    return rows.map(toDoc);
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
      ok = !!owner && owner === subject.getTemplatePath();
    }
    if (!ok) return -1;
    const res = await collection().deleteMany({ path });
    return res.deletedCount ?? 0;
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
