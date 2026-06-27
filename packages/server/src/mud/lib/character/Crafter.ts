/**
 * Crafter — a maker NPC: a `Character` that can fulfill orders.
 *
 * General substrate (any maker NPC — bartender, smith, cook), not bar-
 * specific: `MakerMixin` is the order-fulfiller role marker `order` resolves
 * from the patron's location. Behavior-free in v1 (no brain); the bartender
 * "serves on order" via the verb, not a repertoire.
 */

import NPC from './NPC';
import { MakerMixin } from '../craft/Maker';

export default class Crafter extends MakerMixin(NPC) {}
