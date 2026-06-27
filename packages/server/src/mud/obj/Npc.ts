/**
 * Npc — the first concrete `Character` (the base is abstract).
 *
 * Minimal and behavior-free: a body + agency, authored entirely from seed
 * data (species, name, description). The NPC *behavior* layer (a `Behaved`
 * mixin + brains) is Lane 1's (npc-behavior) and wraps this later.
 *
 * **Cross-lane note:** another worktree is also minting an NPC class; this
 * one is kept deliberately tiny so the merge is trivial. Do not add behavior
 * here.
 */

import { Character } from '../lib/character/Character';

export default class Npc extends Character {}
