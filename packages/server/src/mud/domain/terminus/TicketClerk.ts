/**
 * TicketClerk — the Terminus ticket-office NPC. Tootie, reborn as a real
 * employee: she procures replacement TPA cards for travellers who've lost
 * theirs, and she is the city-budget Business's paid employee (the wage
 * recipient that closes the conserved city-budget loop).
 *
 * A bespoke `NPC` carve (a proper character, not a flat functionary) adding
 * exactly two things over the base NPC:
 *
 *  1. `commandContributions.environment` affords `procure card` to co-located
 *     players — a Character neighbor's `environment` contributions are pushed
 *     onto an arriving actor's stack (CommandLogic), so the verb surfaces only
 *     when the clerk is present (the retired dispenser fixture isn't needed).
 *     The controller resolves the affording clerk as `context.commandSource`.
 *
 *  2. `postRegister` stands up the municipal city-budget Business with the
 *     terminal's own content (the `Bar.postRegister` guarded-`singletonOrClone`
 *     precedent) — idempotent on HMR, live before `EmploymentApi.boot`'s first
 *     roster tick (the cascade completes before engine boot). Folding standup
 *     into the already-bespoke clerk avoids a second class ([DECIDE-S]).
 */

import { NPC } from "../../lib/npc/NPC";
import { StuffApi } from "../../api/stuff";
import { Template } from "../../lib/stuff/Template";
import type { CommandContributions } from "../../api/command";
import { TerminusPaths } from "./paths";

export default class TicketClerk extends NPC {
  /** Affords `procure card` to co-located players (the `self`-neighbor push). */
  static commandContributions: CommandContributions = {
    environment: ["tpa/procure-card.yaml"],
  };

  public override async postRegister(_context?: unknown): Promise<void> {
    // Wire the `behaviors:` spec list (the base NPC's job) first…
    await super.postRegister(_context);
    // …then stand up the city-budget Business (guarded on the template being
    // authored + seeded, so a clerk cloned without one — tests — stands up
    // fine). `singletonOrClone` is idempotent across an HMR re-clone.
    if (await Template.findByPath(TerminusPaths.budget)) {
      await StuffApi.singletonOrClone(TerminusPaths.budget);
    }
  }
}
