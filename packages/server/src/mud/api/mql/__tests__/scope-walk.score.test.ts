/**
 * scoreCandidate — the KEYWORD tiers (one-resolution slate § 4: the name is
 * not special). The scorer reads one list, the candidate's keywords, and
 * each drive finding that once created a NAME tier keeps its outcome by the
 * keyword data the object carries — the real rows' keywords below.
 */

import "../../../../test-bootstrap";
import { describe, it, expect } from 'vitest';
import {
  scoreCandidate,
  scoreCandidates,
  scoreTier,
  TIER_PHRASE,
  TIER_WORDS,
  TIER_PREFIX,
} from '../scope-walk';
import type { ScopeCandidate } from '../scope-walk';

const cand = (keywords: string[]): ScopeCandidate =>
  ({ stuff: { keywords } as never, keywords }) as ScopeCandidate;

describe('the keyword tiers', () => {
  it('a keyword IS the phrase · every word a whole word · every word begins one · partials', () => {
    const rod = cand(['rod', 'cane rod', 'long cane rod']);
    expect(scoreCandidate(rod, ['cane', 'rod'])).toBe(TIER_PHRASE);
    expect(scoreCandidate(cand(['long cane rod']), ['cane', 'rod'])).toBe(TIER_WORDS);
    expect(scoreCandidate(cand(['long cane rod']), ['can', 'rod'])).toBe(TIER_PREFIX);
    expect(scoreCandidate(cand(['long cane rod']), ['can', 'pole'])).toBe(10);
    expect(scoreCandidate(cand(['long cane rod']), ['pole'])).toBe(0);
  });

  it('scoreTier: 3 · 2 · 1 · 0 (partials are one tier)', () => {
    expect([TIER_PHRASE, TIER_WORDS, TIER_PREFIX, 20, 10].map(scoreTier)).toEqual([3, 2, 1, 0, 0]);
  });

  it('a name is a keyword like any other — no list but the keywords is read', () => {
    // The candidate carries no name field at all; what is not a keyword
    // cannot be matched.
    expect(scoreCandidate(cand([]), ['net'])).toBe(0);
  });

  it('three rods still tie on `rod` — which is the prompt, and correct', () => {
    const rods = [cand(['rod', 'cane rod']), cand(['rod', 'float rod']), cand(['rod', 'leger rod'])];
    expect(scoreCandidates(rods, ['rod'])).toHaveLength(3);
  });
});

/* ── the six drive findings, on keyword data ── */

describe('⭐ field population pass 4 — `look at the top end` is the PATCH, not the stand in it', () => {
  // `Field.configureField`: the patch answers to its stem, its words and
  // its key. `Plant.getKeywords`: a stand answers to its patch's name as a
  // QUALIFIER of its own words (`top end wheat`), never bare.
  const patch = cand(['top end', 'top', 'end', 'top-end']);
  const stand = cand(['wheat', 'stand', 'top end wheat', 'top-end wheat', 'top end stand', 'top-end stand']);

  it('`top end` keeps the patch and cuts the stand', () => {
    const got = scoreCandidates([stand, patch], ['top', 'end']);
    expect(got.map((m) => m.stuff)).toEqual([patch.stuff]);
    expect(got[0]!.score).toBe(TIER_PHRASE);
  });

  it('`top end wheat` still binds the stand', () => {
    expect(scoreCandidates([stand, patch], ['top', 'end', 'wheat']).map((m) => m.stuff)).toEqual([stand.stuff]);
  });

  it('`middle` binds the patch named middle, not the stand standing in it', () => {
    const middle = cand(['middle']);
    const midStand = cand(['wheat', 'stand', 'middle wheat', 'middle stand']);
    expect(scoreCandidates([midStand, middle], ['middle']).map((m) => m.stuff)).toEqual([middle.stuff]);
  });
});

