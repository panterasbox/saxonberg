/**
 * Loom — anything you set a web on. The hand loom and the broad loom are
 * ROWS over this class; a flying shuttle or a power loom would be two
 * more, at higher `rate`.
 *
 * ⭐ A modern mill operator still chooses yarn count and weave density.
 * `weave`'s decision is the same decision at every tech level, which is
 * why the ladder above this is rows rather than code.
 */

import Tool from '@saxonberg/server/mud/platform/thing/Tool';
import type { CommandContributions } from '@saxonberg/server/mud/api/command';

const WEAVE = ['trade/textiles/cmd/textiles/weave.yaml'];

export default class Loom extends Tool {
  static commandContributions: CommandContributions = {
    environment: WEAVE,
    peers: WEAVE,
  };
}
