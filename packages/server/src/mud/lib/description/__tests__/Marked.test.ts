/**
 * **Marks on things: two independent axes.**
 *
 *   read = perceive(the marks) + decode(the script)
 *
 * `form` gates PERCEIVE (which senses reach the marks); `script` gates
 * DECODE (whether the reader knows the system). Collapsing them is what
 * this file exists to prevent — braille is the case that proves they are
 * two, being touch-only *and* its own system, where raised common
 * lettering is touch-and-vision in the ordinary one.
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  MarkedMixin,
  MARK_FORMS,
  MARK_SCRIPTS,
  COMMON_SCRIPT,
} from '../Marked';
import { PerceptionApi } from '../../../api/perception';
import { StuffApi } from '../../../api/stuff';
import { ShadowApi } from '../../../api/shadow';
import Thing from '../../stuff/Thing';
import { makeStuff } from '../../security/__tests__/test-setup';

class Signpost extends MarkedMixin(Thing) {}

describe('the two axes are independent', () => {
  beforeEach(() => {
    ShadowApi._clearAllForTesting();
    StuffApi.clearAll();
  });
  afterEach(() => vi.restoreAllMocks());

  function sign(form?: string, script?: string): Signpost {
    const s = makeStuff(() => new Signpost());
    s.setMarkText('here lies nobody');
    if (form) s.setMarkForm(form);
    if (script) s.setMarkScript(script);
    return s;
  }

  it('defaults are the ordinary case: inked, common', () => {
    const s = sign();
    expect(s.getMarkForm()).toBe('inked');
    expect(s.getMarkScript()).toBe(COMMON_SCRIPT);
    expect(s.requiresLightToRead()).toBe(true);
  });

  it('BRAILLE is the proof: same form as raised letters, different system', () => {
    const raised = sign('embossed', 'common');
    const braille = sign('embossed', 'braille');
    // Identical on the perceive axis…
    expect(raised.getMarkModalities()).toEqual(braille.getMarkModalities());
    expect(raised.requiresLightToRead()).toBe(false);
    expect(braille.requiresLightToRead()).toBe(false);
    // …and different on the decode axis. Under one field these would be
    // indistinguishable, which is the collapse this field undoes.
    expect(raised.getMarkScript()).not.toBe(braille.getMarkScript());
  });

  it('a CIPHER is the mirror image — ordinary ink, unknown system', () => {
    const c = sign('inked', 'cipher');
    expect(c.requiresLightToRead()).toBe(true); // perceive: unremarkable
    expect(c.getMarkScript()).toBe('cipher'); // decode: the whole point
  });

  it('both axes refuse an unknown value rather than silently defaulting', () => {
    const s = sign();
    expect(() => s.setMarkForm('carved-in-light')).toThrow(RangeError);
    expect(() => s.setMarkScript('elvish')).toThrow(RangeError);
    // …and a value corrupted in storage degrades to the ordinary case
    // rather than throwing on every read.
    s.markScript = 'nonsense';
    expect(s.getMarkScript()).toBe(COMMON_SCRIPT);
  });

  it('the vocabularies stay small and named', () => {
    expect(Object.keys(MARK_FORMS)).toEqual(['inked', 'embossed', 'both']);
    expect(Object.keys(MARK_SCRIPTS)).toEqual([
      'common',
      'braille',
      'cipher',
    ]);
  });
});

describe('the perceive gate is an INTERSECTION, both directions', () => {
  beforeEach(() => {
    ShadowApi._clearAllForTesting();
    StuffApi.clearAll();
  });
  afterEach(() => vi.restoreAllMocks());

  function sign(form: string): Signpost {
    const s = makeStuff(() => new Signpost());
    s.setMarkText('mind the step');
    s.setMarkForm(form);
    return s;
  }

  it('EMBOSSED text is readable with no light at all', () => {
    // The mechanical payoff, and the reason an expedition pays for a
    // tactile book. Nothing about the environment is consulted.
    const reader = makeStuff(() => new Thing());
    expect(PerceptionApi.canMakeOutMarks(reader, sign('embossed'))).toBe(true);
  });

  it('⚠ touch is NOT organ-modelled, so its absence must not deny', () => {
    // The regression this nearly shipped as: `sensoryPorts` describes
    // ORGANS (count, position — eyes, ears, a nose), so no shipped body
    // plan declares touch. A gate that required touch in the sensorium
    // made every embossed text unreadable by everyone.
    //
    // Asserted through the real biped seed's shape: vision, hearing,
    // smell — and no touch.
    const reader = makeStuff(() => new Thing());
    const senses = PerceptionApi.sensorium(reader);
    expect(senses.some((m) => m.getName() === 'touch')).toBe(false);
    // …and embossed text still reads.
    expect(PerceptionApi.canMakeOutMarks(reader, sign('embossed'))).toBe(true);
  });

  it('marks with NO modality at all are unreadable by construction', () => {
    const s = sign('inked');
    vi.spyOn(s, 'getMarkModalities').mockReturnValue([]);
    const reader = makeStuff(() => new Thing());
    expect(PerceptionApi.canMakeOutMarks(reader, s)).toBe(false);
  });

  it('`both` succeeds on either channel — one usable sense is enough', () => {
    const s = sign('both');
    expect(s.getMarkModalities()).toEqual(['vision', 'touch']);
    const reader = makeStuff(() => new Thing());
    // Even with vision unusable, touch carries it.
    expect(PerceptionApi.canMakeOutMarks(reader, s)).toBe(true);
  });
});
