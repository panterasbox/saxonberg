/**
 * FermentLogic — the boot roster warm (fermentation W1's named risk).
 * The reference-Ideas-inert-at-boot recurrence is 3× in this repo; the
 * warm here is an acceptance test, not a hope: boot() stands up every
 * row whose class extends FermentProfile and skips the rest, and the
 * AppBootstrap sequencer actually CALLS it (asserted on the source —
 * the wiring is the part that silently rots).
 */

import "../../../../../test-bootstrap";
import { describe, it, expect, vi, afterEach } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { FermentApi } from '../../../../api/ferment';
import { StuffApi } from '../../../../api/stuff';
import { Template } from '../../../../lib/stuff/Template';
import FermentProfileConcrete from '../../ferment/FermentProfile';
import Material from '../../../../lib/material/Material';
import FermentProfile from '../../../../lib/ferment/FermentProfile';
import {
  makeStuffAtPath,
} from '../../../../lib/security/__tests__/test-setup';

afterEach(() => {
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

describe('FermentApi.boot — the roster warm', () => {
  it('stands up FermentProfile rows and skips foreign classes', async () => {
    vi.spyOn(Template, 'findByPathInfix').mockResolvedValue([
      {
        path: '/stuff/idea/ferment/red-wine',
        class: '/platform/idea/ferment/FermentProfile',
      },
      {
        path: '/stuff/idea/ferment/not-a-profile',
        class: '/platform/idea/material/ConsumableMaterial',
      },
    ] as never);
    vi.spyOn(StuffApi, 'loadClassByPath').mockImplementation(
      async (p: string) =>
        p === '/platform/idea/ferment/FermentProfile'
          ? (FermentProfileConcrete as never)
          : (Material as never),
    );
    const stood: string[] = [];
    vi.spyOn(StuffApi, 'singleton').mockImplementation(async (p: string) => {
      stood.push(p);
      return {} as never;
    });

    const count = await FermentApi.boot();
    expect(count).toBe(1);
    expect(stood).toEqual(['/stuff/idea/ferment/red-wine']);
    expect(Template.findByPathInfix).toHaveBeenCalledWith('/idea/ferment/');
  });

  it('the AppBootstrap sequencer calls the warm (the wiring assert)', () => {
    const src = readFileSync(
      fileURLToPath(new URL('../../../../../backend/AppBootstrap.ts', import.meta.url)),
      'utf-8',
    );
    expect(src).toMatch(/await FermentApi\.boot\(\);/);
  });
});

describe('FermentApi.profileFor — the match', () => {
  it('matches by tag, warns + resolves deterministically on a double match', () => {
    makeStuffAtPath(() => {
      const p = new FermentProfileConcrete();
      p.setKey('b-profile');
      p.setInputCategory('doubled');
      return p;
    }, '/stuff/idea/ferment-logic-test/idea/ferment/b-profile');
    makeStuffAtPath(() => {
      const p = new FermentProfileConcrete();
      p.setKey('a-profile');
      p.setInputCategory('doubled-too');
      return p;
    }, '/stuff/idea/ferment-logic-test/idea/ferment/a-profile');
    const material = makeStuffAtPath(() => {
      const m = new Material();
      m.setName('doubled must');
      m.setTags(['doubled', 'doubled-too']);
      return m;
    }, '/stuff/idea/ferment-logic-test/idea/material/doubled-must');

    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const match = FermentApi.profileFor(material);
    expect(match).toBeInstanceOf(FermentProfile);
    expect(match!.getKey()).toBe('a-profile'); // lowest key, never a roll
    expect(warn).toHaveBeenCalledOnce();
    expect(String(warn.mock.calls[0])).toContain('authoring error');
  });

  it('returns null when nothing matches', () => {
    const material = makeStuffAtPath(() => {
      const m = new Material();
      m.setName('plain water');
      m.setTags(['liquid', 'water']);
      return m;
    }, '/stuff/idea/ferment-logic-test/idea/material/plain-water');
    expect(FermentApi.profileFor(material)).toBeNull();
  });
});
