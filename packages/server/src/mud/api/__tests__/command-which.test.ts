/**
 * ⭐ `which` — what can I type here, and what gives each verb (the which
 * build, W1). Over the real body, room and thing classes with the real
 * views loaded, because the read is the dispatcher's own list: a fixture
 * that faked `getAffordances()` would prove nothing about it.
 *
 * ⚠ The load-bearing test is *listed ⇒ accepted* (R3, one direction):
 * every verb the answer names is one `matchAffordances` accepts.
 */
import '../../../test-bootstrap';
import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { CommandApi } from '../command';
import { ContainmentApi } from '../containment';
import { PerceptionApi } from '../perception';
import { StuffApi } from '../stuff';
import { CommandLineApi } from '../command-line';
import { CommandGiverMixin } from '../../lib/command/CommandGiver';
import { CarryingMixin } from '../../lib/slot/Carrying';
import { Creature } from '../../lib/creature/Creature';
import { MarkedMixin } from '../../lib/description/Marked';
import { SwitchableMixin } from '../../lib/boundary/Switchable';
import { WieldableMixin } from '../../lib/slot/Wieldable';
import Species from '../../platform/idea/species/Species';
import BodyPlan from '../../platform/idea/species/BodyPlan';
import Location from '../../lib/location/Location';
import Thing from '../../platform/thing/Thing';
import Good from '../../platform/thing/Good';
import { makeStuff, stampTemplatePathForTest } from '../../lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../lib/persistence/__tests__/quantity-marshaller-test-helpers';
import type { WhichAnswer } from '@saxonberg/types';

const PLAN = '/stuff/idea/species/BodyPlan/which-biped';
class Person extends CommandGiverMixin(CarryingMixin(Creature)) {}
/** A fixture that gives a verb to whoever stands beside it. */
class Lever extends SwitchableMixin(Thing) {}
/** An article you can read and carry. */
class Note extends MarkedMixin(Good) {}
class Knife extends WieldableMixin(Good) {}

