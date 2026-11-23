/**
 * WaterLedger — ⭐ **the water commons' history, as documents**
 * (persistence-model D5).
 *
 * History is the fourth thing the persistence model names: not a thing in
 * a container, not a body, not derived — a LEDGER. An aquifer's draws, a
 * gate's opening curve and work log, a conduit's deliveries are what
 * HAPPENED, so a restage must not erase them and no room's record should
 * hold them. Each is filed here, one document per subject, at
 * `<registerPrefix><subject>` (the subject's durable handle, else its row),
 * through the register transport — *you file; you do not hold the pen*.
 *
 * Two acts: {@link read} (once, as the subject stands up — its hydration
 * source) and {@link file} (after every act that changes its history).
 * Writes are single-flight per subject, the latest state winning: a burst
 * of draws is one write in flight and one queued, never a pile.
 *
 * A pointer, not a database: the rows live in the document store.
 *
 * See [docs/subsystems/watershed.md] and [docs/subsystems/water-supply.md].
 */

import { Idea } from '@saxonberg/server/mud/lib/stuff/Idea';
import { SingletonMixin } from '@saxonberg/server/mud/lib/stuff/Singleton';
import { RegistrarMixin, type Registrar } from '@saxonberg/server/mud/lib/document/Registrar';
import { DocumentApi } from '@saxonberg/server/mud/api/document';
import { DiagnosticApi } from '@saxonberg/server/mud/api/diagnostics';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { FieldMeta } from '@saxonberg/server/mud/lib/mixin';
import type { VetoResult } from '@saxonberg/server/mud/lib/errors';

/** What a subject of the ledger answers: its history, and taking it back. */
export interface Ledgered {
  /** This subject's history, as the ledger files it — plain data. */
  ledgerRecord(): Record<string, unknown>;
  /** Take back the history the ledger holds for this subject. */
  takeLedger(data: Record<string, unknown>): void;
}

export default class WaterLedger extends RegistrarMixin(SingletonMixin(Idea)) {
  static fieldMeta: FieldMeta = {};

  /** The ledger's row. */
  static readonly PATH = '/system/water/idea/ledger';

  /** The ledger, stood up on use. */
  static async get(): Promise<WaterLedger> {
    const ledger = await StuffApi.singleton<Stuff>(WaterLedger.PATH);
    if (!(ledger instanceof WaterLedger)) throw new Error(`WaterLedger: '${WaterLedger.PATH}' is not the water ledger`);
    return ledger;
  }

  /** Runtime: the write in flight per document, and the latest state waiting behind it. */
  private inFlight = new Map<string, Promise<void>>();
  private waiting = new Map<string, Record<string, unknown>>();

  /** A shared commons record is never culled. */
  public canEvict(): VetoResult {
    return { ok: false, reason: 'the water ledger is a shared commons record' };
  }

  /** Where `subject`'s history is filed. */
  public pathFor(subject: Stuff): string {
    const handle = subject.getDurableHandle() ?? subject.getTemplatePath() ?? '';
    const prefix = this.getRegisterPrefix().replace(/\/+$/, '');
    return `${prefix}${handle.startsWith('/') ? '' : '/'}${handle}`;
  }

  /** What the ledger holds for `subject`, or `null` (nothing filed yet). */
  public async read(subject: Stuff): Promise<Record<string, unknown> | null> {
    const doc = await DocumentApi.read(this.pathFor(subject));
    const data = doc?.getData();
    return data && typeof data === 'object' ? (data as Record<string, unknown>) : null;
  }

  /**
   * ⭐ File `subject`'s history now. Single-flight per subject: a call while
   * a write is in flight queues the LATEST state for one more write, so a
   * burst of acts is at most two writes. A failed write is recorded as a
   * diagnostic on the subject, never swallowed.
   */
  public file(subject: Stuff & Ledgered): Promise<void> {
    const path = this.pathFor(subject);
    this.waiting.set(path, subject.ledgerRecord());
    const running = this.inFlight.get(path);
    if (running) return running;
    const run = (async () => {
      try {
        for (let data = this.waiting.get(path); data !== undefined; data = this.waiting.get(path)) {
          this.waiting.delete(path);
          await DocumentApi.saveToRegister(this as unknown as Stuff & Registrar, path, data);
        }
      } catch (err) {
        this.waiting.delete(path);
        await DiagnosticApi.record({
          path: subject.getTemplatePath() ?? path,
          severity: 'error',
          channel: 'persistence',
          message: `the water ledger could not file ${path}: ${err instanceof Error ? err.message : String(err)}`,
        });
      } finally {
        this.inFlight.delete(path);
      }
    })();
    this.inFlight.set(path, run);
    return run;
  }
}
