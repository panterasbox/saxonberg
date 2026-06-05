/**
 * LookController — examine surroundings, an object, or a sub-feature
 * (Detail).
 *
 * Fires a Scene at `world.perception.look` with a single self frame
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

import { CommandController } from '../../lib/command/CommandController';
import type {
  CommandContext,
  CommandModel,
  } from '../../api/command';
import type { MqlOneResult } from '../../api/mql';
import type { Stuff } from '../../lib/stuff/Stuff';
import { MixinApi } from '../../api/mixin';
import { MessageApi } from '../../api/message';
import { DescribeApi } from '../../api/describe';
import { Mml } from '../../api/mml';
import type { Exit } from '../../lib/boundary/Exit';

interface LookModel extends CommandModel {
  target?: MqlOneResult;
}

export class LookController extends CommandController<LookModel> {
  execute(model: LookModel, context: CommandContext): void {
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
        .topic(MessageApi.Topics.world.perception.look)
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
        .topic(MessageApi.Topics.world.perception.look)
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
    const description = host.getDetail(dotted);
    if (description === null) {
      MessageApi.scene(context.commandGiver)
        .topic(MessageApi.Topics.world.perception.look)
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
      .topic(MessageApi.Topics.world.perception.look)
      .toSelf(body)
      .send();

    return;
  }

  private lookAtLocation(context: CommandContext): void {
    const actor = context.commandGiver;
    const location = context.location;
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
        return true;
      });

    if (
      !hasVisible &&
      !hasExits &&
      !hasName &&
      visibleContents.length === 0
    ) {
      MessageApi.scene(actor)
        .topic(MessageApi.Topics.world.perception.look)
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
    // Detail keywords auto-link via `getMarkupLong()` when the
    // location composes `DetailedMixin` — the prose ships with
    // `<detail key="...">word</detail>` wrappers around canonical
    // keys, so the renderer makes them clickable. Authors keep
    // writing prose; the substrate handles the affordance.
    const longText = !hasVisible
      ? ''
      : (
          MixinApi.isDetailed(location)
            ? (location as unknown as { getMarkupLong(): string }).getMarkupLong()
            : location.getLong()
        ).replace(/\s+$/, '');
    let body = Mml.compose`${Mml.location(location)}`;
    if (hasVisible) {
      body = Mml.compose`${body}\n${Mml.fromMarkup(longText)}`;
    }
    if (hasExits) {
      const exitsLine = this.formatExits(location.getObviousExits());
      if (exitsLine) {
        body = Mml.compose`${body}\n${exitsLine}`;
      }
    }
    if (visibleContents.length > 0) {
      const items = visibleContents.map((item) => Mml.item(item));
      const list = Mml.list(items);
      body = Mml.compose`${body}\nYou also see: ${list}.`;
    }

    MessageApi.scene(actor)
      .topic(MessageApi.Topics.world.perception.look)
      .toSelf(body)
      .send();

    return;
  }

  private lookAtTarget(target: Stuff, context: CommandContext): void {
    const actor = context.commandGiver;
    // Non-Visible targets fall through to a polite refusal rather
    // than rendering "You see nothing special." against the target's
    // name. The `look.yaml` validator stack used to enforce this via
    // `mustBeVisible`, but excluding non-Visible targets at the
    // validator level also rejected `look` against a non-Visible
    // location (the void case), so the check moved here where it
    // can differentiate "looking at a thing" from "looking at the
    // room".
    if (!MixinApi.isVisible(target)) {
      const name = DescribeApi.getDisplayName(target);
      MessageApi.scene(actor)
        .topic(MessageApi.Topics.world.perception.look)
        .toSelf(Mml.compose`You can't see ${name}.`)
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'target-not-visible',
        detail: name,
      });
      return;
    }
    const body = Mml.compose`\n${Mml.name(target)}\n\n${Mml.fromMarkup(target.getLong())}\n`;

    MessageApi.scene(actor)
      .topic(MessageApi.Topics.world.perception.look)
      .toSelf(body)
      .send();

    return;
  }

  private formatExits(exits: Exit[]): Mml | null {
    if (exits.length === 0) return null;
    const parts = exits.map((exit) => {
      // `Mml.exit` emits a clickable `<exit dir="X" stuff-id="Y">` —
      // the client turns it into the affordance that sends `go <dir>`.
      // Door annotation rides outside the clickable so the click area
      // is exactly the direction word.
      const tagged = Mml.exit(exit);
      const door = exit.getDoor();
      if (!door) return tagged;
      const state = door.isOpen() ? 'open' : 'closed';
      const doorName = DescribeApi.getDisplayName(door);
      return Mml.compose`${tagged} (${doorName}, ${state})`;
    });
    const joined = Mml.list(parts);
    // No `<exits>` outer wrapper: the prose `Obvious exits: …` is the
    // structural marker, the inner `<exit>` tags carry the only
    // semantics the renderer cares about, and a wrapper that
    // *contains* other tags can't be parsed by the client's regex
    // MML renderer (which only matches flat tags). Render the
    // joined Mml directly into the sentence.
    return Mml.compose`Obvious exits: ${joined}.`;
  }
}
