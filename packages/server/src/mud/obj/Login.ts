/**
 * Login — per-connection Idea that bootstraps a connected user into a
 * character (or into char-gen to create one).
 *
 * Login owns the Interactive for the pre-world window. On `enter()` it
 * branches on how many characters the user has:
 *   - **0** → char-gen: Login hosts the `enroll` flow (it's a real
 *     `CommandGiver`), accumulating picks in an `EnrollmentDraft` until
 *     `enroll confirm` commits a fresh Avatar. Login then destructs.
 *   - **≥1** → the character-select roster: Login emits the roster and
 *     stays alive; the `play <playerId>` verb hands off to the chosen
 *     Avatar and destructs Login.
 *
 * Login is a real `CommandGiver` (so char-gen runs on the genuine
 * command pipeline — the player meets our CLI from keystroke one) with
 * a tight verb allowlist (`enroll`/`play`), and a `Sensor` (so the
 * de-emphasized char-gen terminal shows system/narration frames). It is
 * locationless by design; the dispatch location-guard was relaxed to
 * allow incorporeal givers (see CommandGiver.executeCommand).
 *
 * Lifetime: constructed once per login; destructed at handoff (play) or
 * char-gen commit. As a transient Idea it's the natural zero-cleanup
 * home for the in-progress `EnrollmentDraft`.
 */

import { SecurityApi } from "../api/security";
import { Idea } from "../lib/stuff/Idea";
import { StuffApi } from "../api/stuff";
import { AppApi } from "../api/app";
import { AppSettingKeys } from "../lib/config/AppSettings";
import { ConnectionApi } from "../api/connection";
import { PlayerApi } from "../api/player";
import { MessageApi } from "../api/message";
import { Mml } from "../api/mml";
import { ContainmentApi } from "../api/containment";
import { MixinApi } from "../api/mixin";
import { SlotApi } from "../api/slot";
import { Template } from "../lib/stuff/Template";
import { NameBank } from "../lib/species/NameBank";
import { HasInteractiveMixin } from "../lib/connection/HasInteractive";
import { SensorMixin } from "../lib/message/Sensor";
import { CommandGiverMixin } from "../lib/command/CommandGiver";
import { Application } from "../../backend/Application";
import { GoogleProfile } from "../lib/identity/GoogleProfile";
import Avatar from "./Avatar";
import type { CommandContributions } from "../api/command";
import type {
  MessageFrame,
  EnvelopeTemplate,
  CharGenRosterEntry,
  CharGenRosterPayload,
} from "@saxonberg/types";
import type Interactive from "./Interactive";
import type Species from "../lib/species/Species";
import type { User } from "../lib/identity/User";

/** Random element of an array (undefined when empty). */
function pickRandom<T>(arr: readonly T[]): T | undefined {
  return arr.length > 0
    ? arr[Math.floor(Math.random() * arr.length)]
    : undefined;
}

/**
 * In-progress char-gen picks. Held on the transient Login (GC'd at
 * commit → no draft persistence, no completion flag). Mutated by
 * `EnrollController`; read by its commit.
 */
export interface EnrollmentDraft {
  /** The player's real (Google) given name — seeds the name suggester. */
  realName?: string;
  /** The player's account display name (Google `displayName`) — shown on
   * the name step for reference. */
  accountName?: string;
  /** Chosen species roster key (e.g. `'elf'`). */
  speciesKey?: string;
  /** Resolved species template path. */
  speciesPath?: string;
  /** Species common name, for display. */
  speciesCommonName?: string;
  /** Cached species sex-determination system (drives the sex sub-pick). */
  sexSystem?: string;
  /** Chosen biological sex (species-constrained). */
  sex?: string;
  /** Chosen given name. */
  name?: string;
  /** Chosen surname. */
  surname?: string;
  /** Chosen pronoun key. */
  pronouns?: string;
  /** Chosen aspiration key. */
  aspiration?: string;
  /** Current name suggestion (drives the name fields' pre-fill). */
  suggestion?: { name: string; surname?: string };
}

