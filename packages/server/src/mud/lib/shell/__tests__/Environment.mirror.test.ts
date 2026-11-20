/**
 * ⭐ A setting the client mirrors (tooltips D5): declared `client: true`,
 * it rides the session snapshot and every set / unset pushes it — no
 * controller pushes by key, nothing undeclared is mirrored.
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Idea } from '../../stuff/Idea';
import { EnvironmentMixin, type SettingsSchemaEntry } from '../Environment';
import { MixinApi } from '../../../api/mixin';
import type { MixinConstructor } from '../../mixin';
import { makeStuff } from '../../security/__tests__/test-setup';

function ReaderMixin<TBase extends MixinConstructor>(Base: TBase) {
  class ReaderMixin extends Base {
    static _mixinName = 'ReaderMixin';
    static settings: SettingsSchemaEntry[] = [
      { key: 'reader.appetite', type: 'number', default: 0, description: 'mirrored', client: true },
      { key: 'reader.where', type: 'string', default: 'card', description: 'mirrored per factor', client: true, perFactor: true },
      { key: 'reader.quiet', type: 'boolean', default: false, description: 'not mirrored' },
    ];
  }
  return ReaderMixin;
}

const pushed: Array<[string, unknown]> = [];

class Host extends ReaderMixin(EnvironmentMixin(Idea)) {
  pushClientStateUpdate(key: string, value: unknown): void {
    pushed.push([key, value]);
  }
}

describe('a client-mirrored setting', () => {
  let host: Host;
  beforeEach(() => {
    pushed.length = 0;
    host = makeStuff(() => new Host());
    vi.spyOn(MixinApi, 'isClientState').mockReturnValue(true);
  });
  afterEach(() => vi.restoreAllMocks());

  it('set pushes the resolved value once', () => {
    host.setSetting('reader.appetite', 2, host);
    expect(pushed).toEqual([['reader.appetite', 2]]);
  });

  it('unset pushes the default back', () => {
    host.setSetting('reader.appetite', 2, host);
    pushed.length = 0;
    host.unsetSetting('reader.appetite', host);
    expect(pushed).toEqual([['reader.appetite', 0]]);
  });

  it('a per-factor override pushes BOTH answers under the base key', () => {
    host.setSetting('reader.where', 'both', host);
    host.setSetting('reader.where.mobile', 'terminal', host);
    expect(pushed.at(-1)).toEqual(['reader.where', { desktop: 'both', mobile: 'terminal' }]);
  });

  it('an undeclared setting pushes nothing', () => {
    host.setSetting('reader.quiet', true, host);
    expect(pushed).toEqual([]);
  });

  it('the snapshot carries every mirrored setting, and only those', () => {
    host.setSetting('reader.appetite', 3, host);
    const snap = host.clientMirroredSettings();
    expect(snap).toMatchObject({
      'reader.appetite': 3,
      'reader.where': { desktop: 'card', mobile: 'card' },
      // Environment's own `shell.result` is declared mirrored too.
      'shell.result': { desktop: 'card', mobile: 'card' },
    });
    expect(snap).not.toHaveProperty('reader.quiet');
  });

  it('a host with no client state pushes nothing', () => {
    vi.mocked(MixinApi.isClientState).mockReturnValue(false);
    host.setSetting('reader.appetite', 1, host);
    expect(pushed).toEqual([]);
  });
});
