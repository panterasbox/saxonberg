/**
 * WaterController — `water <plant> [with <source>]`.
 *
 * ⭐ Input and output (controller-liquidity W8): the GROUND decides —
 * what the act is aimed at, which carried vessel waters it, how much it
 * takes, and what comes of it (`Soil.amendPlanFor`; a plant named asks
 * its bed through `Growing.amendPlanFor`). This file binds what was named
 * — a hose stands for the tap it is coupled to — and words the answer.
 *
 * Two deliberate differences from `drink`:
 *
 *   1. **An explicit measure, never `{ kind: 'all' }`** — the amount is
 *      the plant's own moisture headroom, so a 2 L can does not vanish
 *      into a pot that had room for a teacup.
 *   2. **Naming either half of the assembly works.** A player will type
 *      `water the pot` as readily as `water the lily`, so a `PlantPot`
 *      target resolves to its occupant.
 *
 * ⭐ **A plant, a bed, a patch and a field** (field population D18). A
 * field crop is watered at its PATCH: on a divided field the act names
 * one (`water wheat at the top end`) or the GROUND refuses it, listing
 * the parts (`resolvePartFor` — the controller only sends the line). Ground
 * with nothing sown on it is watered itself. The reply says how many
 * litres went in, and on a big stretch of ground that a can barely wets,
 * says that too: the player learns what a can is worth on a field.
 *
 * The plant is its own persistence host, so the act captures it — this is
 * what makes a watering survive a restart under an event-driven capture
 * spine (a rolled-back checkpoint re-derives elapsed *time* from the clock
 * stamp, but it cannot re-derive an *intervention*).
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import type { MqlManyResult, MqlOneResult } from '../../../../api/mql';
import { MessageApi } from '../../../../api/message';
import { MixinApi } from '../../../../api/mixin';
import { Mml } from '../../../../api/mml';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import type { AmendDone, AmendRefusal } from '../../../../lib/husbandry/Soil';
import WaterHose from '../../../thing/WaterHose';
import { CraftingApi } from '../../../../api/crafting';

const TOPIC = 'act.deed';

type Composed = ReturnType<typeof Mml.compose>;

interface WaterModel extends CommandModel {
  target: MqlOneResult;
  /** `at <patch>` — which part of a divided field (D5). */
  part?: MqlOneResult;
  source?: MqlManyResult;
}

