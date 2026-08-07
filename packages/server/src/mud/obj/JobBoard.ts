/**
 * JobBoard — the physical labor-market discovery surface: a fixture placed
 * in a locality that affords the subcommand-dispatched `job` verb via its
 * own `commandContributions` (content affords content — no core-mixin
 * affordance). A gig is posted *to a board* (the board is the pool's
 * visibility surface, not the pool itself); its identity — what gigs key
 * on — is its `templatePath`. Multiple boards can exist in multiple
 * localities (hence `lib/`, not `obj/` — the `lib/retail/Stock` placement
 * precedent).
 *
 * The travel half of the surface (`fulfill`, the diegetic handoff at the
 * destination) is deliberately NOT afforded here — affordance granularity
 * is per-verb, and that verb must travel with the courier (afforded from
 * `self` by the born-with `CredentialWalletUpdate`).
 */

import Thing from "../lib/stuff/Thing";
import { DetailedMixin } from "../lib/description/Detailed";
import { MqlApi } from "../api/mql";
import type { CommandContext, CommandContributions } from "../api/command";
import type { FieldMeta } from "../lib/mixin";

const JobBoardBase = DetailedMixin(Thing);

export default class JobBoard extends JobBoardBase {
  static fieldMeta: FieldMeta = {};

  /** Resolve the board a `job` command works off (the `Stock.resolveIn`
   * precedent): the affording `commandSource` fast-path, else the first
   * board among the giver's reachable peers. */
  static resolveIn(context: CommandContext): JobBoard | null {
    const source = context.commandSource;
    if (source instanceof JobBoard) return source;
    const peers = MqlApi.resolveMany("peers", {
      commandGiver: context.commandGiver,
      scope: "reachable",
    });
    return (
      peers.stuff.find((s): s is JobBoard => s instanceof JobBoard) ?? null
    );
  }

  static commandContributions: CommandContributions = {
    self: [],
    peers: ["work/job.yaml"],
    environment: [],
  };
}
