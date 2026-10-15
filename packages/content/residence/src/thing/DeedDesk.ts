/**
 * DeedDesk — **the counter land business is transacted over** (residences
 * P6): a fixture whose PRESENCE is the `title` verb's venue predicate. The
 * Registry office keeps one; the realty office keeps another — the verb
 * gates on the desk, never on a room constant, so a second records office
 * anywhere is a populated row and no code.
 *
 * ⭐ **The desk names the books it fronts** (the scan sweep, 2026-10-14):
 * `title list` lists the plat books in `books:`, each stood up at the act.
 * Nothing searches the realm for a book, and nothing boots one so a
 * search could find it.
 *
 * ⚠ A desk confers no money authority — the sale's every gate (settle,
 * subdivide, transfer) is its own.
 */

import Thing from "@saxonberg/server/mud/platform/thing/Thing";
import type { FieldMeta } from "@saxonberg/server/mud/lib/mixin";

export default class DeedDesk extends Thing {
  static fieldMeta: FieldMeta = {
    books: { persistent: true, authorable: true, ref: "identity:relation" },
  };

  /** The plat books this desk fronts, by template path. */
  protected books: string[] = [];

  public getBooks(): readonly string[] {
    return this.books;
  }

  public setBooks(value: readonly string[] | null): void {
    this.books = Array.isArray(value) ? value.map((p) => String(p)) : [];
  }
}
