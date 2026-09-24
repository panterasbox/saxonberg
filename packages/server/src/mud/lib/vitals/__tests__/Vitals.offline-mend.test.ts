/**
 * ⭐⭐ Recovery runs offline (D3, W-A2) — the mend arm's second stamp.
 *
 * `reconcileConditions` integrates each wound through TWO stamps under
 * OPPOSITE absence rules:
 *  - the HARM arm (`tickedAt`) freezes on linkdead and drops a far-past
 *    gap — being away must never bleed you;
 *  - the MEND arm (`mendedAt`) does NEITHER — being away must never COST
 *    you, and mending is never a cost — so a body knits across a logout at
 *    whatever `k` it reads on return.
 *
 * The contrast fixture (a bleeding, undressed wound in the same gap) is
 * what keeps the two arms from collapsing into one: if a future edit made
 * mend obey the far-past drop, the fracture case would still pass and only
 * these would fail, naming the reason.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Creature } from '../../creature/Creature';
import { HARM_DEFAULTS } from '../../../platform/idea/Condition';
import type { Trauma } from '../../../platform/idea/Condition';
import { WorldClockApi } from '../../../api/worldclock';
import '../../../platform/idea/WorldClockRegistry';
import { MixinApi } from '../../../api/mixin';
import { Postures } from '../../slot/Postured';
import { makeStuff } from '../../security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';

const SCALE = 12;
let real = 0;

/** Push game-time forward, reading a vital so the lazy reconcile fires. */
function advance(c: Creature, gameSec: number): void {
  real += (gameSec / SCALE) * 1000;
  c.getVitalSign('bloodVolume');
}

/** A body that is lying down (so the convalescence factor is a clean 1.0). */
function lyingBody(): Creature {
  const c = makeStuff(() => new Creature());
  c.setLifecycleState('alive');
  c.setPosture(Postures.Lie);
  return c;
}

/** Make `c` look linkdead to the reconcile (Creature is not HasInteractive). */
function goDark(c: Creature): void {
  (c as unknown as { isLinkdead: () => boolean }).isLinkdead = () => true;
  vi.spyOn(MixinApi, 'isHasInteractive').mockReturnValue(true);
}

const traumaOf = (c: Creature): Trauma | undefined =>
  c.getConditions().find((x): x is Trauma => x.kind === 'trauma');

/** Past the D3a safety delay — mending is allowed to start. */
const SAFE = HARM_DEFAULTS.CONVALESCENCE_SAFE_DELAY + 60;

beforeEach(() => {
  installV1QuantityMarshallers();
  WorldClockApi._resetForTesting();
  real = 100000;
  WorldClockApi._setNowProviderForTesting(() => real);
});
afterEach(() => {
  WorldClockApi._resetForTesting();
  vi.restoreAllMocks();
});

describe('mending runs while you are away — harm still freezes', () => {
  it('⭐⭐ a linkdead body with a DRESSED wound knits — and never bleeds', () => {
    // Standing (k = the floor, 0.2), so it knits PARTIALLY over the gap
    // rather than clearing entirely — the read below needs it to survive.
    const c = makeStuff(() => new Creature());
    c.setLifecycleState('alive');
    const blood0 = c.getVitalSign('bloodVolume').rawValue();
    c.afflict({
      kind: 'trauma',
      type: 'laceration',
      site: 'body.arm.left',
      severity: 2,
      dressed: true,
      bleeding: false,
    });
    advance(c, 1); // first-touch: seed both stamps
    const sev0 = traumaOf(c)!.severity;

    // ⭐ The LOGGED-OFF reconnect: an evicted body is not reconciled while
    // away, then reconciles ONE big gap on return (NOT linkdead — you are
    // back). The mend arm integrates it; the harm arm far-past-drops.
    advance(c, SAFE);

    const t = traumaOf(c);
    // It knitted across the gap…
    expect(t!.severity).toBeLessThan(sev0);
    // …and it never bled (dressed, and the harm arm drops a far gap anyway).
    expect(c.getVitalSign('bloodVolume').rawValue()).toBe(blood0);
  });

  it('⭐ a 3-day logout heals a fracture — the mend arm has no far-past drop', () => {
    const c = lyingBody();
    c.afflict({
      kind: 'trauma',
      type: 'fracture',
      site: 'body.leg.left',
      severity: 1,
    });
    advance(c, 1); // seed
    expect(traumaOf(c)?.type).toBe('fracture');

    // A gap MANY times the far-past guard, integrated on the reconnect read
    // (not linkdead): the harm arm integrates nothing across it, but the
    // mend arm integrates the whole thing (no far-past drop).
    advance(c, 3 * 24 * 60 * 60);

    // The fracture healed to clear and was swept off the body.
    expect(traumaOf(c)).toBeUndefined();
  });

  it('⭐⭐ a LINKDEAD body in-world freezes BOTH arms — the broad invariant', () => {
    // Unlike a logged-off (evicted) body, a linkdead body lingering in the
    // world integrates NOTHING while reconciled by others — neither harm nor
    // mend. Offline mend is the reconnect path, not this one.
    const c = lyingBody();
    c.afflict({
      kind: 'trauma',
      type: 'fracture',
      site: 'body.leg.left',
      severity: 1,
    });
    advance(c, 1); // seed
    const sev0 = traumaOf(c)!.severity;
    goDark(c);
    advance(c, SAFE + 1000); // a long linkdead gap
    // Frozen: the fracture is neither healed nor gone.
    expect(traumaOf(c)?.severity).toBe(sev0);
  });

  it('⚠ a bleeding UNDRESSED wound across the same gap loses no blood, and does not knit', () => {
    const c = lyingBody();
    const blood0 = c.getVitalSign('bloodVolume').rawValue();
    c.afflict({
      kind: 'trauma',
      type: 'laceration',
      site: 'body.arm.left',
      severity: 3,
      bleeding: true,
      dressed: false,
    });
    advance(c, 1); // seed
    const sev0 = traumaOf(c)!.severity;

    // A far-past gap (NOT linkdead — a genuine long absence): the harm arm
    // drops it (no blood lost), and the mend arm holds an open bleed at its
    // severity (nothing knits while it is still bleeding-undressed).
    advance(c, HARM_DEFAULTS.MAX_REASONABLE_GAP_SEC + 3600);

    const t = traumaOf(c)!;
    expect(c.getVitalSign('bloodVolume').rawValue()).toBe(blood0); // no blood lost
    expect(t.severity).toBe(sev0); // and it did not knit
    expect(t.bleeding).toBe(true); // still an open wound on return
  });
});
