/**
 * AromaReading — the smell channel on the reading ladder.
 *
 * ⭐ The eye rung IS the nose, read deliberately: everything you can separate,
 * in words, at the depth your training reaches. The instrument rung reads the
 * same quantity as a figure: the gas analyzer answers the same command with
 * odor units and an honest bracket, which is the channel's whole lens 5 claim.
 * A nose never gives a number and an instrument never needs one.
 *
 * ⚠ The discipline is empty on purpose. A nose bands per WORD (an aroma row's
 * own discipline, or the maker's), so the channel's band would mean nothing on
 * the eye rung; on the instrument rung the bracket is the analyzer's.
 */

import Reading from '../../../lib/instrument/Reading';
import { Mml } from '../../../api/mml';
import { MixinApi } from '../../../api/mixin';
import { PerceptionApi } from '../../../api/perception';
import { Quantity } from '../../../lib/quantity';
import Aroma from '../Aroma';
import type { CommandContext } from '../../../api/command';
import type { Stuff } from '../../../lib/stuff/Stuff';
import type { Container } from '../../../lib/spatial/Container';
import type { Tooled } from '../../../lib/craft/Tooled';
import type { CompetenceBandName } from '../../../lib/advancement/CompetenceBand';
import { Smell } from '../../../lib/perception/Smell';
import type { SmellModality } from '../modalities/SmellModality';

export default class AromaReading extends Reading {
  protected override async analyze(
    context: CommandContext,
    target: Stuff | null,
    _band: CompetenceBandName,
    _handTool: (Stuff & Tooled) | null,
    _param: string,
  ): Promise<void> {
    const actor = this.actorOf(context);
    const scent = MixinApi.isOlfactory(actor)
      ? actor.nose(await this.signalOf(target), {
          deliberate: true,
          close: this.smellsAsAThing(target),
        })
      : null;
    if (!scent || scent.isEmpty()) {
      this.report(context, Mml.compose`You can't smell anything you could name.\n`);
      return;
    }
    const lines = scent.phrases().map((p, i) => {
      const source = scent.notes[i]?.sourceName;
      return source ? `  ${p}, from ${source}` : `  ${p}`;
    });
    this.report(context, Mml.compose`You pick out:\n${lines.join('\n')}\n`);
  }

  protected override async measure(
    context: CommandContext,
    target: Stuff | null,
    _instrument: Stuff & Tooled,
    band: CompetenceBandName,
    param: string,
  ): Promise<void> {
    const actor = this.actorOf(context);
    const signal = await this.signalOf(target);
    if (signal.isEmpty()) {
      this.report(context, Mml.compose`It finds nothing it can name.\n`);
      return;
    }
    const seed = this.seedFor(actor, target, param);
    let body = Mml.compose``;
    for (const [i, n] of signal.notes.entries()) {
      const figure = this.bracketed(Quantity.of(n.ou, 'OU'), band, seed + i);
      body = Mml.compose`${body}  ${Aroma.phraseOf(n.word)}: ${figure}\n`;
    }
    this.report(context, body);
  }

  /** The air at a place, or a thing with the reader's nose to it. */
  private async signalOf(target: Stuff | null): Promise<Smell> {
    const modality = PerceptionApi.modalityByName('smell') as SmellModality;
    const read = (): Smell | null =>
      target && this.smellsAsAThing(target)
        ? modality.emissionOf(target, { close: true })
        : target
          ? modality.signalAt(target as Stuff & Container)
          : null;
    const first = read();
    for (const note of first?.notes ?? []) Aroma.resolve(note.word);
    await Aroma.settling();
    return read() ?? Smell.ZERO;
  }

  private smellsAsAThing(target: Stuff | null): boolean {
    return target !== null && !MixinApi.isExitable(target);
  }
}
