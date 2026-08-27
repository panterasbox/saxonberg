/**
 * FocusController tests.
 *
 * Phase-7-review note: parse + permission validation moved out of
 * the controller and onto the dispatcher (since `focus.fragment`
 * is now `type: objects`, the dispatcher's `MqlApi.resolveMany`
 * call runs the parser and permission gate). Errors from those
 * surface from `executeCommand`'s outer try/catch, not from
 * controller code — those scenarios are covered in
 * `command-pronoun.test.ts` and `mql.test.ts`.
 *
 * What's still controller-shaped: bare-`focus` displays the
 * current scope; `focus <fragment>` calls `setScope` and reports
 * the resolved match count. Empty match lists are intentionally
 * fine.
 */

import "../../../../../../test-bootstrap";
import { describe, it, expect, beforeEach } from 'vitest';
import FocusController from '../FocusController';
import { Idea } from '../../../../../lib/stuff/Idea';
import { CommandGiverMixin } from '../../../../../lib/command/CommandGiver';
import { FocusedMixin } from '../../../../../lib/command/Focused';
import { SensorMixin } from '../../../../../lib/message/Sensor';
import { ContainableMixin } from '../../../../../lib/spatial/Containable';
import { ContainerMixin } from '../../../../../lib/spatial/Container';
import { NamedMixin } from '../../../../../lib/description/Named';
import { PerceptibleMixin } from '../../../../../lib/description/Perceptible';
import CartesianLocation from '../../../../../lib/location/CartesianLocation';
import { ContainmentApi } from '../../../../../api/containment';
import type { MqlManyResult } from '../../../../../api/mql';
import { makeStuff } from '../../../../../lib/security/__tests__/test-setup';
import type { Stuff } from '../../../../../lib/stuff/Stuff';
import type Interactive from '../../../Interactive';
import type Location from '../../../../../lib/stuff/Location';
import {
  CommandApi,
  type CommandContext,
  type CommandModel,
  type ModelData,
} from '../../../../../api/command';
import { CommandDefinition } from '../../../../../lib/command/CommandDefinition';

const TestGiverBase = FocusedMixin(
  CommandGiverMixin(ContainerMixin(ContainableMixin(SensorMixin(Idea))))
);
class TestGiver extends TestGiverBase {
  public received: Array<{ topic?: string; body?: string }> = [];
  protected override handleMessage(frame: unknown): void {
    this.received.push(frame as { topic?: string; body?: string });
  }
}

class TestThing extends ContainableMixin(NamedMixin(PerceptibleMixin(Idea))) {}

function makeModel(
  fields: ModelData = {},
  subcommand?: string
): CommandModel {
  const model: CommandModel = { ...fields };
  if (subcommand !== undefined) model.subcommand = subcommand;
  return model;
}

function stubCommand(verb: string): CommandDefinition {
  return CommandDefinition.fromYaml(
    `verbs: [${verb}]\ncontroller: NoopController\ndescription: stub\n`,
    '<test>'
  );
}

function makeContext(
  giver: TestGiver,
  location: Location,
  raw?: string
): CommandContext {
  return CommandApi.createCommandContext({
    commandGiver: giver as unknown as CommandContext['commandGiver'],
    interactive: {} as Interactive,
    location,
    commandText: raw === undefined ? 'focus' : `focus ${raw}`,
    executionId: 'test-execution',
    commandId: 'test-command',
    verb: 'focus',
    command: stubCommand('focus'),
  });
}

/** Build the MqlManyResult wrapper the dispatcher would land on the
 *  fragment field of FocusModel. */
function fragmentField(stuff: Stuff[], raw: string): MqlManyResult {
  return { stuff, raw };
}

describe('FocusController', () => {
  let giver: TestGiver;
  let location: CartesianLocation;
  let controller: FocusController;

  beforeEach(() => {
    location = makeStuff(() => new CartesianLocation());
    location.setShortDescription('Town Square');
    giver = makeStuff(() => new TestGiver());
    ContainmentApi.move(giver, location);
    controller = makeStuff(() => new FocusController());
  });

  it('reports the current focus when no fragment is given', () => {
    giver.setFocus('bookcase:book');
    controller.execute(makeModel(), makeContext(giver, location));
    const body = giver.received[0]?.body ?? '';
    expect(body).toContain('bookcase:book');
  });

  it("defaults to 'here' focus when nothing has set it", () => {
    controller.execute(makeModel(), makeContext(giver, location));
    const body = giver.received[0]?.body ?? '';
    expect(body).toContain('here');
  });

  it('sets focus to the player-typed fragment', () => {
    controller.execute(
      makeModel({ fragment: fragmentField([], 'inventory') } as ModelData),
      makeContext(giver, location, 'inventory')
    );
    expect(giver.getFocus()).toBe('inventory');
  });

  it('reports the resolved match count alongside the focus', () => {
    const a = makeStuff(() => new TestThing()) as Stuff;
    const b = makeStuff(() => new TestThing()) as Stuff;
    controller.execute(
      makeModel({ fragment: fragmentField([a, b], 'flowers') } as ModelData),
      makeContext(giver, location, 'flowers')
    );
    const body = giver.received[0]?.body ?? '';
    expect(body).toContain('flowers');
    expect(body).toContain('2 objects');
  });

  it('"1 object" when exactly one resolves', () => {
    const a = makeStuff(() => new TestThing()) as Stuff;
    controller.execute(
      makeModel({ fragment: fragmentField([a], 'rose') } as ModelData),
      makeContext(giver, location, 'rose')
    );
    const body = giver.received[0]?.body ?? '';
    expect(body).toContain('1 object');
    expect(body).not.toContain('1 objects');
  });

  it('still sets focus when the fragment resolves to nothing now', () => {
    // `focus online` when no one's online — the dispatcher's
    // resolveMany returns []; controller still anchors focus.
    controller.execute(
      makeModel({ fragment: fragmentField([], 'online') } as ModelData),
      makeContext(giver, location, 'online')
    );
    expect(giver.getFocus()).toBe('online');
    const body = giver.received[0]?.body ?? '';
    expect(body).toContain('0 objects');
  });
});
