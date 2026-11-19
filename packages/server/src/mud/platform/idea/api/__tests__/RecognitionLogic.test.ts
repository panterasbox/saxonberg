/**
 * Recognition worked out ONCE per keyword read (call-security-performance
 * W5, D6).
 *
 * `perceivedKeywords` asks for two forms of the same target — `concise`
 * and `distinguishing` — and used to run every perception gate and every
 * recall twice to get them, although the two differ only in the last
 * branch, for a true stranger. The recognition state is now worked out
 * once and both forms are rendered from it.
 *
 * ⭐ The cut may not change a single word a viewer reads, so the table
 * below was CAPTURED FROM MASTER'S CODE before the edit: for six viewer
 * situations, every form and the targeting keywords. Plus one count: the
 * sight gate is asked once per keyword read, not twice.
 */

import '../../../../../test-bootstrap';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { RECOGNITION, BeliefStoreMixin } from '../../../../lib/belief/BeliefStore';
import { PerceptionMixin } from '../../../../lib/perception/Perception';
import { SensorMixin } from '../../../../lib/message/Sensor';
import { ContainableMixin } from '../../../../lib/spatial/Containable';
import { NamedMixin } from '../../../../lib/description/Named';
import { VisibleMixin } from '../../../../lib/description/Visible';
import { PerceptibleMixin } from '../../../../lib/description/Perceptible';
import { LabelledMixin } from '../../../../lib/description/Labelled';
import { StatusMixin } from '../../../../lib/status/Status';
import { OrganismMixin } from '../../../../lib/species/Organism';
import { PersonaMixin } from '../../../../lib/character/Persona';
import { DisguisableMixin } from '../../../../lib/disguise/Disguisable';
import { Idea } from '../../../../lib/stuff/Idea';
import { StuffApi } from '../../../../api/stuff';
import { makeStuff, makeStuffAtPath } from '../../../../lib/security/__tests__/test-setup';
import type { Stuff } from '../../../../lib/stuff/Stuff';

class Viewer extends BeliefStoreMixin(
  PerceptionMixin(SensorMixin(ContainableMixin(NamedMixin(Idea)))),
) {}

class Person extends PersonaMixin(
  DisguisableMixin(
    StatusMixin(
      PerceptibleMixin(VisibleMixin(OrganismMixin(NamedMixin(ContainableMixin(Idea))))),
    ),
  ),
) {}

/** An organism that is not a person: names are public. */
class Animal extends StatusMixin(
  PerceptibleMixin(VisibleMixin(OrganismMixin(NamedMixin(ContainableMixin(Idea))))),
) {}

class Item extends LabelledMixin(PerceptibleMixin(VisibleMixin(NamedMixin(ContainableMixin(Idea))))) {}

/** A sight gate that refuses: the "cannot see them" situation. */
class Blind extends Idea {
  public canSee(): boolean {
    return false;
  }
}

const VISION = '/platform/idea/modalities/vision';

let n = 0;
function person(name: string, stem: string): Person {
  const p = makeStuffAtPath(() => new Person(), `/obj/npc/recog-${n++}`);
  p.setName(name);
  p.setSurname('Hodgemeyere');
  p.setHonorific('Mr.');
  p.setShortDescription(stem);
  p.setStatus('standing watch');
  return p;
}

const FORMS = ['concise', 'distinguishing', 'presence', 'formal', 'bare', 'handle'] as const;

/** Everything a viewer reads of `t`: each form, then the targeting keywords. */
function reads(v: Viewer, t: Stuff): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const f of FORMS) out[f] = t.describeFor(v, f);
  out.keywords = t.perceivedKeywordsFor(v);
  return out;
}

afterEach(() => {
  for (const m of StuffApi.findAllByTemplatePath(VISION)) StuffApi.unregister(m);
});

