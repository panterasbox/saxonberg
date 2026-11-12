/**
 * PaintReading — `measure paint <building>`: how much outside a building
 * has to the weather, and how much paint one coat of it takes (paint D13;
 * the job half of the retired `survey <building>`, controller-liquidity
 * W17).
 *
 * ⭐ Read from where the building meets the weather — the lane before a
 * house, the quay a ship lies alongside: a structure is an Idea, never in
 * a room, and enters the binder's pool only at its landing.
 *
 * ⭐ An instrument rung only (a rule or a gauging rod), and UNBANDED: the
 * area is what the rule says and the litres are arithmetic off it, the same
 * for everybody — so the figures print as figures. What the weather meets
 * is the structure's own word (`Structure.weatherSurface` — *wall and
 * roof*; a ship says *hull*). The coat and the condition are `look`'s and
 * `analyze condition`'s.
 *
 * See [docs/subsystems/instrumentation.md] and [docs/subsystems/painting.md].
 */

import Reading from '../../../lib/instrument/Reading';
import StructureBase from '../../../lib/structure/Structure';
import type { Tooled } from '../../../lib/craft/Tool';
import type { CompetenceBandName } from '../../../lib/advancement/CompetenceBand';
import type { CommandContext } from '../../../api/command';
import type { Stuff } from '../../../lib/stuff/Stuff';
import { Mml } from '../../../api/mml';

export default class PaintReading extends Reading {
  protected override async measure(
    context: CommandContext,
    subject: Stuff | null,
    instrument: Stuff & Tooled,
    _band: CompetenceBandName,
    _param: string,
  ): Promise<void> {
    const outside = subject instanceof StructureBase ? await subject.readOutside() : null;
    if (subject === null || outside === null) {
      this.decline(
        context,
        subject === null
          ? Mml.compose`Measure which building? Stand where it meets the weather and name it.`
          : Mml.compose`${Mml.thing(subject)} is not a building you could paint.`,
        'not-a-building',
      );
      return;
    }
    if (!(outside.areaM2 > 0)) {
      this.report(context, Mml.compose`There is nothing on ${Mml.thing(subject)} to the weather to paint.`);
      return;
    }
    const area = Math.round(outside.areaM2);
    const litres = Math.max(1, Math.round(outside.paintLitres));
    this.report(
      context,
      Mml.compose`By ${Mml.thing(instrument)}, there is about ${String(area)} square meters of ${outside.surface} on ${Mml.thing(subject)} to the weather; one coat of paint would take about ${String(litres)} litres.\n`,
    );
  }
}
