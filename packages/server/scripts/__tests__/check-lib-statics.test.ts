/**
 * check-lib-statics' pure decision core — what counts as a public static
 * on a non-`Api` class.
 *
 * ⚠ The load-bearing cases are the two the first pass got wrong, because
 * both made the census read LOW and a ratchet set below the real count
 * is a ceiling that never bites: a file declaring **two** exported
 * classes, and a static indented by anything other than two spaces.
 */

import { describe, it, expect } from 'vitest';
import {
  exportedClasses,
  publicStaticsOf,
  LIB_STATICS_CEILING,
} from '../check-lib-statics';

describe('exportedClasses', () => {
  it('⭐ finds EVERY exported class, not just the first', () => {
    const src = [
      'export class First {',
      '  static a(): void {}',
      '}',
      '',
      'export class Second {',
      '  static b(): void {}',
      '}',
    ].join('\n');
    expect(exportedClasses(src).map((c) => c.cls)).toEqual(['First', 'Second']);
  });

  it('takes `export default` and `export abstract`', () => {
    const src = [
      'export default class Material {',
      '  static of(): void {}',
      '}',
      'export abstract class Base {',
      '  static keys(): void {}',
      '}',
    ].join('\n');
    expect(exportedClasses(src).map((c) => c.cls)).toEqual(['Material', 'Base']);
  });

  it('brace-matches, so one class body never swallows the next', () => {
    const src = [
      'export class First {',
      '  static a(): void {',
      '    const o = { nested: true };',
      '  }',
      '}',
      'export class Second {',
      '  static b(): void {}',
      '}',
    ].join('\n');
    const [first, second] = exportedClasses(src);
    expect(publicStaticsOf(first!.body)).toEqual(['a']);
    expect(publicStaticsOf(second!.body)).toEqual(['b']);
  });

  it('⚠ does not see a mixin factory’s returned class expression', () => {
    const src = [
      'export function FooMixin<B extends Ctor>(Base: B) {',
      '  return class Foo extends Base {',
      '    static helper(): void {}',
      '  };',
      '}',
    ].join('\n');
    expect(exportedClasses(src)).toEqual([]);
  });

  it('ignores a non-exported class', () => {
    expect(exportedClasses('class Private {\n  static a(): void {}\n}')).toEqual([]);
  });
});

describe('publicStaticsOf', () => {
  const statics = (body: string): string[] => publicStaticsOf(body);

  it('takes a bare static and an explicitly public one', () => {
    expect(statics('  static of(): void {}\n  public static parse(): void {}')).toEqual([
      'of',
      'parse',
    ]);
  });

  it('⭐ is indifferent to indentation', () => {
    expect(statics('static a(): void {}\n      static b(): void {}')).toEqual(['a', 'b']);
  });

  it('takes an async static and a generic one', () => {
    expect(statics('  static async load(): Promise<void> {}\n  static of<T>(): T {}')).toEqual([
      'load',
      'of',
    ]);
  });

  it('refuses private and protected statics — already invisible by intent', () => {
    expect(statics('  private static a(): void {}\n  protected static b(): void {}')).toEqual([]);
  });

  it('refuses static readonly fields, accessors and `_` slots', () => {
    const body = [
      '  static readonly KEYS = [];',
      '  static get all(): string[] { return []; }',
      '  static set all(v: string[]) {}',
      '  static _stamp(): void {}',
    ].join('\n');
    expect(statics(body)).toEqual([]);
  });

  it('refuses the three framework declaration statics', () => {
    const body = [
      '  static fieldMeta(): void {}',
      '  static subscribableFields(): void {}',
      '  static markupAugmenters(): void {}',
      '  static real(): void {}',
    ].join('\n');
    expect(statics(body)).toEqual(['real']);
  });

  it('counts a static once, and does not descend into its body', () => {
    const body = [
      '  static outer(): void {',
      '    const inner = { static: 1 };',
      '    class Local { static nope(): void {} }',
      '  }',
      '  static after(): void {}',
    ].join('\n');
    expect(statics(body)).toEqual(['outer', 'after']);
  });

  it('dedupes an overload signature and its implementation', () => {
    const body = [
      '  static of(a: string): void;',
      '  static of(a: number): void;',
      '  static of(a: unknown): void {}',
    ].join('\n');
    expect(statics(body)).toEqual(['of']);
  });
});

describe('the ratchet', () => {
  it('⭐ holds a ceiling that may fall and may never rise', () => {
    expect(LIB_STATICS_CEILING).toBe(535);
  });
});
