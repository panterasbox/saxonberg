/**
 * Helm — the instrument of steering, and what affords `course`, `anchor`
 * and `hail` (maritime D11).
 *
 * ⭐ The instrument affords the verb, not the furniture: a deck with a
 * helm on it is somewhere you can lay a course, and a building — a
 * Structure with no helm — is never offered one, so nothing has to
 * refuse it. A fixture: authored `fixedInPlace: true`, like a ladder.
 */

import Good from '../../lib/stuff/Good';
import type { CommandContributions } from '../../api/command';

const STEERING = [
  'platform/cmd/movement/course.yaml',
  'platform/cmd/movement/anchor.yaml',
  'platform/cmd/social/hail.yaml',
];

export default class Helm extends Good {
  static commandContributions: CommandContributions = {
    environment: STEERING,
  };
}
