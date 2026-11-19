/**
 * TestHarnessStandingHistoryController — `testharness standing-history
 * <count>` — stage `count` past players with a week of participation,
 * renown and producer history (the db-performance drive's long-lived,
 * quiet world, step 2; over {@link TestHarnessControllerBase}).
 */

import type { CommandContext } from '../../../../api/command';
import { TestHarnessApi } from '../../../../api/test-harness';
import {
  TestHarnessControllerBase,
  TOPIC,
  type TestHarnessModel,
} from './TestHarnessControllerBase';

export default class TestHarnessStandingHistoryController extends TestHarnessControllerBase {
  async execute(model: TestHarnessModel, context: CommandContext): Promise<void> {
    return this.staged(context, async () => {
      if (!model.op) {
        return this.refuse(
          context,
          TOPIC,
          'testharness standing-history <count> — e.g. `testharness standing-history 200`.',
          'test-usage',
        );
      }
      const r = await TestHarnessApi.stageStandingHistory(Number(model.op));
      TestHarnessControllerBase.say(
        context,
        `${r.subjects} past players have standing history (${r.rows} rows appended).`,
      );
    });
  }
}
