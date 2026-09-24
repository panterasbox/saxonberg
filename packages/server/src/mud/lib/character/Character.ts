/**
 * Character - Abstract base class for all sentient beings (PCs and NPCs)
 *
 * The **agency** layer on top of `Creature` (the body layer). A
 * Character is a Creature that can act: execute commands, perceive,
 * speak, move, engage, and carry a narrative/social identity. The
 * body itself — identity, species/lifecycle, sex, anatomy slots,
 * posture, description, containment, vitals, reserves — lives on
 * `Creature` (`lib/creature/Creature.ts`).
 *
 * Composition (agency, inner→outer on `Creature`):
 *   Employed + BeliefStore + Persona + Gendered + Sensor + Perceiver +
 *   Perception + Vocal + Soul + Engaged + Hauler + Mobile + CommandGiver
 *
 * Commands are inherited from mixins and subclasses:
 * - ContainerMixin (on Creature) provides: inventory, get, drop
 * - PerceiverMixin provides: look / scry / locate
 * - Avatar provides: ping, help, player (diagnostic commands)
 *
 * Key Design Points:
 * - NO stat fields in Character itself (xp, level are PC-specific, deferred)
 * - ⚠ NO name surface. `NamedMixin` is NOT on Creature (since
 *   2026-09-10): a body is not a somebody. A character that IS somebody
 *   composes it — `CastMixin` does, and so does `Avatar`.
 * - pronouns come from GenderedMixin (social presentation — Character-tier)
 * - shortDescription/longDescription come from VisibleMixin (Creature)
 * - inventory management from ContainerMixin (Creature)
 * - Message capabilities from Sensor/Vocal mixins
 * - Movement capability from MobileMixin (traverse(), teleport())
 * - Container placement from ContainableMixin (Creature)
 * - Command execution from CommandGiverMixin (executeCommand, getAvailableCommands)
 *
 * Runtime-only class (no MongoDB collection).
 */

import { Creature } from '../creature/Creature';
import { GenderedMixin } from './Gendered';
import { PersonaMixin } from './Persona';
import { DispositionedMixin } from '../trait/Dispositioned';
import { MobileMixin } from '../spatial/Mobile';
import { HaulerMixin } from '../slot/Hauler';
import { SensorMixin } from '../message/Sensor';
import { PerceiverMixin } from '../description/Perceiver';
import { PerceptionMixin } from '../perception/Perception';
import { VocalMixin } from '../message/Vocal';
import { SoulMixin } from '../social/Soul';
import { CommandGiverMixin } from '../command/CommandGiver';
import { AdvancementMixin } from '../advancement/Advancement';
import { EngagedMixin } from '../activity/Engaged';
import { CasterMixin } from '../magic/Caster';
import { MemorizedMixin } from '../magic/Memorized';
import { BeliefStoreMixin } from '../belief/BeliefStore';
import { StatusMixin } from '../status/Status';
import { EmployedMixin } from '../employment/Employed';
import { CombatantMixin } from '../combat/Combatant';
import { HidingMixin } from '../concealment/Hiding';
import type { FieldMeta } from '../mixin';
import type { CombatHookContext } from '../combat/CombatHookContext';
import type { Stuff } from '../stuff/Stuff';
import { MixinApi } from '../../api/mixin';
import type { MarkupAugmenter } from '../../api/mml';

