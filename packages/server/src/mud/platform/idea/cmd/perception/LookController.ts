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
import InventoryController from '../inventory/InventoryController';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import { MixinApi } from '../../../../api/mixin';
import { Postures } from '../../../../lib/slot/Postured';
import { StuffApi } from '../../../../api/stuff';
import { ChattelApi } from '../../../../api/chattel';
import { MessageApi } from '../../../../api/message';
import { CardApi } from '../../../../api/card';
import { BulkableApi } from '../../../../api/bulk';
import { EmploymentApi } from '../../../../api/employment';
import { PerceptionApi } from '../../../../api/perception';
import { FireApi } from '../../../../api/fire';
import { SocialApi } from '../../../../api/social';
import { Mml } from '../../../../api/mml';
import type { LookSegment, SegmentItem, SegmentSource } from '@saxonberg/types';
import type Exit from '../../../../lib/boundary/Exit';
import {
  LIGHT_BAND_PHRASE,
  LIGHT_BANDS_TOO_DARK_TO_DESCRIBE,
  type LightBand,
} from '../../../../lib/perception/Light';
import type { VisionModality } from '../../modalities/VisionModality';
import { AppApi } from '../../../../api/app';
import { AppSettingKeys } from '../../../../lib/config/AppSettings';
import type { Sensor } from '../../../../lib/message/Sensor';
import type { Container } from '../../../../lib/spatial/Container';
import { Placement } from '../../../../lib/spatial/Placement';

interface LookModel extends CommandModel {
  /** ONE thing (maritime revision 2′) — a set is `query`'s. */
  target?: MqlOneResult;
}

/** `look` names this many things inline before it summarises (the `Mml.list` block threshold). */
const LOOK_INLINE = 4;

export default class LookController extends CommandController<LookModel> {
  /** A segment source for one of `look`'s own sections. */
  private static lookSource(name: string): SegmentSource {
    return { kind: 'look', name };
  }

  execute(model: LookModel, context: CommandContext): void | Promise<void> {
    const target = model.target;
    const raw = target?.raw ?? '';
    const one = target?.stuff ?? null;
    // `look in <thing>` is the LEDGER — the same as `inventory <thing>`.
    if (one && (target?.prep === 'in' || target?.prep === 'inside')) {
      return this.lookInto(one, context);
    }
    // `look.yaml` declares `default: "$focus"`, so the dispatcher always
    // hands us a wrapper; nothing in it is the only "no match" signal.
    if (!one) {
      MessageApi.scene(context.commandGiver)
        .topic('sense.survey')
        .toSelf(Mml.compose`You don't see any '${raw}' here.`)
        .send();
      context.note({ kind: 'empty-result', field: 'target', query: raw });
      return;
    }
    // Detail-via dispatch: when MQL's chain narrowed into the host's
    // detail tree, render the detail rather than the host itself.
    const detailPath = target?.via?.detailPath;
    if (detailPath && detailPath.length > 0) {
      return this.lookAtDetail(one, detailPath, context);
    }
    // Render the room (with exits) when the resolved target IS the
    // current location — bare `look` on arrival, `look here`.
    if (one === context.location) {
      return this.lookAtLocation(context);
    }
    return this.lookAtTarget(one, context);
  }

