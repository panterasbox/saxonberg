/**
 * FerryExit — ⭐ a crossing that is a boat (river D31): she must lie at
 * this landing, the river must let her across, the fare is the
 * ferryman's, and the glide lands a hand who knows at the far landing and
 * one who does not downstream of it.
 */
import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { EmploymentApi } from '@saxonberg/server/mud/api/employment';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { makeStuff } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import FerryExit from '../idea/FerryExit';
import FerryService from '../idea/FerryService';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';

const FERRY = '/system/transport/thing/ferry';

let current = 0.5;
let contents: Stuff[] = [];
const ferry = { getTemplatePath: () => FERRY, stuffId: 'ferry' } as unknown as Stuff;
const landing = { getTemplatePath: () => '/here', getContents: () => contents } as unknown as Stuff;
const far = { getTemplatePath: () => '/there', getFrameSite: () => ({ frame: '/stuff/idea/Watercourse/kestrel', cite: 'confluence+0.4,right' }) } as unknown as Stuff;
const stop = { stuffId: 'stop' } as unknown as Stuff;
const moves: Array<[string, string]> = [];

function exitFor(): FerryExit {
  const e = makeStuff(() => new FerryExit());
  e.setFerry(FERRY);
  e.setHouse('/house');
  e.setFareMinor(2);
  e.setCrossesAt({ frame: '/stuff/idea/Watercourse/kestrel', cite: 'confluence+0.4' });
  vi.spyOn(e, 'getSource').mockReturnValue(landing as never);
  vi.spyOn(e, 'getDestination').mockReturnValue(far as never);
  return e;
}

function person(id: string, band = 'untrained', job: unknown = null): Stuff {
  return {
    stuffId: id,
    getPresentation: () => id,
    competenceBandFor: async () => band,
    getEmployment: () => job,
  } as unknown as Stuff;
}

beforeEach(() => {
  current = 0.5;
  contents = [ferry];
  moves.length = 0;
  vi.spyOn(MixinApi, 'isContainer').mockImplementation(((x: unknown) => x === landing || x === stop) as never);
  vi.spyOn(MixinApi, 'isContainable').mockReturnValue(true);
  vi.spyOn(MixinApi, 'isAdvancing').mockReturnValue(true);
  vi.spyOn(MixinApi, 'isFrameSited').mockImplementation(((x: unknown) => x === far) as never);
  vi.spyOn(MixinApi, 'isEmployed').mockImplementation(((x: { getEmployment?: () => unknown }) => x.getEmployment?.() != null) as never);
  vi.spyOn(ContainmentApi, 'move').mockImplementation(((t: Stuff, to: Stuff) => {
    moves.push([t.stuffId, (to as unknown as { stuffId?: string }).stuffId ?? (to.getTemplatePath?.() ?? '?')]);
  }) as never);
  vi.spyOn(MessageApi, 'scene').mockImplementation((() => {
    const c = { topic: () => c, toSelf: () => c, send: () => undefined };
    return c;
  }) as never);
  // The river frame (the kernel's `LineFrame`): the water at the crossing,
  // where a landing stands, and the shallows a drifting ferry lands in.
  const river = {
    waterAt: async () => ({ currentMps: current, widthM: 90, depthM: 2 }),
    locate: async (cite: string) => ({ course: 'kestrel', km: 8.6, across: cite.endsWith(',right') ? 85 : 0 }),
    shallowsAt: async () => stop,
  };
  vi.spyOn(MixinApi, 'isLineFrame').mockImplementation(((x: unknown) => x === river) as never);
  vi.spyOn(StuffApi, 'singleton').mockImplementation((async (p: string) => {
    if (p === '/stuff/idea/Watercourse/kestrel') return river;
    throw new Error(p);
  }) as never);
});

afterEach(() => vi.restoreAllMocks());

