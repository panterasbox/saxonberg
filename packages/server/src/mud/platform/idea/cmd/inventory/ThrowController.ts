/**
 * ThrowController — `throw <item> [at <target>]`.
 *
 * Two acts behind one verb, told apart by the `at` binding:
 *
 *  - **`throw <item>`** — a ballistic relocation. The thing leaves your
 *    hands and lands on the floor. No fight, no gate.
 *  - **`throw <item> at <someone>`** — an initiation, and it routes
 *    through `CombatApi.initiate` exactly as `attack` does. That is the
 *    whole reason the handshake was extracted: "routes identically" has
 *    to be a fact rather than a claim, and a verb that lived outside
 *    combat would otherwise be a consent bypass with a friendly name.
 *
 * The verb rides `ContainerMixin`, not a combat mixin, because throwing
 * operates through **containment** — the substrate, not the drama. A
 * Container can throw; being a Combatant is not required. That is what
 * makes "works outside combat" free rather than special-cased.
 *
 * On arrival a broken vessel spills its real volume onto whoever is
 * there, and the DOSE curve decides what each share does. Nothing here
 * invents a splash rule.
 */

import { CommandController } from "../../../../lib/command/CommandController";
import type { CommandContext, CommandModel } from "../../../../api/command";
import type { MqlOneResult } from "../../../../api/mql";
import { MessageApi } from "../../../../api/message";
import { MixinApi } from "../../../../api/mixin";
import { Mml } from "../../../../api/mml";
import { PromptCancelledError } from "../../../../api/prompt";
import { ContainmentApi } from "../../../../api/containment";
import { StuffApi } from "../../../../api/stuff";
import { BulkableApi } from "../../../../api/bulk";
import { ConditionApi } from "../../../../api/condition";
import { CombatApi } from "../../../../api/combat";
import type { Stuff } from "../../../../lib/stuff/Stuff";
import type Material from "../../../../lib/material/Material";
import type { TermsProposal } from "../../../../lib/combat/CombatTerms";
import type { Combatant } from '../../../../lib/combat/Combatant';

const TOPIC = "act.deed";

/**
 * Where a thrown thing lands on a body, first match wins.
 *
 * Torso first because it is the biggest target and the one a thrower
 * actually aims at; head and limbs are the fallbacks for anatomies that
 * lack one. A body with none of these takes no wound — the graceful
 * no-op, not an error.
 */
const IMPACT_SITES = ["body.torso", "body.head", "body.arm.right"] as const;

interface ThrowModel extends CommandModel {
  item?: MqlOneResult;
  target?: MqlOneResult;
}

export default class ThrowController extends CommandController<ThrowModel> {
  async execute(model: ThrowModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver as Stuff;

    if (!model.item?.stuff) {
      const raw = model.item?.raw;
      return this.fail(
        context,
        raw ? `You don't have any '${raw}' to throw.` : "Throw what?",
        "empty-result",
      );
    }
    const item = model.item.stuff;
    const target = model.target?.stuff ?? null;

    if (target === giver) {
      return this.fail(context, "You can't throw that at yourself.", "self-target");
    }

    // ── The throw-away parse: no target, no gate, no fight. ──
    if (target === null) {
      return this.pitchAway(giver, item, context);
    }

    // ── Everyone this would touch, and whether that is allowed. ──
    const splash = CombatApi.splashSetFor(target);
    const verdict = ((giver) as unknown as Stuff & Combatant).mayDeliverTo(target, splash);
    if (!verdict.ok) {
      // Refused BEFORE anything commits: nothing thrown, no poise spent,
      // no session opened. Area delivery must not be a cheaper route to a
      // person than aiming at them.
      return this.fail(
        context,
        `You can't throw that without catching ${Mml.thing(verdict.refusedBy).toString()} in it.`,
        "splash-would-catch-a-bystander",
      );
    }

    // ── Throwing at a person is starting a fight. Same door as `attack`. ──
    if (MixinApi.isVitals(target) && MixinApi.isEngaged(target)) {
      const opened = await ((giver) as unknown as Stuff & Combatant).initiateCombat(target, {}, (t, mine) => this.resolveConflict(t, mine));
      if (!opened.ok) {
        if (opened.reason === "cancelled") {
          return this.fail(context, "The moment passes.", "cancelled");
        }
        return this.fail(
          context,
          "You can't start that fight.",
          opened.reason ?? "failed",
        );
      }
    }

    await this.deliver(giver, item, target, splash);
  }

  /** A ballistic relocation — the thing lands on the floor. */
  private pitchAway(
    giver: Stuff,
    item: Stuff,
    context: CommandContext,
  ): void {
    const room = MixinApi.isContainable(giver) ? giver.getContainer() : null;
    if (room === null || !MixinApi.isContainer(room)) {
      return this.fail(context, "There's nowhere to throw it.", "no-room");
    }
    ContainmentApi.move(item as never, room as never);
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(Mml.compose`You hurl ${Mml.thing(item)} away.`)
      .toPeers(Mml.compose`${Mml.actor(giver)} hurls ${Mml.thing(item)} away.`)
      .send();
  }

