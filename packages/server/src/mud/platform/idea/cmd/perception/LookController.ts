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
import { EmploymentApi } from '../../../../api/employment';
import { PerceptionApi } from '../../../../api/perception';
import { SocialApi } from '../../../../api/social';
import { Mml } from '../../../../api/mml';
import type Exit from '../../../../lib/boundary/Exit';
import {
  LIGHT_BAND_PHRASE,
  LIGHT_BANDS_TOO_DARK_TO_DESCRIBE,
  type LightBand,
} from '../../../../lib/perception/Light';
import type { VisionModality } from '../../modalities/VisionModality';
import type { Sensor } from '../../../../lib/message/Sensor';
import type { Perception } from '../../../../lib/perception/Perception';
import type { Container } from '../../../../lib/spatial/Container';

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

    // ⭐⭐ How much light there is, to THIS actor (envelope D10). The
    // per-viewer read, so a night-sighted species and a human standing
    // in the same room get different answers — the one thing a species
    // vision profile has never been able to affect, because until this
    // build nowhere was dark.
    const band = this.perceivedBandAt(actor, location);

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

    // ⭐⭐ Too dark to describe. A description is what you can SEE, so
    // below `dim` the room's authored prose is withheld and the band's
    // own sentence is all you get — plus the exits, because you can feel
    // along a wall for a door in the pitch dark. That is what makes
    // acceptance 1 true with nothing authored anywhere: the same street
    // at noon and at midnight renders two different things.
    //
    // ⚠ **And no card opens.** A card is a view of what you perceive;
    // you perceive nothing of the place. Opening one would put the
    // room's name and description on the client's right-hand column
    // while the transcript said it was pitch dark — the carded-prose
    // split working exactly backwards. Decided at build time (D10 said
    // "withhold the long description" and did not say where the card
    // stood); lens 3 chose it — an honest sim does not show you a room
    // you cannot see.
    if (band && LIGHT_BANDS_TOO_DARK_TO_DESCRIBE.includes(band)) {
      let dark = Mml.compose`${Mml.fromMarkup(LIGHT_BAND_PHRASE[band] ?? '')}`;
      if (hasExits) {
        const exitsLine = this.formatExits(location.obviousExitsFor(actor));
        if (exitsLine) dark = Mml.compose`${dark}\n${exitsLine}`;
      }
      MessageApi.scene(actor).topic('sense.survey').toSelf(dark).send();
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
    // ⭐⭐ The help-wanted sign (trades-and-labor D11). Derived: there is
    // no sign OBJECT and no mixin, so a venue with an open seat CANNOT
    // fail to advertise — the notice comes off the same arithmetic that
    // decides the seat is open at all (`headcount − holders`). One memo
    // read per look; a room with no business costs a miss.
    //
    // ⚠⚠ **It is sent SEPARATELY, and that is not style.** Everything
    // appended to `body` is handed to `CardApi.open` as `prose` and then
    // sent marked `carded`, which the client suppresses from the
    // transcript in favour of the card — and the card is an MQL *field*
    // projection of the room that never renders the handed prose. So a
    // room-level line folded into `body` reaches the wire and is invisible
    // to a player in a browser. Driving found it: `apply` refused with
    // both numbers while `look` showed no notice at all, and searching the
    // rendered DOM for "HELP WANTED" came back empty.
    //
    // ⚠ The floor-puddle line above has the same problem and has since
    // the bulk build. It is NOT fixed here — the general answer is a card
    // that renders the prose it was handed, which is the card surface's
    // question, recorded on `docs/slates/tails/carded-prose-slate.md`.
    const notices = EmploymentApi.noticesAt(location);
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
          // ⭐ Both paths render the same FORM now. The rich composer
          // (players) and the plain list (everyone else) used to differ
          // in what they showed — status or no status — because only the
          // eager path could afford it. Which form a surface gets is the
          // surface's choice, not a consequence of who is looking.
          segments.push(
            MixinApi.isNotifyPolicy(actor)
              ? await actor.composeOccupants(occupants, occupants.length)
              : Mml.list(occupants.map((o) => Mml.actor(o, { form: 'presence' }))),
          );
        }
        if (items.length > 0) {
          // ⚠⚠ **Resolved NOW, viewer-blind — and that is not laziness,
          // it is the surface refusing to be gated twice.**
          //
          // `visibleContents` above already ran `PerceptionApi.perceives`
          // for this actor, so everything in `items` has been judged
          // perceivable. Letting the lazy list re-resolve each one
          // through `describeFor` asks a SECOND gate — vision's
          // `canSee` — which disagrees: in an unlit interior the
          // Terminus registry's deed desk came back `something` while
          // the room's own prose read in full. Every object reading
          // "something" is the documented tell for exactly this.
          //
          // This is a `toSelf` render for one known viewer whose
          // perception was already resolved, so there is nothing for
          // late binding to add — an inert thing has no recognition.
          // ⭐ The two gates disagreeing is a real finding and is
          // recorded; it is not this build's to settle.
          segments.push(
            Mml.fromMarkup(
              Mml.list(items.map((item) => Mml.thing(item))).toString(),
            ),
          );
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

    // ⭐ The light line rides its OWN uncarded scene, AHEAD of the room,
    // for the same reason the notices below ride one: everything folded
    // into `body` is handed to the card and then suppressed from the
    // transcript, and the card is a field projection that never renders
    // the handed prose. A room's light is not one of its fields, so
    // folding it in would reach the wire and be invisible in a browser —
    // the defect the trades-and-labor drive found for the help-wanted
    // sign, not repeated here.
    const bandPhrase = band ? LIGHT_BAND_PHRASE[band] : null;
    if (bandPhrase) {
      MessageApi.scene(actor)
        .topic('sense.survey')
        .toSelf(Mml.compose`${Mml.fromMarkup(bandPhrase)}`)
        .send();
    }

    const scene = MessageApi.scene(actor).topic('sense.survey');
    // ⭐ Says *this content is also on a card*, so `shell.result` can
    // filter it. A topic key could not: `sense.survey` is shared by
    // twelve verbs that open no card at all.
    if (opened) scene.meta({ carded: opened });
    scene.toSelf(body).send();

    // ⭐ The notices ride their own scene, UNCARDED, so the transcript
    // keeps them. A card on a wall is a thing you NOTICE, not part of the
    // room's own description — which is why this reads correctly rather
    // than as a workaround.
    for (const opening of notices) {
      MessageApi.scene(actor)
        .topic('sense.survey')
        .toSelf(Mml.compose`A notice here: ${opening.describe()}`)
        .send();
    }

    return;
  }

  /**
   * The light band at `location` as `actor` perceives it, or `null`
   * when this actor cannot run vision queries at all (a fixture, a
   * test double) or the vision singleton is not loaded. `null` degrades
   * to today's behaviour — describe the room — which is the right
   * failure: a perception gap must never take `look` down.
   */
  private perceivedBandAt(actor: Stuff, location: Stuff): LightBand | null {
    if (!MixinApi.isSensor(actor) || !MixinApi.isPerception(actor)) {
      return null;
    }
    if (!MixinApi.isContainer(location)) return null;
    try {
      const vision = PerceptionApi.modalityByName('vision') as VisionModality;
      return vision.perceivedBand(
        actor as Stuff & Sensor & Perception,
        location as unknown as Stuff & Container,
      );
    } catch {
      return null;
    }
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
        // Resolved now, for the same reason as the room's item list
        // above — and here the second gate is even further off: vision
        // walks up ONE level from the target, so the contents of an
        // NPC's own inventory land on the NPC, which carries no light,
        // and every one of them read `something`.
        const list = Mml.fromMarkup(
          Mml.list(inside.map((c) => Mml.actor(c))).toString(),
        );
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
