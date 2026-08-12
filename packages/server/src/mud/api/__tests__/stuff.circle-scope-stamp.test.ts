/**
 * The mint-time circle-scope stamp (Wave 1, Decision I): newborns
 * minted under circle context carry the minting context's scope; field
 * and omni mints leave the slot null. The register chokepoints
 * (`create`, `createSync`) are the stamp sites.
 */

import "../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { StuffApi } from '../stuff';
import {
  ExecutionContextApi,
  OMNI_SCOPE,
} from '../execution-context';
import { Idea } from '../../lib/stuff/Idea';

const SCOPE = '/home/test-player';

class ScopeProbe extends Idea {}

describe('circle-scope stamping at mint', () => {
  beforeEach(() => {
    StuffApi.clearAll();
  });

  afterEach(() => {
    ExecutionContextApi._clearForTesting();
  });

  it('a field mint leaves the slot null', async () => {
    const obj = await StuffApi.create(() => new ScopeProbe());
    expect(obj.getCircleScope()).toBeNull();
  });

  it('a circle-context mint stamps the ambient scope', async () => {
    const obj = await ExecutionContextApi.runRootGuarded(
      null,
      'test',
      () => StuffApi.create(() => new ScopeProbe()),
      'rethrow',
      { circleScope: SCOPE }
    );
    expect(obj!.getCircleScope()).toBe(SCOPE);
  });

  it('an omni-context mint leaves the slot null (system objects are field objects)', async () => {
    const obj = await ExecutionContextApi.runRootGuarded(
      null,
      'test',
      () => StuffApi.create(() => new ScopeProbe()),
      'rethrow',
      { circleScope: OMNI_SCOPE }
    );
    expect(obj!.getCircleScope()).toBeNull();
  });

  it('createSync stamps the same way', () => {
    ExecutionContextApi.runRoot(
      null,
      'test',
      () => {
        const obj = StuffApi.createSync(() => new ScopeProbe());
        expect(obj.getCircleScope()).toBe(SCOPE);
      },
      { circleScope: SCOPE }
    );
  });

  it('the slot is forge-resistant: bracket writes are runtime no-ops', async () => {
    const obj = await ExecutionContextApi.runRootGuarded(
      null,
      'test',
      () => StuffApi.create(() => new ScopeProbe()),
      'rethrow',
      { circleScope: SCOPE }
    );
    (obj as unknown as Record<string, unknown>)['circleScope'] = null;
    (obj as unknown as Record<string, unknown>)['#circleScope'] = null;
    expect(obj!.getCircleScope()).toBe(SCOPE);
  });
});