describe('which — what can I type here (W1)', () => {
  let room: Location;
  let me: Person;

  beforeAll(async () => {
    CommandApi.clearCache();
    const result = await CommandApi.preloadAll();
    expect(result.failed).toEqual([]);
  });

  beforeEach(() => {
    installV1QuantityMarshallers();
    const plan = makeStuff(() => new BodyPlan());
    plan.setName('which-biped');
    plan.setBaseMass(70);
    plan.setBaseStature(1.75);
    plan.setSlots([
      { name: 'torso', accepts: 'WearableMixin', capacity: 4, covers: ['body'] },
      { name: 'hand:left', accepts: 'WieldableMixin', bodyPart: 'body.hand.left' },
      { name: 'hand:right', accepts: 'WieldableMixin', bodyPart: 'body.hand.right' },
    ]);
    plan.setBodyParts([
      { key: 'body', parent: null, tissues: [] },
      { key: 'body.hand.left', parent: 'body', tissues: [], serves: ['manipulation'] },
      { key: 'body.hand.right', parent: 'body', tissues: [], serves: ['manipulation'] },
    ]);
    stampTemplatePathForTest(plan, PLAN);
    const species = makeStuff(() => new Species());
    species.setBodyPlan(plan);
    stampTemplatePathForTest(species, '/stuff/idea/species/test/which-human');
    room = makeStuff(() => new Location());
    me = makeStuff(() => new Person());
    me.setSpecies(species);
    ContainmentApi.move(me, room);
  });
  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  const lever = (): Lever => {
    const l = makeStuff(() => new Lever());
    l.setShortDescription('a lever');
    l.setKeywords(['lever']);
    ContainmentApi.move(l, room);
    return l;
  };
  const note = (): Note => {
    const n = makeStuff(() => new Note());
    n.setShortDescription('a note');
    n.setKeywords(['note']);
    return n;
  };
  const ask = async (what?: string): Promise<WhichAnswer> => {
    const r = await CommandApi.which(me as never, what);
    if (!r.ok) throw new Error(`refused: ${r.reason}`);
    return r.facts;
  };
  const verbsOf = (a: WhichAnswer): string[] => [
    ...a.groups.flatMap((g) => g.verbs.map((v) => v.verb)),
    ...(a.common?.verbs ?? []),
    ...(a.usual?.verbs ?? []),
  ];

  it('names each source in plain words, and the body on the usual line', async () => {
    const l = lever();
    const a = await ask();
    const g = a.groups.find((x) => x.ids.includes(l.stuffId));
    expect(g?.source).toMatchObject({ handle: 'lever', name: 'the lever', place: 'here' });
    expect(g?.verbs.map((v) => v.verb)).toContain('switch');
    expect(a.usual?.verbs.length).toBeGreaterThan(0);
    expect(a.ask.command).toBe('which');
  });

  it('⭐ listed ⇒ accepted: every verb named is one the line takes', async () => {
    lever();
    const n = note();
    ContainmentApi.move(n, me);
    const a = await ask();
    const listed = verbsOf(a);
    expect(listed.length).toBeGreaterThan(3);
    for (const verb of listed) {
      const parsed = CommandLineApi.parsePipeline(verb).commands[0]!;
      const m = me.matchAffordances(parsed);
      expect(m.ok && m.matches.length > 0, verb).toBe(true);
    }
  });

  it("a carried article: its own verbs under it, the article's on the closing line", async () => {
    const n = note();
    ContainmentApi.move(n, me);
    const a = await ask();
    const g = a.groups.find((x) => x.ids.includes(n.stuffId));
    // `move` onto a body lands it in a free hand (carrying.md).
    expect(g?.source.place).toMatch(/^in your (left|right) hand$/);
    expect(g?.verbs.map((v) => v.verb)).toContain('read');
    expect(g?.verbs.map((v) => v.verb)).not.toContain('throw');
    expect(a.common?.verbs).toContain('throw');
  });

  it('a held thing is named by the hand that holds it', async () => {
    const k = makeStuff(() => new Knife());
    k.setShortDescription('a knife');
    k.setKeywords(['knife']);
    k.setSlotClaims({ [PLAN]: ['hand:right'] });
    me.seatInSlot(k, 'hand:right');
    expect(k.whereFor(me)).toBe('in your right hand');
  });

  it('alike sources are one group, counted', async () => {
    const a1 = lever();
    const a2 = lever();
    const a = await ask();
    const g = a.groups.find((x) => x.ids.includes(a1.stuffId));
    expect(g?.ids).toContain(a2.stuffId);
    expect(g?.count).toBe(2);
    expect(g?.source.name).toBe('2 levers');
  });

  it('nothing the viewer cannot perceive is put in front of them', async () => {
    const l = lever();
    const real = PerceptionApi.perceives.bind(PerceptionApi);
    vi.spyOn(PerceptionApi, 'perceives').mockImplementation((v, t, ...rest) =>
      t === l ? false : real(v, t, ...(rest as [])),
    );
    const a = await ask();
    expect(a.groups.some((g) => g.ids.includes(l.stuffId))).toBe(false);
  });

  it('which <thing> answers only that thing', async () => {
    const l = lever();
    const n = note();
    ContainmentApi.move(n, me);
    const a = await ask('lever');
    expect(a.ask.mode).toBe('thing');
    expect(a.ask.command).toBe(`which #${l.stuffId}`);
    expect(a.groups.every((g) => g.ids.includes(l.stuffId))).toBe(true);
    expect(a.usual).toBeUndefined();
  });

  it('a word naming nothing is a verb: who gives it, or one line saying nothing does', async () => {
    const l = lever();
    const a = await ask('switch');
    expect(a.ask.mode).toBe('verb');
    expect(a.groups.map((g) => g.ids[0])).toEqual([l.stuffId]);
    const none = await CommandApi.which(me as never, 'bail');
    expect(none).toMatchObject({ ok: false, reason: 'nothing-gives-verb', facts: { verb: 'bail' } });
    const junk = await CommandApi.which(me as never, 'flurb');
    expect(junk).toMatchObject({ ok: false, reason: 'no-such-verb' });
  });
});