describe('what a viewer reads is unchanged — captured from master', () => {
  it('a stranger', () => {
    const v = makeStuff(() => new Viewer());
    expect(reads(v, person('Mitch', 'city guard'))).toMatchInlineSnapshot(`
      {
        "bare": "Mitch",
        "concise": "a city guard",
        "distinguishing": "a city guard",
        "formal": "a city guard",
        "handle": "a city guard",
        "keywords": [
          "a city guard",
          "city guard",
        ],
        "presence": "a city guard, standing watch",
      }
    `);
  });

  it('somebody the viewer recognizes', () => {
    const v = makeStuff(() => new Viewer());
    const p = person('Mitch', 'city guard');
    v.know(RECOGNITION, p.getIdentityPath()!, { knownAs: 'Mitch' });
    expect(reads(v, p)).toMatchInlineSnapshot(`
      {
        "bare": "Mitch",
        "concise": "Mitch",
        "distinguishing": "Mitch",
        "formal": "Mr. Mitch Hodgemeyere",
        "handle": "a city guard",
        "keywords": [
          "mitch",
        ],
        "presence": "Mitch, standing watch",
      }
    `);
  });

  it('somebody recognized, behind a mask', () => {
    const v = makeStuff(() => new Viewer());
    const p = person('Mitch', 'city guard');
    v.know(RECOGNITION, p.getIdentityPath()!, { knownAs: 'Mitch' });
    p.setDisguise({ appearsAs: 'hooded figure', covers: ['face'], masksIdentity: true });
    expect(reads(v, p)).toMatchInlineSnapshot(`
      {
        "bare": "Mitch",
        "concise": "a hooded figure",
        "distinguishing": "a hooded figure",
        "formal": "a hooded figure",
        "handle": "a city guard",
        "keywords": [
          "a hooded figure",
          "hooded figure",
        ],
        "presence": "a hooded figure",
      }
    `);
  });

  it('somebody the viewer cannot see', () => {
    const v = makeStuff(() => new Viewer());
    const p = person('Mitch', 'city guard');
    v.know(RECOGNITION, p.getIdentityPath()!, { knownAs: 'Mitch' });
    makeStuffAtPath(() => new Blind(), VISION);
    expect(reads(v, p)).toMatchInlineSnapshot(`
      {
        "bare": "Mitch",
        "concise": "something",
        "distinguishing": "something",
        "formal": "something",
        "handle": "a city guard",
        "keywords": [
          "something",
        ],
        "presence": "something",
      }
    `);
  });

  it('a named animal', () => {
    const v = makeStuff(() => new Viewer());
    const a = makeStuffAtPath(() => new Animal(), `/obj/npc/recog-${n++}`);
    a.setName('Mouse');
    a.setShortDescription('thin cat');
    a.setKeywords(['cat']);
    expect(reads(v, a)).toMatchInlineSnapshot(`
      {
        "bare": "Mouse",
        "concise": "Mouse",
        "distinguishing": "Mouse",
        "formal": "Mouse",
        "handle": "a cat",
        "keywords": [
          "mouse",
          "cat",
        ],
        "presence": "Mouse",
      }
    `);
  });

  it('a labelled item', () => {
    const v = makeStuff(() => new Viewer());
    const i = makeStuffAtPath(() => new Item(), `/obj/thing/recog-${n++}`);
    i.setShortDescription('brown jar');
    i.setKeywords(['jar']);
    i.setLabel('pickles');
    expect(reads(v, i)).toMatchInlineSnapshot(`
      {
        "bare": "a jar",
        "concise": "pickles",
        "distinguishing": "pickles",
        "formal": "pickles",
        "handle": "a jar",
        "keywords": [
          "jar",
        ],
        "presence": "pickles",
      }
    `);
  });
});

describe('recognition is worked out once per keyword read', () => {
  it('the sight gate is asked once, not once per form', () => {
    const v = makeStuff(() => new Viewer());
    const p = person('Mitch', 'city guard');
    const vision = makeStuffAtPath(() => new (class Sees extends Idea {
      public canSee(): boolean {
        return true;
      }
    })(), VISION);
    const asked = vi.spyOn(vision as unknown as { canSee: () => boolean }, 'canSee');
    p.perceivedKeywordsFor(v);
    expect(asked).toHaveBeenCalledTimes(1);
  });
});
