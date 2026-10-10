/**
 * Derrick — ⭐⭐ **the instrument that affords every act at a hole**, and
 * the thing that makes a bore site a bore site.
 *
 * It is a `Tool` with the `derrick` capability: a frame over the hole, a
 * walking beam, a rope and a sheave. A hole with no derrick over it is a
 * hole nobody can work, and a derrick with no hole under it is where
 * `bore` **sites** one — which is why the siting act and the deepening
 * act are one verb. To a person they are one thing: you go to the rig
 * and you work the rig.
 *
 * ⚠⚠ **The affordance is a STATIC ON THIS CLASS and nothing else makes
 * these verbs exist.** A row's `commandContributions:` is dead
 * silently; two builds in this repo shipped exactly that failure and
 * only found it by driving the world. Without the block below, `bore`
 * parses as nothing at all: *"I don't understand 'bore'."*
 *
 * ⭐ `peers` rather than `self`/`inventory`, and that is the
 * instrument-affords-the-verb rule read correctly: a derrick weighs a
 * ton and a half and is fixed in place, so it is never in anybody's
 * hands. Walking up to the rig lights the acts up and walking away puts
 * them down, which is also the honest answer to *why can't I bore in
 * the street*.
 */

import Tool from '@saxonberg/server/mud/platform/thing/Tool';

/** The capability a derrick affords. An open vocabulary, like every other. */
export const DERRICK = 'derrick';

export default class Derrick extends Tool {
  /**
   * ⚠ See the header: this block is the ONLY thing that makes the
   * trade's acts exist.
   *
   * ⭐ **Three, not five.** `hire` and `dismiss` were here until
   * 2026-10-09 and were never this rig's to afford: taking somebody on
   * and letting them go are the EMPLOYMENT subsystem's acts, which every
   * house in the realm needs and which the kernel already had the
   * methods for (`OrganizationMixin.appoint` / `.dismiss`). They are
   * core verbs now — `hire` an alias on `appoint` — so they need no
   * affordance and work at a bar and a ranch as well as at a rig. What
   * is left here is the three acts that genuinely need a derrick
   * standing over a hole.
   */
  static commandContributions = {
    peers: [
      'trade/drilling/cmd/drilling/bore.yaml',
      'trade/drilling/cmd/drilling/bail.yaml',
      'trade/drilling/cmd/drilling/line.yaml',
    ],
  };
}
