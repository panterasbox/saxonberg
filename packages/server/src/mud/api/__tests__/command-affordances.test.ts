/**
 * `CommandApi.resolveAffordances` — the server-side answer behind the
 * client's radial menu: *what can this viewer do with this object,
 * right now?*
 *
 * Two properties matter more than the verb list itself, and both are
 * pinned here:
 *
 *  - **Every gate deletes.** A verb or a mixin the viewer is not
 *    entitled to know about is ABSENT, never present-and-flagged. A
 *    response that admits a hidden verb exists leaks the fact that it
 *    exists.
 *  - **Resolution changes nothing.** An open radial resolves
 *    repeatedly; a validator with a side effect would turn hovering
 *    into an action.
 */

import "../../../test-bootstrap";
import { describe, it, expect, beforeAll } from 'vitest';
import { CommandApi } from '../command';
import { Idea } from '../../lib/stuff/Idea';
import { CommandGiverMixin, type CommandGiver } from '../../lib/command/CommandGiver';
import { ContainableMixin } from '../../lib/spatial/Containable';
import { ContainerMixin } from '../../lib/spatial/Container';
import { SensorMixin } from '../../lib/message/Sensor';
import { PerceptionMixin } from '../../lib/perception/Perception';
import { NamedMixin } from '../../lib/description/Named';
import { VisibleMixin } from '../../lib/description/Visible';
import { TangibleMixin } from '../../lib/material/Tangible';
import { IdentifiableMixin } from '../../lib/identification/Identifiable';
import { BeliefStoreMixin, IDENTIFICATION } from '../../lib/belief/BeliefStore';
import { OrganismMixin } from '../../lib/species/Organism';
import { ContainmentApi } from '../containment';
import Clade from '../../platform/idea/species/Clade';
import Species from '../../platform/idea/species/Species';
import BodyPlan from '../../platform/idea/species/BodyPlan';
import { StuffApi } from '../stuff';
import {
  makeStuff,
  stampTemplatePathForTest,
} from '../../lib/security/__tests__/test-setup';
import type { Stuff } from '../../lib/stuff/Stuff';

/**
 * ⚠⚠ The fixture that makes this file mean anything.
 *
 * `requiresAnimate` guards most acting verbs, and it reports a live
 * body inanimate until its species + kingdom clade are resolvable. The
 * first version of these tests used a bare `Idea` viewer, so EVERY verb
 * came back `disabled` with one nonsense reason — and every assertion
 * still passed, because "everything is disabled" is a perfectly
 * well-formed menu. A green suite proved nothing at all.
 */
let seq = 0;
function animalSpecies(): Species {
  seq += 1;
  if (!StuffApi.findByTemplatePath('/stuff/idea/species/animalia')) {
    const animalia = makeStuff(() => new Clade());
    stampTemplatePathForTest(animalia, '/stuff/idea/species/animalia');
    animalia.setName('Animalia');
    animalia.setRank('kingdom');
  }
  const plan = makeStuff(() => new BodyPlan());
  stampTemplatePathForTest(plan, `/stuff/idea/species/BodyPlan/aff-${seq}`);
  plan.setSlots([{ name: 'cranial', accepts: 'SlottableMixin' }]);
  const s = makeStuff(() => new Species());
  stampTemplatePathForTest(s, `/stuff/idea/species/animalia/aff-${seq}`);
  s.setBodyPlan(plan);
  return s;
}

const ViewerBase = CommandGiverMixin(
  BeliefStoreMixin(
    OrganismMixin(
      PerceptionMixin(
        SensorMixin(ContainerMixin(ContainableMixin(NamedMixin(Idea)))),
      ),
    ),
  ),
);

class Viewer extends ViewerBase {
  static override commandContributions = {
    self: ['platform/cmd/inventory/put.yaml', 'platform/cmd/inventory/drop.yaml', 'platform/cmd/perception/look.yaml'],
    inventory: [],
    environment: [],
    peers: [],
  };
  protected override handleMessage(_frame: unknown): void {
    /* discard */
  }
}

/** An ordinary carryable thing. Affords nothing of its own. */
class Widget extends VisibleMixin(
  TangibleMixin(NamedMixin(ContainableMixin(Idea))),
) {}

