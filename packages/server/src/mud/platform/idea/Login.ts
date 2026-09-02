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

import { SecurityApi } from "../../api/security";
import { Idea } from "../../lib/stuff/Idea";
import { StuffApi } from "../../api/stuff";
import { AppApi } from "../../api/app";
import { AppSettingKeys } from "../../lib/config/AppSettings";
import { ConnectionApi } from "../../api/connection";
import { ConditionApi } from "../../api/condition";
import { PlayerApi } from "../../api/player";
import { SandboxApi } from "../../api/sandbox";
import { MessageApi } from "../../api/message";
import { Mml } from "../../api/mml";
import { ContainmentApi } from "../../api/containment";
import { MixinApi } from "../../api/mixin";
import { InfluenceApi } from "../../api/influence";
import { SlotApi } from "../../api/slot";
import { Template } from "../../lib/stuff/Template";
import { NameBank } from "../../lib/species/NameBank";
import { HasInteractiveMixin } from "../../lib/connection/HasInteractive";
import { SensorMixin } from "../../lib/message/Sensor";
import { CommandGiverMixin } from "../../lib/command/CommandGiver";
import { GoogleProfile } from "../../lib/identity/GoogleProfile";
import Avatar from "../agent/Avatar";
import type { CommandContributions } from "../../api/command";
import type {
  MessageFrame,
  EnvelopeTemplate,
  CharGenRosterEntry,
  AccountStandingPayload,
  CharGenRosterPayload,
} from "@saxonberg/types";
import type Interactive from "./Interactive";
import type Species from "./species/Species";
import type { User } from "../../lib/identity/User";

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
    self: ["platform/cmd/charactergen/enroll.yaml", "platform/cmd/charactergen/play.yaml"],
    peers: [],
    environment: [],
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
    await this.presentRoster(avatars);
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
      "./cmd/charactergen/EnrollController"
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
    // guest path is minted via `asIdentityPath` — no transient template
    // row to write and delete (the identity doctrine: rows are for
    // authored content; a throwaway guest gets none).
    const avatar = await StuffApi.clone<Avatar>(
      Avatar.SEED_TEMPLATE_PATH,
      { user, isGuest: true },
      { dataOverlay: data, asIdentityPath: path },
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
      .topic("session.identity")
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

    // Sandbox reconnect (Decision P): a live circle session inside its
    // grace window means the player dropped mid-visit — re-attach to
    // the WIRE BODY, back in the circle where they were, exactly like
    // ordinary linkdead-reconnect. The parked field avatar keeps its
    // registry slot and stays frozen. The choreography (transfer +
    // ceremony under the right roots) lives in SandboxLogic.
    if (await SandboxApi.reconnect(this.interactive, playerId)) {
      console.info(`Login: reconnected into a live circle - ${playerId}`);
      StuffApi.destruct(this);
      return true;
    }

    const avatars = await PlayerApi.loadAvatarsForUser(user);
    const restored = avatars.find((a) => a.getPlayerId() === playerId);
    if (!restored) return false;
    // An identity between bodies comes back as a shade, not as a fresh
    // body — logging out is not an escape hatch from death. Returns the
    // restored avatar untouched for the living.
    const avatar = (await ConditionApi.embodyForSession(
      restored,
    )) as typeof restored;
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
  private async presentRoster(avatars: Avatar[]): Promise<void> {
    const characters: CharGenRosterEntry[] = avatars.map((a) => ({
      playerId: a.getPlayerId(),
      name: a.getFullName(),
      species: a.getSpecies()?.getCommonNames()[0] ?? "unknown",
      description: a.getShortDescription?.() ?? "",
      ...this.rosterFigures(a),
    }));
    const payload: CharGenRosterPayload = { characters };
    const account = this.accountFigures(avatars);
    if (account) payload.account = account;
    // The roster header names the PERSON — this screen's subject is the
    // account, not any one character on it.
    const { accountName } = await this.resolveNames();
    if (accountName) payload.accountName = accountName;
    MessageApi.scene(this)
      .topic("session.identity")
      .toSelf(Mml.compose`Choose a character, or create a new one.`)
      .payload(payload)
      .send();
  }

  /**
   * ⭐ The figures the character-select screen needs and could not
   * otherwise get.
   *
   * **At Login you are not embodied.** Every one of these is readable
   * in session through a live subscription on the Avatar — and none of
   * those subscriptions is available here, because the reader has no
   * character yet. So this is not "add a field": the roster is the one
   * payload that must CARRY what is elsewhere subscribed to.
   *
   * Best-effort by construction. A figure that cannot be derived is
   * omitted rather than faked — the screen hatches a missing row, which
   * is what the unbuilt-state convention is for, and an invented zero
   * would read as a real one.
   */
  /**
   * ⭐ The **account's** figures — the second entry point to the one
   * roll-up, and the reason character select cannot disagree with the
   * in-world shelf.
   *
   * At Login there is no host to hand `standingForHost`, because the
   * player is not embodied. So this calls `standingForAccount` directly
   * with the account's own subject keys — the same function
   * `standingForHost` delegates to once it has resolved a host. One
   * formula, two entry points; the split-brain defect the previous
   * attempt shipped is not merely avoided here but unreachable.
   *
   * ⚠ Fund is deliberately never sent. `'capital'` has no faucet, so a
   * band for it would be a zero dressed as a measurement; the client
   * hatches the absence with its own reason.
   */
  private accountFigures(avatars: Avatar[]): AccountStandingPayload | undefined {
    try {
      const subjects = avatars[0]?.getAccountSubjects();
      if (!subjects) return undefined;
      const make = InfluenceApi.standingForAccount(
        subjects.subject,
        subjects.members,
        "producer",
      );
      return { make: make.band.name };
    } catch {
      // Same rule as the per-character figures: a roster that throws is
      // a login the player cannot complete. Omit rather than block.
      return undefined;
    }
  }

  private rosterFigures(a: Avatar): Partial<CharGenRosterEntry> {
    const out: Partial<CharGenRosterEntry> = {};
    try {
      const lastSeen = a.getLastSeen();
      if (lastSeen !== undefined) out.lastSeen = lastSeen;

      const subject = a.getTemplatePath();
      if (subject) {
        out.playStanding = InfluenceApi.bandOf(subject, "consumer").name;
      }

      // Species presentation: the binomial the dossier prints, and the
      // species plate. ⚠ The plate is a bucket-relative key (the
      // `CharGenOption.image` contract), never a resolved URL — the
      // client owns MEDIA_BASE_URL.
      const species = a.getSpecies();
      if (species) {
        const binomial = species.getBinomial();
        if (binomial) out.binomial = binomial;
        const plate = species.getIllustration();
        if (plate) out.portrait = plate;
      }

      // Where you left them. The Avatar's container persists, so this
      // is readable without embodying anything.
      const where = MixinApi.isContainable(a) ? a.getContainer() : null;
      if (where) out.lastLocation = where.getPresentation();

      // The practice record — the same derive-on-read digest the
      // in-session `competenceDigest` field ships.
      const bands = a.competenceDigestCached();
      if (bands !== undefined && bands.length > 0) {
        out.practice = bands.map((b) => ({
          discipline: b.discipline,
          band: b.band,
        }));
      }

    } catch {
      // A roster that throws is a login the player cannot complete.
      // Degrade to the four base fields rather than block the screen.
    }
    return out;
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
    for (const interactive of this.interactives) {
      ConnectionApi.sendMessage(interactive, frame);
    }
  }

  protected override handleEnvelope(envelope: EnvelopeTemplate): void {
    for (const interactive of this.interactives) {
      ConnectionApi.sendEnvelope(interactive, envelope);
    }
  }
}
