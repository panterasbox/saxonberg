/**
 * The regard face ON BeliefStoreMixin — the per-viewer attitude realm
 * (retired RegardApi/RegardLogic; the Api OO sweep's viewer face):
 * regardFor/adjustRegard/setRegard/clearRegard/regardsHeld against a
 * real belief-store viewer: accumulation, the -100..+100 clamp,
 * directed/asymmetric edges, and kind-agnostic player/NPC combos.
 *
 * Pure in-memory (write-through no-ops with Mongo disconnected).
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { BeliefStoreMixin } from '../BeliefStore';
import { Idea } from '../../stuff/Idea';
import { StuffApi } from '../../../api/stuff';
import { makeStuffAtPath } from '../../security/__tests__/test-setup';

// Two trivially-distinct holder/subject kinds. The substrate stores NO
// player/NPC marker — these exist only to document the kind-agnostic combos.
class PlayerView extends BeliefStoreMixin(Idea) {}
class NpcView extends BeliefStoreMixin(Idea) {}

beforeEach(() => StuffApi.clearAll());
afterEach(() => StuffApi.clearAll());

describe('the regard face', () => {
  function viewerAt(path: string): PlayerView {
    return makeStuffAtPath(() => new PlayerView(), path);
  }
  function subjectAt(path: string): Idea {
    return makeStuffAtPath(() => new Idea(), path);
  }

  it('getRegard returns 0 when no opinion is held', () => {
    const alice = viewerAt('/platform/agent/Avatar/alice');
    const bob = subjectAt('/obj/npc/bob');
    expect(alice.regardFor(bob)).toBe(0);
  });

  it('adjustRegard accumulates across calls', () => {
    const alice = viewerAt('/platform/agent/Avatar/alice');
    const bob = subjectAt('/obj/npc/bob');
    alice.adjustRegard(bob, 3);
    alice.adjustRegard(bob, 3);
    expect(alice.regardFor(bob)).toBe(6);
    alice.adjustRegard(bob, -10);
    expect(alice.regardFor(bob)).toBe(-4);
  });

  it('setRegard sets an absolute value', () => {
    const alice = viewerAt('/platform/agent/Avatar/alice');
    const bob = subjectAt('/obj/npc/bob');
    alice.adjustRegard(bob, 20);
    alice.setRegard(bob, 5);
    expect(alice.regardFor(bob)).toBe(5);
  });

  it('clearRegard returns to no opinion', () => {
    const alice = viewerAt('/platform/agent/Avatar/alice');
    const bob = subjectAt('/obj/npc/bob');
    alice.setRegard(bob, 42);
    alice.clearRegard(bob);
    expect(alice.regardFor(bob)).toBe(0);
  });

  it('regardsHeldBy snapshots every regard the viewer holds', () => {
    const alice = viewerAt('/platform/agent/Avatar/alice');
    const bob = subjectAt('/obj/npc/bob');
    const gus = subjectAt('/obj/npc/gus');
    alice.setRegard(bob, 10);
    alice.setRegard(gus, -5);
    const held = alice.regardsHeld();
    expect(held.size).toBe(2);
    expect(held.get('/obj/npc/bob')).toBe(10);
    expect(held.get('/obj/npc/gus')).toBe(-5);
  });

  it('regard is directed/asymmetric: A→B does not imply B→A', () => {
    const alice = viewerAt('/platform/agent/Avatar/alice');
    const bob = viewerAt('/platform/agent/Avatar/bob');
    alice.setRegard(bob, 50);
    expect(alice.regardFor(bob)).toBe(50);
    expect(bob.regardFor(alice)).toBe(0); // untouched
  });

  it('clamps into the normative -100..+100 range', () => {
    const alice = viewerAt('/platform/agent/Avatar/alice');
    const bob = subjectAt('/obj/npc/bob');
    alice.adjustRegard(bob, 250);
    expect(alice.regardFor(bob)).toBe(100);
    alice.setRegard(bob, -500);
    expect(alice.regardFor(bob)).toBe(-100);
  });

  it('is kind-agnostic across player/NPC holder and subject combos', () => {
    const combos: Array<[() => Idea, () => Idea, string]> = [
      [
        () => makeStuffAtPath(() => new PlayerView(), '/platform/agent/Avatar/pv'),
        () => makeStuffAtPath(() => new Idea(), '/platform/agent/Avatar/ps'),
        'player→player',
      ],
      [
        () => makeStuffAtPath(() => new PlayerView(), '/platform/agent/Avatar/pv2'),
        () => makeStuffAtPath(() => new Idea(), '/obj/npc/ns'),
        'player→npc',
      ],
      [
        () => makeStuffAtPath(() => new NpcView(), '/obj/npc/nv'),
        () => makeStuffAtPath(() => new Idea(), '/platform/agent/Avatar/ps2'),
        'npc→player',
      ],
      [
        () => makeStuffAtPath(() => new NpcView(), '/obj/npc/nv2'),
        () => makeStuffAtPath(() => new Idea(), '/obj/npc/ns2'),
        'npc→npc',
      ],
    ];
    for (const [makeViewer, makeSubject, label] of combos) {
      const v = makeViewer() as InstanceType<ReturnType<typeof BeliefStoreMixin<typeof Idea>>>;
      const s = makeSubject();
      v.setRegard(s, 7);
      expect(v.regardFor(s), label).toBe(7);
    }
  });
});
