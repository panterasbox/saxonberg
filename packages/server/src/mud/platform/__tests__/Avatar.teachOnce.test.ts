/**
 * ⭐ persistence-model N11/D12 — teach once, never nag. The kept line is said
 * on the first day, once more on a LATER day, and then never; a second
 * time the same day says nothing.
 *
 * ⭐ D14 — ground takes ground: a footprint is its two longest sides, each
 * clipped to the floor, so one oversized thing still lies in an empty field.
 */
import '../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Avatar from '../agent/PrimaryAvatar';
import { StuffApi } from '../../api/stuff';
import { MessageApi } from '../../api/message';
import { WorldClockApi } from '../../api/worldclock';
import { Mml } from '../../api/mml';
import { Quantity } from '../../lib/quantity';
import { Dimensions } from '../../lib/spatial/Dimensions';
import { makeStuff } from '../../lib/security/__tests__/test-setup';

let now = 100 * 86_400;
let said = 0;

beforeEach(() => {
  StuffApi.clearAll();
  said = 0;
  now = 100 * 86_400;
  vi.spyOn(WorldClockApi, 'getNow').mockImplementation(() => Quantity.of(now, 's'));
  vi.spyOn(MessageApi, 'scene').mockImplementation((() => {
    const scene = { topic: () => scene, toSelf: () => scene, send: () => void said++ };
    return scene;
  }) as unknown as typeof MessageApi.scene);
});
afterEach(() => vi.restoreAllMocks());

describe('⭐ Avatar.teachOnce', () => {
  it('says it today, not again today, once more on a later day, then never', () => {
    const me = makeStuff(() => new Avatar());
    const line = Mml.compose`Not kept.`;
    expect(me.teachOnce('kept', line)).toBe(true);
    expect(me.teachOnce('kept', line)).toBe(false); // the same day: silent
    now += 3 * 86_400;
    expect(me.teachOnce('kept', line)).toBe(true); // a later day: once more
    now += 3 * 86_400;
    expect(me.teachOnce('kept', line)).toBe(false); // then never
    expect(said).toBe(2);
    expect(me.getSetting<number[]>('hints.kept')).toHaveLength(2);
  });
});

describe('⭐ Dimensions.footprintWithin', () => {
  it('lies on its broadest face, clipped to the floor', () => {
    const floor = new Dimensions(10, 10, 100);
    expect(new Dimensions(1, 1, 1).footprintWithin(floor)).toBeCloseTo(1, 9);
    // A pole lies down: 3 m × 0.1 m.
    expect(new Dimensions(0.1, 0.1, 3).footprintWithin(floor)).toBeCloseTo(0.3, 9);
    // A whale skeleton in a small yard takes the whole yard and no more.
    expect(new Dimensions(4, 20, 3).footprintWithin(floor)).toBeCloseTo(10 * 4, 9);
  });
});
