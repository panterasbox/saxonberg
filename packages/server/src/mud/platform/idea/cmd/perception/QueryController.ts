/**
 * QueryController — `query [--ledger] [--flat] [--weight] <set>`: **list
 * whatever a query names** (maritime revision 2′), and choose how to show it.
 *
 * ⭐ Two verbs, one question each. `look` answers *what is this ONE thing
 * like?*; `query` *what does this name?* — any set the query language can
 * say: a seed (`horizon`, `peers`), the player's own how-many (`all
 * brass`), a holder's things (`bob:i`). ⭐ MQL names the same things for
 * everyone; this verb lists what the VIEWER perceives of them
 * (`PerceptionApi.perceived` — size-and-carrying D23), so `bob:i` shows
 * what Bob holds that you can see. Nothing is asked: a set is not an
 * ambiguity.
 *
 * ⭐⭐ There is no inventory verb (size-and-carrying W10h, owner ruling
 * 2026-11-15): listing a set and choosing its display is this verb, and
 * `i` / `inventory` are default player aliases on its view for `query
 * --ledger me:i` — visible in `alias list`, removable by `alias unset`.
 *
 * Options change the RENDERING only — narrowing is the query's
 * (`me:i:held`, `me:i:worn`, `me:I`):
 * - the plain list (no option): each entry says how it stands to you; a
 *   thing on your horizon says where it lies, FEATURED things first, and
 *   when the set is what is in view the passers-by at sea are told too;
 * - `--ledger`: the set grouped under each holder it came from — yourself
 *   by TIER (D28: *in hand* · *ready* — each pocket, each thing hung from a
 *   worn host with the room left along it, each worn holder with what is
 *   in it — · *worn* · *packed*, each pack told as *N things, M kg* unless
 *   the set names what is in it, as `me:I` does — then the burden in
 *   words); another person or a container as worn / held / carried;
 * - `--flat`: one list, no grouping;
 * - `--weight`: each thing's mass and bulk (a flat list without `--ledger`).
 *
 * `look in <thing>` is the ledger of one holder ({@link QueryController.ledger}).
 * Every list passes `PerceptionApi.perceived` (`lint:perceived-surfaces`).
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import { MqlApi, type MqlManyResult } from '../../../../api/mql';

/** One relation in a `thing:~` listing, as the binder hands it over. */
type RelationListing = NonNullable<MqlManyResult['relations']>[number];
import type { HorizonView } from '../../../../api/perception';
import { PerceptionApi } from '../../../../api/perception';
import { MessageApi } from '../../../../api/message';
import { MixinApi } from '../../../../api/mixin';
import { Mml } from '../../../../api/mml';
import { Quantity } from '../../../../lib/quantity';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import type { Placing } from '../../../../lib/spatial/Placing';
import type { Carrying } from '../../../../lib/slot/Carrying';
import type { Slotted } from '../../../../lib/slot/Slotted';
import type { Container } from '../../../../lib/spatial/Container';
import Place from '../../../../lib/stuff/Place';
import Structure from '../../../../lib/structure/Structure';

interface QueryModel extends CommandModel {
  set?: MqlManyResult;
  /** `--ledger` — group the set under its holders (yourself by tier). */
  ledger?: boolean;
  /** `--flat` — one list, no grouping. */
  flat?: boolean;
  /** `--weight` — the mass and bulk of each thing. */
  weight?: boolean;
}

/** What is directly on a body, by how it is carried (D28) — the ledger's bucketing. */
interface CarriedTiers {
  held: Stuff[];
  regions: { host: Stuff & Placing; region: string; items: Stuff[] }[];
  worn: Stuff[];
  ready: (Stuff & Container)[];
  packed: (Stuff & Container)[];
  loose: Stuff[];
}

