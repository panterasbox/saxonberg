/**
 * ⭐⭐ Where a verb looks (controllers-are-io D21; one-resolution § 3 row 11).
 *
 * The binder asks EVERY scope try and the best keyword tier wins — a
 * whole-name hit in a later try beats a partial in an earlier one; a tie
 * goes to the earlier try (drill-first). A world act declares
 * `scope: [here, peers, person]`, so `cut ice` standing over a block cuts
 * the block underfoot while a smaller one is carried.
 *
 * Fixtures: the shared MQL world (bob in the square), with the giver's
 * affordances mocked and `_executeOne` mocked so no controller runs — the
 * model the binder hands the controller is what is asserted.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ContainmentApi } from '../../../api/containment';
import { CommandApi, type CommandContext, type CommandModel } from '../../../api/command';
import { CommandLineApi } from '../../../api/command-line';
import { CommandDefinition } from '../CommandDefinition';
import { makeStuff } from '../../security/__tests__/test-setup';
import { makeWorld, type MqlWorld } from '../../../api/__tests__/fixtures/mql-world';
import { Idea } from '../../stuff/Idea';
import { ContainableMixin } from '../../spatial/Containable';
import { VisibleMixin } from '../../description/Visible';
import { PerceptibleMixin } from '../../description/Perceptible';
import type { Stuff } from '../../stuff/Stuff';
import type { Affordance } from '../CommandGiver';
import type { MqlOneResult } from '../../../api/mql';

class Thing extends ContainableMixin(VisibleMixin(PerceptibleMixin(Idea))) {}

const view = async (verb: string, scope: string): Promise<CommandDefinition> => {
  const def = CommandDefinition.fromYaml(
    `
verbs: [${verb}]
controller: NoopController
description: scope-tier fixture
args:
  - name: target
    type: object
    scope: ${scope}
    required: true
    requires: VisibleMixin
`,
    '<test>',
  );
  await CommandApi.resolveValidators(def);
  return def;
};

describe('the binder compares keyword tiers across scope tries', () => {
  let world: MqlWorld;
  let models: CommandModel[];

  const thing = (keywords: string[], into: Stuff): Stuff => {
    const t = makeStuff(() => new Thing());
    t.setKeywords(keywords);
    ContainmentApi.move(t as never, into as never);
    return t;
  };

  const run = async (def: CommandDefinition, text: string): Promise<Stuff | null> => {
    const g = world.giver as unknown as {
      getAffordances(): Affordance[];
      _runChain(p: unknown, o: unknown): Promise<CommandContext>;
    };
    vi.spyOn(g, 'getAffordances').mockReturnValue([
      { command: def, source: world.giver, bucket: 'self' } as Affordance,
    ]);
    const outer = CommandApi.createCommandContext({
      commandGiver: world.giver,
      location: world.location as never,
      commandText: text,
      executionId: 'test',
      commandId: 'test',
      verb: '',
      command: undefined as never,
    });
    await g._runChain(CommandLineApi.parsePipeline(text).commands[0]!, outer);
    const m = models[models.length - 1];
    return (m?.target as MqlOneResult | undefined)?.stuff ?? null;
  };

  beforeEach(() => {
    models = [];
    world = makeWorld();
    vi.spyOn(world.giver as never, '_executeOne').mockImplementation((async (
      _c: CommandDefinition,
      model: CommandModel,
    ) => {
      models.push(model);
    }) as never);
  });
  afterEach(() => vi.restoreAllMocks());

  it('⭐ a whole-keyword hit in a LATER try beats a partial in an earlier one', async () => {
    const flask = thing(['flask', 'lamp oil'], world.giver);
    const lamp = thing(['lamp', 'oil lamp'], world.location);
    const def = await view('trimish', '["inventory", "peers"]');
    // `lamp` is only a whole word of the flask's "lamp oil" (tier 2) and IS
    // the lamp's keyword (tier 3): the room's lamp, though inventory is first.
    expect(await run(def, 'trimish lamp')).toBe(lamp);
    void flask;
  });

  it('a TIE goes to the earlier try — that is what drill-first means', async () => {
    const mine = thing(['lamp'], world.giver);
    thing(['lamp'], world.location);
    const def = await view('trimish', '["inventory", "peers"]');
    expect(await run(def, 'trimish lamp')).toBe(mine);
  });

  it('⭐ drive 23: `cut ice` standing over a block cuts the block underfoot, not the one carried', async () => {
    thing(['ice', 'block', 'small block'], world.giver);
    const block = thing(['ice', 'block', 'ice block'], world.location);
    const cut = await view('cutish', '["$focus", "here", "peers", "person"]');
    expect(await run(cut, 'cutish ice')).toBe(block);
  });

  it('…while an in-hand act (`reachable`, person first) reaches the carried one first', async () => {
    const carried = thing(['ice', 'block', 'small block'], world.giver);
    thing(['flake'], world.location);
    const eat = await view('eatish', '[reachable]');
    expect(await run(eat, 'eatish ice')).toBe(carried);
  });
});
