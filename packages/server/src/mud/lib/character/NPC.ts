/**
 * NPC — the first concrete `Character` (the base is abstract).
 *
 * Minimal and behavior-free: a body + agency, authored entirely from seed
 * data (species, name, description). The NPC *behavior* layer (a `Behaved`
 * mixin + brains) is the npc-behavior lane's and wraps this later.
 *
 * **Cross-lane note:** the npc-behavior worktree mints the richer `NPC` at
 * this same path (`Character` + `Behaved` + the `PostRegistration` marker).
 * This deliberately tiny version keeps the crafting lane standalone; the
 * add/add merge resolves to that fuller class, which `Crafter` composes over
 * unchanged.
 */

import { Character } from './Character';

export class NPC extends Character {}

export default NPC;
