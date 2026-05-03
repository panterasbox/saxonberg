/**
 * Tests for DescribeApi
 */

import { describe, it, expect } from 'vitest';
import { DescribeApi } from './describe';
import { Stuff } from '../lib/stuff/Stuff';
import { NamedMixin } from '../lib/character/Named';
import { VisibleMixin } from '../lib/description/Visible';
import { makeStuff } from '../lib/security/test-setup';

class Plain extends Stuff {}

class NamedThing extends NamedMixin(Stuff) {}

class VisibleThing extends VisibleMixin(Stuff) {}

class WithNameProp extends Stuff {
  name: string = '';
}

describe('DescribeApi.getDisplayName', () => {
  it('prefers NamedMixin.fullName', () => {
    const obj = makeStuff(() => new NamedThing());
    obj.firstName = 'Jane';
    obj.lastName = 'Doe';
    expect(DescribeApi.getDisplayName(obj, 'fallback')).toBe('Jane Doe');
  });

  it('falls back to a string `name` property when Named is absent', () => {
    const obj = makeStuff(() => new WithNameProp());
    obj.name = 'Town Square';
    expect(DescribeApi.getDisplayName(obj, 'fallback')).toBe('Town Square');
  });

  it('skips empty `name` strings', () => {
    const obj = makeStuff(() => new WithNameProp());
    obj.name = '';
    expect(DescribeApi.getDisplayName(obj, 'fallback')).toBe('fallback');
  });

  it('falls back to VisibleMixin.shortDescription when name is missing', () => {
    const obj = makeStuff(() => new VisibleThing());
    obj.shortDescription = 'a rusty key';
    expect(DescribeApi.getDisplayName(obj, 'fallback')).toBe('a rusty key');
  });

  it('skips empty shortDescription', () => {
    const obj = makeStuff(() => new VisibleThing());
    obj.shortDescription = '';
    expect(DescribeApi.getDisplayName(obj, 'fallback')).toBe('fallback');
  });

  it('returns the fallback when no name source is available', () => {
    expect(DescribeApi.getDisplayName(makeStuff(() => new Plain()), 'something')).toBe('something');
  });

  it('defaults the fallback to empty string', () => {
    expect(DescribeApi.getDisplayName(makeStuff(() => new Plain()))).toBe('');
  });
});
