import type { RawConsoleLine, RawConsoleFilter } from '@saxonberg/types';

/**
 * ConsoleTap — the raw console ring (Producer 2 of the author-diagnostics
 * subsystem).
 *
 * The catch-all net for anything that never flows through a guarded
 * execution context: `install()` wraps `console.log/info/warn/error` at
 * boot, appends each formatted line to a bounded in-memory ring, and
 * **passes the call through** to the original console so terminal output
 * is unchanged. Nothing here writes the `diagnostics` collection — the
 * ring is deliberately raw and unattributed (engine internals,
 * third-party chatter), surfaced only to wizards via
 * `DiagnosticApi.rawTail` / the `errors raw` verb.
 *
 * A backend singleton (sibling of `PersistenceManager`), installed as the
 * first statement in `main()` so the boot baseline is captured. Because it
 * lives in the backend layer — not a proxy-wrapped Stuff — hard-private
 * `#` slots are correct and safe here.
 *
 * See [diagnostics-slate.md](../../../../docs/slates/builds/diagnostics-slate.md).
 */

type ConsoleLevel = 'log' | 'info' | 'warn' | 'error';
const LEVELS: readonly ConsoleLevel[] = ['log', 'info', 'warn', 'error'];

/** Default ring capacity; overridable post-boot via {@link ConsoleTap.setCapacity}. */
const DEFAULT_CAPACITY = 1000;

export class ConsoleTap {
  static #instance: ConsoleTap | null = null;

  static get(): ConsoleTap {
    if (!ConsoleTap.#instance) ConsoleTap.#instance = new ConsoleTap();
    return ConsoleTap.#instance;
  }

  #ring: RawConsoleLine[] = [];
  #capacity = DEFAULT_CAPACITY;
  #installed = false;
  #originals: Partial<Record<ConsoleLevel, (...args: unknown[]) => void>> = {};

  /**
   * Wrap the console methods. Idempotent — a second call is a no-op, so
   * boot re-entry / tests can't double-wrap.
   */
  install(): void {
    if (this.#installed) return;
    this.#installed = true;
    for (const level of LEVELS) {
      // Store the RAW original (not a `.bind()` copy) so `uninstall()`
      // restores the exact function and install/uninstall cycles don't
      // accumulate wrappers.
      const original = console[level] as (...args: unknown[]) => void;
      this.#originals[level] = original;
      console[level] = (...args: unknown[]): void => {
        this.#append(level, args);
        original.apply(console, args);
      };
    }
  }

  /** Restore the original console methods. Idempotent. */
  uninstall(): void {
    if (!this.#installed) return;
    for (const level of LEVELS) {
      const original = this.#originals[level];
      if (original) console[level] = original;
    }
    this.#originals = {};
    this.#installed = false;
  }

  /** Resize the ring (post-boot, once AppSettings are warm). Trims if smaller. */
  setCapacity(capacity: number): void {
    if (!Number.isFinite(capacity) || capacity < 1) return;
    this.#capacity = Math.floor(capacity);
    if (this.#ring.length > this.#capacity) {
      this.#ring = this.#ring.slice(this.#ring.length - this.#capacity);
    }
  }

  /**
   * Newest-first tail of the ring, optionally substring-filtered by
   * `grep` (case-insensitive) and capped by `limit`.
   */
  tail(filter: RawConsoleFilter = {}): RawConsoleLine[] {
    const needle = filter.grep?.toLowerCase();
    let rows = this.#ring;
    if (needle) rows = rows.filter((r) => r.text.toLowerCase().includes(needle));
    const newestFirst = [...rows].reverse();
    const limit = filter.limit ?? 200;
    return newestFirst.slice(0, limit);
  }

  /** Test seam — clear the ring (also used by uninstall paths in tests). */
  clear(): void {
    this.#ring = [];
  }

  #append(level: ConsoleLevel, args: unknown[]): void {
    const text = args
      .map((a) =>
        typeof a === 'string'
          ? a
          : a instanceof Error
            ? (a.stack ?? a.message)
            : safeStringify(a)
      )
      .join(' ');
    this.#ring.push({ level, text, ts: Date.now() });
    if (this.#ring.length > this.#capacity) this.#ring.shift();
  }
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value) ?? String(value);
  } catch {
    return String(value);
  }
}
