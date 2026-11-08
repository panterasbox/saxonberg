/**
 * ⭐ A `disabled` menu row says WHICH check refused and, when it was the
 * slot's own `requires:`, the mixin the target was found without
 * (controllers-are-io D23) — so a client can name what is missing rather
 * than only that something is.
 */

import '../../../test-bootstrap';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { CommandApi } from '../command';
import { CommandDefinition } from '../../lib/command/CommandDefinition';
import { PerceptionApi } from '../perception';
import { makeWorld } from './fixtures/mql-world';
import type { Affordance } from '../../lib/command/CommandGiver';

describe('the disabled row', () => {
  afterEach(() => vi.restoreAllMocks());

  it('carries `validator` and `missing`', async () => {
    const world = makeWorld();
    const seal = CommandDefinition.fromYaml(
      `
verbs: [sealish]
controller: NoopController
description: disabled-row fixture
args:
  - name: target
    type: object
    scope: [reachable]
    requires: SealableMixin
`,
      '<test>',
    );
    await CommandApi.resolveValidators(seal);
    vi.spyOn(world.giver, 'getAffordances').mockReturnValue([
      { command: seal, source: world.giver, bucket: 'self' },
    ] as Affordance[]);
    vi.spyOn(PerceptionApi, 'perceives').mockReturnValue(true);
    const out = await CommandApi.resolveAffordances(world.rose, world.giver);
    const row = out?.verbs.find((v) => v.verb === 'sealish');
    expect(row).toMatchObject({ state: 'disabled', validator: 'field', missing: 'SealableMixin' });
    expect(row?.reason).toBeTruthy();
  });
});
