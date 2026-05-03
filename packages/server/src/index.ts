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
  register('./mud/lib/security/loader-hook.js', import.meta.url);
}

import 'dotenv/config';
import { PersistenceManager } from './backend/PersistenceManager';
import { Server } from './services/Server';

/**
 * Main server initialization function.
 */
async function main() {
  try {
    console.log('='.repeat(60));
    console.log('Saxonberg 2.0 Server - Starting...');
    console.log('='.repeat(60));

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

    console.log(`\nConnecting to MongoDB database '${dbName}'...`);

    await PersistenceManager.get().connect(mongoUri, dbName);

    console.log('MongoDB connection successful\n');

    // 1a. Load PM hooks (folder/leaf invariant on Collections.Domain, etc.)
    await PersistenceManager.get().loadHooks();

    // 2. Create and start Server
    const port = parseInt(process.env.PORT || '2010', 10);
    const server = new Server(port);

    // Setup shutdown handlers
    server.setupShutdownHandlers();

    // Start server
    await server.start();

    console.log('\n' + '='.repeat(60));
    console.log('Saxonberg 2.0 Server - Ready');
    console.log('='.repeat(60));
    console.log(`\nServer URL: http://localhost:${port}`);
    console.log(`Client URL: ${process.env.CLIENT_URL || 'http://localhost:5173'}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log('\n' + '='.repeat(60));
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
export { Agent } from './mud/lib/stuff/Agent';
export { Persistable } from './mud/lib/stuff/Persistable';
