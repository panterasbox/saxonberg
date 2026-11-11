/**
 * MaturationProfileCatalogue and FractionScheduleCatalogue — the two
 * DOCUMENT catalogues behind the vat and the still (load-on-use W4): a
 * document parses through the value's own setters (a malformed one is
 * refused naming the field), the tag match runs over what is resident with
 * the double-match diagnostic, a culture is found by its strain, the whole
 * kind loads once per process, and a cold read throws naming the path.
 */

import "../../../test-bootstrap";
import { describe, it, expect, vi, afterEach } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import MaturationProfile from '../../lib/maturation/MaturationProfile';
import Material from '../../lib/material/Material';
import { BulkableApi } from '../../api/bulk';
import { DocumentApi } from '../../api/document';
import { DocumentNotResidentError } from '../../lib/errors';
import { makeStuff } from '../../lib/security/__tests__/test-setup';
import { forgetProfiles, rememberProfile } from '../../lib/maturation/__tests__/profiles';

afterEach(() => {
  vi.restoreAllMocks();
  forgetProfiles();
});

const MUST = { inputCategory: 'must', stallBelowK: 283, happyK: 291, damageAboveK: 303, ratePerDay: 0.1, productMaterial: '/m/wine' };

function withData(data: Record<string, unknown>): MaturationProfile {
  const p = new MaturationProfile();
  p.applyData(data);
  return p;
}

function material(tags: string[]): Material {
  const m = makeStuff(() => new Material());
  m.setTags(tags);
  return m;
}

describe('a profile is a document', () => {
  it('parses through the setters; the key is the leaf', () => {
    const p = BulkableApi.maturationProfiles().parse(MUST, '/t/maturation-profiles/red-wine');
    expect(p.getKey()).toBe('red-wine');
    expect(p.getPath()).toBe('/t/maturation-profiles/red-wine');
    expect(p.getRatePerDay()).toBe(0.1);
  });

  it('a malformed profile is refused, naming the field', () => {
    expect(() =>
      BulkableApi.maturationProfiles().parse({ ...MUST, kind: 'soup' }, '/t/maturation-profiles/bad'),
    ).toThrow(/maturation profile '\/t\/maturation-profiles\/bad'.*soup/);
  });

  it('a schedule is a document too', () => {
    const s = BulkableApi.fractionSchedules().parse(
      {
        inputCategory: 'wash',
        separation: 'cuts',
        productMaterial: '/m/spirit',
        fractions: [{ key: 'hearts', upTo: 0.9, character: 'clean and sweet', gradeBand: 'fine' }],
      },
      '/t/fraction-schedules/whiskey-wash',
    );
    expect(s.getKey()).toBe('whiskey-wash');
  });

  it('a cold read throws naming the path (D1)', () => {
    expect(() => BulkableApi.maturationProfiles().need('/t/maturation-profiles/never')).toThrow(
      DocumentNotResidentError,
    );
  });
});

describe('the tag match over the resident profiles', () => {
  it('matches by tag, warns and resolves deterministically on a double match', () => {
    rememberProfile(() => withData(MUST), '/t/maturation-profiles/b-red');
    rememberProfile(() => withData(MUST), '/t/maturation-profiles/a-red');
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const hit = BulkableApi.maturationProfiles().forMaterial(material(['must']));
    expect(hit?.getKey()).toBe('a-red');
    expect(warn).toHaveBeenCalled();
  });

  it('returns null when nothing matches', () => {
    rememberProfile(() => withData(MUST), '/t/maturation-profiles/red');
    expect(BulkableApi.maturationProfiles().forMaterial(material(['water']))).toBeNull();
  });

  it('a culture is found by its strain', () => {
    rememberProfile(
      () => withData({ ...MUST, kind: 'culture', strain: 'ale' }),
      '/t/maturation-profiles/ale-culture',
    );
    expect(BulkableApi.maturationProfiles().cultureForStrain('ale')?.getKey()).toBe('ale-culture');
    expect(BulkableApi.maturationProfiles().cultureForStrain('lager')).toBeNull();
  });
});

describe('the kind loads once per process, and nothing boots it', () => {
  it('ensureAll reads the kind once, however many vessels ask', async () => {
    const list = vi.spyOn(DocumentApi, 'listOfKind').mockResolvedValue([]);
    const cat = BulkableApi.maturationProfiles();
    await Promise.all([cat.ensureAll(), cat.ensureAll()]);
    await cat.ensureAll();
    expect(list).toHaveBeenCalledTimes(1);
    expect(list).toHaveBeenCalledWith('maturation-profile');
  });

  it('the platform pack boots neither catalogue', () => {
    const src = readFileSync(
      fileURLToPath(new URL('../../../../../content/platform/pack.yaml', import.meta.url)),
      'utf-8',
    );
    expect(src).not.toMatch(/MaturationProfileCatalogue|FractionScheduleCatalogue/);
  });
});
