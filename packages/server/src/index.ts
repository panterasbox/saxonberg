/**
 * Saxonberg 2.0 Server - Entry Point
 *
 * This file initializes and starts the game server.
 *
 * Initialization sequence:
 * 1. Load environment variables
 * 2. Connect to MongoDB
 * 3. Create and start Server
 * 4. Setup graceful shutdown handlers
 */

// Register the call-security loader hook BEFORE any game-code import.
// The hook intercepts every `mud/**` module load and appends a
// ModuleApi.stamp(...) call so every exported class gets a
// tamper-resistant module-id. Imports below this line participate.
//
// Skipped under Vitest: Vitest uses Vite's plugin pipeline (see
// vitest.config.ts → callSecPlugin), which does the same source
// transform without going through Node's loader hooks at all. Both
// pathways produce identical instrumentation.
import { register } from 'node:module';
if (!process.env.VITEST) {
  register('./services/loader/loader-hook.js', import.meta.url);
}

import 'dotenv/config';
import { PersistenceManager } from './backend/PersistenceManager';
import { SeederManager } from './backend/SeederManager';
import { BootstrapManager } from './backend/BootstrapManager';
import { Server } from './services/Server';

/**
 * Main server initialization function.
 */
async function main() {
  try {
    console.info('='.repeat(60));
    console.info('Saxonberg 2.0 Server - Starting...');
    console.info('='.repeat(60));

    // Validate required environment variables
    const requiredEnvVars = [
      'MONGODB_URI',
      'GOOGLE_CLIENT_ID',
      'GOOGLE_CLIENT_SECRET',
      'GOOGLE_CALLBACK_URL',
      'SESSION_SECRET',
    ];

    const missingEnvVars = requiredEnvVars.filter(
      (varName) => !process.env[varName]
    );

    if (missingEnvVars.length > 0) {
      console.error('ERROR: Missing required environment variables:');
      missingEnvVars.forEach((varName) => console.error(`  - ${varName}`));
      console.error('\nPlease check your .env file.');
      process.exit(1);
    }

    // 1. Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI!;
    const dbName = process.env.MONGODB_DATABASE || 'saxonberg';

    console.info(`\nConnecting to MongoDB database '${dbName}'...`);

    await PersistenceManager.get().connect(mongoUri, dbName);

    console.info('MongoDB connection successful\n');

    // 1a. Seed templates from disk into the `domain` collection
    //     (idempotent — existing docs are left alone). Runs FIRST
    //     because PM.loadHooks below clones the DomainHook template
    //     out of `domain`, and the bootstrap manifest may reference
    //     other seeded templates too.
    await SeederManager.run();

    // 1b. Load PM hooks (folder/leaf invariant on Collections.Domain,
    //     etc.) — clones the seeded hook templates and registers
    //     them with the persistence pipeline. Seeds must exist
    //     before this runs.
    await PersistenceManager.get().loadHooks();

    // 1c. Bootstrap runtime instances from the engine manifest.
    //     Both prior steps must be complete; failures here prevent
    //     boot.
    await BootstrapManager.run();

    // 2. Create and start Server
    const port = parseInt(process.env.PORT || '2010', 10);
    const server = new Server(port);

    // Setup shutdown handlers
    server.setupShutdownHandlers();

    // Start server
    await server.start();

    console.info('\n' + '='.repeat(60));
    console.info('Saxonberg 2.0 Server - Ready');
    console.info('='.repeat(60));
    console.info(`\nServer URL: http://localhost:${port}`);
    console.info(`Client URL: ${process.env.CLIENT_URL || 'http://localhost:5173'}`);
    console.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.info('\n' + '='.repeat(60));
  } catch (error) {
    console.error('\n' + '='.repeat(60));
    console.error('FATAL ERROR: Server failed to start');
    console.error('='.repeat(60));
    console.error(error);
    process.exit(1);
  }
}

// Run main function if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('Unhandled error in main():', error);
    process.exit(1);
  });
}

// Export for testing
export { Server } from './services/Server';
export { Application } from './backend/Application';
export { Backend } from './backend/Backend';
export { PersistenceManager } from './backend/PersistenceManager';
export { ConnectionManager } from './backend/ConnectionManager';
export { ConnectionApi } from './mud/api/connection';
export { MixinApi, Mixins } from './mud/api/mixin';
export { Avatar } from './mud/obj/Avatar';
export { Interactive } from './mud/obj/Interactive';
export type { HasInteractive } from './mud/lib/connection/HasInteractive';
export { HasInteractiveMixin } from './mud/lib/connection/HasInteractive';
export { Agent } from './mud/lib/stuff/Agent';
export { Persistable } from './mud/lib/persistence/Persistable';
