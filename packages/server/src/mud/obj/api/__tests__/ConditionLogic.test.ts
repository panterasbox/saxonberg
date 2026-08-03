/**
 * ConditionLogic / ConditionApi — the `inflict` producer spine (Phase 0). Covers:
 * `inflict` maps mechanism → trauma type, energy → severity, records the
 * raw mechanism, afflicts through `VitalsMixin`, and stamps the
 * context-derived inflicter (giver templatePath under a non-forced single
 * giver; undefined when forced / cross-actor / absent). And the gate: a
 * raw call to `ConditionLogic.inflict` from outside `ConditionApi` is denied.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ConditionApi } from '../../../api/condition';
import { ConditionLogic } from '../ConditionLogic';
import { Creature } from '../../../lib/creature/Creature';
import Thing from '../../../lib/stuff/Thing';
import { StuffApi } from '../../../api/stuff';
import {
  ExecutionContextApi,
  FrameKind,
} from '../../../api/execution-context';
import {
  makeStuff,
  stampTemplatePathForTest,
} from '../../../lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../../lib/persistence/__tests__/quantity-marshaller-test-helpers';
import type { Trauma } from '../../Condition';

/** A command frame carrying `giver`, non-forced by default. */
function cmdFrame(giver: unknown, forced = false) {
  return {
    kind: FrameKind.Command,
    metadata: { commandContext: { commandGiver: giver }, forced },
  } as const;
}

function trauma(c: Creature): Trauma {
  const t = c.getConditions().find((x) => x.kind === 'trauma');
  return t as Trauma;
}

describe('ConditionLogic.inflict — producer spine', () => {
  beforeEach(() => installV1QuantityMarshallers());
  afterEach(() => StuffApi.clearAll());

  it('maps mechanism → type, energy → severity, records the mechanism', () => {
    const body = makeStuff(() => new Creature());
    const out = ConditionApi.inflict(body, {
      mechanism: 'edge',
      site: 'body.leg.left.foot',
      energy: 1.5,
    });

    expect(out.afflicted).toBe(true);
    const t = trauma(body);
    expect(t.type).toBe('laceration');
    expect(t.site).toBe('body.leg.left.foot');
    expect(t.severity).toBeCloseTo(1.5, 6);
    expect(t.mechanism).toBe('edge');
  });

  it('maps each insult kind to its trauma type (unarmored)', () => {
    // Channels resolve through the (empty, unarmored) stack to the tissue;
    // the passthrough tokens map straight to burn / avulsion. This body has
    // no authored body plan, so blunt contuses (no bone → no fracture); the
    // blunt-through-plate → fracture path is exercised in the acceptance
    // test with a boned body plan.
    const cases: Array<
      [Exclude<Parameters<typeof ConditionApi.inflict>[1]['mechanism'], 'shock'>, string]
    > = [
      ['edge', 'laceration'],
      ['point', 'puncture'],
      ['blunt', 'contusion'],
      ['heat', 'burn'],
      ['tearing', 'avulsion'],
    ];
    for (const [mechanism, type] of cases) {
      const body = makeStuff(() => new Creature());
      ConditionApi.inflict(body, { mechanism, site: 'body.torso', energy: 1 });
      expect(trauma(body).type).toBe(type);
    }
  });

  it('derives the inflicter from a single non-forced command giver', () => {
    const giver = makeStuff(() => new Creature());
    stampTemplatePathForTest(giver, '/obj/Avatar/attacker');
    const body = makeStuff(() => new Creature());

    ExecutionContextApi.runRoot(null, 'root', () => {
      ExecutionContextApi.run(
        null,
        giver,
        'executeCommand',
        cmdFrame(giver),
        () => {
          ConditionApi.inflict(body, {
            mechanism: 'edge',
            site: 'body.torso',
            energy: 1,
          });
        }
      );
    });

    expect(trauma(body).inflictedBy).toBe('/obj/Avatar/attacker');
  });

  it('leaves the inflicter undefined under a forced dispatch', () => {
    const giver = makeStuff(() => new Creature());
    stampTemplatePathForTest(giver, '/obj/Avatar/forcer');
    const body = makeStuff(() => new Creature());

    ExecutionContextApi.runRoot(null, 'root', () => {
      ExecutionContextApi.run(
        null,
        giver,
        'executeCommand',
        cmdFrame(giver, true),
        () => {
          ConditionApi.inflict(body, {
            mechanism: 'edge',
            site: 'body.torso',
            energy: 1,
          });
        }
      );
    });

    expect(trauma(body).inflictedBy).toBeUndefined();
  });

  it('leaves the inflicter undefined outside any command frame', () => {
    const body = makeStuff(() => new Creature());
    ConditionApi.inflict(body, {
      mechanism: 'edge',
      site: 'body.torso',
      energy: 1,
    });
    expect(trauma(body).inflictedBy).toBeUndefined();
  });

  it('afflicts nothing on a non-wound-able (non-Vitals) target', () => {
    const notABody = makeStuff(() => new Thing());
    const out = ConditionApi.inflict(notABody, {
      mechanism: 'edge',
      site: 'body.torso',
      energy: 1,
    });
    expect(out.afflicted).toBe(false);
    expect(out.trauma.type).toBe('laceration');
  });

  it('denies a raw call to ConditionLogic.inflict from outside ConditionApi', () => {
    const raw = makeStuff(() => new ConditionLogic());
    const body = makeStuff(() => new Creature());
    let threw = false;
    try {
      raw.inflict(body, { mechanism: 'edge', site: 'body.torso', energy: 1 });
    } catch {
      threw = true;
    }
    expect(threw).toBe(true);
    // Nothing was afflicted through the denied path.
    expect(body.getConditions()).toHaveLength(0);
  });
});