export default class WaterController extends CommandController<WaterModel> {
  async execute(model: WaterModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const named = model.target.stuff;

    if (!named) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`You don't see any '${model.target.raw}' here.`)
        .send();
      context.note({
        kind: 'empty-result',
        field: 'target',
        query: model.target.raw,
      });
      return;
    }
    const patchRaw = model.part?.raw ?? '';
    const patch = model.part?.stuff ?? null;
    if (!patch && patchRaw.trim() !== '') {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`You don't see any '${patchRaw}' here.`)
        .send();
      context.note({ kind: 'empty-result', field: 'patch', query: patchRaw });
      return;
    }
    const aimed = MixinApi.isGrowing(named) ? named : MixinApi.isSoil(named) ? named : null;
    if (aimed === null) {
      return WaterController.deny(context, Mml.compose`${Mml.thing(named)} isn't a plant.`, 'not-a-plant',
        `${named.getPresentation()} has no plant to water`);
    }

    const answer = await aimed.amendPlanFor({
      by: giver,
      amend: 'water',
      target: named,
      sources: await WaterController.sourcesFrom(model.source),
      // A NAMED vessel is taken as named, so "it is empty" can be said.
      named: model.source?.prep !== undefined,
      via: model.source?.via,
      part: patch && MixinApi.isSoil(patch) ? patch : null,
    });
    if (answer.ok === 'choose' || (answer.ok === false && answer.reason === 'not-a-part-here')) {
      // ⭐ The ground answered its parts (D8): refuse with the list.
      const line = this.partLine(answer);
      return WaterController.deny(context, Mml.fromMarkup(line), answer.reason, line);
    }
    if (!answer.ok) {
      const [prose, reason] = WaterController.refusalWords(answer);
      return WaterController.deny(context, prose, reason, reason);
    }
    await this.engagePlan(context, answer, {
      beginSelf: () => Mml.compose``,
      onRefused: (r) => WaterController.refusalWords(r)[0],
      onDone: (f) => {
        for (const note of f.notes) context.note(note);
        return WaterController.doneWords(f, giver);
      },
    });
  }

  /**
   * The vessels to water from, as the binder bound them. `water.yaml`
   * declares `source` with a `me:i` default, so bare `water` arrives with
   * every carried thing; the ground picks the first with water in it. ⭐ A
   * hose coupled to a tap stands for the tap (settled, so its water is
   * current); an uncoupled one stands for nothing.
   */
  protected static async sourcesFrom(bound: MqlManyResult | undefined): Promise<Stuff[]> {
    const out: Stuff[] = [];
    for (const item of bound?.stuff ?? []) {
      if (!(item instanceof WaterHose)) {
        out.push(item);
        continue;
      }
      const outlet = item.getOutlet();
      if (outlet === null) continue;
      await outlet.settleBulk('interior');
      out.push(outlet);
    }
    return out;
  }

  /** A refusal's words, and the note's reason. */
  protected static refusalWords(r: AmendRefusal): [Composed, string] {
    switch (r.reason) {
      case 'not-rooted':
        return [Mml.compose`${Mml.thing(r.facts.plant)} isn't rooted in anything that holds water.`, r.reason];
      case 'not-standing-at':
        return [Mml.compose`${Mml.thing(r.facts.plant)} does not stand at ${Mml.thing(r.facts.part)}.`, 'not-a-part-here'];
      case 'nothing-planted':
        return [Mml.compose`There's nothing planted in ${Mml.thing(r.facts.ground)}.`, r.reason];
      case 'not-cultivable':
        return [Mml.compose`${Mml.thing(r.facts.target)} isn't a plant.`, r.reason];
      case 'no-water-source':
      case 'no-compost-source':
        return [Mml.compose`You have nothing to water it with.`, 'no-water-source'];
      case 'source-empty':
        return [Mml.compose`${Mml.thing(r.facts.source)} is empty.`, r.reason];
      case 'already-wet':
        return [
          r.facts.plant
            ? Mml.compose`The soil around ${Mml.thing(r.facts.plant)} is already wet through.`
            : Mml.compose`The soil of ${Mml.thing(r.facts.ground)} is already wet through.`,
          r.reason,
        ];
      case 'nothing-poured':
      case 'nothing-spread':
        return [Mml.compose`Nothing comes out of ${Mml.thing(r.facts.source)}.`, 'nothing-poured'];
      case 'no-nutrient-reserve':
      case 'no-amendment-reserve':
      case 'already-fed':
        return [Mml.compose`The soil of ${Mml.thing(r.facts.ground)} is already wet through.`, r.reason];
      default: {
        const unworded: never = r;
        throw new Error(`WaterController: no words for ${String(unworded)}`);
      }
    }
  }

  /** What the watering came to. */
  protected static doneWords(f: AmendDone, giver: Stuff): { self: Composed; peers?: Composed } | null {
    if (f.kind === 'stood') {
      return { self: Mml.compose`The water stands on ${Mml.thing(f.on)} — the soil cannot take any more.` };
    }
    if (f.kind !== 'watered') return null;
    const { plant, ground, part } = f;
    const appearance = CraftingApi.blendAppearance(f.payload, f.material) || 'water';
    const litres = WaterController.litresPhrase(f.litres);
    const where = part ? Mml.compose` at ${Mml.thing(part)}` : Mml.compose``;
    const tipped = plant
      ? Mml.compose`You tip ${litres} of ${appearance} into the soil around ${Mml.thing(plant)}${where}.`
      : part
        ? Mml.compose`You tip ${litres} of ${appearance} into the soil at ${Mml.thing(part)}.`
        : Mml.compose`You tip ${litres} of ${appearance} into the soil of ${Mml.thing(ground)}.`;
    const drinks = f.standing
      ? ' The soil cannot take it all; the rest stands on top, with nowhere to go.'
      : f.drank
        ? ' It drinks it in.'
        : '';
    const barely = f.barelyM2 !== null ? ` On ${WaterController.areaPhrase(f.barelyM2)} it barely shows.` : '';
    return {
      self: Mml.compose`${tipped}${drinks}${barely}`,
      // ⭐ A bystander sees WHERE the water went (field population).
      peers: Mml.compose`${Mml.actor(giver)} waters ${Mml.thing(plant ?? ground)}${plant ? where : Mml.compose``}.`,
    };
  }

  /** Litres in words a reader takes in at a glance: `2 L`, `0.5 L`, `12 L`. */
  protected static litresPhrase(litres: number): string {
    const n = litres >= 10 ? Math.round(litres) : Math.round(litres * 10) / 10;
    // Something was poured (the transfer moved it): never "0 L".
    if (n === 0) return 'less than 0.1 L';
    return `${n.toLocaleString('en-US')} L`;
  }

  /** An area in square meters, as a reader would say it. */
  protected static areaPhrase(areaM2: number): string {
    const n = Math.round(areaM2);
    return n === 1 ? 'a square meter' : `${n.toLocaleString('en-US')} square meters`;
  }

  /** Say no, and record why. */
  protected static deny(context: CommandContext, prose: Composed, reason: string, detail: string): void {
    MessageApi.scene(context.commandGiver).topic(TOPIC).toSelf(prose).send();
    context.note({ kind: 'controller-rejected', reason, detail });
  }
}
