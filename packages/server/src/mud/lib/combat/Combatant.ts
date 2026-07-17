/**
 * CombatantMixin — the capability "I can fight" (composed on `Character`).
 *
 * Carries **no** transient fight state — poise, tempo, and flags all live
 * on the {@link CombatSession}, never on the `Creature` (they evaporate at
 * session end). What lives here is durable and small:
 *
 *   - the combat verb affordances (`attack` / `status` / `yield` plus the
 *     demonstrative gambits `strike` / `disarm` / `subdue` / `shove`),
 *     contributed statically and gated at **attempt-time** by
 *     `CombatApi.eligibilityFor` (the terminal-only build needs only the
 *     attempt-time reject; the client-pane "menu greys itself" defers with
 *     the pane);
 *   - the **innate attack** hook: a species-declared natural weapon
 *     (`naturalAttackChannel`, e.g. a wolf's `point` bite). Humanoids
 *     leave it empty — fisticuffs / grapple depth is deferred in
 *     materials-response-slate — so a disarmed or impaired-limb humanoid
 *     genuinely *loses* `strike`, while a natural-weapon beast keeps it;
 *   - a `look` extension: a banded, perception-safe combat-state line
 *     appended to the host's long description while a fight is live.
 *
 * See docs/subsystems/combat.md.
 */

import type { MixinConstructor } from "../mixin";
import type { CommandContributions } from "../../api/command";
import type { MarkupAugmenter } from "../../api/mml";
import type { Stuff } from "../stuff/Stuff";
import type { Channel } from "../material/Channel";
import { CHANNELS } from "../material/Channel";
import { CombatApi } from "../../api/combat";
import {
  SettingTypes,
  type SettingsSchemaEntry,
} from "../shell/Environment";
import { LETHALITIES, STOP_CONDITIONS } from "./CombatTerms";

/** Public method surface for CombatantMixin. */
export interface Combatant {
  /** The species-declared innate attack channel, or null (no natural
   * weapon — disarm/impair removes `strike`). */
  getNaturalAttackChannel(): Channel | null;
  /** The authored standing lethality posture (`''` = none authored). The
   * consent handshake reads this so an NPC can declare it fights to the
   * death — NPCs aren't `Environment`s and so can't carry the player-side
   * `combat.lethality` *setting*. */
  getStandingLethality(): string;
  /** The authored standing stop-condition posture (`''` = none). */
  getStandingStopCondition(): string;
}

export function CombatantMixin<TBase extends MixinConstructor>(Base: TBase) {
  return class CombatantMixin extends Base implements Combatant {
    static _mixinName = "CombatantMixin";
    static persistentFields = [
      "naturalAttackChannel",
      "standingLethality",
      "standingStopCondition",
    ];

    /**
     * The species' innate attack channel — `edge` (claws), `point`
     * (bite/horn), `blunt` (hooves/fists). Empty = no natural weapon.
     *
     * @authorable
     */
    public naturalAttackChannel: string = "";

    /**
     * The authored **standing combat posture** — the terms this
     * combatant brings to a fight, read by the consent handshake. The
     * player-side surface is the `combat.lethality` / `combat.stopCondition`
     * *settings* (below), but those only resolve for `Environment` hosts;
     * an NPC isn't an Environment, so a duelist authors its posture here
     * instead (`'lethal'` / `'death'`). Empty = no authored posture (the
     * frictionless non-lethal default).
     *
     * @authorable
     */
    public standingLethality: string = "";
    /** @authorable */
    public standingStopCondition: string = "";

    getStandingLethality(): string {
      return this.standingLethality;
    }
    getStandingStopCondition(): string {
      return this.standingStopCondition;
    }

    getNaturalAttackChannel(): Channel | null {
      const c = this.naturalAttackChannel;
      return c && (CHANNELS as readonly string[]).includes(c)
        ? (c as Channel)
        : null;
    }

    /**
     * Combat affordances — two verbs: `attack <target>` opens a fight,
     * and `fight` handles everything inside one (the read, the gambits,
     * yield) via subcommands. The gambit subcommands reject at
     * attempt-time when not in combat or when the instrument/limb is
     * unavailable (`CombatApi.eligibilityFor`).
     */
    static commandContributions: CommandContributions = {
      self: [
        "combat/attack.yaml",
        "combat/fight.yaml",
        "combat/intervene.yaml",
        "combat/defend.yaml",
      ],
      environment: [],
      inventory: [],
      peers: [],
    };

    /**
     * A character's **standing combat posture** — the terms they bring to
     * every fight, which pre-answer the consent handshake. `AttackController`
     * reads these to build each side's proposal: when the two sides agree
     * on lethality the fight folds silently; when they conflict a live
     * defender is prompted, and an NPC has its terms imposed. So a duelist
     * who declares `combat.lethality lethal` **consents** to a lethal
     * challenge (no crime); a townsperson at the non-lethal default does
     * not (the imposed-terms crime path).
     */
    static settings: SettingsSchemaEntry[] = [
      {
        key: "combat.lethality",
        type: SettingTypes.Enum,
        enumValues: [...LETHALITIES],
        default: "non-lethal",
        description:
          "Your standing lethality — the terms you bring to a fight. " +
          "`non-lethal` (a bout) or `lethal` (you fight to wound and, " +
          "if it comes to it, to kill). Matching lethality opens a fight " +
          "silently; a mismatch prompts (or imposes on an NPC).",
      },
      {
        key: "combat.stopCondition",
        type: SettingTypes.Enum,
        enumValues: [...STOP_CONDITIONS],
        default: "yield",
        description:
          "How far your standing terms carry a fight: `first-blood`, " +
          "`yield`, `incapacitation`, or `death`. The two sides fold to " +
          "the milder of their stop-conditions.",
      },
    ];

    static markupAugmenters: MarkupAugmenter[] = [combatStateAugmenter];
  };
}

/**
 * Append a banded combat-state line to a combatant's long description
 * while a fight is live. Bands only (the condition-band doctrine) —
 * poise is already banded and flags are boolean, so nothing leaks a
 * scalar. Server-authoritative; the client never receives hidden state.
 */
function combatStateAugmenter(
  text: string,
  host: Stuff,
  _viewer: Stuff,
): string {
  const session = CombatApi.sessionFor(host);
  if (!session) return text;
  const state = session.getState(host);
  if (!state) return text;
  const parts: string[] = [state.poise.band()];
  for (const flag of state.flags.list()) parts.push(flag);
  if (state.down) parts.push("down");
  const line = `In combat — ${parts.join(", ")}.`;
  return text && text.length > 0 ? `${text}\n\n${line}` : line;
}
