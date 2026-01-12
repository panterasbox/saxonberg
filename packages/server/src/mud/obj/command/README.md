# Command Controllers

This directory contains command controller implementations.

## Purpose

Command controllers are executable classes that implement game command logic. Each controller:
- Extends `CommandController<I, O>` with typed Input/Output
- Implements the `execute(input: I, context: CommandContext): CommandResult<O>` method
- Contains business logic for command execution
- Is referenced by name in YAML command definitions

## Architecture

### Base Class

`/mud/lib/command/CommandController.ts` - Abstract base class

### Pattern

```typescript
import { CommandController } from '../../lib/command/CommandController';
import type { CommandContext, CommandResult } from '../../lib/command/models';

interface ExampleInput {
  field1: string;
  field2?: number;
}

interface ExampleOutput {
  text: string;
}

export class ExampleController extends CommandController<ExampleInput, ExampleOutput> {
  execute(input: ExampleInput, context: CommandContext): CommandResult<ExampleOutput> {
    // Business logic here

    return {
      success: true,
      output: { text: 'Result' }
    };
  }
}
```

## Controllers are Ephemeral

- New instance created for each command execution
- No state persisted between executions
- Use `context.avatar`, `context.location`, etc. for game state

## Subcommand Pattern

For commands with subcommands (e.g., `player name`, `player pronouns`):

```typescript
execute(input: Input, context: CommandContext): CommandResult<Output> {
  switch (input.subcommand) {
    case 'name':
      return this.executeName(input, context);
    case 'pronouns':
      return this.executePronouns(input, context);
    // ...
  }
}
```

## MVP Controllers

- `PingController.ts` - Simple echo test
- `LookController.ts` - Examine surroundings/objects
- `HelpController.ts` - Command documentation
- `PlayerController.ts` - Character management (with subcommands)
- `GetController.ts` - Pick up objects (multi-object selection)
- `DropController.ts` - Drop objects (multi-object selection)
- `InventoryController.ts` - Show carried items
