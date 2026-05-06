/**
 * Tests for DescribeApi.getDisplayName.
 *
 * Two-step resolution (post-Named-refactor):
 *   1. Named.name — proper name, when set
 *   2. Visible.shortDescription — visual identity, the common case
 *      for things that don't have proper names
 *   3. Fallback string
 *
 * The earlier bare-`.name`-string-property branch retired when
 * Location adopted NamedMixin.
 */

import { describe, it, expect } from 'vitest';
import { DescribeApi } from '../describe';
import { Stuff } from '../../lib/stuff/Stuff';
import { NamedMixin } from '../../lib/description/Named';
import { VisibleMixin } from '../../lib/description/Visible';
import { makeStuff } from '../../lib/security/__tests__/test-setup';
import { Idea } from "../../lib/stuff/Idea";

class Plain extends Idea {}
class NamedThing extends NamedMixin(Idea) {}
class VisibleThing extends VisibleMixin(Idea) {}
class NamedAndVisible extends NamedMixin(VisibleMixin(Idea)) {}

describe('DescribeApi.getDisplayName', () => {
  it('returns Named.name (casual register) when set', () => {
    const obj = makeStuff(() => new NamedThing());
    obj.setName('Alice');
    obj.setSurname('Smith');
    // Casual — surname is NOT included. Call `obj.getFullName()` for
    // the formal form.
    expect(DescribeApi.getDisplayName(obj, 'fallback')).toBe('Alice');
  });

  it('falls back to Visible.shortDescription when Named.name is empty', () => {
    const obj = makeStuff(() => new NamedAndVisible());
    obj.setShortDescription('a heavy oak door');
    expect(DescribeApi.getDisplayName(obj, 'fallback')).toBe(
      'a heavy oak door'
    );
  });

  it('Named.name takes precedence over Visible.shortDescription', () => {
    const obj = makeStuff(() => new NamedAndVisible());
    obj.setName('Excalibur');
    obj.setShortDescription('a gleaming silver sword');
    expect(DescribeApi.getDisplayName(obj, 'fallback')).toBe('Excalibur');
  });

  it('uses Visible.shortDescription on a non-Named object', () => {
    const obj = makeStuff(() => new VisibleThing());
    obj.setShortDescription('a rusty key');
    expect(DescribeApi.getDisplayName(obj, 'fallback')).toBe('a rusty key');
  });

  it('skips empty Visible.shortDescription', () => {
    const obj = makeStuff(() => new VisibleThing());
    obj.setShortDescription('');
    expect(DescribeApi.getDisplayName(obj, 'fallback')).toBe('fallback');
  });

  it('returns the fallback when neither Named nor Visible applies', () => {
    expect(
      DescribeApi.getDisplayName(makeStuff(() => new Plain()), 'something')
    ).toBe('something');
  });

  it('defaults the fallback to empty string', () => {
    expect(
      DescribeApi.getDisplayName(makeStuff(() => new Plain()))
    ).toBe('');
  });
});
