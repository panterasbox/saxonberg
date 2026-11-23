/**
 * Held, never silent (aether-devices D8) and reading needs sight (D9).
 *
 * A line that cannot leave is held with a refusal that names the fix,
 * and re-run as typed when the person can send. A frame that cannot be
 * taken is held and delivered, in order, under "While you were away…".
 * Both lists are persistent fields on the person.
 */

import "../../../../test-bootstrap";
import { setFlatSenses } from '../../species/__tests__/flat-body';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StuffApi } from '../../../api/stuff';
import { MixinApi } from '../../../api/mixin';
import { ScheduleApi } from '../../../api/schedule';
import { MessageApi } from '../../../api/message';
import Species from '../../../platform/idea/species/Species';
import BodyPlan from '../../../platform/idea/species/BodyPlan';
import { OrganismMixin } from '../../species/Organism';
import { AetherMixin } from '../../message/Aether';
import { AetherHostMixin } from '../../augmentation/AetherHost';
import { SensorMixin } from '../../message/Sensor';
import { NamedMixin } from '../../description/Named';
import { SlottedMixin } from '../../slot/Slotted';
import Good from '../../stuff/Good';
import AetherImplant from '../../../platform/thing/AetherImplant';
import App from '../../../platform/idea/App';
import { CommsMixin, type Comms } from '../Comms';
import { CommandGiverMixin } from '../../command/CommandGiver';
import {
  makeStuff,
  stampTemplatePathForTest,
} from '../../security/__tests__/test-setup';
import { buildAllModalities } from '../../perception/modalities/__tests__/test-helpers';
import type { Stuff } from '../../stuff/Stuff';
import type { MessageFrame } from '@saxonberg/types';
import type { FieldMeta } from '../../mixin';
import type { AnyConstructor } from '../../../api/mixin';

class Person extends CommsMixin(CommandGiverMixin(SlottedMixin(
  AetherHostMixin(AetherMixin(SensorMixin(NamedMixin(OrganismMixin(Good))))),
))) {
  static fieldMeta: FieldMeta = {};
  override staticSlots = [
    { name: 'cranial', accepts: 'SlottableMixin' as const },
  ];
  public received: MessageFrame[] = [];
  public ran: string[] = [];
  /** The person's hook, as `Avatar` has it. */
  protected override filterMessage(frame: MessageFrame): MessageFrame | null {
    if (this.holdIfUnreachable(frame)) return null;
    return super.filterMessage(frame);
  }
  protected override handleMessage(frame: unknown): void {
    this.received.push(frame as MessageFrame);
  }
  /** Record what the flush re-runs instead of dispatching it. */
  override async executeCommand(line: string): Promise<void> {
    this.ran.push(line);
  }
}

function withPath<T extends Stuff>(obj: T, path: string): T {
  stampTemplatePathForTest(obj, path);
  return obj;
}

let seq = 0;
function makePerson(name: string): Person & Comms {
  const biped = withPath(
    makeStuff(() => new BodyPlan()),
    `/stuff/idea/species/BodyPlan/biped-held-${seq}`,
  );
  setFlatSenses(biped, [
    { modality: 'vision', count: 2, position: 'frontal' },
    { modality: 'hearing', count: 2, position: 'lateral' },
  ]);
  biped.setSlots([{ name: 'cranial', accepts: 'SlottableMixin' }]);
  const species = withPath(
    makeStuff(() => new Species()),
    `/stuff/idea/species/animalia/held-${seq}`,
  );
  seq += 1;
  species.setBodyPlan(biped);
  const p = makeStuff(() => new Person()) as Person & { setSpecies(s: Species): void };
  p.setSpecies(species);
  p.setName(name);
  return p as unknown as Person & Comms;
}

async function seatImplant(p: Person, messages = true): Promise<AetherImplant> {
  const implant = makeStuff(() => new AetherImplant());
  p.occupy(implant, 'cranial');
  if (messages) await implant.installApp(App.MESSAGES_PATH);
  return implant;
}

function dmFrame(text: string): MessageFrame {
  return {
    id: `f-${text}`,
    topic: 'speech.comms',
    tags: ['audience:target'],
    body: `Bob → you: ${text}`,
    meta: { timestamp: 0, modality: 'verbal-esp' },
  } as MessageFrame;
}

const saidTo = (p: Person): string => p.received.map((f) => String(f.body ?? '')).join('\n');

