/**
 * CommandApi.applyInputMode — the pure, load-bearing input-mode prepend.
 * The interpreter hook on the command-entry hot path is exhaustively
 * unit-tested here because it sits on every command a player types.
 */

import { describe, it, expect } from 'vitest';
import { CommandApi } from '../command';

describe('CommandApi.applyInputMode', () => {
  it('is a verbatim no-op when no prefix is set', () => {
    expect(CommandApi.applyInputMode('hello there', '')).toBe('hello there');
    expect(CommandApi.applyInputMode('/look', '')).toBe('/look');
    expect(CommandApi.applyInputMode('mode off', '')).toBe('mode off');
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

  it('never prefixes the mode-management verb', () => {
    expect(CommandApi.applyInputMode('mode off', 'chat')).toBe('mode off');
    expect(CommandApi.applyInputMode('mode', 'chat')).toBe('mode');
    expect(CommandApi.applyInputMode('mode chat gossip', 'chat')).toBe(
      'mode chat gossip',
    );
    // Case-insensitive on the verb token.
    expect(CommandApi.applyInputMode('MODE off', 'chat')).toBe('MODE off');
  });

  it('handles leading-whitespace edges', () => {
    // The escape is recognized after trimming the start.
    expect(CommandApi.applyInputMode('  /look', 'chat')).toBe('look');
    // The mode-exempt check is on the trimmed first token; the original
    // (un-trimmed) text passes through unchanged.
    expect(CommandApi.applyInputMode('  mode off', 'chat')).toBe('  mode off');
    // A plain leading-space line is still prefixed (raw text preserved).
    expect(CommandApi.applyInputMode('  hello', 'chat')).toBe('chat   hello');
  });
});
