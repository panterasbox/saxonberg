/**
 * Login — per-connection Idea that bootstraps a connected user into
 * their Avatar.
 *
 * Login's charter is **narrow**: take ownership of the Interactive
 * for the duration of avatar selection, resolve the user's avatar,
 * hand the Interactive off, kick off the avatar's session via
 * `avatar.enter()`, and destruct. Login does not run the session
 * itself — anything that's part of "playing as the avatar" (location
 * placement, welcome scene, look description, autosave, the
 * PlayerLoggedIn event) lives on `Avatar.enter()`. That keeps the
 * concerns aligned with the object whose session it is.
 *
 * Lifetime: constructed once per login; destructed when the entry is
 * complete (or handed off to character selection).
 */

import { Idea } from '../lib/stuff/Idea';
import { StuffApi } from '../api/stuff';
import { ConnectionApi } from '../api/connection';
import { PlayerApi } from '../api/player';
import { HasInteractiveMixin } from '../lib/connection/HasInteractive';
import type Interactive from './Interactive';

const LoginBase = HasInteractiveMixin(Idea);

export default class Login extends LoginBase {
  private readonly interactive: Interactive;

  constructor(interactive: Interactive) {
    super();
    this.interactive = interactive;
    // Seed the singleton set so MixinApi.isHasInteractive(login)
    // works the same way it does for Avatar. Login multiplexing
    // never actually happens — it's just consistency with the mixin.
    this.addInteractive(interactive);
  }

  /**
   * Run the entry procedure: take ownership of the connection,
   * resolve the user's Avatar, transfer the Interactive to it, and
   * hand off to `avatar.enter()` to start the session.
   *
   * Users with zero or multiple Players are not supported yet —
   * player management (including choosing between multiple Players)
   * is a future feature with its own first-class representation.
   */
  public async enter(): Promise<void> {
    const { interactive } = this;

    // Take ownership of the connection for the duration of entry.
    // ConnectionApi.transfer below hands the holder slot to the chosen
    // Avatar before we destruct.
    ConnectionApi.transfer(interactive, this);

    const avatars = await PlayerApi.loadAvatarsForUser(interactive.getUser());
    if (avatars.length !== 1) {
      throw new Error(
        `Login: expected exactly 1 player for user ${interactive.getUserId()}, ` +
          `found ${avatars.length}`
      );
    }

    const avatar = avatars[0]!;
    ConnectionApi.transfer(interactive, avatar);

    console.info(`Login: User connected - ${avatar.getFullName()}`);

    // Hand off to Avatar's session-start. Everything from here on
    // (placement, welcome, look, autosave, PlayerLoggedIn) is
    // Avatar's concern.
    await avatar.enter(interactive);

    StuffApi.destruct(this);
  }
}
