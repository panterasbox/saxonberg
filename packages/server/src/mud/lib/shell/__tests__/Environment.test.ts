/**
 * EnvironmentMixin tests — lookup chain, schema walk, validation,
 * privacy, ad-hoc vars, and the cross-host `resolveSetting` helper.
 *
 * Sections cover the lookup chain, unknown-key behavior, type and
 * custom-validator gating, the privacy mechanism, the schema-walk
 * across composed mixins, and the cross-host `resolveSetting`
 * helper. See `docs/subsystems/shell-environment.md` for the design.
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach } from 'vitest';
import { Idea } from '../../stuff/Idea';
import {
  EnvironmentMixin,
  type SettingsSchemaEntry,
} from '../Environment';
import { ShellApi } from '../../../api/shell';
import type { MixinConstructor } from '../../mixin';
import { makeStuff } from '../../security/__tests__/test-setup';

/* ───────── Test mixins ─────────
 *
 * `FeatureMixin` declares a small set of settings — persistent +
 * session, public + private — covering the surface the tests
 * exercise. `OtherFeatureMixin` declares a disjoint key for the
 * cross-mixin schema-union test, plus a separate "duplicate"
 * scenario gets its own pair.
 */

function FeatureMixin<TBase extends MixinConstructor>(Base: TBase) {
  class FeatureMixin extends Base {
    static _mixinName = 'FeatureMixin';
    static settings: SettingsSchemaEntry[] = [
      {
        key: 'feature.greeting',
        type: 'string',
        default: 'hello',
        description: 'persistent string with no privacy',
      },
      {
        key: 'feature.count',
        type: 'number',
        default: 0,
        description: 'persistent number with a custom validator',
        validator: (v) =>
          typeof v === 'number' && v >= 0 ? true : 'must be non-negative',
      },
      {
        key: 'feature.color',
        type: 'enum',
        enumValues: ['red', 'green', 'blue'],
        default: 'red',
        description: 'enum',
      },
      {
        key: 'feature.private',
        type: 'string',
        default: 'shh',
        description: 'private write, public read',
        private: true,
      },
      {
        key: 'feature.session',
        type: 'string',
        default: 'eph',
        description: 'session-lifetime setting',
        lifetime: 'session',
      },
    ];
  }
  return FeatureMixin;
}

function OtherFeatureMixin<TBase extends MixinConstructor>(Base: TBase) {
  class OtherFeatureMixin extends Base {
    static _mixinName = 'OtherFeatureMixin';
    static settings: SettingsSchemaEntry[] = [
      {
        key: 'other.flag',
        type: 'boolean',
        default: false,
        description: 'declared on a different mixin',
      },
    ];
  }
  return OtherFeatureMixin;
}

function DuplicateFeatureMixin<TBase extends MixinConstructor>(Base: TBase) {
  class DuplicateFeatureMixin extends Base {
    static _mixinName = 'DuplicateFeatureMixin';
    static settings: SettingsSchemaEntry[] = [
      {
        key: 'feature.greeting',
        type: 'string',
        default: 'shadow',
        description: 'collides with FeatureMixin.feature.greeting',
      },
    ];
  }
  return DuplicateFeatureMixin;
}

/* Composed test classes — Stuff + EnvironmentMixin + feature mixins. */

class TestHost extends FeatureMixin(OtherFeatureMixin(EnvironmentMixin(Idea))) {
  constructor() {
    super();
  }
}

class DuplicateHost extends FeatureMixin(
  DuplicateFeatureMixin(EnvironmentMixin(Idea)),
) {
  constructor() {
    super();
  }
}

/** Host that composes feature settings but NOT EnvironmentMixin —
 *  represents an NPC that declares MobileMixin-style messages without
 *  carrying its own settings store. */
class NonEnvHost extends FeatureMixin(Idea) {
  constructor() {
    super();
  }
}

