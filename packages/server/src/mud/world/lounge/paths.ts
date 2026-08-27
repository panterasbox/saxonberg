/**
 * Template paths for the lounge domain. Per-domain paths file (see the TPA
 * paths note). Currently the TPA node the Warren seats into the host; the
 * Warren / lounge / bar paths still live as LoungeWarren constants and can
 * consolidate here in a follow-up.
 */
export const LoungePaths = {
  /** The lounge's TPA node, seated into the elastic host by LoungeWarren. */
  terminal: '/world/lounge/thing/terminal',
} as const;