// Compose the agency mixins on top of the Creature body layer.
// Order matters:
// - PerceiverMixin sits directly above SensorMixin (it requires
//   Sensor for output routing) and owns the perception verb surface
//   as a separate role from Sensor's "I receive scene output."
//   Sensor + Perception together = the full perceiver substrate.
// - HaulerMixin sits between Mobile and Engaged. Position is free (it
//   only holds the hitched-cart live ref); placing it on Character gives
//   every PC and NPC-character the ability to pull a cart, while keeping
//   it off the broad Creature base (a frog / corpse never hauls).
//   LoadBearing (on Creature) reads its draft term dynamically via
//   MixinApi.isHauling, so stack position doesn't matter.
// - EngagedMixin sits immediately below MobileMixin so the body-slot
//   engagement (source of truth for `Mobile.getEngagedMode`) can be
//   read without forward references. Engagement is orthogonal to
//   mobility — a stationary forge-bound creature is Engaged but not
//   Mobile — but co-composing on Character gets both surfaces on
//   every PC and NPC in one shot.
// - ContainableMixin (on Creature) is inner of MobileMixin (which
//   uses setContainer/getContainer) — preserved inner→outer across
//   the body/agency boundary.
// - PersonaMixin + GenderedMixin (narrative + social identity) sit
//   innermost on the agency stack, above the Creature body.
// - BeliefStoreMixin (per-viewer identity memory) sits innermost of
//   all — it reads nothing from the other mixins, so position is free;
//   placing it at the base of the agency stack keeps every PC and NPC
//   (the viewer types) carrying it.
// - EmployedMixin carries "who answers for you" (`institutionPath`) as
//   well as the employment records — the harm ledger's `killerFor` /
//   `victimFor`. On Character rather than on NPC deliberately: "every
//   attribution has a person and a party" is true of a player too, and
//   an Avatar is neither Cast nor Extra.
// - AdvancementMixin sits OUTERMOST, above CommandGiverMixin: it pushes
//   competence-conferred verbs onto the giver's affordance stack, so it
//   needs CommandGiver's surface (pushCommandSource/popCommandSource) in
//   its base.
const CharacterBase = AdvancementMixin(
  CombatantMixin(
  CommandGiverMixin(
  MobileMixin(
    HaulerMixin(
    EngagedMixin(
      CasterMixin(
      MemorizedMixin(
      SoulMixin(
        VocalMixin(
          PerceptionMixin(
            PerceiverMixin(
              SensorMixin(
                GenderedMixin(
                  DispositionedMixin(
                  PersonaMixin(
                    StatusMixin(
                    BeliefStoreMixin(HidingMixin(EmployedMixin(Creature)))
                  )
                  )
                  )
                )
              )
            )
          )
        )
      )
      )
      )
    )
    )
  )
  )
  )
);

/**
 * ⭐⭐ **The mirror** — the body line `look <person>` prints.
 *
 * `Creature.bodyBuildPhrase()` is flesh × lean in the person register
 * (*wiry*, *in good flesh*, *running to fat*); this appends it as one
 * sentence about a body, naming nobody. It is a static on the
 * `Character` CLASS, not on a Creature-level mixin, because
 * `getAllMarkupAugmenters` walks constructors with `hasOwnProperty` —
 * so it reaches every person (PC and NPC) and **no animal**
 * (`Livestock`, `KeptAnimal` extend `Creature`), which is exactly the
 * host set: the stockman's read on an animal is byte-identical to what
 * it was. No guard re-narrows anything.
 *
 * ⚠ One culture's vocabulary today. The cosmetics slate's *Beauty*
 * section names this as the attach point a per-culture canon replaces;
 * the shape (facts in, a described line out) does not change.
 */
function bodyAugmenter(text: string, host: Stuff, _viewer: Stuff): string {
  if (!(host instanceof Creature)) return text;
  if (host.isDestroyed()) return text;
  if (!host.hasReserve('flesh')) return text;
  const phrase = host.bodyBuildPhrase();
  const line = `${phrase.charAt(0).toUpperCase()}${phrase.slice(1)}.`;
  return text && text.length > 0 ? `${text}\n\n${line}` : line;
}

/**
 * Character abstract class - base for all sentient beings.
 *
 * Type checking should use TypeScript's type system:
 * - `avatar instanceof Avatar` - check if player character
 * - `avatar instanceof Creature` - check if it has a body
 * - `npc instanceof NPC` - check if NPC (when we implement NPCs)
 */
export abstract class Character extends CharacterBase {
  /** The body line on `look` — see {@link bodyAugmenter}. People only. */
  static markupAugmenters: MarkupAugmenter[] = [bodyAugmenter];

