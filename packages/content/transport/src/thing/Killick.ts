/**
 * Killick — ⭐ **a stone on a line, a small boat's anchor** (river D23).
 *
 * Stopping a craft where it is is the same act for a ship and a canoe, so
 * the word is the same — `anchor` — and what changes is what affords it: a
 * ship's helm, a canoe's killick. Dropped, it HOLDS only where the water is
 * slack (`water.river.killickHoldsMps`); in faster water it drags and the
 * boat goes on. The next `paddle` takes it up.
 *
 * The killick decides nothing about the river: the boat and its water do.
 * It is the instrument that affords the verb, to whoever sits in the boat
 * that carries it; the boat lets it go (`Boat.letGoAnchor`).
 */

import Good from '@saxonberg/server/mud/lib/stuff/Good';
import type { CommandContributions } from '@saxonberg/server/mud/api/command';

export default class Killick extends Good {
  /** Whoever is in the boat with it can drop it. */
  static commandContributions: CommandContributions = {
    peers: ['platform/cmd/movement/anchor.yaml'],
  };
}
