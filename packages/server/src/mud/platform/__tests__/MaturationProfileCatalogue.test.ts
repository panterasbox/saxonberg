/**
 * MaturationProfileCatalogue — the self-warming roster (the boot()-
 * retirement shape): postRegister stands up every MaturationProfile row
 * and skips foreign classes, the platform pack's boot manifest is what
 * makes it EAGER (asserted on the pack.yaml — the wiring is the part
 * that silently rots), and the query statics on MaturationProfile match
 * by tag with the double-match diagnostic.
 */

import "../../../test-bootstrap";
import { describe, it, expect, vi, afterEach } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import MaturationProfileCatalogue from '../idea/MaturationProfileCatalogue';
import MaturationProfileConcrete from '../idea/maturation/MaturationProfile';
import MaturationProfile from '../../lib/maturation/MaturationProfile';
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
  it('postRegister stands up MaturationProfile rows and skips foreign classes', async () => {
    vi.spyOn(Template, 'findByPathInfix').mockResolvedValue([
      {
        path: '/stuff/idea/maturation/red-wine',
        class: '/platform/idea/maturation/MaturationProfile',
      },
      {
        path: '/stuff/idea/maturation/not-a-profile',
        class: '/platform/idea/material/ConsumableMaterial',
      },
    ] as never);
    vi.spyOn(StuffApi, 'loadClassByPath').mockImplementation(
      async (p: string) =>
        p === '/platform/idea/maturation/MaturationProfile'
          ? (MaturationProfileConcrete as never)
          : (Material as never),
    );
    const stood: string[] = [];
    vi.spyOn(StuffApi, 'singleton').mockImplementation(async (p: string) => {
      stood.push(p);
      return {} as never;
    });

    const catalogue = makeStuff(() => new MaturationProfileCatalogue());
    await catalogue.postRegister();
    expect(stood).toEqual(['/stuff/idea/maturation/red-wine']);
    expect(Template.findByPathInfix).toHaveBeenCalledWith('/idea/maturation/');
  });

  it('the platform pack boots it eagerly (the wiring assert)', () => {
    const src = readFileSync(
      fileURLToPath(
        new URL('../../../../../content/platform/pack.yaml', import.meta.url),
      ),
      'utf-8',
    );
    expect(src).toMatch(/template: \/platform\/idea\/MaturationProfileCatalogue/);
  });
});

describe('the query statics (MaturationProfile — no Api)', () => {
  it('matches by tag, warns + resolves deterministically on a double match', () => {
    makeStuffAtPath(() => {
      const p = new MaturationProfileConcrete();
      p.setKey('b-profile');
      p.setInputCategory('doubled');
      return p;
    }, '/stuff/idea/catalogue-test/idea/maturation/b-profile');
    makeStuffAtPath(() => {
      const p = new MaturationProfileConcrete();
      p.setKey('a-profile');
      p.setInputCategory('doubled-too');
      return p;
    }, '/stuff/idea/catalogue-test/idea/maturation/a-profile');
    const material = makeStuffAtPath(() => {
      const m = new Material();
      m.setName('doubled must');
      m.setTags(['doubled', 'doubled-too']);
      return m;
    }, '/stuff/idea/catalogue-test/idea/material/doubled-must');

    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const match = MaturationProfile.forMaterial(material);
    expect(match).toBeInstanceOf(MaturationProfile);
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
    expect(MaturationProfile.forMaterial(material)).toBeNull();
  });
});
