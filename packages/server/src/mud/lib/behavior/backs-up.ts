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
import type { Stuff } from "../stuff/Stuff";
import type { TaskKind } from './Urgency';
import { Urgency } from './Urgency';

export const brain = class {
  static label = "backs-up";
  static kind: TaskKind = "threat";
  static summary =
    "Joins a fight an allied party-mate is already in, on their side, " +
    "against one of their foes.";
  /**
   * ⭐⭐ `critical` — the one band that PREEMPTS what the agent is doing
   * and wakes it early. A mercenary who finishes polishing a mug before
   * coming to your aid is not a mercenary. Whether the ally is fighting
   * is exactly what `act` walks, so the two share the walk.
   */
  static urgency(ctx: BrainContext): Urgency {
    const ally = alliedFighter(ctx.host);
    return ally
      ? new Urgency("critical", "sees the fight and wades in")
      : new Urgency("idle");
  }
  static claims: readonly EngagementSlot[] = ["body"];

  static act(ctx: BrainContext): void {
    const host = ctx.host;
    const found = alliedFighter(host);
    if (!found) return;
    // Re-narrow: `alliedFighter` already proved the host is Engaged, but
    // the predicate's narrowing does not survive the call boundary.
    if (!MixinApi.isEngaged(host)) return;
    const { session } = found;
    // Join on the ally's side, pressing one of its foes.
    for (const c of session.getCombatants()) {
      if (PartyApi.areAllied(host, c)) continue;
      if (!MixinApi.isEngaged(c)) continue;
      CombatApi.join(host, c, session.getTerms());
      return;
    }
  }
} satisfies BrainStatics;

/**
 * An allied party-mate in this room who is already in an active fight,
 * with that fight — or null. Shared by `urgency` and `act`: deciding to
 * back somebody up and backing them up read the same room.
 */
function alliedFighter(
  host: Stuff,
): { ally: Stuff; session: NonNullable<ReturnType<typeof CombatApi.sessionFor>> } | null {
  if (CombatApi.sessionFor(host)) return null; // already fighting
  if (!MixinApi.isEngaged(host) || !MixinApi.isContainable(host)) return null;
  const room = host.getContainer();
  if (!room || !MixinApi.isContainer(room)) return null;
  for (const occ of room.getContents()) {
    if ((occ as unknown) === (host as unknown)) continue;
    if (!PartyApi.areAllied(host, occ)) continue;
    const session = CombatApi.sessionFor(occ);
    if (!session || !session.isActive()) continue;
    return { ally: occ as unknown as Stuff, session };
  }
  return null;
}
