/**
 * Embedding (blood build D6): a point insult that leaves the thing in the
 * wound mints a `foreign-body` — but only a puncture at/above the embed
 * severity floor, and only when the producer set `embeds`.
 */

import '../../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ConditionApi } from '../../../../api/condition';
import { Creature } from '../../../../lib/creature/Creature';
import Species from '../../species/Species';
import BodyPlan from '../../species/BodyPlan';
import { StuffApi } from '../../../../api/stuff';
import { HARM_DEFAULTS } from '../../Condition';
import type { Trauma } from '../../Condition';
import {
  makeStuff,
  stampTemplatePathForTest,
} from '../../../../lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../../../lib/persistence/__tests__/quantity-marshaller-test-helpers';

let seq = 0;
function torso(): Creature {
  const id = seq++;
  const plan = makeStuff(() => new BodyPlan());
  plan.setName('embed-torso');
  plan.setBodyParts([
    {
      key: 'body.torso',
      parent: null,
      tissues: [{ tissuePath: '/stuff/idea/material/tissue/flesh', mass: 20 }],
    },
  ]);
  stampTemplatePathForTest(plan, `/stuff/idea/species/BodyPlan/embed-${id}`);
  const species = makeStuff(() => new Species());
  species.setBodyPlan(plan);
  stampTemplatePathForTest(species, `/stuff/idea/species/test/embed-${id}`);
  const c = makeStuff(() => new Creature());
  c.setSpecies(species);
  return c;
}

const at = (c: Creature, site: string): Trauma | undefined =>
  c.getConditions().find((x): x is Trauma => x.kind === 'trauma' && x.site === site);

describe('embedding', () => {
  beforeEach(() => installV1QuantityMarshallers());
  afterEach(() => StuffApi.clearAll());

  it('a point wound with embeds, above the floor, is a foreign body', () => {
    const c = torso();
    ConditionApi.inflict(c, {
      mechanism: 'point',
      site: 'body.torso',
      energy: 2,
      embeds: 'an arrowhead',
    });
    const t = at(c, 'body.torso')!;
    expect(t.severity).toBeGreaterThanOrEqual(HARM_DEFAULTS.EMBED_MIN_SEVERITY);
    expect(t.type).toBe('foreign-body');
    expect(t.foreignBody).toBe('an arrowhead');
  });

  it('the same wound WITHOUT embeds is an ordinary puncture', () => {
    const c = torso();
    ConditionApi.inflict(c, {
      mechanism: 'point',
      site: 'body.torso',
      energy: 2,
    });
    const t = at(c, 'body.torso')!;
    expect(t.type).toBe('puncture');
    expect(t.foreignBody).toBeUndefined();
  });

  it('below the severity floor the object passes through — never a foreign body', () => {
    const c = torso();
    ConditionApi.inflict(c, {
      mechanism: 'point',
      site: 'body.torso',
      energy: 0.2,
      embeds: 'a splinter',
    });
    // A weak hit lands a shallow puncture or nothing at all — but never an
    // embedded object: the thing passed through / never got in.
    const t = at(c, 'body.torso');
    if (t) {
      expect(t.severity).toBeLessThan(HARM_DEFAULTS.EMBED_MIN_SEVERITY);
      expect(t.type).toBe('puncture');
    }
    expect(t?.foreignBody).toBeUndefined();
  });
});
