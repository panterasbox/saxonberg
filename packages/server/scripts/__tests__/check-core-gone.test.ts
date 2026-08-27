/**
 * check-core-gone's pure decision core: a line naming the dead group is a
 * finding unless it carries the migration marker; the two dead validators
 * may not exist; no author tier on the access faces; no pack-installers
 * anywhere; ParcelOwner is exactly its three kinds.
 */

import { describe, it, expect } from 'vitest';
import { classify, PARCEL_OWNER_FILE, DEAD_FILES, AUTHOR_TIER_FILES } from '../check-core-gone';

const f = (path: string, text: string) => ({ path, text });
/** Built, not written: the gate's own test must not trip the gate. */
const CORE = ['c', 'ore'].join('');
const INSTALLERS = ['pack', 'installers'].join('-');
const OWNER = `export type ParcelOwner =\n  | { kind: "group"; name?: string }\n  | { kind: "player"; templatePath: string }\n  | { kind: "organization"; templatePath: string };`;

describe('check-core-gone.classify', () => {
  it('a line naming the group is a finding; the marked migration branch is not', () => {
    const r = classify([
      f('a.ts', `const x = '${CORE}';\nif (name === "${CORE}") { // migration-note: deleted in wave 4\n}`),
      f(PARCEL_OWNER_FILE, OWNER),
    ]);
    expect(r).toEqual([{ path: 'a.ts', line: 1, rule: 'core-literal', text: `const x = '${CORE}';` }]);
  });

  it('name: core in yaml, coreMemberIds, and pack-installers anywhere', () => {
    const r = classify([
      f('p.yaml', `owner: { kind: group, name: ${CORE} }`),
      f('b.ts', `ctx.${CORE}MemberIds`),
      f('q/pack.yaml', `- name: ${INSTALLERS}`),
      f(PARCEL_OWNER_FILE, OWNER),
    ]);
    expect(r.map((x) => x.rule)).toEqual(['core-literal', 'core-literal', 'pack-installers']);
  });

  it('the dead validators may not exist; no isAuthor( on the access faces', () => {
    const r = classify([
      f(DEAD_FILES[0]!, 'export default validator;'),
      f(AUTHOR_TIER_FILES[0]!, 'public static async isAuthor(subject) {}'),
      f(PARCEL_OWNER_FILE, OWNER),
    ]);
    expect(r.map((x) => x.rule).sort()).toEqual(['author-tier', 'dead-file']);
  });

  it('ParcelOwner must be exactly group | player | organization', () => {
    const r = classify([f(PARCEL_OWNER_FILE, OWNER.replace('| { kind: "organization"; templatePath: string }', ''))]);
    expect(r.map((x) => x.rule)).toEqual(['parcel-owner-kinds']);
    expect(classify([f(PARCEL_OWNER_FILE, OWNER)])).toEqual([]);
  });
});
