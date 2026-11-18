/**
 * ⭐⭐ A body read does not integrate the body (crowded-rooms D13–D15, D21).
 *
 * The W0 profile put a body READ under every crossing (a size read for the
 * fit) and every `describeFor` (the viewer's sight gate) — and each one
 * reconciled metabolism, thermoregulation and conditions to now: a body
 * hungered because somebody walked into its room. These pin:
 *
 *  - D13 — a size read reads the banked flesh (no metabolism reconcile);
 *  - D14 — the sight gate reads the conditions as they stand, and gives
 *    the same answer the reconciled read would;
 *  - D15 — inside the room's reading a body stands still (all three
 *    reconcilers stand off), and the flag costs no security frame;
 *  - D21 — a dying player dies on the clock with nothing reading them.
 */
import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Creature } from '../Creature';
import { Actor } from '../Actor';
import { WorldClockApi } from '../../../api/worldclock';
import { ExecutionContextApi } from '../../../api/execution-context';
import { MixinApi } from '../../../api/mixin';
import '../../../platform/idea/WorldClockRegistry';
import { makeStuff } from '../../security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';
import { installCorpseMintStub } from '../../mortality/__tests__/corpse-mint-test-helpers';

const SCALE = 12;
let real = 0;

/** Push game-time forward WITHOUT reading the body. */
function pass(gameSec: number): void {
  real += (gameSec / SCALE) * 1000;
}

/** A living body, its clocks seeded by one deliberate read. */
function body(): Creature {
  const c = makeStuff(() => new Creature());
  c.setLifecycleState('alive');
  c.getVitalSign('bloodVolume'); // seed the stamps
  c.getReserve('flesh');
  return c;
}

/** Every stamp an integration moves. */
function stamps(c: Creature): Record<string, unknown> {
  const raw = c as unknown as Record<string, unknown>;
  return {
    metabolic: raw['metabolicClockStamp'],
    thermalReg: raw['thermalRegStamp'],
    reserves: JSON.stringify(raw['reserves']),
    conditions: JSON.stringify(raw['conditions']),
  };
}

/** The sight gate, asked of a body (it is `Actor`'s, over the conditions it stores). */
const caustic = (c: Creature): boolean =>
  (Actor.prototype as unknown as { hasCausticAtHead(this: Creature): boolean }).hasCausticAtHead.call(c);

describe('⭐⭐ a body read does not integrate the body (crowded-rooms D13–D15)', () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    installCorpseMintStub();
    WorldClockApi._resetForTesting();
    real = 100_000;
    WorldClockApi._setNowProviderForTesting(() => real);
  });
  afterEach(() => {
    WorldClockApi._resetForTesting();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('D13 — a size read (density, volume) reads the banked flesh: ten minutes on, nothing integrates', () => {
    const c = body();
    pass(600);
    const before = stamps(c);
    c.getBodyDensity();
    c.getVolumeM3();
    expect(stamps(c)).toEqual(before);
    // …and a deliberate read still brings it to now.
    c.getReserve('flesh');
    expect(stamps(c)['metabolic']).not.toBe(before['metabolic']);
  });

  it('D14 — the sight gate reads the conditions as they stand, and answers as the reconciled read would', () => {
    const c = body();
    c.afflict({ kind: 'trauma', type: 'laceration', site: 'body.arm.left', severity: 3, dressed: false });
    pass(600);
    const before = stamps(c);
    expect(caustic(c)).toBe(false);
    expect(stamps(c), 'no wound ticked under the gate').toEqual(before);

    c.afflict({ kind: 'trauma', type: 'caustic', site: 'body.head', severity: 2, agentActive: true, dressed: false } as never);
    pass(600);
    const gate = caustic(c);
    const reconciled = c.getConditions().some(
      (x) => x.kind === 'trauma' && x.type === 'caustic' && (x as { agentActive?: boolean }).agentActive === true,
    );
    expect(gate).toBe(true);
    expect(gate).toBe(reconciled);
  });

  it('D15 — inside the room’s reading all three body reconcilers stand off', () => {
    const c = body();
    pass(600);
    const before = stamps(c);
    const release = ExecutionContextApi.holdWorldStill('a test walk');
    try {
      c.getReserve('flesh');
      c.getConditions();
      c.getVitalSign('coreTemperature');
    } finally {
      release();
    }
    expect(stamps(c)).toEqual(before);
  });

  it('D15 — the hold flag is an unwrapped static accessor (no security frame on a hot getter)', () => {
    const d = Object.getOwnPropertyDescriptor(ExecutionContextApi, 'worldHeldStill');
    expect(typeof d?.get).toBe('function');
    expect(d?.value).toBeUndefined();
    expect(ExecutionContextApi.worldHeldStill).toBe(false);
  });

  it('D21 — a dying player alone, nothing reading them, dies when the window ends', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    vi.spyOn(MixinApi, 'isHasInteractive').mockReturnValue(true);
    const c = body();
    (c as unknown as { isLinkdead: () => boolean }).isLinkdead = () => false;
    c.beginDying('exsanguination', 120);
    pass(121);
    vi.advanceTimersByTime(((121 / SCALE) * 1000) + 50);
    // No read of the body: the alarm ran its reconcile.
    const raw = c as unknown as { lifecycleState?: string; _lifecycleState?: string };
    expect(raw.lifecycleState ?? raw._lifecycleState ?? c.getLifecycleState()).toBe('dead');
  });

  it('D21 — a dying NPC is unchanged by the clock until something reads it', () => {
    const c = body();
    c.beginDying('exsanguination', 120);
    pass(500);
    expect(c.getLifecycleState(), 'nothing has read it').toBe('alive');
    c.isDying(); // a deliberate read resolves it
    expect(c.getLifecycleState()).toBe('dead');
  });
});
