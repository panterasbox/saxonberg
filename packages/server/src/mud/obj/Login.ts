/**
 * Login - Per-instance Idea representing a user's entry into the mud.
 *
 * Constructed by Application after an Interactive has been established,
 * and lives only as long as the entry procedure takes. Orchestrates the
 * mudlib-side work of putting a connected user into the game world:
 * reading the user's owned character slots, resolving character selection,
 * placing the chosen avatar into a starting room, and notifying the client.
 *
 * Lifetime: constructed once per login; destructed when the entry is
 * complete (or handed off to character selection).
 */

import { Idea } from '../lib/stuff/Idea';
import { Location } from '../lib/stuff/Location';
import { StuffApi } from '../api/stuff';
import { DescribeApi } from '../api/describe';
import { MessageApi } from '../api/message';
import { MixinApi } from '../api/mixin';
import { Mml } from '../api/mml';
import { DEFAULT_STARTING_ROOM_PATH } from '../config/constants';
import type { Interactive } from './Interactive';
import type { HasInteractive } from './HasInteractive';
import type { Avatar } from './Avatar';

export class Login extends Idea implements HasInteractive {
  public readonly interactive: Interactive;

  constructor(interactive: Interactive) {
    super();
    this.interactive = interactive;
  }

  /**
   * `HasInteractive` — Login carries exactly one Interactive (it's
   * the bridge between a fresh connection and the entry procedure).
   * Returns a freshly-allocated singleton set; Login is short-lived
   * so the allocation is rare.
   */
  public getInteractives(): ReadonlySet<Interactive> {
    return new Set([this.interactive]);
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

    await interactive.loadAvailableAvatars();

    if (interactive.availableAvatars.size !== 1) {
      throw new Error(
        `Login: expected exactly 1 player for user ${interactive.userId}, ` +
          `found ${interactive.availableAvatars.size}`
      );
    }

    const playerId = Array.from(interactive.availableAvatars.keys())[0]!;
    await interactive.switchAvatar(playerId);
    const avatar = interactive.currentAvatar!;

    console.log(`Login: User connected - ${avatar.fullName}`);

    const startingRoomPath = DEFAULT_STARTING_ROOM_PATH;
    const startingRoom = await StuffApi.clone<Location>(startingRoomPath);
    // Silent spawn: a freshly-cloned avatar shouldn't be announced as
    // "vanishing" from somewhere or "appearing out of thin air"
    // before the player has even seen the room.
    avatar.teleport(startingRoom, { silent: true });
    console.log(
      `Login: Placed ${avatar.fullName} in ${DescribeApi.getDisplayName(startingRoom, 'somewhere')}`
    );

    // Welcome scene: actor frame at system.connection.established
    // carries the bootstrap payload the client needs.
    // Welcome is the introductory moment — explicitly the formal
    // register, so reach for fullName.
    MessageApi.scene(avatar)
      .topic(MessageApi.Topics.system.connection.established)
      .toSelf(Mml.compose`Welcome back, ${avatar.fullName}!`)
      .payload({
        userId: interactive.userId,
        socketId: interactive.socketId,
        sessionId: interactive.sessionId,
        player: {
          _id: avatar.playerId,
          honorific: avatar.honorific,
          name: avatar.name,
          surname: avatar.surname,
          nameSuffix: avatar.nameSuffix,
          alternateNames: avatar.alternateNames,
          pronouns: avatar.pronouns,
        },
      })
      .send();

    this.sendLookDescription(avatar);

    StuffApi.destruct(this);
  }

  private sendLookDescription(avatar: Avatar): void {
    const location = avatar.getEnvironment() as Location | null;

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
