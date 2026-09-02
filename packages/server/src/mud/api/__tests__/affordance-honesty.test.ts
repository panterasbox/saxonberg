/**
 * Affordance honesty, end to end through the real resolver.
 *
 * ⚠⚠ **Acceptance criterion 22: no verb loses availability it had.**
 * The sweep declared `requires:` on 157 object-typed args, and the
 * dangerous direction is *under-reporting*: a validator that refuses
 * more than its controller does makes a working verb vanish from every
 * menu, and a verb nobody is offered is a verb nobody can discover.
 * Over-reporting merely offers a verb that then declines with a reason.
 *
 * ⚠⚠ **The fixture trap, inherited from `command-affordances.test.ts`.**
 * That file records an earlier version of itself whose viewer was
 * inanimate, so EVERY verb came back `disabled` — and every assertion
 * still passed, because "everything is disabled" is a perfectly
 * well-formed menu. A green suite proved nothing. So this file opens
 * with a **fixture sanity** test that demands at least one `enabled`
 * verb; without it, the criterion-22 assertions below (which are all of
 * the form "not disabled") would pass against a totally broken world.
 *
 * ⭐ Criterion 23 rides here too: `attack`, `drink` and `talk` are no
 * longer offered on a room. `cast` is the fourth and is deliberately
 * NOT closed with a validator — see the last test.
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
import { BeliefStoreMixin } from '../../lib/belief/BeliefStore';
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
import type { AffordanceEntry } from '@saxonberg/types';

/** The verbs under test. `smell` is excluded — its validator needs the
 *  modality catalogue, which this lightweight fixture does not boot. */
const CONTRIBUTED = [
  'platform/cmd/combat/attack.yaml',
  'platform/cmd/bulk/drink.yaml',
  'platform/cmd/social/talk.yaml',
  'platform/cmd/perception/look.yaml',
  'platform/cmd/inventory/get.yaml',
  'platform/cmd/inventory/drop.yaml',
];

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
  stampTemplatePathForTest(plan, `/stuff/idea/species/BodyPlan/hon-${seq}`);
  plan.setSlots([{ name: 'cranial', accepts: 'SlottableMixin' }]);
  const s = makeStuff(() => new Species());
  stampTemplatePathForTest(s, `/stuff/idea/species/animalia/hon-${seq}`);
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
    self: CONTRIBUTED,
    inventory: [],
    environment: [],
    peers: [],
  };
  protected override handleMessage(_frame: unknown): void {
    /* discard */
  }
}

/** An ordinary carryable thing — the "verb should still work" case. */
class Widget extends VisibleMixin(
  TangibleMixin(NamedMixin(ContainableMixin(Idea))),
) {}

class Room extends ContainerMixin(Idea) {}

function viewerOf(v: Viewer): Stuff & CommandGiver {
  return v as unknown as Stuff & CommandGiver;
}

function makeAnimateViewer(): Viewer {
  const v = makeStuff(() => new Viewer());
  v.setName('Alice');
  v.setSpecies(animalSpecies());
  // `requiresAnimate` is kingdom AND lifecycle; the default is neither.
  v.setLifecycleState('alive');
  return v;
}

function entry(
  verbs: AffordanceEntry[],
  verb: string,
): AffordanceEntry | undefined {
  return verbs.find((v) => v.verb === verb);
}

