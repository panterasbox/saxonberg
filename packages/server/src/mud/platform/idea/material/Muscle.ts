/**
 * Muscle — the instanceable `Material` twin for meat.
 *
 * The `RadioactiveMaterial` pattern: a capability mixin composes onto
 * `Material` as a thin subclass, and rows that need the capability name
 * this class while everything else stays on plain
 * `/platform/idea/material/Material`.
 *
 * Rows live at `/stuff/idea/material/tissue/muscles/<name>` — a sibling
 * folder, because `tissue/muscle` is an existing LEAF (the generic
 * muscle, still used by organs and by the plans that name no cuts), and
 * a path cannot be both a leaf and a folder.
 *
 * See `lib/butchery/Muscle.ts` for why `work` is a subclass field rather
 * than a `Material` field or a reuse of `toughness`.
 */
import { MuscleMixin } from '../../../lib/butchery/Muscle';
import Material from '../../../lib/material/Material';

export default class Muscle extends MuscleMixin(Material) {}
