/**
 * `backs-up` brain — a party member who joins an ally's fight.
 *
 * The counterpart to `combatant` (which acts *inside* a fight): this brain
 * gets an NPC ally *into* one. On its cadence it looks around the room for
 * a party-mate (`PartyApi.areAllied`) who is already fighting, and — if the
 * NPC isn't engaged itself — joins that fight (`CombatApi.join`) against
 * one of its ally's foes, on the ally's side. Once in, the `combatant`
 * brain takes over the gambit choice. This is how a hired {@link Mercenary}
 * comes to a player's aid: recruit it into your party, then when you draw
 * steel it backs you up.
 *
 * Stateless per the brain contract; reads the live world through the
 * gated `PartyApi`/`CombatApi` facades only.
 */

import type { EngagementSlot } from "../activity/Engaged";
import type { BrainContext, BrainStatics } from "./brain";
import { CombatApi } from "../../api/combat";
import { PartyApi } from "../../api/party";
import { MixinApi } from "../../api/mixin";

export const brain = class {
  static label = "backs-up";
  static claims: readonly EngagementSlot[] = ["body"];

  static act(ctx: BrainContext): void {
    const host = ctx.host;
    if (CombatApi.sessionFor(host)) return; // already fighting
    if (!MixinApi.isEngaged(host) || !MixinApi.isContainable(host)) return;
    const room = host.getContainer();
    if (!room || !MixinApi.isContainer(room)) return;

    for (const occ of room.getContents()) {
      if ((occ as unknown) === (host as unknown)) continue;
      if (!PartyApi.areAllied(host, occ)) continue; // a party-mate
      const session = CombatApi.sessionFor(occ);
      if (!session || !session.isActive()) continue;
      // Join on the ally's side, pressing one of its foes.
      for (const c of session.getCombatants()) {
        if (PartyApi.areAllied(host, c)) continue;
        if (!MixinApi.isEngaged(c)) continue;
        CombatApi.join(host, c, session.getTerms());
        return;
      }
    }
  }
} satisfies BrainStatics;
