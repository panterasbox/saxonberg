/**
 * InventoryController — `inventory [<thing>] [--all --flat --held --ready
 * --worn --packed --weight]`: the itemised LEDGER of what something holds
 * (maritime revision 2), walked by TIER on yourself (size and carrying D28).
 *
 * ⭐ `look` answers *what is this like?*; `inventory` answers *what
 * exactly does this hold?* — complete and grouped:
 * - yourself (no argument): the whole tree by how near it is to your hand
 *   (`Carrying.tierOf`) — *in hand* · *ready* (each pocket, each thing
 *   hung from a worn host, each worn container with what is in it) ·
 *   *worn* · *packed* (each pack on the back as *N things, M kg*; `--all`
 *   opens them) · the burden in words. `--flat` is one list of everything;
 *   `--held`/`--ready`/`--worn`/`--packed` one section; `--weight` adds the
 *   mass and the bulk of each thing.
 * - a person: what you PERCEIVE of what they carry — their hands, their
 *   outer layers, what hangs from them, what you found on them
 *   (`PerceptionApi.visibleContentsOf`, a grouping of what
 *   `PerceptionApi.perceived` admits — size-and-carrying D23/D24 — so no
 *   surface can disagree with another);
 * - a container: what you perceive in it; a shut one you cannot see into
 *   refuses in words;
 * - ⭐ a thing things are placed on, in or hung from (a belt, a coat): each
 *   of its regions with what you perceive there, and — for a length things
 *   hang from — the room left, in words (`Placing.roomFor`; D27's `i belt`).
 *
 * `look in <thing>` is the same ledger ({@link InventoryController.ledger}).
 * Every list passes `PerceptionApi.perceived` (`lint:perceived-surfaces`).
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import type { MqlOneResult } from '../../../../api/mql';
import { MixinApi } from '../../../../api/mixin';
import { MessageApi } from '../../../../api/message';
import { PerceptionApi } from '../../../../api/perception';
import { Mml } from '../../../../api/mml';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import type { Placing } from '../../../../lib/spatial/Placing';
import type { Carrying } from '../../../../lib/slot/Carrying';

interface InventoryModel extends CommandModel {
  target?: MqlOneResult;
  /** `--all` — open the packed containers too. */
  all?: boolean;
  /** `--flat` — one list of everything, no tiers. */
  flat?: boolean;
  /** `--held` — only what is in your hands. */
  held?: boolean;
  /** `--ready` — only what is ready to hand. */
  ready?: boolean;
  /** `--worn` — only what you wear. */
  worn?: boolean;
  /** `--packed` — only what is packed away. */
  packed?: boolean;
  /** `--weight` — the mass and bulk of each thing. */
  weight?: boolean;
}

/** One rendered section of the tiered view. */
type Section = 'held' | 'ready' | 'worn' | 'packed';

/**
 * The ledger controller. `ledger` is a public static for exactly three
 * callers — this controller, `LookController` (`look in`) and
 * `QueryController` (`query --ledger`) — none of them author surface
 * (`lint:lib-statics`' caller audit). ⭐ `inventory <thing>` is `query
 * --ledger <thing>:i` (maritime revision 2′), kept as its own view
 * because its argument is a HOLDER and it defaults to you.
 *
 * @internal
 */
export default class InventoryController extends CommandController<InventoryModel> {
  execute(model: InventoryModel, context: CommandContext): void {
    const viewer = context.commandGiver;
    const raw = model.target?.raw ?? '';
    const target = model.target?.stuff ?? (raw === '' ? viewer : null);
    if (target === null) {
      MessageApi.scene(viewer)
        .topic('sense.survey')
        .toSelf(Mml.compose`You don't see any '${raw}' here.`)
        .send();
      context.note({ kind: 'empty-result', field: 'target', query: raw });
      return;
    }
    const weight = model.weight === true;
    // ⭐ Yourself, by tier (D28) — when you are a carrier.
    if (target === viewer && MixinApi.isCarrying(viewer)) {
      MessageApi.scene(viewer).topic('sense.survey').toSelf(InventoryController.tiered(viewer, model)).send();
      return;
    }
    // ⭐ A thing that offers regions and holds nothing itself (a belt, a coat).
    if (MixinApi.isPlacing(target) && !MixinApi.isContainer(target)) {
      MessageApi.scene(viewer)
        .topic('sense.survey')
        .toSelf(InventoryController.regions(viewer, target, weight))
        .send();
      return;
    }
    if (!MixinApi.isContainer(target)) {
      const line = target === viewer
        ? Mml.compose`You have no inventory.`
        : Mml.compose`${Mml.actor(target)} holds nothing.`;
      MessageApi.scene(viewer).topic('sense.survey').toSelf(line).send();
      context.note({ kind: 'mixin-missing', mixin: 'ContainerMixin' });
      return;
    }
    const body = InventoryController.ledger(viewer, target, undefined, weight);
    if (body === null) {
      MessageApi.scene(viewer)
        .topic('sense.survey')
        .toSelf(Mml.compose`${Mml.actor(target)} is shut.`)
        .send();
      context.note({ kind: 'controller-rejected', reason: 'shut', detail: target.getPresentation() });
      return;
    }
    // A container that also offers regions (a pack's straps) lists them too.
    const hung = MixinApi.isPlacing(target) ? InventoryController.regionLines(viewer, target, weight) : [];
    const all = hung.length > 0 ? hung.reduce((acc, line) => Mml.compose`${acc}${line}\n`, body) : body;
    MessageApi.scene(viewer).topic('sense.survey').toSelf(all).send();
  }

