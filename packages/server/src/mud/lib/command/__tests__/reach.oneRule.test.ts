/**
 * ⭐⭐ One rule for reach (size-and-carrying D17): the nearest thing you
 * perceive wins — hand · ready · packed · room — and the refusals fire
 * AFTER binding, in the object's words: a shut lid (*"The box is shut."*),
 * a pack on your back (*"…is on your back — take it off first."*).
 *
 * The `back` slot is W5's; it is staged here on the fixture's body plan.
 */
import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ContainmentApi } from '../../../api/containment';
import { PerceptionApi } from '../../../api/perception';
import { StuffApi } from '../../../api/stuff';
import { CommandApi, type CommandContext, type CommandModel } from '../../../api/command';
import { CommandLineApi } from '../../../api/command-line';
import { CommandDefinition } from '../CommandDefinition';
import { CommandGiverMixin } from '../CommandGiver';
import { makeStuff, stampTemplatePathForTest } from '../../security/__tests__/test-setup';
import { Creature } from '../../creature/Creature';
import Species from '../../../platform/idea/species/Species';
import BodyPlan from '../../../platform/idea/species/BodyPlan';
import Location from '../../location/Location';
import Thing from '../../../platform/thing/Thing';
import Holder from '../../stuff/Holder';
import { SealableMixin } from '../../spatial/Sealable';
import { WearableMixin } from '../../slot/Wearable';
import { WieldableMixin } from '../../slot/Wieldable';
import { SlottableMixin } from '../../slot/Slottable';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';
import type { Stuff } from '../../stuff/Stuff';
import type { Affordance } from '../CommandGiver';
import type { MqlOneResult } from '../../../api/mql';

const PLAN = '/stuff/idea/species/BodyPlan/onerule-biped';
class Person extends CommandGiverMixin(Creature) {}
class Knife extends WieldableMixin(SlottableMixin(Thing)) {}
class Bag extends SealableMixin(WearableMixin(SlottableMixin(Holder))) {}

const view = async (): Promise<CommandDefinition> => {
  const def = CommandDefinition.fromYaml(
    `
verbs: [use]
controller: NoopController
description: one-rule fixture
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

describe('reach — one rule: hand · ready · packed · room (D17)', () => {
  let room: Location;
  let me: Person;
  let models: CommandModel[];
  let last: CommandContext | null;

  const knife = (): Knife => {
    const k = makeStuff(() => new Knife());
    k.setShortDescription('a knife');
    k.setKeywords(['knife']);
    return k;
  };
  const bag = (slot: string): Bag => {
    const b = makeStuff(() => new Bag());
    b.setShortDescription(slot === 'back' ? 'a rucksack' : 'a satchel');
    b.setKeywords([slot === 'back' ? 'rucksack' : 'satchel']);
    b.setSlotClaims({ [PLAN]: [slot] });
    b.setOpen(true);
    me.seatInSlot(b, slot);
    return b;
  };

  const run = async (text: string): Promise<Stuff | null> => {
    const def = await view();
    const g = me as unknown as {
      getAffordances(): Affordance[];
      _runChain(p: unknown, o: unknown): Promise<CommandContext>;
    };
    vi.spyOn(g, 'getAffordances').mockReturnValue([{ command: def, source: me, bucket: 'self' } as Affordance]);
    const outer = CommandApi.createCommandContext({
      commandGiver: me as never,
      location: room as never,
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
    installV1QuantityMarshallers();
    const plan = makeStuff(() => new BodyPlan());
    plan.setName('onerule-biped');
    plan.setBaseMass(70);
    plan.setBaseStature(1.75);
    plan.setSlots([
      { name: 'torso', accepts: 'WearableMixin', capacity: 4, covers: ['body'] },
      { name: 'back', accepts: 'WearableMixin', capacity: 1 },
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
    stampTemplatePathForTest(species, '/stuff/idea/species/test/onerule-human');
    room = makeStuff(() => new Location());
    me = makeStuff(() => new Person());
    me.setSpecies(species);
    ContainmentApi.move(me, room);
    last = null;
    vi.spyOn(me as never, '_executeOne').mockImplementation((async (_c: CommandDefinition, model: CommandModel) => {
      models.push(model);
    }) as never);
  });
  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  it('⭐ the tiers, and reach emits them nearest first', () => {
    const rucksack = bag('back');
    const satchel = bag('torso');
    const packed = knife();
    ContainmentApi.move(packed, rucksack);
    const ready = knife();
    ContainmentApi.move(ready, satchel);
    const held = knife();
    held.setSlotClaims({ [PLAN]: ['hand:right'] });
    me.seatInSlot(held, 'hand:right');
    const floor = knife();
    ContainmentApi.move(floor, room);
    expect(me.tierOf(held)).toBe('hand');
    expect(me.tierOf(ready)).toBe('ready');
    expect(me.tierOf(packed)).toBe('packed');
    expect(me.tierOf(floor)).toBe('elsewhere');
    const order = PerceptionApi.reach(me)
      .map((r) => r.stuff)
      .filter((s) => s instanceof Knife);
    expect(order).toEqual([held, ready, packed, floor]);
  });

  it('⭐ the nearest perceived wins, one tier at a time; the pack refuses after binding', async () => {
    const rucksack = bag('back');
    const satchel = bag('torso');
    const packed = knife();
    ContainmentApi.move(packed, rucksack);
    const ready = knife();
    ContainmentApi.move(ready, satchel);
    const held = knife();
    held.setSlotClaims({ [PLAN]: ['hand:right'] });
    me.seatInSlot(held, 'hand:right');
    const floor = knife();
    ContainmentApi.move(floor, room);

    expect(await run('use knife')).toBe(held);
    ContainmentApi.move(held, room);
    me.vacateSole('hand:right');
    // The held knife now lies on the floor beside the other — the satchel's is nearer.
    expect(await run('use knife')).toBe(ready);
    ContainmentApi.move(ready, room);
    // Packed: bound (it is the nearest you perceive), then refused in words.
    expect(await run('use knife')).toBeNull();
    expect(refusal()).toMatch(/rucksack is on your back — take it off first\.$/);
    expect(packed.reachRefusal(me)?.reason).toBe('packed');
    ContainmentApi.move(packed, room);
    expect(await run('use knife')).toBe(floor);
  });

  it('⭐ the lid refuses after binding: a knife in your shut satchel', async () => {
    const satchel = bag('torso');
    const k = knife();
    ContainmentApi.move(k, satchel);
    satchel.setOpen(false);
    expect(await run('use knife')).toBeNull();
    expect(refusal()).toMatch(/satchel is shut\.$/);
  });
});
