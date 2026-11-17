/**
 * TestHarnessSpeciesController — `testharness species <name> <species
 * path>` — stage a resident character as a body of another species, its
 * mass re-seeded from it (the size-and-carrying drive's large body and
 * gnome, step 7; over {@link TestHarnessControllerBase}).
 */

import type { CommandContext } from '../../../../api/command';
import { TestHarnessApi } from '../../../../api/test-harness';
import {
  TestHarnessControllerBase,
  TOPIC,
  type TestHarnessModel,
} from './TestHarnessControllerBase';

export default class TestHarnessSpeciesController extends TestHarnessControllerBase {
  async execute(model: TestHarnessModel, context: CommandContext): Promise<void> {
    return this.staged(context, async () => {
      if (!model.op || !model.value) {
        return this.refuse(
          context,
          TOPIC,
          'testharness species <name> <species path> — e.g. `testharness species Mara /stuff/idea/species/animalia/chordata/mammalia/primates/hominidae/homo/gnomus`.',
          'test-usage',
        );
      }
      const r = await TestHarnessApi.setSpecies(model.op, model.value);
      TestHarnessControllerBase.say(context, `${r.character} is a ${r.species} body now — ${r.massKg} kg.`);
    });
  }
}
