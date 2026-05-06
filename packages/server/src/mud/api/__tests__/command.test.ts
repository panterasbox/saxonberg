/**
 * CommandApi tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CommandApi } from '../command';

describe('CommandApi', () => {
  beforeEach(() => {
    // Clear cache before each test
    CommandApi.clearCache();
  });

  afterEach(() => {
    // Clean up after tests
    CommandApi.clearCache();
  });

  describe('getCommand()', () => {
    it('should load command from YAML file', () => {
      const command = CommandApi.getCommand('ping.yaml');

      expect(command).toBeDefined();
      expect(command).not.toBeNull();
      expect(command?.verbs).toContain('ping');
      expect(command?.controller).toBe('PingController');
    });

    it('should cache loaded commands', () => {
      const command1 = CommandApi.getCommand('ping.yaml');
      const command2 = CommandApi.getCommand('ping.yaml');

      // Should return same instance (cached)
      expect(command1).toBe(command2);
    });

    it('should load different commands', () => {
      const pingCommand = CommandApi.getCommand('ping.yaml');
      const helpCommand = CommandApi.getCommand('help.yaml');

      expect(pingCommand).not.toBe(helpCommand);
      expect(pingCommand?.verbs).toContain('ping');
      expect(helpCommand?.verbs).toContain('help');
    });

    it('should return null for non-existent file', () => {
      const command = CommandApi.getCommand('nonexistent.yaml');

      expect(command).toBeNull();
    });

    it('should register verbs in verbMap', () => {
      CommandApi.getCommand('ping.yaml');

      const command = CommandApi.matchVerb('ping');

      expect(command).toBeDefined();
      expect(command).not.toBeNull();
      expect(command?.controller).toBe('PingController');
    });

    it('should handle multiple verbs (aliases)', () => {
      const command = CommandApi.getCommand('look.yaml');

      expect(command?.verbs).toContain('look');
      expect(command?.verbs).toContain('l');

      // Both verbs should resolve to same command
      const lookCmd = CommandApi.matchVerb('look');
      const lCmd = CommandApi.matchVerb('l');

      expect(lookCmd).toBe(lCmd);
      expect(lookCmd?.controller).toBe('LookController');
    });
  });

  describe('matchVerb()', () => {
    beforeEach(() => {
      // Load some commands
      CommandApi.getCommand('ping.yaml');
      CommandApi.getCommand('look.yaml');
      CommandApi.getCommand('help.yaml');
    });

    it('should match exact verb', () => {
      const command = CommandApi.matchVerb('ping');

      expect(command).toBeDefined();
      expect(command?.controller).toBe('PingController');
    });

    it('should match verb aliases', () => {
      const command = CommandApi.matchVerb('l');

      expect(command).toBeDefined();
      expect(command?.controller).toBe('LookController');
    });

    it('should be case insensitive', () => {
      const command1 = CommandApi.matchVerb('ping');
      const command2 = CommandApi.matchVerb('PING');
      const command3 = CommandApi.matchVerb('Ping');

      expect(command1).toBe(command2);
      expect(command2).toBe(command3);
    });

    it('should return null for unknown verb', () => {
      const command = CommandApi.matchVerb('unknowncommand');

      expect(command).toBeNull();
    });
  });

  describe('getAllCommands()', () => {
    it('should return empty array when no commands loaded', () => {
      const commands = CommandApi.getAllCommands();

      expect(commands).toEqual([]);
    });

    it('should return all loaded commands', () => {
      CommandApi.getCommand('ping.yaml');
      CommandApi.getCommand('look.yaml');
      CommandApi.getCommand('help.yaml');

      const commands = CommandApi.getAllCommands();

      expect(commands).toHaveLength(3);
      expect(commands.some((c) => c.controller === 'PingController')).toBe(true);
      expect(commands.some((c) => c.controller === 'LookController')).toBe(true);
      expect(commands.some((c) => c.controller === 'HelpController')).toBe(true);
    });

    it('should not include duplicate commands', () => {
      CommandApi.getCommand('ping.yaml');
      CommandApi.getCommand('ping.yaml'); // Load twice

      const commands = CommandApi.getAllCommands();

      expect(commands).toHaveLength(1);
    });
  });

  describe('clearCache()', () => {
    it('should clear all cached commands', () => {
      CommandApi.getCommand('ping.yaml');
      CommandApi.getCommand('look.yaml');

      expect(CommandApi.getAllCommands()).toHaveLength(2);

      CommandApi.clearCache();

      expect(CommandApi.getAllCommands()).toHaveLength(0);
    });

    it('should clear verb map', () => {
      CommandApi.getCommand('ping.yaml');

      expect(CommandApi.matchVerb('ping')).not.toBeNull();

      CommandApi.clearCache();

      expect(CommandApi.matchVerb('ping')).toBeNull();
    });

    it('should allow reloading after clear', () => {
      const command1 = CommandApi.getCommand('ping.yaml');
      CommandApi.clearCache();
      const command2 = CommandApi.getCommand('ping.yaml');

      // Should be different instances (reloaded)
      expect(command1).not.toBe(command2);
      expect(command2?.controller).toBe('PingController');
    });
  });

  describe('Lazy loading behavior', () => {
    it('should only load command when first requested', () => {
      // Before loading
      expect(CommandApi.matchVerb('ping')).toBeNull();

      // Load it
      CommandApi.getCommand('ping.yaml');

      // Now it should be available
      expect(CommandApi.matchVerb('ping')).not.toBeNull();
    });

    it('should load multiple commands independently', () => {
      const ping = CommandApi.getCommand('ping.yaml');
      expect(CommandApi.getAllCommands()).toHaveLength(1);

      const look = CommandApi.getCommand('look.yaml');
      expect(CommandApi.getAllCommands()).toHaveLength(2);

      const help = CommandApi.getCommand('help.yaml');
      expect(CommandApi.getAllCommands()).toHaveLength(3);

      expect(ping?.controller).toBe('PingController');
      expect(look?.controller).toBe('LookController');
      expect(help?.controller).toBe('HelpController');
    });
  });

  describe('Integration with actual YAML files', () => {
    it('should load all available command YAML files', () => {
      const commandFiles = [
        'ping.yaml',
        'help.yaml',
        'look.yaml',
        'inventory.yaml',
        'get.yaml',
        'drop.yaml',
        'player.yaml',
      ];

      const loadedCommands = commandFiles.map((file) => CommandApi.getCommand(file));

      // All should load successfully
      expect(loadedCommands.every((cmd) => cmd !== null)).toBe(true);

      // Should have correct number cached
      expect(CommandApi.getAllCommands()).toHaveLength(commandFiles.length);
    });

    it('should correctly parse ping.yaml structure', () => {
      const command = CommandApi.getCommand('ping.yaml');

      expect(command).not.toBeNull();
      expect(command?.verbs).toContain('ping');
      expect(command?.controller).toBe('PingController');
      expect(command?.description).toBeDefined();
      // ping has no positionals — args array exists and is empty.
      expect(command?.args).toEqual([]);
    });

    it('should correctly parse look.yaml top-level args', () => {
      const command = CommandApi.getCommand('look.yaml');

      expect(command).not.toBeNull();
      expect(command?.verbs).toContain('look');
      expect(command?.verbs).toContain('l');
      expect(command?.args.length).toBeGreaterThan(0);
    });

    it('should correctly parse player.yaml with subcommands', () => {
      const command = CommandApi.getCommand('player.yaml');

      expect(command).not.toBeNull();
      expect(command?.verbs).toContain('player');
      expect(command?.subcommands).toBeDefined();
      expect(Object.keys(command?.subcommands || {})).toContain('name');
      expect(Object.keys(command?.subcommands || {})).toContain('pronouns');
      expect(Object.keys(command?.subcommands || {})).toContain('show');
    });
  });
});
