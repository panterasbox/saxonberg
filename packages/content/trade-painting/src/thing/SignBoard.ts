/**
 * SignBoard — a board to letter in paint (paint build D10).
 *
 * It bears marks (`MarkedMixin`, so `write … on board with pot` letters
 * it). Like every good's, its coat weathers where the weather reaches it
 * (`FacedMixin`): hung out of doors the coat — and the words lettered in
 * it — thin and fade, and when the weather has taken the coat the words go
 * with it.
 */

import Good from '@saxonberg/server/mud/platform/thing/Good';
import { MarkedMixin } from '@saxonberg/server/mud/lib/description/Marked';

export default class SignBoard extends MarkedMixin(Good) {}
