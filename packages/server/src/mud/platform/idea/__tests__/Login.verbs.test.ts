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

  it('the self bucket is embody, play, cockpit and prompt — and nothing else', () => {
    expect(selfVerbs()).toEqual(['cockpit', 'embody', 'play', 'prompt']);
  });

  /**
   * ⭐ Why `prompt` belongs here, since this test is the record of what
   * the pre-world phase may say.
   *
   * The reachability sweep found `prompt` afforded by NOTHING — view and
   * controller shipped, no static named the file — and put it on
   * `HasInteractiveMixin.self`, because *a prompt is addressed to a
   * CONNECTION* and whoever has a human on the other side is who can
   * clear it. `Login` composes that mixin, so it arrives here.
   *
   * ⭐⭐ And it is RIGHT rather than collateral: the enroll machine is
   * built out of prompts, and the one moment a player most needs to
   * dismiss a stuck question is before they have a body. A `prompt
   * cancel` that worked only after `embody` would be the hatch locked on
   * the inside.
   *
   * ⚠ It is not a world verb — the test below still refuses
   * `go`/`say`/`take`/`look`/`who` — and it reaches no world state: the
   * controller cancels pending prompts on this connection and nothing
   * else.
   */

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
