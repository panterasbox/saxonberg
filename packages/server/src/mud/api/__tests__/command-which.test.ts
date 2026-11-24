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
import { RingableMixin } from '../../lib/perception/Ringable';
import Species from '../../platform/idea/species/Species';
import BodyPlan from '../../platform/idea/species/BodyPlan';
import Location from '../../lib/location/Location';
import Thing from '../../platform/thing/Thing';
import Good from '../../platform/thing/Good';
import { makeStuff, stampTemplatePathForTest } from '../../lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../lib/persistence/__tests__/quantity-marshaller-test-helpers';
import type { WhichAnswer } from '@saxonberg/types';
import type { Stuff } from '../../lib/stuff/Stuff';

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
  /** Ask `which`: nothing, a bound thing, or `{ verb }`. */
  const ask = async (q?: Stuff | { verb: string }): Promise<WhichAnswer> => {
    const opts = q === undefined ? {} : 'verb' in q && typeof q.verb === 'string' ? { verb: q.verb } : { thing: q as Stuff };
    const r = await CommandApi.which(me as never, opts);
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
    expect(g?.verbs.map((v) => v.verb)).not.toContain('ring');
    expect(a.common?.verbs).toContain('ring');
    // A body throws (the audit): `throw` is on the usual line.
    expect(a.usual?.verbs).toContain('throw');
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

  /** The radial's answer for `which <thing>`'s related section — stubbed: this
   *  fixture does not load the sense modalities `taste`'s validator reads. */
  const stubRadial = (): void => {
    vi.spyOn(CommandApi, 'resolveAffordances').mockResolvedValue({
      verbs: [{ verb: 'look', description: 'look', state: 'enabled', source: 'actor' }],
      composition: [],
    } as never);
  };

  it('which <thing> answers only that thing', async () => {
    stubRadial();
    const l = lever();
    const n = note();
    ContainmentApi.move(n, me);
    const a = await ask(l);
    expect(a.ask.mode).toBe('thing');
    expect(a.ask.command).toBe(`which #${l.stuffId}`);
    expect(a.groups.every((g) => g.ids.includes(l.stuffId))).toBe(true);
    expect(a.usual).toBeUndefined();
  });

  it('a word naming nothing is a verb: who gives it, or one line saying nothing does', async () => {
    const l = lever();
    const a = await ask({ verb: 'switch' });
    expect(a.ask.mode).toBe('verb');
    expect(a.groups.map((g) => g.ids[0])).toEqual([l.stuffId]);
    const none = await CommandApi.which(me as never, { verb: 'bail' });
    expect(none).toMatchObject({ ok: false, reason: 'nothing-gives-verb', facts: { verb: 'bail' } });
    const junk = await CommandApi.which(me as never, { verb: 'flurb' });
    expect(junk).toMatchObject({ ok: false, reason: 'no-such-verb' });
  });

  describe('the affordance audit (W2) — verbs on the hosts that mean them', () => {
    it('a thing on the floor, a fixture and a person give no throw and no ring', async () => {
      const floor = note();
      ContainmentApi.move(floor, room);
      const fixture = lever();
      const other = makeStuff(() => new Person());
      ContainmentApi.move(other, room);
      const a = await ask();
      for (const id of [floor.stuffId, fixture.stuffId, other.stuffId]) {
        const verbs = a.groups.filter((g) => g.ids.includes(id)).flatMap((g) => g.verbs.map((v) => v.verb));
        expect(verbs).not.toContain('throw');
        expect(verbs).not.toContain('ring');
      }
      expect(a.common).toBeUndefined();
      expect(a.usual?.verbs).toContain('throw');
    });

    it('what you hold gives ring; your body throws', async () => {
      const n = note();
      ContainmentApi.move(n, me);
      const a = await ask();
      expect(a.common?.verbs).toEqual(['ring']);
    });

    it('the census: who contributes throw and ring, and to whom', () => {
      const of = (ctor: unknown, b: 'environment' | 'peers'): string[] =>
        CommandApi.collectContributions(ctor, b).map((d) => d.getPrimaryVerb());
      expect(of(Good, 'peers')).not.toContain('throw');
      expect(of(Good, 'peers')).not.toContain('ring');
      expect(of(Good, 'environment')).toEqual(['ring']);
      expect(of(Person, 'peers')).not.toContain('throw');
      expect(CommandApi.collectSelfDefs(Person).map((d) => d.getPrimaryVerb())).toContain('throw');
      expect(of(Location, 'environment')).not.toContain('throw');
      class Bell extends RingableMixin(Good) {}
      expect(of(Bell, 'peers')).toContain('ring');
    });
  });

  describe('which ~ (W3)', () => {
    it('lists every built-in word with its meaning', () => {
      const r = CommandApi.whichRelations(me as never);
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      const names = r.facts.relations!.map((x) => x.name);
      expect(names).toEqual(expect.arrayContaining(['here', 'inventory', 'peers', 'contacts']));
      expect(r.facts.relations!.find((x) => x.name === 'here')?.meaning).toBe('the place you stand in');
      expect(r.facts.ask.command).toBe('which ~');
    });

    it('a thing that keeps nothing says so', () => {
      const l = lever();
      expect(CommandApi.whichRelations(me as never, l)).toMatchObject({ ok: false, reason: 'keeps-nothing', facts: { thing: 'the lever' } });
    });
  });

  describe('review: one group per place and verbs; where a verb comes from; related', () => {
    it('different things giving the same verbs from the same place are one group, all named', async () => {
      const l = lever();
      const p = makeStuff(() => new Lever());
      p.setShortDescription('a pull');
      p.setKeywords(['pull']);
      ContainmentApi.move(p, room);
      const a = await ask();
      const g = a.groups.find((x) => x.ids.includes(l.stuffId))!;
      expect(g.ids).toContain(p.stuffId);
      expect(g.source.name).toMatch(/the lever and the pull|the pull and the lever/);
    });

    it('⭐ the same view from two things is ONE command, not a collision (owner)', async () => {
      lever();
      const p = makeStuff(() => new Lever());
      p.setShortDescription('a pull');
      p.setKeywords(['pull']);
      ContainmentApi.move(p, room);
      const a = await ask({ verb: 'switch' });
      expect(a.collisions ?? []).toEqual([]);
      // …and throw's three shapes from one body are one command too.
      const t = await ask({ verb: 'throw' });
      expect(t.collisions ?? []).toEqual([]);
    });

    it('two views behind one word is a collision, each meaning with its scope', async () => {
      // A fixture whose `switch` is a DIFFERENT view than the lever's.
      class Dial extends Thing {
        static override commandContributions = { peers: ['platform/cmd/device/draught.yaml'] };
      }
      class Vent extends Thing {
        static override commandContributions = { peers: ['platform/cmd/device/draught-set.yaml'] };
      }
      const d = makeStuff(() => new Dial());
      d.setShortDescription('a dial');
      d.setKeywords(['dial']);
      ContainmentApi.move(d, room);
      const v = makeStuff(() => new Vent());
      v.setShortDescription('a vent');
      v.setKeywords(['vent']);
      ContainmentApi.move(v, room);
      const a = await ask({ verb: 'draught' });
      const c = a.collisions?.find((x) => x.verb === 'draught');
      expect(c?.meanings.map((m) => m.scope).sort()).toEqual(['dial::draught', 'vent::draught']);
      // Bare `which` volunteers nothing; `--clashes` asks.
      expect((await ask()).collisions).toBeUndefined();
      const asked = await CommandApi.which(me as never, { clashes: true });
      expect(asked.ok && asked.facts.collisions?.some((x) => x.verb === 'draught')).toBe(true);
    });

    it('which <thing> --to: what you can do to it, only verbs that ask something of it', async () => {
      // The radial offers `look` (any visible thing) and `switch` (a Switchable).
      vi.spyOn(CommandApi, 'resolveAffordances').mockResolvedValue({
        verbs: [
          { verb: 'look', description: 'look', state: 'enabled', source: 'actor' },
          { verb: 'switch', description: 'switch', state: 'enabled', source: 'actor' },
        ],
        composition: [],
      } as never);
      const l = lever();
      expect((await ask(l)).actsOn).toBeUndefined();
      const r = await CommandApi.which(me as never, { thing: l, to: true });
      if (!r.ok) throw new Error(r.reason);
      expect(r.facts.actsOn).toContain('switch');
      expect(r.facts.actsOn).not.toContain('look');
    });
  });
});
