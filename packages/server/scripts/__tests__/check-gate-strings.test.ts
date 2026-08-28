/**
 * check-gate-strings over a capability pack (content-packs, the
 * capability rung): a `/<packRoot>/…` gate resolves into that pack's
 * `src/`; a missing module there is a finding naming the pack; and a
 * RELATIVE gate inside a pack file is unresolvable by rule (the loader
 * transform leaves it alone — pack code writes absolute gates).
 */

import { describe, it, expect } from 'vitest';
import { gateFileOf } from '../check-gate-strings';
import type { PackSource } from '../pack-roots';

const ARCANA: PackSource = {
  id: 'arcana',
  packDir: '/proj/packages/content/arcana',
  srcDir: '/proj/packages/content/arcana/src',
  roots: ['/arcana'],
};
const MUD = '/proj/packages/server/src/mud';

describe('check-gate-strings.gateFileOf', () => {
  it('a pack-root gate resolves into the pack src/', () => {
    const r = gateFileOf('/arcana/idea/cmd/magic/CastController', `${MUD}/lib/magic/Caster.ts`, [ARCANA], MUD);
    expect(r).toEqual({ base: '/proj/packages/content/arcana/src/idea/cmd/magic/CastController' });
  });

  it('a kernel gate still resolves under src/mud', () => {
    const r = gateFileOf('/api/magic', `${ARCANA.srcDir}/thing/Wand.ts`, [ARCANA], MUD);
    expect(r).toEqual({ base: `${MUD}/api/magic` });
  });

  it('a relative gate in a pack file is refused by rule', () => {
    const r = gateFileOf('./Sibling', `${ARCANA.srcDir}/idea/cmd/magic/CastController.ts`, [ARCANA], MUD);
    expect('error' in r && r.error).toMatch(/pack code writes absolute gates/);
  });

  it('a relative gate in a kernel file resolves against the declaring dir', () => {
    const r = gateFileOf('./Sibling', `${MUD}/platform/idea/cmd/governance/OfficeController.ts`, [ARCANA], MUD);
    expect(r).toEqual({ base: `${MUD}/platform/idea/cmd/governance/Sibling` });
  });
});
