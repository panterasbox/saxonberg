/**
 * GessoPanel — a panel under a gesso ground, to paint on (paint build D10).
 *
 * A good that weathers (`WeatheringMixin`): kept indoors its coats never
 * wear, but a fugitive pigment on it fades where the sun reaches it — a
 * madder lake by a sunny window — by the same walk that fades a building's
 * paint. What the picture IS stays the visual-arts build's.
 */

import Good from '@saxonberg/server/mud/platform/thing/Good';
import { WeatheringMixin } from '@saxonberg/server/mud/lib/material/Weathering';

export default class GessoPanel extends WeatheringMixin(Good) {}
