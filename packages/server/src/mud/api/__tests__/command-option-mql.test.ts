/**
 * Option-side MQL resolution tests.
 *
 * `resolveAndValidate` now runs MQL on options of `type: object` /
 * `type: objects` the same way it does for positional fields. Same
 * scope-precedence rules; same `MqlOneResult` / `MqlManyResult`
 * wrapper landing on the model. Tests cover the option-side path
 * specifically — positional-side resolution lives in
 * command-empty-resolve / command-pronoun.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CommandApi, type CommandContext } from '../command';
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

class TestLocation extends ContainerMixin(NamedMixin(PerceptibleMixin(Idea))) {}
class TestThing extends ContainableMixin(NamedMixin(PerceptibleMixin(Idea))) {}
class TestGiver extends ContainerMixin(
  ContainableMixin(
    FocusedMixin(CommandGiverMixin(NamedMixin(PerceptibleMixin(Idea)))),
  ),
) {}

function cmdWithObjectOption(): CommandDefinition {
  return CommandDefinition.fromYaml(
    [
      'verbs: [destruct]',
      'controller: DestructController',
      'description: destruct',
      'options:',
      '  mql:',
      '    type: object',
      '    scope: [reachable]',
    ].join('\n'),
    '<test>',
  );
}

function cmdWithObjectsOption(): CommandDefinition {
  return CommandDefinition.fromYaml(
    [
      'verbs: [eval]',
      'controller: EvalController',
      'description: eval',
      'options:',
      '  on:',
      '    type: objects',
      '    scope: [reachable]',
    ].join('\n'),
    '<test>',
  );
}

function makeContext(
  giver: TestGiver,
  location: Location,
  cmd: CommandDefinition,
  text: string,
): CommandContext {
  return {
    commandGiver: giver as never,
    location,
    commandText: text,
    executionId: 'test',
    commandId: 'test',
    verb: cmd.getPrimaryVerb(),
    command: cmd,
  };
}

describe('CommandApi.resolveAndValidate — option-side MQL', () => {
  let location: TestLocation;
  let giver: TestGiver;
  let rose: TestThing;
  let daisy: TestThing;

  beforeEach(() => {
    StuffApi.clearAll();
    location = makeStuff(() => new TestLocation());
    location.setName('Town Square');

    giver = makeStuff(() => new TestGiver());
    giver.setName('player');
    ContainmentApi.move(giver as never, location as never);

    rose = makeStuff(() => new TestThing());
    rose.setName('rose');
    ContainmentApi.move(rose as never, location as never);

    daisy = makeStuff(() => new TestThing());
    daisy.setName('rose'); // same name as rose to test plural matching
    ContainmentApi.move(daisy as never, location as never);
  });

  it('option type: object lands an MqlOneResult on the model', () => {
    const cmd = cmdWithObjectOption();
    const ctx = makeContext(
      giver,
      location as unknown as Location,
      cmd,
      'destruct --mql rose',
    );
    const r = CommandApi.resolveAndValidate({ mql: 'rose' }, ctx);
    if (!('resolved' in r)) throw new Error('expected resolved');
    const mql = r.resolved.mql as MqlOneResult;
    expect(mql).toBeDefined();
    expect(mql.stuff).not.toBeNull();
    expect(mql.raw).toBe('rose');
  });

  it('option type: objects lands an MqlManyResult on the model', () => {
    const cmd = cmdWithObjectsOption();
    const ctx = makeContext(
      giver,
      location as unknown as Location,
      cmd,
      'eval --on rose',
    );
    const r = CommandApi.resolveAndValidate({ on: 'rose' }, ctx);
    if (!('resolved' in r)) throw new Error('expected resolved');
    const on = r.resolved.on as MqlManyResult;
    expect(on).toBeDefined();
    // Two roses (rose + daisy renamed to rose) → multi-match.
    expect(on.stuff.length).toBeGreaterThanOrEqual(2);
    expect(on.raw).toBe('rose');
  });

  it('option type: object on no-match lands stuff=null wrapper', () => {
    const cmd = cmdWithObjectOption();
    const ctx = makeContext(
      giver,
      location as unknown as Location,
      cmd,
      'destruct --mql bathtub',
    );
    const r = CommandApi.resolveAndValidate({ mql: 'bathtub' }, ctx);
    if (!('resolved' in r)) throw new Error('expected resolved');
    const mql = r.resolved.mql as MqlOneResult;
    expect(mql.stuff).toBeNull();
    expect(mql.raw).toBe('bathtub');
  });

  it('option type: objects on no-match lands stuff=[] wrapper', () => {
    const cmd = cmdWithObjectsOption();
    const ctx = makeContext(
      giver,
      location as unknown as Location,
      cmd,
      'eval --on bathtub',
    );
    const r = CommandApi.resolveAndValidate({ on: 'bathtub' }, ctx);
    if (!('resolved' in r)) throw new Error('expected resolved');
    const on = r.resolved.on as MqlManyResult;
    expect(on.stuff).toEqual([]);
    expect(on.raw).toBe('bathtub');
  });

  it('honors a yaml-declared scope chain', () => {
    // `scope: [reachable]` on the option — same precedence rules
    // as positional `scope:`. Verifies the option-side resolver
    // reads the declared scope rather than always defaulting.
    const cmd = CommandDefinition.fromYaml(
      [
        'verbs: [destruct]',
        'controller: DestructController',
        'description: destruct',
        'options:',
        '  mql:',
        '    type: object',
        '    scope: [reachable]',
      ].join('\n'),
      '<test>',
    );
    const ctx = makeContext(
      giver,
      location as unknown as Location,
      cmd,
      'destruct --mql rose',
    );
    const r = CommandApi.resolveAndValidate({ mql: 'rose' }, ctx);
    if (!('resolved' in r)) throw new Error('expected resolved');
    const mql = r.resolved.mql as MqlOneResult;
    expect(mql.stuff).not.toBeNull();
  });
});