describe('the verb menu stops lying', () => {
  beforeAll(async () => {
    // Without preload the validators are unresolved and every verb
    // reports a cheerful, meaningless `enabled`.
    CommandApi.clearCache();
    const result = await CommandApi.preloadAll();
    expect(result.failed).toEqual([]);
  });

  async function world(): Promise<{
    onRoom: AffordanceEntry[];
    onWidget: AffordanceEntry[];
  }> {
    const room = makeStuff(() => new Room());
    const viewer = makeAnimateViewer();
    ContainmentApi.move(viewer, room);
    const widget = makeStuff(() => new Widget());
    widget.setName('a plain rock');
    ContainmentApi.move(widget, room);

    const onRoom = (await CommandApi.resolveAffordances(room, viewerOf(viewer)))!;
    const onWidget = (await CommandApi.resolveAffordances(
      widget,
      viewerOf(viewer),
    ))!;
    expect(onRoom).not.toBeNull();
    expect(onWidget).not.toBeNull();
    return { onRoom: onRoom.verbs, onWidget: onWidget.verbs };
  }

  /*
   * ⚠⚠ Read the file header. Every criterion-22 assertion below is of
   * the form "this verb is NOT disabled", and all of them pass
   * vacuously against a world where nothing resolves at all. This test
   * is what makes the rest of the file mean something.
   */
  it('FIXTURE SANITY — the menu is not uniformly disabled', async () => {
    const { onWidget } = await world();
    expect(onWidget.length).toBeGreaterThan(0);
    const enabled = onWidget.filter((v) => v.state === 'enabled');
    expect(
      enabled.length,
      'no verb is enabled on an ordinary thing — the fixture is broken, ' +
        'and every other assertion in this file is meaningless',
    ).toBeGreaterThan(0);
  });

  /*
   * ⭐ Criterion 23. Before the sweep all three reported `enabled`
   * against a room.
   */
  it('no longer offers attack / drink / talk as ENABLED on a room', async () => {
    const { onRoom } = await world();
    for (const verb of ['attack', 'drink', 'talk']) {
      const e = entry(onRoom, verb);
      expect(e?.state, `${verb} on a room`).not.toBe('enabled');
    }
  });

  /*
   * ⚠ A disabled verb must carry the validator's own words. A verb that
   * greys out with no reason is a worse figure than one wrongly
   * offered: the player cannot tell a rule from a bug.
   */
  it('gives a reason whenever it disables one', async () => {
    const { onRoom } = await world();
    for (const verb of ['attack', 'drink', 'talk']) {
      const e = entry(onRoom, verb);
      if (e?.state === 'disabled') {
        expect(e.reason, `${verb} disabled without a reason`).toBeTruthy();
      }
    }
  });

  /*
   * Criterion 22's load-bearing half. `look` and `get` accept an
   * ordinary Thing, and the sweep must not have taken them away. If
   * either reports `disabled` on a plain rock, some validator refuses
   * more than its controller does.
   */
  it('no verb lost availability on an ordinary thing', async () => {
    const { onWidget } = await world();
    for (const verb of ['look', 'get']) {
      const e = entry(onWidget, verb);
      expect(e, `${verb} vanished from the menu entirely`).toBeDefined();
      expect(e!.state, `${verb} on a plain rock`).not.toBe('disabled');
    }
  });

  /*
   * The perception family is the sweep's largest `requires: any`
   * group, declared universal because those controllers refuse nothing
   * by kind. An invented constraint would show up here.
   */
  it('keeps look available on a room', async () => {
    const { onRoom } = await world();
    const look = entry(onRoom, 'look');
    expect(look).toBeDefined();
    expect(look!.state).not.toBe('disabled');
  });

  /*
   * ⭐ The fourth recorded case, recorded rather than closed.
   *
   * `CastController` refuses on the SPELL's own target rule, which is
   * not a property of the arg — so `cast`'s target declares
   * `requires: any` and the spell keeps its refusal. Inventing a kind
   * constraint to make the count look complete is exactly the "a wrong
   * validator is worse than a missing one" failure the requirements
   * name. This pins the decision so a later sweep cannot quietly
   * "fix" it.
   */
  it('leaves cast kind-unconstrained, deliberately', () => {
    const cast = CommandApi.getCommand('system/arcana/cmd/magic/cast.yaml');
    const target = cast?.args.find((a) => a.name === 'target');
    expect(target?.requires).toBe('any');
  });
});
