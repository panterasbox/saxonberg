/**
 * ScrubController — `scrub <things>`: the wash, harder (cleanliness D10).
 *
 * ⭐ The verb-collision ladder's first rung — one act behind one
 * controller: scrubbing IS washing with more time in it, and time is the
 * third of the wash's three contributions. So this is `WashController`
 * with three times the effort (and three times the duration, at a harder
 * rate of work), not a second model of cleaning.
 */

import WashController from "./WashController";

export default class ScrubController extends WashController {
  /** Three washes' worth with a brush; half that with bare hands. */
  protected override effort(model?: { brush?: { stuff?: unknown[] } }): number {
    const brushed = (model?.brush?.stuff ?? []).length > 0;
    return brushed ? 3 : 1.5;
  }

  protected override act(): { self: string; peers: string } {
    return { self: "scrub", peers: "scrubs" };
  }
}
