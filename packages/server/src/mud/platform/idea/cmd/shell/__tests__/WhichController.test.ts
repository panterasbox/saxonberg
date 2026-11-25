/**
 * `which <thing>` naming nothing within reach is REFUSED, never read as no
 * name at all. Found by the which walk: the card's row for the cat next door
 * sent `which cat`, the binder found no cat in reach, and the reply was the
 * whole list, as though `which` had been typed bare.
 */
import '../../../../../../test-bootstrap';
import { describe, it, expect, afterEach, vi } from 'vitest';
import WhichController from '../WhichController';
import Place from '../../../../../lib/stuff/Place';
import { CommandGiverMixin } from '../../../../../lib/command/CommandGiver';
import { SensorMixin } from '../../../../../lib/message/Sensor';
import { ContainableMixin } from '../../../../../lib/spatial/Containable';
import { ContainerMixin } from '../../../../../lib/spatial/Container';
import { NamedMixin } from '../../../../../lib/description/Named';
import { CommandDefinition } from '../../../../../lib/command/CommandDefinition';
import { Idea } from '../../../../../lib/stuff/Idea';
import { StuffApi } from '../../../../../api/stuff';
import { ContainmentApi } from '../../../../../api/containment';
import { makeStuff } from '../../../../../lib/security/__tests__/test-setup';
import { CommandApi, type CommandContext } from '../../../../../api/command';
import type { MqlOneResult } from '../../../../../api/mql';
import { TestHarnessApi } from '../../../../../api/test-harness';

class Person extends CommandGiverMixin(NamedMixin(ContainerMixin(SensorMixin(ContainableMixin(Idea))))) {}

function ctx(p: Person): CommandContext {
  return CommandApi.createCommandContext({
    commandGiver: p as unknown as CommandContext['commandGiver'],
    location: null,
    commandText: 'which cat',
    executionId: 't',
    commandId: 'c',
    verb: 'which',
    command: CommandDefinition.fromYaml('verbs: [which]\ncontroller: NoopController\ndescription: stub\n', '<test>'),
  });
}

describe('which <thing>', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  it('a name that bound nothing in reach is refused, and the read is never asked', async () => {
    const room = makeStuff(() => new Place());
    const person = makeStuff(() => new Person());
    ContainmentApi.move(person as never, room as never);
    const read = vi.spyOn(CommandApi, 'which');
    const c = ctx(person);
    const thing = { raw: 'cat', stuff: null } as unknown as MqlOneResult;
    await TestHarnessApi.actAs(c.commandGiver, () => makeStuff(() => new WhichController()).execute({ thing } as never, c));
    const refused = c.getNotes().find((n) => n.kind === 'refused');
    expect(refused).toMatchObject({ reason: 'not-in-reach' });
    expect(JSON.stringify(refused)).toMatch(/cat/);
    expect(read).not.toHaveBeenCalled();
  });
});
