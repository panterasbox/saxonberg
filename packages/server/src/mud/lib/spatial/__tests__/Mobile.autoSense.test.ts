/**
 * Mobile.autoLookOnArrival — substrate-level test that the renamed
 * hook fires the `look` verb (client-surface D10 — it was `sense`).
 *
 * The four on-entry call sites (Avatar.enter, Mobile.traverse,
 * Mobile.teleport, Goto -l fallback) all delegate to this one
 * method, so verifying the verb text here gates all four.
 */

import "../../../../test-bootstrap";
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
import type { FieldMeta } from '../../mixin';

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
  static fieldMeta: FieldMeta = {};
  public forced: Array<{ text: string; forced: boolean }> = [];
  public override async executeCommand(
    text: string,
    opts: ExecuteCommandOpts = {},
  ): Promise<void> {
    this.forced.push({ text, forced: opts.forced ?? false });
  }
}

describe('Mobile.autoLookOnArrival', () => {
  it('forces the `look` verb (client-surface D10)', async () => {
    const mover = makeStuff(() => new CapturingMobile());
    await mover.autoLookOnArrival();
    expect(mover.forced).toEqual([{ text: 'look', forced: true }]);
  });
});
