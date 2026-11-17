/**
 * TestHarnessGravityController — `testharness gravity <m/s²|clear>
 * [--at <place>]` — set the gravity of the place you stand in (or
 * `--at`), the staged twin of a world whose pull is not Earth's (size and
 * carrying drive 19; over {@link TestHarnessControllerBase}).
 */

import type { CommandContext } from '../../../../api/command';
import { TestHarnessApi } from '../../../../api/test-harness';
import {
  TestHarnessControllerBase,
  TOPIC,
  type TestHarnessModel,
} from './TestHarnessControllerBase';

export default class TestHarnessGravityController extends TestHarnessControllerBase {
  async execute(model: TestHarnessModel, context: CommandContext): Promise<void> {
    return this.staged(context, async () => {
      const where = TestHarnessControllerBase.scopeOf(model, context.commandGiver);
      const value = model.value?.trim() ?? '';
      const ms2 = value === 'clear' ? null : Number(value);
      if (where === null || value === '' || (ms2 !== null && !Number.isFinite(ms2))) {
        return this.refuse(
          context,
          TOPIC,
          'testharness gravity <m/s²> — 0 for none, 9.81 for Earth, `clear` to inherit (`--at <place>` for elsewhere).',
          'test-usage',
        );
      }
      const r = await TestHarnessApi.setGravity(where, ms2);
      TestHarnessControllerBase.say(
        context,
        `Gravity at ${r.place} is ${r.own === null ? 'inherited' : `${r.own} m/s²`} — it reads ${r.now} m/s² now.`,
      );
    });
  }
}
