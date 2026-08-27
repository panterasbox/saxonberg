/**
 * VitalsMixin condition collection — both kinds (trauma value +
 * affliction record) behind one collection, and the trauma feeds into
 * the derived band / consciousness (with no lifecycle transition).
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Creature } from '../../creature/Creature';
import type { Trauma, AfflictionRecord } from '../../../platform/idea/Condition';
import { StuffApi } from '../../../api/stuff';
import { makeStuff } from '../../security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';

describe('VitalsMixin — condition collection', () => {
  beforeEach(() => installV1QuantityMarshallers());
  afterEach(() => StuffApi.clearAll());

  it('holds both a Trauma value and an AfflictionRecord', () => {
    const c = makeStuff(() => new Creature());
    const trauma: Trauma = {
      kind: 'trauma',
      type: 'laceration',
      site: 'body.leg.left',
      severity: 0.6,
      bleeding: true,
    };
    const affliction: AfflictionRecord = {
      kind: 'affliction',
      templatePath: '/lib/condition/disease/influenza',
      stage: 1,
      elapsed: 0,
    };
    c.afflict(trauma);
    c.afflict(affliction);

    expect(c.getConditions()).toHaveLength(2);
    expect(c.hasCondition((x) => x.kind === 'trauma')).toBe(true);
    expect(
      c.hasCondition(
        (x) => x.kind === 'affliction' && x.templatePath.includes('influenza'),
      ),
    ).toBe(true);

    expect(c.relieve(trauma)).toBe(true);
    expect(c.getConditions()).toHaveLength(1);
    expect(c.relieve(trauma)).toBe(false);
  });

  it('a trauma worsens the derived band — no lifecycle change', () => {
    const c = makeStuff(() => new Creature());
    expect(c.getConditionBand()).toBe('healthy');
    c.afflict({
      kind: 'trauma',
      type: 'fracture',
      site: 'body.leg.left',
      severity: 0.8,
    });
    expect(c.getConditionBand()).not.toBe('healthy');
    expect(c.getLifecycleState()).not.toBe('dead');
  });

  it('head trauma forces unconscious — recoverable, no lifecycle change', () => {
    const c = makeStuff(() => new Creature());
    expect(c.getConsciousness()).toBe('conscious');
    const blow: Trauma = {
      kind: 'trauma',
      type: 'contusion',
      site: 'body.head',
      severity: 0.7,
    };
    c.afflict(blow);
    expect(c.getConsciousness()).toBe('unconscious');
    expect(c.getLifecycleState()).not.toBe('dead');
    // Recoverable: relieving the trauma restores consciousness.
    c.relieve(blow);
    expect(c.getConsciousness()).toBe('conscious');
  });
});
