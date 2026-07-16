import { describe, it, expect } from 'vitest';
import { CHANNELS, MECHANICAL_CHANNELS, Channels } from '../Channel';
import type { Channel } from '../Channel';

describe('Channel vocabulary', () => {
  it('ships edge / point / blunt (mechanical) + shock (electrical)', () => {
    expect([...CHANNELS]).toEqual(['edge', 'point', 'blunt', 'shock']);
  });

  it('the mechanical subset is edge / point / blunt (shock excluded)', () => {
    expect([...MECHANICAL_CHANNELS]).toEqual(['edge', 'point', 'blunt']);
    expect(Channels.MECHANICAL).toEqual(MECHANICAL_CHANNELS);
    expect(Channels.isMechanicalChannel('shock')).toBe(false);
    expect(Channels.isChannel('shock')).toBe(true);
  });

  it('Channels.ALL mirrors CHANNELS', () => {
    expect(Channels.ALL).toEqual(CHANNELS);
  });

  it('isChannel narrows a valid string', () => {
    for (const c of CHANNELS) {
      expect(Channels.isChannel(c)).toBe(true);
    }
    // Compile-time narrowing check: inside the guard, `s` is Channel.
    const s: string = 'edge';
    if (Channels.isChannel(s)) {
      const narrowed: Channel = s;
      expect(narrowed).toBe('edge');
    }
  });

  it('isChannel rejects non-members', () => {
    for (const bad of ['heat', 'thermal', 'crush', '', 'Edge', 'slash']) {
      expect(Channels.isChannel(bad)).toBe(false);
    }
  });
});
