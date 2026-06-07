/**
 * Mobile.autoSenseOnArrival — substrate-level test that the renamed
 * hook fires the `sense` verb (not `look`).
 *
 * AC #29 (`Avatar.enter` calls `autoSenseOnArrival` → forces `sense`)
 * and AC #30 (`Mobile.traverse` / `teleport` / Goto `-l` fallback
 * route through the same hook) ride this contract — the four call
 * sites delegate to this one method, so verifying the verb text
 * here gates all four.
 */

import { describe, it, expect } from 'vitest';
import { MobileMixin } from '../Mobile';
import { ContainerMixin } from '../Container';
import { ContainableMixin } from '../Containable';
import { CommandGiverMixin } from '../../command/CommandGiver';
import { FocusedMixin } from '../../command/Focused';
import { SensorMixin } from '../../message/Sensor';
import { NamedMixin } from '../../description/Named';
import { Idea } from '../../stuff/Idea';
import { makeStuff } from '../../security/__tests__/test-setup';
import type { ExecuteCommandOpts } from '../../../api/command';

const Base = MobileMixin(
  ContainerMixin(
    ContainableMixin(
      CommandGiverMixin(
        FocusedMixin(SensorMixin(NamedMixin(Idea))),
      ),
    ),
  ),
);

class CapturingMobile extends Base {
  static persistentFields: string[] = [];
  public forced: Array<{ text: string; forced: boolean }> = [];
  public override async executeCommand(
    text: string,
    opts: ExecuteCommandOpts = {},
  ): Promise<void> {
    this.forced.push({ text, forced: opts.forced ?? false });
  }
}

describe('Mobile.autoSenseOnArrival', () => {
  it('forces the `sense` verb (not `look`); AC #29 / #30', async () => {
    const mover = makeStuff(() => new CapturingMobile());
    await mover.autoSenseOnArrival();
    expect(mover.forced).toEqual([{ text: 'sense', forced: true }]);
  });
});
