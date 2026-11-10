/**
 * DocumentCatalogue — the singleton that SERVES one family of authored
 * documents (a joint, a dirt kind, a placement, a topic…): the one place a
 * reader looks a document of that family up, reached through the family's
 * domain Api (`CraftingApi.joints()`, `ContainmentApi.placements()`, …).
 *
 * ⭐ Substrate only — every family's catalogue extends this at
 * `/platform/idea/<Family>Catalogue` and names its `kind` and its `parse`.
 * Nothing instances this class.
 *
 * ⭐⭐ **A document is named by its path** and loaded **on reach**, never
 * at boot (documents D7): {@link ensure} is the async load a setter returns
 * and an act awaits; {@link need} is the sync read that MUST find the
 * document resident — a miss is an engine defect and throws
 * `DocumentNotResidentError`, never "no such thing".
 *
 * The memory of what has been read is per KIND and lives as long as the
 * process — a hard-private static slot, so a catalogue stood up again (a
 * test's `clearAll`, an HMR swap) reads the same memory. It is a slot
 * behind these methods, not a surface: every read goes through an
 * instance, every instance through its Api.
 */

import { Idea } from '../stuff/Idea';
import { DocumentApi } from '../../api/document';
import { DocumentNotResidentError, type VetoResult } from '../errors';
import type { EvictionContext } from '../stuff/Stuff';
import type { StoredDocument } from './StoredDocument';

/** One kind's memory: what has been read, and what is being read. */
interface KindMemory {
  known: Map<string, unknown>;
  loading: Map<string, Promise<unknown>>;
}

export abstract class DocumentCatalogue<T> extends Idea {
  // `#` (CLAUDE.md special case 3): the memory is the class's own; nothing
  // outside these methods may reach it, and it must outlive any instance.
  static #memory = new Map<string, KindMemory>();

  /** The document kind this catalogue serves (`joint`, `dirt`, …). */
  protected abstract readonly kind: string;

  /**
   * Read one document's data into its value — and refuse a malformed one.
   * The installer validates every shipped row through this, so a document
   * that would fail here never reaches the store.
   */
  public abstract parse(data: Record<string, unknown>, path: string): T;

  /**
   * What a read loads WITH the document (a dirt's smell, say) — awaited by
   * {@link ensure} before the document counts as read. Nothing by default.
   */
  protected afterRead(_value: T): Promise<void> | void {
    void _value;
  }

  /** The document kind this catalogue serves. */
  public getKind(): string {
    return this.kind;
  }

  private memory(): KindMemory {
    let m = DocumentCatalogue.#memory.get(this.kind);
    if (!m) {
      m = { known: new Map(), loading: new Map() };
      DocumentCatalogue.#memory.set(this.kind, m);
    }
    return m;
  }

  /** Read and keep the document at `path` (at once when already read). */
  public async ensure(path: string): Promise<T> {
    const m = this.memory();
    if (m.known.has(path)) return m.known.get(path) as T;
    const inFlight = m.loading.get(path);
    if (inFlight) return inFlight as Promise<T>;
    const load = (async () => {
      const doc = await DocumentApi.read(path);
      if (!doc || doc.getKind() !== this.kind) {
        throw new Error(`${this.kind} '${path}' has no ${this.kind} document`);
      }
      const value = this.parse(doc.getData(), path);
      await this.afterRead(value);
      return this.remember(path, value);
    })().finally(() => m.loading.delete(path));
    m.loading.set(path, load);
    return load;
  }

  /** The resident document at `path` — throws if nothing loaded it (D7). */
  public need(path: string): T {
    const m = this.memory();
    if (!m.known.has(path)) throw new DocumentNotResidentError(this.kind, path);
    return m.known.get(path) as T;
  }

  /** The resident document at `path`, or `null` — a read that may honestly miss. */
  public peek(path: string): T | null {
    const m = this.memory();
    return m.known.has(path) ? (m.known.get(path) as T) : null;
  }

  /** Whether the document at `path` is resident. */
  public has(path: string): boolean {
    return this.memory().known.has(path);
  }

  /** Keep a value read elsewhere (the installer's validation, a fixture). */
  public remember(path: string, value: T): T {
    this.memory().known.set(path, value);
    return value;
  }

  /** Every resident document of this kind. */
  public resident(): T[] {
    return [...this.memory().known.values()] as T[];
  }

  /** Every document of this kind in the store, read and kept. */
  public async all(): Promise<T[]> {
    const docs = await DocumentApi.listOfKind(this.kind);
    return docs.map((doc) => this.keep(doc));
  }

  /** Every document of this kind under `prefix`, read and kept. */
  public async under(prefix: string): Promise<T[]> {
    const docs = await DocumentApi.list(prefix);
    return docs.filter((d) => d.getKind() === this.kind).map((doc) => this.keep(doc));
  }

  /**
   * The documents a typed `word` names — a resident one first (a word is
   * unique at install), else the store's card (`keys.word`).
   */
  public async byWord(word: string): Promise<Array<{ path: string; value: T }>> {
    for (const [path, value] of this.memory().known) {
      if (path.slice(path.lastIndexOf('/') + 1) === word) return [{ path, value: value as T }];
    }
    const docs = await DocumentApi.findByKey(this.kind, 'word', { eq: word });
    return docs.map((doc) => ({ path: doc.getPath(), value: this.keep(doc) }));
  }

  /** Forget `paths` (every path when omitted) — the go-live of an edit. */
  public forget(paths?: readonly string[]): void {
    const m = this.memory();
    if (paths === undefined) m.known.clear();
    else for (const p of paths) m.known.delete(p);
  }

  private keep(doc: StoredDocument): T {
    const path = doc.getPath();
    const m = this.memory();
    return m.known.has(path) ? (m.known.get(path) as T) : this.remember(path, this.parse(doc.getData(), path));
  }

  /** Residency veto — a catalogue is never culled. */
  public canEvict(_context: EvictionContext): VetoResult {
    return { ok: false, reason: 'a document catalogue; never culled' };
  }

  /** Singleton refusal. */
  public canDestruct(): VetoResult {
    return { ok: false, reason: `the ${this.kind} catalogue is a system singleton` };
  }
}
