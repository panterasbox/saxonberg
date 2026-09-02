/**
 * LookController — examine surroundings, an object, or a sub-feature
 * (Detail).
 *
 * Fires a Scene at `sense.survey` with a single self frame
 * carrying the location/target/detail description body. No peer
 * broadcast — looking is a private observation.
 *
 * Three rendering branches, dispatched on the bound `target`:
 *
 *   - **Detail** — `target.via.detailPath` is set. The host Stuff
 *     (`target.stuff`) carries `DetailedMixin`; the controller looks
 *     up the description via `host.getDetail(path.join('.'))` and
 *     renders the detail tip name + description. This is the
 *     `look bookcase` / `look at the inscription` flow that lands
 *     after MQL's chain narrows into the host's detail tree.
 *
 *   - **Location** — `target.stuff` is the giver's current location
 *     and no detail via is set. Renders the room name +
 *     description + obvious exits. Fired by bare `look` on arrival
 *     and `look here`.
 *
 *   - **Direct Stuff** — anything else. Renders the bound Stuff's
 *     own name + long description.
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type {
  CommandContext,
  CommandModel,
  } from '../../../../api/command';
import type { MqlOneResult } from '../../../../api/mql';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import { MixinApi } from '../../../../api/mixin';
import { StuffApi } from '../../../../api/stuff';
import { ChattelApi } from '../../../../api/chattel';
import { ContainmentApi } from '../../../../api/containment';
import { MessageApi } from '../../../../api/message';
import { CardApi } from '../../../../api/card';
import { BulkableApi } from '../../../../api/bulk';
import { PerceptionApi } from '../../../../api/perception';
import { SocialApi } from '../../../../api/social';
import { Mml } from '../../../../api/mml';
import type Exit from '../../../../lib/boundary/Exit';

interface LookModel extends CommandModel {
  target?: MqlOneResult;
}

export default class LookController extends CommandController<LookModel> {
  execute(model: LookModel, context: CommandContext): void | Promise<void> {
    const target = model.target;
    // `look.yaml` declares `default: "$focus"` and the scope fallback
    // chain `["$focus", "reachable"]`, so the dispatcher always
    // hands us a wrapper. Empty (`null`) is the only honest "no
    // match" signal; we don't fabricate another fallback here.
    //
    // The null-target path subsumes both "you tried to look at
    // something that doesn't exist" (`look vase` when there's no
    // vase) and "you tried to look at a referent that didn't
    // resolve" (`look here` when you're placeless). MQL returns null
    // in both cases; consistency is intentional.
    if (!target || target.stuff === null) {
      const raw = target?.raw ?? '';
      MessageApi.scene(context.commandGiver)
        .topic('sense.survey')
        .toSelf(Mml.compose`You don't see any '${raw}' here.`)
        .send();
      context.note({ kind: 'empty-result', field: 'target', query: raw });
      return;
    }
    // Detail-via dispatch: when MQL's chain narrowed into the host's
    // detail tree, render the detail rather than the host itself.
    // Holds for `look bookcase` (host=location, via=['bookcase'])
    // AND `look engraving` against an item in inventory
    // (host=apple, via=['engraving']) — anywhere `via.detailPath`
    // is set.
    const detailPath = target.via?.detailPath;
    if (detailPath && detailPath.length > 0) {
      return this.lookAtDetail(target.stuff, detailPath, context);
    }
    // Render the room (with exits) when the resolved target IS the
    // current location — bare `look` on arrival, `look here`, or
    // any `$focus` that re-resolved to the location.
    if (target.stuff === context.location) {
      return this.lookAtLocation(context);
    }
    return this.lookAtTarget(target.stuff, context);
  }

  /**
   * Render a Detail as `<tip name>\n\n<description>`. The host's
   * `getDetail` resolver accepts dot-notation paths (`'bookcase.book'`),
   * so the controller just joins `via.detailPath` and asks. Aliases
   * are transparent at this layer — the detail tip name is whatever
   * id MQL matched on.
   *
   * Defensive on missing details: the chain rule that produced
   * `via.detailPath` already verified the detail exists, but a
   * race-y removal between resolve and execute (or a host that
   * isn't actually Detailed) falls through to a polite error.
   */
  private lookAtDetail(
    host: Stuff,
    detailPath: string[],
    context: CommandContext,
  ): void {
    if (!MixinApi.isDetailed(host)) {
      MessageApi.scene(context.commandGiver)
        .topic('sense.survey')
        .toSelf(Mml.compose`You can't make out any detail there.`)
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'no-detail-here',
        detail: 'host is not Detailed',
      });
      return;
    }
    const dotted = detailPath.join('.');
    const description = host.getDetailFor(context.commandGiver, dotted);
    if (description === null) {
      MessageApi.scene(context.commandGiver)
        .topic('sense.survey')
        .toSelf(Mml.compose`You can't make out any '${dotted}' there.`)
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'detail-not-found',
        detail: dotted,
      });
      return;
    }
    const tip = detailPath[detailPath.length - 1]!;
    const body = Mml.compose`\n${tip}\n\n${Mml.fromMarkup(description)}\n`;

    MessageApi.scene(context.commandGiver)
      .topic('sense.survey')
      .toSelf(body)
      .send();

    return;
  }

  private async lookAtLocation(context: CommandContext): Promise<void> {
    const actor = context.commandGiver;
    const location = context.location;
    if (!location) return; // defensive: placeless avatars are blocked at inbound and Login carries no sense verbs, so location is present in practice; degrade to a quiet no-op otherwise
    // Render whatever the location actually has: name (if Named via
    // `Mml.location`), description body (if Visible), exits (if
    // Exitable), and a listing of visible occupants. A bare
    // `Location` with no contents (no Named / no Visible / no
    // Exitable — the void on a fresh login) degrades to the
    // "indistinct surroundings" fallback rather than the awkward
    // "You see nothing special." generic.
    const hasVisible = MixinApi.isVisible(location);
    const hasExits = MixinApi.isExitable(location);
    const hasName = MixinApi.isNamed(location);

    // Visible-mixin filter mirrors `lookAtTarget`'s structural-only
    // policy: items that don't compose Visible can't be referenced
    // anyway, so listing them would be a category error. Adornments
    // (wall sconces, BoundaryAnchors, etc.) are part of the room's
    // structure, not loose contents, and route through their host's
    // description rather than the occupant list. The actor never
    // lists themselves.
    const visibleContents = location
      .getContents()
      .filter((item) => {
        if (item.stuffId === actor.stuffId) return false;
        if (MixinApi.isAdornment(item)) return false;
        if (!MixinApi.isVisible(item)) return false;
        // Honest fog: a concealed thing the actor hasn't discovered /
        // can't yet perceive is absent from the actor's world.
        if (!PerceptionApi.perceives(actor, item)) return false;
        return true;
      });

    if (
      !hasVisible &&
      !hasExits &&
      !hasName &&
      visibleContents.length === 0
    ) {
      MessageApi.scene(actor)
        .topic('sense.survey')
        .toSelf(Mml.compose`Your surroundings are indistinct.`)
        .send();
      return;
    }

    // Vertical-space discipline: NO blank lines anywhere — the
    // player knows the convention (short first, then prose, then
    // system lines for exits/contents). Visual distinction comes
    // from inline styling (the `<location>` tag colour-codes the
    // header; `<exit>` and `<item>` tags style the affordances),
    // not from whitespace. Long descriptions with internal `\n\n`
    // paragraph breaks keep their own pacing; the surrounding
    // chrome stays flush.
    //
    // The long description may end with a trailing newline (YAML
    // `|` block scalar default). Trim it so the exits/contents
    // lines that follow sit flush against the prose, not after a
    // gratuitous blank line.
    //
    // `getMarkupLong(viewer)` is the host-level affordance-annotated
    // long description: every contributing mixin's `markupAugmenters`
    // fold through the raw text before it emits. Today that's
    // `DetailedMixin`'s `<detail key="...">word</detail>` wrap;
    // future contributors (exit-direction auto-link, language masks)
    // ride the same pipeline. Re-narrow `location` with
    // `MixinApi.isVisible` here so the call site has the static
    // `Visible` type — `hasVisible` above is just a flag.
    const longText = MixinApi.isVisible(location)
      ? location.getMarkupLong(actor).replace(/\s+$/, '')
      : '';
    let body = Mml.compose`${Mml.location(location)}`;
    if (hasVisible) {
      body = Mml.compose`${body}\n${Mml.fromMarkup(longText)}`;
    }
    // Surface-bulk: a puddle pooling on the floor surfaces in the room
    // view (the floor is an Adornment, excluded from the contents list).
    const puddle = BulkableApi.floorPuddleSummary(location);
    if (puddle) {
      body = Mml.compose`${body}\n${puddle}`;
    }
    if (hasExits) {
      const exitsLine = this.formatExits(location.obviousExitsFor(actor));
      if (exitsLine) {
        body = Mml.compose`${body}\n${exitsLine}`;
      }
    }
    if (visibleContents.length > 0) {
      // Repeat-perception: seeing a being tracks it. First sight of an
      // unknown creates a null-`knownAs` stranger record; later sightings
      // coalesce and advance `lastSeen` (not a record per sighting). The
      // null-name write never overwrites a learned name. Fired here on
      // the look *controller*, never inside the naming step (which runs
      // on every projection) — see `describeFor`.
      for (const item of visibleContents) {
        if (MixinApi.isOrganism(item) && MixinApi.isBeliefStore(actor)) {
          actor.learnIdentityOf(item, null);
        }
      }
      // Items resting on a listed surface (the bottles on the back-bar) are
      // not loose room contents — they're represented by their surface and
      // discovered by examining it (`look back-bar`). Shared with `sense` and
      // the inspection card via `ContainmentApi.looseContents`.
      const topLevel = ContainmentApi.looseContents(visibleContents);
      if (topLevel.length > 0) {
        // Organism occupants route through the display-lensing formatter
        // (friends boosted, strangers density-collapsed per the viewer's
        // `social.verbosity`); inert items stay on the plain item list.
        // The formatter is async (rule resolution rides GroupApi.isMember)
        // and returns a Mml already resolved for `actor` — the single known
        // viewer of this `toSelf` render.
        const occupants = topLevel.filter((item) => MixinApi.isOrganism(item));
        const items = topLevel.filter((item) => !MixinApi.isOrganism(item));
        const segments: Mml[] = [];
        if (occupants.length > 0) {
          segments.push(
            await SocialApi.composeOccupants(actor, occupants, occupants.length),
          );
        }
        if (items.length > 0) {
          segments.push(Mml.list(items.map((item) => Mml.thing(item))));
        }
        const seen = Mml.list(segments);
        body = Mml.compose`${body}\n── You also see: ${seen}.`;
      }
    }

    // Passive hints (honest fog): a concealed-and-undiscovered thing the
    // actor *nearly* perceives surfaces its authored "tell" — a draft, a
    // seam, a stone sitting proud — so attention is *directed*, not
    // pixel-hunted. A hint names the tell, NEVER the hidden thing's identity
    // (that would leak concealed data). The candidate set is the full room
    // contents + every exit (including hidden ones), which `hintsFor`
    // narrows to the close-but-unperceived.
    const hintCandidates: Stuff[] = [...location.getContents()];
    if (MixinApi.isExitable(location)) {
      for (const exit of location.getExits().values()) {
        hintCandidates.push(exit as unknown as Stuff);
      }
    }
    for (const cand of PerceptionApi.hintsFor(actor, hintCandidates)) {
      const tell = MixinApi.isConcealable(cand)
        ? cand.getConcealmentHint()
        : undefined;
      body = Mml.compose`${body}\n${
        tell
          ? Mml.fromMarkup(tell)
          : Mml.compose`Something here doesn't sit quite right.`
      }`;
    }

    /*
     * ⚠⚠ **Open the card FIRST, then say whether the frame is carded.**
     * Stamping `carded` before the open is a promise, not a fact: an
     * open that touches, fails or is filtered leaves the suppressed
     * prose with nothing to replace it, and `look dave` in Dave's Bar
     * printed its echo and nothing else. The id also lets
     * the client re-show the prose when a named view filters this kind
     * out of the feed.
     */
    const opened = CardApi.open(context, 'subject', {
      prose: body,
      subjectId: location.stuffId,
    });

    const scene = MessageApi.scene(actor).topic('sense.survey');
    // ⭐ Says *this content is also on a card*, so `shell.result` can
    // filter it. A topic key could not: `sense.survey` is shared by
    // twelve verbs that open no card at all.
    if (opened) scene.meta({ carded: opened });
    scene.toSelf(body).send();

    return;
  }

  private async lookAtTarget(
    target: Stuff,
    context: CommandContext,
  ): Promise<void> {
    const actor = context.commandGiver;
    // Non-Visible targets fall through to a polite refusal rather
    // than rendering "You see nothing special." against the target's
    // name. The `look.yaml` validator stack used to enforce this via
    // `requires: VisibleMixin`, but excluding non-Visible targets at the
    // validator level also rejected `look` against a non-Visible
    // location (the void case), so the check moved here where it
    // can differentiate "looking at a thing" from "looking at the
    // room".
    if (!MixinApi.isVisible(target)) {
      const name = target.getPresentation();
      MessageApi.scene(actor)
        .topic('sense.survey')
        .toSelf(Mml.compose`You can't see ${name}.`)
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'target-not-visible',
        detail: name,
      });
      return;
    }
    // Repeat-perception: a deliberate look at a being tracks it (same
    // coalescing stranger-record write as the room listing above).
    if (MixinApi.isOrganism(target) && MixinApi.isBeliefStore(actor)) {
      actor.learnIdentityOf(target, null);
    }
    // Run the long through `getMarkupLong(viewer)` so detail keywords
    // and any other contributing-mixin augmenters wrap inline —
    // matches the location branch above; both `look <thing>` and
    // bare `look` ship the same affordance-annotated text. (A
    // consumable's nutrition label rides this augmenter seam via
    // `NutritionLabelMixin`, not a special-case here.)
    let body = Mml.compose`\n${Mml.actor(target)}\n\n${Mml.fromMarkup(target.getMarkupLong(actor))}\n`;

    // Drill-in: examining a surface reveals what rests on it (the back-bar's
    // bottles + tools) — the discovery path that keeps them out of the room
    // view.
    if (MixinApi.isSurfaced(target)) {
      const resting = target.getResting();
      if (resting.length > 0) {
        // A person sitting on a stool rests on a surface too.
        const list = Mml.list(resting.map((r) => Mml.actor(r)));
        body = Mml.compose`${body}── On it: ${list}.`;
      }
    }
    // A stamped good says whose it is — the bottle bought for the bar
    // reads "Dave's Bar's", the one bought for yourself reads yours. A
    // title-derived owner (a group's, nobody's in particular) says nothing.
    if (MixinApi.isChattel(target) && target.getChattelId()) {
      const owner = await target.chattelOwner();
      const holder =
        owner?.kind === 'organization' || owner?.kind === 'player'
          ? StuffApi.findByTemplatePath(owner.templatePath)
          : null;
      if (holder) {
        body = Mml.compose`${body}── Owned by ${holder.getPresentation()}.`;
      }
    }
    // A display reads what it shows — the booth's television, the house
    // tablet with the stock sheet up, the terminal's departures. ⭐ The
    // screen renders itself: `readScreen(viewer)` is the PROSE arm, and
    // it is per-viewer, so a board that annotates against the reader's
    // own credential resolves here rather than being pushed at the room.
    if (MixinApi.isDisplay(target)) {
      const screen = await target.readScreen(actor);
      if (screen) body = Mml.compose`${body}── ${screen}`;
    }
    // The same drill-in for an OPEN container: the glass rack's coupes,
    // a crate's limes. A sealed one (a closed chest, a capped bottle)
    // shows nothing — what is inside is not in view. Concealed contents
    // stay with the glance below, which decides what a look turns up.
    if (
      MixinApi.isContainer(target) &&
      !(MixinApi.isSealable(target) && !target.isOpen())
    ) {
      const inside = [...target.getContents()].filter(
        (c) => !MixinApi.isConcealable(c) || !c.isConcealed(),
      );
      if (inside.length > 0) {
        const list = Mml.list(inside.map((c) => Mml.actor(c)));
        body = Mml.compose`${body}── In it: ${list}.`;
      }
    }

    // Close look: attending to a container peers in for anything
    // half-concealed — the directed-attention glance that `examine`
    // used to be, folded onto `look <thing>` (the `glance` depth =
    // the cheap `concealment.examineBonus`). Silent unless the glance
    // actually turns something up; a deliberate over-a-place scan
    // that ties up your hands and takes time is `search`.
    if (MixinApi.isContainer(target)) {
      const contents = [...target.getContents()];
      if (contents.length > 0) {
        // Warm the `awareness` band so the glance reads a live snapshot.
        await PerceptionApi.preloadForSenseGate(actor);
        const found = PerceptionApi.resolveSearch(actor, contents, 'glance');
        if (found.length > 0) {
          // What a search turns up is very often a HIDING PERSON.
          const noticed = Mml.list(found.map((f) => Mml.actor(f)));
          body = Mml.compose`${body}\nLooking closely, you notice ${noticed}.`;
        }
        for (const cand of PerceptionApi.hintsFor(actor, contents)) {
          const tell = MixinApi.isConcealable(cand)
            ? cand.getConcealmentHint()
            : undefined;
          body = Mml.compose`${body}\n${
            tell
              ? Mml.fromMarkup(tell)
              : Mml.compose`Something here almost catches your eye.`
          }`;
        }
      }
    }

    // Card first — see the room path: `carded` must be a fact.
    const openedSubject = CardApi.open(context, 'subject', {
      subjectId: target.stuffId,
      prose: body,
    });

    const subjectScene = MessageApi.scene(actor).topic('sense.survey');
    if (openedSubject) subjectScene.meta({ carded: openedSubject });
    subjectScene.toSelf(body).send();

    return;
  }

  private formatExits(exits: Exit[]): Mml | null {
    if (exits.length === 0) return null;
    const parts = exits.map((exit) => {
      // `Mml.exit` emits a clickable `<exit dir="X" stuff-id="Y">` —
      // the client turns it into the affordance that sends `go <dir>`.
      // The door's name rides its own `<item>` tag so it's clickable
      // too (renderer resolves stuff-id → primaryKeyword and emits
      // `look <doorKeyword>`) — same affordance the inspection card
      // gives, kept consistent across surfaces.
      const tagged = Mml.exit(exit);
      const door = exit.getDoor();
      if (!door) return tagged;
      const state = door.isOpen() ? 'open' : 'closed';
      const doorLink = Mml.thing(door);
      return Mml.compose`${tagged} (${doorLink}, ${state})`;
    });
    const joined = Mml.list(parts);
    // `── ` is a typographic ornament (em-dash glyph) the controller
    // emits as literal prose to separate the labeled section from
    // the description above. No tag, no element selector — the
    // glyph carries its own visual weight by being on the page,
    // like a chapter-ornament in a book.
    // "Obvious" stays in the label: a Location may have hidden exits
    // that only surface under specific conditions (a hint in the
    // prose, a perception check, a revealed door); the qualifier
    // signals "what you can see right now" without claiming "this is
    // all there is."
    return Mml.compose`── Obvious exits: ${joined}.`;
  }
}
