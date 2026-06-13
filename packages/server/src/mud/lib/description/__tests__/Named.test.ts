/**
 * NamedMixin tests — names, full-name composition, alternate names.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { NamedMixin, type AlternateName } from '../Named';
import { Idea } from '../../stuff/Idea';
import { MixinApi } from '../../../api/mixin';
import { makeStuff } from '../../security/__tests__/test-setup';

class NamedThing extends NamedMixin(Idea) {
  static persistentFields: string[] = [];
}

describe('NamedMixin', () => {
  let obj: NamedThing;

  beforeEach(() => {
    obj = makeStuff(() => new NamedThing());
  });

  describe('Marker and predicate', () => {
    it('declares the NamedMixin marker', () => {
      expect(MixinApi.hasMixin(NamedThing, 'NamedMixin')).toBe(true);
    });

    it('narrows via MixinApi.isNamed', () => {
      expect(MixinApi.isNamed(obj)).toBe(true);
    });

    it('declares the right persistent fields', () => {
      const fields = MixinApi.getAllPersistentFields(NamedThing);
      expect(fields).toContain('name');
      expect(fields).toContain('honorific');
      expect(fields).toContain('surname');
      expect(fields).toContain('nameSuffix');
      expect(fields).toContain('alternateNames');
    });
  });

  describe('Defaults', () => {
    it('starts with empty name and undefined optional parts', () => {
      expect(obj.getName()).toBe('');
      expect(obj.getHonorific()).toBeUndefined();
      expect(obj.getSurname()).toBeUndefined();
      expect(obj.getNameSuffix()).toBeUndefined();
      expect(obj.getAlternateNames()).toEqual([]);
    });

    it('getFullName() with no parts returns the empty string', () => {
      expect(obj.getFullName()).toBe('');
    });
  });

  describe('Accessor pairs', () => {
    it('round-trips name', () => {
      obj.setName('Alice');
      expect(obj.getName()).toBe('Alice');
    });

    it('round-trips honorific', () => {
      obj.setHonorific('Dr.');
      expect(obj.getHonorific()).toBe('Dr.');
      obj.setHonorific(undefined);
      expect(obj.getHonorific()).toBeUndefined();
    });

    it('round-trips surname', () => {
      obj.setSurname('Smith');
      expect(obj.getSurname()).toBe('Smith');
    });

    it('round-trips nameSuffix', () => {
      obj.setNameSuffix('Jr.');
      expect(obj.getNameSuffix()).toBe('Jr.');
    });
  });

  describe('getFullName composition', () => {
    it('joins honorific + name + surname with spaces', () => {
      obj.setHonorific('Dr.');
      obj.setName('Alice');
      obj.setSurname('Smith');
      expect(obj.getFullName()).toBe('Dr. Alice Smith');
    });

    it('skips missing fields without leaving stray spaces', () => {
      obj.setName('Alice');
      obj.setSurname('Smith');
      expect(obj.getFullName()).toBe('Alice Smith');
    });

    it('appends nameSuffix preceded by a comma', () => {
      obj.setName('John');
      obj.setSurname('Smith');
      obj.setNameSuffix('Jr.');
      expect(obj.getFullName()).toBe('John Smith, Jr.');
    });

    it('handles credentials-style suffix (e.g. "MD")', () => {
      obj.setName('Jane');
      obj.setSurname('Doe');
      obj.setNameSuffix('MD');
      expect(obj.getFullName()).toBe('Jane Doe, MD');
    });

    it('handles suffix-only (no head)', () => {
      obj.setNameSuffix('III');
      expect(obj.getFullName()).toBe('III');
    });

    it('handles a name with no surname or honorific', () => {
      obj.setName('Aragorn');
      expect(obj.getFullName()).toBe('Aragorn');
    });

    it('handles honorific-only', () => {
      obj.setHonorific('Captain');
      expect(obj.getFullName()).toBe('Captain');
    });
  });

  describe('Alternate names', () => {
    const nick: AlternateName = { kind: 'nickname', value: 'Al' };
    const title: AlternateName = { kind: 'title', value: 'Mayor' };
    const cred: AlternateName = { kind: 'credential', value: 'PhD' };

    it('adds an alternate name', () => {
      obj.addAlternateName(nick);
      expect(obj.getAlternateNames()).toEqual([nick]);
      expect(obj.hasAlternateName('Al')).toBe(true);
    });

    it('returns a defensive copy from getAlternateNames', () => {
      obj.addAlternateName(nick);
      const list = obj.getAlternateNames();
      list.push({ kind: 'alias', value: 'Mutation' });
      // Mutating the returned array must not affect the host.
      expect(obj.getAlternateNames()).toEqual([nick]);
    });

    it('filters by kind', () => {
      obj.addAlternateName(nick);
      obj.addAlternateName(title);
      obj.addAlternateName(cred);
      expect(obj.getAlternateNames('nickname')).toEqual([nick]);
      expect(obj.getAlternateNames('title')).toEqual([title]);
      expect(obj.getAlternateNames('credential')).toEqual([cred]);
      expect(obj.getAlternateNames('alias')).toEqual([]);
    });

    it('replaces the alternate list via setAlternateNames', () => {
      obj.addAlternateName(nick);
      obj.setAlternateNames([title, cred]);
      expect(obj.getAlternateNames()).toEqual([title, cred]);
    });

    it('setAlternateNames stores a fresh copy (caller can mutate input safely)', () => {
      const input: AlternateName[] = [nick, title];
      obj.setAlternateNames(input);
      input.length = 0;
      expect(obj.getAlternateNames()).toEqual([nick, title]);
    });

    it('removeAlternateName returns true and removes the first match', () => {
      obj.addAlternateName(nick);
      obj.addAlternateName(title);
      expect(obj.removeAlternateName('Al')).toBe(true);
      expect(obj.hasAlternateName('Al')).toBe(false);
      expect(obj.getAlternateNames()).toEqual([title]);
    });

    it('removeAlternateName returns false for an unknown value', () => {
      obj.addAlternateName(nick);
      expect(obj.removeAlternateName('Bob')).toBe(false);
      expect(obj.getAlternateNames()).toEqual([nick]);
    });

    it('removeAlternateName removes only the first match (duplicates persist)', () => {
      obj.addAlternateName(nick);
      obj.addAlternateName({ kind: 'alias', value: 'Al' });
      expect(obj.removeAlternateName('Al')).toBe(true);
      expect(obj.getAlternateNames()).toEqual([{ kind: 'alias', value: 'Al' }]);
    });

    it('hasAlternateName matches across kinds', () => {
      obj.addAlternateName(nick);
      obj.addAlternateName(cred);
      expect(obj.hasAlternateName('Al')).toBe(true);
      expect(obj.hasAlternateName('PhD')).toBe(true);
      expect(obj.hasAlternateName('Mayor')).toBe(false);
    });
  });

  describe('getPresentation() integration', () => {
    it('returns name when set', () => {
      obj.setName('Alice');
      expect(obj.getPresentation()).toBe('Alice');
    });

    it('falls back to the baked-in default when name is empty', () => {
      expect(obj.getPresentation()).toBe('something');
    });
  });
});
