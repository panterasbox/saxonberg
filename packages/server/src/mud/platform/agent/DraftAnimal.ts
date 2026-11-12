/**
 * DraftAnimal — **a beast kept in the shafts: it pulls, and it can be
 * ridden.**
 *
 * Composition: `Persistable(Mountable(Hauler(Beast)))`.
 *
 * ⚠⚠ **It replaces `platform/agent/HaulingCreature`, which was
 * `Mountable(Character)` — a horse that was a
 * PERSON.** That class's own docstring stated the reason in the repo's
 * words: *"The cart-pulling capability itself comes from `Character`
 * (which composes `HaulerMixin` — every PC and NPC-character can hitch a
 * cart)"*, and *"A non-ridden draft animal (an ox you lead) is just a
 * `Character` with a draft-mass body plan."* ⭐ **A class reaching for a
 * whole rung to get one mixin is this project's documented
 * mixin-on-the-wrong-host tell**, and the cost was that a pit pony
 * composed `CasterMixin` and `EmployedMixin`.
 *
 * `HaulingCreature` was deleted rather than renamed: its name claimed
 * the one thing it did not provide.
 *
 * ## Why each mixin sits exactly here
 *
 * - **`Hauler` here, and on `Character`, and on neither rung between.**
 *   ⚠ `hitch.yaml:35` gates its target on `HaulerMixin` — it is the
 *   ONLY reader (zero `MixinApi.isHauler` narrowings, zero affordance
 *   statics), so that arg gate is the whole of its reachability. On
 *   `Actor` the binder would accept `hitch cart to canary` and the
 *   refusal would move from an honest gate to breakaway physics. Every
 *   person self-hauls; a draft animal hauls; a wolf does not.
 * - **`Mountable` here, not on `Beast`.** Composing it MINTS a mount
 *   slot (`Mountable.ts:5-8`), so a `Beast` that carried it would let
 *   the binder accept `mount wolf`.
 * - **Not `KeptAnimal`.** No bond, no name, no residency pin — and
 *   `lint:kept-animals` direction 2 fails a `Bonded` class whose species
 *   authors no `biddability`.
 * - **Kernel, not pack.** Its two consumers are in `transport` and
 *   `trade-mining`, which have no common pack ancestor —
 *   `CLAUDE.md § Module Categories`: *substrate goes to the KERNEL when
 *   its composers have no common pack ancestor.* The same reason
 *   `HaulingCreature` was kernel.
 * - **No `Chattel`, no `Branded`** — filed as the owner's call (E11 of
 *   the Agent plan). D2's definition (bought, lent, stolen, with a chain
 *   of title) says a horse is the paradigm case; D2's shipped host list
 *   says the animal rungs are `KeptAnimal` and `Livestock` and nothing
 *   else. Two lines if the answer is yes, and `Creature.chattel.test.ts`
 *   is the test that changes.
 *
 * - ⭐ **`Persistable` outermost — it remembers what it carries.** A draft
 *   animal is `cast:` (persistence.md § *Props and cast*): never a room's
 *   content, re-minted from its row when its room is restored. Before
 *   this, everything a player put ON it — the pack saddle, the panniers
 *   and what was in them, the yard's own props until somebody tacked the
 *   mule — went with the old instance and was in nobody's record (the
 *   size-and-carrying drive: *"a cast mule loses its tack across a
 *   restart"*). Capture the host, not the thing: the beast keeps its own
 *   record, keyed by its row (cast is one-per-path — `reseedCast`
 *   conserves by path), captured at shutdown like every host and
 *   restored at its re-mint through its hydration source — the
 *   `Stockpile` / `MarketStalls` shape. The room still never carries it.
 *
 * ⭐ **A second draft animal is a ROW** — a species, a mass, a brain. An
 * ox you lead but do not ride has no row today and gets no class until
 * it does.
 */

import Beast from './Beast';
import { HaulerMixin } from '../../lib/slot/Hauler';
import { MountableMixin } from '../../lib/slot/Mountable';
import { PersistableMixin } from '../../lib/persistence/Persistable';
import { PersistableApi } from '../../api/persistable';
import type {
  HydrationSource,
  HydrateOutcome,
} from '../../lib/persistence/PersistenceSlice';
import type { Stuff } from '../../lib/stuff/Stuff';

const DraftAnimalBase = PersistableMixin(MountableMixin(HaulerMixin(Beast)));

export class DraftAnimal extends DraftAnimalBase {
  /**
   * What the world remembered about this beast — its tack and its load.
   * `required: false`: an unreachable store is a recorded skip (every test
   * run), and the beast still stands, fresh from its row.
   */
  static hydrationSource: HydrationSource = {
    name: 'holder_snapshots',
    required: false,
  };

  static async hydrateFromSource(host: Stuff): Promise<HydrateOutcome> {
    try {
      // ⭐ Its plan first: worn tack re-seats into the slots the species
      // names, and a body whose plan is not known is not judged.
      if (host instanceof DraftAnimal) await host.ensureSpecies();
      await PersistableApi.materialize(host);
      return { status: 'hydrated' };
    } catch (err) {
      // ⚠ Never throw: a throw unregisters the half-built beast.
      return { status: 'unreachable', reason: String(err) };
    }
  }
}

export default DraftAnimal;
