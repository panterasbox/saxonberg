/**
 * Client-state-write handler — persisted UI state mutation.
 *
 * Validates the key against `HasInteractiveMixin`'s schema (which
 * happens inside `setClientState`), then commits via
 * `holder.save()`. The save races Avatar's periodic autosave —
 * MongoDB last-write-wins handles the race.
 *
 * One generic wire path covers every client-state feature; future
 * features (theme, notifications, keybinds) reuse this handler
 * unchanged and contribute new schema entries to
 * `HasInteractiveMixin.clientStateSchema`.
 */

import Avatar from '../../mud/obj/Avatar';
import type { InboundHandler } from './index';

export const handleClientStateWrite: InboundHandler = async (ctx, message) => {
  const holder = ctx.interactive.getHolder();
  if (!(holder instanceof Avatar)) {
    console.warn(
      `client-state-write: socket ${ctx.socketId} has no avatar holder`,
    );
    return;
  }
  const payload = message.payload as
    | { key: unknown; value: unknown }
    | undefined;
  if (!payload || typeof payload.key !== 'string') return;
  try {
    holder.setClientState(payload.key, payload.value);
    await holder.save();
  } catch (error) {
    console.warn(
      `client-state-write rejected for key '${payload.key}': ` +
        (error instanceof Error ? error.message : String(error)),
    );
  }
};
