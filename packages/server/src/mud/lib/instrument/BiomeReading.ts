/**
 * BiomeReading — the shared body of the four atmospheric channels
 * (`temperature`, `pressure`, `humidity`, `gravity`) and the medium
 * (`atmosphere`).
 *
 * All five are the same act: resolve the actor's scope, ask
 * {@link BiomeApi} for the value that holds there, render it with its
 * tag. They differed only in which resolve to call, which word to lead
 * with and which MML quantity channel to render on — which is a table,
 * not four controllers.
 *
 * ⚠ Substrate, never instanced: each channel's concrete class is a row
 * under `/platform/idea/reading/`. It lives in `lib/` for exactly that
 * reason, and `lint:instanceable` holds the line.
 */

import Reading from './Reading';
import { MixinApi } from '../../api/mixin';
import { Mml } from '../../api/mml';
import type { CommandContext } from '../../api/command';
import type { Stuff } from '../stuff/Stuff';
import type { Container } from '../spatial/Container';
import type { Tooled } from '../craft/Tooled';
import type { CompetenceBandName } from '../advancement/CompetenceBand';
import type { Quantity, Unit } from '../quantity';
import type { MeasureChannel } from '../perception/MeasureChannel';

export default abstract class BiomeReading extends Reading {
  /** The word the readout leads with — `Temperature`, `Pressure`. */
  protected abstract label(): string;

  /** The MML quantity channel the figure renders on. */
  protected abstract mmlChannel(): MeasureChannel;

  /** The quantity tag family, when the channel names one. */
  protected tagFamily(): string | undefined {
    return undefined;
  }

  /** Ask the biome chain for this channel's value at `scope`. */
  protected abstract resolve(
    scope: Stuff & Container,
    detail: string | undefined,
  ): Promise<Quantity<Unit>>;

  protected override async measure(
    context: CommandContext,
    target: Stuff | null,
    _instrument: Stuff & Tooled,
    band: CompetenceBandName,
    param: string,
  ): Promise<void> {
    const scope = target && MixinApi.isContainer(target) ? target : null;
    if (!scope) {
      this.decline(
        context,
        Mml.compose`You aren't anywhere to measure.`,
        'no-scope',
      );
      return;
    }
    const value = await this.resolve(
      scope as Stuff & Container,
      param === '' ? undefined : param,
    );
    // ⭐⭐ The figure is the world's and is the SAME for everybody; what
    // the band decides is the bracket around it. The tag is unbracketed
    // on purpose — *hot* is a judgement about the reading, not a second
    // measurement, and hedging a word would be hedging twice.
    const actor = this.actorOf(context);
    const seed = this.seedFor(actor, scope, param);
    // ⚠⚠ The tag comes off the OBSERVATION, never off the truth. The
    // drive printed `153.01 K ± 147.5 K (warm)` — the figure was what
    // the reader got and the word was what the world knew, and one
    // sentence contradicted itself. A reader who misread the dial calls
    // the room what the dial said.
    const seen = this.observed(value, band, seed);
    const figure = this.bracketFor(seen, value, this.mmlChannel());
    const tags = this.tagFamily();
    this.report(
      context,
      Mml.compose`${this.label()}: ${figure} (${seen.tag(tags)})\n`,
    );
  }

  public override async truth(target: Stuff | null): Promise<number | null> {
    if (!target || !MixinApi.isContainer(target)) return null;
    const value = await this.resolve(target as Stuff & Container, undefined);
    return value.rawValue();
  }
}
