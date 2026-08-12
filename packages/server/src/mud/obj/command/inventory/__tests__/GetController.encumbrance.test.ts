/**
 * GetController — the encumbrance lift gate. Picking up an item that
 * would push borne burden past the strain ceiling fails diegetically (a
 * `controller-rejected` envelope note + a scene line, no throw); an item
 * between capacity and ceiling still lifts (now overloaded). A non-
 * creature container is never gated.
 */

import "../../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import GetController from '../GetController';
import { ContainerMixin } from '../../../../lib/spatial/Container';
import { ContainableMixin } from '../../../../lib/spatial/Containable';
import { NamedMixin } from '../../../../lib/description/Named';
import { SensorMixin } from '../../../../lib/message/Sensor';
import { Idea } from '../../../../lib/stuff/Idea';
import Location from '../../../../lib/stuff/Location';
import { Stuff } from '../../../../lib/stuff/Stuff';
import { StuffApi } from '../../../../api/stuff';
import { ShadowApi } from '../../../../api/shadow';
import { ContainmentApi } from '../../../../api/containment';
import {
  CommandApi,
  type CommandContext,
  type ModelData,
} from '../../../../api/command';
import { CommandDefinition } from '../../../../lib/command/CommandDefinition';
import type { MqlManyResult } from '../../../../api/mql';
import { makeStuff } from '../../../../lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../../../lib/persistence/__tests__/quantity-marshaller-test-helpers';
import {
  sensingBearer,
  massThing,
} from '../../../../lib/encumbrance/__tests__/encumbrance-fixtures';

// A Container + Sensor (so the pickup scene delivers) that is NOT
// LoadBearing — no Vitals/Reserved/Slotted gauge, so the lift gate is
// skipped entirely. Models a non-creature looter (a chest, a hopper).
class PlainBin extends SensorMixin(
  ContainerMixin(ContainableMixin(NamedMixin(Idea)))
) {
  static _mixinName = 'PlainBin';
}

function stubCommand(verb: string): CommandDefinition {
  return CommandDefinition.fromYaml(
    `verbs: [${verb}]\ncontroller: NoopController\ndescription: stub\n`,
    '<test>',
  );
}

function makeContext(giver: Stuff, location: Location): CommandContext {
  return CommandApi.createCommandContext({
    commandGiver: giver as never,
    location: location as never,
    commandText: 'get',
    executionId: 'test',
    commandId: 'test',
    verb: 'get',
    command: stubCommand('get'),
  });
}

type GetExecModel = Parameters<GetController['execute']>[0];

function makeModel(stuff: Stuff[], raw: string): GetExecModel {
  return { targets: { stuff, raw } as MqlManyResult } as ModelData as unknown as GetExecModel;
}

describe('GetController — encumbrance lift gate', () => {
  beforeEach(() => {
    ShadowApi._clearAllForTesting();
    StuffApi.clearAll();
    installV1QuantityMarshallers();
  });
  afterEach(() => StuffApi.clearAll());

  it('declines an over-ceiling anvil with a too-heavy-to-lift note', async () => {
    const loc = makeStuff(() => new Location());
    const bearer = sensingBearer(70); // capacity 35, ceiling 70
    ContainmentApi.move(bearer, loc);
    const anvil = massThing(200);
    ContainmentApi.move(anvil, loc);

    const controller = makeStuff(() => new GetController());
    const ctx = makeContext(bearer, loc);
    await controller.execute(makeModel([anvil], 'anvil'), ctx);

    expect(ctx.getNotes()).toContainEqual(
      expect.objectContaining({
        kind: 'controller-rejected',
        reason: 'too-heavy-to-lift',
      }),
    );
    // Not picked up — still on the floor.
    expect(anvil.getContainer()).toBe(loc);
  });

  it('lifts an item over capacity but under the ceiling (overloaded)', async () => {
    const loc = makeStuff(() => new Location());
    const bearer = sensingBearer(70); // capacity 35, ceiling 70
    ContainmentApi.move(bearer, loc);
    // 50 kg → loose-carry surcharge 62.5 kg: over capacity (35), under
    // ceiling (70). Lifts, but now overloaded.
    const crate = massThing(50);
    ContainmentApi.move(crate, loc);

    const controller = makeStuff(() => new GetController());
    await controller.execute(makeModel([crate], 'crate'), makeContext(bearer, loc));

    expect(crate.getContainer()).toBe(bearer);
    expect(bearer.getLoadRatio()).toBeGreaterThan(1.0);
  });

  it('does not gate a non-creature container (looting still works)', async () => {
    const loc = makeStuff(() => new Location());
    const bin = makeStuff(() => new PlainBin());
    bin.setName('bin');
    ContainmentApi.move(bin, loc);
    const anvil = massThing(200);
    ContainmentApi.move(anvil, loc);

    const controller = makeStuff(() => new GetController());
    await controller.execute(makeModel([anvil], 'anvil'), makeContext(bin, loc));

    // PlainBin is not LoadBearing → no gate; the heavy item moves in.
    expect(anvil.getContainer()).toBe(bin);
  });
});
