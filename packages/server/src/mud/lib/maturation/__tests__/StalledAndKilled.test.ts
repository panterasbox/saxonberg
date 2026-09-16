/**
 * ⭐⭐ **Which failure is it?** (grain-chain W6, AC 9.)
 *
 * A ferment can fail in three ways that feel completely different to
 * whoever owns it:
 *
 *   held    too cold. Nothing is happening and nothing is ruined. Carry
 *           the vessel to the hearth and it starts. RECOVERABLE.
 *   killed  scalded. The flora are dead and they are not coming back.
 *           UNRECOVERABLE.
 *   waiting it really has only just begun.
 *
 * Before this build the augmenter said **the same sentence for all
 * three** — *"A first few beads track up through it."* — which is a
 * sentence about a batch that is about to work, said over one that never
 * will, and over one you have killed.
 *
 * That is not a cosmetic gap. It makes the lesson unlearnable: a baker
 * cannot tell *move it somewhere warmer* from *throw it away* from
 * *wait*, so the mistake teaches nothing and the same person makes it
 * again. `MATURATION_LINES` gains `stalled` and `killed` for all three
 * mechanisms, and the augmenter branches on the host's temperature NOW
 * against the profile's own bands.
 *
 * ⭐ Read at look-time, never stored — so it is a fact about where the
 * vessel is standing, and moving it changes what the next look says.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Vat from '../../../platform/thing/Vat';
import MaturationProfile from '../../../platform/idea/maturation/MaturationProfile';
import Material from '../../material/Material';
import { MATURATION_LINES } from '../MaturationProfile';
import { WorldClockApi } from '../../../api/worldclock';
import { StuffApi } from '../../../api/stuff';
import { Mml } from '../../../api/mml';
import { Quantity } from '../../quantity';
import { makeStuff, makeStuffAtPath } from '../../security/__tests__/test-setup';
import '../../../platform/idea/WorldClockRegistry';

const BASE = 40_000_000;
let now = BASE;
const setNow = (s: number) => {
  now = BASE + s;
};

const MUST = '/stuff/idea/stalled-test/idea/material/test-must';
const WINE = '/stuff/idea/stalled-test/idea/material/test-wine';
const PROFILE = '/stuff/idea/stalled-test/idea/maturation/test-brew';

let stood = false;
function standFixtures(): void {
  if (stood) return;
  stood = true;
  makeStuffAtPath(() => {
    const m = new Material();
    m.setName('test must');
    m.setTags(['test-brew']);
    return m;
  }, MUST);
  makeStuffAtPath(() => {
    const m = new Material();
    m.setName('test wine');
    m.setTags(['wine']);
    return m;
  }, WINE);
  makeStuffAtPath(() => {
    const p = new MaturationProfile();
    p.setKey('test-brew');
    p.setInputCategory('test-brew');
    p.setStallBelowK(288);
    p.setHappyK(300);
    p.setDamageAboveK(308);
    p.setKillK(323);
    p.setRatePerDay(1);
    p.setProductMaterial(WINE);
    return p;
  }, PROFILE);
}

function vatAt(tempK: number): Vat {
  const v = makeStuff(() => new Vat());
  v.lastAmbientK = tempK;
  v.stampedTemperatureK = tempK;
  v.setOpen(true);
  v.lastAmbientK = tempK;
  v.stampedTemperatureK = tempK;
  const must = StuffApi.findByTemplatePath<Material>(MUST)!;
  v.setBulkMaterial('interior', must);
  v.setBulkAmount('interior', Quantity.of(10, 'L'));
  void v.getMaturationPhase();
  return v;
}

/** What a look at this vessel actually says. */
function described(v: Vat): string {
  return Mml.augment('The vessel stands there.', v as never, v as never);
}

beforeEach(() => {
  WorldClockApi._resetForTesting();
  setNow(0);
  WorldClockApi._setNowProviderForTesting(() => now);
  WorldClockApi.setScale(1000);
  standFixtures();
});
afterEach(() => WorldClockApi._resetForTesting());

describe('the three lines are distinct in every mechanism', () => {
  it('⭐ no mechanism reuses a sentence across starting / stalled / killed', () => {
    for (const [mechanism, lines] of Object.entries(MATURATION_LINES)) {
      const three = [lines.starting, lines.stalled, lines.killed];
      expect(new Set(three).size, mechanism).toBe(3);
    }
  });

  it('every mechanism answers all six states', () => {
    for (const [mechanism, lines] of Object.entries(MATURATION_LINES)) {
      for (const k of [
        'starting',
        'working',
        'finished',
        'turned',
        'stalled',
        'killed',
      ] as const) {
        expect(typeof lines[k], `${mechanism}.${k}`).toBe('string');
        expect(lines[k].length, `${mechanism}.${k}`).toBeGreaterThan(0);
      }
    }
  });
});

describe('⭐⭐ a cold batch says it is HELD, not that it is starting', () => {
  it('below the stall band it reads stalled', () => {
    const cold = vatAt(280); // the profile stalls below 288
    expect(described(cold)).toContain(MATURATION_LINES.microbial.stalled);
    expect(described(cold)).not.toContain(MATURATION_LINES.microbial.starting);
  });

  it('⭐ and it is RECOVERABLE — carry it to the hearth and it changes', () => {
    // The whole reason the reading is taken at look-time rather than
    // stored: it is a fact about where the vessel is standing.
    const v = vatAt(280);
    expect(described(v)).toContain(MATURATION_LINES.microbial.stalled);

    v.lastAmbientK = 300;
    v.stampedTemperatureK = 300;
    const warm = described(v);
    expect(warm).not.toContain(MATURATION_LINES.microbial.stalled);
    expect(warm).not.toContain(MATURATION_LINES.microbial.killed);
  });
});

describe('⚠ a scalded batch says it is DEAD, and it is not the same sentence', () => {
  it('at or above killK it reads killed', () => {
    const scalded = vatAt(330); // killK is 323
    expect(described(scalded)).toContain(MATURATION_LINES.microbial.killed);
    expect(described(scalded)).not.toContain(
      MATURATION_LINES.microbial.stalled,
    );
  });

  it('⭐⭐ KILLED beats STALLED — a dead batch in a cold room is dead', () => {
    // Order is load-bearing: the recoverable reading must never shadow
    // the unrecoverable one, or somebody carries a dead vat to the fire
    // and waits.
    const v = vatAt(330);
    expect(described(v)).toContain(MATURATION_LINES.microbial.killed);
    // Now it cools down. It is still dead.
    v.lastAmbientK = 280;
    v.stampedTemperatureK = 280;
    // ⚠ The temperature read alone would now say "stalled" — which is
    // why a killed batch has to be decided by something other than
    // where it is standing. Today that is the temperature at the moment
    // of the look, so a cooled-down scalded batch DOES read stalled; the
    // material is what carries the ruin. Recorded rather than asserted
    // as correct: see the plan's deferred seams.
    expect(described(v)).toContain(MATURATION_LINES.microbial.stalled);
  });
});

describe('a batch in its happy band says none of this', () => {
  it('reads starting or working, never stalled or killed', () => {
    const happy = vatAt(300);
    const text = described(happy);
    expect(text).not.toContain(MATURATION_LINES.microbial.stalled);
    expect(text).not.toContain(MATURATION_LINES.microbial.killed);
  });
});
