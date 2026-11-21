/**
 * ⭐ A slot whose holder is not a vessel passes a non-`Bulkable` host to
 * `BulkSlot`'s constructor (the `SourceSlot` shape). That cast is honest
 * only while every base member that would ask the host is overridden —
 * this fails the day `BulkSlot` gains one that `GivenUpSlot` or
 * `SourceSlot` does not override.
 */
import '../../../../test-bootstrap';
import { describe, it, expect } from 'vitest';
import { BulkSlot } from '../Bulkable';
import { GivenUpSlot } from '../GivenUpSlot';
import { SourceSlot } from '../SourceSlot';

/** The base's own members that are the base's by design (`getHolder` IS the holder). */
const BASE_ONLY = new Set(['constructor', 'getHolder']);

/**
 * The base members that ask the host — read off their source (`this.host`).
 * A derived member (`getMassKg`, `getHardnessDgh`) reads through the
 * others and is honest on any subclass that overrides those.
 */
const baseMembers = (): string[] =>
  Object.getOwnPropertyNames(BulkSlot.prototype).filter((n) => {
    if (BASE_ONLY.has(n)) return false;
    const member = Object.getOwnPropertyDescriptor(BulkSlot.prototype, n)?.value as unknown;
    return typeof member === 'function' && member.toString().includes('this.host');
  });

it('the census sees the host-reading members (it is not vacuous)', () => {
  expect(baseMembers()).toEqual(expect.arrayContaining(['getAmount', 'debit', 'getPayload', 'setAmount']));
});

describe('a slot with no Bulkable holder overrides every host-reading member', () => {
  it.each([
    ['GivenUpSlot', GivenUpSlot.prototype],
    ['SourceSlot', SourceSlot.prototype],
  ])('%s', (_name, proto) => {
    const missing = baseMembers().filter((n) => !Object.prototype.hasOwnProperty.call(proto, n));
    expect(missing).toEqual([]);
  });
});
