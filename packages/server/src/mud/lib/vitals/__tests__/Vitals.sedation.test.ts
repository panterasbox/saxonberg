/**
 * Anaesthesia + analgesia reads (clinical-medicine D10): a `sedation`
 * effect at/above its stage takes a body `unconscious`; an `analgesia`
 * effect reports its relief. Both are READS over active afflictions'
 * signatures — never integrated.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Creature } from '../../creature/Creature';
import Condition from '../../../platform/idea/Condition';
import { StuffApi } from '../../../api/stuff';
import {
  makeStuff,
  stampTemplatePathForTest,
} from '../../security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';

const ANAESTHESIA = '/platform/idea/Condition/metabolism/anaesthesia';
const ANALGESIA = '/platform/idea/Condition/metabolism/analgesia';

function installConditionSeed(path: string, signature: unknown[]): void {
  if (StuffApi.findByTemplatePath(path)) return;
  const c = makeStuff(() => new Condition());
  c.setSignature(signature as never);
  stampTemplatePathForTest(c, path);
}

describe('sedation / analgesia reads', () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    installConditionSeed(ANAESTHESIA, [{ kind: 'sedation', atStage: 2 }]);
    installConditionSeed(ANALGESIA, [{ kind: 'analgesia', relief: 0.6 }]);
  });
  afterEach(() => StuffApi.clearAll());

  it('anaesthesia at stage 2 reads unconscious; stage 1 is conscious', () => {
    const c = makeStuff(() => new Creature());
    c.afflict({
      kind: 'affliction',
      templatePath: ANAESTHESIA,
      stage: 1,
      elapsed: 0,
    });
    expect(c.isSedated()).toBe(false);
    expect(c.getConsciousness()).not.toBe('unconscious');

    // bump it to stage 2 → under
    const rec = c
      .getConditions()
      .find((x) => x.kind === 'affliction') as { stage: number };
    rec.stage = 2;
    expect(c.isSedated()).toBe(true);
    expect(c.getConsciousness()).toBe('unconscious');
  });

  it('analgesia reports its relief; no drug → zero', () => {
    const c = makeStuff(() => new Creature());
    expect(c.analgesiaRelief()).toBe(0);
    c.afflict({
      kind: 'affliction',
      templatePath: ANALGESIA,
      stage: 1,
      elapsed: 0,
    });
    expect(c.analgesiaRelief()).toBeCloseTo(0.6, 5);
  });
});
