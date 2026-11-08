/**
 * JobBoard — the physical labor-market discovery surface: a fixture placed
 * in a locality, and the `board` argument of the `job` noun's board
 * subcommands (`job post` / `claim` / `complete` / `abandon` and bare
 * `job`), bound by the view as the board in reach (controllers-are-io W7).
 * ⚠ It no longer affords `job`: the noun is every character's (`Persona`)
 * because `job apply` / `quit` / `fulfill` bind no board, and a second
 * source of one view is a second offer. A gig is posted *to a board* (the board is the pool's
 * visibility surface, not the pool itself); its identity — what gigs key
 * on — is its `templatePath`. Multiple boards can exist in multiple
 * localities (hence `lib/`, not `obj/` — the `lib/retail/Stock` placement
 * precedent).
 *
 * The travel half of the surface (`job fulfill`, the diegetic handoff at
 * the destination) binds no board — the drop is wherever you stand.
 */

import Thing from "../../lib/stuff/Thing";
import { MqlApi } from "../../api/mql";
import type { CommandContext, CommandContributions } from "../../api/command";
import type { FieldMeta } from "../../lib/mixin";

const JobBoardBase = Thing;

export default class JobBoard extends JobBoardBase {
  static fieldMeta: FieldMeta = {};


  static commandContributions: CommandContributions = {
    self: [],
    peers: [],
    environment: [],
  };
}
