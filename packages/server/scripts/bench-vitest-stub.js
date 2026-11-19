/**
 * What `bench-gate-hooks.js` resolves `vitest` to. Any use throws: the
 * bench must never run a fixture body that needed the real thing.
 */
const refuse = () => {
  throw new Error('bench-gate: a vitest fixture ran outside vitest');
};
export const vi = new Proxy({}, { get: () => refuse });
export const expect = refuse;
export const describe = refuse;
export const it = refuse;
export const test = refuse;
export const beforeAll = refuse;
export const afterAll = refuse;
export const beforeEach = refuse;
export const afterEach = refuse;
