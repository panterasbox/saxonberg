/**
 * Framework-side coverage for two cross-cutting concerns lifted out
 * of individual controllers:
 *
 *   1. `requiresHasInteractive` validator — gates subcommanded
 *      verbs whose semantics target the giver's connections.
 *   2. `CommandApi.assemble` returns `error: 'unknown-subcommand'`
 *      (not `'shape'`) when the token after the verb names a
 *      subcommand the spec doesn't declare. The dispatch chain
 *      stops and surfaces a `command-rejected` note with
 *      `reason: 'unknown-subcommand'` before any controller is
 *      cloned.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import requiresHasInteractive from '../../lib/command/validators/requiresHasInteractive';
import { CommandApi, type CommandContext } from '../command';
import { CommandDefinition } from '../../lib/command/CommandDefinition';
import { CommandLineApi } from '../command-line';
import { StuffApi } from '../stuff';
import { ContainmentApi } from '../containment';
import { CommandGiverMixin } from '../../lib/command/CommandGiver';
import { HasInteractiveMixin } from '../../lib/connection/HasInteractive';
import { ContainerMixin } from '../../lib/spatial/Container';
import { ContainableMixin } from '../../lib/spatial/Containable';
import { Idea } from '../../lib/stuff/Idea';
import { Location } from '../../lib/stuff/Location';
import { makeStuff } from '../../lib/security/__tests__/test-setup';

class TestActor extends HasInteractiveMixin(
  CommandGiverMixin(ContainerMixin(ContainableMixin(Idea))),
) {
  static _mixinName = 'TestActor';
}

class NoInteractiveActor extends CommandGiverMixin(
  ContainerMixin(ContainableMixin(Idea)),
) {
  static _mixinName = 'NoInteractiveActor';
}

function makeContext(giver: Idea, location: Idea): CommandContext {
  return CommandApi.createCommandContext({
    commandGiver: giver as CommandContext['commandGiver'],
    location: location as CommandContext['location'],
    commandText: '',
    executionId: 'test-exec',
    commandId: 'test-cmd',
    verb: 'test',
    command: undefined as unknown as CommandContext['command'],
  });
}

describe('requiresHasInteractive validator', () => {
  beforeEach(() => {
    StuffApi.clearAll();
  });

  it('passes for an actor composing HasInteractive', () => {
    const loc = makeStuff(() => new Location());
    const actor = makeStuff(() => new TestActor());
    ContainmentApi.move(actor as never, loc as never);
    expect(
      requiresHasInteractive(makeContext(actor as never, loc as never)),
    ).toBeUndefined();
  });

  it('rejects an actor without HasInteractive', () => {
    const loc = makeStuff(() => new Location());
    const actor = makeStuff(() => new NoInteractiveActor());
    ContainmentApi.move(actor as never, loc as never);
    const err = requiresHasInteractive(
      makeContext(actor as never, loc as never),
    );
    expect(err).toBeDefined();
    expect(err).toMatch(/no active connection/);
  });
});

describe('CommandApi.assemble — unknown subcommand', () => {
  function stubCmd(): CommandDefinition {
    return CommandDefinition.fromYaml(
      `verbs: [prompt]
description: stub
controller: PromptController
subcommands:
  cancel:
    description: cancel
`,
      '<test>',
    );
  }

  it('returns error: unknown-subcommand with the typed name and available list', () => {
    const loc = makeStuff(() => new Location());
    const actor = makeStuff(() => new TestActor());
    ContainmentApi.move(actor as never, loc as never);
    const cmd = stubCmd();
    const parsed = CommandLineApi.parsePipeline('prompt bogus').commands[0]!;
    const result = CommandApi.assemble(parsed, cmd, {
      commandGiver: actor as never,
      location: loc as never,
    });
    expect(result).toMatchObject({
      error: 'unknown-subcommand',
      subcommand: 'bogus',
      available: ['cancel'],
    });
  });

  it('a known subcommand assembles cleanly', () => {
    const loc = makeStuff(() => new Location());
    const actor = makeStuff(() => new TestActor());
    ContainmentApi.move(actor as never, loc as never);
    const cmd = stubCmd();
    const parsed = CommandLineApi.parsePipeline('prompt cancel').commands[0]!;
    const result = CommandApi.assemble(parsed, cmd, {
      commandGiver: actor as never,
      location: loc as never,
    });
    expect('error' in result).toBe(false);
    if (!('error' in result)) {
      expect(result.model.subcommand).toBe('cancel');
    }
  });
});
