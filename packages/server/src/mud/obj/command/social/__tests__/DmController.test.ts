/**
 * DmController — transmission routes through the hosted comms update.
 *
 * Covers the acceptance trio: dm succeeds for an attuned actor with the
 * comms update; refuses (mixin-missing) when the comms update is absent
 * though attunement is present; an unattuned recipient drops the frame
 * (reception gate unchanged).
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import DmController from '../DmController';
import { StuffApi } from '../../../../api/stuff';
import {
  CommandApi,
  type CommandContext,
  type CommandModel,
} from '../../../../api/command';
import { CommandDefinition } from '../../../../lib/command/CommandDefinition';
import Species from '../../../species/Species';
import BodyPlan from '../../../species/BodyPlan';
import { OrganismMixin } from '../../../../lib/species/Organism';
import { AetherMixin, type AetherHost } from '../../../../lib/message/Aether';
import { SensorMixin } from '../../../../lib/message/Sensor';
import { NamedMixin } from '../../../../lib/description/Named';
import { SlottedMixin } from '../../../../lib/slot/Slotted';
import Thing from '../../../../lib/stuff/Thing';
import AetherImplant from '../../../AetherImplant';
import CommsUpdate from '../../../CommsUpdate';
import {
  makeStuff,
  stampTemplatePathForTest,
} from '../../../../lib/security/__tests__/test-setup';
import { buildAllModalities } from '../../../../lib/perception/modalities/__tests__/test-helpers';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import type { MessageFrame } from '@saxonberg/types';
import type { MqlManyResult } from '../../../../api/mql';
import type { FieldMeta } from '../../../../lib/mixin';

class Actor extends SlottedMixin(
  AetherMixin(SensorMixin(NamedMixin(OrganismMixin(Thing)))),
) {
  static fieldMeta: FieldMeta = {};
  override staticSlots = [
    { name: 'cranial', accepts: 'SlottableMixin' as const },
  ];
  public received: MessageFrame[] = [];
  protected override handleMessage(frame: unknown): void {
    this.received.push(frame as MessageFrame);
  }
}

function withPath<T extends Stuff>(obj: T, path: string): T {
  stampTemplatePathForTest(obj, path);
  return obj;
}

let seq = 0;
/** Build an embodied Sensor actor; `attuned` occupies the implant. */
function makeActor(name: string, attuned: boolean): Actor & AetherHost {
  const biped = withPath(
    makeStuff(() => new BodyPlan()),
    `/obj/species/BodyPlan/biped-dm-test-${seq}`,
  );
  biped.setSensoryPorts([
    { modality: 'vision', count: 2, position: 'frontal' },
    { modality: 'hearing', count: 2, position: 'lateral' },
  ]);
  biped.setSlots([{ name: 'cranial', accepts: 'SlottableMixin' }]);
  const species = withPath(
    makeStuff(() => new Species()),
    `/obj/species/animalia/dm-test-${seq}`,
  );
  seq += 1;
  species.setBodyPlan(biped);
  const actor = makeStuff(() => new Actor()) as Actor & {
    setSpecies: (s: Species) => void;
  };
  actor.setSpecies(species);
  actor.setName(name);
  if (attuned) {
    const implant = makeStuff(() => new AetherImplant());
    (actor as unknown as Actor).occupy(implant, 'cranial');
  }
  return actor as unknown as Actor & AetherHost;
}

function dmModel(recipient: Stuff): CommandModel {
  return {
    target: { stuff: [recipient], raw: 'bob' } as MqlManyResult,
    message: 'hello',
  } as unknown as CommandModel;
}

function context(speaker: Stuff, commandSource: Stuff): CommandContext {
  return CommandApi.createCommandContext({
    commandGiver: speaker as never,
    location: null,
    commandText: 'dm bob hello',
    executionId: 'test',
    commandId: 'test',
    verb: 'dm',
    command: CommandDefinition.fromYaml(
      `verbs: [dm]\ncontroller: social/DmController\ndescription: stub\n`,
      '<test>',
    ),
    commandSource,
  });
}

describe('DmController', () => {
  beforeEach(() => {
    StuffApi.clearAll();
    buildAllModalities();
  });
  afterEach(() => {
    StuffApi.clearAll();
  });

  it('succeeds for an attuned actor with the comms update', async () => {
    const alice = makeActor('Alice', true);
    const bob = makeActor('Bob', true);
    const aliceComms = makeStuff(() => new CommsUpdate());
    alice.hostUpdate(aliceComms);
    const bobComms = makeStuff(() => new CommsUpdate());
    bob.hostUpdate(bobComms);

    const controller = makeStuff(() => new DmController());
    const ctx = context(alice as unknown as Stuff, aliceComms as unknown as Stuff);
    await controller.execute(dmModel(bob as unknown as Stuff) as never, ctx);

    expect(
      (bob as unknown as Actor).received.some(
        (f) => f.topic === 'speech.comms',
      ),
    ).toBe(true);
    expect(ctx.getNotes().some((n) => n.kind === 'mixin-missing')).toBe(false);
  });

  it('refuses (mixin-missing) when the comms update is absent though attuned', async () => {
    const alice = makeActor('Alice', true); // attuned, but no comms update
    const bob = makeActor('Bob', true);

    const controller = makeStuff(() => new DmController());
    // commandSource is the speaker (not a comms update); the reachable
    // pool holds no comms update on the attuned-but-update-less actor.
    const ctx = context(alice as unknown as Stuff, alice as unknown as Stuff);
    await controller.execute(dmModel(bob as unknown as Stuff) as never, ctx);

    expect(ctx.getNotes().some((n) => n.kind === 'mixin-missing')).toBe(true);
    expect(
      (alice as unknown as Actor).received.some((f) =>
        (f.body ?? '').toString().includes('no way to send a thought'),
      ),
    ).toBe(true);
  });

  it('an unattuned recipient drops the dm frame (reception gate)', async () => {
    const alice = makeActor('Alice', true);
    const bob = makeActor('Bob', false); // no implant → no verbal-esp
    const aliceComms = makeStuff(() => new CommsUpdate());
    alice.hostUpdate(aliceComms);

    const controller = makeStuff(() => new DmController());
    const ctx = context(alice as unknown as Stuff, aliceComms as unknown as Stuff);
    await controller.execute(dmModel(bob as unknown as Stuff) as never, ctx);

    expect(
      (bob as unknown as Actor).received.some(
        (f) => f.topic === 'speech.comms',
      ),
    ).toBe(false);
    // The sender still hears their own echo (they are attuned).
    expect(
      (alice as unknown as Actor).received.some(
        (f) => f.topic === 'speech.comms',
      ),
    ).toBe(true);
  });
});
