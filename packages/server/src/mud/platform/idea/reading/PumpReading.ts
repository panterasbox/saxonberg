/**
 * PumpReading — `analyze pump <thing>`: what a person can tell about a
 * pump by looking at it and working its handle once.
 *
 * ⭐ **An eye rung only, and it explains nothing.** It names the mechanism
 * in words (*it draws* / *it drives*), the packing's condition in five
 * words and no digit, and — for a pump that pulls — about how deep it will
 * draw from where it stands, bracketed by the reader's band. It never says
 * WHY that depth: not air, not pressure, not a vacuum. The number is a
 * thing you can find out by doing; the reason is a law somebody has to
 * discover (the inquiry slate's first case), and this game will not hand
 * it over in a tooltip.
 *
 * The subject may be the pump or the thing it is set in (`analyze pump
 * well`) — the same one-hop narrowing the verb uses, so `subjectRequires`
 * stays empty and a wrong subject is refused in the channel's own words.
 *
 * See [docs/subsystems/pump.md].
 */

import Reading from '../../../lib/instrument/Reading';
import type { Tooled } from '../../../lib/craft/Tooled';
import type { CompetenceBandName } from '../../../lib/advancement/CompetenceBand';
import type { CommandContext } from '../../../api/command';
import type { Stuff } from '../../../lib/stuff/Stuff';
import type { Container } from '../../../lib/spatial/Container';
import type { Pumping, PackingCondition } from '../../../lib/pump/Pumping';
import type { PumpSource } from '../../../lib/pump/Pumpable';
import { MixinApi } from '../../../api/mixin';
import { BiomeApi } from '../../../api/biome';
import { Mml } from '../../../api/mml';
import { Quantity } from '../../../lib/quantity';

/** The packing's condition as a sentence — the word, and no digit. */
const PACKING_LINE: Record<PackingCondition, string> = {
  sound: 'The leather in the barrel is sound: the handle comes up heavy and even.',
  worn: 'The leather in the barrel is worn — it still seals, with a little give at the top of the stroke.',
  leaking: 'The leather in the barrel is leaking; water weeps back past it between strokes.',
  perished: 'The leather in the barrel has perished. It barely holds, and it will not hold for long.',
  gone: 'The leather in the barrel is gone. The handle drops with nothing to push against.',
};

export default class PumpReading extends Reading {
  protected override async analyze(
    context: CommandContext,
    subject: Stuff | null,
    band: CompetenceBandName,
    _handTool: (Stuff & Tooled) | null,
    _param: string,
  ): Promise<void> {
    const pump = subject ? this.pumpOf(subject) : null;
    if (!pump) {
      this.decline(
        context,
        Mml.compose`There is no pump in that to look at.`,
        'not-a-pump',
      );
      return;
    }
    const lines: Mml[] = [];
    const mech = await pump.mechanismRow();
    if (mech?.getDescription()) lines.push(Mml.compose`${mech.getDescription()}`);
    lines.push(Mml.compose`${PACKING_LINE[pump.packingCondition()]}`);

    if (mech?.isPulling()) {
      const actor = this.actorOf(context);
      const scope = this.scopeOf(pump, actor);
      if (scope) {
        const ceiling = await BiomeApi.suctionHeadFor(scope);
        const shown = this.bracketed(
          Quantity.of(ceiling.rawValue(), 'm'),
          band,
          this.seedFor(actor, pump, 'pump'),
          'spatial',
        );
        lines.push(
          Mml.compose`Worked here, it will draw water from no deeper than about ${shown}.`,
        );
      }
    } else if (mech) {
      lines.push(
        Mml.compose`It will push as high as its build and the arm on the handle will carry.`,
      );
    }
    let body = Mml.compose``;
    for (const line of lines) body = Mml.compose`${body}${line}\n`;
    this.report(context, body);
  }

  /** The pump itself, or the one set in a source. */
  private pumpOf(subject: Stuff): (Stuff & Pumping) | null {
    if (MixinApi.isPumping(subject)) return subject;
    const s = subject as unknown as Partial<PumpSource>;
    if (typeof s.pumpFitted !== 'function') return null;
    const fitted = s.pumpFitted();
    return fitted && MixinApi.isPumping(fitted) ? fitted : null;
  }

  /** Where the pump would be worked: its source's place, else the reader's. */
  private scopeOf(pump: Stuff & Pumping, actor: Stuff): (Stuff & Container) | null {
    const fromSource = pump.liftSource()?.liftScope() ?? null;
    if (fromSource) return fromSource;
    let at: Stuff | null = actor;
    while (at) {
      if (at.isLocation() && MixinApi.isContainer(at)) return at;
      at = MixinApi.isContainable(at) ? at.getContainer() : null;
    }
    return null;
  }
}
