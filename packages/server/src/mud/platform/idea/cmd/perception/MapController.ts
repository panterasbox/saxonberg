/**
 * MapController — the `map` verb: what one player knows of the world.
 *
 * ⭐⭐ **It reads only the actor's own home branch.** `AC14` is
 * structural rather than policed: this controller's single read is
 * `NavigationApi.readMap(viewerKey, prefix)`, which resolves to
 * `/home/<key>/map/…` and nowhere else. Nothing here touches
 * `location_graph`, so there is no path by which a player could be
 * shown the shape of a place they have not earned.
 *
 * ⭐ **The disagreement is the feature.** Where two claims about the
 * same `(place, dir)` differ, BOTH render with their dates. A merge
 * would pick a winner and hide that it did, which turns a knowledge
 * model back into a truth model.
 *
 * ⚠ Renders MML to self. No card: the inspection card is laid out by
 * `StuffKind` and a map is not a Stuff, and inventing a `CardId` for it
 * is the renderer build's business (`map-slate`), not this one's.
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import { MessageApi } from '../../../../api/message';
import { Mml } from '../../../../api/mml';
import { NavigationApi } from '../../../../api/navigation';
import { WorldClockApi } from '../../../../api/worldclock';
import type { MapClaim, MapDocument } from '../../../../lib/location/MapClaim';

const TOPIC = 'sense.survey';

interface MapModel extends CommandModel {
  locality?: string;
}

/** A place, with everything known about it. */
interface PlaceView {
  place: string;
  name: string;
  group: string;
  channels: Set<string>;
  edges: MapClaim[];
  lastSeen: number;
}

export default class MapController extends CommandController<MapModel> {
  async execute(model: MapModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const viewerKey = giver.getIdentityPath() ?? '';
    if (!viewerKey) {
      return this.declineWith(context, 'You have no map.', 'no-identity');
    }
    const asked = (model.locality ?? '').trim();
    const docs = await NavigationApi.readMap(
      viewerKey,
      MapController.normalize(asked),
    );

    if (asked.length === 0) return this.renderIndex(context, docs);
    if (docs.length === 0) {
      // ⭐ "You have no map of X" rather than an empty map of X: an
      // empty rendering would read as *there is nothing there*, which
      // is a claim about the world. This is a claim about the player.
      return this.declineWith(
        context,
        `You have no map of ${asked}.`,
        'no-map',
      );
    }
    return this.renderLocality(context, asked, docs);
  }

