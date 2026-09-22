/**
 * Feedback (nutrition-and-fitness W8): the body's state as WORDS, and
 * the moment it changes. `bodyState()` is the shelf's BODY row —
 * breath · hunger · thirst as bands; `noteBodyState()` pokes the live
 * self card when a band turns over and says the breath cue on a
 * crossing (*"You're winded."* / *"You're spent."* / *"You've got your
 * breath back."*) — crossings only, never every slice, and the first
 * read of a session is silent.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Creature } from '../../creature/Creature';
import { StuffApi } from '../../../api/stuff';
import { AppApi } from '../../../api/app';
import { MessageApi } from '../../../api/message';
import { MqlSubscriptionApi } from '../../../api/mql-subscription';
import { Quantity } from '../../quantity';
import { makeStuff, stampTemplatePathForTest } from '../../security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';

describe('the body as words, and the moment it changes', () => {
  let lines: string[];
  let pokes: string[];

  beforeEach(() => {
    installV1QuantityMarshallers();
    vi.spyOn(AppApi, 'setting').mockReturnValue('');
    lines = [];
    pokes = [];
    vi.spyOn(MessageApi, 'scene').mockImplementation(() => {
      const b: Record<string, unknown> = {};
      b.topic = () => b;
      b.toSelf = (body: { toString(): string }) => {
        lines.push(body.toString());
        return b;
      };
      b.toPeers = () => b;
      b.send = () => {};
      return b as never;
    });
    vi.spyOn(MqlSubscriptionApi, 'notifyDurableSubject').mockImplementation((s: string) => {
      pokes.push(s);
    });
  });
  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  const body = (): Creature => {
    const c = makeStuff(() => new Creature());
    stampTemplatePathForTest(c, '/platform/agent/Avatar/p1');
    c.setMass(Quantity.of(70, 'kg'));
    c.noteBodyState(); // the session's first read: silent
    return c;
  };
  const set = (c: Creature, key: string, level: number): void => {
    const cur = c.getReserve(key)!.current.rawValue();
    c.adjustReserve(key, Quantity.of(level - cur, '%'));
  };

  it('a fresh body reads fresh · full · fine, and the build beside it on the card', () => {
    const c = body();
    expect(c.bodyState()).toEqual({ breath: 'fresh', hunger: 'full', thirst: 'fine' });
    const field = Creature.subscribableFields.find((f) => f.name === 'bodyState')!;
    expect(field.read!(c, c as never)).toEqual({
      breath: 'fresh', hunger: 'full', thirst: 'fine', build: 'in good flesh',
    });
  });

  it('the breath bands sit on the dials: fresh ≥ 70, tired, winded < 50, spent ≤ 10', () => {
    const c = body();
    for (const [level, band] of [[100, 'fresh'], [70, 'fresh'], [69, 'tired'], [50, 'tired'], [49, 'winded'], [11, 'winded'], [10, 'spent'], [0, 'spent']] as const) {
      set(c, 'endurance', level);
      expect(c.breathBand(), String(level)).toBe(band);
    }
  });

  it('⭐ the first read is silent; a crossing speaks ONCE and pokes the card', () => {
    const c = body();
    expect(lines).toEqual([]);
    expect(pokes).toEqual([]);
    // Six exits of running: 100 → 88 → 76 → 64 → 52 → 40. Tired at 64,
    // winded at 40 — one cue, for the winded crossing; two pokes, one per
    // band that turned over.
    for (let i = 0; i < 5; i++) c.exert({ durationS: 60, powerW: 600 });
    expect(lines).toEqual(["You're winded."]);
    expect(pokes).toHaveLength(2);
    // More running in the same band: nothing more is said or poked.
    c.exert({ durationS: 60, powerW: 600 });
    expect(lines).toHaveLength(1);
    expect(pokes).toHaveLength(2);
  });

  it('spent has its own line; the climb back gets one line for the whole of it', () => {
    const c = body();
    set(c, 'endurance', 12);
    c.noteBodyState(); // winded, silently re-seeded below the first read
    lines.length = 0;
    c.exert({ durationS: 60, powerW: 600 });
    expect(lines).toEqual(["You're spent."]);
    set(c, 'endurance', 30); // recovery, as the metabolism would
    c.noteBodyState();
    expect(lines).toEqual(["You're spent."]); // spent → winded: still short of breath, no line
    set(c, 'endurance', 55);
    c.noteBodyState();
    expect(lines).toEqual(["You're spent.", "You've got your breath back."]);
  });

  it('hunger and thirst turn the card over without a breath line', () => {
    const c = body();
    set(c, 'satiation', 20);
    c.noteBodyState();
    expect(c.bodyState().hunger).toBe('hungry');
    expect(pokes).toHaveLength(1);
    expect(lines).toEqual([]);
    set(c, 'hydration', 10);
    c.noteBodyState();
    expect(c.bodyState().thirst).toBe('thirsty');
    expect(pokes).toHaveLength(2);
  });
});
