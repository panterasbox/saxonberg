/**
 * `describeFor(viewer, form)` — the six forms, across the viewer states.
 *
 * ⭐⭐ **Why one method and not four.** There were four —
 * `describe`, `describeWithStatus`, `salientFeaturesOf` and the
 * viewer-blind baseline — and the shape was doing real damage: the two
 * richer ones had **one caller each**, both on the same surface, because
 * the only way to reach them was to resolve a name EAGERLY for one known
 * viewer and give up per-recipient naming to do it. So the room survey
 * could show what people were doing and an emote could not, and that
 * looked like a design decision when it was an implementation
 * consequence in a costume.
 *
 * ⚠⚠ **`bare` and `handle` consult no perception gate**, and that is the
 * disguise/anonymity split made mechanical: a disguise works because
 * somebody is LOOKING AT YOU, and a channel is not looking. The
 * assertions under "a channel is not looking" are the whole argument.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, afterEach } from 'vitest';
import { RECOGNITION, BeliefStoreMixin } from '../BeliefStore';
import { PerceptionMixin } from '../../perception/Perception';
import { SensorMixin } from '../../message/Sensor';
import { ContainableMixin } from '../../spatial/Containable';
import { NamedMixin } from '../../description/Named';
import { VisibleMixin } from '../../description/Visible';
import { StatusMixin } from '../../status/Status';
import { OrganismMixin } from '../../species/Organism';
import { Idea } from '../../stuff/Idea';
import { StuffApi } from '../../../api/stuff';
import { makeStuff, makeStuffAtPath } from '../../security/__tests__/test-setup';

class Viewer extends BeliefStoreMixin(
  PerceptionMixin(SensorMixin(ContainableMixin(NamedMixin(Idea)))),
) {}

class Being extends StatusMixin(
  VisibleMixin(OrganismMixin(NamedMixin(ContainableMixin(Idea)))),
) {}

let n = 0;
function being(name: string, stem: string, status?: string): Being {
  const b = makeStuffAtPath(() => new Being(), `/obj/npc/form-${n++}`);
  b.setName(name);
  b.setSurname('Hodgemeyere');
  b.setHonorific('Mr.');
  b.setShortDescription(stem);
  if (status) b.setStatus(status);
  return b;
}

function knows(viewer: Viewer, subject: Being, as: string): void {
  viewer.know(RECOGNITION, subject.getIdentityPath()!, { knownAs: as });
}

afterEach(() => {
  for (const m of StuffApi.findAllByTemplatePath(
    '/platform/idea/modalities/vision',
  )) {
    StuffApi.unregister(m);
  }
});

describe('a stranger — the form changes what is shown, never who is known', () => {
  it('concise is the description, and no form leaks the name', () => {
    const v = makeStuff(() => new Viewer());
    const b = being('Mitch', 'city guard', 'standing watch');
    expect(b.describeFor(v, 'concise')).toBe('a city guard');
    expect(b.describeFor(v, 'concise')).not.toMatch(/Mitch/);
    expect(b.describeFor(v, 'distinguishing')).not.toMatch(/Mitch/);
    expect(b.describeFor(v, 'presence')).not.toMatch(/Mitch/);
  });

  it('⭐ presence adds what they are doing', () => {
    const v = makeStuff(() => new Viewer());
    const b = being('Mitch', 'city guard', 'standing watch');
    expect(b.describeFor(v, 'presence')).toBe('a city guard, standing watch');
  });

  it('presence with nothing to report is just concise', () => {
    const v = makeStuff(() => new Viewer());
    const b = being('Mitch', 'city guard');
    expect(b.describeFor(v, 'presence')).toBe('a city guard');
  });

  it('formal does not invent a name you have not been told', () => {
    const v = makeStuff(() => new Viewer());
    const b = being('Mitch', 'city guard');
    expect(b.describeFor(v, 'formal')).toBe('a city guard');
  });
});

describe('somebody you know', () => {
  it('⭐ concise composes the name with the kind — "Mitch, a city guard"', () => {
    const v = makeStuff(() => new Viewer());
    const b = being('Mitch', 'city guard');
    knows(v, b, 'Mitch');
    expect(b.describeFor(v, 'concise')).toMatch(/^Mitch/);
  });

  it('presence adds the status to the recognized form', () => {
    const v = makeStuff(() => new Viewer());
    const b = being('Mitch', 'city guard', 'standing watch');
    knows(v, b, 'Mitch');
    expect(b.describeFor(v, 'presence')).toMatch(/standing watch$/);
  });

  it('⭐ formal is the full name — but only for somebody you recognize', () => {
    const v = makeStuff(() => new Viewer());
    const b = being('Mitch', 'city guard');
    knows(v, b, 'Mitch');
    expect(b.describeFor(v, 'formal')).toBe('Mr. Mitch Hodgemeyere');
  });
});

describe('⚠⚠ a channel is not looking at you', () => {
  it('bare is the name, with no viewer at all', () => {
    const b = being('Mitch', 'city guard');
    expect(b.describeFor(undefined, 'bare')).toBe('Mitch');
  });

  it('bare is the name to a total stranger — the channel is not perceiving', () => {
    const v = makeStuff(() => new Viewer());
    const b = being('Mitch', 'city guard');
    // The SAME viewer reads "a city guard" when looking, and "Mitch"
    // when reading a channel that forbids anonymity. Both are correct:
    // the two questions are not the same question.
    expect(b.describeFor(v, 'concise')).toBe('a city guard');
    expect(b.describeFor(v, 'bare')).toBe('Mitch');
  });

  it('⭐ handle never leaks the name, whoever is reading', () => {
    const v = makeStuff(() => new Viewer());
    const b = being(
      'Mitch',
      'weaver with a shuttle in one hand and a tally in the other',
    );
    knows(v, b, 'Mitch');
    // Even to somebody who KNOWS him — anonymity is a stance about the
    // message, not a fact about what the reader can perceive.
    expect(b.describeFor(v, 'concise')).toMatch(/Mitch/);
    expect(b.describeFor(v, 'handle')).not.toMatch(/Mitch/);
  });

  it('⚠ with no authored handle it falls back to the portrait — for now', () => {
    // This is the rung the content sweep exists to make unreachable:
    // "a weaver with a shuttle in one hand and a tally in the other
    // says…" is unreadable on a chat line, which is the whole reason
    // the handle is a separate field. The AUTHORED rung that outranks
    // this one arrives in W3; every shipped agent row has one.
    const v = makeStuff(() => new Viewer());
    const b = being('Mitch', 'weaver with a shuttle in one hand');
    expect(b.describeFor(v, 'handle')).toBe('a weaver with a shuttle in one hand');
  });

  it('bare falls back to the handle for somebody with no name', () => {
    const v = makeStuff(() => new Viewer());
    const b = makeStuffAtPath(() => new Being(), `/obj/npc/form-${n++}`);
    b.setShortDescription('sentry');
    expect(b.describeFor(v, 'bare')).toBe('a sentry');
  });
});

describe('no viewer — logs, snapshots, the history ring', () => {
  it('concise is the viewer-blind presentation', () => {
    const b = being('Mitch', 'city guard');
    expect(b.describeFor(undefined, 'concise')).toBe('Mitch');
  });

  it('formal is the fullest honest answer — a log keeps no secrets', () => {
    const b = being('Mitch', 'city guard');
    expect(b.describeFor(undefined, 'formal')).toBe('Mr. Mitch Hodgemeyere');
  });

  it('the default form is concise', () => {
    const b = being('Mitch', 'city guard');
    expect(b.describeFor(undefined)).toBe(b.describeFor(undefined, 'concise'));
  });
});