const LoginBase = CommandGiverMixin(SensorMixin(HasInteractiveMixin(Idea)));

export default class Login extends LoginBase {
  /**
   * Verb allowlist for the pre-world phase. The recency stack IS the
   * sandbox — no world verbs (go/say/take) leak because Login composes
   * none of the mixins that contribute them. (`style` rides along from
   * HasInteractiveMixin; harmless.)
   */
  static commandContributions: CommandContributions = {
    self: ["charactergen/enroll.yaml", "charactergen/play.yaml"],
    environment: [],
    inventory: [],
    peers: [],
  };

  /**
   * Reserved first word of every guest name (e.g. "Guest Mallow"). Two
   * jobs: it makes guest-ness legible in plain text wherever the Named
   * name appears (speech/emote attribution, look, logs — a UI badge
   * can't reach those), and it is withheld from real character naming
   * (the char-gen `enroll` denylist imports it) so a real player can't
   * impersonate a guest. Lives here on the guest-mint site. Exact-word
   * only; fuzzy/homoglyph near-misses are out of scope.
   */
  static readonly GUEST_RESERVED_WORD = "Guest";

  private readonly interactive: Interactive;
  private enrollmentDraft: EnrollmentDraft | null = null;

  constructor(interactive: Interactive) {
    super();
    this.interactive = interactive;
    this.addInteractive(interactive);
  }

  /** The in-progress char-gen draft (null outside char-gen). */
  public getEnrollmentDraft(): EnrollmentDraft | null {
    return this.enrollmentDraft;
  }

  public setEnrollmentDraft(draft: EnrollmentDraft): void {
    this.enrollmentDraft = draft;
  }

  /**
   * Run the entry procedure: take ownership of the connection, then
   * branch on character count (0 → char-gen, ≥1 → roster).
   */
  public async enter(): Promise<void> {
    const { interactive } = this;
    ConnectionApi.transfer(interactive, this);

    // Anonymous session → mint a throwaway guest avatar and drop straight
    // into the lounge (no roster, no char-gen). This is the ONE place the
    // "anonymous session → guest character" policy lives; the auth axis
    // (user.anonymous) and the character axis (avatar.isGuest) meet here.
    if (interactive.getUser().anonymous) {
      await this.enterAsGuest();
      return;
    }

    const avatars = await PlayerApi.loadAvatarsForUser(interactive.getUser());

    if (avatars.length === 0) {
      // New user (empty roster) → create a character via char-gen.
      await this.enterCharGen();
      return;
    }

    // Returning user → character-select roster. Login stays alive; the
    // `play <playerId>` verb performs the handoff + destruct.
    this.presentRoster(avatars);
  }

  /**
   * Mint a throwaway guest avatar from the seed and hand off to it. The
   * guest gets a generated reserved-word name ("Guest Mallow"), spawns
   * in the lounge (the seed's `startLocation`), persists nothing, and is
   * reaped when its connection drops (`Avatar.onLinkdead`). Mirrors
   * `playCharacter`'s handoff shape, minus all the per-character
   * template / roster / ownership machinery.
   */
  public async enterAsGuest(): Promise<void> {
    const { interactive } = this;
    const avatar = await Login.mintRandomGuestAvatar(interactive.getUser());
    ConnectionApi.transfer(interactive, avatar);
    console.info(`Login: Guest connected - ${avatar.getFullName()}`);
    await avatar.enter(interactive, { firstArrival: true });
    StuffApi.destruct(this);
  }

  /**
   * Generate a recognizable guest name: the reserved word plus a
   * surname drawn from the real `common` `NameBank` ("Guest Mallow").
   * No parallel name list — when the bank is unseeded (a content gap,
   * or no DB in a unit test) the guest is simply "Guest", with no
   * fabricated surname. Pure read; safe to call before mint.
   */
  static async generateGuestName(): Promise<{
    name: string;
    surname?: string;
  }> {
    let surnames: string[] = [];
    try {
      surnames = (await NameBank.resolve(["common"])).surname;
    } catch {
      /* NameBank unavailable (e.g. no DB) — degrade to a bare "Guest" */
    }
    const surname = pickRandom(surnames);
    return surname
      ? { name: Login.GUEST_RESERVED_WORD, surname }
      : { name: Login.GUEST_RESERVED_WORD };
  }

