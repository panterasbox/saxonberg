/**
 * QueryController — `query <set>` (alias `scan`): **list whatever a query
 * names** (maritime revision 2′).
 *
 * ⭐ Three verbs, one question each. `look` answers *what is this ONE
 * thing like?*; `inventory` *what does this hold?*; `query` *what does
 * this name?* — any set the query language can say: a seed (`horizon`,
 * `peers`), the player's own how-many (`all brass`), a holder's things
 * (`bob:i`, which already yields only what the viewer may see — the
 * visibility rule is the query language's). Nothing is asked: a set is
 * not an ambiguity.
 *
 * The list IS the content. Each entry says how it stands to you; a thing
 * on your horizon says where it lies (*to the north-east, some 3 miles
 * off*), FEATURED things (a landmark, or what this room's author
 * features) come first, and when the set is what is in view the
 * passers-by at sea are told in words too (they have no object to be in
 * a set). ⭐ Options change the RENDERING only — `--ledger` groups a
 * holder's things as worn / held / carried; narrowing is the query's.
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import { MqlApi, type MqlManyResult } from '../../../../api/mql';
import type { HorizonView } from '../../../../api/perception';
import { PerceptionApi } from '../../../../api/perception';
import { MessageApi } from '../../../../api/message';
import { MixinApi } from '../../../../api/mixin';
import { Mml } from '../../../../api/mml';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import Place from '../../../../lib/stuff/Place';
import Structure from '../../../../lib/spatial/Structure';
import InventoryController from '../inventory/InventoryController';

interface QueryModel extends CommandModel {
  set?: MqlManyResult;
  ledger?: boolean;
}

export default class QueryController extends CommandController<QueryModel> {
  execute(model: QueryModel, context: CommandContext): void {
    const raw = model.set?.raw ?? '';
    const items = MqlApi.extractStuffs(model.set) ?? [];
    if (items.length === 0) return this.nothing(raw, context);
    // ⭐ A FEATURE of a place matched (`query all lamps` on the bank): the
    // query names the feature, not the place that has it — say the
    // feature, where it is (found in the maritime browser walk: it read
    // "You see the bank at the confluence").
    const vias = model.set?.vias ?? (items.length === 1 ? [model.set?.via] : []);
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
    if (model.ledger === true) return this.ledger(items, context);
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
        const holder = MqlApi.resolveOne(holderQuery, {
          commandGiver: viewer,
          scope: '',
        }).stuff;
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

  /** `--ledger`: the set grouped under each holder it came from. */
  private ledger(items: readonly Stuff[], context: CommandContext): void {
    const viewer = context.commandGiver;
    const byHolder = new Map<Stuff, Set<string>>();
    const loose: Stuff[] = [];
    for (const item of items) {
      const holder = MixinApi.isContainable(item) ? item.getContainer() : null;
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
      const body = InventoryController.ledger(viewer, holder, ids);
      if (body) parts.push(body);
    }
    if (loose.length > 0) parts.push(Mml.compose`\n${Mml.list(loose.map((x) => Mml.thing(x)))}\n`);
    if (parts.length === 0) return this.list(items, [], context);
    const body = parts.reduce((acc, p) => Mml.compose`${acc}${p}`);
    MessageApi.scene(viewer).topic('sense.survey').toSelf(body).send();
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
    const where = (b: number | null, r: number | null): string =>
      b === null || r === null ? '' : `, ${PerceptionApi.glance(b, r)}`;
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
      const line = Mml.compose`${Mml.thing(item, { form: 'presence' })}${seen ? where(seen.bearingDeg, seen.rangeNm) : ''}`;
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
}