describe('held, never silent', () => {
  beforeEach(() => {
    StuffApi.clearAll();
    buildAllModalities();
    vi.spyOn(StuffApi, 'clone').mockImplementation((async (path: string) =>
      withPath(makeStuff(() => new App()), path)) as never);
    // Flushes run on the next tick; run them now so the test can read them.
    vi.spyOn(ScheduleApi, 'schedule').mockImplementation(((_ms: number, fn: () => void) => {
      fn();
      return {} as never;
    }) as never);
  });
  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  it('each refusal names its fix and says the line is held', async () => {
    const ana = makePerson('Ana');
    const none = ana.sendOrHold('dm bob hi');
    // The row `aether-none` words the fix and the hold (failure-model D11).
    expect(none).toMatchObject({ ok: false, reason: 'aether-none', why: 'none', held: true, facts: { kept: 'yes' } });

    const implant = await seatImplant(ana, false);
    void implant;
    const noApp = ana.sendOrHold('dm bob again');
    expect(noApp?.reason).toBe('aether-no-messages');
    expect(ana.heldOutbound).toEqual(['dm bob hi', 'dm bob again']);
  });

  it('the held lines re-run in order once the person can send', async () => {
    const ana = makePerson('Ana');
    ana.sendOrHold('dm bob one');
    ana.sendOrHold('dm bob two');
    await seatImplant(ana);
    // Any frame the person receives notices the hold can move.
    MessageApi.scene(ana as unknown as Stuff).topic('world.tick').toSelf('tick').send();
    await vi.waitFor(() => expect(ana.ran).toEqual(['dm bob one', 'dm bob two']));
    expect(ana.heldOutbound).toEqual([]);
    expect(saidTo(ana)).toMatch(/Sending what you held: dm bob one/);
  });

  it('the cap refuses and says the line was not kept', () => {
    const ana = makePerson('Ana');
    for (let i = 0; i < 50; i++) ana.sendOrHold(`dm bob ${i}`);
    const r = ana.sendOrHold('dm bob overflow');
    expect(r?.held).toBe(false);
    expect(r?.facts).toEqual({ cap: '50' });
    expect(ana.heldOutbound).toHaveLength(50);
  });

  it('an inbound frame is held, then delivered in order under "While you were away"', async () => {
    const ana = makePerson('Ana');
    ana.onMessage(dmFrame('first'));
    ana.onMessage(dmFrame('second'));
    expect(ana.received).toHaveLength(0);
    expect(ana.heldInbound.map((f) => f.id)).toEqual(['f-first', 'f-second']);

    await seatImplant(ana);
    await ana.flushHeld();
    const bodies = ana.received.map((f) => String(f.body));
    const away = bodies.findIndex((b) => b.includes('While you were away'));
    expect(away).toBeGreaterThanOrEqual(0);
    expect(bodies.slice(away + 1)).toEqual(['Bob → you: first', 'Bob → you: second']);
    expect(ana.heldInbound).toEqual([]);
  });

  it('the held lists are persistent fields on the person (they ride the snapshot)', () => {
    const fields = MixinApi.getAllPersistentFields(Person as unknown as AnyConstructor);
    expect(fields).toEqual(
      expect.arrayContaining(['heldOutbound', 'heldInbound', 'heldInboundLost']),
    );
  });

  it('a held line written back by a restore re-runs (the restart)', async () => {
    const ana = makePerson('Ana');
    // What a restore writes: the persisted list, onto a fresh body.
    ana.heldOutbound = ['dm bob after the restart'];
    await seatImplant(ana);
    await ana.flushHeld();
    expect(ana.ran).toEqual(['dm bob after the restart']);
  });
});

describe('reading needs sight (D9)', () => {
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

  it('an implant (known) delivers even when the person cannot see', async () => {
    const ana = makePerson('Ana');
    await seatImplant(ana);
    const { PerceptionApi } = await import('../../../api/perception');
    vi.spyOn(PerceptionApi, 'canPerceive').mockReturnValue(false);
    expect(ana.receptionRefusal(dmFrame('x'))).toBeNull();
  });

  it('a screen (read) waits while the person cannot see', async () => {
    const ana = makePerson('Ana');
    const implant = await seatImplant(ana);
    implant.manifestsAs = 'read';
    expect(ana.receptionRefusal(dmFrame('x'))).toBeNull();
    // The fixture has no vitals; losing sight stands in for unconsciousness
    // (the drive stages the real condition).
    const { PerceptionApi } = await import('../../../api/perception');
    vi.spyOn(PerceptionApi, 'canPerceive').mockReturnValue(false);
    expect(ana.receptionRefusal(dmFrame('x'))).toBe('cannot-see');
  });
});
