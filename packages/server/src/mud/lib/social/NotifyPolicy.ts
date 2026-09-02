/**
 * NotifyPolicyMixin — the per-character ordered store of attention rules
 * (the structural sibling of `ContactsMixin`'s `_contacts`). Composed on
 * every Avatar at the same site as Contacts; NPCs opt in like Contacts.
 *
 * **Pure storage.** This mixin holds the ordered `NotifyRule[]` and the
 * dumb CRUD/reorder primitives over it — no resolution logic, no virtual
 * baseline, no soft-cap. Strict-ordered first-match resolution lives in
 * `SocialLogic` (behind `SocialApi`); the 50-rule soft cap is enforced at
 * `notify` set-time (the controller), mirroring how Contacts keeps storage
 * dumb. The only setting the mixin owns is the global `social.verbosity`
 * dial (schema-on-mixin, the `EnvironmentMixin` pattern).
 *
 * See [docs/subsystems/social-graph.md] and
 * [docs/requirements/social-graph-requirements.md].
 */

import type { MixinConstructor, FieldMeta } from "../mixin";
import type { CommandContributions } from "../../api/command";
import {
  SettingTypes,
  type SettingsSchemaEntry,
} from "../shell/Environment";
import type { GroupRef } from "./GroupProvider";
import { PRESENCE_FORMAT_DEFAULT, type NotifyRule } from "./NotifyRule";
import type { Stuff } from "../stuff/Stuff";
import type { Mml } from "../../api/mml";
import type {
  ResolvedRule,
  RuleForOptions,
  SetResult,
  ProfileCard,
  RosterRow,
} from "../../api/social";
import { StuffApi } from "../../api/stuff";
// eslint-disable-next-line no-restricted-imports -- the F2 viewer face: a NotifyPolicy host's rule resolution + display-lens composes forward into the social logic singletons exactly as the api/social facade does (the Combustible/Energized precedent)
import { SocialLogic } from "../../platform/idea/api/SocialLogic";
// eslint-disable-next-line no-restricted-imports -- same seam, the presence half
import { PresenceLogic } from "../../platform/idea/api/PresenceLogic";
// eslint-disable-next-line no-restricted-imports -- same seam, the profile half
import { ProfileLogic } from "../../platform/idea/api/ProfileLogic";

/** Resolve the HMR-able social logic singletons (sync). */
function socialLogic(): SocialLogic {
  return StuffApi.singletonSync(
    "/platform/idea/api/social",
    () => new SocialLogic(),
  );
}
function presenceLogic(): PresenceLogic {
  return StuffApi.singletonSync(
    "/platform/idea/api/presence",
    () => new PresenceLogic(),
  );
}
function profileLogic(): ProfileLogic {
  return StuffApi.singletonSync(
    "/platform/idea/api/profile",
    () => new ProfileLogic(),
  );
}

/**
 * Public method surface — methods only, per the inter-stuff contract.
 * `_notifyRules` is a public field so the Hydrator can reflect into it,
 * but it is NOT part of the contract surface; external code goes through
 * these methods (or, for resolution, `SocialApi`).
 */
export interface NotifyPolicy {
  /** Stored rules in list order (precedence order). Read-only snapshot. */
  notifyRules(): readonly NotifyRule[];
  /**
   * Replace the rule with the same `groupRef` in place, or append at the
   * tail when none exists. The caller supplies the fully-built rule.
   */
  upsertNotifyRule(rule: NotifyRule): void;
  /**
   * Like {@link upsertNotifyRule}, but a *newly-inserted* rule lands at
   * `position` (clamped to the list bounds) rather than at the tail. An
   * existing rule with the same `groupRef` is still replaced in place and
   * never moved. The caller owns the position semantics (e.g. reserved-rank
   * ordering) — this stays dumb storage.
   */
  upsertNotifyRuleAt(rule: NotifyRule, position: number): void;
  /** Drop the rule keyed on `groupRef`. Returns true if anything changed. */
  removeNotifyRule(groupRef: GroupRef): boolean;
  /**
   * Move the rule keyed on `groupRef` directly above / below `anchor`.
   * Both must already be stored. Returns true on a successful move.
   */
  reorderNotifyRule(
    groupRef: GroupRef,
    anchor: GroupRef,
    where: "above" | "below",
  ): boolean;

