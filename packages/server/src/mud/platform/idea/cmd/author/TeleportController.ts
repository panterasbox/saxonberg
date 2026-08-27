/**
 * TeleportController — the dual-mode `teleport` verb. One verb, two forks
 * chosen by the actor's privilege, with the TPA route structurally separate
 * from self-powered teleportation:
 *
 *  - **Self-powered** (within an extent you HOLD): teleport yourself
 *    between two points inside one extent you hold, destination resolved
 *    via MQL; `--target <obj>` moves something else instead (access-gated). This subsumes the old object-relocation
 *    `teleport` and `goto`. Reuses the polished `Mobile.teleport` path with a
 *    raw-move / forceMove fallback, and the container-vs-environment focus
 *    resolution.
 *  - **TPA ride** (across a boundary, or holding nothing): rides the fast-travel network from the node
 *    you're standing at. The raw destination token is a route keyword; a bare
 *    `teleport` reads the departures board. The credential / at-a-node checks
 *    live here, inside the fork — never as verb-level validators (they would
 *    block the self-powered path).
 */

import { CommandController } from "../../../../lib/command/CommandController";
import type { CommandContext, CommandModel } from "../../../../api/command";
import { MqlApi } from "../../../../api/mql";
import type { MqlOneResult } from "../../../../api/mql";
import { MessageApi } from "../../../../api/message";
import { Mml } from "../../../../api/mml";
import { MixinApi } from "../../../../api/mixin";
import { ContainmentApi, ContainmentError } from "../../../../api/containment";
import { AccessApi } from "../../../../api/access";
import { StuffApi } from "../../../../api/stuff";
import { Currency, BankingApi, Money } from "../../../../api/banking";
import type { Charge } from "../../../../api/banking";
import { EmploymentApi } from "../../../../api/employment";
import { AppApi } from "../../../../api/app";
import { AppSettingKeys } from "../../../../lib/config/AppSettings";
import type { AetherHosted } from "../../../../lib/augmentation/AetherHosted";
import type { CredentialWallet } from "../../../../lib/credential/CredentialWallet";
import type { FastTravel } from "../../../../lib/fasttravel/FastTravel";
import type { Container } from "../../../../lib/spatial/Container";
import type { Stuff } from "../../../../lib/stuff/Stuff";
import type { VetoResult } from "../../../../lib/errors";

interface TeleportModel extends CommandModel {
  destination?: MqlOneResult;
  target?: MqlOneResult;
  force?: boolean;
}

export default class TeleportController extends CommandController<TeleportModel> {
  async execute(model: TeleportModel, context: CommandContext): Promise<void> {
    const giver: Stuff = context.commandGiver;
    const from = context.location?.getTemplatePath() ?? null;
    const to = model.destination?.stuff?.getTemplatePath() ?? from;
    if (model.target || (await this.canSelfTeleport(giver, from, to))) {
      return this.selfPoweredTeleport(model, context);
    }
    return this.tpaTeleport(model, context);
  }

