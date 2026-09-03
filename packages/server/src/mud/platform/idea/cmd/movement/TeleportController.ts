/**
 * TeleportController — the `teleport` verb. **Kernel**, and the reason
 * it is kernel is the whole point of the verb.
 *
 * ```
 * both endpoints in one extent you HOLD → free, no network, no magic
 * at a travel node, a stop named        → the node's ride
 * at a travel node, nothing named       → the node's board, for EVERYONE
 * otherwise, a destination named        → the anchored spell
 * ```
 *
 * ⭐⭐ **You must not need the Teleport Authority to teleport.** Moving
 * yourself around inside an extent you hold is *authorial authority* —
 * the same authority that lets you edit the place — and casting a
 * working that relocates you is *magic*. Neither is a transit network's
 * business, and neither may stop working because a content pack is
 * absent. The TPA reform got this wrong on its first pass: the whole
 * verb moved into the `tpa` pack, so on a platform-only boot a
 * privileged person had no way to move at all, and `AuthorMixin` — a
 * KERNEL mixin — was left naming a pack's view.
 *
 * So the verb is the kernel's and the NETWORK is a pack's. Forks 1 and
 * 4 are implemented here, on kernel capabilities alone (`AccessApi`,
 * `MagicApi`, the cast pipeline). Forks 2 and 3 are handed to whatever
 * travel node is standing here, over the {@link TravelNode} SHAPE —
 * never an import. `AnalyzeWaterController` reads the water pack's
 * works the same way.
 *
 * ⭐ **The order is load-bearing.** Deciding the board on "was a stop
 * named", before any clearance read, is what makes a departures board a
 * public timetable rather than a boarding pass.
 *
 * ⚠ Object relocation is **not here** — `teleport --target` became
 * `goto --subject`. One verb meaning two unrelated things depending on
 * who typed it was the wrong shape, and moving an object is author
 * tooling.
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import { MqlApi } from '../../../../api/mql';
import type { MqlOneResult } from '../../../../api/mql';
import { MessageApi } from '../../../../api/message';
import { Mml } from '../../../../api/mml';
import { MixinApi } from '../../../../api/mixin';
import { AccessApi } from '../../../../api/access';
import { StuffApi } from '../../../../api/stuff';
import { SchedulerApi } from '../../../../api/scheduler';
import { CastActivity } from '../../../../lib/magic/CastActivity';
import type { AbortReason } from '@saxonberg/types';
import type { Caster } from '../../../../lib/magic/Caster';
import type { CommandGiver } from '../../../../lib/command/CommandGiver';
import type { AetherHosted } from '../../../../lib/augmentation/AetherHosted';
import type { CredentialWallet } from '../../../../lib/credential/CredentialWallet';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import { TravelNodes } from '../../../../lib/travel/TravelNode';

/** The working the anchored front door casts. One spell, two grammars. */
const TELEPORT_SPELL = 'teleport';

/** Which anchor answered — for the refusal prose, never for the gate. */
type Anchor = 'extent' | 'registered' | 'scope';

interface AnchoredHit {
  stuff: Stuff | null;
  ambiguous: boolean;
  anchor: Anchor | null;
}

interface TeleportModel extends CommandModel {
  destination?: MqlOneResult;
  /** Channel your OWN reserve into the node for this ride. */
  channel?: boolean;
  /** Put it on the node's meter — the explicit opposite of `--channel`. */
  meter?: boolean;
}

export default class TeleportController extends CommandController<TeleportModel> {
  async execute(model: TeleportModel, context: CommandContext): Promise<void> {
    const giver: Stuff = context.commandGiver;

    // 1 · Free movement inside an extent you hold AUTHORIAL AUTHORITY
    //     over (D11). Needs a named destination — a bare `teleport` is
    //     always a request to read a board.
    if (model.destination?.stuff) {
      const from = context.location?.getTemplatePath() ?? null;
      const to = model.destination.stuff.getTemplatePath() ?? from;
      if (await this.canMoveFreely(giver, from, to)) {
        return this.freeMove(model, context);
      }
    }

    // 2/3 · A travel node standing here, found BY SHAPE. `teleport` is
    //       not node-afforded, so this looks for what the actor can
    //       reach rather than reading `commandSource`.
    const node =
      MqlApi.resolveMany('reachable', {
        commandGiver: context.commandGiver,
        scope: 'reachable',
      })
        .stuff.map((s) => TravelNodes.of(s))
        .find((n) => n !== null) ?? null;
    const raw = model.destination?.raw;

    if (node && !raw) {
      // ⭐ The board is a PUBLIC TIMETABLE and renders before any
      // clearance read. Gating it behind a credential made the one verb
      // that could show you the network refuse the people who most
      // needed to see it.
      if (!MixinApi.isSensor(giver)) {
        return this.fail(context, "you can't read the board", 'cannot-read');
      }
      this.tell(context, await node.renderDepartures(giver));
      return;
    }

    if (node && raw) {
      const out = await node.ride(giver, {
        keyword: raw,
        channel: model.channel === true,
        meter: model.meter === true,
      });
      if (out.ok) return;
      // ⭐ A refusal the NETWORK does not go there falls THROUGH to the
      // spell: the terminal is a convenience, not a permission, and a
      // caster standing at a gate is not worse off than one in a field.
      if (out.reason !== 'route-not-found') {
        return this.fail(
          context,
          out.refusal ?? 'the ride will not run',
          out.reason ?? 'ride-refused',
        );
      }
    }

    // 4 · The anchored spell — or the honest "there is nothing here".
    if (!raw) {
      return this.fail(context, 'there is nowhere to travel from here', 'no-node');
    }
    return this.anchoredCast(raw, context);
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
