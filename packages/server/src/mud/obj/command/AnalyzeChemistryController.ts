/**
 * AnalyzeChemistryController — handler for `analyze chemistry of
 * <target>`.
 *
 * Reads the target's bulk Material and renders its chemistry +
 * density + composition + biological-source data with canonical
 * units (Quantity-shaped fields render via `formatMml`). Targets
 * without a Material fall through to a polite "nothing to analyze"
 * failure.
 */

import { CommandController } from '../../lib/command/CommandController';
import type {
  CommandContext,
  CommandModel,
  CommandResult,
} from '../../api/command';
import type { MqlOneResult } from '../../api/mql';
import type { Stuff } from '../../lib/stuff/Stuff';
import { MixinApi } from '../../api/mixin';
import { MessageApi } from '../../api/message';
import { Mml } from '../../api/mml';
import { MaterialApi } from '../../api/material';
import { DescribeApi } from '../../api/describe';

interface AnalyzeChemistryModel extends CommandModel {
  target?: MqlOneResult;
}

export class AnalyzeChemistryController extends CommandController<AnalyzeChemistryModel> {
  execute(
    model: AnalyzeChemistryModel,
    context: CommandContext
  ): CommandResult {
    const target = model.target;
    if (!target || target.stuff === null) {
      return {
        success: false,
        summary: `you don't see any '${target?.raw ?? ''}' here`,
      };
    }
    if (!MixinApi.isTangible(target.stuff as Stuff)) {
      return {
        success: false,
        summary: `there's nothing to analyze on ${DescribeApi.getDisplayName(target.stuff, 'that')}`,
      };
    }
    const material = MaterialApi.materialOf(target.stuff as Stuff);
    if (!material) {
      return {
        success: false,
        summary: `there's no material data for ${DescribeApi.getDisplayName(target.stuff, 'that')}`,
      };
    }

    const lines: Mml[] = [];
    lines.push(
      Mml.compose`Chemistry of ${Mml.name(target.stuff as Stuff)}:`
    );
    lines.push(Mml.compose`  material: ${material.getName()}`);
    lines.push(Mml.compose`  density: ${material.getDensity().formatMml()}`);
    const chem = material.getChemistry();
    if (chem) {
      if (chem.symbol) {
        lines.push(Mml.compose`  symbol: ${chem.symbol}`);
      }
      if (chem.atomicNumber !== undefined) {
        lines.push(Mml.compose`  atomic number: ${chem.atomicNumber}`);
      }
      if (chem.formula) {
        lines.push(Mml.compose`  formula: ${chem.formula}`);
      }
      if (chem.molarMass) {
        lines.push(
          Mml.compose`  molar mass: ${chem.molarMass.formatMml()}`
        );
      }
    }
    const composition = material.getComposition();
    if (composition.length > 0) {
      lines.push(Mml.compose`  composition:`);
      for (const c of composition) {
        lines.push(Mml.compose`    - ${c.materialPath}: ${c.fraction}`);
      }
    }
    const bio = material.getBiologicalSource();
    if (bio) {
      lines.push(
        Mml.compose`  biological source: ${bio.tissueType} from ${bio.speciesPath}`
      );
    }

    let body = Mml.compose`\n`;
    for (const line of lines) {
      body = Mml.compose`${body}${line}\n`;
    }

    MessageApi.scene(context.commandGiver)
      .topic(MessageApi.Topics.world.perception.look)
      .toSelf(body)
      .send();

    return {
      success: true,
      summary: `analyzed ${material.getName()}`,
    };
  }
}
