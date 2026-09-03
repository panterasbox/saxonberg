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
import { SchedulerApi } from "@saxonberg/server/mud/api/scheduler";
import { CastActivity } from "@saxonberg/server/mud/lib/magic/CastActivity";
import type { AbortReason } from "@saxonberg/types";
import type { Caster } from "@saxonberg/server/mud/lib/magic/Caster";
import type { CommandGiver } from "@saxonberg/server/mud/lib/command/CommandGiver";
import { FAST_TRAVEL_MIXIN, type FastTravel } from "../../../lib/FastTravel";

/** The working the anchored front door casts. One spell, two grammars. */
const TELEPORT_SPELL = "teleport";

/** Which anchor answered — for the refusal prose, never for the gate. */
type Anchor = "extent" | "registered" | "scope";

interface AnchoredHit {
  stuff: Stuff | null;
  ambiguous: boolean;
  anchor: Anchor | null;
}

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

  /* ── the anchored spell (D10) ───────────────────────────────────── */

  /**
   * Cast `teleport` at a destination resolved through the ANCHORS —
   * the off-network front door.
   *
   * ⭐ Two front doors, deliberately complementary. `cast teleport` is
   * **see-it-and-go**: arcana's own verb, the ordinary `reachable`
   * scope, a short hop across a room you are looking at. `teleport` is
   * the **anchored** door: the long hop to somewhere you are *not*, and
   * the only way to name it is one of the three things you can honestly
   * be said to hold in mind. One spell row, one cost function, two
   * grammars.
   */
  private async anchoredCast(
    raw: string,
    context: CommandContext,
  ): Promise<void> {
    const giver: Stuff = context.commandGiver;

    // ⭐ The SPECIFICATION is checked before the faculty, deliberately.
    // Failing to hold a place clearly is a failure about the place, not
    // about you — a caster and a non-caster who both said something
    // vague deserve the same answer, and it is the more useful one.
    const hit = await TeleportController.resolveAnchored(giver, raw);
    if (hit.ambiguous) {
      // ⚠ A FAILED SPECIFICATION, never a disambiguation prompt (D10).
      // Teleportation's hard part is holding a place precisely; "which
      // of these did you mean" is the engine admitting you did not, and
      // then doing it anyway. The refusal IS the mechanic.
      return this.fail(
        context,
        `several places answer to '${raw}' — you cannot hold it clearly ` +
          `enough to arrive in it`,
        "failed-specification",
      );
    }
    if (!hit.stuff) {
      return this.fail(
        context,
        `you cannot bring '${raw}' to mind — you have never surveyed it, ` +
          `it is not yours, and it is not in front of you`,
        "no-anchor",
      );
    }

    if (!MixinApi.isCaster(giver)) {
      return this.fail(
        context,
        `no terminal here goes there, and you have no gift to make the ` +
          `hop yourself`,
        "no-faculty",
      );
    }

    const caster = giver as Stuff & CommandGiver & Caster;
    const prep = await caster.prepareCast(TELEPORT_SPELL, hit.stuff);
    if (!prep.ok) {
      return this.fail(
        context,
        prep.refusal ?? "the working will not come",
        "cast-refused",
      );
    }

    // ⚠ The anchored hop REFUSES a short pool rather than overchannelling
    // into it (AC18). Overchannelling is a fair price for a firebolt you
    // chose to force; paying it to travel would make strain the ordinary
    // cost of getting anywhere, which is not a bargain anyone would take
    // knowingly. The quote is `prepareCast`'s, so nothing was spent.
    const pool = MixinApi.isReserved(giver)
      ? (caster.getMana()?.current.rawValue() ?? 0)
      : 0;
    const price = prep.costTau ?? 0;
    if (pool < price) {
      return this.fail(
        context,
        `you are ${Math.ceil(price - pool)} short of what that hop costs — ` +
          `rest, or ride the network`,
        "insufficient-mana",
      );
    }

    const target = hit.stuff;
    const onComplete = (): void => {
      void this.resolveAnchoredCast(caster, target, context);
    };
    // No engagement capacity (a bare fixture) → resolve now, the
    // degenerate-fallback pattern `CastController` uses. AWAITED here,
    // unlike the scheduled arm: with nothing to schedule there is
    // nothing to fire-and-forget, and a caller that awaited `execute`
    // should see the arrival.
    if (!MixinApi.isEngaged(giver)) {
      return this.resolveAnchoredCast(caster, target, context);
    }
    const activity = new CastActivity({
      actor: giver,
      spellId: TELEPORT_SPELL,
      durationMs: (prep.castSeconds ?? 3) * 1000,
      onComplete,
      onAbort: (_reason: AbortReason): void => {
        MessageApi.scene(giver)
          .topic("act.deed")
          .toSelf(Mml.compose`The place slips out of focus, and you stay put.`)
          .send();
      },
    });
    const result = SchedulerApi.start(activity);
    if (result.ok && result.status === "completed-sync") return;
    if (result.ok) {
      context.note(result.note);
      MessageApi.scene(giver)
        .topic("act.deed")
        .toSelf(Mml.compose`You begin holding the place in mind…`)
        .toPeers(
          Mml.compose`${Mml.actor(giver)} goes still, shaping something.`,
        )
        .send();
      return;
    }
    this.fail(
      context,
      "your hands and voice are otherwise committed",
      "engagement-conflict",
    );
  }

  /** The completion body — resolve and render. */
  private async resolveAnchoredCast(
    caster: Stuff & Caster,
    target: Stuff,
    _context: CommandContext,
  ): Promise<void> {
    const out = await caster.resolveCast(TELEPORT_SPELL, target);
    MessageApi.scene(caster as unknown as Stuff)
      .topic("act.deed")
      .toSelf(
        Mml.fromMarkup(
          out.ok
            ? out.reports.join(" ") || "The world folds, and lets go."
            : (out.refusal ?? "The working slips away at the last moment."),
        ),
      )
      .send();
  }

  /**
   * **The three anchors, in order, first hit wins — and never `world:`.**
   *
   * ⭐⭐ The rule this enforces is not a performance one, though it is
   * that too. *You may only teleport somewhere you can honestly be said
   * to hold in mind*, and there are exactly three ways to hold a place:
   *
   * 1. **an extent you hold** — you authored it, so of course you know
   *    where it is. One `<extent>/**` path-glob seed per held extent,
   *    each fed through `MqlApi.resolveOne`. This is precisely what
   *    `CommandLogic`'s `tries` loop does with a view's static `scope:`
   *    list; the only difference is that the list is computed PER
   *    ACTOR, which a static YAML `scope:` cannot express — which is
   *    why it lives here and not in the view.
   * 2. **a registered node** — you have physically been there and
   *    surveyed it. A small enumerated set of template paths off the
   *    credential, matched by keyword against each live node. No MQL,
   *    no scan.
   * 3. **current scope** — `here`, then `peers`, then `reachable`: you
   *    are looking at it.
   *
   * ⚠ There is no fourth anchor and there must never be a `world:`
   * seed. Resolving is not permission, and a world scan would make
   * "somewhere you hold in mind" mean "anywhere that exists". A spy
   * test asserts on the scope ARGUMENT across every branch, so a new
   * anchor cannot slip one past.
   *
   * Static so the resolver is unit-testable without a dispatch.
   */
  static async resolveAnchored(
    giver: Stuff,
    raw: string,
  ): Promise<AnchoredHit> {
    const commandGiver = giver as Stuff & CommandGiver;

    // 1 — held extents.
    for (const extent of await AccessApi.heldExtents(giver)) {
      const scope = `${extent}/**`;
      const many = MqlApi.resolveMany(raw, { commandGiver, scope });
      if (many.stuff.length > 1) {
        return { stuff: null, ambiguous: true, anchor: "extent" };
      }
      if (many.stuff.length === 1) {
        return { stuff: many.stuff[0]!, ambiguous: false, anchor: "extent" };
      }
    }

    // 2 — registered nodes. An enumerated set, so this is a walk over a
    // handful of live singletons rather than any kind of query.
    const kw = raw.trim().toLowerCase();
    const hits: Stuff[] = [];
    for (const ref of TeleportController.registeredNodes(giver)) {
      const node = StuffApi.findByTemplatePath<Stuff>(ref);
      if (!node) continue;
      if (
        MixinApi.isPerceptible(node) &&
        node.getKeywords().some((k) => k.toLowerCase() === kw)
      ) {
        hits.push(node);
      }
    }
    if (hits.length > 1) {
      return { stuff: null, ambiguous: true, anchor: "registered" };
    }
    if (hits.length === 1) {
      return { stuff: hits[0]!, ambiguous: false, anchor: "registered" };
    }

    // 3 — what is in front of you.
    for (const scope of ["here", "peers", "reachable"]) {
      const many = MqlApi.resolveMany(raw, { commandGiver, scope });
      if (many.stuff.length > 1) {
        return { stuff: null, ambiguous: true, anchor: "scope" };
      }
      if (many.stuff.length === 1) {
        return { stuff: many.stuff[0]!, ambiguous: false, anchor: "scope" };
      }
    }

    return { stuff: null, ambiguous: false, anchor: null };
  }

  /**
   * The node paths on the actor's IDENTITY-bound travel credential —
   * the places they have physically been and registered. Read off the
   * aether-hosted wallet, never a carried card (a loaded card handed to
   * someone else confers nothing).
   */
  private static registeredNodes(giver: Stuff): readonly string[] {
    if (!MixinApi.isAether(giver)) return [];
    const holder =
      giver
        .getHostedUpdates()
        .find(
          (s): s is Stuff & AetherHosted & CredentialWallet =>
            MixinApi.isCredentialWallet(s) && !!s.getCredential("travel"),
        ) ?? null;
    const cred = holder?.getCredential("travel");
    return cred ? [...cred.getRegistered()] : [];
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
    const raw = model.destination?.raw;
    if (!node) {
      // ⭐ No terminal, but a place named: the ANCHORED SPELL (D10).
      // The network is a utility selling a capability its customers do
      // not have — so someone who HAS the capability should not need
      // the utility, and this is where they do not.
      if (raw) return this.anchoredCast(raw, context);
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
    const kw = raw;
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
      // ⭐ The network does not go there — but you might. Falling
      // through to the spell is the honest order: the terminal is a
      // convenience, not a permission, and a caster standing at a gate
      // is not worse off than one standing in a field.
      return this.anchoredCast(kw, context);
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
