/**
 * BroadcastDesk — a broadcaster's desk (stream arrival D18): standing at it,
 * you have `program` and `rodney`, with no app.
 *
 * ⭐ It affords through `peers` — the `JobBoard` precedent: *at the desk* is
 * *in its place* (and, as for every station in the game, one PASSABLE exit
 * away; a shut door stops it). It grants nothing the Broadcast app does
 * not, and decides nothing about whose program you may run: the program's
 * pen does (`requiresProgram`), wherever you stand.
 *
 * A fixture: authored `fixedInPlace` on its row, propped by the room.
 */

import Thing from '../../lib/stuff/Thing';
import type { CommandContributions } from '../../api/command';

export default class BroadcastDesk extends Thing {
  /** The two views, to whoever is at the desk (D18). */
  static commandContributions: CommandContributions = {
    self: [],
    peers: ['platform/cmd/stream/rodney.yaml', 'platform/cmd/stream/program.yaml'],
    environment: [],
  };
}
