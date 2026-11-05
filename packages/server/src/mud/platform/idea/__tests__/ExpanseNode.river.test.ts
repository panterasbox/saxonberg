/**
 * ⭐ Lying at the bar, `course kestrel` takes her in over it onto the
 * river; `course bar` names where she already is and must not (harbors
 * drive: `course bar` at the bar took her into the river).
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import ExpanseNode from '../ExpanseNode';
import { StuffApi } from '../../../api/stuff';
import { makeStuffAtPath } from '../../../lib/security/__tests__/test-setup';

beforeEach(() => StuffApi.clearAll());
afterEach(() => StuffApi.clearAll());

function bar(river: string | null): ExpanseNode {
  const n = makeStuffAtPath(() => new ExpanseNode(), '/test/expanse/greywater/bar');
  n.setName('the bar');
  n.setRiver(river);
  return n;
}

describe('ExpanseNode.namesRiver (river D29, harbors)', () => {
  it('⭐ the river\'s key names it', () => {
    const n = bar('/stuff/idea/Watercourse/kestrel');
    expect(n.namesRiver('kestrel')).toBe(true);
    expect(n.namesRiver('the Kestrel')).toBe(true);
  });

  it('⭐⭐ the bar itself, the mouth, the sea do not — she is there already', () => {
    const n = bar('/stuff/idea/Watercourse/kestrel');
    expect(n.namesRiver('bar')).toBe(false);
    expect(n.namesRiver('the bar')).toBe(false);
    expect(n.namesRiver('estuary bar')).toBe(false);
    expect(n.namesRiver('kestrel bar')).toBe(false);
    expect(n.namesRiver('sea')).toBe(false);
  });

  it('a node with no river names none', () => {
    expect(bar(null).namesRiver('kestrel')).toBe(false);
  });
});
