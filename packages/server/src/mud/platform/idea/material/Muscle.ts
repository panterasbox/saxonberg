/**
 * Muscle — a muscle that worked, and so carries the work a cut's texture
 * derives from.
 *
 * A KIND of material (material decomposition): what the substance is.
 * Composes `Muscle`. Consumers never narrow on a kind — they ask for a
 * capability (`MixinApi.has<Capability>`). Rows live at
 * `/stuff/idea/material/tissue/muscles/<name>` — a sibling folder, because
 * `tissue/muscle` is an existing LEAF (the generic muscle, still used by
 * organs and by the plans that name no cuts). See `lib/butchery/Muscle.ts`
 * for why `work` is its own field rather than a reuse of `toughness`.
 */
import Flesh from './Flesh';
import { MuscleMixin } from '../../../lib/butchery/Muscle';

export default class Muscle extends MuscleMixin(Flesh) {}
