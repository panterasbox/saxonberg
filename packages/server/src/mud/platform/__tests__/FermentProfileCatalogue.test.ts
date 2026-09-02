/**
 * FermentProfileCatalogue — the self-warming roster (the boot()-
 * retirement shape): postRegister stands up every FermentProfile row
 * and skips foreign classes, the platform pack's boot manifest is what
 * makes it EAGER (asserted on the pack.yaml — the wiring is the part
 * that silently rots), and the query statics on FermentProfile match
 * by tag with the double-match diagnostic.
 */

import "../../../test-bootstrap";
import { describe, it, expect, vi, afterEach } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import FermentProfileCatalogue from '../idea/FermentProfileCatalogue';
import FermentProfileConcrete from '../idea/ferment/FermentProfile';
import FermentProfile from '../../lib/ferment/FermentProfile';
import Material from '../../lib/material/Material';
import { StuffApi } from '../../api/stuff';
import { Template } from '../../lib/stuff/Template';
import {
  makeStuff,
  makeStuffAtPath,
} from '../../lib/security/__tests__/test-setup';

afterEach(() => {
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

describe('the roster warm', () => {
  it('postRegister stands up FermentProfile rows and skips foreign classes', async () => {
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

    const catalogue = makeStuff(() => new FermentProfileCatalogue());
    await catalogue.postRegister();
    expect(stood).toEqual(['/stuff/idea/ferment/red-wine']);
    expect(Template.findByPathInfix).toHaveBeenCalledWith('/idea/ferment/');
  });

  it('the platform pack boots it eagerly (the wiring assert)', () => {
    const src = readFileSync(
      fileURLToPath(
        new URL('../../../../../content/platform/pack.yaml', import.meta.url),
      ),
      'utf-8',
    );
    expect(src).toMatch(/template: \/platform\/idea\/FermentProfileCatalogue/);
  });
});

describe('the query statics (FermentProfile — no Api)', () => {
  it('matches by tag, warns + resolves deterministically on a double match', () => {
    makeStuffAtPath(() => {
      const p = new FermentProfileConcrete();
      p.setKey('b-profile');
      p.setInputCategory('doubled');
      return p;
    }, '/stuff/idea/catalogue-test/idea/ferment/b-profile');
    makeStuffAtPath(() => {
      const p = new FermentProfileConcrete();
      p.setKey('a-profile');
      p.setInputCategory('doubled-too');
      return p;
    }, '/stuff/idea/catalogue-test/idea/ferment/a-profile');
    const material = makeStuffAtPath(() => {
      const m = new Material();
      m.setName('doubled must');
      m.setTags(['doubled', 'doubled-too']);
      return m;
    }, '/stuff/idea/catalogue-test/idea/material/doubled-must');

    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const match = FermentProfile.forMaterial(material);
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
    }, '/stuff/idea/catalogue-test/idea/material/plain-water');
    expect(FermentProfile.forMaterial(material)).toBeNull();
  });
});
