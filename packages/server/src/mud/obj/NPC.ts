/**
 * NPC — the generic concrete non-player character.
 *
 * The `NPC` in `lib/npc/` is substrate: the thin archetype five named
 * characters extend (`Crafter`, `Gus`, `Katie`, `Mercenary`,
 * `TicketClerk`). Eight cast templates cloned it directly, authoring
 * their whole character as data.
 *
 * Those templates name this class. The base keeps its role as the
 * archetype; this is the one you clone when the data IS the character.
 * See CLAUDE.md § Instanceable Lives in `obj/`.
 */

import { NPC as NpcBase } from '../lib/npc/NPC';

export default class NPC extends NpcBase {}
