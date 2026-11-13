/**
 * FightSwitchController — `fight switch <weapon>`: a vulnerable armament
 * change (over {@link FightControllerBase}).
 */

import type { CommandContext } from "../../../../api/command";
import { MessageApi } from "../../../../api/message";
import { Mml } from "../../../../api/mml";
import type { Stuff } from "../../../../lib/stuff/Stuff";
import { CombatApi } from "../../../../api/combat";
import { MixinApi } from "../../../../api/mixin";
import type { Combatant } from '../../../../lib/combat/Combatant';
import { FightControllerBase, TOPIC, type FightModel } from "./FightControllerBase";

export default class FightSwitchController extends FightControllerBase {
  async execute(model: FightModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    if (!CombatApi.sessionFor(giver)) {
      return this.fail(context, "You're not in a fight.", "not-in-combat");
    }
    const target = model.target;
    if (!target || target.stuff === null) {
      return this.fail(
        context,
        `You don't have any '${target?.raw ?? ""}' to switch to.`,
        "no-target",
      );
    }
    const item = target.stuff as Stuff;
    // ⭐ A switch is a readying (size and carrying D16): the carrier frees
    // the hand, prices the two halves by their holders, and refuses in
    // words that name the way out.
    if (MixinApi.isCarrying(giver)) {
      const tier = giver.tierOf(item);
      if (tier === "hand") return this.fail(context, "You're already holding that.", "already-held");
      if (tier === "elsewhere") return this.fail(context, "You don't have that on you.", "not-on-you");
      const holder = FightSwitchController.holderPhrase(giver, item);
      const refused = giver.ready(item);
      if (refused !== null && !refused.ok) {
        return this.fail(context, this.carryRefusalWords(giver, refused), refused.reason);
      }
      const from = holder === null ? "" : ` at ${holder}`;
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`You reach for ${Mml.thing(item)}${Mml.text(from)} — your guard drops.`)
        .toPeers(
          holder === null
            ? Mml.compose`${Mml.actor(giver)} moves to change weapons.`
            : Mml.compose`${Mml.actor(giver)}'s hand goes to ${Mml.text(holder.replace(/^your /, "their "))}.`,
        )
        .send();
      return;
    }
    const result = ((giver) as unknown as Stuff & Combatant).beginWeaponSwitch(item);
    if (!result.ok) {
      return this.fail(
        context,
        result.reason === "already-switching"
          ? "You're already changing weapons."
          : "You can't switch right now.",
        result.reason ?? "ineligible",
      );
    }
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(Mml.fromMarkup("You start to change weapons — your guard drops."))
      .toPeers(Mml.compose`${Mml.actor(giver)} moves to change weapons.`)
      .send();
  }

  /** The noun of where `item` sits on `body` (*your coat pocket*, *your sidearm*), or null. */
  private static holderPhrase(body: Stuff, item: Stuff): string | null {
    const placed = MixinApi.isContainable(item) ? item.getPlacement() : null;
    if (placed !== null && placed.host.stuffId !== body.stuffId) {
      const host = placed.host.presentationPhrase().bare();
      const named = MixinApi.isPlacing(placed.host) && placed.host.namedRegions().includes(placed.name);
      return named ? `your ${host}${host.endsWith("s") ? "'" : "'s"} ${placed.name}` : `your ${host}`;
    }
    const at = MixinApi.isContainable(item) ? item.getContainer() : null;
    if (at !== null && at.stuffId !== body.stuffId) return `your ${at.presentationPhrase().bare()}`;
    if (!MixinApi.isAttired(body)) return null;
    const hands = new Set(body.handSlots());
    for (const [slot, occ] of body.getAllOccupants()) {
      if (!hands.has(slot) && [...occ].some((o) => o.stuffId === item.stuffId)) return `your ${slot.split(":")[0]}`;
    }
    return null;
  }
}
