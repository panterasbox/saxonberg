import '../../../../../test-bootstrap';
import { describe, it, expect, beforeEach } from 'vitest';
import { SpeciesApi } from '../../../../api/species';
import { StuffApi } from '../../../../api/stuff';
import { OrganismMixin } from '../../../../lib/species/Organism';
import { Idea } from '../../../../lib/stuff/Idea';
import Species from '../../species/Species';
import { makeStuff, makeStuffAtPath } from '../../../../lib/security/__tests__/test-setup';

class Body extends OrganismMixin(Idea) {
  static _mixinName = 'SentienceTestBody';
}

/**
 * ⭐⭐ `isSentient` FAILS CLOSED (the scan sweep, 2026-10-14). A body that
 * cites a species whose row is not resident is treated as sentient — the
 * cautious branch — never as a thing. It answered false, which let a
 * collie be butchered on a cold world.
 */
describe('SpeciesApi.isSentient', () => {
  beforeEach(() => StuffApi.clearAll());

  it('a body citing a COLD species is sentient — the cautious answer', () => {
    const body = makeStuff(() => new Body());
    body._speciesPath = '/test/species/cold';
    expect(SpeciesApi.isSentient(body)).toBe(true);
  });

  it('a body with no species at all is not', () => {
    expect(SpeciesApi.isSentient(makeStuff(() => new Body()))).toBe(false);
  });

  it('a resident species answers for itself', () => {
    const dog = makeStuffAtPath(() => new Species(), '/test/species/dog');
    dog.setSentient(false);
    const body = makeStuff(() => new Body());
    body._speciesPath = '/test/species/dog';
    expect(SpeciesApi.isSentient(body)).toBe(false);
  });
});