export default class QueryController extends CommandController<QueryModel> {
  /** Print a relation listing: one line per relation, built-ins marked. */
  private relations(raw: string, relations: readonly RelationListing[], context: CommandContext): void {
    if (relations.length === 0) {
      MessageApi.scene(context.commandGiver)
        .topic('sense.survey')
        .toSelf(Mml.compose`Nothing there can be asked for anything.`)
        .send();
      return;
    }
    const lines = relations.map((r) => `  ~${r.name} — ${r.meaning}${r.builtin ? '' : ` (${r.holder}'s)`}`);
    MessageApi.scene(context.commandGiver)
      .topic('sense.survey')
      .toSelf(Mml.text(`What ${raw.replace(/:~\s*$/, '')} can be asked for:\n${lines.join('\n')}`))
      .send();
  }

  execute(model: QueryModel, context: CommandContext): void {
    const raw = model.set?.raw ?? '';
    // ⭐ `query thing:~` — the relations it answers, each with its meaning
    // (naming overhaul D-B4). The grammar documents itself.
    const relations = model.set?.relations;
    if (relations !== undefined) return this.relations(raw, relations, context);
    // ⭐ What the viewer perceives of what the query names (D23). The binder
    // already filtered the bound set; this is the surface's own guarantee.
    const named = MqlApi.extractStuffs(model.set) ?? [];
    const items = PerceptionApi.perceived(context.commandGiver, named);
    if (items.length === 0) return this.nothing(raw, context);
    // ⭐ A FEATURE of a place matched (`query all lamps` on the bank): the
    // query names the feature, not the place that has it — say the
    // feature, where it is (found in the maritime browser walk: it read
    // "You see the bank at the confluence").
    const kept = new Set(items);
    const allVias = model.set?.vias ?? (named.length === 1 ? [model.set?.via] : []);
    const vias = named.length === items.length ? allVias : named.flatMap((x, i) => (kept.has(x) ? [allVias[i]] : []));
    const detailPath = vias[0]?.detailPath;
    if (items.length === 1 && detailPath && detailPath.length > 0) {
      const name = detailPath[detailPath.length - 1]!;
      const host = items[0]!;
      MessageApi.scene(context.commandGiver)
        .topic('sense.survey')
        .toSelf(
          host === context.location
            ? Mml.compose`You see the ${name} here — \`look ${name}\`.`
            : Mml.compose`You see the ${name} on ${Mml.thing(host)} — \`look ${name}\`.`,
        )
        .send();
      return;
    }
    const weight = model.weight === true;
    if (model.flat === true || (weight && model.ledger !== true)) return this.flat(items, weight, context);
    if (model.ledger === true) return this.groupByHolder(items, weight, context);
    this.list(items, vias, context);
  }

  /**
   * An empty set says so — and when the query descended into something
   * SHUT (`query chest:i`), it says that instead of *nothing there*.
   */
  private nothing(raw: string, context: CommandContext): void {
    const viewer = context.commandGiver;
    const holderQuery = raw.replace(/:[iI]\s*$/, '');
    if (holderQuery !== raw && holderQuery !== '') {
      try {
        const holder =
          PerceptionApi.perceived(viewer, MqlApi.resolveMany(holderQuery, { commandGiver: viewer, scope: '' }).stuff)[0] ??
          null;
        if (holder && MixinApi.isContainer(holder) && PerceptionApi.visibleContentsOf(viewer, holder).shut) {
          MessageApi.scene(viewer).topic('sense.survey').toSelf(Mml.compose`${Mml.actor(holder)} is shut.`).send();
          context.note({ kind: 'controller-rejected', reason: 'shut', detail: holder.getPresentation() });
          return;
        }
      } catch {
        /* not a holder query — nothing there, then */
      }
    }
    MessageApi.scene(viewer).topic('sense.survey').toSelf(Mml.compose`You see nothing there.`).send();
    context.note({ kind: 'empty-result', field: 'set', query: raw });
  }

  /**
   * `--ledger`: the set grouped under each holder it came from. ⭐ What is
   * anywhere on yourself — in a pocket, a satchel, the pack on your back —
   * is grouped under YOU, by tier; anything else under its own holder.
   */
  private groupByHolder(items: readonly Stuff[], weight: boolean, context: CommandContext): void {
    const viewer = context.commandGiver;
    const byHolder = new Map<Stuff, Set<string>>();
    // What a named thing is in, on yourself (the pack `rucksack:i` named
    // the insides of) — shown so its contents have somewhere to be.
    const via = new Set<string>();
    const loose: Stuff[] = [];
    for (const item of items) {
      const chain = QueryController.holdersOn(viewer, item);
      for (const h of chain ?? []) via.add(h.stuffId);
      const holder = chain !== null
        ? viewer
        : MixinApi.isContainable(item) ? item.getContainer() : null;
      if (!holder) {
        loose.push(item);
        continue;
      }
      let ids = byHolder.get(holder);
      if (!ids) byHolder.set(holder, (ids = new Set()));
      ids.add(item.stuffId);
    }
    const parts: Mml[] = [];
    for (const [holder, ids] of byHolder) {
      if (holder === viewer && MixinApi.isCarrying(viewer)) {
        parts.push(QueryController.tiered(viewer, ids, via, weight));
        continue;
      }
      const body = QueryController.ledger(viewer, holder, ids, weight);
      if (!body) continue;
      // A container that also offers regions (a pack's straps) lists them too.
      const hung = MixinApi.isPlacing(holder) ? QueryController.regionLines(viewer, holder, weight, ids) : [];
      parts.push(hung.reduce((acc, line) => Mml.compose`${acc}${line}\n`, body));
    }
    if (loose.length > 0) parts.push(Mml.compose`\n${QueryController.listOf(viewer, loose, weight)}\n`);
    if (parts.length === 0) return this.list(items, [], context);
    const body = parts.reduce((acc, p) => Mml.compose`${acc}${p}`);
    MessageApi.scene(viewer).topic('sense.survey').toSelf(body).send();
  }

  /** `--flat` (or `--weight` alone): one list of the set — *You have* when it is all on you. */
  private flat(items: readonly Stuff[], weight: boolean, context: CommandContext): void {
    const viewer = context.commandGiver;
    const lead = items.every((x) => QueryController.holdersOn(viewer, x) !== null) ? 'You have' : 'You see';
    MessageApi.scene(viewer)
      .topic('sense.survey')
      .toSelf(Mml.compose`\n${lead}: ${QueryController.listOf(viewer, [...items], weight)}.\n`)
      .send();
  }

  /**
   * The holders between `item` and `viewer` when it is anywhere on them
   * (the pack it is in, the satchel in that) — `[]` when it is directly on
   * them, `null` when it is not on them at all.
   */
  private static holdersOn(viewer: Stuff, item: Stuff): Stuff[] | null {
    const chain: Stuff[] = [];
    let at = MixinApi.isContainable(item) ? item.getContainer() : null;
    while (at) {
      if (at === viewer) return chain;
      chain.push(at);
      at = MixinApi.isContainable(at) ? at.getContainer() : null;
    }
    return null;
  }

  /** The plain list — the horizon's rendering when the set is in view. */
  private list(
    items: readonly Stuff[],
    vias: readonly ({ detailPath?: string[] } | undefined)[],
    context: CommandContext,
  ): void {
    const viewer = context.commandGiver;
    const view: HorizonView = PerceptionApi.horizonFor(viewer);
    const onHorizon = new Map(view.things.map((t) => [t.stuff.stuffId, t]));
    const room = context.location;
    const featuredPaths = room instanceof Place ? room.getFeatured() : [];
    // ⭐ The rough direction only — a compass point and rough miles — or
    // *close by* inside your own place (geography D10). Never a bearing.
    const where = (b: number | null, r: number | null, closeBy = false): string =>
      closeBy ? ', close by' : b === null || r === null ? '' : `, ${PerceptionApi.glance(b, r)}`;
    const featured: Mml[] = [];
    const rest: Mml[] = [];
    for (const [i, item] of items.entries()) {
      // ⭐ A match that came through a FEATURE is that feature — `query all
      // sea` on a deck is the sea and a sea chest, not the deck and a
      // chest (maritime browser walk, 2026-10-14).
      const feature = vias[i]?.detailPath?.at(-1);
      if (feature) {
        rest.push(item === room
          ? Mml.compose`the ${feature}`
          : Mml.compose`the ${feature} on ${Mml.thing(item)}`);
        continue;
      }
      const seen = onHorizon.get(item.stuffId);
      const isFeatured = seen !== undefined && (
        (item instanceof Structure && item.isLandmark()) ||
        featuredPaths.includes(item.getTemplatePath() ?? ''));
      // ⭐ `[builder]`: perceived only through the builder lens (D25).
      const lens = PerceptionApi.perceivedHow(viewer, item) === 'builder' ? ' [builder]' : '';
      const line = Mml.compose`${Mml.thing(item, { form: 'presence' })}${seen ? where(seen.bearingDeg, seen.rangeNm, seen.closeBy === true) : ''}${lens}`;
      (isFeatured ? featured : rest).push(line);
    }
    // When the set IS what is in view, the passers-by at sea are told too.
    const isTheHorizon = view.things.length > 0 && items.length === view.things.length &&
      items.every((i) => onHorizon.has(i.stuffId));
    if (isTheHorizon) {
      for (const p of view.traffic) rest.push(Mml.compose`${p.name}${where(p.bearingDeg, p.rangeNm)}`);
    }
    const lines: Mml[] = featured.map((f) => Mml.compose`You can see ${f}.`);
    if (rest.length > 0) {
      const anyAfar = items.some((i) => onHorizon.has(i.stuffId));
      const lead = featured.length > 0
        ? 'You can also make out'
        : anyAfar ? 'You can make out' : 'You see';
      lines.push(Mml.compose`${lead} ${Mml.list(rest, { style: 'inline' })}.`);
    }
    // ⭐ ONE scene, like a room's body: the list is one reading.
    const body = lines.reduce((acc, line) => Mml.compose`${acc}\n${line}`);
    MessageApi.scene(viewer).topic('sense.survey').toSelf(body).send();
  }


  /**
   * ⭐ The ledger of what `viewer` may see `target` hold — grouped, and
   * complete (no summary). `null` when `target` is a container that is
   * shut. Shared by `query --ledger` and `look in <thing>` — a public
   * static for exactly those two callers, neither of them author surface
   * (`lint:lib-statics`' caller audit; it moved here with W10h).
   *
   * @internal
   */
  public static ledger(viewer: Stuff, target: Stuff, only?: ReadonlySet<string>, weight = false): Mml | null {
    const all = PerceptionApi.visibleContentsOf(viewer, target);
    if (all.shut) return null;
    // `query --ledger <a narrowed set>` groups just what the query named.
    const keep = (xs: Stuff[]): Stuff[] => (only ? xs.filter((x) => only.has(x.stuffId)) : xs);
    const v = { worn: keep(all.worn), held: keep(all.held), carried: keep(all.carried) };
    const list = (xs: Stuff[]): Mml => QueryController.listOf(viewer, xs, weight);
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
      // ⭐ A body is not a box: what it has that is neither worn nor held,
      // it is CARRYING (the browser walk read "In it: an aether implant").
      const carrying = target.isAgent() ? 'Carrying' : 'In it';
      if (v.carried.length) lines.push(Mml.compose`── ${carrying}: ${list(v.carried)}.`);
      if (lines.length === 1) lines.push(Mml.compose`── Nothing you can see.`);
    }
    const body = lines.reduce((acc, line) => Mml.compose`${acc}\n${line}`);
    return Mml.compose`\n${body}\n`;
  }

  /**
   * ⭐ What is directly on a body, sorted by how it is carried (D28) — the
   * bucketing `--ledger` shows of yourself, over the body's own `tierOf`. Each list
   * is raw: the caller perceives it. ⭐ Only what the query named
   * (`only`): a thing directly on the body when it is in the set or holds
   * something that is (`via`); a thing in a garment's pocket when the
   * garment or the thing is.
   */
  private static tiersOf(carrier: Stuff & Carrying, only: ReadonlySet<string>, via: ReadonlySet<string>): CarriedTiers {
    const self = carrier as unknown as Stuff & Slotted & Container;
    const slotOf = new Map<string, string[]>();
    for (const [slot, occ] of self.getAllOccupants()) {
      for (const o of occ) slotOf.set(o.stuffId, [...(slotOf.get(o.stuffId) ?? []), slot]);
    }
    const out: CarriedTiers = { held: [], regions: [], worn: [], ready: [], packed: [], loose: [] };
    const regions = new Map<string, CarriedTiers['regions'][number]>();
    // ⭐ A holder has an inside of its own (W9): a satchel, a pack — never a
    // coat, whose insides are its pockets (listed by region below).
    const isHolder = (x: Stuff): x is Stuff & Container =>
      MixinApi.isContainer(x) && !x.isAgent() && x.hasInterior();
    const group = (host: Stuff & Placing, region: string, x: Stuff): void => {
      const key = `${host.stuffId}\u0000${region}`;
      let g = regions.get(key);
      if (g === undefined) {
        g = { host, region, items: [] };
        regions.set(key, g);
        out.regions.push(g);
      }
      g.items.push(x);
      if (isHolder(x)) out.ready.push(x);
    };
    // What is directly on the body, as its owner perceives it (rule 1: your
    // own things, always) — the view's read, not a search of the body.
    const own = PerceptionApi.visibleContentsOf(carrier, carrier);
    for (const x of [...new Set([...own.held, ...own.worn, ...own.carried])]) {
      const named = only.has(x.stuffId);
      // ⭐ What is in the pockets of what it wears — the garment's own
      // contents, in a region of it (W9) — is ready, by its pocket.
      // (The host's own read — `getPlaced` — kept to what is IN it.)
      if (slotOf.has(x.stuffId) && MixinApi.isContainer(x) && !x.isAgent() && MixinApi.isPlacing(x)) {
        for (const c of x.getPlaced()) {
          const inPocket = c.getPlacement();
          if (c.getContainer() === x && inPocket !== null && (named || only.has(c.stuffId))) group(x, inPocket.name, c);
        }
      }
      if (!named && !via.has(x.stuffId)) continue;
      const tier = carrier.tierOf(x);
      const pair = MixinApi.isContainable(x) ? x.getPlacement() : null;
      if (tier === 'hand') {
        out.held.push(x);
      } else if (pair !== null && pair.host.stuffId !== self.stuffId && MixinApi.isPlacing(pair.host)) {
        group(pair.host, pair.name, x);
      } else if (slotOf.has(x.stuffId)) {
        if (!isHolder(x)) out.worn.push(x);
        else if (tier === 'packed' || (slotOf.get(x.stuffId) ?? []).includes('back')) out.packed.push(x);
        else out.ready.push(x);
      } else {
        out.loose.push(x);
      }
    }
    return out;
  }

  /** ⭐ What a pack holds, told shut (D28): `5 things, 3.2 kg`, or `empty`. */
  private static tallyWords(things: readonly Stuff[]): string {
    if (things.length === 0) return 'empty';
    const kg = things.reduce((sum, x) => sum + (MixinApi.isTangible(x) ? x.getMass().rawValue() : 0), 0);
    const n = things.length === 1 ? 'one thing' : `${things.length} things`;
    // Two significant figures — a reading off a list, not a weighing.
    return `${n}, ${Number(kg.toPrecision(2))} kg`;
  }

  /**
   * ⭐ Yourself by tier (D28) — the body reports each thing's tier
   * (`Carrying.tierOf`); this view buckets what the query named. A pack is
   * told as a tally unless the set names something in it (`me:I`,
   * `rucksack:i`); a holder the set did not name itself lists only what it
   * did name in it.
   */
  private static tiered(
    viewer: Stuff & Carrying,
    only: ReadonlySet<string>,
    via: ReadonlySet<string>,
    weight: boolean,
  ): Mml {
    const carrier = viewer;

    // What is directly on the body, by how it is carried — each list perceived.
    const tiers = QueryController.tiersOf(carrier, only, via);
    const seen = (xs: readonly Stuff[]): Stuff[] => PerceptionApi.perceived(viewer, xs);
    const held = seen(tiers.held);
    const worn = seen(tiers.worn);
    const readyContainers = seen(tiers.ready);
    const packedContainers = seen(tiers.packed);
    const loose = seen(tiers.loose);
    const regions = tiers.regions
      .map((g) => ({ ...g, items: seen(g.items) }))
      .filter((g) => g.items.length > 0);

    const list = (xs: Stuff[]): Mml => QueryController.listOf(viewer, xs, weight);
    const contentsOf = (c: Stuff): Stuff[] => {
      const v = PerceptionApi.visibleContentsOf(viewer, c);
      const all = [...v.held, ...v.worn, ...v.carried];
      return only.has(c.stuffId) ? all : all.filter((x) => only.has(x.stuffId));
    };
    const lines: Mml[] = [];

    if (held.length > 0) lines.push(Mml.compose`In hand: ${list(held)}.`);

    const ready: Mml[] = [];
    for (const g of regions) {
      const member = g.host.placementOf(g.region);
      const named = g.host.namedRegions().includes(g.region);
      const where = named
        ? Mml.compose`In your ${Mml.text(g.host.presentationPhrase().bare())}'s ${g.region}`
        : member.getHangs()
          ? Mml.compose`Hanging from your ${Mml.text(g.host.presentationPhrase().bare())}`
          : Mml.compose`${member.getHeading() || 'With'} your ${Mml.text(g.host.presentationPhrase().bare())}`;
      // ⭐ The room along a length, in words — never a number (D27).
      ready.push(
        member.getHangs()
          ? Mml.compose`  ${where}: ${list(g.items)}. Room left: ${g.host.roomFor(g.region)}.`
          : Mml.compose`  ${where}: ${list(g.items)}.`,
      );
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

    if (worn.length > 0) lines.push(Mml.compose`Worn: ${list(worn)}.`);

    if (packedContainers.length > 0) {
      lines.push(Mml.compose`Packed:`);
      for (const c of packedContainers) {
        const v = PerceptionApi.visibleContentsOf(viewer, c);
        const all = [...v.held, ...v.worn, ...v.carried];
        // Opened when the set names something in it; told shut otherwise.
        lines.push(
          all.some((x) => only.has(x.stuffId))
            ? Mml.compose`  ${Mml.thing(c)}: ${list(contentsOf(c))}.`
            : Mml.compose`  ${Mml.thing(c)}: ${QueryController.tallyWords(all)}.`,
        );
      }
    }

    if (lines.length === 0) return Mml.compose`\nNothing you can see.\n`;
    if (MixinApi.isLoadBearing(viewer)) {
      const burden = viewer.burdenWords();
      if (burden !== null) lines.push(Mml.compose`${burden}`);
    }
    const out = lines.reduce((acc, line) => Mml.compose`${acc}\n${line}`);
    return Mml.compose`\n${out}\n`;
  }

  /**
   * One line per region of `host` with something the query named perceived
   * in it, plus a hanging length's room.
   */
  private static regionLines(viewer: Stuff, host: Stuff & Placing, weight: boolean, only: ReadonlySet<string>): Mml[] {
    const lines: Mml[] = [];
    for (const region of host.getPlacements()) {
      const member = host.placementOf(region);
      const items = PerceptionApi.perceived(viewer, [...host.getPlaced(region)].filter((x) => only.has(x.stuffId)));
      const named = host.namedRegions().includes(region);
      // ⭐ How a chamber differs (D-W10-6): *(buttoned)*, *(inside)*, *(shut)*.
      const e = named ? host.getPlacementEntry(region) : null;
      const words = [
        ...(e?.closes === true ? ['buttoned'] : []),
        ...(e?.covered === true ? ['inside'] : []),
        ...(e?.closes === true && !host.isRegionOpen(region) ? ['shut'] : []),
      ];
      const heading = named
        ? `${region.charAt(0).toUpperCase() + region.slice(1)}${words.length > 0 ? ` (${words.join(', ')})` : ''}`
        : member.getHeading() || 'With it';
      if (items.length > 0) lines.push(Mml.compose`── ${heading}: ${QueryController.listOf(viewer, items, weight)}.`);
      else if (named) lines.push(Mml.compose`── ${heading}: empty.`);
      // ⭐ The room along a length, in words — never a number (D27).
      if (member.getHangs()) lines.push(Mml.compose`── Room left: ${host.roomFor(region)}.`);
    }
    return lines;
  }

  /** A list of things, each marked `[builder]` when seen only through the lens, with its weight when asked. */
  private static listOf(viewer: Stuff, xs: Stuff[], weight: boolean): Mml {
    return Mml.list(
      xs.map((x) => {
        const named = PerceptionApi.perceivedHow(viewer, x) === 'builder'
          ? Mml.compose`${Mml.thing(x)} [builder]`
          : Mml.thing(x);
        if (!weight) return named;
        return Mml.compose`${named} (${QueryController.massAndBulkWords(x)})`;
      }),
    );
  }

  /**
   * ⭐ A thing's mass and its bulk as a person reads them off a list —
   * `0.4 kg, 0.2 L` (`query --weight`, size and carrying D28). The bulk
   * is left off when it is not known; a thing made of nothing is
   * `weightless`. Words live in the controller (W8, W10f): the model
   * answers the numbers.
   */
  private static massAndBulkWords(x: Stuff): string {
    if (!MixinApi.isTangible(x)) return 'weightless';
    // Two significant figures — a reading off a list, not a weighing.
    const mass = `${Number(x.getMass().rawValue().toPrecision(2))} kg`;
    const m3 = MixinApi.isShaped(x) ? x.getVolumeM3() : null;
    if (m3 === null) return mass;
    const litres = Quantity.of(m3, 'm³').to('L').rawValue();
    return `${mass}, ${Number(litres.toPrecision(2))} L`;
  }
}
