# Command Definitions

This directory contains YAML-based command definitions for the game.

## Purpose

Each YAML file defines:
- Command verbs (aliases)
- Controller class reference
- Syntax patterns
- Field definitions with types and validators
- Subcommands (if applicable)
- Options and flags

## Structure

```yaml
verbs: [command, alias]
controller: CommandController
description: "Command description"
syntax:
  - pattern: "<arg1> [arg2]"
    description: "Syntax description"
    fields:
      arg1:
        type: string|number|object
        required: true
        validators: [validator1, validator2]
```

## Migration Path

**Current (Phase 4)**: Filesystem-based YAML files
**Future**: MongoDB `domain` collection (similar to Avatar templates)

## Example Commands

- `ping.yaml` - Simple echo test
- `look.yaml` - Examine surroundings/objects
- `player.yaml` - Character management (with subcommands)
- `get.yaml` - Pick up objects (multi-object selection)