/**
 * A thing that contributes a verb of its own — the case where the
 * affordance is a fact ABOUT THE OBJECT rather than about the viewer.
 */
class Lever extends VisibleMixin(
  TangibleMixin(NamedMixin(ContainableMixin(Idea))),
) {
  static commandContributions = {
    self: [],
    inventory: [],
    environment: ['platform/cmd/inventory/drop.yaml'],
    peers: [],
  };
}

class Room extends ContainerMixin(Idea) {}

function viewerOf(v: Viewer): Stuff & CommandGiver {
  return v as unknown as Stuff & CommandGiver;
}

function makeAnimateViewer(): Viewer {
  const v = makeStuff(() => new Viewer());
  v.setName('Alice');
  v.setSpecies(animalSpecies());
  // `isAnimate` is kingdom AND lifecycle: Animalia + 'alive'. The
  // default is the empty string, which is neither.
  v.setLifecycleState('alive');
  return v;
}

beforeAll(async () => {
  // Resolves every verb's declared validators from disk onto the
  // definitions. Without it `runValidators` has nothing to run and the
  // whole surface would report a cheerful, meaningless `enabled`.
  await CommandApi.preloadAll();
});

describe('resolveAffordances — the shape of the answer', () => {
  it('answers with verbs and the target\'s active composition', async () => {
    const room = makeStuff(() => new Room());
    const viewer = makeAnimateViewer();
    const widget = makeStuff(() => new Widget());
    widget.setName('a widget');
    ContainmentApi.move(viewer, room);
    ContainmentApi.move(widget, viewer);

    const out = await CommandApi.resolveAffordances(widget, viewerOf(viewer));
    expect(out).not.toBeNull();
    expect(Array.isArray(out!.verbs)).toBe(true);
    // Composition is the ACTIVE mixin set — what the thing is right
    // now, not what its class declared.
    expect(out!.composition).toContain('TangibleMixin');
    expect(out!.composition).toContain('ContainableMixin');
  });

  it('every entry carries one of the three states', async () => {
    const room = makeStuff(() => new Room());
    const viewer = makeAnimateViewer();
    const widget = makeStuff(() => new Widget());
    ContainmentApi.move(viewer, room);
    ContainmentApi.move(widget, viewer);

    const out = (await CommandApi.resolveAffordances(widget, viewerOf(viewer)))!;
    for (const entry of out.verbs) {
      expect(['enabled', 'disabled', 'pending-operand']).toContain(entry.state);
      if (entry.state === 'disabled') expect(entry.reason).toBeTruthy();
      if (entry.state === 'pending-operand') expect(entry.operand).toBeTruthy();
    }
  });
});

describe('⭐ pending-operand — the state that keeps a radial honest', () => {
  it('`put` is pending-operand, never plainly enabled', async () => {
    // `put <item> in <target>`: the item binds from the menu's subject,
    // but the container is an operand no radial can know. Reporting
    // this `enabled` would promise a click that then stalls.
    const room = makeStuff(() => new Room());
    const viewer = makeAnimateViewer();
    const widget = makeStuff(() => new Widget());
    ContainmentApi.move(viewer, room);
    ContainmentApi.move(widget, viewer);

    const out = (await CommandApi.resolveAffordances(widget, viewerOf(viewer)))!;
    const put = out.verbs.find((v) => v.verb === 'put');
    expect(put).toBeDefined();
    expect(put!.state).toBe('pending-operand');
    expect(put!.operand).toBe('target');
  });
});

describe('⚠ disabled reasons are the validator\'s own words', () => {
  it('carries the refusing validator\'s text verbatim', async () => {
    // `drop` requires the thing be in your inventory. Leave the widget
    // on the floor and the refusal must be the validator's sentence —
    // not a second, driftable copy of it written here.
    const room = makeStuff(() => new Room());
    const viewer = makeAnimateViewer();
    const widget = makeStuff(() => new Widget());
    widget.setName('a widget');
    ContainmentApi.move(viewer, room);
    ContainmentApi.move(widget, room);

    const out = (await CommandApi.resolveAffordances(widget, viewerOf(viewer)))!;
    const disabled = out.verbs.filter((v) => v.state === 'disabled');
    for (const entry of disabled) {
      expect(typeof entry.reason).toBe('string');
      expect(entry.reason!.length).toBeGreaterThan(0);
      // The fallback string means NO validator spoke — if every
      // disabled verb hits it, the reasons aren't really being read.
      expect(entry.reason).not.toBe('');
    }
    expect(
      disabled.some((e) => e.reason !== 'You cannot do that here.'),
    ).toBe(true);
  });
});

