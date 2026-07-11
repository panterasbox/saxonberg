/**
 * TicketClerk — the Terminus ticket-office NPC. Tootie, reborn as a real
 * employee: she procures replacement TPA cards for travellers who've lost
 * theirs, and she is the city-budget Business's paid employee (the wage
 * recipient that closes the conserved city-budget loop).
 *
 * A bespoke `NPC` carve (a proper character, not a flat functionary) adding
 * exactly one thing over the base NPC:
 *
 *  1. `commandContributions.environment` affords `procure card` to co-located
 *     players — a Character neighbor's `environment` contributions are pushed
 *     onto an arriving actor's stack (CommandLogic), so the verb surfaces only
 *     when the clerk is present (the retired dispenser fixture isn't needed).
 *     The controller resolves the affording clerk as `context.commandSource`.
 *
 * The city-budget Business is **not** stood up here — it stands up lazily,
 * derived from its own `operatingLocations` data, on the first fare
 * (`EmploymentApi.ensureOperatorAt`). No standup hook, no second class: the
 * clerk is just an NPC that affords a verb.
 */

import { NPC } from "../../lib/npc/NPC";
import type { CommandContributions } from "../../api/command";

export default class TicketClerk extends NPC {
  /** Affords `procure card` to co-located players (the `self`-neighbor push). */
  static commandContributions: CommandContributions = {
    environment: ["tpa/procure-card.yaml"],
  };
}
