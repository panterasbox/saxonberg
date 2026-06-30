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
import { AccessApi } from "../../../api/access";
import { StuffApi } from "../../../api/stuff";
import type { CredentialWallet } from "../../../lib/credential/CredentialWallet";
import type { FastTravel } from "../../../lib/fasttravel/FastTravel";
import type { Container } from "../../../lib/spatial/Container";
import type { Stuff } from "../../../lib/stuff/Stuff";
import type { VetoResult } from "../../../lib/errors";

interface TeleportModel extends CommandModel {
  destination?: MqlOneResult;
  target?: MqlOneResult;
  force?: boolean;
}

export default class TeleportController extends CommandController<TeleportModel> {
  async execute(model: TeleportModel, context: CommandContext): Promise<void> {
    const giver: Stuff = context.commandGiver;
    if (model.target || (await this.canSelfTeleport(giver))) {
      return this.selfPoweredTeleport(model, context);
    }
    return this.tpaTeleport(model, context);
  }

  private async canSelfTeleport(giver: Stuff): Promise<boolean> {
    return (
      (await AccessApi.isAuthor(giver)) || (await AccessApi.isWizard(giver))
    );
  }

  /* ── self-powered (privileged) ──────────────────────────────────── */

  private async selfPoweredTeleport(
    model: TeleportModel,
    context: CommandContext,
  ): Promise<void> {
    const giver: Stuff = context.commandGiver;
    const subject: Stuff = model.target?.stuff ?? giver;
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

    const focused = model.destination?.stuff ?? context.location;
    if (!focused)
      return this.fail(context, "teleport where?", "no-destination");

    const dest = TeleportController._resolveDestinationContainer(focused);
    if (!dest) {
      return this.fail(
        context,
        `${focused.getPresentation()} is not a container ` +
          `and has no environment to land in`,
        "bad-destination",
      );
    }

    const veto = callTeleportHook(subject, dest);
    if (!model.force && veto && !veto.ok) {
      return this.fail(context, `canTeleport veto: ${veto.reason}`, "vetoed");
    }

    const subjectName = subject.getPresentation();
    const destName = dest.getPresentation();

    if (MixinApi.isMobile(subject)) {
      try {
        subject.teleport(dest);
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
      op(subject, dest);
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
    const giver: Stuff = context.commandGiver;
    // `teleport` is a general verb (not terminal-afforded), so the TPA fork
    // finds the node the actor can reach rather than reading commandSource.
    const node = ContainmentApi.findReachable(
      giver,
      context.location,
      (s: Stuff): s is Stuff & FastTravel => MixinApi.isFastTravel(s),
    );
    if (!node) {
      return this.fail(context, "there is no terminal here", "no-terminal");
    }

    const holder = ContainmentApi.findReachable(
      giver,
      context.location,
      (s: Stuff): s is Stuff & CredentialWallet =>
        MixinApi.isCredentialWallet(s) && !!s.getCredential("travel"),
    );
    if (!holder) {
      return this.fail(
        context,
        "you have no Teleport Authority credential",
        "no-credential",
      );
    }
    const cred = holder.ensureCredential("travel");

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
      if (MixinApi.isSensor(giver)) {
        this.tell(context, await node.renderDepartures(giver));
      }
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
    giver.teleport(arrivalRoom);
  }

  /* ── helpers ────────────────────────────────────────────────────── */

  private tell(context: CommandContext, text: string): void {
    MessageApi.scene(context.commandGiver)
      // `teleport`'s player-facing fork (the TPA ride + departures board) is a
      // diegetic in-world action, not author tooling — same narration channel
      // as the other movement commands. The privileged self-powered fork rides
      // the same helper; its operator output is fine on this channel too.
      .topic("world.narration.action")
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