  /** `look in <thing>`: the ledger, as `inventory <thing>` shows it. */
  private lookInto(thing: Stuff, context: CommandContext): void {
    const viewer = context.commandGiver;
    const body = MixinApi.isContainer(thing) ? InventoryController.ledger(viewer, thing) : null;
    const line = body ?? (MixinApi.isContainer(thing)
      ? Mml.compose`${Mml.actor(thing)} is shut.`
      : Mml.compose`There is nothing inside ${Mml.thing(thing)}.`);
    MessageApi.scene(viewer).topic('sense.survey').toSelf(line).send();
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

    // ⭐⭐ THE PERCEPTION MOMENT (controller-liquidity W8). One call: the
    // senses warm (the boot link — without it a fresh world described
    // every room at midnight), the light is read for THIS viewer
    // (envelope D10), the listing is resolved, and the body is told what
    // it learned — the exits it hands back are the ones rendered below,
    // so the transcript and the map cannot disagree. The verb's business
    // is WHEN a place is perceived; what that entails is
    // `PerceptionApi.observe`'s.
    const seen = await PerceptionApi.observe(actor, location);
    const band = seen.band;
    const visibleContents = seen.seen;

    if (seen.indistinct) {
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
    if (band && seen.dark) {
      let dark = Mml.compose`${Mml.fromMarkup(LIGHT_BAND_PHRASE[band] ?? '')}`;
      // ⭐ …and a fire is seen in the dark you cannot see BY: the light of a
      // burning clamp next door reaches this place too faintly to light it,
      // and is still a glow on the night (the ceramics drive A, run 31 —
      // the requirement's "at night the clamp glows from the next place").
      const glow = this.glowInTheDark(location);
      if (glow) dark = Mml.compose`${dark}\n${glow}`;
      // You cannot describe the room, but you have been here and you can
      // feel the ways out — `observe` told the map so already.
      const exitsLine = this.formatExits(seen.exits);
      if (exitsLine) dark = Mml.compose`${dark}\n${exitsLine}`;
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
    // ⭐ The card's SEGMENTS are built in step with `body` (client-surface
    // D1/D2): every line appended to the terminal's body pushes the same
    // line, by shape and source. The name is the card's header, not a
    // segment.
    const segments: LookSegment[] = [];
    const long = MixinApi.isVisible(location)
      ? location.getSegmentedLong(actor)
      : { text: '', segments: [] };
    const longText = long.text.replace(/\s+$/, '');
    let body = Mml.compose`${Mml.location(location)}`;
    if (hasVisible) {
      body = Mml.compose`${body}\n${Mml.fromMarkup(longText)}`;
      segments.push(...long.segments);
    }
    // ⚠ The per-class self-reports — this puddle, the notices, and on a
    // thing its placings, owner and screen — stay here: the plan's listed
    // exception (controller-liquidity W8). The `markupAugmenters` seam is
    // synchronous, yields only `state` segments folded into the long
    // before these sections, and also feeds the card projection and every
    // sense verb, so moving them would change words and order. They READ;
    // the world writes are all `observe`'s. → one-resolution-rule-slate § 2.
    // Surface-bulk: a puddle pooling on the floor surfaces in the room
    // view (the floor is an Adornment, excluded from the contents list).
    const puddle = BulkableApi.floorPuddleSummary(location);
    if (puddle) {
      body = Mml.compose`${body}\n${puddle}`;
      segments.push({ shape: 'state', sources: [LookController.lookSource('Floor')], text: puddle });
    }
    // ⭐ A broadcast reaches this place (broadcast-ready D9): a statement
    // of the room's state, never a gate — read off whoever is here and on
    // air. Nobody in a streamer's room is shown without being told.
    if (this.anyoneOnAir(location)) {
      const line = 'A broadcast reaches this place.';
      body = Mml.compose`${body}\n${line}`;
      segments.push({ shape: 'state', sources: [LookController.lookSource('Broadcast')], text: line });
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
    const notices = await EmploymentApi.noticesAt(location);
    // ⭐ Hold the light steady while the room is DESCRIBED (the potash
    // drive's stall, controller-liquidity /finalize): every thing listed
    // and every name rendered asks `canSee`, and without a hold each one
    // walked the whole light graph again — quadratic in what the room holds,
    // so a lean-to piled with ash heaps took more than 30 s of CPU per `look`
    // and every command behind it queued. The MQL resolve and the card
    // refresh already hold; this is the same hold, over a synchronous read.
    let release = LookController.holdLight();
    try {
      // The exits `observe` learned — the same list the map was told.
      const perceived = seen.exits;
      const exitsLine = this.formatExits(perceived);
      if (exitsLine) {
        body = Mml.compose`${body}\n${exitsLine}`;
        segments.push({
          shape: 'list',
          heading: 'Obvious exits',
          sources: [LookController.lookSource('Obvious exits')],
          text: this.render(exitsLine, actor),
          items: perceived.map((exit) => ({
            stuffId: exit.stuffId,
            label: exit.getDirection(),
            keyword: exit.getDirection(),
            count: 1,
          })),
        });
      }
      if (visibleContents.length > 0) {
        // Items placed on a listed host (the bottles on the back-bar) are
        // not loose room contents — they're represented by their host and
        // discovered by examining it (`look back-bar`). Shared with `sense`
        // and the inspection card via `Container.getLooseContents`.
        const topLevel = location.getLooseContents(visibleContents);
        if (topLevel.length > 0) {
          // Organism occupants route through the display-lensing formatter
          // (friends boosted, strangers density-collapsed per the viewer's
          // `social.verbosity`); inert items stay on the plain item list.
          // The formatter is async (rule resolution rides GroupApi.isMember)
          // and returns a Mml already resolved for `actor` — the single known
          // viewer of this `toSelf` render.
          const occupants = topLevel.filter((item) => MixinApi.isOrganism(item));
          // ⭐ A seat somebody is sitting on is named in THEIR line
          // ("Mara, seated on a bar stool"); only the empty ones are things
          // here, so "+5 more" counts the stools you could take.
          const seats = new Set(
            occupants.flatMap((o) => {
              const rest = MixinApi.isPosed(o) ? o.currentRest() : null;
              return rest ? [rest.host.stuffId] : [];
            }),
          );
          const items = topLevel.filter((item) => !MixinApi.isOrganism(item) && !seats.has(item.stuffId));
          /*
           * ⭐ PEOPLE and THINGS are two lines (owner, 2026-11-01): the bar's
           * one "You also see" ran five people into thirteen fixtures. Who is
           * here is its own question — the place-surfaces slate's
           * presentation tiers (*who is here* · *what is here*) — and the
           * terminal and the card get the same two lines.
           */
          if (occupants.length > 0) {
            // ⭐ Both paths render the same FORM now. The rich composer
            // (players) and the plain list (everyone else) used to differ
            // in what they showed — status or no status — because only the
            // eager path could afford it. Which form a surface gets is the
            // surface's choice, not a consequence of who is looking.
            // ⚠ The hold never spans an await (a light may change meanwhile):
            // released for the composer, taken again after it.
            release();
            const who = MixinApi.isNotifyPolicy(actor)
              ? await actor.composeOccupants(occupants, occupants.length)
              : Mml.list(occupants.map((o) => Mml.actor(o, { form: 'presence' })));
            release = LookController.holdLight();
            body = Mml.compose`${body}\n── Here: ${who}.`;
            segments.push({
              shape: 'list',
              heading: 'Here',
              sources: [LookController.lookSource('Here')],
              text: this.render(Mml.compose`── Here: ${who}.`, actor),
              items: occupants.map((o) => this.personOf(o, actor)),
            });
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
            // ⭐ Identical things GROUP (client-surface D2, #71/#76): a shelf
            // of fourteen bottles is "14 bottles of gin", one chip that
            // expands, not fourteen words.
            const grouped = this.groupForList(items, actor, (item) => this.builderMark(item, actor, Mml.thing(item)));
            const seen = Mml.fromMarkup(Mml.list(grouped.parts).toString());
            body = Mml.compose`${body}\n── You also see: ${seen}.`;
            segments.push({
              shape: 'list',
              heading: 'You also see',
              sources: [LookController.lookSource('You also see')],
              text: this.render(Mml.compose`── You also see: ${seen}.`, actor),
              items: grouped.items,
            });
          }
        }
      }

      // Passive hints (honest fog): a concealed-and-undiscovered thing the
      // actor *nearly* perceives surfaces its authored "tell" — a draft, a
      // seam, a stone sitting proud — so attention is *directed*, not
      // pixel-hunted. A hint names the tell, NEVER the hidden thing's identity
      // (that would leak concealed data). `observe` narrowed the room's
      // contents + every exit (hidden ones included) to the close-but-
      // unperceived.
      for (const cand of seen.hints) {
        const tell = MixinApi.isConcealable(cand)
          ? cand.getConcealmentHint()
          : undefined;
        const hint = tell
          ? Mml.fromMarkup(tell)
          : Mml.compose`Something here doesn't sit quite right.`;
        body = Mml.compose`${body}\n${hint}`;
        segments.push({ shape: 'notice', sources: [LookController.lookSource('Hints')], text: this.render(hint, actor) });
      }

      // ⭐ The light, the tint and the notices are printed as their own
      // scenes (below) and are NOTICE segments on the card — every line the
      // terminal prints, the card says (AC 6), in the order printed.
      const bandPhrase = band ? LIGHT_BAND_PHRASE[band] : null;
      const tintLine = this.tintLineAt(location, band);
      const cardSegments: LookSegment[] = [
        ...(bandPhrase
          ? [{ shape: 'notice' as const, sources: [LookController.lookSource('Light')], text: bandPhrase }]
          : []),
        ...(tintLine
          ? [{ shape: 'notice' as const, sources: [LookController.lookSource('Light')], text: this.render(tintLine, actor) }]
          : []),
        ...segments,
        ...notices.map((opening) => ({
          shape: 'notice' as const,
          sources: [LookController.lookSource('Notices')],
          text: this.render(Mml.compose`A notice here: ${opening.describe()}`, actor),
        })),
      ];

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
        segments: cardSegments,
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
      if (bandPhrase) {
        MessageApi.scene(actor)
          .topic('sense.survey')
          .toSelf(Mml.compose`${Mml.fromMarkup(bandPhrase)}`)
          .send();
      }

      // ⭐ The light is TINTED — a stained window on the far side colours
      // what reaches the floor (W0). Its own uncarded scene, like the band
      // phrase and for the same reason: a room's light is not one of its
      // authored fields, so folding it into `body` would reach the card
      // (which never renders handed prose) and vanish from a browser.
      // Only when the cast is deep enough to be worth a sentence, and only
      // when the place is light enough to describe at all.
      if (tintLine) {
        MessageApi.scene(actor).topic('sense.survey').toSelf(tintLine).send();
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

    } finally {
      release();
    }
    return;
  }

  /**
   * A light hold whose release runs at most once — so the `finally` after
   * a throw across the composer's await can never release a hold some
   * other command opened in the meantime.
   */
  protected static holdLight(): () => void {
    const release = PerceptionApi.holdLightSteady();
    let done = false;
    return () => {
      if (done) return;
      done = true;
      release();
    };
  }

  /**
   * ⭐ One sentence for a light seen in the dark, or `null`: a fire is seen
   * in the dark you cannot see BY. The model finds it
   * (`VisionModality.brightestFireNear`); this words it — its colour by its
   * own temperature (a fire's incandescence), and the way it lies.
   */
  private glowInTheDark(location: Stuff): Mml | null {
    if (!MixinApi.isContainer(location)) return null;
    let fire: ReturnType<VisionModality['brightestFireNear']>;
    try {
      const vision = PerceptionApi.modalityByName('vision') as VisionModality;
      fire = vision.brightestFireNear(location as unknown as Stuff & Container);
    } catch {
      return null;
    }
    if (fire === null) return null;
    // ⭐ A hot body glows on the one incandescence scale (R2-B3); a light
    // with no hot body to read (a lamp, a worked flame) by its authored
    // colour.
    const glow = fire.heatK === null ? null : FireApi.incandescenceOf(fire.heatK);
    const k = fire.colorTemperatureK;
    const hue =
      glow !== null
        ? `${glow === 'orange' ? 'an' : 'a'} ${glow} glow`
        : k === null
          ? 'a glow'
          : k < 2000
            ? 'a dull red glow'
            : k < 3000
              ? 'an orange glow'
              : 'a pale glow';
    const where = fire.direction ? ` to the ${fire.direction}` : '';
    return Mml.compose`You can see ${hue}${where}.`;
  }

  /**
   * One sentence when the light in `location` carries a legible colour
   * cast — a stained window colouring the floor — or `null`. Reads the
   * raw vision signal (colour is not viewer-dependent), gates on the
   * `light.tintLegibleAt` dial and on the room being light enough to
   * describe, and names the cast with the palette's nearest word. Any
   * perception gap degrades to `null` — a missing tint never takes
   * `look` down.
   */
  private tintLineAt(
    location: Stuff,
    band: LightBand | null,
  ): Mml | null {
    if (band && LIGHT_BANDS_TOO_DARK_TO_DESCRIBE.includes(band)) return null;
    if (!MixinApi.isContainer(location)) return null;
    try {
      const vision = PerceptionApi.modalityByName('vision') as VisionModality;
      const signal = vision.signalAt(
        location as unknown as Stuff & Container,
      );
      if (signal.intensity.rawValue() <= 0) return null;
      const colour = signal.colour;
      if (colour.depth() < this.tintLegibleAt()) return null;
      const word = colour.nearestTag();
      return Mml.compose`The light here comes ${word}-tinted through the glass, and lies ${word} on the floor.`;
    } catch {
      return null;
    }
  }

  /** The `light.tintLegibleAt` dial, with a seeded-literal fallback. */
  private tintLegibleAt(): number {
    try {
      const raw = AppApi.setting(AppSettingKeys.lightTintLegibleAt);
      if (raw === '' || raw == null) return 0.25;
      const n = Number.parseFloat(raw);
      return Number.isFinite(n) ? n : 0.25;
    } catch {
      return 0.25;
    }
  }

  private async lookAtTarget(
    target: Stuff,
    context: CommandContext,
  ): Promise<void> {
    const actor = context.commandGiver;
    // ⭐⭐ THE PERCEPTION MOMENT (controller-liquidity W8): the senses warm,
    // what has been happening to it settles (cleanliness D21), a person is
    // tracked, what it visibly holds is read and the close look is taken —
    // every world write `look` makes, in `PerceptionApi.observe`.
    const seen = await PerceptionApi.observe(actor, target);
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
    // Run the long through `getMarkupLong(viewer)` so detail keywords
    // and any other contributing-mixin augmenters wrap inline —
    // matches the location branch above; both `look <thing>` and
    // bare `look` ship the same affordance-annotated text. (A
    // consumable's nutrition label rides this augmenter seam via
    // `NutritionLabelMixin`, not a special-case here.)
    // ⭐ Every section below opens on its own line (`\n── …`): the body
    // carries no trailing newline, so the first section and the tenth are
    // joined the same way (slate bug 9 — every `──` after the first ran
    // onto the previous line).
    const long = target.getSegmentedLong(actor);
    let body = Mml.compose`\n${Mml.actor(target)}\n\n${Mml.fromMarkup(long.text)}`;
    // ⭐ The card's segments, built in step with `body` (client-surface
    // D1/D2) — the name is the card's header.
    const segments: LookSegment[] = [...long.segments];
    const section = (line: Mml, seg: Omit<LookSegment, 'text'>): void => {
      body = Mml.compose`${body}\n${line}`;
      segments.push({ ...seg, text: this.render(line, actor) });
    };

    // ⭐ What a PERSON is doing (client-surface D10, #74) — status, a
    // posture other than standing, what occupies them, and whether they
    // are here at all. Composed from what they already say about
    // themselves; nothing new is stored.
    const presence = target.isAgent() ? this.presenceLine(target) : null;
    if (presence) section(Mml.compose`${presence}`, { shape: 'state', sources: [LookController.lookSource('Presence')] });

    // Drill-in: examining a placement host reveals what is placed on it
    // (the back-bar's bottles + tools) — the discovery path that keeps them
    // out of the room view. One line per member the host offers, so a hook
    // says "Hanging from it" where a shelf says "On it".
    if (MixinApi.isPlacing(target)) {
      for (const member of target.getPlacements()) {
        // ⭐ What the actor perceives on it (D23): a covered or concealed
        // thing placed there is not in the list.
        const placed = PerceptionApi.perceived(actor, target.getPlaced(member));
        if (placed.length === 0) continue;
        // A person sitting on a stool is placed on a host too. Identical
        // things group (D2), so a back-bar of fourteen bottles is one chip.
        const grouped = this.groupForList(placed, actor, (r) => this.builderMark(r, actor, Mml.actor(r)));
        const list = Mml.list(grouped.parts);
        // ⭐ The heading is the MEMBER's, off its own `Placement` row —
        // so a hook says "Hanging from it" where a shelf says "On it",
        // with nothing here knowing the difference. A member with no
        // live row falls back rather than printing nothing.
        // A named region heads its own line (`In its left pocket` — W9).
        const heading = target.namedRegions().includes(member)
          ? `In its ${member}`
          : target.placementOf(member).getHeading() || 'With it';
        section(Mml.compose`── ${heading}: ${list}.`, {
          shape: 'list',
          heading,
          sources: [LookController.lookSource(heading)],
          items: grouped.items,
        });
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
        section(Mml.compose`── Owned by ${holder.describeFor(actor)}.`, {
          shape: 'list',
          heading: 'Owned by',
          sources: [LookController.lookSource('Owned by')],
          items: [this.itemOf(holder, actor)],
        });
      }
    }
    // A display reads what it shows — the booth's television, the house
    // tablet with the stock sheet up, the terminal's departures. ⭐ The
    // screen renders itself: `readScreen(viewer)` is the PROSE arm, and
    // it is per-viewer, so a board that annotates against the reader's
    // own credential resolves here rather than being pushed at the room.
    // ⭐ A screen at rest is a fact too (client-surface B41): "dark" is
    // what you would see, and the line is there either way.
    if (MixinApi.isDisplay(target)) {
      const screen = (await target.readScreen(actor)) ?? Mml.compose`The screen is dark.`;
      section(Mml.compose`── ${screen}`, { shape: 'state', sources: [LookController.lookSource('Screen')] });
    }
    // ⭐ What you would NOTICE it holding (maritime revision 2) — what it
    // holds that you PERCEIVE (size-and-carrying D23/D24: `observe` ran it
    // through `PerceptionApi.perceives`' holder rules — on a person what is
    // in their hands and their outer layers, never what their clothes
    // cover; in a shut box nothing you cannot see through). Past four it
    // summarises and says how to see the rest — the ledger is `inventory`.
    const v = seen.holds;
    if (v) {
      const keyword = MixinApi.isPerceptible(target) ? target.getPrimaryKeyword() ?? '' : '';
      // Resolved now (`Mml.fromMarkup(…toString())`): vision walks up ONE
      // level from the target, so a list left lazy would read every item
      // in an NPC's hands as `something`.
      const group = (heading: string, xs: Stuff[]): void => {
        if (xs.length === 0) return;
        const shown = xs.slice(0, LOOK_INLINE).map((c) => this.builderMark(c, actor, Mml.actor(c)));
        const more = xs.length - shown.length;
        const list = Mml.fromMarkup(Mml.list(shown, { style: 'inline' }).toString());
        section(
          more > 0
            ? Mml.compose`── ${heading}: ${list}, and ${more} more ${more === 1 ? 'thing' : 'things'} — \`inventory ${keyword}\`.`
            : Mml.compose`── ${heading}: ${list}.`,
          {
            shape: 'list',
            heading,
            sources: [LookController.lookSource(heading)],
            items: xs.map((c) => this.itemOf(c, actor)),
          },
        );
      };
      group('Wearing', v.worn);
      group('Holding', v.held);
      // ⭐ A body is not a box: it is CARRYING what it neither wears nor
      // holds (the browser walk read "In it: an aether implant and a key").
      group(target.isAgent() ? 'Carrying' : 'In it', v.carried);
    }

    // Close look: attending to a container peers in for anything
    // half-concealed — the directed-attention glance that `examine`
    // used to be, folded onto `look <thing>` (the `glance` depth =
    // the cheap `concealment.examineBonus`). Silent unless the glance
    // actually turns something up; a deliberate over-a-place scan
    // that ties up your hands and takes time is `search`.
    if (seen.found.length > 0) {
      // What a search turns up is very often a HIDING PERSON.
      const noticed = Mml.list(seen.found.map((f) => Mml.actor(f)));
      section(Mml.compose`Looking closely, you notice ${noticed}.`, {
        shape: 'notice',
        sources: [LookController.lookSource('Hints')],
      });
    }
    for (const cand of seen.hints) {
      const tell = MixinApi.isConcealable(cand)
        ? cand.getConcealmentHint()
        : undefined;
      section(
        tell ? Mml.fromMarkup(tell) : Mml.compose`Something here almost catches your eye.`,
        { shape: 'notice', sources: [LookController.lookSource('Hints')] },
      );
    }

    // Card first — see the room path: `carded` must be a fact.
    const openedSubject = CardApi.open(context, 'subject', {
      subjectId: target.stuffId,
      prose: body,
      segments,
    });

    const subjectScene = MessageApi.scene(actor).topic('sense.survey');
    if (openedSubject) subjectScene.meta({ carded: openedSubject });
    subjectScene.toSelf(body).send();

    return;
  }

  /** A segment's text: the line, materialized for the one viewer it is for. */
  private render(line: Mml, actor: Stuff): string {
    return line.toString(actor as Stuff & Sensor);
  }

  /** One chip for a list segment — the thing as this viewer names it. */
  private itemOf(x: Stuff, actor: Stuff): SegmentItem {
    return {
      stuffId: x.stuffId,
      label: x.describeFor(actor),
      keyword: MixinApi.isPerceptible(x) ? (x.getPrimaryKeyword() ?? '') : '',
      count: 1,
    };
  }

  /**
   * A person's chip: their name, their status line, and what they rest on
   * — the seat as its own chip, so both stay clickable.
   */
  private personOf(o: Stuff, actor: Stuff): SegmentItem {
    const item = this.itemOf(o, actor);
    const own = MixinApi.isStatus(o) ? o.getStatus() : '';
    // ⭐ The chip says so too (D9) — the same read as the presence line.
    const onAir = MixinApi.isBroadcastHost(o) && o.isOnAir() ? 'broadcasting' : '';
    const status = [own, onAir].filter((p) => p !== '').join(', ');
    const rest = MixinApi.isPosed(o) ? o.currentRest() : null;
    return {
      ...item,
      ...(status ? { status } : {}),
      ...(rest ? { seat: { posture: rest.phrase, on: this.itemOf(rest.host, actor) } } : {}),
    };
  }

  /**
   * ⭐ Identical things in a list GROUP (client-surface D2, #71/#76): the
   * same row, holding the same matter, is one entry — "a bottle of gin
   * +5 more" — carrying its members so the card expands it in place. A
   * person never groups; every person is somebody.
   */
  /**
   * ⭐ The builder lens's mark (size-and-carrying D25): a thing the actor
   * perceives ONLY through `lens on` reads `[builder]` after its name.
   */
  private builderMark(x: Stuff, actor: Stuff, line: Mml): Mml {
    return PerceptionApi.perceivedHow(actor, x) === 'builder' ? Mml.compose`${line} [builder]` : line;
  }

  private groupForList(
    xs: readonly Stuff[],
    actor: Stuff,
    ref: (x: Stuff) => Mml,
  ): { parts: Mml[]; items: SegmentItem[] } {
    const groups = new Map<string, Stuff[]>();
    for (const x of xs) {
      const tp = x.getTemplatePath();
      const key =
        x.isAgent() || !tp
          ? `#${x.stuffId}`
          : `${tp}|${MixinApi.isBulkable(x) ? (x.getBulkMaterialPath('interior') ?? '') : ''}`;
      const g = groups.get(key);
      if (g) g.push(x);
      else groups.set(key, [x]);
    }
    const parts: Mml[] = [];
    const items: SegmentItem[] = [];
    for (const members of groups.values()) {
      const first = members[0]!;
      if (members.length === 1) {
        parts.push(ref(first));
        items.push(this.itemOf(first, actor));
        continue;
      }
      /*
       * ⭐ "a bar stool +5 more" (owner, 2026-11-01): ONE of them, by its
       * own name and still a link, then how many more. A counted plural
       * ("6 bar stools") named none of them and read like a different
       * kind of thing.
       */
      const [, ...rest] = members;
      const one = this.itemOf(first, actor);
      parts.push(Mml.compose`${ref(first)} +${String(rest.length)} more`);
      items.push({
        ...one,
        label: `${one.label} +${rest.length} more`,
        count: members.length,
        members: members.map((m) => this.itemOf(m, actor)),
      });
    }
    return { parts, items };
  }

  /**
   * Is anyone in `location` on air right now? (D9) Read off the online
   * roster — a stream needs a played body, and every played body online
   * is on it — rather than walking the room's contents.
   */
  private anyoneOnAir(location: Stuff): boolean {
    return SocialApi.online().some(
      (a) => a.getContainer() === location && MixinApi.isBroadcastHost(a) && a.isOnAir(),
    );
  }

  /**
   * ⭐ The presence line (client-surface D10, #74): what a person is doing,
   * from what they already say — their status, a posture other than
   * standing, the activities that occupy them, and `away` when linkdead.
   */
  private presenceLine(target: Stuff): string | null {
    const parts: string[] = [];
    if (MixinApi.isStatus(target)) {
      const status = target.getStatus();
      if (status) parts.push(status);
    }
    if (MixinApi.isPosed(target)) {
      const posture = target.getPosture();
      // ⚠ The stored value is the VERB form (`Postures.Stand` = 'stand'):
      // comparing to 'standing' never matched, and every person card said
      // "Now: stand." A resting body says what it rests on instead.
      const rest = target.currentRest();
      if (rest) parts.push(`${rest.phrase} ${rest.host.getPresentation()}`);
      else if (posture && posture !== Postures.Stand) parts.push(posture);
    }
    if (MixinApi.isEngaged(target)) {
      // The engagement's type is its activity, written as words.
      for (const e of target.getEngagements()) {
        const word = e.type.replace(/[-_.]+/g, ' ').trim();
        if (word && !parts.includes(word)) parts.push(word);
      }
    }
    if (MixinApi.isHasInteractive(target) && target.isLinkdead()) parts.push('away');
    // ⭐ On air (broadcast-ready D9) — beside `away`, in the same voice.
    if (MixinApi.isBroadcastHost(target) && target.isOnAir()) parts.push('broadcasting');
    if (parts.length === 0) return null;
    return `Now: ${parts.join(', ')}.`;
  }

  private formatExits(exits: readonly Exit[]): Mml | null {
    if (exits.length === 0) return null;
    const parts = exits.map((exit) => {
      // `Mml.exit` emits a clickable `<exit dir="X" stuff-id="Y">` —
      // the client turns it into the affordance that sends `go <dir>`.
      // The door's name rides its own `<item>` tag so it's clickable
      // too (renderer resolves stuff-id → primaryKeyword and emits
      // `look <doorKeyword>`) — same affordance the inspection card
      // gives, kept consistent across surfaces.
      const tagged = Mml.exit(exit);
      const door = exit.getBoundary();
      if (!door) return tagged;
      // ⭐ One word, from the way — see `Exit.wayState`. This read said
      // `closed` about a LOCKED door, in two controllers, until a lens
      // pass caught it. A window is named, not stated: it is never a way
      // a body takes.
      const doorLink = Mml.thing(door);
      if (exit.wayState() === 'window') return Mml.compose`${tagged} (${doorLink})`;
      return Mml.compose`${tagged} (${doorLink}, ${door.stateWord()})`;
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