  /**
   * Mint a randomized guest avatar — the no-char-gen fast path. Mirrors
   * `EnrollController.commit`'s avatar build, but: every pick is random
   * (species, a non-intersex sex, an aspiration → bio + themed outfit),
   * pronouns are always they/them, and the name is the reserved-word
   * guest name. The roster + sex-set knowledge is read from
   * `EnrollController` (`loadConfig` / `validSexSet`) so the two paths
   * stay in agreement; the build itself lives here, at the guest-mint
   * site.
   *
   * The template is **transient** — guests persist nothing, so it's
   * deleted immediately after the clone (the live avatar is independent
   * of it, and its guarded `save()` never writes back). The unique
   * per-guest template path also means no two guests clone the same
   * path, so there's no seed-clone concurrency hazard.
   */
  private static async mintRandomGuestAvatar(user: User): Promise<Avatar> {
    // Read the char-gen rosters + sex-set rule from EnrollController via a
    // lazy import (it dynamic-imports nothing back, so no static cycle).
    const { default: EnrollController, validSexSet } = await import(
      "./command/charactergen/EnrollController"
    );
    const cfg = EnrollController.loadConfig();
    const seed = await Template.findByPath(Avatar.SEED_TEMPLATE_PATH);
    if (!seed) {
      throw new Error("Login.mintRandomGuestAvatar: no Avatar seed template.");
    }

    const speciesEntry = pickRandom(cfg.species);
    const aspiration = pickRandom(cfg.aspirations);
    const species = speciesEntry
      ? await StuffApi.singleton<Species>(speciesEntry.path)
      : null;

    // Random biological sex, NEVER intersex. A sexless species → unset.
    let sex: string | undefined;
    if (species) {
      const choices = validSexSet(species.getSexDeterminationSystem()).filter(
        (s) => s !== "intersex",
      );
      sex = pickRandom(choices);
    }

    const guestName = await Login.generateGuestName();

    // Transient template at a unique guest path. Pronouns are NOT
    // overridden — the seed's `they` carries through (always they/them).
    const path = `${Avatar.TEMPLATE_PATH_PREFIX}guest-${SecurityApi.uuid()}`;
    const data: Record<string, unknown> = {
      ...seed.data,
      // Guests spawn at the same app-config default as enrolled avatars
      // (the seed YAML no longer carries a startLocation literal).
      startLocation: AppApi.setting(AppSettingKeys.defaultStartLocation),
      name: guestName.name,
      _speciesPath: speciesEntry?.path,
      aspiration: aspiration?.key,
      bio: aspiration?.bioSeed ?? "",
      longDescription:
        species?.getLongDescription() ||
        (seed.data as Record<string, unknown>).longDescription,
    };
    if (guestName.surname) data.surname = guestName.surname;

    // No playerId → not registered with PlayerApi; `isGuest` marks it.
    // The guest data rides the clone's `dataOverlay` and the random
    // guest path is minted via `asTemplatePath` — no transient template
    // row to write and delete (the identity doctrine: rows are for
    // authored content; a throwaway guest gets none).
    const avatar = await StuffApi.clone<Avatar>(
      Avatar.SEED_TEMPLATE_PATH,
      { user, isGuest: true },
      { dataOverlay: data, asTemplatePath: path },
    );

    // Sex is species-constrained, so set it post-clone (as `commit` does).
    if (sex) {
      try {
        avatar.setSex(sex);
      } catch {
        /* species rejected the value — leave unset */
      }
    }

    // Dress in the aspiration's themed outfit (tolerant of content gaps).
    if (aspiration && species) {
      const bodyPlanPath = species.getBodyPlanPath();
      for (const garmentPath of aspiration.outfit) {
        try {
          const garment = await StuffApi.clone(garmentPath);
          if (!MixinApi.isContainable(garment)) continue;
          ContainmentApi.move(garment, avatar);
          if (bodyPlanPath && MixinApi.isWearable(garment)) {
            const slots = garment.getSlotClaim(bodyPlanPath);
            if (slots.length) SlotApi.occupyAll(avatar, garment, slots);
          }
        } catch {
          /* skip this garment */
        }
      }
    }

    return avatar;
  }

