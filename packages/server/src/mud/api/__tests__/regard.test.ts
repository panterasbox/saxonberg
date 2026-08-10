/**
 * RegardApi / RegardLogic — the per-viewer attitude seam.
 *
 * Two concerns:
 *  1. Encapsulation — RegardApi forwards to the RegardLogic singleton at
 *     `/obj/api/regard`, gated `FromModule('/api/regard#RegardApi')`; a
 *     direct logic-method call from any other module is denied.
 *  2. Behavior — get/adjust/set/clear/held-by through the Api against a
 *     real belief-store viewer: accumulation, the -100..+100 clamp,
 *     directed/asymmetric edges, and kind-agnostic player/NPC combos.
 *
 * Pure in-memory (write-through no-ops with Mongo disconnected).
 */

import "../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { RegardApi } from '../regard';
import { RegardLogic } from '../../obj/api/RegardLogic';
import { BeliefStoreMixin } from '../../lib/belief/BeliefStore';
import { Idea } from '../../lib/stuff/Idea';
import { SecurityError } from '../../lib/security/errors';
import { StuffApi } from '../stuff';
import { makeStuffAtPath } from '../../lib/security/__tests__/test-setup';

// Two trivially-distinct holder/subject kinds. The substrate stores NO
// player/NPC marker — these exist only to document the kind-agnostic combos.
class PlayerView extends BeliefStoreMixin(Idea) {}
class NpcView extends BeliefStoreMixin(Idea) {}

beforeEach(() => StuffApi.clearAll());
afterEach(() => StuffApi.clearAll());

describe('RegardLogic singleton encapsulation', () => {
  it('denies a direct logic-method call from a non-RegardApi caller', () => {
    const logic = makeStuffAtPath(() => new RegardLogic(), '/obj/api/regard');
    expect(StuffApi.findByTemplatePath('/obj/api/regard')).toBe(logic);
    // The test module is not mud/api/regard#RegardApi nor the singleton
    // itself; the gate denies before the body runs.
    expect(() => logic.getRegard(logic, logic)).toThrow(SecurityError);
  });
});

describe('RegardApi behavior', () => {
  function viewerAt(path: string): PlayerView {
    return makeStuffAtPath(() => new PlayerView(), path);
  }
  function subjectAt(path: string): Idea {
    return makeStuffAtPath(() => new Idea(), path);
  }

  it('getRegard returns 0 when no opinion is held', () => {
    const alice = viewerAt('/obj/Avatar/alice');
    const bob = subjectAt('/obj/npc/bob');
    expect(RegardApi.getRegard(alice, bob)).toBe(0);
  });

  it('adjustRegard accumulates across calls', () => {
    const alice = viewerAt('/obj/Avatar/alice');
    const bob = subjectAt('/obj/npc/bob');
    RegardApi.adjustRegard(alice, bob, 3);
    RegardApi.adjustRegard(alice, bob, 3);
    expect(RegardApi.getRegard(alice, bob)).toBe(6);
    RegardApi.adjustRegard(alice, bob, -10);
    expect(RegardApi.getRegard(alice, bob)).toBe(-4);
  });

  it('setRegard sets an absolute value', () => {
    const alice = viewerAt('/obj/Avatar/alice');
    const bob = subjectAt('/obj/npc/bob');
    RegardApi.adjustRegard(alice, bob, 20);
    RegardApi.setRegard(alice, bob, 5);
    expect(RegardApi.getRegard(alice, bob)).toBe(5);
  });

  it('clearRegard returns to no opinion', () => {
    const alice = viewerAt('/obj/Avatar/alice');
    const bob = subjectAt('/obj/npc/bob');
    RegardApi.setRegard(alice, bob, 42);
    RegardApi.clearRegard(alice, bob);
    expect(RegardApi.getRegard(alice, bob)).toBe(0);
  });

  it('regardsHeldBy snapshots every regard the viewer holds', () => {
    const alice = viewerAt('/obj/Avatar/alice');
    const bob = subjectAt('/obj/npc/bob');
    const gus = subjectAt('/obj/npc/gus');
    RegardApi.setRegard(alice, bob, 10);
    RegardApi.setRegard(alice, gus, -5);
    const held = RegardApi.regardsHeldBy(alice);
    expect(held.size).toBe(2);
    expect(held.get('/obj/npc/bob')).toBe(10);
    expect(held.get('/obj/npc/gus')).toBe(-5);
  });

  it('regard is directed/asymmetric: A→B does not imply B→A', () => {
    const alice = viewerAt('/obj/Avatar/alice');
    const bob = viewerAt('/obj/Avatar/bob');
    RegardApi.setRegard(alice, bob, 50);
    expect(RegardApi.getRegard(alice, bob)).toBe(50);
    expect(RegardApi.getRegard(bob, alice)).toBe(0); // untouched
  });

  it('clamps into the normative -100..+100 range', () => {
    const alice = viewerAt('/obj/Avatar/alice');
    const bob = subjectAt('/obj/npc/bob');
    RegardApi.adjustRegard(alice, bob, 250);
    expect(RegardApi.getRegard(alice, bob)).toBe(100);
    RegardApi.setRegard(alice, bob, -500);
    expect(RegardApi.getRegard(alice, bob)).toBe(-100);
  });

  it('is kind-agnostic across player/NPC holder and subject combos', () => {
    const combos: Array<[() => Idea, () => Idea, string]> = [
      [
        () => makeStuffAtPath(() => new PlayerView(), '/obj/Avatar/pv'),
        () => makeStuffAtPath(() => new Idea(), '/obj/Avatar/ps'),
        'player→player',
      ],
      [
        () => makeStuffAtPath(() => new PlayerView(), '/obj/Avatar/pv2'),
        () => makeStuffAtPath(() => new Idea(), '/obj/npc/ns'),
        'player→npc',
      ],
      [
        () => makeStuffAtPath(() => new NpcView(), '/obj/npc/nv'),
        () => makeStuffAtPath(() => new Idea(), '/obj/Avatar/ps2'),
        'npc→player',
      ],
      [
        () => makeStuffAtPath(() => new NpcView(), '/obj/npc/nv2'),
        () => makeStuffAtPath(() => new Idea(), '/obj/npc/ns2'),
        'npc→npc',
      ],
    ];
    for (const [makeViewer, makeSubject, label] of combos) {
      const v = makeViewer();
      const s = makeSubject();
      RegardApi.setRegard(v, s, 7);
      expect(RegardApi.getRegard(v, s), label).toBe(7);
    }
  });
});
