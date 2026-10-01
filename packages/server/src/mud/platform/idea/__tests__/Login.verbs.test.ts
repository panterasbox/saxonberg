/**
 * ⭐ The Login invariant, as a test.
 *
 * The avatar-family build cuts `HasInteractiveMixin` into three mixins
 * and `cockpit` rides the outermost one. The requirement is that the
 * pre-world phase **neither gains nor loses a verb** — so this pins the
 * exact `self` bucket `Login` affords today, before anything moves.
 *
 * ⚠ A verb vanishing here is silent in every other test: char-gen
 * dispatches through the command bus and an absent contribution reads
 * as "unknown command", which no controller test can see.
 */

import "../../../../test-bootstrap";
import { describe, it, expect } from 'vitest';
import { CommandApi } from '../../../api/command';
import Login from '../Login';

describe('⭐ Login affords exactly the pre-world verb set', () => {
  const selfVerbs = (): string[] =>
    CommandApi.collectContributions(Login, 'self')
      .flatMap((d) => d.verbs)
      .sort();

  it('the self bucket is embody, play and cockpit — and nothing else', () => {
    expect(selfVerbs()).toEqual(['cockpit', 'embody', 'play']);
  });

  it('no world verbs leak into the pre-world phase', () => {
    const verbs = selfVerbs();
    for (const leaked of ['go', 'say', 'take', 'look', 'who']) {
      expect(verbs).not.toContain(leaked);
    }
  });

  it('peers and environment are empty — a Login has no neighbourhood', () => {
    expect(CommandApi.collectContributions(Login, 'peers')).toEqual([]);
    expect(CommandApi.collectContributions(Login, 'environment')).toEqual([]);
  });
});
