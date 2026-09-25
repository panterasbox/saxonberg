/**
 * AtmosphereReading — what medium you are standing in: air, water,
 * vacuum, or whatever else fills the space.
 *
 * ⚠ Not `trace atmosphere`, which is the engine diagnostic that says
 * WHERE the value came from (a detail override, a biome ancestor, the
 * universe default). That was `analyze atmosphere` and it was never a
 * reading — it is a free engine read and lives on `trace` now.
 */

import Reading from '../../../lib/instrument/Reading';
import { BiomeApi } from '../../../api/biome';
import { MixinApi } from '../../../api/mixin';
import { Mml } from '../../../api/mml';
import type { CommandContext } from '../../../api/command';
import type { Stuff } from '../../../lib/stuff/Stuff';
import type { Container } from '../../../lib/spatial/Container';
import type { Tooled } from '../../../lib/craft/Tooled';
import type { CompetenceBandName } from '../../../lib/advancement/CompetenceBand';

export default class AtmosphereReading extends Reading {
  protected override async measure(
    context: CommandContext,
    target: Stuff | null,
    _instrument: Stuff & Tooled,
    _band: CompetenceBandName,
    param: string,
  ): Promise<void> {
    if (!target || !MixinApi.isContainer(target)) {
      this.decline(
        context,
        Mml.compose`You aren't anywhere to measure.`,
        'no-scope',
      );
      return;
    }
    const medium = await BiomeApi.resolveAtmosphereFor(
      target as Stuff & Container,
      param === '' ? undefined : param,
    );
    let densityLine: Mml | null = null;
    try {
      const d = BiomeApi.densityOf(medium);
      densityLine = Mml.compose`  density: ${d.formatMml(undefined, undefined, { channel: 'atmosphere' })}\n`;
    } catch {
      // Unknown medium tag — surface the tag without a density.
      densityLine = null;
    }
    this.report(
      context,
      densityLine
        ? Mml.compose`Atmosphere: ${medium}\n${densityLine}`
        : Mml.compose`Atmosphere: ${medium}\n`,
    );
  }
}
