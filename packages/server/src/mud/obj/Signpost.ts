/**
 * Signpost — a plain thing that bears marks.
 *
 * The **first non-magic consumer of `MarkedMixin`**, which until now was
 * composed only by `Scroll` and `Spellbook`. That mattered: `Marked`
 * lives in `lib/description/` and its own docstring insists it is "not a
 * potions feature — a signpost bears marks, and so does a shipping
 * label", but nothing in the world demonstrated it. A capability with
 * one kind of consumer is a capability nobody has tested the generality
 * of.
 *
 * So this is deliberately the *boring* case: no working, no charge, no
 * identity, no consumption. Text on an object, and the two axes that
 * govern reading it — `markForm` (which senses reach the marks) and
 * `markScript` (whether you know the system).
 *
 * It is the class behind plaques, gravestones, boundary stones, notices,
 * menus, shipping labels and graffiti — most of which exist to settle a
 * fact later rather than to be enjoyed now, which is the direction this
 * substrate eventually grows in (evidence, provenance, forgery).
 */

import Prop from './Prop';
import { MarkedMixin } from '../lib/description/Marked';

export default class Signpost extends MarkedMixin(Prop) {}
