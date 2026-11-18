/**
 * DmController — comms is the person's; Messages is the app it looks for
 * (aether-devices D2).
 *
 * Covers: dm goes through an implant with Messages installed; refuses
 * naming `apps install messages` when Messages is uninstalled; sends again
 * on reinstall; a shade-like born-tuned person sends from their own host;
 * an unattuned recipient drops the frame (reception gate unchanged).
 */

import "../../../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import DmController from '../DmController';
import { StuffApi } from '../../../../../api/stuff';
import {
  CommandApi,
  type CommandContext,
  type CommandModel,
} from '../../../../../api/command';
import { CommandDefinition } from '../../../../../lib/command/CommandDefinition';
import Species from '../../../species/Species';
import BodyPlan from '../../../species/BodyPlan';
import { OrganismMixin } from '../../../../../lib/species/Organism';
import { AetherMixin } from '../../../../../lib/message/Aether';
import { AetherHostMixin, type AetherHost } from '../../../../../lib/augmentation/AetherHost';
import { SensorMixin } from '../../../../../lib/message/Sensor';
import { NamedMixin } from '../../../../../lib/description/Named';
import { SlottedMixin } from '../../../../../lib/slot/Slotted';
import Good from '../../../../../lib/stuff/Good';
import AetherImplant from '../../../../thing/AetherImplant';
import App from '../../../App';
import { CommsMixin, type Comms } from '../../../../../lib/comms/Comms';
import {
  makeStuff,
  stampTemplatePathForTest,
} from '../../../../../lib/security/__tests__/test-setup';
import { buildAllModalities } from '../../../../../lib/perception/modalities/__tests__/test-helpers';
import type { Stuff } from '../../../../../lib/stuff/Stuff';
import type { MessageFrame } from '@saxonberg/types';
import type { MqlManyResult } from '../../../../../api/mql';
import type { FieldMeta } from '../../../../../lib/mixin';

class Actor extends CommsMixin(SlottedMixin(
  AetherHostMixin(AetherMixin(SensorMixin(NamedMixin(OrganismMixin(Good))))),
)) {
  static fieldMeta: FieldMeta = {};
  override staticSlots = [
    { name: 'cranial', accepts: 'SlottableMixin' as const },
  ];
  public received: MessageFrame[] = [];
  protected override handleMessage(frame: unknown): void {
    this.received.push(frame as MessageFrame);
  }
}

/** A body tuned by its nature (the shade's shape): its own host. */
class BornTuned extends Actor {
  override isBornTuned(): boolean {
    return true;
  }
  getConferredMixinNames(): string[] {
    return ['AetherMixin'];
  }
}

function withPath<T extends Stuff>(obj: T, path: string): T {
  stampTemplatePathForTest(obj, path);
  return obj;
}

let seq = 0;
/** Build an embodied Sensor actor; `attuned` occupies the implant. */
function makeActor(name: string, attuned: boolean): Actor & AetherHost & Comms {
  const biped = withPath(
    makeStuff(() => new BodyPlan()),
    `/stuff/idea/species/BodyPlan/biped-dm-test-${seq}`,
  );
  biped.setSensoryPorts([
    { modality: 'vision', count: 2, position: 'frontal' },
    { modality: 'hearing', count: 2, position: 'lateral' },
  ]);
  biped.setSlots([{ name: 'cranial', accepts: 'SlottableMixin' }]);
  const species = withPath(
    makeStuff(() => new Species()),
    `/stuff/idea/species/animalia/dm-test-${seq}`,
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
  return actor as unknown as Actor & AetherHost & Comms;
}

function implantOf(actor: Actor): AetherImplant {
  return [...actor.getOccupants('cranial')][0] as unknown as AetherImplant;
}

/** An attuned actor whose implant runs Messages. */
async function withMessages(name: string): Promise<Actor & AetherHost & Comms> {
  const a = makeActor(name, true);
  await implantOf(a).installApp(App.MESSAGES_PATH);
  return a;
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
    vi.spyOn(StuffApi, 'clone').mockImplementation((async (path: string) =>
      withPath(makeStuff(() => new App()), path)) as never);
  });
  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  async function dm(alice: Stuff, bob: Stuff): Promise<CommandContext> {
    const controller = makeStuff(() => new DmController());
    const ctx = context(alice, alice);
    await controller.execute(dmModel(bob) as never, ctx);
    return ctx;
  }

  const heard = (a: Stuff): boolean =>
    (a as unknown as Actor).received.some((f) => f.topic === 'speech.comms');

  it('sends through an implant with Messages installed', async () => {
    const alice = await withMessages('Alice');
    const bob = await withMessages('Bob');
    const ctx = await dm(alice, bob);
    expect(heard(bob)).toBe(true);
    expect(ctx.getNotes().some((n) => n.kind === 'controller-rejected')).toBe(false);
  });

  it('refuses naming the fix when Messages is uninstalled; reinstall sends', async () => {
    const alice = await withMessages('Alice');
    const bob = await withMessages('Bob');
    implantOf(alice).uninstallApp('messages');

    const ctx = await dm(alice, bob);
    expect(heard(bob)).toBe(false);
    expect(
      ctx.getNotes().some(
        (n) => n.kind === 'controller-rejected' && n.reason === 'aether-no-messages',
      ),
    ).toBe(true);
    expect(
      (alice as unknown as Actor).received.some((f) =>
        (f.body ?? '').toString().includes('apps install messages'),
      ),
    ).toBe(true);

    await implantOf(alice).installApp(App.MESSAGES_PATH);
    await dm(alice, bob);
    expect(heard(bob)).toBe(true);
  });

  it('refuses naming a phone when nothing tunes the sender', async () => {
    const alice = makeActor('Alice', false);
    const bob = await withMessages('Bob');
    const ctx = await dm(alice, bob);
    expect(heard(bob)).toBe(false);
    expect(
      ctx.getNotes().some((n) => n.kind === 'controller-rejected' && n.reason === 'aether-none'),
    ).toBe(true);
  });

  it('a born-tuned person sends from their own host', async () => {
    const alice = makeStuff(() => new BornTuned()) as unknown as Actor & AetherHost & Comms;
    alice.setName('Alice');
    await alice.installApp(App.MESSAGES_PATH);
    const bob = await withMessages('Bob');
    await dm(alice, bob);
    expect(heard(bob)).toBe(true);
  });

  it('the cohort lands on the people (reply finds it)', async () => {
    const alice = await withMessages('Alice');
    const bob = await withMessages('Bob');
    await dm(alice, bob);
    expect(bob.getLastInboundCohort()).toEqual([alice]);
    expect(alice.getLastOutboundCohort()).toEqual([bob]);
  });

  it('an unattuned recipient drops the dm frame (reception gate)', async () => {
    const alice = await withMessages('Alice');
    const bob = makeActor('Bob', false); // no implant → no verbal-esp
    await dm(alice, bob);
    expect(heard(bob)).toBe(false);
    // The sender still hears their own echo (they are attuned).
    expect(heard(alice)).toBe(true);
  });
});