  /** Resolve the arrival and apply it. */
  private async deliver(
    giver: Stuff,
    item: Stuff,
    target: Stuff,
    splash: readonly Stuff[],
  ): Promise<void> {
    const slot = BulkableApi.slotFor(item, undefined);
    const material = slot?.getMaterial() ?? null;
    const litres = slot?.getAmount().rawValue() ?? 0;

    const itemMaterial = this.materialOf(item);
    const plan = ((giver) as unknown as Stuff & Combatant).resolveThrown(target, {
        litres,
        massKg: this.massOf(item),
        toughness: itemMaterial?.getToughness().rawValue(),
        hardness: itemMaterial?.getHardness().rawValue(),
      }, splash);

    // ⚠ `toTarget` requires a Sensor — and you can throw things at
    // OBJECTS, not just at people. A terminal has nothing to be told.
    const scene = MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(Mml.compose`You hurl ${Mml.thing(item)} at ${Mml.actor(target)}.`)
      .toPeers(
        Mml.compose`${Mml.actor(giver)} hurls ${Mml.thing(item)} at ${Mml.actor(target)}.`,
      );
    if (MixinApi.isSensor(target)) {
      scene.toTarget(
        target,
        Mml.compose`${Mml.actor(giver)} hurls ${Mml.thing(item)} at you!`,
      );
    }
    scene.send();

    if (plan.placement === "miss") {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`It goes wide.`)
        .send();
    } else {
      // ── The KINETIC half. ──
      //
      // A thrown thing has mass and it arrives; that is true of a rock,
      // a chair and a flask alike, and it is what makes `throw` a real
      // act rather than a delivery mechanism for potions. The profile
      // already carries the channel and the joules — this is the one
      // call that turns them into a wound, and the materials-response
      // grid decides what the energy actually costs.
      //
      // `null` back is the honest no-op: too little energy to matter (a
      // thrown coin) or no matching anatomy. Nothing is invented to
      // make a throw "feel" like it did something.
      const site = this.impactSite(target);
      const spec = site === null ? null : plan.profile.toInflictSpec(site);
      if (spec !== null) ConditionApi.inflict(target, spec);
    }

    // The vessel breaks by ITS OWN material — glass, not the draught it
    // carries. Two different materials, and confusing them would make
    // every potion as fragile as its flask.
    if (plan.profile.breaksOnArrival() && plan.placement !== "miss") {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`${Mml.thing(item)} shatters against ${Mml.actor(target)}.`)
        .toPeers(Mml.compose`${Mml.thing(item)} shatters against ${Mml.actor(target)}.`)
        .send();

      for (const share of plan.shares) {
        if (share.litres <= 0) continue;
        if (material === null || !MixinApi.isPotable(material)) continue;
        // ORIGIN is the victim: a contact payload acts at the point of
        // impact, not from the hand that threw it. Without this the
        // effect would measure its reach from the thrower and refuse
        // across the gap it just crossed.
        const reports = await material.dischargeInto(
          share.victim,
          share.litres,
          { origin: share.victim },
        );
        for (const line of reports) {
          MessageApi.scene(giver)
            .topic(TOPIC)
            .toSelf(Mml.fromMarkup(Mml.escape(line)))
            .send();
        }
      }

      // Whatever is left pools on the real floor, through the shipped
      // spill path — the same one `pour` uses.
      if (plan.spilled > 0 && slot !== null) {
        const floor = BulkableApi.floorSurfaceNear(target);
        if (floor !== null) {
          BulkableApi.transfer(slot, floor, {
            kind: "quantity",
            litres: plan.spilled,
          } as never);
        }
      }
      // The vessel is gone — it broke. Destroying it is the honest
      // outcome, and `StuffApi.destruct` is the only way to do that.
      await StuffApi.destruct(item);
    }
  }

  /**
   * Where a thrown thing lands on THIS body — first of {@link IMPACT_SITES}
   * the victim actually has.
   *
   * The walk lives here rather than on `DeliveryProfile` because that is
   * a pure value-object with no business reaching into anatomy. `null`
   * for a body with none of these parts, which is the graceful no-op.
   */
  private impactSite(victim: Stuff): string | null {
    if (!MixinApi.isVitals(victim)) return null;
    for (const key of IMPACT_SITES) {
      if (victim.getPart(key) != null) return key;
    }
    return null;
  }

  /**
   * The thrown object's real mass in kg. `requires: TangibleMixin` guarantees the
   * mixin is there; a mass that will not read is 0, which lands the
   * arrival under the inert floor rather than inventing a weight.
   */
  private massOf(item: Stuff): number {
    if (!MixinApi.isTangible(item)) return 0;
    try {
      return item.getMass().rawValue();
    } catch {
      return 0;
    }
  }

  /**
   * The **vessel's** own Material — what the flask is made of, not what
   * it holds. `toughness`/`hardness` read off this, which is what makes
   * a glass flask shatter and a steel one deform.
   */
  private materialOf(item: Stuff): Material | null {
    return MixinApi.isTangible(item) ? item.getMaterial() : null;
  }

  /** Prompt a live defender on a terms conflict — asking is the
   * controller's job, exactly as it is for `attack`. */
  private async resolveConflict(
    target: Stuff,
    mine: TermsProposal,
  ): Promise<boolean | null | "cancelled"> {
    if (!MixinApi.isHasInteractive(target)) return null;
    const interactive = [...target.getInteractives()][0];
    if (!interactive) return null;
    try {
      const picked = await interactive.promptChoice(
        `You are challenged to a ${mine.lethality} fight (to ${mine.stopCondition}). Accept?`,
        [
          { label: "Accept", response: "accept" },
          { label: "Refuse the terms", response: "decline" },
        ],
      );
      return picked === "accept";
    } catch (err) {
      if (err instanceof PromptCancelledError) return "cancelled";
      throw err;
    }
  }

  private fail(context: CommandContext, detail: string, reason: string): void {
    context.note({ kind: "controller-rejected", reason, detail });
    MessageApi.scene(context.commandGiver)
      .topic(TOPIC)
      .toSelf(Mml.fromMarkup(Mml.escape(detail)))
      .send();
  }
}
