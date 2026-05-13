/**
 * Dispatcher × empty-resolution behavior.
 *
 * `resolveAndValidate` no longer short-circuits on MQL no-match.
 * Empty results pass through to the controller — `null` for a
 * `type: object` field and `[]` for `type: objects`. The controller
 * decides what no-match means in its domain (e.g. open/close
 * produce "you don't see any X here"; focus accepts the empty
 * result as a valid future scope).
 *
 * The dispatcher also stamps `ctx.raw[fname]` with the player-typed
 * text before MQL replaces the model field with resolved Stuff(s),
 * so controllers whose job is text-side (focus) can recover the
 * original input.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  CommandApi,
  type CommandContext,
} from '../command';
import type { MqlOneResult, MqlManyResult } from '../mql';
import { CommandDefinition } from '../../lib/command/CommandDefinition';
import { ContainmentApi } from '../containment';
import { Idea } from '../../lib/stuff/Idea';
import { ContainableMixin } from '../../lib/spatial/Containable';
import { ContainerMixin } from '../../lib/spatial/Container';
import { CommandGiverMixin } from '../../lib/command/CommandGiver';
import { FocusedMixin } from '../../lib/command/Focused';
import { NamedMixin } from '../../lib/description/Named';
import { PerceptibleMixin } from '../../lib/description/Perceptible';
import { StuffApi } from '../stuff';
import { makeStuff } from '../../lib/security/__tests__/test-setup';
import type { Location } from '../../lib/stuff/Location';
import type { Interactive } from '../../obj/Interactive';

class TestLocation extends ContainerMixin(NamedMixin(PerceptibleMixin(Idea))) {}
class TestThing extends ContainableMixin(NamedMixin(PerceptibleMixin(Idea))) {}
class TestGiver extends ContainerMixin(
  ContainableMixin(
    FocusedMixin(CommandGiverMixin(NamedMixin(PerceptibleMixin(Idea))))
  )
) {}

function singleObjectCmd(): CommandDefinition {
  return CommandDefinition.fromYaml(
    [
      'verbs: [look]',
      'controller: LookController',
      'description: look',
      'args:',
      '  - name: target',
      '    type: object',
      '    required: false',
      '    scope: "reachable"',
      '    updates_focus: extend',
    ].join('\n'),
    '<test>'
  );
}

function pluralObjectsCmd(): CommandDefinition {
  return CommandDefinition.fromYaml(
    [
      'verbs: [drop]',
      'controller: DropController',
      'description: drop',
      'args:',
      '  - name: targets',
      '    type: objects',
      '    required: true',
      '    greedy: true',
      '    scope: inventory',
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
  return CommandApi.createCommandContext({
    commandGiver: giver as unknown as CommandContext['commandGiver'],
    interactive: {} as Interactive,
    location,
    commandText: text,
    executionId: 'test-exec',
    commandId: 'test-cmd',
    verb: command.getPrimaryVerb(),
    command,
  });
}

describe('Dispatcher empty-resolution passthrough', () => {
  let location: TestLocation;
  let giver: TestGiver;
  let rose: TestThing;

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

    rose = makeStuff(() => new TestThing()) as TestThing;
    rose.setName('rose');
    ContainmentApi.move(
      rose as unknown as Parameters<typeof ContainmentApi.move>[0],
      location as unknown as Parameters<typeof ContainmentApi.move>[1]
    );
  });

  it('lands an MqlOneResult wrapper with stuff=null on no match', () => {
    const cmd = singleObjectCmd();
    const ctx = makeContext(giver, location as unknown as Location, cmd, 'look bathtub');
    const r = CommandApi.resolveAndValidate({ target: 'bathtub' }, ctx);
    expect('resolved' in r).toBe(true);
    if ('resolved' in r) {
      const target = r.resolved.target as MqlOneResult;
      expect(target).toBeDefined();
      expect(target.stuff).toBeNull();
      expect(target.raw).toBe('bathtub');
    }
  });

  it('lands an MqlManyResult wrapper with stuff=[] on no match', () => {
    const cmd = pluralObjectsCmd();
    const ctx = makeContext(
      giver,
      location as unknown as Location,
      cmd,
      'drop bathtub'
    );
    const r = CommandApi.resolveAndValidate({ targets: 'bathtub' }, ctx);
    expect('resolved' in r).toBe(true);
    if ('resolved' in r) {
      const targets = r.resolved.targets as MqlManyResult;
      expect(targets).toBeDefined();
      expect(targets.stuff).toEqual([]);
      expect(targets.raw).toBe('bathtub');
    }
  });

  it('captures the player-typed text on the MqlOneResult.raw field', () => {
    const cmd = singleObjectCmd();
    const ctx = makeContext(giver, location as unknown as Location, cmd, 'look rose');
    const r = CommandApi.resolveAndValidate({ target: 'rose' }, ctx);
    if ('resolved' in r) {
      const target = r.resolved.target as MqlOneResult;
      expect(target.raw).toBe('rose');
    }
  });

  it('captures raw text on the wrapper even when MQL resolves to nothing', () => {
    const cmd = singleObjectCmd();
    const ctx = makeContext(giver, location as unknown as Location, cmd, 'look bathtub');
    const r = CommandApi.resolveAndValidate({ target: 'bathtub' }, ctx);
    if ('resolved' in r) {
      const target = r.resolved.target as MqlOneResult;
      expect(target.raw).toBe('bathtub');
    }
  });

  it('does not update player focus on empty resolution', () => {
    const cmd = singleObjectCmd(); // updates_focus: extend
    giver.setFocus('rose');
    const ctx = makeContext(giver, location as unknown as Location, cmd, 'look bathtub');
    CommandApi.resolveAndValidate({ target: 'bathtub' }, ctx);
    // Focus unchanged — would have been clobbered if the dispatcher
    // had re-anchored to "bathtub".
    expect(giver.getFocus()).toBe('rose');
  });

  it('does not update pronoun memory on empty resolution', () => {
    const cmd = singleObjectCmd();
    const ctx = makeContext(giver, location as unknown as Location, cmd, 'look bathtub');
    CommandApi.resolveAndValidate({ target: 'bathtub' }, ctx);
    expect(giver.getPronounMemory().read('it')).toBeNull();
  });

  it('still updates focus/stash on a non-empty resolution', () => {
    const cmd = singleObjectCmd();
    const ctx = makeContext(giver, location as unknown as Location, cmd, 'look rose');
    CommandApi.resolveAndValidate({ target: 'rose' }, ctx);
    // updates_focus: extend appends the typed fragment to the prior
    // focus ("here", the default) — different stuff (location vs
    // rose), so naive append.
    expect(giver.getFocus()).toBe('here:rose');
    expect(giver.getPronounMemory().read('it')!.stuff).toEqual([rose]);
  });
});
