/**
 * ⭐ `search <body>` finds what its pockets cover (size-and-carrying D24a).
 *
 * A dead or unconscious body cannot resist: a completed search records
 * every item its clothes cover as FOUND by the searcher, on that body
 * (`BeliefPayload.foundOn`), so perception admits it — for this searcher
 * only, and only while that body still holds it. An interrupted search
 * finds nothing. A conscious body refuses before anything starts.
 */
import '../../../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import SearchController from '../SearchController';
import { PerceptionApi } from '../../../../../api/perception';
import { MessageApi } from '../../../../../api/message';
import { SchedulerApi } from '../../../../../api/scheduler';
import { WorldClockApi } from '../../../../../api/worldclock';
import { StuffApi } from '../../../../../api/stuff';
import { ContainmentApi } from '../../../../../api/containment';
import { EventApi } from '../../../../../api/event';
import EventRegistry from '../../../EventRegistry';
import { CommandApi, type CommandContext } from '../../../../../api/command';
import { CommandDefinition } from '../../../../../lib/command/CommandDefinition';
import { Idea } from '../../../../../lib/stuff/Idea';
import { Stuff } from '../../../../../lib/stuff/Stuff';
import { ContainerMixin } from '../../../../../lib/spatial/Container';
import { ContainableMixin } from '../../../../../lib/spatial/Containable';
import { SensorMixin } from '../../../../../lib/message/Sensor';
import { EngagedMixin } from '../../../../../lib/activity/Engaged';
import { CommandGiverMixin } from '../../../../../lib/command/CommandGiver';
import { BeliefStoreMixin } from '../../../../../lib/belief/BeliefStore';
import { Creature } from '../../../../../lib/creature/Creature';
import Corpse from '../../../../thing/Corpse';
import Species from '../../../species/Species';
import BodyPlan from '../../../species/BodyPlan';
import Thing from '../../../../thing/Thing';
import { makeStuff, makeStuffAtPath, stampTemplatePathForTest } from '../../../../../lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../../../../lib/persistence/__tests__/quantity-marshaller-test-helpers';

class Room extends ContainerMixin(ContainableMixin(Idea)) {}
class Searcher extends BeliefStoreMixin(
  EngagedMixin(CommandGiverMixin(SensorMixin(ContainerMixin(ContainableMixin(Idea))))),
) {
  protected handleMessage(): void {}
  protected handleEnvelope(): void {}
}

const noop = (): CommandDefinition =>
  CommandDefinition.fromYaml(`verbs: [search]\ncontroller: NoopController\ndescription: stub\n`, '<test>');

describe('search <body> — what the pockets cover (D24a)', () => {
  let room: Room;
  let mara: Searcher;
  let other: Searcher;
  let corpse: Corpse;
  let letter: Thing;
  let species: Species;
  let said: string[];

  const ctx = (actor: Searcher): CommandContext =>
    CommandApi.createCommandContext({
      commandGiver: actor as never,
      location: room as never,
      commandText: 'search corpse',
      executionId: 'test',
      commandId: 'test',
      verb: 'search',
      command: noop(),
    });
  const search = async (actor: Searcher, body: Stuff): Promise<void> => {
    const controller = makeStuff(() => new SearchController());
    await controller.execute({ target: { stuff: body, raw: 'corpse' } } as never, ctx(actor));
  };
  const finish = async (): Promise<void> => {
    WorldClockApi._advanceForTesting(6000);
    await new Promise((r) => setTimeout(r, 0));
  };

  beforeEach(async () => {
    installV1QuantityMarshallers();
    WorldClockApi._resetForTesting();
    WorldClockApi.setScale(1);
    WorldClockApi._setNowProviderForTesting(() => 1000);
    SchedulerApi._clearAllForTesting();
    StuffApi.clearAll();
    const reg = await StuffApi.create(() => {
      const r = new EventRegistry();
      Stuff._stampTemplatePath(r, '/platform/idea/EventRegistry');
      return r;
    });
    StuffApi.unregister(reg);
    StuffApi.register(reg);
    EventApi._setRegistryForTesting(reg);
    said = [];
    vi.spyOn(MessageApi, 'scene').mockImplementation(() => {
      const b: Record<string, unknown> = {};
      b.topic = () => b;
      b.toSelf = (m: unknown) => {
        said.push(String(m));
        return b;
      };
      b.toPeers = () => b;
      b.send = () => undefined;
      return b as never;
    });

    const plan = makeStuff(() => new BodyPlan());
    plan.setName('search-biped');
    plan.setBaseMass(70);
    plan.setBaseStature(1.75);
    plan.setSlots([{ name: 'torso', accepts: 'WearableMixin', capacity: 4, covers: ['body'] }]);
    plan.setBodyParts([{ key: 'body', parent: null, tissues: [] }]);
    stampTemplatePathForTest(plan, '/stuff/idea/species/BodyPlan/search-biped');
    species = makeStuff(() => new Species());
    species.setBodyPlan(plan);
    stampTemplatePathForTest(species, '/stuff/idea/species/test/search-human');

    room = makeStuff(() => new Room());
    mara = makeStuff(() => new Searcher());
    other = makeStuff(() => new Searcher());
    ContainmentApi.move(mara as never, room as never);
    ContainmentApi.move(other as never, room as never);
    corpse = makeStuffAtPath(() => new Corpse(), '/test/search/corpse');
    corpse.setSpecies(species);
    ContainmentApi.move(corpse as never, room as never);
    letter = makeStuffAtPath(() => new Thing(), '/test/search/letter');
    letter.setShortDescription('a letter');
    ContainmentApi.move(letter, corpse as never);
  });
  afterEach(() => {
    SchedulerApi._clearAllForTesting();
    WorldClockApi._resetForTesting();
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  it('⭐ unseen → searched → found (and takeable by sight); a second viewer still does not see it', async () => {
    expect(PerceptionApi.perceives(mara, letter)).toBe(false);
    await search(mara, corpse);
    await finish();
    expect(PerceptionApi.perceives(mara, letter)).toBe(true);
    expect(said.join('\n')).toMatch(/turns up/);
    expect(PerceptionApi.perceives(other, letter)).toBe(false);
  });

  it('⭐ moved to another holder, the find is inert', async () => {
    await search(mara, corpse);
    await finish();
    expect(PerceptionApi.perceives(mara, letter)).toBe(true);
    const bob = makeStuffAtPath(() => new Creature(), '/test/search/bob');
    bob.setSpecies(species);
    ContainmentApi.move(bob, room as never);
    ContainmentApi.move(letter, bob);
    expect(PerceptionApi.perceives(mara, letter)).toBe(false);
  });

  it('an interrupted search finds nothing', async () => {
    await search(mara, corpse);
    SchedulerApi.cancelAll(mara as never);
    await finish();
    expect(PerceptionApi.perceives(mara, letter)).toBe(false);
  });

  it('⛔ a conscious body refuses before anything starts', async () => {
    const bob = makeStuffAtPath(() => new Creature(), '/test/search/bob-awake');
    bob.setSpecies(species);
    ContainmentApi.move(bob, room as never);
    ContainmentApi.move(letter, bob);
    expect(bob.searchRefusal(mara)?.reason).toBe('resists');
    await search(mara, bob);
    expect(said.join('\n')).toMatch(/won't let you/);
    await finish();
    expect(PerceptionApi.perceives(mara, letter)).toBe(false);
  });
});