describe('⭐ ceramics browser walk — `look clay` at the pit is the lumps', () => {
  // clay-pit.yaml: [pit, "clay pit", face, working, wall] — no bare `clay`.
  // trade-quarrying clay.yaml: [clay, lump].
  const pit = cand(['pit', 'clay pit', 'face', 'working', 'wall']);
  const lumps = cand(['clay', 'lump']);

  it('`clay` keeps the lumps and cuts the pit', () => {
    expect(scoreCandidates([pit, lumps], ['clay']).map((m) => m.stuff)).toEqual([lumps.stuff]);
  });

  it('`clay pit` still names the pit', () => {
    expect(scoreCandidates([pit, lumps], ['clay', 'pit']).map((m) => m.stuff)).toEqual([pit.stuff]);
  });
});

describe('⭐ fishing drive ×3 — whole words beat substrings', () => {
  // net.yaml: [net, seine, trap]; keepnet.yaml: [keepnet, keep-net, net-bag].
  const net = cand(['net', 'seine', 'trap']);
  const keepnet = cand(['keepnet', 'keep-net', 'net-bag']);

  it('`haul net` with a keepnet in hand is the net', () => {
    expect(scoreCandidates([keepnet, net], ['net']).map((m) => m.stuff)).toEqual([net.stuff]);
  });

  it('`eel` begins no word of `creel`; `edge` none of `ledger rod`', () => {
    expect(scoreCandidate(cand(['creel', 'basket']), ['eel'])).toBe(0);
    expect(scoreCandidate(cand(['rod', 'ledger rod']), ['edge'])).toBe(0);
    expect(scoreCandidate(cand(['edge', "river's edge"]), ['edge'])).toBe(TIER_PHRASE);
  });
});

describe('⭐ rubber live — `get "latex cup"` takes the cups, never the coagulating pan', () => {
  // latex-cup.yaml: [cup, "latex cup", latex, "tapping cup", tin] (bare
  // `latex` added by this pass); coagulating-pan.yaml: [pan,
  // "coagulating pan", tray, "latex pan"].
  const cup = cand(['cup', 'latex cup', 'latex', 'tapping cup', 'tin']);
  const pan = cand(['pan', 'coagulating pan', 'tray', 'latex pan']);

  it('`latex cup` keeps the cups and drops the pan', () => {
    expect(scoreCandidates([cup, pan, cup], ['latex', 'cup'])).toHaveLength(2);
  });

  it('bare `latex` is the cups too (their keyword is the phrase)', () => {
    expect(scoreCandidates([cup, pan], ['latex']).map((m) => m.stuff)).toEqual([cup.stuff]);
  });

  it('with no whole match, the partials still stand (the fallback)', () => {
    expect(scoreCandidates([pan], ['latex', 'cup'])).toHaveLength(1);
  });
});

describe('⛔ ceramics drive C, run 28 — a mid-word substring is no match', () => {
  it('`plant pot` never binds an aether imPLANT', () => {
    // AetherImplant.yaml: [implant, aether].
    expect(scoreCandidate(cand(['implant', 'aether']), ['plant', 'pot'])).toBe(0);
    expect(scoreCandidate(cand(['plant pot', 'pot']), ['plant', 'pot'])).toBe(TIER_PHRASE);
  });

  it('`get 1 brick` is the bricks, not the brick table — and no word is reached by its tail', () => {
    // brick-table.yaml: [table, "brick table", "moulding table", bench].
    const table = cand(['table', 'brick table', 'moulding table', 'bench']);
    const bricks = cand(['brick', 'bricks']);
    expect(scoreCandidates([table, bricks], ['brick']).map((m) => m.stuff)).toEqual([bricks.stuff]);
    expect(scoreCandidate(table, ['ble'])).toBe(0);
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
import Place from '../../../lib/stuff/Place';
import { makeStuff } from '../../../lib/security/__tests__/test-setup';

class Angler extends PerceptionMixin(SensorMixin(ContainerMixin(ContainableMixin(Idea)))) {}
class Gear extends VisibleMixin(PerceptibleMixin(ContainableMixin(Idea))) {}

describe('reachable:net — the whole-word tier in situ (fishing B8)', () => {
  it('⭐ resolves to the net on the floor, not the keepnet in hand, under the top policy', () => {
    const room = makeStuff(() => new Place());
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
