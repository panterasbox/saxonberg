/**
 * Login - Per-instance Idea representing a user's entry into the mud.
 *
 * Created by Application after an Interactive has been established, and
 * lives only as long as the entry procedure takes. Orchestrates the
 * mudlib-side work of putting a connected user into the game world:
 * loading available avatars, resolving character selection, placing the
 * chosen avatar into a starting room, and notifying the client.
 *
 * Lifetime: constructed once per login; destroy() is called when the
 * entry is complete (or handed off to character selection).
 */

import { Idea } from '../lib/stuff/Idea';
import { Location } from '../lib/spatial/Location';
import { StuffApi } from '../api/stuff';
import { ApplicationInstance } from '../../backend/ApplicationInstance';
import { DEFAULT_STARTING_ROOM_PATH } from '../config/constants';
import type { Interactive } from './Interactive';
import type { Avatar } from './Avatar';

export class Login extends Idea {
  public readonly interactive: Interactive;

  constructor(interactive: Interactive) {
    super();
    this.interactive = interactive;
  }

  /**
   * Run the entry procedure for this Login's Interactive.
   *
   * Auto-selects the user's one Player, places their Avatar in a
   * starting room, and sends the welcome + look description. Destroys
   * this Login on completion.
   *
   * Users with zero or multiple Players are not supported yet — player
   * management (including choosing between multiple Players) is a
   * future feature with its own first-class representation.
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

    const startingRoomPath = avatar.player?.startingRoomPath || DEFAULT_STARTING_ROOM_PATH;
    const startingRoom = await StuffApi.clone<Location>(startingRoomPath);
    avatar.travel(startingRoom);
    console.log(`Login: Placed ${avatar.fullName} in ${startingRoom.name}`);

    const app = ApplicationInstance.get();
    app.sendMessageToInteractive(interactive, {
      type: 'connection_established',
      payload: {
        userId: interactive.userId,
        socketId: interactive.socketId,
        sessionId: interactive.sessionId,
        player: {
          _id: avatar.playerId,
          firstName: avatar.firstName,
          lastName: avatar.lastName,
          pronouns: avatar.pronouns,
        },
        message: `Welcome back, ${avatar.fullName}!`,
      },
    });

    this.sendLookDescription(avatar);

    this.destroy();
  }

  private sendLookDescription(avatar: Avatar): void {
    const location = avatar.getEnvironment() as Location | null;
    const app = ApplicationInstance.get();

    if (!location) {
      app.sendMessageToInteractive(this.interactive, {
        type: 'output',
        payload: { text: 'You are nowhere.' },
      });
      return;
    }

    const output = [
      `<location>${location.name}</location>`,
      '',
      location.description,
      '',
    ].join('\n');

    app.sendMessageToInteractive(this.interactive, {
      type: 'output',
      payload: { text: output },
    });
  }
}
