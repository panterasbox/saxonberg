/**
 * Character tests.
 *
 * ⭐⭐ **A proper name is composed, not inherited.** `NamedMixin` used to
 * sit on the creature base, so every body in the game — a wolf, a
 * corpse, a head of stock — carried name-shaped surface an author could
 * fill in by accident. It composes explicitly now, on the `Cast` rung
 * (somebody), on `Avatar` (a player, whose name enroll writes), and on
 * any class that mints a name of its own.
 *
 * So the fixture below composes it too, which is exactly what an author
 * does — and the composition block asserts the rule both ways.
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach } from 'vitest';
import { Character } from '../Character';
import { NamedMixin } from '../../description/Named';
import { MixinApi } from '../../../api/mixin';
import { makeStuff } from '../../security/__tests__/test-setup';

// A bare Character — a role somebody fills, with no name of its own.
class PlainCharacter extends Character {}

// A character that IS somebody, the way a Cast class is: it says so.
class TestCharacter extends NamedMixin(Character) {}

describe('Character', () => {
  let character: TestCharacter;

  beforeEach(() => {
    character = makeStuff(() => new TestCharacter());
  });

  describe('mixin composition', () => {
    it('⭐ a bare Character is NOT Named — a body is not a somebody', () => {
      const plain = makeStuff(() => new PlainCharacter());
      expect(MixinApi.isNamed(plain)).toBe(false);
      expect(
        (plain as unknown as { setSurname?: unknown }).setSurname,
      ).toBeUndefined();
    });

    it('a class that composes NamedMixin has the name surface', () => {
      expect(MixinApi.isNamed(character)).toBe(true);
      expect(typeof character.getName).toBe('function');
      expect(typeof character.getSurname).toBe('function');
      expect(typeof character.getFullName).toBe('function');
    });

    it('⭐ every body is Perceptible — addressable by keyword', () => {
      // The other half of the same move: `look wolf` has to resolve, and
      // 48 shipped agent rows author a `primaryKeyword` that went
      // nowhere until Perceptible joined the creature base.
      const plain = makeStuff(() => new PlainCharacter());
      expect(MixinApi.isPerceptible(plain)).toBe(true);
    });

    it('should have Gendered mixin methods', () => {
      expect(typeof character.getPronouns).toBe('function');
    });

    it('should have Sensor mixin methods (stub)', () => {
      expect(typeof character.onMessage).toBe('function');
    });

    it('should have Vocal mixin methods (stub)', () => {
      expect(typeof character.say).toBe('function');
    });
  });

  describe('Named mixin integration', () => {
    it('should compute fullName from name and surname', () => {
      character.setName('John');
      character.setSurname('Doe');
      expect(character.getFullName()).toBe('John Doe');
    });

    it('returns empty string when no names set (no fallback)', () => {
      expect(character.getFullName()).toBe('');
    });

    it('synthesizes honorific + name + surname + nameSuffix with a comma before the suffix', () => {
      character.setHonorific('Dr.');
      character.setName('John');
      character.setSurname('Doe');
      character.setNameSuffix('PhD');
      expect(character.getFullName()).toBe('Dr. John Doe, PhD');
    });

    it('renders generational suffixes with the older-style comma', () => {
      character.setName('John');
      character.setSurname('Smith');
      character.setNameSuffix('Jr.');
      expect(character.getFullName()).toBe('John Smith, Jr.');
    });

    it('omits the comma when there is no preceding head', () => {
      character.setNameSuffix('Esq.');
      expect(character.getFullName()).toBe('Esq.');
    });
  });

  describe('type checking', () => {
    it('should be instance of Character', () => {
      expect(character instanceof Character).toBe(true);
    });

    it('should be instance of TestCharacter', () => {
      expect(character instanceof TestCharacter).toBe(true);
    });
  });
});
