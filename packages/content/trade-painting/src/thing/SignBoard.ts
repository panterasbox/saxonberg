/**
 * SignBoard — a board to letter in paint (paint build D10).
 *
 * It bears marks (`MarkedMixin`, so `write … on board with pot` letters it)
 * and weathers (`WeatheringMixin`): hung out of doors, its coat — and the
 * words lettered in it — thin with the weather and fade in the sun, and
 * when the weather has taken the coat the words go with it.
 */

import Good from '@saxonberg/server/mud/platform/thing/Good';
import { MarkedMixin } from '@saxonberg/server/mud/lib/description/Marked';
import { WeatheringMixin } from '@saxonberg/server/mud/lib/material/Weathering';

export default class SignBoard extends MarkedMixin(WeatheringMixin(Good)) {}
