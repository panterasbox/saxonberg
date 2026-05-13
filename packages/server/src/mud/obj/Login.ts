/**
 * Login - Per-instance Idea representing a user's entry into the mud.
 *
 * Constructed by Application after an Interactive has been established,
 * and lives only as long as the entry procedure takes. Orchestrates the
 * mudlib-side work of putting a connected user into the game world:
 * reading the user's owned character slots, resolving character selection,
 * placing the chosen avatar into a starting location, and notifying the client.
 *
 * Lifetime: constructed once per login; destructed when the entry is
 * complete (or handed off to character selection).
 */

import { Idea } from '../lib/stuff/Idea';
import { Location } from '../lib/stuff/Location';
import { StuffApi } from '../api/stuff';
import { ConnectionApi } from '../api/connection';
import { EventApi } from '../api/event';
import { PlayerApi } from '../api/player';
import { DescribeApi } from '../api/describe';
import { MessageApi } from '../api/message';
import { MixinApi } from '../api/mixin';
import { Mml } from '../api/mml';
import { DEFAULT_STARTING_LOCATION_PATH } from '../config/constants';
import { Events } from '../lib/events';
import { HasInteractiveMixin } from '../lib/connection/HasInteractive';
import type { ConnectionEstablishedPayload } from '@saxonberg/types';
import type { Interactive } from './Interactive';
import type { Avatar } from './Avatar';

const LoginBase = HasInteractiveMixin(Idea);

export class Login extends LoginBase {
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
   * Run the entry procedure for this Login's Interactive.
   *
   * Users with zero or multiple Players are not supported yet — player
   * management (including choosing between multiple Players) is a future
   * feature with its own first-class representation.
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

    const startingLocation = await StuffApi.singleton<Location>(
      DEFAULT_STARTING_LOCATION_PATH
    );
    // Silent spawn: a freshly-cloned avatar shouldn't be announced as
    // "vanishing" from somewhere or "appearing out of thin air"
    // before the player has even seen the location.
    avatar.teleport(startingLocation, { silent: true });
    console.info(
      `Login: Placed ${avatar.getFullName()} in ${DescribeApi.getDisplayName(startingLocation, 'somewhere')}`
    );

    // Welcome scene: actor frame at system.connection.established
    // carries the bootstrap payload the client needs.
    // Welcome is the introductory moment — explicitly the formal
    // register, so reach for fullName.
    const payload: ConnectionEstablishedPayload = {
      userId: interactive.getUserId() ?? '',
      socketId: interactive.getSocketId(),
      sessionId: interactive.getSessionId(),
      interactiveStuffId: interactive.stuffId,
      player: {
        _id: avatar.getPlayerId(),
        honorific: avatar.getHonorific(),
        name: avatar.getName(),
        surname: avatar.getSurname(),
        nameSuffix: avatar.getNameSuffix(),
        alternateNames: avatar.getAlternateNames(),
        pronouns: avatar.getPronouns(),
      },
    };
    MessageApi.scene(avatar)
      .topic(MessageApi.Topics.system.connection.established)
      .toSelf(Mml.compose`Welcome back, ${avatar.getFullName()}!`)
      .payload(payload)
      .send();

    this.sendLookDescription(avatar);

    // Avatar is in-world; the user is logged in. Engine-level event
    // for any observer (audit, achievements) that doesn't care
    // which avatar — just that this player is now playable.
    EventApi.emit(Events.PlayerLoggedIn, {
      playerId: avatar.getPlayerId(),
      userId: interactive.getUserId() ?? '',
    });

    StuffApi.destruct(this);
  }

  private sendLookDescription(avatar: Avatar): void {
    // The avatar's container is whatever Container holds them —
    // typically a Location, but may be a Vessel (an entered
    // wardrobe / ship cabin). The renderer below uses
    // `MixinApi.isVisible` to narrow before reaching for
    // description text, so any Container works.
    const location = avatar.getContainer();

    if (!location) {
      MessageApi.scene(avatar)
        .topic(MessageApi.Topics.world.perception.look)
        .toSelf(Mml.compose`You are nowhere.`)
        .send();
      return;
    }

    // Concrete locations (CartesianLocation, SphericalLocation)
    // compose VisibleMixin and have getLong(); a bare Location does
    // not. Narrow before reaching for the description.
    const description = MixinApi.isVisible(location)
      ? location.getLong()
      : '';
    const body = description
      ? Mml.compose`${Mml.location(location)}\n\n${Mml.fromMarkup(description)}\n`
      : Mml.compose`${Mml.location(location)}\n`;
    MessageApi.scene(avatar)
      .topic(MessageApi.Topics.world.perception.look)
      .toSelf(body)
      .send();
  }
}
