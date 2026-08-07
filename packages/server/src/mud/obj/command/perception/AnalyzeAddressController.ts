/**
 * AnalyzeAddressController — handler for `analyze address [<location>]`.
 *
 * Dumps the resolved addressing state at a place: the declared or
 * inherited address with its provenance (which resolve step supplied
 * it), the covering Locality, and the most-→least-specific
 * longest-prefix chain. No instrument required — cheap; doubles as the
 * substrate's developer debug surface (parallel to `analyze
 * atmosphere`).
 */

import { CommandController } from '../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../api/command';
import type { MqlOneResult } from '../../../api/mql';
import type { Stuff } from '../../../lib/stuff/Stuff';
import type { Container } from '../../../lib/spatial/Container';
import { MixinApi } from '../../../api/mixin';
import { MessageApi } from '../../../api/message';
import { Mml } from '../../../api/mml';
import { AddressApi } from '../../../api/address';
import type { AddressSource } from '../../../api/address';

interface AnalyzeAddressModel extends CommandModel {
  location?: MqlOneResult;
}

const TOPIC = 'sense.reading';

function describeSource(source: AddressSource): string {
  switch (source) {
    case 'declared':
      return 'declared here';
    case 'inherited-containment':
      return 'inherited from the containing place';
    case 'zone':
      return 'from the spatial zone';
    case 'none':
      return 'no address declared or inherited';
  }
}

export default class AnalyzeAddressController extends CommandController<AnalyzeAddressModel> {
  async execute(model: AnalyzeAddressModel, ctx: CommandContext): Promise<void> {
    const giver = ctx.commandGiver;
    const target = model.location;
    if (!target || target.stuff === null) {
      const raw = target?.raw ?? '';
      ctx.note({ kind: 'empty-result', field: 'location', query: raw });
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`You don't see any '${raw}' here.`)
        .send();
      return;
    }
    if (!MixinApi.isContainer(target.stuff)) {
      const detail = `${target.stuff.getPresentation()} isn't a place`;
      ctx.note({ kind: 'controller-rejected', reason: 'not-a-place', detail });
      MessageApi.scene(giver).topic(TOPIC).toSelf(Mml.fromMarkup(detail)).send();
      return;
    }

    const scope = target.stuff as Stuff & Container;
    const trace = await AddressApi.traceResolveFor(scope);

    const lines: Mml[] = [];
    lines.push(Mml.compose`Address resolution at ${Mml.location(scope)}:`);
    lines.push(
      Mml.compose`  address: ${trace.address ?? '(none)'} — ${describeSource(trace.source)}`,
    );
    if (trace.sourcePath !== null) {
      lines.push(Mml.compose`  supplied by: ${trace.sourcePath}`);
    }
    if (trace.locality !== null) {
      lines.push(
        Mml.compose`  covering Locality: ${trace.locality.getName()} (claims '${trace.locality.getAddress()}')`,
      );
    } else {
      lines.push(Mml.compose`  covering Locality: (none — global / off-grid)`);
    }
    if (trace.coverageChain.length > 0) {
      lines.push(Mml.compose`  longest-prefix chain:`);
      for (let i = 0; i < trace.coverageChain.length; i++) {
        const c = trace.coverageChain[i]!;
        const marker = i === 0 ? '   ← winner' : '';
        lines.push(Mml.compose`    ${c.address} → ${c.templatePath}${marker}`);
      }
    }

    let body = Mml.compose`\n`;
    for (const line of lines) {
      body = Mml.compose`${body}${line}\n`;
    }
    MessageApi.scene(giver).topic(TOPIC).toSelf(body).send();
  }
}
