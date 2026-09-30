/**
 * BoundaryAnchor — the concrete anchor a row names.
 *
 * `lib/boundary/BoundaryAnchor` is substrate: the per-side proxy
 * contract plus the `BoundaryAnchor.is` narrowing guard every
 * perception walk uses. This twin exists so
 * `/platform/thing/BoundaryAnchor` has a class outside `/lib/` to name
 * — the seven-twins convention. Empty body on purpose.
 *
 * See CLAUDE.md § Instanceable Lives in `platform/<branch>/`.
 */

import { BoundaryAnchor as BoundaryAnchorBase } from '../../lib/boundary/BoundaryAnchor';

export default class BoundaryAnchor extends BoundaryAnchorBase {}