describe('EnvironmentMixin', () => {
  let host: TestHost;

  beforeEach(() => {
    host = makeStuff(() => new TestHost());
  });

  describe('D2 — lookup chain', () => {
    it('returns the schema default for a declared key with no override', () => {
      expect(host.getSetting<string>('feature.greeting')).toBe('hello');
    });

    it('returns the persistent override when set', () => {
      host.setSetting<string>('feature.greeting', 'howdy', host);
      expect(host.getSetting<string>('feature.greeting')).toBe('howdy');
    });

    it('returns the schema default for a session-lifetime key with no override', () => {
      expect(host.getSetting<string>('feature.session')).toBe('eph');
    });

    it('returns the session override when set', () => {
      host.setSetting<string>('feature.session', 'live', host);
      expect(host.getSetting<string>('feature.session')).toBe('live');
    });

    it('routes setSetting writes by lifetime', () => {
      host.setSetting<string>('feature.greeting', 'persist', host);
      host.setSetting<string>('feature.session', 'temp', host);
      expect(host.persistentStore).toEqual({ 'feature.greeting': 'persist' });
      expect(host.sessionStore).toEqual({ 'feature.session': 'temp' });
    });

    it('unsetSetting clears the override and the default applies again', () => {
      host.setSetting<string>('feature.greeting', 'howdy', host);
      host.unsetSetting('feature.greeting', host);
      expect(host.getSetting<string>('feature.greeting')).toBe('hello');
    });
  });

  describe('D3 — unknown keys and var/setting boundary', () => {
    it('returns undefined when reading an unknown key', () => {
      expect(host.getSetting<string>('nope.never')).toBeUndefined();
    });

    it('throws when setSetting targets an unknown key', () => {
      expect(() =>
        host.setSetting<string>('nope.never', 'x', host),
      ).toThrowError(/no such setting/);
    });

    it('setVar succeeds for an undeclared key and stores a string', () => {
      host.setVar('greeting', 'hi');
      expect(host.sessionStore.greeting).toBe('hi');
    });

    it('setVar coerces non-string input via String()', () => {
      // Cast: setVar is typed string but production callsites are the
      // command layer where type-coerce already happens. The runtime
      // behaviour is what we assert.
      (host.setVar as unknown as (n: string, v: unknown) => void)(
        'count',
        42,
      );
      expect(host.sessionStore.count).toBe('42');
    });

    it('setVar throws when the name collides with a declared setting', () => {
      expect(() => host.setVar('feature.greeting', 'x')).toThrowError(
        /declared setting/,
      );
    });

    it('listVars omits keys that are schema-declared', () => {
      // Arrange: a declared session setting (override) AND an ad-hoc var.
      host.setSetting<string>('feature.session', 'live', host);
      host.setVar('plain', 'val');
      expect(host.listVars()).toEqual({ plain: 'val' });
    });
  });

  describe('D4 — validation', () => {
    it('rejects a value of the wrong type', () => {
      expect(() =>
        host.setSetting<number>('feature.greeting', 42, host),
      ).toThrowError(/expected string/);
    });

    it('runs the type-shape check before the custom validator', () => {
      // 'feature.count' is type number with validator >= 0. A string
      // input must fail with the type error, not reach the validator.
      expect(() =>
        host.setSetting<string>('feature.count', 'abc', host),
      ).toThrowError(/expected number/);
    });

    it('runs the custom validator after the type-shape check', () => {
      expect(() => host.setSetting<number>('feature.count', -1, host),
      ).toThrowError(/non-negative/);
    });

    it('accepts an enum value in the allowed set', () => {
      host.setSetting<string>('feature.color', 'green', host);
      expect(host.getSetting<string>('feature.color')).toBe('green');
    });

    it('rejects an enum value not in the allowed set', () => {
      expect(() => host.setSetting<string>('feature.color', 'mauve', host),
      ).toThrowError(/expected one of/);
    });
  });

  describe('D8 — privacy', () => {
    it('allows a private write when actor === target', () => {
      host.setSetting<string>('feature.private', 'shared', host);
      expect(host.getSetting<string>('feature.private')).toBe('shared');
    });

    it('rejects a private write when actor !== target', () => {
      const other = makeStuff(() => new TestHost());
      expect(() =>
        host.setSetting<string>('feature.private', 'leak', other),
      ).toThrowError(/private/);
    });

    it('private read is unrestricted (no actor argument needed)', () => {
      expect(host.getSetting<string>('feature.private')).toBe('shh');
    });

    it('rejects a private unset when actor !== target', () => {
      const other = makeStuff(() => new TestHost());
      host.setSetting<string>('feature.private', 'mine', host);
      expect(() => host.unsetSetting('feature.private', other),
      ).toThrowError(/private/);
    });
  });

  describe('schema walk', () => {
    it('unions settings from every mixin layer on the host', () => {
      const snapshot = host.listSettings();
      const keys = snapshot.map((e) => e.schema.key);
      expect(keys).toContain('feature.greeting');
      expect(keys).toContain('other.flag');
    });

    it('attaches sourceMixin to each snapshot row', () => {
      const snapshot = host.listSettings();
      const greeting = snapshot.find(
        (e) => e.schema.key === 'feature.greeting',
      );
      expect(greeting?.sourceMixin).toBe('FeatureMixin');
      const flag = snapshot.find((e) => e.schema.key === 'other.flag');
      expect(flag?.sourceMixin).toBe('OtherFeatureMixin');
    });

    it('marks isOverridden true only when the entry has an override in its lifetime store', () => {
      host.setSetting<string>('feature.greeting', 'howdy', host);
      const snapshot = host.listSettings();
      const greeting = snapshot.find(
        (e) => e.schema.key === 'feature.greeting',
      );
      expect(greeting?.isOverridden).toBe(true);
      expect(greeting?.currentValue).toBe('howdy');
      const flag = snapshot.find((e) => e.schema.key === 'other.flag');
      expect(flag?.isOverridden).toBe(false);
      expect(flag?.currentValue).toBe(false);
    });

    it('throws when the same key is declared on two mixins', () => {
      const dup = makeStuff(() => new DuplicateHost());
      // Schema walk is lazy — triggered on first schema access.
      expect(() => dup.listSettings()).toThrowError(/declared on both/);
    });

    it('describeSetting returns the schema entry for a known key', () => {
      const entry = host.describeSetting('feature.greeting');
      expect(entry?.default).toBe('hello');
      expect(entry?.type).toBe('string');
    });

    it('describeSetting returns undefined for an unknown key', () => {
      expect(host.describeSetting('nope')).toBeUndefined();
    });
  });

  describe('resolveSetting', () => {
    it('returns the stored override on an Environment host', () => {
      host.setSetting<string>('feature.greeting', 'howdy', host);
      expect(ShellApi.resolveSetting<string>(host, 'feature.greeting')).toBe('howdy');
    });

    it('returns the schema default on an Environment host with no override', () => {
      expect(ShellApi.resolveSetting<string>(host, 'feature.greeting')).toBe('hello');
    });

    it('returns the schema default on a non-Environment host', () => {
      const npc = makeStuff(() => new NonEnvHost());
      expect(ShellApi.resolveSetting<string>(npc, 'feature.greeting')).toBe('hello');
    });

    it('returns undefined on any host for an undeclared key', () => {
      const npc = makeStuff(() => new NonEnvHost());
      expect(ShellApi.resolveSetting<string>(host, 'nope')).toBeUndefined();
      expect(ShellApi.resolveSetting<string>(npc, 'nope')).toBeUndefined();
    });
  });
});
