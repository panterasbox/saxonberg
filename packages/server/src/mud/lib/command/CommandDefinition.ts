/**
 * CommandDefinition - Parse and represent YAML command definitions (View in MVC)
 *
 * Wraps a CommandView (YAML file) and provides structured access to command metadata.
 *
 * Responsible for:
 * - Loading YAML command definition files
 * - Parsing command structure (verbs, syntax, subcommands, fields)
 * - Providing access to command metadata
 *
 * YAML View Example:
 * ```yaml
 * verbs: [look, l]
 * controller: LookController
 * description: "Examine your surroundings"
 * syntax:
 *   - pattern: ""
 *     description: "Look at current location"
 *   - pattern: "<target>"
 *     description: "Look at specific target"
 *     fields:
 *       target:
 *         type: object
 *         required: true
 *         validators: [mustBeVisible]
 * ```
 */

import { parse as parseYaml } from 'yaml';
import { readFileSync } from 'fs';
import type {
  CommandView,
  SyntaxDefinition,
  SubcommandDefinition,
} from '../../api/command';

/**
 * Parsed command definition
 *
 * Provides structured access to command metadata from YAML
 */
export class CommandDefinition {
  /** Command verbs (aliases) */
  public readonly verbs: string[];

  /** Controller class name */
  public readonly controller: string;

  /** Human-readable description */
  public readonly description: string;

  /** Syntax patterns (for commands without subcommands) */
  public readonly syntax: SyntaxDefinition[];

  /** Subcommand definitions (for commands with subcommands) */
  public readonly subcommands: Record<string, SubcommandDefinition>;

  /** File path this definition was loaded from */
  public readonly filePath: string;

  /**
   * Private constructor - use static fromFile() or fromView()
   *
   * @param view - CommandView (parsed YAML structure)
   * @param filePath - Path to YAML file
   */
  private constructor(
    view: CommandView,
    filePath: string
  ) {
    this.verbs = view.verbs || [];
    this.controller = view.controller;
    this.description = view.description || '';
    this.syntax = view.syntax || [];
    this.subcommands = view.subcommands || {};
    this.filePath = filePath;

    // Validate
    this.validate();
  }

  /**
   * Load CommandDefinition from YAML file
   *
   * @param filePath - Path to YAML file
   * @returns Parsed command definition
   * @throws Error if file cannot be read or YAML is invalid
   */
  static fromFile(filePath: string): CommandDefinition {
    try {
      const yamlContent = readFileSync(filePath, 'utf-8');
      return this.fromYaml(yamlContent, filePath);
    } catch (error) {
      throw new Error(`Failed to load command definition from ${filePath}: ${error}`);
    }
  }

  /**
   * Parse CommandDefinition from YAML string
   *
   * @param yamlContent - YAML content string
   * @param filePath - File path (for error messages)
   * @returns Parsed command definition
   * @throws Error if YAML is invalid
   */
  static fromYaml(yamlContent: string, filePath: string = '<inline>'): CommandDefinition {
    try {
      const view = parseYaml(yamlContent) as CommandView;
      return new CommandDefinition(view, filePath);
    } catch (error) {
      throw new Error(`Failed to parse YAML in ${filePath}: ${error}`);
    }
  }

