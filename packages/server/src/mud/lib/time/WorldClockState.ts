/**
 * WorldClockState — persisted snapshot of the world clock.
 *
 * A `Document` (plain MongoDB record, NOT Stuff) holding the three
 * scalars `WorldClockApi.snapshot()` produces: elapsed game-time, the
 * time scale, and the last-shutdown wall-clock stamp. Per the
 * own-thing model (requirements D1/D3) the clock pauses at shutdown
 * and resumes from `elapsedGameTimeS` on the next boot; this row is
 * how that survives a restart.
 *
 * Singleton: exactly one row lives in the `world_state` collection.
 * Mongo cannot key it on a human-readable string `_id` (`ObjectId`
 * construction rejects `'world-clock'`), so `loadOrSeed()` finds the
 * sole row via `find({})` and lets Mongo assign the `_id` on first
 * insert (plan §1.4 / Risk R2). It is NOT a game entity — it is
 * meta/config, which is exactly the `Document` track's remit.
 */

import { Document } from '../persistence/Document';

export class WorldClockState extends Document {
  static collectionName = 'world_state';
  static persistentFields = [
    'elapsedGameTimeS',
    'scale',
    'lastShutdownRealMs',
  ];

  /** Elapsed game-time in seconds at snapshot. */
  elapsedGameTimeS = 0;

  /** Time scale (game-seconds per real-second). Default per D2. */
  scale = 12;

  /** Wall-clock ms at last shutdown — admin/debug only, not math. */
  lastShutdownRealMs = 0;

  /**
   * Load the singleton row, or return a fresh (unsaved) instance when
   * the collection is empty. The fresh instance carries no `_id`; its
   * first `save()` inserts the row and Mongo assigns the id. A loaded
   * instance carries its real ObjectId `_id`, so subsequent saves of
   * that instance upsert in place.
   */
  static async loadOrSeed(): Promise<WorldClockState> {
    const rows = await WorldClockState.find({});
    const existing = rows[0];
    if (existing) return existing;
    return new WorldClockState();
  }
}
