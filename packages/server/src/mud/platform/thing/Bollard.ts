/**
 * Bollard — ⭐ **what a ship's line is made fast round** (harbors P6).
 *
 * A post of iron or oak set into a quay, a ring-bolt in a rock: a fixed
 * good with no verbs of its own. A ship coming alongside makes her lines
 * fast round the bollards on the landing (`Ship.comeAlongside`), and each
 * line's end lies beside one — a real thing on the quay, so `look` sees
 * her lines ashore and lifting one off is a thing a person on the quay can
 * do. A landing with no bollard has nothing to make fast to: a ship lies
 * off it, unmoored.
 *
 * Its rows author `fixedInPlace: true` (a bollard is not carried off).
 */

import Good from './Good';

export default class Bollard extends Good {}
