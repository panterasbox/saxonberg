/**
 * TeleportController — the dual-mode `teleport` verb. One verb, two forks
 * chosen by the actor's privilege, with the TPA route structurally separate
 * from self-powered teleportation:
 *
 *  - **Self-powered** (privileged — author/developer): teleport yourself
 *    anywhere, destination resolved via MQL; `--target <obj>` moves something
 *    else instead (access-gated). This subsumes the old object-relocation
 *    `teleport` and `goto`. Reuses the polished `Mobile.teleport` path with a
 *    raw-move / forceMove fallback, and the container-vs-environment focus
 *    resolution.
 *  - **TPA ride** (unprivileged): rides the fast-travel network from the node
 *    you're standing at. The raw destination token is a route keyword; a bare
 *    `teleport` reads the departures board. The credential / at-a-node checks
 *    live here, inside the fork — never as verb-level validators (they would
 *    block the self-powered path).
 */

import { CommandController } from "../../../lib/command/CommandController";
import type { CommandContext, CommandModel } from "../../../api/command";
import type { MqlOneResult } from "../../../api/mql";
import { MessageApi } from "../../../api/message";
import { Mml } from "../../../api/mml";
import { MixinApi } from "../../../api/mixin";
import { ContainmentApi, ContainmentError } from "../../../api/containment";
import { DescribeApi } from "../../../api/describe";
import { AccessApi } from "../../../api/access";
import { StuffApi } from "../../../api/stuff";
import { findActiveCredential } from "../../../lib/fasttravel/TravelCredential";
import type { FastTravel } from "../../../lib/fasttravel/FastTravel";
import type { Container } from "../../../lib/spatial/Container";
import type { Containable } from "../../../lib/spatial/Containable";
import type { Mobile } from "../../../lib/spatial/Mobile";
import type { Sensor } from "../../../lib/message/Sensor";
import type { Stuff } from "../../../lib/stuff/Stuff";
import type { VetoResult } from "../../../lib/errors";

interface TeleportModel extends CommandModel {
  destination?: MqlOneResult;
  target?: MqlOneResult;
  force?: boolean;
}

export default class TeleportController extends CommandController<TeleportModel> {
  async execute(model: TeleportModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver as unknown as Stuff;
    if (model.target || (await this.canSelfTeleport(giver))) {
      return this.selfPoweredTeleport(model, context);
    }
    return this.tpaTeleport(model, context);
  }

  private async canSelfTeleport(giver: Stuff): Promise<boolean> {
    return (
      (await AccessApi.isAuthor(giver)) || (await AccessApi.isDeveloper(giver))
    );
  }

  /* ── self-powered (privileged) ──────────────────────────────────── */

  private async selfPoweredTeleport(
    model: TeleportModel,
    context: CommandContext,
  ): Promise<void> {
    const giver = context.commandGiver as unknown as Stuff;
    const subject = (model.target?.stuff as Stuff | null) ?? giver;
    if (!MixinApi.isContainable(subject)) {
      return this.fail(context, "that can't be teleported", "not-containable");
    }

    // Moving someone/something else is access-gated.
    if (subject !== giver) {
      const action = model.force ? "force-teleport" : "teleport";
      if (!(await AccessApi.can(giver, action, subject))) {
        return this.fail(
          context,
          "you don't have permission to teleport that",
          "access-denied",
        );
      }
    }

    const focused =
      (model.destination?.stuff as Stuff | null | undefined) ??
      context.location;
    if (!focused)
      return this.fail(context, "teleport where?", "no-destination");

    const dest = TeleportController._resolveDestinationContainer(focused);
    if (!dest) {
      return this.fail(
        context,
        `${DescribeApi.getDisplayName(focused)} is not a container ` +
          `and has no environment to land in`,
        "bad-destination",
      );
    }

    const veto = callTeleportHook(subject, dest);
    if (!model.force && veto && !veto.ok) {
      return this.fail(context, `canTeleport veto: ${veto.reason}`, "vetoed");
    }

    const subjectName = DescribeApi.getDisplayName(subject);
    const destName = DescribeApi.getDisplayName(dest);

    if (MixinApi.isMobile(subject)) {
      try {
        (subject as Stuff & Mobile).teleport(dest);
        if (subject !== giver) {
          this.tell(context, `\nteleported ${subjectName} to ${destName}\n`);
        }
        return;
      } catch (err) {
        if (!(err instanceof ContainmentError)) throw err;
        // Mobile-level veto: fall through to the raw move.
      }
    }

    try {
      const op = model.force ? ContainmentApi.forceMove : ContainmentApi.move;
      op(subject as Stuff & Containable, dest);
    } catch (err) {
      return this.fail(context, (err as Error).message, "move-failed");
    }
    this.tell(context, `\nrelocated ${subjectName} to ${destName}\n`);
  }

