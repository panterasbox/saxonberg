/**
 * ScutchingBoard — the board and the wooden knife you beat retted straw
 * against.
 *
 * ⚠ **The verb affordance is a STATIC ON THIS CLASS**, not a row's
 * `commandContributions:`. A row that declares one is silently dead —
 * which is a mistake this codebase has already paid for once — so every
 * verb this trade offers reaches a player through a class here.
 *
 * ⭐ The tool ladder starts at **rung zero**: `paceMs` returns the base
 * duration when no instrument resolves, so scutching by hand against
 * anything hard already works, slowly, with no special case. That is
 * not a courtesy — it is what makes "prehistoric" the bottom of this
 * ladder rather than a different one.
 */

import ToolItem from '@saxonberg/server/mud/platform/thing/ToolItem';
import type { CommandContributions } from '@saxonberg/server/mud/api/command';

const SCUTCH = ['trade/textiles/cmd/textiles/scutch.yaml'];

export default class ScutchingBoard extends ToolItem {
  static commandContributions: CommandContributions = {
    environment: SCUTCH,
    peers: SCUTCH,
  };
}