describe('⭐ to the timetable (W12)', () => {
  function timetabled(phase: string, next: number | null): FerryExit {
    const e = exitFor();
    e.setService('/svc');
    const svc = Object.assign(Object.create(FerryService.prototype), {
      isTimetabled: () => phase !== 'on-call',
      boardingAt: (l: string) => phase === `boarding:${l}`,
      nextDepartureFrom: () => next,
      clockWords: () => '07:00',
    });
    vi.spyOn(e, 'liveService').mockResolvedValue(svc);
    return e;
  }

  it('in its hours a passenger boards only when boarding is called here, and is told the next boat', async () => {
    const no = await timetabled('alongside:/there', 25_200).canTraverse(person('me') as never);
    expect(no).toMatchObject({ ok: false, reason: expect.stringMatching(/next boat from here leaves at 07:00/) });
    const none = await timetabled('alongside:/there', null).canTraverse(person('me') as never);
    expect(none).toMatchObject({ ok: false, reason: expect.stringMatching(/no more boats/) });
    const yes = await timetabled('boarding:/here', 25_200).canTraverse(person('me') as never);
    expect(yes.ok).toBe(true);
  });

  it('the house’s ferryman runs it, and is never held to it', async () => {
    const g = await timetabled('alongside:/there', 25_200).canTraverse(
      person('orrin', 'expert', { positionKey: 'ferryman', status: 'on-shift' }) as never,
    );
    expect(g.ok).toBe(true);
  });
});

describe('FerryExit (river D31)', () => {
  it('⭐ only when she lies at this landing — across the water, ring the bell', async () => {
    contents = [];
    const g = await exitFor().canTraverse(person('me') as never);
    expect(g.ok).toBe(false);
    expect(g.reason).toMatch(/Ring the bell/);
  });

  it('⭐ not at this water: the ferryman’s threshold', async () => {
    current = 1.5;
    const g = await exitFor().canTraverse(person('me') as never);
    expect(g.ok).toBe(false);
    expect(g.reason).toMatch(/Not at this water/);
  });

  it('⭐⭐ the ferryman on shift poles: he holds her bow up and she lands at the far landing; the fare is his house’s', async () => {
    const sale = vi.spyOn(EmploymentApi, 'settleSale').mockResolvedValue(null);
    const ferryman = person('nesbit', 'expert', { positionKey: 'ferryman', status: 'on-shift' });
    contents = [ferry, ferryman];
    const me = person('me');
    const handled = await exitFor().applyTraversal(me as never);
    expect(handled).toBe(false); // the ordinary move: the wagon is towed
    expect(sale).toHaveBeenCalledWith('/here', 2, 2, 'a ferry fare', []);
    expect(moves).toContainEqual(['ferry', '/there']);
    expect(moves).toContainEqual(['nesbit', '/there']);
  });

  it('⭐ a hand who does not angle her lands downstream of the landing, with the ferry', async () => {
    const sale = vi.spyOn(EmploymentApi, 'settleSale').mockResolvedValue(null);
    current = 1.0;
    const me = person('me', 'untrained');
    const handled = await exitFor().applyTraversal(me as never);
    expect(handled).toBe(true);
    expect(moves).toContainEqual(['me', 'stop']);
    expect(moves).toContainEqual(['ferry', 'stop']);
    // You poled yourself: nobody to pay.
    expect(sale).not.toHaveBeenCalled();
  });

  it('⭐ on a cable the current walks her across: nobody poles, and she lands at the landing', async () => {
    const { default: FerryCable } = await import('../thing/FerryCable');
    const cable = makeStuff(() => new FerryCable());
    vi.spyOn(cable, 'getTemplatePath').mockReturnValue('/cable');
    contents = [ferry, cable as unknown as Stuff];
    const e = exitFor();
    e.setTethered('/cable');
    current = 1.0;
    expect(await e.applyTraversal(person('me') as never)).toBe(false);
    expect(moves).toContainEqual(['ferry', '/there']);
    // Slack water: nothing to drive her.
    current = 0.1;
    const g = await e.canTraverse(person('me') as never);
    expect(g.reason).toMatch(/no current to drive her/);
  });
});