  // The viewer face (F2) — policy resolution + display lensing,
  // forwarding into the social logic singletons.
  /** First-matching effective rule for `person` (virtual baseline + tail). */
  resolveNotifyRule(person: Stuff, opts?: RuleForOptions): Promise<ResolvedRule>;
  /** The effective ordered rule list (stored spliced into the baseline). */
  effectiveNotifyRules(): NotifyRule[];
  /** Policy upsert on `ref`, merging `patch` (the `notify` verb's write). */
  setNotifyRule(ref: GroupRef, patch: Partial<NotifyRule>): SetResult;
  /** Policy drop of the rule keyed on `ref` (falls to the baseline tail). */
  clearNotifyRule(ref: GroupRef): boolean;
  /** Policy reorder of `ref` directly above/below `anchor`. */
  moveNotifyRule(ref: GroupRef, anchor: GroupRef, where: "above" | "below"): boolean;
  /** Restyle a speaker's buffered message per this viewer's first match. */
  styleMessageFrom(speaker: Stuff, body: Mml): Promise<Mml>;
  /** The per-viewer room-occupant block (density-collapsed, boosted). */
  composeOccupants(occupants: Stuff[], roomSize: number): Promise<Mml>;
  /** The full inspection card for `target`, viewer-redacted. */
  composeProfileCard(target: Stuff): Promise<ProfileCard>;
  /** The one viewer-lensed roster row for `target` (`who` / live card). */
  composeRosterRow(target: Stuff): Promise<RosterRow>;
  /** Push a full viewer-lensed roster snapshot to this viewer's session. */
  snapshotRoster(): void;
}

