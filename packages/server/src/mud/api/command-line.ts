/**
 * CommandLineApi - UNIX-style command line parsing
 *
 * Pure parsing layer with no game logic:
 * - Tokenization with quote/escape support
 * - Option extraction (-o, --option)
 * - Returns structured ParsedCommand
 *
 * Example:
 * ```typescript
 * const parsed = CommandLineApi.parse('look at "magic sword" --verbose');
 * // { verb: 'look', args: ['at', 'magic sword'], options: Map { 'verbose' => true } }
 * ```
 */

import type { ParsedCommand } from '../lib/command/models';

/**
 * CommandLineApi - Static utility class for command line parsing
 */
export class CommandLineApi {
  /**
   * Parse command string into structured data
   *
   * Steps:
   * 1. Tokenize with quote handling
   * 2. Extract verb (first token)
   * 3. Extract options (-o, --option)
   * 4. Return remaining args
   *
   * @param input - Command string to parse
   * @returns Parsed command with verb, args, and options
   */
  static parse(input: string): ParsedCommand {
    // Tokenize respecting quotes
    const tokens = this.tokenize(input);

    if (tokens.length === 0) {
      return {
        verb: '',
        args: [],
        options: new Map(),
      };
    }

    // First token is verb
    const verb = tokens[0] || '';
    const remaining = tokens.slice(1);

    // Extract options
    const { options, args } = this.extractOptions(remaining);

    return { verb, args, options };
  }

  /**
   * Tokenize input string respecting quotes and escapes
   *
   * Handles:
   * - Single quotes: 'hello world' → ["hello world"]
   * - Double quotes: "hello world" → ["hello world"]
   * - Escaped quotes: "say \"hello\"" → ["say \"hello\""]
   * - Escaped backslashes: "path\\to\\file" → ["path\\to\\file"]
   * - Whitespace: "hello   world" → ["hello", "world"]
   *
   * @param input - Input string
   * @returns Array of tokens
   */
  private static tokenize(input: string): string[] {
    const tokens: string[] = [];
    let pos = 0;

    while (pos < input.length) {
      // Skip whitespace
      pos = this.findNonWhitespace(input, pos);
      if (pos >= input.length) break;

      // Find end of token (respecting quotes)
      const end = this.matchQuote(input, pos);

      // Extract token
      let token = input.substring(pos, end);

      // Remove surrounding quotes and process escapes
      token = this.unquote(token);
      token = this.unescape(token);

      tokens.push(token);
      pos = end;
    }

    return tokens;
  }

  /**
   * Find the end position of a quoted or unquoted token
   *
   * @param str - Input string
   * @param pos - Starting position
   * @returns End position (exclusive)
   */
  private static matchQuote(str: string, pos: number): number {
    if (pos >= str.length) return pos;
    const char = str[pos];

    // Quoted token
    if (char === '"' || char === "'") {
      const quote = char;
      let i = pos + 1;

      while (i < str.length) {
        if (str[i] === '\\') {
          // Skip escaped character
          i += 2;
        } else if (str[i] === quote) {
          // Found closing quote
          return i + 1;
        } else {
          i++;
        }
      }

      // No closing quote found - return end of string
      return str.length;
    }

    // Unquoted token - find next whitespace
    let i = pos;
    while (i < str.length) {
      const char = str[i];
      if (this.isWhitespace(char)) break;

      if (char === '\\') {
        // Skip escaped character
        i += 2;
      } else {
        i++;
      }
    }

    return i;
  }

  /**
   * Remove surrounding quotes from token
   *
   * @param token - Token string
   * @returns Token without surrounding quotes
   */
  private static unquote(token: string): string {
    if (token.length < 2) return token;

    const first = token[0];
    const last = token[token.length - 1];

    if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
      return token.substring(1, token.length - 1);
    }

    return token;
  }

  /**
   * Process escape sequences in token
   *
   * Handles:
   * - \" → "
   * - \' → '
   * - \\ → \
   * - \n → newline
   * - \t → tab
   *
   * @param token - Token string
   * @returns Token with escape sequences processed
   */
  private static unescape(token: string): string {
    let result = '';
    let i = 0;

    while (i < token.length) {
      if (token[i] === '\\' && i + 1 < token.length) {
        const next = token[i + 1];
        switch (next) {
          case '"':
          case "'":
          case '\\':
            result += next;
            break;
          case 'n':
            result += '\n';
            break;
          case 't':
            result += '\t';
            break;
          case 'r':
            result += '\r';
            break;
          default:
            // Unknown escape - keep both characters
            result += '\\' + next;
        }
        i += 2;
      } else {
        result += token[i];
        i++;
      }
    }

    return result;
  }

  /**
   * Find next non-whitespace position
   *
   * @param str - Input string
   * @param pos - Starting position
   * @returns Next non-whitespace position (or end of string)
   */
  private static findNonWhitespace(str: string, pos: number): number {
    while (pos < str.length && this.isWhitespace(str[pos])) {
      pos++;
    }
    return pos;
  }

  /**
   * Check if character is whitespace
   *
   * @param char - Character to check
   * @returns True if whitespace
   */
  private static isWhitespace(char: string | undefined): boolean {
    if (!char) return false;
    return char === ' ' || char === '\t' || char === '\n' || char === '\r';
  }

  /**
   * Extract command-line options from tokens
   *
   * Handles:
   * - Short options: -v → { v: true }
   * - Long options: --verbose → { verbose: true }
   * - Combined short options: -abc → { a: true, b: true, c: true }
   * - Stop marker: -- stops option processing
   *
   * @param tokens - Array of tokens
   * @returns Object with options map and remaining args
   */
  private static extractOptions(tokens: string[]): {
    options: Map<string, boolean>;
    args: string[];
  } {
    const options = new Map<string, boolean>();
    const args: string[] = [];
    let i = 0;
    let stopOptions = false;

    while (i < tokens.length) {
      const token = tokens[i];
      if (!token) {
        i++;
        continue;
      }

      // Stop marker
      if (token === '--') {
        stopOptions = true;
        i++;
        continue;
      }

      // Long option
      if (!stopOptions && token.startsWith('--')) {
        const name = token.substring(2);
        options.set(name, true);
        i++;
        continue;
      }

      // Short option(s)
      if (!stopOptions && token.startsWith('-') && token.length > 1 && token !== '-') {
        // Combined short options: -abc
        for (let j = 1; j < token.length; j++) {
          const flag = token[j];
          if (flag) {
            options.set(flag, true);
          }
        }
        i++;
        continue;
      }

      // Regular argument
      args.push(token);
      i++;
    }

    return { options, args };
  }
}
