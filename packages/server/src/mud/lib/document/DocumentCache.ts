/**
 * DocumentCache — the memory of the documents of one kind that something
 * has read, by path. ⭐ **A memory, never a roster**: a path enters it when
 * something names that path (a row's citation, a restored field, a host's
 * own built-in vocabulary) and is read once; nothing scans the kind to fill
 * it except a lazy dictionary a player's typed word needs (`all`, `byWord`).
 *
 * Extracted from `Aroma` (the first value class over a document) when the
 * metadata families became documents (documents path identity, D7): each
 * value class (`Recipe`, `DirtKind`, `Placement`, …) composes one as a
 * `private static readonly`, never by inheritance — a static cache a
 * subclass inherits is SHARED, which is the trap.
 *
 * The four doors, and what each means:
 *   - {@link ensure} (async) — read the document at `path` if it is not
 *     resident; throws naming the path if there is none. Setters and
 *     `onCreate`s await it, which is what makes a citer's citations
 *     resident by construction.
 *   - {@link need} (sync) — the resident value, or
 *     `DocumentNotResidentError` (an engine defect). A synchronous reader
 *     beneath a synchronous primitive calls this, never a nullable lookup.
 *   - {@link peek} (sync) — resident or `null`, starting nothing: for the
 *     few readers whose honest answer to "not read" is "not mine to read".
 *   - {@link remember} — the one way a value enters (a unit fixture with no
 *     store behind it uses it too).
 *
 * ⭐ The go-live: a pack sync or a CMS save of a kind calls
 * {@link DocumentCache.invalidate}, which drops the changed paths from every
 * cache of that kind, so the next use re-reads.
 *
 * @internal substrate for the value classes; an author names a path on a row.
 */

import { DocumentApi } from '../../api/document';
import { DocumentNotResidentError } from '../errors';
import type { StoredDocument } from './StoredDocument';

/** How a value class builds its value from a document (validating as it goes). */
export type DocumentBuilder<T> = (doc: StoredDocument) => T | Promise<T>;

export class DocumentCache<T> {
  /** Every cache, by kind — the go-live's registry. */
  private static readonly byKind = new Map<string, Set<DocumentCache<unknown>>>();

  private readonly known = new Map<string, T>();
  private readonly loading = new Map<string, Promise<T>>();

  constructor(
    private readonly kind: string,
    private readonly build: DocumentBuilder<T>,
  ) {
    const set = DocumentCache.byKind.get(kind) ?? new Set();
    set.add(this as DocumentCache<unknown>);
    DocumentCache.byKind.set(kind, set);
  }

  /** The kind this cache remembers. */
  public getKind(): string {
    return this.kind;
  }

  /**
   * The value at `path`, read and built if it is not resident. Concurrent
   * first reads share one load. ⚠ Throws naming the path when no document of
   * this kind is there — a citation of a path no pack ships fails where it
   * is named.
   */
  public async ensure(path: string): Promise<T> {
    const found = this.known.get(path);
    if (found !== undefined) return found;
    const inFlight = this.loading.get(path);
    if (inFlight) return inFlight;
    const load = (async () => {
      const doc = await DocumentApi.read(path);
      if (!doc || doc.getKind() !== this.kind) {
        throw new Error(`${this.kind} '${path}' has no ${this.kind} document`);
      }
      return this.remember(path, await this.build(doc));
    })().finally(() => this.loading.delete(path));
    this.loading.set(path, load);
    return load;
  }

  /** The resident value at `path`; throws `DocumentNotResidentError` if it was never loaded. */
  public need(path: string): T {
    const found = this.known.get(path);
    if (found === undefined) throw new DocumentNotResidentError(this.kind, path);
    return found;
  }

  /** The resident value at `path`, or `null`; starts nothing. */
  public peek(path: string): T | null {
    return this.known.get(path) ?? null;
  }

  /** Whether `path` is resident. */
  public has(path: string): boolean {
    return this.known.has(path);
  }

  /** Keep `value` as the document at `path`. The one way a value enters. */
  public remember(path: string, value: T): T {
    this.known.set(path, value);
    return value;
  }

  /** Every resident value (what has been read — never the kind's roster). */
  public resident(): T[] {
    return [...this.known.values()];
  }

  /**
   * ⭐ The lazy dictionary's warm: read EVERY document of the kind and keep
   * them all. Only for a kind a player names by a typed word or a verb lists
   * (scan-sweep ruling 1); the first async use pays one indexed read.
   */
  public async all(): Promise<T[]> {
    const docs = await DocumentApi.listOfKind(this.kind);
    const out: T[] = [];
    for (const doc of docs) {
      const path = doc.getPath();
      const have = this.known.get(path);
      out.push(have !== undefined ? have : this.remember(path, await this.build(doc)));
    }
    return out;
  }

  /**
   * The documents a player's typed `word` names (the card's `keys.word`),
   * read and kept. Unique by the install check, so at most one is expected;
   * a list because the store, not this read, is what refuses a twin.
   */
  public async byWord(word: string): Promise<Array<{ path: string; value: T }>> {
    // A word is unique at install, so a resident document whose leaf is the
    // word IS the answer — no read.
    for (const [path, value] of this.known) {
      if (path.slice(path.lastIndexOf('/') + 1) === word) return [{ path, value }];
    }
    const docs = await DocumentApi.findByKey(this.kind, 'word', { eq: word });
    const out: Array<{ path: string; value: T }> = [];
    for (const doc of docs) {
      const path = doc.getPath();
      const have = this.known.get(path);
      out.push({ path, value: have !== undefined ? have : this.remember(path, await this.build(doc)) });
    }
    return out;
  }

  /** Forget `path`, so the next use re-reads it. */
  public forget(path: string): void {
    this.known.delete(path);
  }

  /** Forget everything, so a test (or a whole-kind go-live) starts clean. */
  public forgetAll(): void {
    this.known.clear();
  }

  /**
   * The go-live: every cache of `kind` forgets the changed and deleted
   * paths (or everything, when no paths are given). Called by the
   * installer after a sync touches the kind and by the CMS save.
   *
   * @internal the installer's and `DocumentLogic`'s.
   */
  public static invalidate(kind: string, paths?: readonly string[]): void {
    for (const cache of DocumentCache.byKind.get(kind) ?? []) {
      if (paths === undefined) cache.forgetAll();
      else for (const p of paths) cache.forget(p);
    }
  }
}
