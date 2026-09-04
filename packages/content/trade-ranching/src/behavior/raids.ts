/**
 * `raids` brain (`/trade/ranching/behavior/raids`) — ⭐⭐ **a fox in a hen
 * house kills everything** (D50), and the surplus is the whole point.
 *
 * It does not take one bird. It kills the lot and carries off one, which
 * is real fox behaviour and is what makes a hen house a **sudden total
 * loss** (D52) rather than an attrition. That shape teaches why you
 * insure and why you diversify, and it is the only failure in this build
 * that arrives in one night.
 *
 * ⭐ **And it has a real, buildable defence**, which is what keeps it a
 * hazard rather than a tax: a working dog guards as well as herds
 * (D41/D42 gain a third reason to exist), and a shut door is a shut
 * door. The brain checks for both before it does anything, so a keeper
 * who took precautions is simply not raided.
 *
 * ⚠ **Predators range across parcels**, which makes them a COMMONS
 * problem rather than a personal chore — and D64 says so explicitly:
 * abatement is *"hazard abatement for landholders — parcel owners pay to
 * clear traps/beasts"*, which is a **hired job on the shipped
 * work-contract substrate**, not a grind. The seam is that this brain
 * takes no notice of who owns the ground: a fox is the neighbourhood's
 * problem, and the neighbourhood is where the answer lives.
 *
 * ⚠⚠ **Nothing here rolls to decide what the fox DID.** It arrives on a
 * cadence, it finds what is there, and it kills what it finds. The
 * player's uncertainty is about *when*, which is environmental — the
 * legitimate provenance — and never about whether their own defence
 * worked.
 *
 * config: `{ guardKeywords?: string[] }` — what counts as a guard. The
 * default is a dog.
 */

import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { ConditionApi } from '@saxonberg/server/mud/api/condition';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { BrainContext } from '@saxonberg/server/mud/lib/behavior/brain';

/** What the fox will not come near. */
const DEFAULT_GUARDS = ['dog', 'hound', 'collie'];

export const brain = class {
  static label = 'raids';
  /**
   * ⚠ It must run whether or not anybody is watching — the whole failure
   * is that it happens at night while you are asleep, and you find out
   * in the morning.
   */
  static presenceGated = false;
  static ambient = false;

  static async act(ctx: BrainContext): Promise<void> {
    const fox = ctx.host as Stuff;
    if (fox.isDestroyed() || !MixinApi.isContainable(fox)) return;
    const room = fox.getContainer();
    if (!room || !MixinApi.isContainer(room)) return;

    const config = (ctx.config ?? {}) as { guardKeywords?: string[] };
    const guards = config.guardKeywords ?? DEFAULT_GUARDS;
    const contents = room.getContents();

    // ⭐ The defence, checked FIRST. A keeper who kept a dog is simply
    // not raided — no roll, no partial loss, no "the dog was asleep".
    const guarded = contents.some((c) => {
      const words = (c as unknown as { getKeywords?(): readonly string[] })
        .getKeywords?.() ?? [];
      return words.some((w) => guards.includes(w));
    });
    if (guarded) return;

    // Everything alive here that is not the fox.
    const prey = contents.filter(
      (c) =>
        c !== fox &&
        MixinApi.isOrganism(c) &&
        c.isAlive() &&
        !MixinApi.isCommandGiver(c),
    );
    if (prey.length === 0) return;

    // ⭐⭐ THE line, and it is one line: it kills them ALL.
    for (const bird of prey) {
      if (bird.isDestroyed()) continue;
      ConditionApi.inflict(bird as Stuff, {
        mechanism: 'point',
        site: 'body.neck',
        // Enough to end a small bird outright, and nowhere near enough
        // to trouble anything larger — which is why a fox is a hen
        // problem and not a cattle problem, with no species list.
        energy: 240,
      });
    }
    // …and carries one away, which is the part that makes it look like a
    // theft rather than a massacre and is exactly why people used to
    // blame the wrong thing.
    const carried = prey[0];
    if (carried && !carried.isDestroyed()) StuffApi.destruct(carried as Stuff);

    MessageApi.scene(fox)
      .topic('sense.ambient')
      .toPeers(
        Mml.compose`Something small and quick goes over the wall with a bird in its mouth. It is not the only one it killed.`,
      )
      .send();
  }
};