  /** `terminus/city` → `terminus/city`; `Hinkley Hills` → `hinkley-hills`. */
  private static normalize(asked: string): string {
    return asked
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/^\/+|\/+$/g, '');
  }

  /** The localities this player holds a map of. */
  private renderIndex(context: CommandContext, docs: MapDocument[]): void {
    const giver = context.commandGiver;
    if (docs.length === 0) {
      return this.declineWith(
        context,
        'You have no maps yet. Go somewhere and look around.',
        'no-maps',
      );
    }
    const lines = ['You have a map of:'];
    for (const doc of [...docs].sort((a, b) =>
      a.locality.localeCompare(b.locality),
    )) {
      const places = new Set(
        doc.claims.filter((c) => c.kind === 'place').map((c) => c.place),
      ).size;
      lines.push(
        `  ${doc.locality} — ${places} place${places === 1 ? '' : 's'}`,
      );
    }
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(Mml.fromMarkup(`\n${lines.join('\n')}\n`))
      .send();
  }

  /** One locality: the places, grouped, with their ways out. */
  private renderLocality(
    context: CommandContext,
    asked: string,
    docs: MapDocument[],
  ): void {
    const giver = context.commandGiver;
    const places = new Map<string, PlaceView>();
    for (const doc of docs) {
      for (const claim of doc.claims) {
        const view = places.get(claim.place) ?? {
          place: claim.place,
          name: '',
          group: '',
          channels: new Set<string>(),
          edges: [],
          lastSeen: 0,
        };
        if (claim.kind === 'place') {
          if (claim.name) view.name = claim.name;
          if (claim.group) view.group = claim.group;
          view.channels.add(claim.channel);
          view.lastSeen = Math.max(view.lastSeen, claim.lastSeen);
        } else {
          view.edges.push(claim);
        }
        places.set(claim.place, view);
      }
    }

    const lines = [`Your map of ${asked}:`];
    // ⭐ Grouped by the address the CONTENT declares, where it declares
    // one — which is what makes Duncan Hall's four rooms read as Duncan
    // Hall rather than as four unrelated places. Ungrouped places come
    // last, under no heading, because inventing one would be the map
    // asserting a building that nobody authored.
    const byGroup = new Map<string, PlaceView[]>();
    for (const view of places.values()) {
      const list = byGroup.get(view.group) ?? [];
      list.push(view);
      byGroup.set(view.group, list);
    }
    const groups = [...byGroup.keys()].sort((a, b) =>
      a === '' ? 1 : b === '' ? -1 : a.localeCompare(b),
    );
    for (const group of groups) {
      if (group !== '') lines.push(`  ${group}:`);
      const indent = group === '' ? '  ' : '    ';
      for (const view of byGroup.get(group)!.sort((a, b) =>
        (a.name || a.place).localeCompare(b.name || b.place),
      )) {
        const how = view.channels.has('perception')
          ? view.channels.size > 1
            ? 'walked, also published'
            : 'walked'
          : [...view.channels].join(', ');
        lines.push(`${indent}${view.name || view.place} (${how})`);
        lines.push(...MapController.renderEdges(view, `${indent}  `));
      }
    }
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(Mml.fromMarkup(`\n${lines.join('\n')}\n`))
      .send();
  }

  /**
   * One place's ways out — and ⭐⭐ **both sides of any disagreement**.
   *
   * Claims are grouped by direction. Where a direction holds more than
   * one distinct claim, each renders with when it was recorded, so the
   * player can see that their knowledge conflicts rather than being
   * handed a winner somebody else picked.
   */
  private static renderEdges(view: PlaceView, indent: string): string[] {
    const byDir = new Map<string, MapClaim[]>();
    for (const edge of view.edges) {
      const dir = edge.dir ?? '?';
      const list = byDir.get(dir) ?? [];
      list.push(edge);
      byDir.set(dir, list);
    }
    const out: string[] = [];
    for (const dir of [...byDir.keys()].sort()) {
      const claims = byDir
        .get(dir)!
        .sort((a, b) => a.lastSeen - b.lastSeen);
      const distinct = new Map<string, MapClaim>();
      for (const claim of claims) {
        distinct.set(`${claim.to ?? ''}|${claim.toLabel ?? ''}`, claim);
      }
      if (distinct.size === 1) {
        const only = [...distinct.values()][0]!;
        // ⭐⭐ **The other half of the disagreement, and the common
        // one.** When an exit is WALLED UP it records nothing at all —
        // there is no second claim, because the player saw no east exit
        // to write down. So the comparison is against the PLACE's own
        // latest observation: the place claim is the *I looked here at
        // T* record, and an edge older than the latest look is an edge
        // that was NOT there last time somebody looked.
        //
        // That is why nothing has to be merged or deleted to make a map
        // honest: the stale claim stays, and the staleness is derivable
        // from two timestamps the document already carries.
        const stale = view.lastSeen > 0 && only.lastSeen < view.lastSeen;
        out.push(
          stale
            ? `${indent}${dir} → ${MapController.farName(only)} ` +
                `(recorded ${MapController.when(only.lastSeen)}; not seen ` +
                `when you last looked)`
            : `${indent}${dir} → ${MapController.farName(only)}`,
        );
        continue;
      }
      // ⚠ The disagreement, rendered. Nothing is merged and nothing is
      // dropped; the dates are what let the player judge.
      for (const claim of distinct.values()) {
        out.push(
          `${indent}${dir} → ${MapController.farName(claim)} ` +
            `(recorded ${MapController.when(claim.lastSeen)})`,
        );
      }
    }
    return out;
  }

  /** What the far side of an edge is called, from what is known. */
  private static farName(claim: MapClaim): string {
    if (claim.toLabel) {
      const leaf = claim.toLabel.split('/').filter(Boolean).pop() ?? '';
      return leaf.replace(/[-_]/g, ' ') || 'somewhere';
    }
    if (claim.to) {
      const leaf = claim.to.split('/').filter(Boolean).pop() ?? '';
      return leaf.replace(/[-_]/g, ' ') || 'somewhere';
    }
    // ⭐ A `DeferredDestinationExit` is honestly this: a way through,
    // onto a space nobody has decided yet.
    return 'a space through this door';
  }

  /** A game-second as something a player can read. */
  private static when(gameSecond: number): string {
    try {
      const now = Math.floor(WorldClockApi.getNow().value);
      const ago = Math.max(0, now - gameSecond);
      const hours = Math.floor(ago / 3600);
      if (hours < 1) return 'just now';
      if (hours < 24) return `${hours}h ago`;
      return `${Math.floor(hours / 24)}d ago`;
    } catch {
      return 'at some point';
    }
  }

  private declineWith(
    context: CommandContext,
    detail: string,
    reason: string,
  ): void {
    MessageApi.scene(context.commandGiver)
      .topic(TOPIC)
      .toSelf(Mml.fromMarkup(`\n${detail}\n`))
      .send();
    context.note({ kind: 'controller-rejected', reason, detail });
  }
}
