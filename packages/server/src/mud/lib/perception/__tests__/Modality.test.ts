/**
 * Modality base class — field round-trip + invariant tests.
 *
 * Each modality singleton's behavior (signalAt walks, percept
 * narrowing) lives in `modalities/__tests__/`. This file covers the
 * base-class contract that's modality-agnostic.
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach } from 'vitest';
import { Modality } from '../Modality';
import type { ModalityFamily } from '../Modality';
import { StuffApi } from '../../../api/stuff';
import {
  makeStuff,
  stampTemplatePathForTest,
} from '../../security/__tests__/test-setup';

class TestModality extends Modality {}

function newModalityAt(path: string): TestModality {
  const m = makeStuff(() => new TestModality());
  stampTemplatePathForTest(m, path);
  return m;
}

describe('Modality base class', () => {
  beforeEach(() => {
    StuffApi.clearAll();
  });

  it('round-trips name / family / modality via setters', () => {
    const m = newModalityAt('/obj/modalities/x');
    m.setName('xeno');
    m.setFamily('field');
    m.setModality('xenoreception');
    expect(m.getName()).toBe('xeno');
    expect(m.getFamily()).toBe('field');
    expect(m.getModality()).toBe('xenoreception');
  });

  it('setName rejects empty strings', () => {
    const m = newModalityAt('/obj/modalities/y');
    expect(() => m.setName('')).toThrow(TypeError);
  });

  it('setModality rejects empty strings', () => {
    const m = newModalityAt('/obj/modalities/z');
    expect(() => m.setModality('')).toThrow(TypeError);
  });

  it('setFamily rejects values outside the union', () => {
    const m = newModalityAt('/obj/modalities/q');
    expect(() => m.setFamily('quantum' as ModalityFamily)).toThrow(TypeError);
  });

  it.each<ModalityFamily>(['field', 'contact', 'network'])(
    'accepts family value "%s"',
    (family) => {
      const m = newModalityAt(`/obj/modalities/${family}-t`);
      m.setFamily(family);
      expect(m.getFamily()).toBe(family);
    },
  );

  it('signalAt defaults to null', () => {
    const m = newModalityAt('/obj/modalities/d1');
    // Cast to unknown — the base default's first arg type doesn't
    // matter because the method returns null unconditionally.
    expect(m.signalAt({} as never)).toBeNull();
  });

  it('perceiveFor defaults to null', () => {
    const m = newModalityAt('/obj/modalities/d2');
    expect(m.perceiveFor({} as never, {} as never, {})).toBeNull();
  });
});
