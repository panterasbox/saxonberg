/**
 * check-gate-strings over a capability pack (content-packs, the
 * capability rung): a `/<packRoot>/…` gate resolves into that pack's
 * `src/`; a missing module there is a finding naming the pack; and a
 * RELATIVE gate inside a pack file is unresolvable by rule (the loader
 * transform leaves it alone — pack code writes absolute gates).
 */

import { describe, it, expect } from 'vitest';
import { gateFileOf, templateFileOf } from '../check-gate-strings';
import type { PackSource } from '../pack-roots';

const ARCANA: PackSource = {
  id: 'arcana',
  packDir: '/proj/packages/content/arcana',
  srcDir: '/proj/packages/content/arcana/src',
  roots: ['/system/arcana'],
};
const MUD = '/proj/packages/server/src/mud';

describe('check-gate-strings.gateFileOf', () => {
  it('a pack-root gate resolves into the pack src/', () => {
    const r = gateFileOf('/system/arcana/idea/cmd/magic/CastController', `${MUD}/lib/magic/Caster.ts`, [ARCANA], MUD);
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

/**
 * ⭐ `FromTemplateMethod` resolves a TEMPLATE path, which is a different
 * namespace from a module id — and the one place they deliberately
 * diverge is the Api logic singleton, registered at
 * `/platform/idea/api/<feature>` while its class is named for the logic
 * (CLAUDE.md § Backing-class path mirrors template path).
 */
describe('check-gate-strings.templateFileOf', () => {
  it('maps an Api logic singleton to its <Feature>Logic class', () => {
    expect(templateFileOf('/platform/idea/api/employment', [ARCANA], MUD)).toBe(
      `${MUD}/platform/idea/api/EmploymentLogic.ts`,
    );
  });

  it('handles a hyphenated feature name', () => {
    expect(templateFileOf('/platform/idea/api/hot-reload', [ARCANA], MUD)).toBe(
      `${MUD}/platform/idea/api/HotReloadLogic.ts`,
    );
  });

  it('mirrors the template path for everything else', () => {
    expect(
      templateFileOf('/platform/idea/cmd/civics/TitleController', [ARCANA], MUD),
    ).toBe(`${MUD}/platform/idea/cmd/civics/TitleController.ts`);
  });

  it('resolves a pack template into the pack src/', () => {
    expect(templateFileOf('/system/arcana/idea/Grimoire', [ARCANA], MUD)).toBe(
      `${ARCANA.srcDir}/idea/Grimoire.ts`,
    );
  });
});
