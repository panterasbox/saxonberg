/**
 * Framework-side coverage for the cross-cutting concerns lifted out
 * of individual controllers:
 *
 *   1. Per-mixin validators — `requiresHasInteractive`,
 *      `requiresEnvironment`, `requiresAlias`, `requiresAvatar` —
 *      gate verbs whose semantics depend on the giver composing a
 *      specific surface. Each surfaces a `validator-failed` note
 *      with a player-facing message; the controller is never
 *      cloned.
 *   2. `CommandApi.assemble` returns `error: 'unknown-subcommand'`
 *      (not `'shape'`) when the token after the verb names a
 *      subcommand the spec doesn't declare. The dispatch chain
 *      stops and surfaces a `command-rejected` note with
 *      `reason: 'unknown-subcommand'` before any controller is
 *      cloned.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import requiresHasInteractive from '../../lib/command/validators/requiresHasInteractive';
import requiresEnvironment from '../../lib/command/validators/requiresEnvironment';
import requiresAlias from '../../lib/command/validators/requiresAlias';
import requiresAvatar from '../../lib/command/validators/requiresAvatar';
import { CommandApi, type CommandContext } from '../command';
import { CommandDefinition } from '../../lib/command/CommandDefinition';
import { CommandLineApi } from '../command-line';
import { StuffApi } from '../stuff';
import { ContainmentApi } from '../containment';
import { CommandGiverMixin } from '../../lib/command/CommandGiver';
import { HasInteractiveMixin } from '../../lib/connection/HasInteractive';
import { EnvironmentMixin } from '../../lib/shell/Environment';
import { AliasMixin } from '../../lib/shell/Alias';
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

class EnvActor extends EnvironmentMixin(
  CommandGiverMixin(ContainerMixin(ContainableMixin(Idea))),
) {
  static _mixinName = 'EnvActor';
}

class AliasActor extends AliasMixin(
  CommandGiverMixin(ContainerMixin(ContainableMixin(Idea))),
) {
  static _mixinName = 'AliasActor';
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
    expect(err).toMatch(/this character/);
  });
});

describe('requiresEnvironment validator', () => {
  beforeEach(() => {
    StuffApi.clearAll();
  });

  it('passes for an actor composing Environment', () => {
    const loc = makeStuff(() => new Location());
    const actor = makeStuff(() => new EnvActor());
    ContainmentApi.move(actor as never, loc as never);
    expect(
      requiresEnvironment(makeContext(actor as never, loc as never)),
    ).toBeUndefined();
  });

  it('rejects an actor without Environment', () => {
    const loc = makeStuff(() => new Location());
    const actor = makeStuff(() => new NoInteractiveActor());
    ContainmentApi.move(actor as never, loc as never);
    const err = requiresEnvironment(
      makeContext(actor as never, loc as never),
    );
    expect(err).toBeDefined();
    expect(err).toMatch(/no session storage/);
  });
});

describe('requiresAlias validator', () => {
  beforeEach(() => {
    StuffApi.clearAll();
  });

  it('passes for an actor composing Alias', () => {
    const loc = makeStuff(() => new Location());
    const actor = makeStuff(() => new AliasActor());
    ContainmentApi.move(actor as never, loc as never);
    expect(
      requiresAlias(makeContext(actor as never, loc as never)),
    ).toBeUndefined();
  });

  it('rejects an actor without Alias', () => {
    const loc = makeStuff(() => new Location());
    const actor = makeStuff(() => new NoInteractiveActor());
    ContainmentApi.move(actor as never, loc as never);
    const err = requiresAlias(
      makeContext(actor as never, loc as never),
    );
    expect(err).toBeDefined();
    expect(err).toMatch(/no aliases/);
  });
});

describe('requiresAvatar validator', () => {
  beforeEach(() => {
    StuffApi.clearAll();
  });

  it('rejects a non-Avatar giver', () => {
    const loc = makeStuff(() => new Location());
    const actor = makeStuff(() => new NoInteractiveActor());
    ContainmentApi.move(actor as never, loc as never);
    const err = requiresAvatar(
      makeContext(actor as never, loc as never),
    );
    expect(err).toBeDefined();
    expect(err).toMatch(/not a player character/);
  });
  // Avatar happy-path coverage is integration-only (Avatar boot
  // requires the species clade chain to be present). The
  // PlayerController tests exercise the live path end-to-end.
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