  /**
   * ⭐ The ledger of what `viewer` may see `target` hold — grouped, and
   * complete (no summary). `null` when `target` is a container that is
   * shut. Shared by `inventory` and `look in <thing>`.
   */
  public static ledger(viewer: Stuff, target: Stuff, only?: ReadonlySet<string>, weight = false): Mml | null {
    const all = PerceptionApi.visibleContentsOf(viewer, target);
    if (all.shut) return null;
    // `query --ledger <a narrowed set>` groups just what the query named.
    const keep = (xs: Stuff[]): Stuff[] => (only ? xs.filter((x) => only.has(x.stuffId)) : xs);
    const v = { worn: keep(all.worn), held: keep(all.held), carried: keep(all.carried) };
    const list = (xs: Stuff[]): Mml => InventoryController.list(viewer, xs, weight);
    const lines: Mml[] = [];
    if (viewer === target) {
      if (v.worn.length) lines.push(Mml.compose`You are wearing: ${list(v.worn)}.`);
      if (v.held.length) lines.push(Mml.compose`You are holding: ${list(v.held)}.`);
      if (v.carried.length) lines.push(Mml.compose`You are carrying: ${list(v.carried)}.`);
      if (lines.length === 0) return Mml.compose`\nYou are not carrying anything.\n`;
    } else {
      lines.push(Mml.compose`${Mml.actor(target)}`);
      if (v.worn.length) lines.push(Mml.compose`── Wearing: ${list(v.worn)}.`);
      if (v.held.length) lines.push(Mml.compose`── Holding: ${list(v.held)}.`);
      if (v.carried.length) lines.push(Mml.compose`── In it: ${list(v.carried)}.`);
      if (lines.length === 1) lines.push(Mml.compose`── Nothing you can see.`);
    }
    const body = lines.reduce((acc, line) => Mml.compose`${acc}\n${line}`);
    return Mml.compose`\n${body}\n`;
  }

