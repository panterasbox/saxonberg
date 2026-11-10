/**
 * TestHarnessShipController — `testharness ship <ship> [at node:<path> |
 * at <frame> <cite>] [hull <band>] [bilge <L>] [slept <days>] [flag
 * <government>] [settling]` — stage a ship (over {@link
 * TestHarnessControllerBase}).
 *
 * The ship by her row path or handle — or her registered name, read in
 * the register `flag`'s government keeps (Terminus by default) — (the
 * subcommand's first word, `op`), staged where and as the drive needs
 * her. Options in any order; a frame citation (`at <frame> <cite>`) takes
 * the rest of the line, so it goes last.
 */

import type { CommandContext } from '../../../../api/command';
import { TestHarnessApi, type ShipStageSpec } from '../../../../api/test-harness';
import {
  TestHarnessControllerBase,
  TOPIC,
  type TestHarnessModel,
} from './TestHarnessControllerBase';

export default class TestHarnessShipController extends TestHarnessControllerBase {
  async execute(model: TestHarnessModel, context: CommandContext): Promise<void> {
    return this.staged(context, async () => {
      const usage =
        'testharness ship <ship> [at node:<path> | at <frame path> <cite>] [hull <band>] [bilge <L>] [slept <days>] [flag <government>] [settling].';
      const handle = model.op;
      const words = [model.value ?? '', ...(model.cite ?? '').trim().split(/\s+/)].filter((w) => w !== '');
      if (!handle || words.length === 0) return this.refuse(context, TOPIC, usage, 'test-usage');
      const spec: ShipStageSpec = {};
      for (let i = 0; i < words.length; ) {
        const key = words[i]!;
        // ⭐ A flag with no value — her bilge to her deck, the window opened.
        if (key === 'settling') {
          spec.settling = true;
          i += 1;
          continue;
        }
        const next = words[i + 1];
        if (next === undefined) return this.refuse(context, TOPIC, usage, 'test-usage');
        if (key === 'at') {
          if (next.startsWith('node:')) {
            spec.at = { node: next.slice('node:'.length) };
            i += 2;
            continue;
          }
          const cite = words.slice(i + 2).join(' ');
          if (cite === '') return this.refuse(context, TOPIC, usage, 'test-usage');
          spec.at = { frame: next, cite };
          break;
        }
        if (key === 'hull') spec.hull = next;
        else if (key === 'bilge') spec.bilgeL = Number(next);
        else if (key === 'slept') spec.sleptDays = Number(next);
        else if (key === 'flag') spec.flag = next;
        else return this.refuse(context, TOPIC, usage, 'test-usage');
        i += 2;
      }
      const r = await TestHarnessApi.stageShip(handle, spec);
      TestHarnessControllerBase.say(context, `${r.ship} lies staged on ${r.frame}.`);
    });
  }
}
