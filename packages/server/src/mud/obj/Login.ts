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

import { Idea } from '../lib/stuff/Idea';
import { StuffApi } from '../api/stuff';
import { ConnectionApi } from '../api/connection';
import { PlayerApi } from '../api/player';
import { MessageApi } from '../api/message';
import { Mml } from '../api/mml';
import { HasInteractiveMixin } from '../lib/connection/HasInteractive';
import { SensorMixin } from '../lib/message/Sensor';
import { CommandGiverMixin } from '../lib/command/CommandGiver';
import { Application } from '../../backend/Application';
import { GoogleProfile } from '../lib/identity/GoogleProfile';
import type { CommandContributions } from '../api/command';
import type {
  MessageFrame,
  EnvelopeTemplate,
  CharGenRosterEntry,
  CharGenRosterPayload,
} from '@saxonberg/types';
import type Interactive from './Interactive';
import type Avatar from './Avatar';

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
    self: ['charactergen/enroll.yaml', 'charactergen/play.yaml'],
    environment: [],
    inventory: [],
    peers: [],
  };

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
      .topic('system.charactergen.welcome')
      .toSelf(
        Mml.compose`Welcome to enrollment. Let's get you a body and a name.`,
      )
      .send();
    // Dispatch the bare verb to emit the first char-gen-state frame via
    // EnrollController — same pipeline the player will use.
    await this.executeCommand('enroll', { interactive: this.interactive });
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
      species: a.getSpecies()?.getCommonNames()[0] ?? 'unknown',
      description: a.getShortDescription?.() ?? '',
    }));
    const payload: CharGenRosterPayload = { characters };
    MessageApi.scene(this)
      .topic('system.charactergen.roster')
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
