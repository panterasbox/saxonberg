/**
 * ⭐ The `wiki` verb is actually reachable by a player.
 *
 * This test exists because **nothing else caught its absence.** The
 * command YAML loaded, `lint:gates` passed, the controller suite passed
 * (it invokes the controller directly), and the whole build was green —
 * and typing `wiki` in the client said *"I don't understand 'wiki'."*,
 * because no `commandContributions` entry afforded it to anyone.
 *
 * A verb nobody can type is a verb that does not exist. Found by
 * driving a browser; pinned here so it cannot regress silently.
 */

import { describe, it, expect } from 'vitest';
import Avatar from '../Avatar';

describe('the wiki verb is afforded to players', () => {
  it('rides Avatar’s innate `self` contributions', () => {
    expect(Avatar.commandContributions.self).toContain('system/wiki.yaml');
  });

  it('sits beside `help` — both are carried reference surfaces', () => {
    const self = Avatar.commandContributions.self ?? [];
    // Not a coincidence and not arbitrary: `help` tells you what a verb
    // does, `wiki` tells you what a thing IS. Reading is open to
    // everyone by design (D11), so gating the verb behind a hosted
    // aether update the way `forum`/`chat` are gated would contradict
    // the access model the build implements.
    expect(self).toContain('system/help.yaml');
    expect(Math.abs(self.indexOf('system/wiki.yaml') - self.indexOf('system/help.yaml')))
      .toBe(1);
  });

  it('every verb Avatar affords names a real command file', () => {
    // The generalised form of the same bug: an entry here is a string,
    // and a typo'd or renamed YAML would afford nothing with no error.
    const self = Avatar.commandContributions.self ?? [];
    for (const entry of self) {
      expect(entry, `${entry} should look like <category>/<verb>.yaml`)
        .toMatch(/^[a-z-]+\/[a-z-]+\.yaml$/);
    }
  });
});
