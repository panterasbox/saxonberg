/**
 * Remote — the thing you hold to drive a `remote`-paired `Screen`. It
 * carries no pairing itself: the screen's `remote` field names this
 * row's template path, and `DisplayApi.mayDrive` asks whether the actor
 * carries an instance of it. The row authors its keywords.
 */

import Thing from '../../lib/stuff/Thing';
import { DetailedMixin } from '../../lib/description/Detailed';

export default class Remote extends DetailedMixin(Thing) {}
