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

import 'dotenv/config';
import { PersistenceManager } from './backend/PersistenceManager.js';
import { Server } from './services/Server.js';

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
export { Server } from './services/Server.js';
export { Application } from './backend/Application.js';
export { Backend } from './backend/Backend.js';
export { PersistenceManager } from './backend/PersistenceManager.js';
export { ConnectionManager } from './backend/ConnectionManager.js';
export { ConnectionApi } from './mud/api/connection.js';
export { MixinApi, Mixins } from './mud/api/mixin.js';
export { Avatar } from './mud/obj/Avatar.js';
export { Interactive } from './mud/lib/connection/Interactive.js';
export { Agent } from './mud/lib/stuff/Agent.js';
export { AgentBase } from './mud/lib/stuff/AgentBase.js';
export { Persistent } from './mud/lib/stuff/Persistent.js';
export { PersistentBase } from './mud/lib/stuff/PersistentBase.js';
