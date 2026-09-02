/**
 * StatusMixin (Wave 6) — the settable activity-status feeding the
 * decoration slice.
 *
 * Covers: the three sources (verb-style setStatus / authored default /
 * clearing); the setter invariant; and that the status is a *presence*
 * decoration — absent from the pure-identity `getPresentation()` /
 * `describeFor`, present in `describeWithStatusFor`
 * (both the recognized and unknown branches), without double-decorating.
 */

import "../../../../test-bootstrap";
import { describe, it, expect } from 'vitest';
import { StatusMixin } from '../Status';
import { RECOGNITION } from '../../belief/BeliefStore';
import { BeliefStoreMixin } from '../../belief/BeliefStore';
import { PerceptionMixin } from '../../perception/Perception';
import { SensorMixin } from '../../message/Sensor';
import { NamedMixin } from '../../description/Named';
import { VisibleMixin } from '../../description/Visible';
import { OrganismMixin } from '../../species/Organism';
import { ContainableMixin } from '../../spatial/Containable';
import { Idea } from '../../stuff/Idea';
import {
  makeStuff,
  makeStuffAtPath,
} from '../../security/__tests__/test-setup';

// A being with status (mirrors a Character: Status + Organism + naming).
class Gus extends StatusMixin(
  OrganismMixin(VisibleMixin(NamedMixin(ContainableMixin(Idea)))),
) {}

class Viewer extends BeliefStoreMixin(PerceptionMixin(SensorMixin(Idea))) {}

let counter = 0;
function makeGus(): InstanceType<typeof Gus> {
  const g = makeStuffAtPath(() => new Gus(), `/obj/npc/gus-${counter++}`);
  g.setName('Gus');
  g.setShortDescription('a stout man');
  return g;
}

describe('StatusMixin', () => {
  it('setStatus sets the runtime status; getStatus reads it', () => {
    const g = makeGus();
    g.setStatus('watching the empty road');
    expect(g.getStatus()).toBe('watching the empty road');
  });

  it('falls back to the authored default; runtime overrides it', () => {
    const g = makeGus();
    g.setAuthoredStatus('standing at his post');
    expect(g.getStatus()).toBe('standing at his post');
    g.setStatus('chasing a stray dog');
    expect(g.getStatus()).toBe('chasing a stray dog');
    // Clearing reverts to the authored default.
    g.setStatus('');
    expect(g.getStatus()).toBe('standing at his post');
  });

  it('the setter invariant rejects an over-long status', () => {
    const g = makeGus();
    expect(() => g.setStatus('x'.repeat(200))).toThrow(/too long/i);
  });

  it('collapses whitespace on set', () => {
    const g = makeGus();
    g.setStatus('  watching   the\n road  ');
    expect(g.getStatus()).toBe('watching the road');
  });

  it('getPresentation is pure identity — no status affix', () => {
    const g = makeGus();
    expect(g.getPresentation()).toBe('Gus');
    g.setStatus('watching the road');
    // Status is a presence decoration, not identity: it does NOT ride the
    // viewer-blind baseline (so act-subject naming stays clean).
    expect(g.getPresentation()).toBe('Gus');
  });

  it('describe is status-free; describeWithStatus decorates a recognized name', () => {
    const viewer = makeStuff(() => new Viewer());
    const g = makeGus();
    g.setStatus('watching the road');
    viewer.know(RECOGNITION, g.getTemplatePath()!, { knownAs: 'Gus' });
    // The act-subject path (describe) shows the bare identity.
    expect(g.describeFor(viewer)).toBe('Gus');
    // The presence-scan path weaves the status in (no double-decoration).
    expect(g.describeWithStatusFor(viewer)).toBe(
      'Gus, watching the road',
    );
  });

  it('describeWithStatus decorates the salient-feature name for an unknown', () => {
    const viewer = makeStuff(() => new Viewer());
    const g = makeGus();
    g.setStatus('watching the road');
    expect(g.describeFor(viewer)).toBe('a stout man');
    expect(g.describeWithStatusFor(viewer)).toBe(
      'a stout man, watching the road',
    );
  });
});
