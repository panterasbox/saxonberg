/**
 * AnalyzeAtmosphereController — handler for `analyze atmosphere
 * [<detail>]`. Dumps the full resolved atmospheric state at the
 * actor's immediate scope with provenance: biome path, spatial
 * zone, per-field value + source layer + biome ancestry chain,
 * derived volume / ceiling / density.
 *
 * Verb is available to any actor — no instrument required. Cheap;
 * doubles as a developer debug tool.
 */

import { CommandController } from '../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../api/command';
import type { Stuff } from '../../lib/stuff/Stuff';
import type { Container } from '../../lib/spatial/Container';
import { MixinApi } from '../../api/mixin';
import { MessageApi } from '../../api/message';
import { BiomeApi } from '../../api/biome';
import type { AtmosphericTrace } from '../../api/biome';
import { Mml } from '../../api/mml';

interface AnalyzeAtmosphereModel extends CommandModel {
  detail?: string;
}

function describeSource(trace: AtmosphericTrace<unknown>): string {
  switch (trace.source) {
    case 'detail':
      return `detail override`;
    case 'detail-prefix':
      return `detail prefix`;
    case 'room':
      return `scope override`;
    case 'biome':
      return `biome default`;
    case 'biome-ancestor':
      return `biome ancestor (${trace.sourcePath})`;
    case 'zone':
      return `spatial zone`;
    case 'universe':
      return `universe default`;
  }
}

export class AnalyzeAtmosphereController extends CommandController<AnalyzeAtmosphereModel> {
  async execute(
    model: AnalyzeAtmosphereModel,
    ctx: CommandContext,
  ): Promise<void> {
    const giver = ctx.commandGiver;
    const scope = (giver as Stuff & {
      getContainer?: () => unknown;
    }).getContainer?.();
    if (!scope || !MixinApi.isContainer(scope as Stuff)) {
      ctx.note({
        kind: 'controller-rejected',
        reason: 'no-scope',
        detail: 'no atmospheric scope',
      });
      MessageApi.scene(giver)
        .topic('world.perception.look')
        .toSelf(Mml.compose`You aren't anywhere to analyze.`)
        .send();
      return;
    }
    const containedScope = scope as Stuff & Container;
    const traces = await BiomeApi.traceResolveAll(containedScope, model.detail);

    // Biome + zone paths.
    const biome = MixinApi.isAtmospheric(containedScope)
      ? containedScope.getBiome()
      : null;
    const biomePath = biome?.getTemplatePath() ?? null;
    const zone = containedScope.getZone?.() ?? null;
    const zonePath =
      (zone as Stuff & { getTemplatePath?: () => string | null })?.getTemplatePath?.() ??
      null;

    const lines: Mml[] = [];
    lines.push(
      Mml.compose`Atmospheric analysis at ${Mml.location(containedScope)}:`,
    );
    lines.push(
      Mml.compose`  biome: ${biomePath ?? '(none)'}`,
    );
    lines.push(
      Mml.compose`  zone:  ${zonePath ?? '(none)'}`,
    );
    lines.push(
      Mml.compose`  temperature: ${traces.temperature.value.formatMml(undefined, 'thermal')} (${traces.temperature.value.tag('thermal')}) — ${describeSource(traces.temperature)}`,
    );
    lines.push(
      Mml.compose`  pressure:    ${traces.pressure.value.formatMml()} (${traces.pressure.value.tag()}) — ${describeSource(traces.pressure)}`,
    );
    lines.push(
      Mml.compose`  humidity:    ${traces.humidity.value.formatMml()} (${traces.humidity.value.tag()}) — ${describeSource(traces.humidity)}`,
    );
    lines.push(
      Mml.compose`  gravity:     ${traces.gravity.value.formatMml()} (${traces.gravity.value.tag()}) — ${describeSource(traces.gravity)}`,
    );
    lines.push(
      Mml.compose`  atmosphere:  ${traces.atmosphere.value} — ${describeSource(traces.atmosphere)}`,
    );

    // Derived geometry — read via AtmosphericMixin's surface (every
    // atmospheric scope provides null-or-derived values).
    const volume = MixinApi.isAtmospheric(containedScope)
      ? containedScope.getVolume()
      : null;
    const ceiling = MixinApi.isAtmospheric(containedScope)
      ? containedScope.getCeilingHeight()
      : null;
    if (volume !== null || ceiling !== null) {
      lines.push(Mml.compose`  derived:`);
      if (volume !== null) {
        lines.push(Mml.compose`    volume:  ${volume.formatMml()}`);
      }
      if (ceiling !== null) {
        lines.push(Mml.compose`    ceiling: ${ceiling.formatMml()}`);
      }
    }

    // Density of the resolved atmosphere if known.
    try {
      const d = BiomeApi.densityOf(traces.atmosphere.value);
      lines.push(Mml.compose`    density: ${d.formatMml()}`);
    } catch {
      // unknown tag — skip silently.
    }

    let body = Mml.compose`\n`;
    for (const line of lines) {
      body = Mml.compose`${body}${line}\n`;
    }
    MessageApi.scene(giver)
      .topic('world.perception.look')
      .toSelf(body)
      .send();
  }
}
