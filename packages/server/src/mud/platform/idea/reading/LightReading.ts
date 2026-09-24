/**
 * LightReading — how much light there is, and where it is coming from.
 *
 * ⭐ The channel that shows the ladder's whole shape in one row. The eye
 * rung says what the light is GOOD FOR (`analyze light` — the
 * per-source working); the photometer says how much of it there is in
 * lux (`measure light`). Same fact, two resolutions, and neither is a
 * permission.
 */

import Reading from '../../../lib/instrument/Reading';
import { MixinApi } from '../../../api/mixin';
import { MessageApi } from '../../../api/message';
import { PerceptionApi } from '../../../api/perception';
import { StuffApi } from '../../../api/stuff';
import { Light } from '../../../lib/perception/Light';
import { Mml } from '../../../api/mml';
import { CompetenceBand } from '../../../lib/advancement/CompetenceBand';
import type { CommandContext } from '../../../api/command';
import type { Stuff } from '../../../lib/stuff/Stuff';
import type { Container } from '../../../lib/spatial/Container';
import type { Tooled } from '../../../lib/craft/Tooled';
import type { CompetenceBandName } from '../../../lib/advancement/CompetenceBand';

export default class LightReading extends Reading {
  protected override async measure(
    context: CommandContext,
    target: Stuff | null,
    _instrument: Stuff & Tooled,
    band: CompetenceBandName,
    param: string,
  ): Promise<void> {
    const loc = this.asPlace(context, target);
    if (!loc) return;
    const light = await this.lightAt(loc);
    const actor = context.commandGiver as unknown as Stuff;
    // ⭐ The dial's figure, with the reader's error on it. The drive
    // caught this bare: `light at Duncan Hall lobby: 53.33333333333333`
    // — an engine float, no bracket, and therefore a claim of infinite
    // precision from an untrained hand.
    const figure = this.bracketed(
      light.intensity,
      band,
      this.seedFor(actor, loc as unknown as Stuff, param),
      'light',
    );
    this.report(context, Mml.compose`light at ${Mml.location(loc)}: ${figure}\n`);
  }

  /**
   * ⭐⭐ **The trained eye, and it is GRADUATED — which is the thing the
   * shipped verb got wrong.**
   *
   * `analyze light` used to hand everybody the full per-source
   * attribution: every lamp, its flux, its colour temperature. That is a
   * photometer's readout wearing an eye's clothes — nobody looks at a
   * room and apportions lumens between two candles — and giving it away
   * free left the instrument with nothing to sell.
   *
   * So the ladder is what a person can actually tell:
   *
   *   - **untrained / novice** — whether there is enough to work by.
   *   - **competent** — how long it will last and roughly where it
   *     comes from.
   *   - **proficient / expert** — the working: which source is carrying
   *     the room, and what that means for colour.
   *
   * ⚠ Every rung is TRUE. A vague answer is not a wrong one, and the
   * figure underneath is identical for all of them — which is what
   * `truth()` is for, and what the three-reader test asserts.
   */
  protected override async analyze(
    context: CommandContext,
    target: Stuff | null,
    band: CompetenceBandName,
    _handTool: (Stuff & Tooled) | null,
    _param: string,
  ): Promise<void> {
    const loc = this.asPlace(context, target);
    if (!loc) return;
    const light = await this.lightAt(loc);
    const lux = light.intensity.rawValue();

    const lines: Mml[] = [];
    lines.push(Mml.compose`Light at ${Mml.location(loc)}: ${enoughFor(lux)}`);

    if (CompetenceBand.atOrAbove(band, 'competent')) {
      lines.push(
        Mml.compose`  ${light.sources.length === 0 ? 'Nothing here is making any of it.' : sourceCount(light.sources.length)}`,
      );
      if (light.colorTemperature) {
        lines.push(Mml.compose`  ${colourOf(light.colorTemperature.rawValue())}`);
      }
    }

    // ⭐ The per-source working is the EXPERT's read — the thing a
    // practised eye can actually do, and the thing the photometer does
    // better. Below that band it is not withheld; it is not available,
    // which is a different sentence and the honest one.
    if (CompetenceBand.atOrAbove(band, 'proficient') && light.sources.length > 0) {
      lines.push(Mml.compose`  what is carrying it:`);
      for (const s of light.sources) {
        const src = StuffApi.findById(s.stuffId);
        const sourceName = src
          ? Mml.thing(src as Stuff)
          : Mml.fromMarkup(`<unknown>${s.stuffId}</unknown>`);
        lines.push(
          Mml.compose`    - ${sourceName}: ${shareOf(s.flux, light.sources)}`,
        );
      }
    }

    let body = Mml.compose`\n`;
    for (const line of lines) body = Mml.compose`${body}${line}\n`;
    this.report(context, body);
  }

