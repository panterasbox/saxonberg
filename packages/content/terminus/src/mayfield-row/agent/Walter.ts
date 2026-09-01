/**
 * Walter — Seznick House's property manager, and Mayfield Holdings'
 * agent. The Katie pattern one rung up the ladder: the same shape, a
 * building instead of a dorm.
 *
 * Almost entirely content (name, species, dispositions, the lease
 * dialogue tree in his seed). The one thing that cannot be content is
 * this class: **a verb affordance is a static on a class**, never a
 * field on a row — a row that writes `commandContributions:` into its
 * `data` block is writing to an instance property nothing reads, and
 * the verbs it means to hang are simply unreachable, silently. So the
 * operator escape hatch lives here.
 *
 * `peers`, not `environment`: Walter is a person standing in the lobby
 * with you, so the affordance goes SIDEWAYS to whoever shares the room
 * — the same bucket Katie's desk verbs use. Both views carry
 * `requiresWizard`, so only an operator ever SEES the raw verbs; the
 * real Mayfield-Holdings-agency check lives at the controllers'
 * `execute()`, and the player's path is the dialogue.
 *
 * His authority is owner-conferred, never self-claimed: the
 * `mayfield-holdings` group lists his template path as a member in the
 * terminus pack's `requires.groups`, applied by the installer.
 */

import NPC from "@saxonberg/server/mud/lib/npc/NPC";
import { PopulatesMixin } from "@saxonberg/server/mud/lib/stuff/Populates";
import type { CommandContributions } from "@saxonberg/server/mud/api/command";

export default class Walter extends PopulatesMixin(NPC) {
  static commandContributions: CommandContributions = {
    self: [],
    peers: [
      "world/terminus/mayfield-row/cmd/lease.yaml",
      "world/terminus/mayfield-row/cmd/unlease.yaml",
    ],
    environment: [],
  };
}
