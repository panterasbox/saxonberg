/**
 * NeonSign — a branded, light-emitting wall fixture: the corpo
 * battlefield made literal on the back-bar wall.
 *
 * `AdornmentMixin(BrandedMixin(LightSourceMixin(Thing)))`:
 *   - `Adornment` — a non-portable fixture (lives in the room's
 *     `getFixtures()`, not its `getContents()`; you can't pocket the
 *     sign). Attached declaratively via the host's `adornments:` seed
 *     field (the `AdornableMixin.applyAdornments` applier).
 *   - `Branded` — carries a `_brandKey`; the "a product of <Corpo>"
 *     mark renders for free on the long description, same as the
 *     bottles. A neon sign advertises a product, so the brand it
 *     carries is the product it's lit up for (Volk, aevex zero, …).
 *   - `LightSource` — `emittedIntensity` / `emittedColorTemperature`
 *     feed the room's ambient light fixture-side (the propagation walk
 *     reads `getFixtureLightSources()`), so the corpos literally light
 *     the room: amber Veshko glow beside cool Aevex blue.
 *
 * All authored per-instance in each seed's `data:` — no bespoke logic.
 */

import Thing from '../../lib/stuff/Thing';
import { AdornmentMixin } from '../../lib/boundary/Adornment';
import { BrandedMixin } from '../../lib/corpo/Branded';
import { LightSourceMixin } from '../../lib/perception/LightSource';

const NeonSignBase = AdornmentMixin(BrandedMixin(LightSourceMixin(Thing)));

export default class NeonSign extends NeonSignBase {}
