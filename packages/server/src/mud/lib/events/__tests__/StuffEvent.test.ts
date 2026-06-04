/**
 * StuffEvent abstract-class composition test. Sanity-checks that a
 * concrete subclass carries the declared KIND and payload.
 */

import { describe, it, expect } from 'vitest';
import { StuffEvent } from '../StuffEvent';

class TestEvent extends StuffEvent<{ greeting: string }> {
  static readonly KIND = 'test.event';
  readonly kind = TestEvent.KIND;
  constructor(public readonly payload: { greeting: string }) {
    super();
  }
}

describe('StuffEvent', () => {
  it('subclass carries KIND and payload', () => {
    const event = new TestEvent({ greeting: 'hello' });
    expect(event.kind).toBe('test.event');
    expect(event.payload).toEqual({ greeting: 'hello' });
    expect(TestEvent.KIND).toBe('test.event');
  });

  it('is a StuffEvent instance', () => {
    const event = new TestEvent({ greeting: 'hi' });
    expect(event).toBeInstanceOf(StuffEvent);
    expect(event).toBeInstanceOf(TestEvent);
  });
});
