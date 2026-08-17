/**
 * ⭐ **One key with an optional per-form-factor override** (decision 11,
 * AC 16).
 *
 * `<key>.<factor>` → `<key>` → the schema default, one test per rung. A
 * player who wants the same behaviour everywhere sets one value; two
 * independent keys guarantee eventual silent drift.
 *
 * ⚠⚠ **This does not break the no-`cockpit.formFactor` rule.** That key
 * was never built because the server cannot know a viewport, so such a
 * key would be a fake fact. Two STORED PREFERENCES assert nothing about
 * which is in force: the server owns what is shown, and the client —
 * which genuinely knows its own width — picks. Same split as
 * `cockpit.shelf`.
 */

import '../../../test-bootstrap';
import { describe, it, expect, beforeEach } from 'vitest';
import { ShellApi } from '../shell';
import { StuffApi } from '../stuff';
import { ShadowApi } from '../shadow';
import Avatar from '../../obj/Avatar';

async function makeAvatar(): Promise<Avatar> {
  const a = await StuffApi.create(() => new Avatar());
  a.setName('Alice');
  return a;
}

describe('resolveSetting — the per-form-factor rung', () => {
  beforeEach(() => {
    StuffApi.clearAll();
    ShadowApi._clearAllForTesting();
  });

  it('rung 3: with nothing stored, both factors get the schema default', async () => {
    const a = await makeAvatar();
    expect(ShellApi.resolveSetting<string>(a, 'shell.result')).toBe('card');
    expect(
      ShellApi.resolveSetting<string>(a, 'shell.result', 'desktop'),
    ).toBe('card');
    expect(ShellApi.resolveSetting<string>(a, 'shell.result', 'mobile')).toBe(
      'card',
    );
  });

  it('rung 2: the base override answers for every factor', async () => {
    const a = await makeAvatar();
    a.setSetting('shell.result', 'both', a);
    expect(
      ShellApi.resolveSetting<string>(a, 'shell.result', 'desktop'),
    ).toBe('both');
    expect(ShellApi.resolveSetting<string>(a, 'shell.result', 'mobile')).toBe(
      'both',
    );
  });

  it('rung 1: a factor override outranks the base, for that factor ONLY', async () => {
    const a = await makeAvatar();
    a.setSetting('shell.result', 'card', a);
    a.setSetting('shell.result.mobile', 'terminal', a);
    expect(ShellApi.resolveSetting<string>(a, 'shell.result', 'mobile')).toBe(
      'terminal',
    );
    // ⭐ The payoff: the defaults may DIFFER, without a second command.
    expect(
      ShellApi.resolveSetting<string>(a, 'shell.result', 'desktop'),
    ).toBe('card');
  });

  /**
   * ⚠ The rung that makes this "one key with an OPTIONAL override"
   * rather than two mandatory keys. Reading the suffixed key through
   * `getSetting` would fall back to the schema default and always
   * return something, so rung 2 could never be reached — the override
   * would silently become mandatory.
   */
  it('an unset override falls through to the base, not to the default', async () => {
    const a = await makeAvatar();
    a.setSetting('shell.result', 'terminal', a);
    // Nothing stored at `.desktop`, so the base answers.
    expect(
      ShellApi.resolveSetting<string>(a, 'shell.result', 'desktop'),
    ).toBe('terminal');
  });

  it('⚠ a `.factor` write on a NON-perFactor key is refused', async () => {
    const a = await makeAvatar();
    expect(() =>
      a.setSetting('shell.interpolate-vars.mobile', false, a),
    ).toThrow(/no such setting/);
  });

  it('⚠ an unknown suffix is refused — the vocabulary is two values', async () => {
    const a = await makeAvatar();
    expect(() => a.setSetting('shell.result.tablet', 'card', a)).toThrow(
      /no such setting/,
    );
  });

  it('the validator applies to the override too', async () => {
    const a = await makeAvatar();
    expect(() => a.setSetting('shell.result.mobile', 'nonsense', a)).toThrow(
      /expected card \| terminal \| both/,
    );
  });

  it('unsetting the override restores the base answer', async () => {
    const a = await makeAvatar();
    a.setSetting('shell.result', 'card', a);
    a.setSetting('shell.result.mobile', 'terminal', a);
    a.unsetSetting('shell.result.mobile', a);
    expect(ShellApi.resolveSetting<string>(a, 'shell.result', 'mobile')).toBe(
      'card',
    );
  });
});
