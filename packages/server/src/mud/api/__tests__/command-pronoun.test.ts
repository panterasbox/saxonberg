/**
 * Dispatcher × pronoun memory integration tests.
 *
 * Drives `CommandApi.resolveAndValidate` against a small in-memory
 * world to verify:
 *
 *   - Successful resolution populates the giver's pronoun memory.
 *   - Gender routing lands he/she/they/it stuff in the right slot.
 *   - Multi-cardinality results route to `them`.
 *   - Subsequent queries with `it`/`him`/...  resolve through the
 *     stash.
 *   - Dynamic-pronoun queries that fire `updates_scope: true`
 *     substitute the original fragment for the pronoun string when
 *     setting the giver's scope.
 *
 * Lower-level tests (the stash class itself) live in
 * `mql/__tests__/pronoun-memory.test.ts`; the resolver-side seed
 * read is covered in `mql.test.ts`.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Pronouns } from '@saxonberg/types';
import { CommandApi, type CommandContext } from '../command';
import type { MqlOne } from '../mql';
import { CommandDefinition } from '../../lib/command/CommandDefinition';
import { ContainmentApi } from '../containment';
import { Idea } from '../../lib/stuff/Idea';
import { ContainableMixin } from '../../lib/spatial/Containable';
import { ContainerMixin } from '../../lib/spatial/Container';
import { CommandGiverMixin } from '../../lib/command/CommandGiver';
import { GenderedMixin } from '../../lib/character/Gendered';
import { NamedMixin } from '../../lib/description/Named';
import { PerceptibleMixin } from '../../lib/description/Perceptible';
import { StuffApi } from '../stuff';
import { makeStuff } from '../../lib/security/__tests__/test-setup';
import type { Location } from '../../lib/stuff/Location';
import type { Interactive } from '../../obj/Interactive';

class TestLocation extends ContainerMixin(NamedMixin(PerceptibleMixin(Idea))) {}
class TestThing extends ContainableMixin(NamedMixin(PerceptibleMixin(Idea))) {}
class TestPerson extends GenderedMixin(
  ContainableMixin(NamedMixin(PerceptibleMixin(Idea)))
) {}
class TestGiver extends ContainerMixin(
  ContainableMixin(CommandGiverMixin(NamedMixin(PerceptibleMixin(Idea))))
) {}

function lookCommand(): CommandDefinition {
  // `look`-shaped: single-cardinality MQL field, scope = "inventory,
  // here", updates_scope true. Mirrors the production cmd/look.yaml.
  return CommandDefinition.fromYaml(
    [
      'verbs: [look]',
      'controller: LookController',
      'description: examine',
      'args:',
      '  - name: target',
      '    type: object',
      '    required: false',
      '    scope: "inventory, here"',
      '    updates_scope: true',
    ].join('\n'),
    '<test>'
  );
}

function makeContext(
  giver: TestGiver,
  location: Location,
  command: CommandDefinition,
  text: string
): CommandContext {
  return {
    commandGiver: giver as unknown as CommandContext['commandGiver'],
    interactive: {} as Interactive,
    location,
    commandText: text,
    executionId: 'test-exec',
    commandId: 'test-cmd',
    verb: command.getPrimaryVerb(),
    command,
  };
}

describe('Dispatcher pronoun-memory integration', () => {
  let location: TestLocation;
  let giver: TestGiver;
  let bob: TestPerson;
  let alice: TestPerson;
  let kim: TestPerson;
  let rose: TestThing;
  let daisy: TestThing;
  let apple: TestThing;

  beforeEach(() => {
    StuffApi.clearAll();

    location = makeStuff(() => new TestLocation()) as TestLocation;
    location.setName('Town Square');

    giver = makeStuff(() => new TestGiver()) as TestGiver;
    giver.setName('player');
    ContainmentApi.move(
      giver as unknown as Parameters<typeof ContainmentApi.move>[0],
      location as unknown as Parameters<typeof ContainmentApi.move>[1]
    );

    // Gendered NPCs in the room.
    bob = makeStuff(() => new TestPerson()) as TestPerson;
    bob.setName('bob');
    bob.setPronouns(Pronouns.He);
    ContainmentApi.move(
      bob as unknown as Parameters<typeof ContainmentApi.move>[0],
      location as unknown as Parameters<typeof ContainmentApi.move>[1]
    );

    alice = makeStuff(() => new TestPerson()) as TestPerson;
    alice.setName('alice');
    alice.setPronouns(Pronouns.She);
    ContainmentApi.move(
      alice as unknown as Parameters<typeof ContainmentApi.move>[0],
      location as unknown as Parameters<typeof ContainmentApi.move>[1]
    );

    kim = makeStuff(() => new TestPerson()) as TestPerson;
    kim.setName('kim');
    kim.setPronouns(Pronouns.They);
    ContainmentApi.move(
      kim as unknown as Parameters<typeof ContainmentApi.move>[0],
      location as unknown as Parameters<typeof ContainmentApi.move>[1]
    );

    // Plain Things in the room.
    rose = makeStuff(() => new TestThing()) as TestThing;
    rose.setName('rose');
    (rose as unknown as { addKeyword: (k: string) => void }).addKeyword('flower');
    ContainmentApi.move(
      rose as unknown as Parameters<typeof ContainmentApi.move>[0],
      location as unknown as Parameters<typeof ContainmentApi.move>[1]
    );

    daisy = makeStuff(() => new TestThing()) as TestThing;
    daisy.setName('daisy');
    (daisy as unknown as { addKeyword: (k: string) => void }).addKeyword('flower');
    ContainmentApi.move(
      daisy as unknown as Parameters<typeof ContainmentApi.move>[0],
      location as unknown as Parameters<typeof ContainmentApi.move>[1]
    );

    apple = makeStuff(() => new TestThing()) as TestThing;
    apple.setName('apple');
    ContainmentApi.move(
      apple as unknown as Parameters<typeof ContainmentApi.move>[0],
      giver as unknown as Parameters<typeof ContainmentApi.move>[1]
    );
  });

  it('non-Gendered single-stuff result lands in the it slot', () => {
    const cmd = lookCommand();
    const ctx = makeContext(giver, location as unknown as Location, cmd, 'look rose');
    CommandApi.resolveAndValidate({ target: 'rose' }, ctx);
    expect(giver.getPronounMemory().read('it')!.stuff).toEqual([rose]);
    expect(giver.getPronounMemory().readFragment('it')).toBe('rose');
  });

  it('he/him stuff lands in the him slot', () => {
    const cmd = lookCommand();
    const ctx = makeContext(giver, location as unknown as Location, cmd, 'look bob');
    CommandApi.resolveAndValidate({ target: 'bob' }, ctx);
    expect(giver.getPronounMemory().read('him')!.stuff).toEqual([bob]);
    expect(giver.getPronounMemory().read('it')).toBeNull();
  });

  it('she/her stuff lands in the her slot', () => {
    const cmd = lookCommand();
    const ctx = makeContext(giver, location as unknown as Location, cmd, 'look alice');
    CommandApi.resolveAndValidate({ target: 'alice' }, ctx);
    expect(giver.getPronounMemory().read('her')!.stuff).toEqual([alice]);
  });

  it('they/them stuff lands in the them slot', () => {
    const cmd = lookCommand();
    const ctx = makeContext(giver, location as unknown as Location, cmd, 'look kim');
    CommandApi.resolveAndValidate({ target: 'kim' }, ctx);
    expect(giver.getPronounMemory().read('them')!.stuff).toEqual([kim]);
  });

  it('multi-cardinality results route to them and last only', () => {
    // `examine`-shaped command with `type: objects` so the
    // dispatcher's resolveMany branch fires. 'flower' matches both
    // rose and daisy via the shared keyword.
    const cmd = CommandDefinition.fromYaml(
      [
        'verbs: [examine]',
        'controller: ExamineController',
        'description: examine many',
        'args:',
        '  - name: targets',
        '    type: objects',
        '    required: true',
        '    greedy: true',
        '    scope: here',
      ].join('\n'),
      '<test>'
    );
    CommandApi.resolveAndValidate(
      { targets: 'flower' },
      makeContext(giver, location as unknown as Location, cmd, 'examine flower')
    );
    expect(
      giver
        .getPronounMemory()
        .read('them')!
        .stuff.map((s) => s.stuffId)
        .sort()
    ).toEqual([rose.stuffId, daisy.stuffId].sort());
    expect(giver.getPronounMemory().read('last')!.stuff.length).toBe(2);
    expect(giver.getPronounMemory().read('it')).toBeNull();
  });

  it('it resolves through the stash on a follow-up query', () => {
    const cmd = lookCommand();
    CommandApi.resolveAndValidate(
      { target: 'rose' },
      makeContext(giver, location as unknown as Location, cmd, 'look rose')
    );
    // Now `look it` — the dispatcher resolves "it" through the
    // stash and binds rose as the target.
    const ctx2 = makeContext(
      giver,
      location as unknown as Location,
      cmd,
      'look it'
    );
    const r = CommandApi.resolveAndValidate({ target: 'it' }, ctx2);
    expect('resolved' in r).toBe(true);
    if ('resolved' in r) {
      const target = r.resolved.target as MqlOne;
      expect(target.stuff).toBe(rose);
    }
  });

  it("look it after look rose anchors scope to 'rose', not 'it'", () => {
    const cmd = lookCommand();
    CommandApi.resolveAndValidate(
      { target: 'rose' },
      makeContext(giver, location as unknown as Location, cmd, 'look rose')
    );
    expect(giver.getScope()).toBe('rose');

    // `look it` — updates_scope: true fires. The dispatcher should
    // substitute the stored fragment ("rose"), NOT use "it".
    CommandApi.resolveAndValidate(
      { target: 'it' },
      makeContext(giver, location as unknown as Location, cmd, 'look it')
    );
    expect(giver.getScope()).toBe('rose');
  });

  it('two distinct CommandGivers do not share their stashes', () => {
    const otherGiver = makeStuff(() => new TestGiver()) as TestGiver;
    otherGiver.setName('other');
    ContainmentApi.move(
      otherGiver as unknown as Parameters<typeof ContainmentApi.move>[0],
      location as unknown as Parameters<typeof ContainmentApi.move>[1]
    );

    const cmd = lookCommand();
    CommandApi.resolveAndValidate(
      { target: 'rose' },
      makeContext(giver, location as unknown as Location, cmd, 'look rose')
    );
    CommandApi.resolveAndValidate(
      { target: 'bob' },
      makeContext(otherGiver, location as unknown as Location, cmd, 'look bob')
    );

    expect(giver.getPronounMemory().read('it')!.stuff).toEqual([rose]);
    expect(giver.getPronounMemory().read('him')).toBeNull();
    expect(otherGiver.getPronounMemory().read('him')!.stuff).toEqual([bob]);
    expect(otherGiver.getPronounMemory().read('it')).toBeNull();
  });

  it('input that is itself a pronoun does not overwrite the stored fragment', () => {
    const cmd = lookCommand();
    CommandApi.resolveAndValidate(
      { target: 'rose' },
      makeContext(giver, location as unknown as Location, cmd, 'look rose')
    );
    expect(giver.getPronounMemory().readFragment('it')).toBe('rose');
    // Now `look it` — fragment for `it` should still be "rose", not
    // "it" (preserving the original anchor).
    CommandApi.resolveAndValidate(
      { target: 'it' },
      makeContext(giver, location as unknown as Location, cmd, 'look it')
    );
    expect(giver.getPronounMemory().readFragment('it')).toBe('rose');
  });
});