  /* ── TPA ride (unprivileged) ────────────────────────────────────── */

  private async tpaTeleport(
    model: TeleportModel,
    context: CommandContext,
  ): Promise<void> {
    const giver = context.commandGiver as unknown as Stuff;
    const room = context.location;
    const node =
      room && MixinApi.isContainer(room)
        ? (room.getContents().find((s) => MixinApi.isFastTravel(s)) as
            | (Stuff & FastTravel)
            | undefined)
        : undefined;
    if (!node) {
      return this.fail(context, "there is no terminal here", "no-terminal");
    }

    const cred = findActiveCredential(giver);
    if (!cred) {
      return this.fail(
        context,
        "you have no Teleport Authority credential",
        "no-credential",
      );
    }

    if (!node.isDeparture()) {
      return this.fail(
        context,
        "this terminal is for arrivals only",
        "not-departure",
      );
    }

    // Optional keyword → change the selection (raw token, matched locally
    // against this node's routes — NOT the MQL world resolution).
    const kw = model.destination?.raw;
    if (kw) {
      const res = await node.resolveRouteByKeyword(kw);
      if (res.ambiguous) {
        return this.fail(
          context,
          `several routes match '${kw}' — be more specific`,
          "ambiguous",
        );
      }
      if (!res.route) {
        return this.fail(
          context,
          `no route here goes to '${kw}'`,
          "route-not-found",
        );
      }
      node.setSelectedDestination(res.route.ref);
    }

    const ref = node.getSelectedDestination();
    if (!ref) {
      this.tell(
        context,
        await node.renderDepartures(giver as unknown as Stuff & Sensor),
      );
      return;
    }

    if (!cred.isRegistered(ref)) {
      return this.fail(
        context,
        "you haven't registered that destination — reach it another way and `register` first",
        "not-registered",
      );
    }

    const destNode = await StuffApi.singleton<Stuff & FastTravel>(ref);
    const arrivalRoom = await destNode.getArrivalRoom();

    if (!MixinApi.isMobile(giver) || !MixinApi.isContainable(giver)) {
      return this.fail(context, "you can't travel", "immobile");
    }
    (giver as Stuff & Mobile).teleport(arrivalRoom);
  }

  /* ── helpers ────────────────────────────────────────────────────── */

  private tell(context: CommandContext, text: string): void {
    MessageApi.scene(context.commandGiver)
      .topic("system.shell.author")
      .toSelf(Mml.fromMarkup(text))
      .send();
  }

  private fail(
    context: CommandContext,
    detail: string,
    reason: string = "unspecified",
  ): void {
    this.tell(context, `\n${detail}\n`);
    context.note({ kind: "controller-rejected", reason, detail });
  }

  /**
   * Focus-resolution rule (self-powered fork): Container → as-is;
   * Containable-only → its environment; neither → null. Static so it stays
   * unit-testable without a free-floating export.
   */
  static _resolveDestinationContainer(
    focused: Stuff,
  ): (Stuff & Container) | null {
    if (MixinApi.isContainer(focused)) return focused;
    if (MixinApi.isContainable(focused)) {
      const env = focused.getContainer();
      if (env && MixinApi.isContainer(env)) return env;
    }
    return null;
  }
}

/** Optional witness — fire if present, return undefined otherwise. */
function callTeleportHook(
  target: Stuff,
  destination: Stuff,
): VetoResult | undefined {
  const fn = (target as unknown as Record<string, unknown>)["canTeleport"];
  if (typeof fn !== "function") return undefined;
  return (fn as (d: Stuff) => VetoResult).call(target, destination);
}
