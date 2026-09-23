/**
 * scoreCandidate — the whole-word tier (fishing B8). A query word that
 * is a WORD of the name beats one that is merely a substring of it:
 * `net` finds "a net" over "a keepnet", `edge` finds "the river's edge"
 * over "a ledger rod". Before this tier both scored 50 and the tie fell
 * to pool order, so `haul net` with a keepnet in hand hauled the keepnet.
 */

import "../../../../test-bootstrap";
import { describe, it, expect } from 'vitest';
import { scoreCandidate } from '../scope-walk';
import type { ScopeCandidate } from '../scope-walk';

const cand = (name: string, keywords: string[] = []): ScopeCandidate =>
  ({ stuff: {} as never, name, keywords }) as ScopeCandidate;

describe('scoreCandidate — whole words beat substrings', () => {
  it('⭐ `net`: "a net" (a whole word, 60) over "a keepnet" (a substring, 50)', () => {
    expect(scoreCandidate(cand('a net'), ['net'])).toBe(60);
    expect(scoreCandidate(cand('a keepnet'), ['net'])).toBe(50);
  });

  it('⭐ `edge`: "the river\'s edge" over "a ledger rod"', () => {
    expect(scoreCandidate(cand("the river's edge"), ['edge'])).toBeGreaterThan(scoreCandidate(cand('a ledger rod'), ['edge']));
  });

  it('an exact single-word name is still the top (100); every query word must be a whole word for 60', () => {
    expect(scoreCandidate(cand('net'), ['net'])).toBe(100);
    expect(scoreCandidate(cand('a cane rod'), ['cane', 'rod'])).toBe(60);
    expect(scoreCandidate(cand('a cane rod'), ['can', 'rod'])).toBe(50);
  });

  it('three rods still tie on `rod` — which is the prompt, and correct', () => {
    const rods = ['a cane rod', 'a float rod', 'a leger rod'].map((n) => scoreCandidate(cand(n), ['rod']));
    expect(new Set(rods).size).toBe(1);
  });
});

/* ── in situ: a keepnet in hand and a net on the floor ── */

import { MqlApi } from '../../mql';
import { ContainmentApi } from '../../containment';
import { PerceptionMixin } from '../../../lib/perception/Perception';
import { SensorMixin } from '../../../lib/message/Sensor';
import { VisibleMixin } from '../../../lib/description/Visible';
import { PerceptibleMixin } from '../../../lib/description/Perceptible';
import { ContainableMixin } from '../../../lib/spatial/Containable';
import { ContainerMixin } from '../../../lib/spatial/Container';
import { Idea } from '../../../lib/stuff/Idea';
import Location from '../../../lib/stuff/Location';
import { makeStuff } from '../../../lib/security/__tests__/test-setup';

class Angler extends PerceptionMixin(SensorMixin(ContainerMixin(ContainableMixin(Idea)))) {}
class Gear extends VisibleMixin(PerceptibleMixin(ContainableMixin(Idea))) {}

describe('reachable:net — the whole-word tier in situ (fishing B8)', () => {
  it('⭐ resolves to the net on the floor, not the keepnet in hand, under the top policy', () => {
    const room = makeStuff(() => new Location());
    const angler = makeStuff(() => new Angler());
    const net = makeStuff(() => new Gear());
    net.setShortDescription('net');
    net.setKeywords(['net', 'seine', 'trap']);
    const keepnet = makeStuff(() => new Gear());
    keepnet.setShortDescription('keepnet');
    keepnet.setKeywords(['keepnet', 'keep-net', 'net-bag']);
    ContainmentApi.move(angler, room);
    ContainmentApi.move(keepnet, angler);
    ContainmentApi.move(net, room);
    const ctx = { commandGiver: angler as never, scope: 'reachable' as const };
    const many = MqlApi.resolveMany('reachable:net', ctx);
    expect(many.stuff.map((s) => s.stuffId)).toContain(net.stuffId);
    expect(MqlApi.resolveOne('reachable:net', ctx).stuff?.stuffId).toBe(net.stuffId);
  });
});
