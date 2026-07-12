import { describe, it, expect, afterEach, vi } from 'vitest';
import { ConsoleTap } from '../ConsoleTap';

const tap = ConsoleTap.get();

afterEach(() => {
  tap.uninstall();
  tap.clear();
  vi.restoreAllMocks();
});

describe('ConsoleTap', () => {
  it('captures console lines into the ring and passes through', () => {
    const original = console.log;
    const spy = vi.fn();
    console.log = spy;
    try {
      tap.install();
      console.log('hello', 'world');
      expect(spy).toHaveBeenCalledWith('hello', 'world'); // passthrough
    } finally {
      // install() wrapped `spy`; uninstall restores it, then we restore original.
      tap.uninstall();
      console.log = original;
    }
    const rows = tap.tail();
    expect(rows).toHaveLength(1);
    expect(rows[0]?.text).toBe('hello world');
    expect(rows[0]?.level).toBe('log');
  });

  it('is idempotent on install/uninstall (no double-wrap)', () => {
    const original = console.warn;
    tap.install();
    const wrapped = console.warn;
    tap.install(); // second install is a no-op
    expect(console.warn).toBe(wrapped);
    tap.uninstall();
    expect(console.warn).toBe(original);
    tap.uninstall(); // idempotent
    expect(console.warn).toBe(original);
  });

  it('tail respects grep and newest-first order + limit', () => {
    tap.install();
    console.log('alpha');
    console.error('beta error');
    console.warn('gamma');
    tap.uninstall();

    const all = tap.tail();
    expect(all.map((r) => r.text)).toEqual(['gamma', 'beta error', 'alpha']);

    const grepped = tap.tail({ grep: 'ERROR' });
    expect(grepped).toHaveLength(1);
    expect(grepped[0]?.text).toBe('beta error');

    const limited = tap.tail({ limit: 2 });
    expect(limited).toHaveLength(2);
    expect(limited[0]?.text).toBe('gamma');
  });

  it('bounds the ring to its capacity', () => {
    tap.setCapacity(3);
    tap.install();
    for (let i = 0; i < 10; i++) console.log(`line ${i}`);
    tap.uninstall();
    const rows = tap.tail();
    expect(rows).toHaveLength(3);
    expect(rows[0]?.text).toBe('line 9'); // newest first
    expect(rows[2]?.text).toBe('line 7');
    tap.setCapacity(1000); // restore for other tests
  });

  it('stringifies non-string args and Errors', () => {
    tap.install();
    console.log('n=', 42, { a: 1 });
    console.error(new Error('boom'));
    tap.uninstall();
    const rows = tap.tail();
    expect(rows[1]?.text).toBe('n= 42 {"a":1}');
    expect(rows[0]?.text).toContain('boom');
  });
});