  /**
   * Begin char-gen: seed the draft with the player's real name (for the
   * name suggester) and emit the initial state frame by dispatching the
   * bare `enroll` verb through the real command pipeline.
   */
  public async enterCharGen(): Promise<void> {
    const { realName, accountName } = await this.resolveNames();
    this.enrollmentDraft = {
      ...(realName ? { realName } : {}),
      ...(accountName ? { accountName } : {}),
    };
    MessageApi.scene(this)
      .topic("system.charactergen.welcome")
      .toSelf(
        Mml.compose`Welcome to enrollment. Let's get you a body and a name.`,
      )
      .send();
    // Dispatch the bare verb to emit the first char-gen-state frame via
    // EnrollController — same pipeline the player will use.
    await this.executeCommand("enroll", { interactive: this.interactive });
  }

  /**
   * Hand off to a chosen character. Validates ownership, transfers the
   * Interactive, starts the avatar's session, and destructs Login.
   * Invoked by `PlayController` for `play <playerId>`.
   */
  public async playCharacter(playerId: string): Promise<boolean> {
    const user = this.interactive.getUser();
    if (!user.playerIds.includes(playerId)) return false;
    const avatars = await PlayerApi.loadAvatarsForUser(user);
    const avatar = avatars.find((a) => a.getPlayerId() === playerId);
    if (!avatar) return false;
    ConnectionApi.transfer(this.interactive, avatar);
    console.info(`Login: User connected - ${avatar.getFullName()}`);
    await avatar.enter(this.interactive);
    StuffApi.destruct(this);
    return true;
  }

  /**
   * Emit the character-select roster frame. Login stays alive awaiting
   * a `play <playerId>` (or `enroll` to create a new character).
   */
  private presentRoster(avatars: Avatar[]): void {
    const characters: CharGenRosterEntry[] = avatars.map((a) => ({
      playerId: a.getPlayerId(),
      name: a.getFullName(),
      species: a.getSpecies()?.getCommonNames()[0] ?? "unknown",
      description: a.getShortDescription?.() ?? "",
    }));
    const payload: CharGenRosterPayload = { characters };
    MessageApi.scene(this)
      .topic("system.charactergen.roster")
      .toSelf(Mml.compose`Choose a character, or create a new one.`)
      .payload(payload)
      .send();
  }

  /**
   * Best-effort lookup of the player's real names from their account
   * profile: the given name seeds the suggester, the display name is
   * shown on the name step for reference.
   */
  private async resolveNames(): Promise<{
    realName?: string;
    accountName?: string;
  }> {
    try {
      const user = this.interactive.getUser();
      if (!user.googleProfileId) return {};
      const profile = await GoogleProfile.findById(user.googleProfileId);
      const given = profile?.givenName;
      const display = profile?.displayName;
      return {
        realName: given && given.length > 0 ? given : undefined,
        accountName: display && display.length > 0 ? display : undefined,
      };
    } catch {
      return {};
    }
  }

  /** SensorMixin delivery — multiplex frames to the connected Interactive(s). */
  protected override handleMessage(frame: MessageFrame): void {
    const app = Application.get();
    for (const interactive of this.interactives) {
      app.sendMessageToInteractive(interactive, frame);
    }
  }

  protected override handleEnvelope(envelope: EnvelopeTemplate): void {
    const app = Application.get();
    for (const interactive of this.interactives) {
      app.sendEnvelopeToInteractive(interactive, envelope);
    }
  }
}
