/**
 * ⭐⭐ The binder binds only what the giver PERCEIVES (size-and-carrying
 * D23). MQL names Ruth's pocket knife for everybody; the binder filters
 * each scope try through `PerceptionApi.perceived` BEFORE the cardinality
 * policy and the head ordinal, so:
 *
 *   - "the knife" with one in Ruth's hand and one in her pocket binds the
 *     hand's and never asks *which one?*;
 *   - `2nd knife` counts only the knives the giver perceives;
 *   - with none perceived it fails exactly as for a Ruth with no knife;
 *   - a concealed trap MQL names reaches no binding.
 */
import '../../../../test-bootstrap';
import Garment from '../../../platform/thing/equipment/Garment';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ContainmentApi } from '../../../api/containment';
import { CommandApi, type CommandContext, type CommandModel } from '../../../api/command';
import { CommandLineApi } from '../../../api/command-line';
import { MqlApi } from '../../../api/mql';
import { CommandDefinition } from '../CommandDefinition';
import { makeStuff, stampTemplatePathForTest } from '../../security/__tests__/test-setup';
import { makeWorld, type MqlWorld } from '../../../api/__tests__/fixtures/mql-world';
import { Creature } from '../../creature/Creature';
import Species from '../../../platform/idea/species/Species';
import BodyPlan from '../../../platform/idea/species/BodyPlan';
import Thing from '../../../platform/thing/Thing';
import { WieldableMixin } from '../../slot/Wieldable';
import { SlottableMixin } from '../../slot/Slottable';
import { ConcealableMixin } from '../../concealment/Concealable';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';
import type { Stuff } from '../../stuff/Stuff';
import type { Affordance } from '../CommandGiver';
import type { MqlOneResult } from '../../../api/mql';

const PLAN = '/stuff/idea/species/BodyPlan/binder-biped';
class Knife extends WieldableMixin(SlottableMixin(Thing)) {}
class Trap extends ConcealableMixin(Thing) {}

const view = async (scope: string): Promise<CommandDefinition> => {
  const def = CommandDefinition.fromYaml(
    `
verbs: [grab]
controller: NoopController
description: binder fixture
args:
  - name: target
    type: object
    scope: ${JSON.stringify(scope)}
    required: true
    requires: VisibleMixin
    onExcess: error
`,
    '<test>',
  );
  await CommandApi.resolveValidators(def);
  return def;
};

describe('the binder binds what the giver perceives (D23)', () => {
  let world: MqlWorld;
  let ruth: Creature;
  let models: CommandModel[];
  let last: CommandContext | null;

  const knife = (): Knife => {
    const k = makeStuff(() => new Knife());
    k.setShortDescription('a knife');
    k.setKeywords(['knife']);
    k.setSlotClaims({ [PLAN]: ['hand:right'] });
    return k;
  };
  const inHand = (k: Knife, slot: string): Knife => {
    k.setSlotClaims({ [PLAN]: [slot] });
    ruth.seatInSlot(k, slot);
    return k;
  };
  let coat: Garment;
  /** Her coat's inner pocket — covered (D26): hers to know, not ours. */
  const inPocket = (k: Knife): Knife => {
    ContainmentApi.move(k, coat, 'inner pocket');
    return k;
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
  const kinds = (): string[] => (last?.getNotes() ?? []).map((n) => `${n.kind}:${(n as { validator?: string }).validator ?? ''}`);

  beforeEach(async () => {
    installV1QuantityMarshallers();
    world = makeWorld();
    last = null;
    const plan = makeStuff(() => new BodyPlan());
    plan.setName('binder-biped');
    plan.setBaseMass(70);
    plan.setBaseStature(1.75);
    plan.setSlots([
      { name: 'torso', accepts: 'WearableMixin', capacity: 2, covers: ['body'] },
      { name: 'hand:left', accepts: 'WieldableMixin', bodyPart: 'body.hand.left' },
      { name: 'hand:right', accepts: 'WieldableMixin', bodyPart: 'body.hand.right' },
    ]);
    plan.setBodyParts([
      { key: 'body', parent: null, tissues: [] },
      { key: 'body.hand.left', parent: 'body', tissues: [], serves: ['manipulation'] },
      { key: 'body.hand.right', parent: 'body', tissues: [], serves: ['manipulation'] },
    ]);
    stampTemplatePathForTest(plan, PLAN);
    const species = makeStuff(() => new Species());
    species.setBodyPlan(plan);
    stampTemplatePathForTest(species, '/stuff/idea/species/test/binder-human');
    ruth = makeStuff(() => new Creature());
    ruth.setSpecies(species);
    ruth.setShortDescription('Ruth');
    ruth.setKeywords(['ruth']);
    ContainmentApi.move(ruth, world.location as never);
    coat = makeStuff(() => new Garment());
    coat.setShortDescription('a coat');
    await coat.setPlacements([{ member: '/platform/placements/in', name: 'inner pocket', covered: true }]);
    coat.setSlotClaims({ [PLAN]: ['torso'] });
    ruth.seatInSlot(coat, 'torso');
    vi.spyOn(world.giver as never, '_executeOne').mockImplementation((async (
      _c: CommandDefinition,
      model: CommandModel,
    ) => {
      models.push(model);
    }) as never);
  });
  afterEach(() => vi.restoreAllMocks());

  it('⭐ one knife in her hand, one in her pocket: the hand’s binds, and nothing asks which', async () => {
    const held = inHand(knife(), 'hand:right');
    inPocket(knife());
    const def = await view('ruth');
    // MQL names both — for everyone. ⭐ The pocketed one is her COAT's
    // contents (W9), so it is named from outside one level down, as the
    // room's crate is: `ruth:inventory` reaches into the open coat.
    const named = MqlApi.resolveMany('knife', { commandGiver: world.giver, scope: 'ruth:inventory' }).stuff;
    expect(named.filter((s) => s instanceof Knife)).toHaveLength(2);
    expect(await run(def, 'grab knife')).toBe(held);
    expect(kinds().some((k) => k.startsWith('validator-failed:cardinality'))).toBe(false);
  });

  it('⭐ `2nd knife` counts only the knives the giver perceives', async () => {
    const first = inHand(knife(), 'hand:right');
    inPocket(knife()); // in her coat — never counted
    const second = inHand(knife(), 'hand:left');
    const def = await view('ruth');
    expect(await run(def, 'grab first knife')).toBe(first);
    expect(await run(def, 'grab 2nd knife')).toBe(second);
  });

  it('with none perceived it fails exactly as for a Ruth with no knife', async () => {
    const def = await view('ruth');
    expect(await run(def, 'grab knife')).toBeNull();
    const without = kinds();
    inPocket(knife());
    expect(await run(def, 'grab knife')).toBeNull();
    expect(kinds()).toEqual(without);
  });

  it('⛔ a concealed trap MQL names reaches no binding', async () => {
    const trap = makeStuff(() => new Trap());
    trap.setShortDescription('a snare');
    trap.setKeywords(['snare']);
    trap.setConcealment('hidden');
    ContainmentApi.move(trap, world.location as never);
    expect(MqlApi.resolveMany('snare', { commandGiver: world.giver, scope: 'reachable' }).stuff).toContain(trap);
    // The controller gets the empty binding it gets for a word nothing
    // answers to — the trap is never handed over.
    expect(await run(await view('reachable'), 'grab snare')).toBeNull();
    expect(models.every((m) => (m.target as MqlOneResult | undefined)?.stuff == null)).toBe(true);
  });
});
