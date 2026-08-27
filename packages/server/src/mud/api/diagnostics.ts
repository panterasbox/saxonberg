/**
 * DiagnosticApi — the author-diagnostics surface: one searchable store
 * fed by three producers (the runtime execution-context guard, the
 * dev-only TS compile watcher, and — for the raw ring only — the console
 * tap), read by the `errors` verb and the CMS diagnostics panel.
 *
 * A content author working through the CMS or the shell has no feedback
 * path for errors in the content they authored: runtime throws in a brain
 * / script / controller dead-end at `console.*` on the server terminal,
 * and ambient TS type errors only surface in CI. This surface closes that
 * gap — structured diagnostics are recorded with a **channel** (a pure
 * function of the path) and the content's **author** (via
 * `ProvenanceApi.authorOf`), delivered to the author on the live stream,
 * and searchable by anyone author-tier.
 *
 * **Store vs ring.** Structured, attributed diagnostics live in the
 * `diagnostics` collection (behind {@link DiagnosticLogic}); the raw,
 * unattributed console ring lives on the backend {@link ConsoleTap}
 * singleton and is wizard-read-only. `list`/`clear` read the store;
 * `rawTail` reads the ring; the pure taxonomy helpers
 * (`pathToChannel`/`expandSubscription`/`matches`) are re-exported from
 * `lib/diagnostics/DiagnosticChannel` so they're discoverable on the Api
 * face while staying unit-testable in isolation.
 *
 * This Api is a thin forwarding shell: the store logic lives in the
 * hot-reloadable {@link DiagnosticLogic} singleton at
 * `/platform/idea/api/diagnostics`, reached synchronously via
 * `StuffApi.singletonSync`. `dest /platform/idea/api/diagnostics` reloads it. The
 * facade statics are open (the security-meaningful read gates live in the
 * logic, on the context-derived actor — the `MudlogApi` precedent).
 */

import type {
  DiagnosticDoc,
  DiagnosticListFilter,
  RuntimeDiagnostic,
  RawDiagnostic,
  RawConsoleLine,
  RawConsoleFilter,
} from '@saxonberg/types';
import { StuffApi } from './stuff';
import { HotReloadApi } from './hot-reload';
import { DiagnosticLogic } from '../platform/idea/api/DiagnosticLogic';
import { ConsoleTap } from '../../backend/ConsoleTap';
import {
  DiagnosticChannel,
  type SubscribeContext,
} from '../lib/diagnostics/DiagnosticChannel';
import { fileURLToPath } from 'url';
import { SecurityApi } from './security';

const LOGIC_PATH = '/platform/idea/api/diagnostics';
const LOGIC_CLASS_FILE = fileURLToPath(
  new URL('../platform/idea/api/DiagnosticLogic', import.meta.url)
);

/** Resolve the HMR-able DiagnosticLogic singleton (sync). */
function logic(): DiagnosticLogic {
  return StuffApi.singletonSync(
    LOGIC_PATH,
    () =>
      new ((HotReloadApi.getCurrentExport(
        LOGIC_CLASS_FILE,
        'DiagnosticLogic'
      ) as typeof DiagnosticLogic | null) ?? DiagnosticLogic)()
  );
}

export class DiagnosticApi {
  private constructor() {}

  // ---- Producer-side (write) -------------------------------------------

  /**
   * Record one captured runtime throw (the runRoot guard / command-path
   * capture). Derives the channel + author, writes the row, and fires
   * `Events.Diagnostic` so the author-push router notifies the content's
   * author. No-op without a connection.
   */
  public static async record(d: RuntimeDiagnostic): Promise<void> {
    return logic().record(d);
  }

  /**
   * Record a compile watcher's batch for one file: fully replaces the
   * file's prior compile rows (a fixed file clears), and fires the live
   * stream only when `opts.live` (cold-start batches pass `false` so the
   * boot baseline lands silently).
   */
  public static async recordDiagnostics(
    path: string,
    versionId: string,
    diags: readonly RawDiagnostic[],
    opts: { live: boolean }
  ): Promise<void> {
    return logic().recordDiagnostics(path, versionId, diags, opts);
  }

  // ---- Reader-side ------------------------------------------------------

  /**
   * List structured diagnostics matching `filter`, newest-first. Gated to
   * author-tier on the context-derived actor; non-wizards never see
   * TS-source `compile` rows. Returns `[]` for an unauthorised /
   * unattributable context.
   */
  public static async list(
    filter: DiagnosticListFilter
  ): Promise<DiagnosticDoc[]> {
    return logic().list(filter);
  }

  /**
   * Drop all diagnostics for `path`. Returns the delete count, or `-1`
   * when the actor is neither a wizard nor the author of `path`.
   */
  public static async clear(path: string): Promise<number> {
    return logic().clear(path);
  }

  /**
   * Newest-first tail of the raw console ring (the {@link ConsoleTap}).
   * Unattributed engine output — **wizard-tier**; the caller (the `errors
   * raw` controller) enforces the wizard gate before calling.
   */
  public static rawTail(filter: RawConsoleFilter = {}): RawConsoleLine[] {
    return ConsoleTap.get().tail(filter);
  }

  /**
   * Register the single idempotent author-push listener. Called once at
   * boot; safe in production (nothing fires it if no producer runs).
   */
  public static startRouter(): void {
    logic().startRouter();
  }

  // ---- Pure taxonomy (re-exported from DiagnosticChannel) ---------------

  /** The channel (routing key) for an absolute path. See DiagnosticChannel. */
  public static pathToChannel(absPath: string | null | undefined): string {
    return DiagnosticChannel.pathToChannel(absPath);
  }

  /** Expand subscription patterns, resolving `$cwd` live. */
  public static expandSubscription(
    patterns: readonly string[],
    ctx: SubscribeContext
  ): readonly string[] {
    return DiagnosticChannel.expandSubscription(patterns, ctx);
  }

  /** Does `channel` satisfy any expanded subscription pattern? */
  public static matches(
    channel: string,
    expanded: readonly string[]
  ): boolean {
    return DiagnosticChannel.matches(channel, expanded);
  }
}

SecurityApi.decorateApiClass(DiagnosticApi);
