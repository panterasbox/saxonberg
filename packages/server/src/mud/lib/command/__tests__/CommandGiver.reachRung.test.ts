/**
 * ⭐⭐ The binder's ONE rule for reach (size-and-carrying D17, rewritten
 * from controller-liquidity D4/D6's rungs). The nearest thing the giver
 * perceives wins — at hand before in a bag; the whole carried tree is in
 * play, a shut box's contents included; and the refusal fires AFTER
 * binding, from the `canReach` validator in the object's own words
 * (*"A box is shut."*). ⚠ Meaning changed: `--top`/`--deep` and `depth:`
 * are gone (a reserved-flag token is no longer stripped), and the shut-box
 * refusal is the validator's, not a second binder walk.
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

const view = async (): Promise<CommandDefinition> => {
  const def = CommandDefinition.fromYaml(
    `
verbs: [eatish]
controller: NoopController
description: reach fixture
args:
  - name: target
    type: object
    scope: reachable
    required: true
    requires: VisibleMixin
    validators:
      - /lib/command/validators/canReach
`,
    '<test>',
  );
  await CommandApi.resolveValidators(def);
  return def;
};

describe('the binder binds by one rule; the verb refuses after', () => {
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

  it('⭐ binds the quince in the open bag you carry', async () => {
    const bag = box('bag', true, world.giver);
    const apple = thing('quince', bag);
    expect(await run(await view(), 'eatish quince')).toBe(apple);
  });

  it('⭐ the quince in a shut box you carry is BOUND, then refused: "the box is shut"', async () => {
    const b = box('box', false, world.giver);
    thing('quince', b);
    expect(await run(await view(), 'eatish quince')).toBeNull();
    expect(models).toHaveLength(0);
    expect(refusal()).toMatch(/box is shut\.$/);
  });

  it('⭐ the nearest wins: the quince at hand before the one in the bag', async () => {
    const bag = box('bag', true, world.giver);
    thing('quince', bag);
    const atHand = thing('quince', world.giver);
    expect(await run(await view(), 'eatish quince')).toBe(atHand);
  });

  it('⭐ the quince in an open crate standing here binds; one in a shut chest here is not perceived, so nothing binds', async () => {
    const crate = box('crate', true, world.location as unknown as Stuff);
    const inCrate = thing('quince', crate);
    expect(await run(await view(), 'eatish quince')).toBe(inCrate);
    ContainmentApi.move(inCrate as never, world.giver as never);
    const chest = box('chest', false, world.location as unknown as Stuff);
    thing('pear', chest);
    expect(await run(await view(), 'eatish pear')).toBeNull();
  });
});
