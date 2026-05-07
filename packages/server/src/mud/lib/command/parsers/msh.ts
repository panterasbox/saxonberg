/**
 * msh — Mud SHell. The framework's default command parser.
 *
 * Wraps `CommandLineApi.parsePipeline` as a `Parser`. Returns a
 * `parsed` result so the dispatcher runs the full match → assemble
 * → resolve → execute pipeline.
 */

import { CommandLineApi } from '../../../api/command-line';
import type { Parser, ParseResult } from '../../../api/command';

const msh: Parser = {
  name: 'msh',

  parse(text, _context): ParseResult {
    let pipeline;
    try {
      pipeline = CommandLineApi.parsePipeline(text);
    } catch (err) {
      return {
        error:
          err instanceof Error ? err.message : 'Command execution failed',
      };
    }
    const parsed = pipeline.commands[0];
    if (!parsed || !parsed.verb) {
      return { error: 'No command entered' };
    }
    return { parsed };
  },
};

export default msh;
