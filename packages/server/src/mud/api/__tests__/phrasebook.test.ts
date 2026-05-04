/**
 * Tests for PhrasebookApi.format — substitution rules, escape
 * behavior, edge cases.
 */

import { describe, it, expect } from 'vitest';
import { PhrasebookApi } from '../phrasebook';
import { Mml } from '../mml';

describe('PhrasebookApi.format', () => {
  it('substitutes a single named placeholder', () => {
    const out = PhrasebookApi.format('Hello {name}!', { name: 'world' });
    expect(out.toString()).toBe('Hello world!');
  });

  it('substitutes multiple placeholders', () => {
    const out = PhrasebookApi.format('{a} and {b}', { a: 'one', b: 'two' });
    expect(out.toString()).toBe('one and two');
  });

  it('escapes raw string substitutions (same as Mml.compose)', () => {
    const out = PhrasebookApi.format('say {what}', { what: '<bad>' });
    expect(out.toString()).toBe('say &lt;bad&gt;');
  });

  it('emits Mml fragment substitutions verbatim', () => {
    const out = PhrasebookApi.format('hi {who}', {
      who: Mml.fromMarkup('<name>Alice</name>'),
    });
    expect(out.toString()).toBe('hi <name>Alice</name>');
  });

  it('coerces numbers and booleans then escapes', () => {
    const out = PhrasebookApi.format('n={n} b={b}', { n: 42, b: true });
    expect(out.toString()).toBe('n=42 b=true');
  });

  it('treats unrecognised names as empty (consistent with Mml.compose null/undefined)', () => {
    const out = PhrasebookApi.format('a={x} b={missing}', { x: 'X' });
    expect(out.toString()).toBe('a=X b=');
  });

  it('treats null and undefined values as empty', () => {
    const out = PhrasebookApi.format('a{a}b{b}c', { a: null, b: undefined });
    expect(out.toString()).toBe('abc');
  });

  it('emits literal text verbatim (template content is authored markup)', () => {
    const out = PhrasebookApi.format(
      '<wrap>before {x} after</wrap>',
      { x: 'X' }
    );
    expect(out.toString()).toBe('<wrap>before X after</wrap>');
  });

  it('tolerates an unclosed placeholder by emitting it as literal text', () => {
    const out = PhrasebookApi.format('hello {broken', {});
    expect(out.toString()).toBe('hello {broken');
  });

  it('handles a placeholder at the very start', () => {
    const out = PhrasebookApi.format('{greeting}, friend.', {
      greeting: 'Hi',
    });
    expect(out.toString()).toBe('Hi, friend.');
  });

  it('handles a placeholder at the very end', () => {
    const out = PhrasebookApi.format('See you, {name}', { name: 'Bob' });
    expect(out.toString()).toBe('See you, Bob');
  });

  it('handles two adjacent placeholders', () => {
    const out = PhrasebookApi.format('{a}{b}', { a: 'x', b: 'y' });
    expect(out.toString()).toBe('xy');
  });

  it('returns an Mml that round-trips through JSON.stringify', () => {
    const out = PhrasebookApi.format('hi {what}', { what: '<x>' });
    expect(JSON.stringify({ body: out })).toBe('{"body":"hi &lt;x&gt;"}');
  });

  it('calls toMml() on objects when present', () => {
    const obj = { toMml: () => Mml.fromMarkup('<custom>X</custom>') };
    const out = PhrasebookApi.format('got {it}', { it: obj });
    expect(out.toString()).toBe('got <custom>X</custom>');
  });

  it('passes through empty templates', () => {
    expect(PhrasebookApi.format('', {}).toString()).toBe('');
  });

  it('passes through templates with no placeholders', () => {
    expect(PhrasebookApi.format('plain text', {}).toString()).toBe('plain text');
  });
});
