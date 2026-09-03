/**
 * Field-set alias plumbing — REF_FIELDS / DETAIL_FIELDS constants,
 * `resolveFieldSet` for the 'ref' / 'detail' / array forms.
 */

import { describe, it, expect } from 'vitest';
import {
  REF_FIELDS,
  DETAIL_FIELDS,
  resolveFieldSet,
} from '../mql-subscription';

describe('MQL subscription — field-set aliases', () => {
  it('REF_FIELDS shape', () => {
    expect(REF_FIELDS).toEqual(['displayName', 'quantity', 'primaryKeyword']);
  });

  it('DETAIL_FIELDS shape', () => {
    expect(DETAIL_FIELDS).toEqual([
      'displayName',
      'quantity',
      'primaryKeyword',
      'shortDescription',
      'longDescription',
      'illustration',
      'details',
      'bulkMaterial',
      'mass',
      'contents',
      'worn',
      'exits',
    ]);
  });

  it('resolveFieldSet(undefined) returns REF_FIELDS', () => {
    expect(resolveFieldSet(undefined)).toBe(REF_FIELDS);
  });

  it("resolveFieldSet('ref') returns REF_FIELDS", () => {
    expect(resolveFieldSet('ref')).toBe(REF_FIELDS);
  });

  it("resolveFieldSet('detail') returns DETAIL_FIELDS", () => {
    expect(resolveFieldSet('detail')).toBe(DETAIL_FIELDS);
  });

  it('resolveFieldSet(array) returns the array as-is', () => {
    const custom = ['name', 'foo'];
    expect(resolveFieldSet(custom)).toBe(custom);
  });
});
