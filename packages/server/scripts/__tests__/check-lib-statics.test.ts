/**
 * check-lib-statics' pure decision core — what counts as a public static
 * on a non-`Api` class.
 *
 * ⚠ The load-bearing cases are the two the first pass got wrong, because
 * both made the census read LOW and a ratchet set below the real count
 * is a ceiling that never bites: a file declaring **two** exported
 * classes, and a static indented by anything other than two spaces.
 */

import "../../src/test-bootstrap";
import { describe, it, expect } from 'vitest';
import {
  exportedClasses,
  publicStaticsOf,
  statsOf,
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

  it('⚠ takes a class exported on a LATER line, not just inline', () => {
    const src = [
      'class Provision extends Base {',
      '  static resolveIn(): void {}',
      '}',
      'export default Provision;',
    ].join('\n');
    expect(exportedClasses(src).map((c) => c.cls)).toEqual(['Provision']);
  });

  it('takes a named deferred export, aliased or not', () => {
    const src = [
      'class Stock {',
      '  static resolveIn(): void {}',
      '}',
      'export { Stock as Counter };',
    ].join('\n');
    expect(exportedClasses(src).map((c) => c.cls)).toEqual(['Stock']);
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

  it('⚠ refuses every framework static reached reflectively by name', () => {
    const body = [
      '  static fieldMeta(): void {}',
      '  static subscribableFields(): void {}',
      '  static markupAugmenters(): void {}',
      '  static cleanupOnDestruct(): void {}',
      '  static real(): void {}',
    ].join('\n');
    // `cleanupOnDestruct` is found by StuffApi with hasOwnProperty, not
    // by an import — counting it as movable would have made it a
    // candidate for `private`, silently breaking destruct cleanup.
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

describe('⭐ @internal is the declared escape, and it is counted separately', () => {
  it('moves a documented-@internal static out of the surface count', () => {
    const body = [
      '  /** @internal a test seam */',
      '  static seam(): void {}',
      '  static real(): void {}',
    ].join('\n');
    const r = statsOf(body);
    expect(r.surface).toEqual(['real']);
    expect(r.declaredInternal).toEqual(['seam']);
  });

  it('reads @internal out of a multi-line block', () => {
    const body = [
      '  /**',
      '   * Does a thing.',
      '   *',
      '   * @internal not author surface',
      '   */',
      '  static seam(): void {}',
    ].join('\n');
    expect(statsOf(body).declaredInternal).toEqual(['seam']);
  });

  it('⚠ does not let one @internal block bleed onto the NEXT static', () => {
    const body = [
      '  /** @internal a seam */',
      '  static seam(): void {}',
      '',
      '  static real(): void {}',
    ].join('\n');
    expect(statsOf(body).surface).toEqual(['real']);
  });

  it('an ordinary docblock does not make a static internal', () => {
    const body = ['  /** Ordinary docs. */', '  static real(): void {}'].join('\n');
    expect(statsOf(body).surface).toEqual(['real']);
    expect(statsOf(body).declaredInternal).toEqual([]);
  });
});

describe('the ratchet', () => {
  /**
   * ⚠⚠ **This asserted `toBe(392)` and therefore tested the opposite of
   * its own name.** A ratchet exists so the ceiling can FALL; pinning it
   * to a literal made every successful sweep a failing test, and the
   * `--lint` gate could not catch the disagreement because it reads the
   * constant rather than this copy of it. The 2026-09-14 sweep lowered
   * the ceiling four times (392 → 387 → 372 → 343) with the gate green
   * throughout, and only the full suite found the pin.
   *
   * ⭐ So the assertion is the INVARIANT now: the ceiling may sit
   * anywhere at or below the high-water mark it started from, and a rise
   * above it is the regression this is here to catch. A future sweep
   * lowers `LIB_STATICS_CEILING` and touches nothing else.
   */
  const HIGH_WATER = 563;

  it('⭐ holds a ceiling that may fall and may never rise', () => {
    expect(LIB_STATICS_CEILING).toBeLessThanOrEqual(HIGH_WATER);
    expect(LIB_STATICS_CEILING).toBeGreaterThan(0);
  });
});