  /** ⭐ Yourself by tier (D28) — the sorting is the carrier's (`Carrying.carriedTiers`). */
  private static tiered(viewer: Stuff & Carrying, model: InventoryModel): Mml {
    const carrier = viewer;
    const weight = model.weight === true;

    if (model.flat === true) {
      const everything = MixinApi.isContainer(viewer)
        ? PerceptionApi.perceived(viewer, viewer.getCarriedContents())
        : [];
      return everything.length === 0
        ? Mml.compose`\nYou are not carrying anything.\n`
        : Mml.compose`\nYou have: ${InventoryController.list(viewer, everything, weight)}.\n`;
    }

    // What is directly on the body, by how it is carried — each list perceived.
    const tiers = carrier.carriedTiers();
    const seen = (xs: readonly Stuff[]): Stuff[] => PerceptionApi.perceived(viewer, xs);
    const held = seen(tiers.held);
    const worn = seen(tiers.worn);
    const readyContainers = seen(tiers.ready);
    const packedContainers = seen(tiers.packed);
    const loose = seen(tiers.loose);
    const regions = tiers.regions
      .map((g) => ({ ...g, items: seen(g.items) }))
      .filter((g) => g.items.length > 0);

    const only = (['held', 'ready', 'worn', 'packed'] as const).filter((s) => model[s] === true);
    const shows = (s: Section): boolean => only.length === 0 || only.includes(s);
    const list = (xs: Stuff[]): Mml => InventoryController.list(viewer, xs, weight);
    const contentsOf = (c: Stuff): Stuff[] => {
      const v = PerceptionApi.visibleContentsOf(viewer, c);
      return [...v.held, ...v.worn, ...v.carried];
    };
    const lines: Mml[] = [];

    if (shows('held') && held.length > 0) lines.push(Mml.compose`In hand: ${list(held)}.`);

    if (shows('ready')) {
      const ready: Mml[] = [];
      for (const g of regions) {
        const member = g.host.placementOf(g.region);
        const named = g.host.namedRegions().includes(g.region);
        const where = named
          ? Mml.compose`In your ${Mml.text(g.host.presentationPhrase().bare())}'s ${g.region}`
          : member.getHangs()
            ? Mml.compose`Hanging from your ${Mml.text(g.host.presentationPhrase().bare())}`
            : Mml.compose`${member.getHeading() || 'With'} your ${Mml.text(g.host.presentationPhrase().bare())}`;
        ready.push(Mml.compose`  ${where}: ${list(g.items)}.`);
      }
      for (const c of readyContainers) {
        const inside = contentsOf(c);
        ready.push(
          inside.length > 0
            ? Mml.compose`  ${Mml.thing(c)}: ${list(inside)}.`
            : Mml.compose`  ${Mml.thing(c)}: empty.`,
        );
      }
      // Nothing should be loose on a body after the flip (D11); if a
      // restore or an old caller left something so, it is shown, not hidden.
      if (loose.length > 0) ready.push(Mml.compose`  Loose: ${list(loose)}.`);
      if (ready.length > 0) {
        lines.push(Mml.compose`Ready:`);
        lines.push(...ready);
      }
    }

    if (shows('worn') && worn.length > 0) lines.push(Mml.compose`Worn: ${list(worn)}.`);

    if (shows('packed') && packedContainers.length > 0) {
      lines.push(Mml.compose`Packed:`);
      for (const c of packedContainers) {
        const inside = contentsOf(c);
        if (model.all === true || only.includes('packed')) {
          lines.push(
            inside.length > 0
              ? Mml.compose`  ${Mml.thing(c)}: ${list(inside)}.`
              : Mml.compose`  ${Mml.thing(c)}: empty.`,
          );
        } else {
          lines.push(Mml.compose`  ${Mml.thing(c)}: ${carrier.tallyWords(inside)}.`);
        }
      }
    }

    if (lines.length === 0) {
      return only.length === 0
        ? Mml.compose`\nYou are not carrying anything.\n`
        : Mml.compose`\nNothing.\n`;
    }
    if (only.length === 0 && MixinApi.isLoadBearing(viewer)) {
      const burden = viewer.burdenWords();
      if (burden !== null) lines.push(Mml.compose`${burden}`);
    }
    const out = lines.reduce((acc, line) => Mml.compose`${acc}\n${line}`);
    return Mml.compose`\n${out}\n`;
  }

  /** ⭐ A placing host's regions and what is perceived in each (D27's `i belt`). */
  private static regions(viewer: Stuff, host: Stuff & Placing, weight: boolean): Mml {
    const lines = InventoryController.regionLines(viewer, host, weight);
    if (lines.length === 0) {
      return host.getPlacements().length === 0
        ? Mml.compose`\n${Mml.thing(host)} holds nothing.\n`
        : Mml.compose`\nNothing you can see on ${Mml.thing(host)}.\n`;
    }
    const body = lines.reduce((acc, line) => Mml.compose`${acc}${line}\n`, Mml.compose`\n${Mml.thing(host)}\n`);
    return body;
  }

  /** One line per region of `host` with something perceived in it, plus a hanging length's room. */
  private static regionLines(viewer: Stuff, host: Stuff & Placing, weight: boolean): Mml[] {
    const lines: Mml[] = [];
    for (const region of host.getPlacements()) {
      const member = host.placementOf(region);
      const items = PerceptionApi.perceived(viewer, [...host.getPlaced(region)]);
      const named = host.namedRegions().includes(region);
      const heading = named
        ? region.charAt(0).toUpperCase() + region.slice(1)
        : member.getHeading() || 'With it';
      if (items.length > 0) lines.push(Mml.compose`── ${heading}: ${InventoryController.list(viewer, items, weight)}.`);
      else if (named) lines.push(Mml.compose`── ${heading}: empty.`);
      // ⭐ The room along a length, in words — never a number (D27).
      if (member.getHangs()) lines.push(Mml.compose`── Room left: ${host.roomFor(region)}.`);
    }
    return lines;
  }

  /** A list of things, each marked `[builder]` when seen only through the lens, with its weight when asked. */
  private static list(viewer: Stuff, xs: Stuff[], weight: boolean): Mml {
    return Mml.list(
      xs.map((x) => {
        const named = PerceptionApi.perceivedHow(viewer, x) === 'builder'
          ? Mml.compose`${Mml.thing(x)} [builder]`
          : Mml.thing(x);
        if (!weight) return named;
        return Mml.compose`${named} (${MixinApi.isTangible(x) ? x.massAndBulkWords() : 'weightless'})`;
      }),
    );
  }
}
