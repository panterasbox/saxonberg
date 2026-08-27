import { describe, it, expect } from 'vitest';
import { DiagnosticChannel, GLOBAL_CHANNEL } from '../DiagnosticChannel';

describe('pathToChannel', () => {
  it('maps explicit zone content to zone.<zone>', () => {
    expect(DiagnosticChannel.pathToChannel('/home/x/world/zones/cliffside/Goat.ts')).toBe(
      'zone.cliffside'
    );
    expect(DiagnosticChannel.pathToChannel('/seeds/world/zones/terminus/Room.ts')).toBe(
      'zone.terminus'
    );
  });

  it('maps the authored lounge tree to zone.lounge', () => {
    expect(DiagnosticChannel.pathToChannel('/mud/world/lounge/Bar.ts')).toBe('zone.lounge');
    expect(DiagnosticChannel.pathToChannel('/mud/lib/lounge/LoungeWarren.ts')).toBe(
      'zone.lounge'
    );
  });

  it('maps command controllers/views to command (before the lib arm)', () => {
    expect(DiagnosticChannel.pathToChannel('/mud/platform/idea/cmd/social/SayController.ts')).toBe(
      'command'
    );
    expect(DiagnosticChannel.pathToChannel('/mud/cmd/social/say.yaml')).toBe('command');
  });

  it('maps a lib subsystem to lib.<subsystem>', () => {
    expect(DiagnosticChannel.pathToChannel('/mud/lib/spatial/Container.ts')).toBe('lib.spatial');
    expect(DiagnosticChannel.pathToChannel('/mud/lib/behavior/Behaved.ts')).toBe('lib.behavior');
  });

  it('maps api faces to api', () => {
    expect(DiagnosticChannel.pathToChannel('/mud/api/stuff.ts')).toBe('api');
  });

  it('falls through to global for null / unmatched paths', () => {
    expect(DiagnosticChannel.pathToChannel(null)).toBe(GLOBAL_CHANNEL);
    expect(DiagnosticChannel.pathToChannel(undefined)).toBe(GLOBAL_CHANNEL);
    expect(DiagnosticChannel.pathToChannel('')).toBe(GLOBAL_CHANNEL);
    expect(DiagnosticChannel.pathToChannel('/some/other/place.ts')).toBe(GLOBAL_CHANNEL);
  });

  it('normalizes backslashes', () => {
    expect(DiagnosticChannel.pathToChannel('\\mud\\lib\\spatial\\X.ts')).toBe('lib.spatial');
  });
});

describe('expandSubscription', () => {
  it('resolves $cwd live to the cwd channel', () => {
    const out = DiagnosticChannel.expandSubscription(['$cwd', 'global'], {
      cwd: '/mud/lib/spatial/Container.ts',
    });
    expect(out).toEqual(['lib.spatial', 'global']);
  });

  it('resolves $cwd to global when no cwd', () => {
    expect(DiagnosticChannel.expandSubscription(['$cwd'], {})).toEqual(['global']);
  });

  it('passes literal / prefix patterns through and dedupes', () => {
    expect(
      DiagnosticChannel.expandSubscription(['lib.*', 'zone.lounge', 'lib.*'], {})
    ).toEqual(['lib.*', 'zone.lounge']);
  });
});

describe('matches', () => {
  it('* matches everything', () => {
    expect(DiagnosticChannel.matches('zone.lounge', ['*'])).toBe(true);
  });

  it('exact match', () => {
    expect(DiagnosticChannel.matches('zone.lounge', ['zone.lounge'])).toBe(true);
    expect(DiagnosticChannel.matches('zone.cliffside', ['zone.lounge'])).toBe(false);
  });

  it('dot-star is a prefix match on the stem', () => {
    expect(DiagnosticChannel.matches('lib.spatial', ['lib.*'])).toBe(true);
    expect(DiagnosticChannel.matches('lib', ['lib.*'])).toBe(true);
    expect(DiagnosticChannel.matches('library', ['lib.*'])).toBe(false);
    expect(DiagnosticChannel.matches('zone.lounge', ['lib.*'])).toBe(false);
  });

  it('is false when nothing matches', () => {
    expect(DiagnosticChannel.matches('api', ['zone.lounge', 'lib.*'])).toBe(false);
  });
});