export function NotifyPolicyMixin<TBase extends MixinConstructor>(Base: TBase) {
  return class NotifyPolicyMixin extends Base implements NotifyPolicy {
    static _mixinName = "NotifyPolicyMixin";

    /**
     * The hydrator round-trips `_notifyRules` by reflection. Entries are
     * plain-JSON objects (the `ContactsMixin._contacts` precedent), so no
     * marshaller is needed.
     */
    static fieldMeta: FieldMeta = {
      _notifyRules: { persistent: true, runtimeState: true },
    };


    /**
     * The global verbosity dial — schema-on-mixin (declared here, not on
     * the `EnvironmentMixin` substrate). Shifts the room-occupant density
     * collapse aggressiveness (consumed by the Phase-2 formatter).
     */
    static settings: SettingsSchemaEntry[] = [
      {
        key: "social.verbosity",
        type: SettingTypes.Enum,
        enumValues: ["minimal", "standard", "verbose"],
        default: "standard",
        description:
          "Room-occupant collapse aggressiveness. `standard` is the " +
          "density-aware default; `verbose` names everyone; `minimal` " +
          "aggregates aggressively even at low density.",
      },
      {
        key: "social.presenceFormat",
        type: SettingTypes.String,
        default: PRESENCE_FORMAT_DEFAULT,
        description:
          "Liquid template for a presence line (someone entering / leaving " +
          "the game). Variables: {{ who }} (viewer-aware name), " +
          "{{ action }} (e.g. 'entered the game'), {{ event }}, " +
          "{{ category }} (arrival|departure), {{ is_arrival }}, " +
          "{{ country }}. Example: " +
          "\"{{ who }} {{ action }}{% if country %} ({{ country }}){% endif %}\".",
      },
      {
        key: "privacy.showStatus",
        type: SettingTypes.Enum,
        enumValues: ["anyone", "contacts+"],
        default: "anyone",
        description:
          "Who may see your granular presence status (engaged / idle) on " +
          "`who` / `profile`. `anyone` offers it to strangers; `contacts+` " +
          "shows only bare online to strangers and the detail to your " +
          "contacts. Bare online is always public — privacy is a disclosure " +
          "floor, never a way to vanish.",
      },
    ];

    /**
     * Player-facing verb operating on this mixin's store. Picked up by
     * `CommandGiver` discovery via the `self` slot (the Contacts pattern).
     */
    static commandContributions: CommandContributions = {
      self: ["platform/cmd/social/notify.yaml"],
      peers: [],
      environment: [],
    };

    /**
     * Persistent storage. Default `[]` matches the Contacts / Alias
     * legacy-tolerant pattern — existing avatar docs without the field
     * hydrate cleanly.
     */
    _notifyRules: NotifyRule[] = [];

    notifyRules(): readonly NotifyRule[] {
      return this._notifyRules;
    }

    upsertNotifyRule(rule: NotifyRule): void {
      const idx = this._notifyRules.findIndex(
        (r) => r.groupRef === rule.groupRef,
      );
      if (idx >= 0) this._notifyRules[idx] = rule;
      else this._notifyRules.push(rule);
    }

    upsertNotifyRuleAt(rule: NotifyRule, position: number): void {
      const idx = this._notifyRules.findIndex(
        (r) => r.groupRef === rule.groupRef,
      );
      if (idx >= 0) {
        this._notifyRules[idx] = rule;
        return;
      }
      const at = Math.max(0, Math.min(position, this._notifyRules.length));
      this._notifyRules.splice(at, 0, rule);
    }

    removeNotifyRule(groupRef: GroupRef): boolean {
      const before = this._notifyRules.length;
      this._notifyRules = this._notifyRules.filter(
        (r) => r.groupRef !== groupRef,
      );
      return this._notifyRules.length < before;
    }

    reorderNotifyRule(
      groupRef: GroupRef,
      anchor: GroupRef,
      where: "above" | "below",
    ): boolean {
      if (groupRef === anchor) return false;
      const moving = this._notifyRules.find((r) => r.groupRef === groupRef);
      const hasAnchor = this._notifyRules.some((r) => r.groupRef === anchor);
      if (!moving || !hasAnchor) return false;
      const without = this._notifyRules.filter((r) => r.groupRef !== groupRef);
      const anchorIdx = without.findIndex((r) => r.groupRef === anchor);
      const insertAt = where === "above" ? anchorIdx : anchorIdx + 1;
      without.splice(insertAt, 0, moving);
      this._notifyRules = without;
      return true;
    }
    // ---- the viewer face (F2) — forwards into the logic singletons ----

    public resolveNotifyRule(
      person: Stuff,
      opts?: RuleForOptions,
    ): Promise<ResolvedRule> {
      return socialLogic().ruleFor(this as unknown as Stuff, person, opts ?? {});
    }

    public effectiveNotifyRules(): NotifyRule[] {
      return socialLogic().listRules(this as unknown as Stuff);
    }

    public setNotifyRule(ref: GroupRef, patch: Partial<NotifyRule>): SetResult {
      return socialLogic().setRule(this as unknown as Stuff, ref, patch);
    }

    public clearNotifyRule(ref: GroupRef): boolean {
      return socialLogic().removeRule(this as unknown as Stuff, ref);
    }

    public moveNotifyRule(
      ref: GroupRef,
      anchor: GroupRef,
      where: "above" | "below",
    ): boolean {
      return socialLogic().reorderRule(this as unknown as Stuff, ref, anchor, where);
    }

    public styleMessageFrom(speaker: Stuff, body: Mml): Promise<Mml> {
      return socialLogic().styleMessageFor(this as unknown as Stuff, speaker, body);
    }

    public composeOccupants(
      occupants: Stuff[],
      roomSize: number,
    ): Promise<Mml> {
      return socialLogic().composeOccupants(
        this as unknown as Stuff,
        occupants,
        roomSize,
      );
    }

    public composeProfileCard(target: Stuff): Promise<ProfileCard> {
      return profileLogic().composeCard(this as unknown as Stuff, target);
    }

    public composeRosterRow(target: Stuff): Promise<RosterRow> {
      return profileLogic().composeRow(this as unknown as Stuff, target);
    }

    public snapshotRoster(): void {
      void presenceLogic().snapshotFor(this as never);
    }
  };
}
