/**
 * Agent - Runtime active object base class
 *
 * Agents are runtime objects that represent active presences in the game
 * world. Unlike Idea (abstract, non-material, non-spatial — Users, Players,
 * Interactives), Agent sits directly on Stuff and is explicitly for
 * runtime-only, potentially embodied actors.
 *
 * Examples:
 * - Character (and its subclasses, e.g. Avatar)
 * - NPC agents (future)
 * - Active daemons (future)
 *
 * Persistence: NOT persisted - runtime only
 */

import { Stuff } from './Stuff';
import { TangibleMixin } from '../material/Tangible';
import { WetMixin } from '../wetness/Wet';

// Agent is matter (`Tangible`) → it can get wet (`WetMixin`), so every
// embodied actor (Character / Avatar / NPC) carries the wetness gauge here
// rather than each re-composing it. The invariant: matter ⟺ wettable.
const AgentBase = WetMixin(TangibleMixin(Stuff));

export class Agent extends AgentBase {
  constructor() {
    super();
  }

  // No `onDestruct()` default — the destruct witness pair is optional;
  // subclasses (or shadows) define `onDestruct()` if they need cleanup.
}

