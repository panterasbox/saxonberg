/**
 * CommandApi cache + YAML-load tests.
 *
 * Production dispatch never queries the cache directly — it walks
 * each giver's recency stack (`CommandGiverMixin.getAffordances()`)
 * and filters by verb. These tests cover the load-once
 * sharing layer: `getCommand` parses a YAML on first request and
 * returns the cached instance thereafter, `clearCache` drops the
 * memo so the next request reparses, and verb matching itself is
 * the responsibility of `CommandDefinition.hasVerb`.
 */

import "../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CommandApi } from '../command';

describe('CommandApi', () => {
  beforeEach(() => {
    CommandApi.clearCache();
  });

  afterEach(() => {
    CommandApi.clearCache();
  });

  describe('getCommand()', () => {
    it('loads a CommandDefinition from a YAML file', () => {
      const command = CommandApi.getCommand('system/ping.yaml');

      expect(command).not.toBeNull();
      expect(command?.verbs).toContain('ping');
      expect(command?.controller).toBe('/obj/command/system/PingController');
    });

    it('returns the same instance on repeat calls (cached)', () => {
      const a = CommandApi.getCommand('system/ping.yaml');
      const b = CommandApi.getCommand('system/ping.yaml');
      expect(a).toBe(b);
    });

    it('returns null for a non-existent file', () => {
      expect(CommandApi.getCommand('nonexistent.yaml')).toBeNull();
    });

    it('parses verb aliases as a list', () => {
      const command = CommandApi.getCommand('perception/look.yaml');
      expect(command?.verbs).toContain('look');
      expect(command?.verbs).toContain('l');
    });
  });

  describe('CommandDefinition.hasVerb()', () => {
    it('matches case-insensitively across every alias', () => {
      const cmd = CommandApi.getCommand('perception/look.yaml')!;
      expect(cmd.hasVerb('look')).toBe(true);
      expect(cmd.hasVerb('LOOK')).toBe(true);
      expect(cmd.hasVerb('Look')).toBe(true);
      expect(cmd.hasVerb('l')).toBe(true);
      expect(cmd.hasVerb('L')).toBe(true);
    });

    it('returns false for an unrelated verb', () => {
      const cmd = CommandApi.getCommand('perception/look.yaml')!;
      expect(cmd.hasVerb('ping')).toBe(false);
    });
  });

  describe('clearCache()', () => {
    it('drops cached instances so the next request reparses', () => {
      const before = CommandApi.getCommand('system/ping.yaml');
      CommandApi.clearCache();
      const after = CommandApi.getCommand('system/ping.yaml');
      expect(before).not.toBe(after);
      expect(after?.controller).toBe('/obj/command/system/PingController');
    });
  });

  describe('allDefinitions()', () => {
    it('returns the whole loaded roster (the help index corpus)', () => {
      // Seed the cache by loading a couple of verbs, then assert the
      // roster accessor surfaces them (the commands projector's source).
      CommandApi.getCommand('system/ping.yaml');
      CommandApi.getCommand('perception/look.yaml');
      const defs = CommandApi.allDefinitions();
      const verbs = defs.map((d) => d.getPrimaryVerb());
      expect(verbs).toContain('ping');
      expect(verbs).toContain('look');
      expect(defs.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('YAML structure round-trip', () => {
    it('parses ping.yaml as a zero-arg flat verb', () => {
      const cmd = CommandApi.getCommand('system/ping.yaml');
      expect(cmd?.verbs).toContain('ping');
      expect(cmd?.controller).toBe('/obj/command/system/PingController');
      expect(cmd?.description).toBeDefined();
      expect(cmd?.args).toEqual([]);
    });

    it('parses look.yaml top-level args', () => {
      const cmd = CommandApi.getCommand('perception/look.yaml');
      expect(cmd?.args.length).toBeGreaterThan(0);
    });

    it('parses player.yaml with subcommands', () => {
      const cmd = CommandApi.getCommand('author/player.yaml');
      expect(cmd?.subcommands).toBeDefined();
      const subs = Object.keys(cmd?.subcommands ?? {});
      expect(subs).toContain('name');
      expect(subs).toContain('pronouns');
      expect(subs).toContain('show');
    });
  });
});