  public override async truth(target: Stuff | null): Promise<number | null> {
    if (!target || !MixinApi.isContainer(target)) return null;
    return (await this.lightAt(target as Stuff & Container)).intensity.rawValue();
  }

  /** The named thing as a place, refusing in the old words when it is not. */
  private asPlace(
    context: CommandContext,
    target: Stuff | null,
  ): (Stuff & Container) | null {
    if (!target) {
      this.decline(context, Mml.compose`You don't see any '' here.`, 'no-place');
      return null;
    }
    if (!MixinApi.isContainer(target)) {
      const detail = `${target.getPresentation()} isn't a place`;
      MessageApi.scene(context.commandGiver)
        .topic('sense.reading')
        .toSelf(Mml.fromMarkup(detail))
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'not-a-place',
        detail,
      });
      return null;
    }
    return target as Stuff & Container;
  }

  /**
   * ⚠⚠ **The modality roster is warmed LAZILY, by the perception path**
   * (`preloadForSenseGate`, which `look` runs) — and nothing in the
   * bootstrap manifest stands it up. So a channel that reaches for
   * `vision` before anybody has looked at anything THROWS:
   *
   *     Something went wrong in …/AnalyzeController:
   *     PerceptionApi.modalityByName: no modality 'vision' loaded
   *
   * ⭐ Found by driving `analyze light` as the first command of a fresh
   * session. It is NOT new — the retired `AnalyzeLightController` made
   * the same bare call and would have thrown identically — it had simply
   * never been the first thing anybody typed, because a player looks
   * around before they measure anything.
   *
   * The preload is idempotent and cached, so this costs one await on the
   * first read of the process and nothing afterwards. It is the same
   * inert-roster trap `ReadingCatalogue` guards against one layer up.
   */
  private async lightAt(loc: Stuff & Container): Promise<Light> {
    await PerceptionApi.preloadModalities();
    const vision = PerceptionApi.modalityByName('vision');
    return (vision.signalAt(loc) as Light | null) ?? Light.ZERO;
  }
}

/**
 * What the light is FOR, which is the question a person actually asks.
 * The bands are the shipped perception thresholds read in words.
 */
function enoughFor(lux: number): string {
  if (lux < 0.5) return 'pitch dark — you cannot work in this at all';
  if (lux < 5) return 'barely enough to move by, and none to work by';
  if (lux < 40) return 'enough to work by, not enough to read fine print';
  if (lux < 400) return 'good working light';
  if (lux < 5000) return 'bright — anything close work needs';
  return 'glaring; you would shade your eyes';
}

/** How many things are making it, without apportioning between them. */
function sourceCount(n: number): string {
  if (n === 1) return 'One thing here is making all of it.';
  return `${n} things here are making it between them.`;
}

/** The colour of the light, in the words a person would use. */
function colourOf(kelvin: number): string {
  if (kelvin < 2400) return 'The light is warm and yellow, the colour of flame.';
  if (kelvin < 4000) return 'The light is soft and slightly yellow.';
  if (kelvin < 5500) return 'The light is near white.';
  return 'The light is cold and blue, the colour of a north window.';
}

/** A source's share, as a fraction of the room rather than as a figure. */
function shareOf(flux: number, sources: readonly { flux: number }[]): string {
  const total = sources.reduce((sum, s) => sum + s.flux, 0);
  if (total <= 0) return 'nothing';
  const share = flux / total;
  if (share > 0.75) return 'nearly all of it';
  if (share > 0.45) return 'most of it';
  if (share > 0.2) return 'a good part of it';
  if (share > 0.05) return 'a little';
  return 'almost none';
}
