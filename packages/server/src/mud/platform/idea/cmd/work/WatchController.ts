/**
 * ⭐⭐ WatchController — `watch` / `watch off`: stand a guard's post.
 *
 * The verb half of the third clause template. `job post watch <place> for
 * <n> hours` posts it, `job claim` takes it, and this is the doing —
 * which, uniquely, is **nothing at all**. You stand there. The engagement
 * holds `body`, `hands` and `attention` and leaves `voice` free, so
 * everything else you might do is refused by the slot conflict rather
 * than by a rule somebody wrote, and talking to people still works.
 *
 * ⚠ Time accrues in game-seconds onto the contract's own record, banked
 * at release — so standing down early banks a short watch rather than
 * voiding it. Leaving your post is a decision with a price, not a
 * mistake that erases the evening.
 *
 * Afforded from `self` by the born-with credential wallet, exactly like
 * `fulfill`: the work travels with the worker, not with a fixture.
 */

import { CommandController } from "../../../../lib/command/CommandController";
import type { CommandContext, CommandModel } from "../../../../api/command";
import { MessageApi } from "../../../../api/message";
import { Mml } from "../../../../api/mml";
import { MixinApi } from "../../../../api/mixin";
import { SchedulerApi } from "../../../../api/scheduler";
import { ContractApi } from "../../../../api/contract";
import {
  WatchEngagement,
  WATCH_TYPE,
} from "../../../../lib/employment/WatchEngagement";
import type { Engaged } from "../../../../lib/activity/Engaged";
import type { Stuff } from "../../../../lib/stuff/Stuff";

const TOPIC = "act.deed";

interface WatchModel extends CommandModel {
  /** `off` stands down; anything else (or nothing) stands the post. */
  subcommand?: string;
}

export default class WatchController extends CommandController<WatchModel> {
  async execute(model: WatchModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver as unknown as Stuff & Engaged;
    if (!MixinApi.isEngaged(giver)) {
      return this.fail(context, "You cannot stand a watch.", "not-engageable");
    }
    const standing = giver.getEngagementByType(WATCH_TYPE) as
      | WatchEngagement
      | undefined;

    if ((model.subcommand ?? "").toLowerCase() === "off") {
      if (!standing) {
        return this.fail(context, "You are not on watch.", "not-watching");
      }
      const served = standing.servedSec();
      SchedulerApi.cancel(standing, "watch-ended");
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(
          Mml.fromMarkup(
            Mml.escape(
              `You stand down. ${Math.floor(served / 3600)} hours served.`,
            ),
          ),
        )
        .toPeers(Mml.compose`${Mml.actor(giver)} stands down.`)
        .send();
      return;
    }

    if (standing) {
      return this.fail(context, "You are already on watch.", "already-watching");
    }

    // The claim being served. A watch is worth standing only against a
    // gig that asked for one — otherwise you are just loitering, which
    // needs no verb.
    const claims = await ContractApi.activeClaims();
    const watchGig = claims.find(
      (g) => g.clause?.condition?.template === "watch",
    );
    if (!watchGig) {
      return this.fail(
        context,
        "You hold no watch to stand. Claim one off a board first.",
        "no-watch-claim",
      );
    }

    // ⚠ At the post, or nowhere. The place is the point.
    const here = MixinApi.isContainable(giver)
      ? (giver.getContainer()?.getTemplatePath() ?? "")
      : "";
    const post = watchGig.clause?.condition?.destinationPath ?? "";
    if (here !== post) {
      return this.fail(
        context,
        "This is not the place you agreed to watch.",
        "wrong-place",
      );
    }

    const engagement = new WatchEngagement(giver, watchGig.contractId, post);
    const started = SchedulerApi.start(engagement);
    if (!started.ok) {
      // ⭐ The refusal comes from the SLOT CONFLICT, not from a rule
      // anybody wrote: a watch wants body, hands and attention, so
      // whatever you were doing says no for you.
      return this.fail(
        context,
        "Your hands are full. Put it down first.",
        "busy",
      );
    }
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(
        Mml.fromMarkup(
          Mml.escape(
            "You take up your post. Hands free, eyes open. `watch off` when " +
              "you are done.",
          ),
        ),
      )
      .toPeers(Mml.compose`${Mml.actor(giver)} takes up a post.`)
      .send();
  }

  private fail(context: CommandContext, message: string, reason: string): void {
    context.note({ kind: "controller-rejected", reason, detail: message });
    MessageApi.scene(context.commandGiver)
      .topic(TOPIC)
      .toSelf(Mml.fromMarkup(Mml.escape(message)))
      .send();
  }
}
