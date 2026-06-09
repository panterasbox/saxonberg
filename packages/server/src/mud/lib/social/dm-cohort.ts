/**
 * Per-Avatar runtime DM cohort tracking — supports the `reply` and
 * `dm .` pronoun verbs.
 *
 * Runtime-only state stored in a WeakMap keyed on the Avatar
 * instance. The cohorts die when the Avatar is destructed (logout)
 * — the WeakMap entry becomes unreachable along with the host.
 *
 * `recordOutboundCohort` — stamped when the actor sends a multi-
 * recipient (or single-recipient) DM. Read by `dm .`.
 * `recordInboundCohort` — stamped when the actor receives a DM
 * (multi-target ad-hoc DMs surface the full cohort; single-target
 * inbound surfaces just the sender). Read by `reply`.
 */

import type { Stuff } from '../stuff/Stuff';
import type { Avatar } from '../../obj/Avatar';

interface CohortState {
  lastInbound: Stuff[] | null;
  lastOutbound: Stuff[] | null;
}

const STATE = new WeakMap<Avatar, CohortState>();

function ensure(avatar: Avatar): CohortState {
  let s = STATE.get(avatar);
  if (!s) {
    s = { lastInbound: null, lastOutbound: null };
    STATE.set(avatar, s);
  }
  return s;
}

export function recordOutboundCohort(
  avatar: Avatar,
  cohort: readonly Stuff[],
): void {
  ensure(avatar).lastOutbound = [...cohort];
}

export function recordInboundCohort(
  avatar: Avatar,
  cohort: readonly Stuff[],
): void {
  ensure(avatar).lastInbound = [...cohort];
}

export function getLastInboundCohort(avatar: Avatar): readonly Stuff[] | null {
  return STATE.get(avatar)?.lastInbound ?? null;
}

export function getLastOutboundCohort(avatar: Avatar): readonly Stuff[] | null {
  return STATE.get(avatar)?.lastOutbound ?? null;
}