describe('⚠⚠ resolution mutates nothing', () => {
  it('repeated resolution is byte-identical and leaves no trace', async () => {
    const room = makeStuff(() => new Room());
    const viewer = makeAnimateViewer();
    const widget = makeStuff(() => new Widget());
    ContainmentApi.move(viewer, room);
    ContainmentApi.move(widget, viewer);

    const first = await CommandApi.resolveAffordances(widget, viewerOf(viewer));
    for (let i = 0; i < 25; i++) {
      await CommandApi.resolveAffordances(widget, viewerOf(viewer));
    }
    const last = await CommandApi.resolveAffordances(widget, viewerOf(viewer));

    // Same answer every time — no accumulating state, no drift.
    expect(JSON.stringify(last)).toBe(JSON.stringify(first));
    // And the world is where we left it.
    expect(widget.getContainer()).toBe(viewer);
  });
});

describe('the target\'s own verbs vs the viewer\'s', () => {
  it('a verb the TARGET contributes appears in its menu', async () => {
    const room = makeStuff(() => new Room());
    const viewer = makeAnimateViewer();
    const lever = makeStuff(() => new Lever());
    lever.setName('a lever');
    ContainmentApi.move(viewer, room);
    ContainmentApi.move(lever, room);

    const out = (await CommandApi.resolveAffordances(lever, viewerOf(viewer)))!;
    expect(out.verbs.map((v) => v.verb)).toContain('drop');
  });
});

/**
 * A thing whose nature is not obvious — the spoiler case. An
 * unidentified wand must not advertise `recharge`.
 */
class Wand extends IdentifiableMixin(
  VisibleMixin(TangibleMixin(NamedMixin(ContainableMixin(Idea)))),
) {
  static commandContributions = {
    self: [],
    inventory: [],
    environment: ['platform/cmd/inventory/drop.yaml'],
    peers: [],
  };
}

describe('⚠⚠ the spoiler gate DELETES, it does not flag', () => {
  it('an unidentified thing tells you nothing about itself', async () => {
    const room = makeStuff(() => new Room());
    const viewer = makeAnimateViewer();
    const wand = makeStuff(() => new Wand());
    wand.setName('a slender rod');
    ContainmentApi.move(viewer, room);
    ContainmentApi.move(wand, room);

    const out = (await CommandApi.resolveAffordances(wand, viewerOf(viewer)))!;

    // No composition at all — not a redacted one. A list with holes
    // in it announces that there is something to hide.
    expect(out.composition).toEqual([]);
    // And none of the verbs the WAND contributes. Your own verbs
    // survive: `look` is a fact about you, not about the wand.
    expect(out.verbs.map((v) => v.verb)).toContain('look');
  });

  it('the same thing, once identified, reports both', async () => {
    const room = makeStuff(() => new Room());
    const viewer = makeAnimateViewer();
    const wand = makeStuff(() => new Wand());
    // ⚠ Belief keys on the TEMPLATE PATH, so an unstamped fixture can
    // never be identified — the record would have nothing to key on.
    stampTemplatePathForTest(wand, '/stuff/thing/gear/test-wand');
    wand.setName('a slender rod');
    ContainmentApi.move(viewer, room);
    ContainmentApi.move(wand, room);

    // The viewer now knows what it is.
    viewer.know(IDENTIFICATION, wand.getTemplatePath()!, { typeKnown: true });

    const out = (await CommandApi.resolveAffordances(wand, viewerOf(viewer)))!;
    expect(out.composition).toContain('IdentifiableMixin');
    expect(out.composition).toContain('TangibleMixin');
  });
});