  /**
   * The within-your-extent pattern (content-packs wave 3, D2d): you may
   * teleport yourself between two points inside ONE extent you hold —
   * the lounge team around the lounge, the PM (holding /world) anywhere
   * under it. Cross a boundary and it is the TPA like everyone else; the
   * wizard axis (code trust) buys no movement.
   */
  private async canSelfTeleport(
    giver: Stuff,
    from: string | null,
    to: string | null,
  ): Promise<boolean> {
    if (from === null || to === null) return false;
    const under = (path: string, extent: string): boolean =>
      path === extent || path.startsWith(extent + '/');
    const held = await AccessApi.heldExtents(giver);
    return held.some((e) => under(from, e) && under(to, e));
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
        if (this.isSandboxBoundaryDenial(err)) {
          return this.failWireDestination(context);
        }
        if (!(err instanceof ContainmentError)) throw err;
        // Mobile-level veto: fall through to the raw move.
      }
    }

    try {
      const op = model.force ? ContainmentApi.forceMove : ContainmentApi.move;
      op(subject, dest);
    } catch (err) {
      if (this.isSandboxBoundaryDenial(err)) {
        return this.failWireDestination(context);
      }
      return this.fail(context, (err as Error).message, "move-failed");
    }
    this.tell(context, `\nrelocated ${subjectName} to ${destName}\n`);
  }

  /**
   * Decision L2 (sandbox): the boundary denies real-body placement into
   * a circle; only the prose is ours (see GotoController).
   */
  private isSandboxBoundaryDenial(err: unknown): boolean {
    return (
      err instanceof Error && err.message.startsWith("sandbox boundary denied")
    );
  }

  private failWireDestination(context: CommandContext): void {
    return this.fail(
      context,
      "that place is on the wire — no real body can be placed inside a " +
        "circle. Enter through its wardrobe.",
      "move-failed"
    );
  }

  /* ── TPA ride (unprivileged) ────────────────────────────────────── */

  private async tpaTeleport(
    model: TeleportModel,
    context: CommandContext,
  ): Promise<void> {
    const giver: Stuff = context.commandGiver;
    // `teleport` is a general verb (not terminal-afforded), so the TPA fork
    // finds the node the actor can reach rather than reading commandSource.
    const reachable = MqlApi.resolveMany("reachable", {
      commandGiver: context.commandGiver,
      scope: "reachable",
    }).stuff;
    const node =
      reachable.find(
        (s): s is Stuff & FastTravel => MixinApi.isFastTravel(s),
      ) ?? null;
    if (!node) {
      return this.fail(context, "there is no terminal here", "no-terminal");
    }

    // Instrument gate: "do you have the means to use the TPA at all?" — any
    // reachable travel holder satisfies it (a carried card OR the born-with
    // implant), so onboarding and the un-implanted are never stranded.
    const instrument =
      reachable.find(
        (s): s is Stuff & CredentialWallet =>
          MixinApi.isCredentialWallet(s) && !!s.getCredential("travel"),
      ) ?? null;
    if (!instrument) {
      return this.fail(
        context,
        "you have no Teleport Authority credential",
        "no-credential",
      );
    }
    // Clearance is read off IDENTITY, never the carried instrument: the
    // actor's own aether-hosted wallet (a single-object read on the giver's
    // own hosted updates). A loaded card handed to another player confers no
    // clearance. When the actor hosts no wallet (un-attuned, card-only) the
    // clearance store is the born-with floor only.
    const identity = MixinApi.isAether(giver)
      ? (giver
          .getHostedUpdates()
          .find(
            (s): s is Stuff & AetherHosted & CredentialWallet =>
              MixinApi.isCredentialWallet(s) && !!s.getCredential("travel"),
          ) ?? null)
      : null;
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
      const ok = await this.settleFare(context, fee, surcharge, node, destNode);
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
   *    **departure terminal** (`ensureOperatorAt(node)` — keyed on the fixture,
   *    not the room, so two venues sharing a room each resolve their own
   *    operator; stands the Business up lazily if it isn't live), which keeps
   *    `fee − networkFee`;
   *  - the TPA **network fee** (`min(fee, base + floor(fee × rate))`) → the
   *    global TPA operating budget (levied on the ride, i.e. the `fee` only);
   *  - **`surcharge`** (the destination node's own arrival charge) → the
   *    Business operating the **destination terminal**, the mirror of the fee's
   *    departure attribution — again fixture-keyed.
   *
   * All un-spoofable (resolved from the fixtures, never a caller token). A
   * `fee > 0` with no departure operator, or a `surcharge > 0` with no
   * destination operator, is an authoring error → refuse. Tries
   * credential, then cash — both split identically (cash via the cash bridge,
   * D12). Returns false (and refuses, without moving the traveller) on
   * no-operator / insufficient funds.
   */
  private async settleFare(
    context: CommandContext,
    fee: number,
    surcharge: number,
    node: Stuff & FastTravel,
    destNode: Stuff & FastTravel,
  ): Promise<boolean> {
    // Departure operator (collects the base fare) — required only when fee>0.
    // Keyed on the departure TERMINAL (the fixture), stood up lazily if needed.
    let cityBudgetAccount: string | null = null;
    if (fee > 0) {
      const here = (node as unknown as Stuff).getTemplatePath();
      const operator = here ? await EmploymentApi.ensureOperatorAt(here) : null;
      if (!operator) {
        this.fail(context, "this gate has no operator to collect the fare", "no-operator");
        return false;
      }
      try {
        // Custody is the operator Business's authored banksAt.
        cityBudgetAccount = await EmploymentApi.operatingAccountOf(operator);
      } catch {
        this.fail(context, "the fare can't be collected here", "no-operator");
        return false;
      }
    }

    // Destination operator (collects the surcharge) — required only when
    // surcharge>0. Keyed on the destination TERMINAL (the fixture), never a token.
    let destOperatorAccount: string | null = null;
    if (surcharge > 0) {
      const destHere = (destNode as unknown as Stuff).getTemplatePath();
      const destOperator = destHere
        ? await EmploymentApi.ensureOperatorAt(destHere)
        : null;
      if (!destOperator) {
        this.fail(
          context,
          "this destination has no operator to collect its surcharge",
          "no-operator",
        );
        return false;
      }
      try {
        destOperatorAccount =
          await EmploymentApi.operatingAccountOf(destOperator);
      } catch {
        this.fail(context, "the surcharge can't be collected there", "no-operator");
        return false;
      }
    }

    const rate =
      Number(AppApi.setting(AppSettingKeys.fasttravelNetworkFeeRate)) || 0;
    const base =
      Number(AppApi.setting(AppSettingKeys.fasttravelNetworkFeeBase)) || 0;
    let networkFee = fee > 0 ? Math.min(fee, base + Math.floor(fee * rate)) : 0;
    // The network fee accrues to the Teleport Authority — a Business (its
    // operating account, custodied at its authored banksAt), never a bare
    // well-known account id. An unresolvable TPA (unseeded world) forfeits
    // the levy to the departure operator rather than blocking the ride.
    let tpaAccount: string | null = null;
    if (networkFee > 0) {
      tpaAccount = await this.resolveTpaAccount();
      if (!tpaAccount) {
        console.warn(
          "TeleportController: no Teleport Authority Business resolvable — network fee waived",
        );
        networkFee = 0;
      }
    }
    const total = fee + surcharge;

    // Build the split. When there's a base fare, the departure city budget is
    // the main payee (nets `fee − networkFee = total − networkFee − surcharge`)
    // and the TPA + destination legs are splits. A surcharge-only trip
    // (fee 0) pays the whole surcharge to the destination operator directly.
    const splits: Charge["splits"] = [];
    let payeeAccountId: string;
    if (cityBudgetAccount) {
      payeeAccountId = cityBudgetAccount;
      if (networkFee > 0 && tpaAccount) {
        splits.push({ accountId: tpaAccount, amount: Money.of(networkFee, Currency.compact()), category: "networkFee" });
      }
      if (destOperatorAccount && surcharge > 0) {
        splits.push({ accountId: destOperatorAccount, amount: Money.of(surcharge, Currency.compact()), category: "fare" });
      }
    } else {
      // Surcharge-only (free route into a surcharged destination). Reached only
      // when fee===0, so settleFare's guard implies surcharge>0, so the
      // destination-operator resolution above set destOperatorAccount.
      payeeAccountId = destOperatorAccount!;
    }

    const charge: Charge = {
      amount: Money.of(total, Currency.compact()),
      reason: "TPA fare",
      presented: true,
      payeeAccountId,
      category: "fare",
      splits,
    };
    // Credential first, then cash — a coin-holder rides too, and the split
    // holds either way (cash crosses the bridge). The credential attempt
    // swallows every error (no wallet, insufficient credential balance, …) and
    // falls through to cash; the terminal cash failure is what surfaces to the
    // player. A genuine banking fault (bad account, conservation) therefore
    // reads as "you can't cover the fare" — acceptable at demo scale, matching
    // the OrderController settle precedent.
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

  /**
   * The Teleport Authority's operating account: resolve the TPA Business
   * (`fasttravel.tpaBusinessPath`, stood up on demand) and open/find its
   * account at its authored `banksAt`. Null when unseeded/unresolvable —
   * the caller waives the levy rather than blocking the ride.
   */
  private async resolveTpaAccount(): Promise<string | null> {
    let path = "";
    try {
      path = AppApi.setting(AppSettingKeys.fasttravelTpaBusinessPath) || "";
    } catch {
      return null; // settings unwarmed (tests) — no TPA to levy for
    }
    if (!path) return null;
    try {
      const tpa =
        StuffApi.findByTemplatePath(path) ??
        (await StuffApi.singletonOrClone<Stuff>(path));
      if (!tpa || !MixinApi.isBusiness(tpa)) return null;
      return await EmploymentApi.operatingAccountOf(tpa);
    } catch {
      return null;
    }
  }

  private tell(context: CommandContext, text: string): void {
    MessageApi.scene(context.commandGiver)
      // `teleport`'s player-facing fork (the TPA ride + departures board) is a
      // diegetic in-world action, not author tooling — same narration channel
      // as the other movement commands. The privileged self-powered fork rides
      // the same helper; its operator output is fine on this channel too.
      .topic("act.deed")
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
