/**
 * TeleportController — the `teleport` verb, purely diegetic. One verb,
 * a fork order that decides which of four things you meant:
 *
 * ```
 * both endpoints in one extent you HOLD → free, no mana, no registration
 * at a node, a keyword given            → the TPA ride
 * at a node, nothing given              → the departures board, for EVERYONE
 * otherwise, a destination given        → the anchored spell
 * ```
 *
 * ⭐ **The order is load-bearing** (TPA reform P12). It used to ask
 * `canSelfTeleport` FIRST, which meant an extent-holder standing at a
 * terminal never saw the board and silently self-powered past the TPA
 * path — and an unregistered traveller who typed a bare `teleport` was
 * refused before the board could render. Deciding the board BEFORE any
 * clearance read closes both at once: *the board is a public timetable,
 * not a boarding pass.*
 *
 * ⚠ Object relocation is **not here**. `teleport --target` moved to the
 * kernel's `goto --subject` (P13): authorial tooling must not evaporate
 * when this pack is absent, and one verb meaning two unrelated things
 * depending on who typed it was the wrong shape anyway.
 *
 * The credential / at-a-node checks live inside the ride fork, never as
 * verb-level validators — the two that existed were deleted with this
 * move, since the controller re-checks both.
 */

import { CommandController } from "@saxonberg/server/mud/lib/command/CommandController";
import type { CommandContext, CommandModel } from "@saxonberg/server/mud/api/command";
import { MqlApi } from "@saxonberg/server/mud/api/mql";
import type { MqlOneResult } from "@saxonberg/server/mud/api/mql";
import { MessageApi } from "@saxonberg/server/mud/api/message";
import { Mml } from "@saxonberg/server/mud/api/mml";
import { MixinApi } from "@saxonberg/server/mud/api/mixin";
import { AccessApi } from "@saxonberg/server/mud/api/access";
import { StuffApi } from "@saxonberg/server/mud/api/stuff";
import { Currency, BankingApi, Money } from "@saxonberg/server/mud/api/banking";
import type { Charge } from "@saxonberg/server/mud/api/banking";
import { EmploymentApi } from "@saxonberg/server/mud/api/employment";
import { AppApi } from "@saxonberg/server/mud/api/app";
import { AppSettingKeys } from "@saxonberg/server/mud/lib/config/AppSettings";
import type { AetherHosted } from "@saxonberg/server/mud/lib/augmentation/AetherHosted";
import type { CredentialWallet } from "@saxonberg/server/mud/lib/credential/CredentialWallet";
import type { Stuff } from "@saxonberg/server/mud/lib/stuff/Stuff";
import { FAST_TRAVEL_MIXIN, type FastTravel } from "../../../lib/FastTravel";

interface TeleportModel extends CommandModel {
  destination?: MqlOneResult;
}

export default class TeleportController extends CommandController<TeleportModel> {
  async execute(model: TeleportModel, context: CommandContext): Promise<void> {
    const giver: Stuff = context.commandGiver;

    // 1. Free movement inside an extent you hold AUTHORIAL AUTHORITY over
    //    (D11). Needs a named destination — a bare `teleport` is always a
    //    request to read the board.
    if (model.destination?.stuff) {
      const from = context.location?.getTemplatePath() ?? null;
      const to = model.destination.stuff.getTemplatePath() ?? from;
      if (await this.canMoveFreely(giver, from, to)) {
        return this.freeMove(model, context);
      }
    }

    return this.tpaTeleport(model, context);
  }

  /**
   * The within-your-extent pattern (content-packs wave 3, D2d; re-grounded
   * by TPA reform D11): you may move yourself between two points inside ONE
   * extent you hold — the lounge team around the lounge, the PM (holding
   * `/world`) anywhere under it. It is free, costs no mana, and needs no
   * registration.
   *
   * ⭐ The right frame is **authorial authority**, not privilege: this is
   * the same authority that lets you edit the place, and moving around
   * inside what you author is not a journey. Cross a boundary and it is the
   * TPA like everyone else; the wizard axis (code trust) buys no movement.
   *
   * ⚠ `heldExtents` admits on `ParcelRecord.getOwner()` and is structurally
   * blind to `grants[]`, so a USE-GRANT holder is excluded with nothing
   * written here (AC20) — a lease is not authorship.
   */
  private async canMoveFreely(
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

  /* ── free movement inside an extent you hold ────────────────────── */

  /**
   * Move the actor, and nobody else. No mana, no fare, no credential —
   * you are moving inside what you author.
   */
  private freeMove(model: TeleportModel, context: CommandContext): void {
    const giver: Stuff = context.commandGiver;
    if (!MixinApi.isContainable(giver) || !MixinApi.isMobile(giver)) {
      return this.fail(context, "you can't travel", "immobile");
    }
    const focused = model.destination?.stuff ?? context.location;
    if (!focused) return this.fail(context, "teleport where?", "no-destination");

    const dest = MixinApi.isContainer(focused)
      ? focused
      : MixinApi.isContainable(focused)
        ? focused.getContainer()
        : null;
    if (!dest || !MixinApi.isContainer(dest)) {
      return this.fail(
        context,
        `${focused.getPresentation()} is not a place you can arrive in`,
        "bad-destination",
      );
    }

    try {
      giver.teleport(dest);
    } catch (err) {
      if (
        err instanceof Error &&
        err.message.startsWith("sandbox boundary denied")
      ) {
        return this.fail(
          context,
          "that place is on the wire — no real body can be placed inside a " +
            "circle. Enter through its wardrobe.",
          "move-failed",
        );
      }
      return this.fail(context, (err as Error).message, "move-failed");
    }
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
        (s): s is Stuff & FastTravel => MixinApi.isActive(s, FAST_TRAVEL_MIXIN),
      ) ?? null;
    if (!node) {
      return this.fail(context, "there is no terminal here", "no-terminal");
    }

    // ⭐ **The board is a public timetable, and it renders BEFORE any
    // clearance read** (TPA reform D9/AC15). A bare `teleport` at a node
    // is a request to read it, and it is exactly the text `look
    // <terminal>` already shows anybody through `readScreen` — so gating
    // it behind a credential made the one verb that could show you the
    // network refuse the people who most needed to see it. It also
    // renders for an extent-holder, who used to self-power past this
    // fork and never learn the terminal was there.
    //
    // ⚠ It must be decided on "was a keyword typed", NOT on
    // `getSelectedDestination()`: that getter falls back to the first
    // route, so it is never null on a node with routes, and the board
    // was unreachable from a bare `teleport` for the whole of its life.
    const kw = model.destination?.raw;
    if (!kw) {
      if (MixinApi.isSensor(giver)) {
        // The board is PROSE, and prose off a screen is read, never
        // pushed: `renderDepartures` annotates each route against THIS
        // reader's travel credential, so a shared payload would show the
        // whole room whichever traveller last touched the terminal.
        this.tell(context, await node.renderDepartures(giver));
        return;
      }
      return this.fail(context, "you can't read the board", "cannot-read");
    }

    // Everything below is a RIDE, and a ride is gated.

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

    // The keyword picks the route (a raw token, matched locally against
    // this node's routes — NOT the MQL world resolution).
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
    const ref = res.route.ref;

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
      // as the other movement commands.
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
}
