/**
 * ⭐⭐ The binder's reach rung (controller-liquidity D4/D6). A slot binds at
 * the line's `--top`/`--open`/`--deep`, else its own `depth:`, else `open`.
 * A bare name that finds nothing at its rung is asked once more at `deep`;
 * when what answers is behind a shut lid the line is refused with the lid
 * (*"A box is shut."*) rather than *nothing named that* — and the deeper
 * find is never bound. A rung the player typed is taken at its word.
 *
 * Fixtures: the shared MQL world (bob in the square), the giver's
 * affordances mocked and `_executeOne` mocked so no controller runs.
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
import { ContainerMixin } from '../../spatial/Container';
import { SealableMixin } from '../../spatial/Sealable';
import { VisibleMixin } from '../../description/Visible';
import { PerceptibleMixin } from '../../description/Perceptible';
import type { Stuff } from '../../stuff/Stuff';
import type { Affordance } from '../CommandGiver';
import type { MqlOneResult } from '../../../api/mql';

class Thing extends ContainableMixin(VisibleMixin(PerceptibleMixin(Idea))) {}
class Box extends SealableMixin(
  ContainerMixin(ContainableMixin(VisibleMixin(PerceptibleMixin(Idea)))),
) {}

const view = async (depth?: string): Promise<CommandDefinition> => {
  const def = CommandDefinition.fromYaml(
    `
verbs: [eatish]
controller: NoopController
description: reach-rung fixture
args:
  - name: target
    type: object
    scope: reachable
    required: true
    requires: VisibleMixin
${depth ? `    depth: ${depth}\n` : ''}`,
    '<test>',
  );
  await CommandApi.resolveValidators(def);
  return def;
};

describe('the binder walks at a reach rung', () => {
  let world: MqlWorld;
  let models: CommandModel[];
  let last: CommandContext | null;

  const thing = (word: string, into: Stuff): Stuff => {
    const t = makeStuff(() => new Thing());
    t.setShortDescription(`a ${word}`);
    t.setKeywords([word]);
    ContainmentApi.move(t as never, into as never);
    return t;
  };
  const box = (word: string, open: boolean, into: Stuff): Box => {
    const b = makeStuff(() => new Box());
    b.setShortDescription(`a ${word}`);
    b.setKeywords([word]);
    b.setOpen(open);
    ContainmentApi.move(b as never, into as never);
    return b;
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
    models = [];
    last = await g._runChain(CommandLineApi.parsePipeline(text).commands[0]!, outer);
    const m = models[models.length - 1];
    return (m?.target as MqlOneResult | undefined)?.stuff ?? null;
  };
  const refusal = (): string | undefined =>
    (last?.getNotes() ?? [])
      .filter((n) => n.kind === 'validator-failed')
      .map((n) => (n as { detail?: string }).detail)
      .find((d) => d !== undefined);

  beforeEach(() => {
    world = makeWorld();
    last = null;
    vi.spyOn(world.giver as never, '_executeOne').mockImplementation((async (
      _c: CommandDefinition,
      model: CommandModel,
    ) => {
      models.push(model);
    }) as never);
  });
  afterEach(() => vi.restoreAllMocks());

  it('⭐ binds the apple in the open bag you carry (the new `open`)', async () => {
    const bag = box('bag', true, world.giver);
    const apple = thing('quince', bag);
    expect(await run(await view(), 'eatish quince')).toBe(apple);
  });

  it('⭐ the apple in a shut box: "the box is shut", and nothing is bound', async () => {
    const b = box('box', false, world.giver);
    thing('quince', b);
    expect(await run(await view(), 'eatish quince')).toBeNull();
    expect(models).toHaveLength(0);
    expect(refusal()).toMatch(/box is shut\.$/);
  });

  it('`--top` is taken at its word: none at hand, no lid named', async () => {
    const bag = box('bag', true, world.giver);
    thing('quince', bag);
    expect(await run(await view(), 'eatish quince --top')).toBeNull();
    expect(refusal() ?? '').not.toMatch(/shut/);
  });

  it('`--deep` binds through the lid; the verb decides what that means', async () => {
    const b = box('box', false, world.giver);
    const apple = thing('quince', b);
    expect(await run(await view(), 'eatish quince --deep')).toBe(apple);
  });

  it("a slot's own `depth: top` prefers what is at hand", async () => {
    const bag = box('bag', true, world.giver);
    const inBag = thing('quince', bag);
    expect(await run(await view('top'), 'eatish quince')).not.toBe(inBag);
    const atHand = thing('quince', world.giver);
    expect(await run(await view('top'), 'eatish quince')).toBe(atHand);
  });
});
