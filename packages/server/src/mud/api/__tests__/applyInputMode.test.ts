/**
 * CommandApi.applyInputMode — the pure, load-bearing input-mode prepend.
 * The interpreter hook on the command-entry hot path is exhaustively
 * unit-tested here because it sits on every command a player types.
 */

import "../../../test-bootstrap";
import { describe, it, expect } from 'vitest';
import { CommandApi } from '../command';

describe('CommandApi.applyInputMode', () => {
  it('is a verbatim no-op when no prefix is set', () => {
    expect(CommandApi.applyInputMode('hello there', '')).toBe('hello there');
    expect(CommandApi.applyInputMode('/look', '')).toBe('/look');
    expect(CommandApi.applyInputMode('cockpit scope off', '')).toBe(
      'cockpit scope off',
    );
  });

  it('prepends the prefix to a bare line', () => {
    expect(CommandApi.applyInputMode('hello', 'chat')).toBe('chat hello');
    expect(CommandApi.applyInputMode('hi all', 'chat gossip')).toBe(
      'chat gossip hi all',
    );
  });

  it('strips a leading slash to run a one-off raw command', () => {
    expect(CommandApi.applyInputMode('/look', 'chat')).toBe('look');
    expect(CommandApi.applyInputMode('/say hi', 'chat')).toBe('say hi');
  });

  /*
   * Criterion 3, first direction: interface control is not world input.
   * A bar scoped to a channel must still be able to steer its own
   * cockpit — including un-scoping itself, which is the case that would
   * otherwise strand a player who doesn't know the `/` escape.
   */
  it('never prefixes any cockpit subcommand', () => {
    for (const line of [
      'cockpit',
      'cockpit scope off',
      'cockpit scope chat gossip',
      'cockpit layout world',
      'cockpit style theme high-contrast',
      'cockpit style channel gossip color blue',
    ]) {
      expect(CommandApi.applyInputMode(line, 'chat')).toBe(line);
    }
    // Case-insensitive on the verb token.
    expect(CommandApi.applyInputMode('COCKPIT scope off', 'chat')).toBe(
      'COCKPIT scope off',
    );
  });

  /*
   * Criterion 3, second direction — and the half that makes this an
   * exemption rather than a hole. Ordinary verbs typed in a scoped bar
   * are STILL prefixed. Without this, "exempt the cockpit verb" would
   * be indistinguishable from "exempt everything".
   */
  it('still prefixes ordinary verbs in a scoped bar', () => {
    expect(CommandApi.applyInputMode('look', 'chat')).toBe('chat look');
    expect(CommandApi.applyInputMode('say hi', 'chat')).toBe('chat say hi');
    // Near-misses on the exempt token are not exempt.
    expect(CommandApi.applyInputMode('cockpits', 'chat')).toBe(
      'chat cockpits',
    );
    expect(CommandApi.applyInputMode('cock', 'chat')).toBe('chat cock');
    // The verbs the cockpit absorbed no longer carry their own
    // exemption — they are not verbs at all any more.
    expect(CommandApi.applyInputMode('mode off', 'chat')).toBe(
      'chat mode off',
    );
    expect(CommandApi.applyInputMode('layout world', 'chat')).toBe(
      'chat layout world',
    );
    expect(CommandApi.applyInputMode('style show', 'chat')).toBe(
      'chat style show',
    );
  });

  it('handles leading-whitespace edges', () => {
    // The escape is recognized after trimming the start.
    expect(CommandApi.applyInputMode('  /look', 'chat')).toBe('look');
    // The exempt check is on the trimmed first token; the original
    // (un-trimmed) text passes through unchanged.
    expect(CommandApi.applyInputMode('  cockpit scope off', 'chat')).toBe(
      '  cockpit scope off',
    );
    // A plain leading-space line is still prefixed (raw text preserved).
    expect(CommandApi.applyInputMode('  hello', 'chat')).toBe('chat   hello');
  });
});