  /**
   * Validate command definition
   *
   * @throws Error if definition is invalid
   */
  private validate(): void {
    // Must have at least one verb
    if (!this.verbs || this.verbs.length === 0) {
      throw new Error(`Command definition ${this.filePath} must have at least one verb`);
    }

    // Must have controller
    if (!this.controller) {
      throw new Error(`Command definition ${this.filePath} must specify a controller`);
    }

    // Must have either syntax or subcommands (not both, not neither)
    const hasSyntax = this.syntax && this.syntax.length > 0;
    const hasSubcommands = Object.keys(this.subcommands).length > 0;

    if (!hasSyntax && !hasSubcommands) {
      throw new Error(
        `Command definition ${this.filePath} must have either syntax patterns or subcommands`
      );
    }

    if (hasSyntax && hasSubcommands) {
      throw new Error(
        `Command definition ${this.filePath} cannot have both syntax and subcommands`
      );
    }

    // Validate syntax patterns
    if (hasSyntax) {
      this.syntax.forEach((syn, index) => {
        if (syn.pattern === undefined) {
          throw new Error(
            `Syntax pattern ${index} in ${this.filePath} must have a pattern field`
          );
        }
      });
    }

    // Validate subcommands
    if (hasSubcommands) {
      Object.entries(this.subcommands).forEach(([name, sub]) => {
        if (sub.pattern === undefined) {
          throw new Error(
            `Subcommand '${name}' in ${this.filePath} must have a pattern field`
          );
        }
      });
    }
  }

  /**
   * Check if this command has subcommands
   */
  hasSubcommands(): boolean {
    return Object.keys(this.subcommands).length > 0;
  }

  /**
   * Get subcommand definition by name
   *
   * @param name - Subcommand name
   * @returns Subcommand definition or undefined
   */
  getSubcommand(name: string): SubcommandDefinition | undefined {
    return this.subcommands[name];
  }

  /**
   * Get all subcommand names
   */
  getSubcommandNames(): string[] {
    return Object.keys(this.subcommands);
  }

  /**
   * Check if command has a specific verb/alias
   *
   * @param verb - Verb to check
   * @returns True if this command responds to the verb
   */
  hasVerb(verb: string): boolean {
    return this.verbs.some((v) => v.toLowerCase() === verb.toLowerCase());
  }

  /**
   * Get primary verb (first in list)
   */
  getPrimaryVerb(): string {
    return this.verbs[0] || '';
  }

  /**
   * Get usage string for display
   *
   * @returns Human-readable usage string
   */
  getUsage(): string {
    const verb = this.getPrimaryVerb();

    if (this.hasSubcommands()) {
      const subcommands = this.getSubcommandNames().join('|');
      return `${verb} <${subcommands}> [args...]`;
    }

    if (this.syntax.length === 0) {
      return verb;
    }

    if (this.syntax.length === 1) {
      const pattern = this.syntax[0]?.pattern;
      return pattern ? `${verb} ${pattern}` : verb;
    }

    // Multiple syntax patterns
    return `${verb} (see help ${verb} for syntax)`;
  }

  /**
   * Get detailed help text
   *
   * @returns Multi-line help text
   */
  getHelpText(): string {
    const lines: string[] = [];

    // Header
    lines.push(`${this.getPrimaryVerb().toUpperCase()}: ${this.description}`);
    lines.push('');

    // Aliases
    if (this.verbs.length > 1) {
      lines.push(`Aliases: ${this.verbs.join(', ')}`);
      lines.push('');
    }

    // Syntax patterns
    if (!this.hasSubcommands() && this.syntax.length > 0) {
      lines.push('Syntax:');
      this.syntax.forEach((syn) => {
        const pattern = syn.pattern || '';
        const usage = pattern ? `${this.getPrimaryVerb()} ${pattern}` : this.getPrimaryVerb();
        lines.push(`  ${usage}`);
        if (syn.description) {
          lines.push(`    ${syn.description}`);
        }
      });
      lines.push('');
    }

    // Subcommands
    if (this.hasSubcommands()) {
      lines.push('Subcommands:');
      Object.entries(this.subcommands).forEach(([name, sub]) => {
        const pattern = sub?.pattern || '';
        const usage = pattern
          ? `${this.getPrimaryVerb()} ${name} ${pattern}`
          : `${this.getPrimaryVerb()} ${name}`;
        lines.push(`  ${usage}`);
        if (sub?.description) {
          lines.push(`    ${sub.description}`);
        }
      });
      lines.push('');
    }

    return lines.join('\n');
  }
}
