/**
 * SurfaceVocabularyMigration — the one-shot rename of the forum/chat
 * surface vocabulary to the **ordered / open** axis.
 *
 * ⭐ **Why the rename.** A subject's forum and its chat were each
 * choosing between a procedure and no procedure, and the two choices
 * were named with four unrelated words — `argument` / `popularity` for a
 * board, `rules-of-order` / `free` for a channel. That hid the fact that
 * a subject lighting an argument board and a rules-of-order chat has
 * made the SAME decision twice. One axis, one pair of words:
 *
 * | was | is |
 * |---|---|
 * | `argument-forum` | `ordered-forum` |
 * | `popularity-forum` | `open-forum` |
 * | `rules-chat` | `ordered-chat` |
 * | `free-chat` | `open-chat` |
 * | `Board.organizer: 'argument' \| 'popularity'` | `'ordered' \| 'open'` |
 * | `Channel.procedure: 'rules-of-order' \| 'free'` | `'ordered' \| 'open'` |
 *
 * ⚠ **These strings are PERSISTED**, so a rename without this migration
 * orphans every existing row: a subject keeps `manifestations` naming
 * surfaces the code no longer knows, and its boards and channels become
 * unreachable through it. The subject would still exist and still be
 * listed — with no surfaces — which is the silent-failure shape this
 * codebase keeps paying for.
 *
 * ⚠ Idempotent and one-directional: it matches only the OLD values, so a
 * second run is a no-op and a half-migrated database converges. It runs
 * before the catalogues warm their caches, because they read exactly
 * these fields.
 *
 * This is a **migration, not a seeder** — seeders are insert-only by
 * design (see `SeederManager`), and this rewrites rows that exist.
 */

import { Collections, PersistenceManager } from './PersistenceManager';

/** old → new, for every renamed persisted value. */
const SURFACE_RENAMES: ReadonlyArray<readonly [string, string]> = [
  ['argument-forum', 'ordered-forum'],
  ['popularity-forum', 'open-forum'],
  ['rules-chat', 'ordered-chat'],
  ['free-chat', 'open-chat'],
];

const ORGANIZER_RENAMES: ReadonlyArray<readonly [string, string]> = [
  ['argument', 'ordered'],
  ['popularity', 'open'],
];

const PROCEDURE_RENAMES: ReadonlyArray<readonly [string, string]> = [
  ['rules-of-order', 'ordered'],
  ['free', 'open'],
];

export class SurfaceVocabularyMigration {
  /**
   * Rewrite every stored old value. Returns what it touched so a boot
   * log can state it — a migration that runs silently is one nobody can
   * confirm ran.
   */
  public static async run(): Promise<{
    subjects: number;
    boards: number;
    channels: number;
  }> {
    const pm = PersistenceManager.get();
    if (!pm.isConnected()) return { subjects: 0, boards: 0, channels: 0 };

    let subjects = 0;
    let boards = 0;
    let channels = 0;

    /*
     * ⚠ Subjects are read-modify-write rather than a positional `$set`:
     * `manifestations` is an array of objects and a row may hold two
     * entries needing different renames, which the positional operator
     * cannot express in one update.
     */
    const subjectRows = await pm.find(Collections.ForumSubjects, {});
    for (const row of subjectRows) {
      const mans = row.manifestations;
      if (!Array.isArray(mans)) continue;
      let touched = false;
      for (const m of mans as Array<Record<string, unknown>>) {
        const hit = SURFACE_RENAMES.find(([from]) => m.surface === from);
        if (hit) {
          m.surface = hit[1];
          touched = true;
        }
      }
      if (touched && typeof row._id === 'string') {
        await pm.save(Collections.ForumSubjects, row);
        subjects += 1;
      }
    }

    for (const [from, to] of ORGANIZER_RENAMES) {
      boards += await this.rewrite(Collections.ForumBoards, 'organizer', from, to);
    }
    for (const [from, to] of PROCEDURE_RENAMES) {
      channels += await this.rewrite(Collections.Channels, 'procedure', from, to);
    }

    if (subjects || boards || channels) {
      console.info(
        `SurfaceVocabularyMigration: ordered/open rename — ` +
          `${subjects} subject(s), ${boards} board(s), ${channels} channel(s)`
      );
    }
    return { subjects, boards, channels };
  }

  /** Rewrite one scalar field across a collection. */
  private static async rewrite(
    collection: string,
    field: string,
    from: string,
    to: string
  ): Promise<number> {
    const pm = PersistenceManager.get();
    const rows = await pm.find(collection, { [field]: from });
    for (const row of rows) {
      row[field] = to;
      await pm.save(collection, row);
    }
    return rows.length;
  }
}
