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
import { BankingApi, Money } from "../../../api/banking";
import type { Charge } from "../../../api/banking";
import { EmploymentApi } from "../../../api/employment";
import { AppApi } from "../../../api/app";
import { AppSettingKeys } from "../../../lib/config/AppSettings";
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

    // Instrument gate: "do you have the means to use the TPA at all?" — any
    // reachable travel holder satisfies it (a carried card OR the born-with
    // implant), so onboarding and the un-implanted are never stranded.
    const instrument = ContainmentApi.findReachable(
      giver,
      context.location,
      (s: Stuff): s is Stuff & CredentialWallet =>
        MixinApi.isCredentialWallet(s) && !!s.getCredential("travel"),
    );
    if (!instrument) {
      return this.fail(
        context,
        "you have no Teleport Authority credential",
        "no-credential",
      );
    }
    // Clearance is read off IDENTITY, never the carried instrument: the
    // actor's own aether-hosted wallet (leg-2 isolation). A loaded card
    // handed to another player confers no clearance. When the actor hosts no
    // wallet (un-attuned, card-only) the clearance store is the born-with
    // floor only.
    const identity = ContainmentApi.findHostedUpdate(
      giver,
      (s: Stuff): s is Stuff & CredentialWallet =>
        MixinApi.isCredentialWallet(s) && !!s.getCredential("travel"),
    );
    const cred = identity?.getCredential("travel") ?? null;

    if (!node.isDeparture()) {
      return this.fail(
        context,
        "this terminal is for arrivals only",
        "not-departure",
      );
    }

    if (node.getStatus() !== "operational") {
      return this.fail(
        context,
        "this gate is out of service — no departures board here today",
        "out-of-service",
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

    // A null clearance store (un-attuned actor with no identity wallet) is
    // empty clearance → not-registered, exactly as an unregistered node.
    if (!cred || !cred.isRegistered(ref)) {
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

    // Paid routes settle the fare BEFORE travelling (insufficient funds
    // refuses without moving). The total is the route's `fee` (the departure
    // charge) plus the destination node's own arrival `surcharge` — both
    // optional. A fully free trip (fee 0 + surcharge 0) skips settlement.
    const fee = node.getRoutes().get(ref)?.fee ?? 0;
    const surcharge = destNode.getSurcharge();
    if (fee > 0 || surcharge > 0) {
      const ok = await this.settleFare(context, fee, surcharge, arrivalRoom);
      if (!ok) return;
    }

    giver.teleport(arrivalRoom);
  }

  /**
   * Settle a paid trip — `total = fee + surcharge`, both optional — split
   * across up to three operating budgets, all resolved **un-spoofably** (never
   * a caller parameter), and conserved:
   *
   *  - **`fee`** (the route's departure charge) → the Business operating the
   *    **departure gate** (`businessAt(context.location)` — the OrderController
   *    precedent), which keeps `fee − networkFee`;
   *  - the TPA **network fee** (`min(fee, base + floor(fee × rate))`) → the
   *    global TPA operating budget (levied on the ride, i.e. the `fee` only);
   *  - **`surcharge`** (the destination node's own arrival charge) → the
   *    Business operating the **destination's arrival room**, the mirror of
   *    the fee's departure attribution.
   *
   * A `fee > 0` with no departure operator, or a `surcharge > 0` with no
   * destination operator, is an authoring error → refuse ([DECIDE-A]). Tries
   * credential, then cash — both split identically (cash via the cash bridge,
   * D12). Returns false (and refuses, without moving the traveller) on
   * no-operator / insufficient funds.
   */
  private async settleFare(
    context: CommandContext,
    fee: number,
    surcharge: number,
    arrivalRoom: Stuff & Container,
  ): Promise<boolean> {
    // Departure operator (collects the base fare) — required only when fee>0.
    let cityBudgetAccount: string | null = null;
    if (fee > 0) {
      const here = context.location?.getTemplatePath();
      const bizPath = (here ? EmploymentApi.businessAt(here) : undefined)
        ?.getAccountPath();
      if (!bizPath) {
        this.fail(context, "this gate has no operator to collect the fare", "no-operator");
        return false;
      }
      try {
        cityBudgetAccount = await BankingApi.ensureVenueAccount(bizPath, bizPath, "");
      } catch {
        this.fail(context, "the fare can't be collected here", "no-operator");
        return false;
      }
    }

    // Destination operator (collects the surcharge) — required only when
    // surcharge>0. Resolved from the destination's arrival room, never a token.
    let destOperatorAccount: string | null = null;
    if (surcharge > 0) {
      const destHere = arrivalRoom.getTemplatePath();
      const destPath = (destHere ? EmploymentApi.businessAt(destHere) : undefined)
        ?.getAccountPath();
      if (!destPath) {
        this.fail(
          context,
          "this destination has no operator to collect its surcharge",
          "no-operator",
        );
        return false;
      }
      try {
        destOperatorAccount = await BankingApi.ensureVenueAccount(destPath, destPath, "");
      } catch {
        this.fail(context, "the surcharge can't be collected there", "no-operator");
        return false;
      }
    }

    const rate =
      Number(AppApi.setting(AppSettingKeys.fasttravelNetworkFeeRate)) || 0;
    const base =
      Number(AppApi.setting(AppSettingKeys.fasttravelNetworkFeeBase)) || 0;
    const networkFee = fee > 0 ? Math.min(fee, base + Math.floor(fee * rate)) : 0;
    const tpaAccount =
      AppApi.setting(AppSettingKeys.fasttravelTpaAccount) || "tpa";
    const total = fee + surcharge;

    // Build the split. When there's a base fare, the departure city budget is
    // the main payee (nets `fee − networkFee = total − networkFee − surcharge`)
    // and the TPA + destination legs are splits. A surcharge-only trip
    // (fee 0) pays the whole surcharge to the destination operator directly.
    const splits: Charge["splits"] = [];
    let payeeAccountId: string;
    if (cityBudgetAccount) {
      payeeAccountId = cityBudgetAccount;
      if (networkFee > 0) {
        splits.push({ accountId: tpaAccount, amount: Money.of(networkFee), category: "networkFee" });
      }
      if (destOperatorAccount && surcharge > 0) {
        splits.push({ accountId: destOperatorAccount, amount: Money.of(surcharge), category: "fare" });
      }
    } else {
      // Surcharge-only (free route into a surcharged destination).
      payeeAccountId = destOperatorAccount!;
    }

    const charge: Charge = {
      amount: Money.of(total),
      reason: "TPA fare",
      presented: true,
      payeeAccountId,
      category: "fare",
      splits,
    };
    // Credential first, then cash — a coin-holder rides too, and the split
    // holds either way (cash crosses the bridge). Any failure refuses.
    try {
      await BankingApi.settle(charge, { kind: "credential" });
      return true;
    } catch {
      /* fall through to cash */
    }
    try {
      await BankingApi.settle(charge, { kind: "cash" });
      return true;
    } catch {
      this.fail(context, "you can't cover the fare", "fare-declined");
      return false;
    }
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