  /**
   * Domicile — the address-namespace string (an identity ref) of this
   * character's home, or `null` when none was ever established. The
   * civics residency read (`GovernmentApi.residentOf`) derives the
   * character's government chain from it.
   *
   * **Persists-until-replaced is structural**: nothing ever clears this
   * field — a new home overwrites it, losing a dwelling leaves it
   * standing (homelessness is no dwelling, not no civic identity).
   * Writers are residence content (the dorm lease grant stamps it);
   * see docs/subsystems/civics.md § the domicile seam.
   */
  protected _domicileAddress: string | null = null;

  static fieldMeta: FieldMeta = {
    _domicileAddress: { persistent: true },
  };

  /**
   * ⭐⭐ **Put these garments on.** Clone each template path, move it
   * onto this body, and occupy the slots its own `slotClaim` names for
   * this body plan.
   *
   * Lives on `Character` because both rungs of person need it and
   * nothing below does — an animal is not dressed. The **field** that
   * says what an authored person wears is `NPC.wears`, because a player
   * dresses at enroll rather than by a row.
   *
   * ⚠ Why this exists at all: a naked body pays the cold branch, and
   * **no `cast:` row could author clothing** — there was no `wears:`,
   * no `worn:`, no `outfit:` on any NPC class or archetype in the tree,
   * and `props:` places onto a `Surfaced` host, not onto a person. So
   * every authored person in the realm was naked, and the only reason
   * it never showed is that every interior was 21 °C by decree. The
   * envelope build removes the decree.
   *
   * ⭐ It is also the recipe `TestHooks` was carrying privately to keep
   * wire characters from collapsing of cold at the seventh game hour.
   * One recipe now, in the mudlib, called by both.
   *
   * Tolerant of a missing or unwearable garment, exactly as `embody`
   * is: a bad path costs that garment, not the character.
   *
   * Idempotent: a garment whose slots are already occupied by something
   * this body is wearing is skipped, so a re-clone or a second call
   * does not stack two shirts on one chest.
   */
  public async wearGarments(paths: readonly string[]): Promise<void> {
    if (paths.length === 0) return;
    const { StuffApi } = await import('../../api/stuff');
    const { ContainmentApi } = await import('../../api/containment');
    const self = this as unknown as Stuff;
    const bodyPlanPath = MixinApi.isOrganism(self)
      ? (self.getSpecies()?.getBodyPlanPath() ?? null)
      : null;
    for (const path of paths) {
      try {
        const garment = await StuffApi.clone(path);
        if (!MixinApi.isContainable(garment)) continue;
        ContainmentApi.move(garment, self as never);
        if (bodyPlanPath && MixinApi.isWearable(garment)) {
          const slots = garment.getSlotClaim(bodyPlanPath);
          if (slots.length) {
            (self as unknown as {
              occupyAll(g: unknown, s: readonly string[]): void;
            }).occupyAll(garment, slots);
          }
        }
      } catch {
        /* a bad garment costs that garment, not the character */
      }
    }
  }

  public getDomicileAddress(): string | null {
    return this._domicileAddress;
  }
  public setDomicileAddress(value: string | null): void {
    if (value !== null && typeof value !== 'string') {
      throw new TypeError(
        'Character._domicileAddress must be a string or null',
      );
    }
    const trimmed = value?.trim() ?? '';
    if (trimmed.length === 0) return; // never clears — persists-until-replaced
    this._domicileAddress = trimmed;
  }

  /**
   * ⭐ A combat exchange is work. The override lives HERE, not on a
   * Creature-level mixin: `CombatantMixin` is composed outer of the
   * whole `Creature` body, so an override below it would lose to the
   * mixin's own no-op terminal. The mixin owns the dials.
   */
  override onExchangeResolved(ctx: CombatHookContext): void {
    super.onExchangeResolved(ctx);
    if (MixinApi.isExerting(this)) this.exertExchange();
  }

  /**
   * Constructor.
   * Subclasses should call super() and then initialize.
   */
  constructor() {
    super();
  }
}
