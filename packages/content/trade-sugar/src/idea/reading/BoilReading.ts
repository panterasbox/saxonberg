/**
 * BoilReading — the thread test (sugar D4). `analyze boil <pan>` is a drop
 * of the liquor pulled between finger and thumb; `measure boil <pan>` is
 * the same with a thermometer in it, which adds the bracketed temperature.
 *
 * ⭐ Competence resolves DETAIL, never access: anybody can feel whether a
 * drop is thin or thick, a boiler who knows the trade names the stage —
 * *it threads · a soft ball · a hard ball · it cracks* — and only the
 * thermometer gives the number. The stage is read off the liquor's own
 * concentration and material (the arrows the kernel's boil walks), so the
 * words and the pan cannot disagree.
 */

import Reading from '@saxonberg/server/mud/lib/instrument/Reading';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Tooled } from '@saxonberg/server/mud/lib/craft/Tooled';
import {
  CompetenceBand,
  type CompetenceBandName,
} from '@saxonberg/server/mud/lib/advancement/CompetenceBand';
import type { CommandContext } from '@saxonberg/server/mud/api/command';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { Mml } from '@saxonberg/server/mud/api/mml';
import { Quantity, type Unit } from '@saxonberg/server/mud/lib/quantity';

const REFINING = 'sugar-refining';

/** The drop between finger and thumb, as a boiler names it. */
function stageOf(tags: (t: string) => boolean, w: number): string {
  if (tags('burnt')) return 'it is burnt — black and bitter, past saving';
  if (tags('caramel')) return 'it has gone to caramel — it will not grain now';
  if (tags('blackstrap')) return 'it draws out and will not crack — this will never grain';
  if (w >= 0.9) return 'it cracks — the strike; take it off and pour';
  if (w >= 0.86) return 'a hard ball — nearly at the strike';
  if (w >= 0.8) return 'a soft ball — keep it boiling';
  if (w >= 0.68) return 'it draws a thread — syrup now';
  return 'thin — it runs straight off your fingers';
}

/** What an untrained hand can say about the same drop. */
function feelOf(tags: (t: string) => boolean, w: number): string {
  if (tags('burnt')) return 'it is burnt';
  if (w >= 0.86 || tags('caramel') || tags('blackstrap')) return 'thick and sticky';
  if (w >= 0.68) return 'syrupy';
  return 'thin and watery';
}

export default class BoilReading extends Reading {
  protected override async analyze(
    context: CommandContext,
    target: Stuff | null,
    band: CompetenceBandName,
    _handTool: (Stuff & Tooled) | null,
    _param: string,
  ): Promise<void> {
    const drop = this.drop(context, target);
    if (!drop) return;
    const words = CompetenceBand.atOrAbove(band, 'competent')
      ? stageOf(drop.tags, drop.w)
      : feelOf(drop.tags, drop.w);
    this.report(
      context,
      Mml.compose`You pull a drop of ${Mml.thing(drop.pan)} between finger and thumb: ${words}.`,
    );
    await this.credit(context);
  }

  protected override async measure(
    context: CommandContext,
    target: Stuff | null,
    _instrument: Stuff & Tooled,
    band: CompetenceBandName,
    param: string,
  ): Promise<void> {
    const drop = this.drop(context, target);
    if (!drop) return;
    const pan = drop.pan;
    const temp = MixinApi.isThermal(pan)
      ? (pan.getTemperature() as unknown as Quantity<Unit>)
      : (Quantity.of(0, 'K') as unknown as Quantity<Unit>);
    const seed = this.seedFor(this.actorOf(context), pan, param);
    const figure = this.bracketed(temp, band, seed, 'thermal');
    this.report(
      context,
      Mml.compose`The thermometer in ${Mml.thing(pan)} reads ${figure}: ${stageOf(drop.tags, drop.w)}.`,
    );
    await this.credit(context);
  }

  private drop(
    context: CommandContext,
    target: Stuff | null,
  ): { pan: Stuff; w: number; tags: (t: string) => boolean } | null {
    if (target === null || !MixinApi.isBulkable(target) || target.isBulkEmpty('interior')) {
      this.decline(context, Mml.compose`There is nothing boiling there to test.`, 'nothing-boiling');
      return null;
    }
    const mat = target.getBulkMaterial('interior');
    const solids =
      target.getBulkPayload('interior')?.dissolvedSolidsKgPerL ?? mat?.getSolidsKgPerL() ?? 0;
    if (!mat || !(solids > 0)) {
      this.decline(
        context,
        Mml.compose`${Mml.thing(target)} holds nothing that boils down to sugar.`,
        'not-a-liquor',
      );
      return null;
    }
    return { pan: target, w: mat.solidsMassFraction(solids), tags: (t) => mat.hasTag(t) };
  }

  private async credit(context: CommandContext): Promise<void> {
    const actor = this.actorOf(context);
    if (MixinApi.isAdvancing(actor)) {
      await actor.creditDeed({ discipline: REFINING, difficulty: 'easy', outcome: 'success' });
    }
  }
}
