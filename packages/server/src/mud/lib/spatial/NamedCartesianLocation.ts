/**
 * NamedCartesianLocation — `CartesianLocation` with a proper name.
 *
 * Base `CartesianLocation` composes Visible / Exitable / Coordinates
 * but not Named, because some grid-derived locations don't need an
 * authored name (system-generated wilderness tiles, for example).
 * Authored rooms with proper names ("Duncan Hall Lobby", "Town
 * Square") want this composition.
 *
 * Pure substrate, no content. Seed YAML references it as
 * `class: /lib/spatial/NamedCartesianLocation`.
 */

import { CartesianLocation } from './CartesianLocation';
import { NamedMixin } from '../description/Named';

export class NamedCartesianLocation extends NamedMixin(CartesianLocation) {}
