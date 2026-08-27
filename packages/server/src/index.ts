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

// The call-security loader hook is registered in `preload.js` BEFORE
// this module's imports resolve. ESM hoists all `import` statements
// to the top of the module, so a `register()` call here in index.ts
// would always run AFTER the entire transitive import graph has
// already loaded — the loader wouldn't see any of them.
//
// Vitest uses its own pipeline (vitest.config.ts → callSecPlugin) and
// doesn't run through preload.js; same source transform either way.
import 'dotenv/config';
import { AppBootstrap } from './backend/AppBootstrap';
import { ConsoleTap } from './backend/ConsoleTap';
import { Server } from './services/Server';

/**
 * Main server initialization function.
 *
 * Entry-point concerns only:
 *   1. Validate required env vars; exit early if any are missing.
 *   2. Hand off to `AppBootstrap.run` for the prep sequence.
 *   3. Wire and start the `Server`.
 *
 * App-specific bootstrap (Mongo, seeders, PM hooks, command preload,
 * runtime-instance manifest) lives behind `AppBootstrap` so this
 * file doesn't have to know about every prep system.
 */
export async function main() {
  try {
    // Author-diagnostics Producer 2: install the console tap FIRST, before
    // any boot output, so the raw ring captures the whole session's
    // terminal log (wizard-readable via `errors raw` / the CMS panel).
    // Passthrough is preserved — the console still prints as normal.
    ConsoleTap.get().install();

    console.info('='.repeat(60));
    console.info('Saxonberg 2.0 Server - Starting...');
    console.info('='.repeat(60));

    // In AUTH_MODE=test the GOOGLE_* credentials are OPTIONAL: auth can
    // run through the /auth/test-login seam, which only needs a session,
    // so CI/e2e (where GOOGLE_* are intentionally absent) still boots.
    // PassportConfig registers the Google strategy whenever the GOOGLE_*
    // env IS present — so local dev gets both the seam and a working
    // Google button. Non-test mode requires the real credentials.
    const requiredEnvVars =
      process.env.AUTH_MODE === 'test'
        ? ['MONGODB_URI', 'SESSION_SECRET']
        : [
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

    await AppBootstrap.run({
      mongoUri: process.env.MONGODB_URI!,
      dbName: process.env.MONGODB_DATABASE || 'saxonberg',
    });

    const port = parseInt(process.env.PORT || '2010', 10);
    const server = new Server(port);
    server.setupShutdownHandlers();
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

// `main()` is invoked by `preload.js` (or the production entry that
// imports this module). We deliberately don't auto-run on direct
// execution: the loader hook MUST be registered before `index.ts`
// loads, so `preload.js` is always the entry point.

// Export for testing
export { Server } from './services/Server';
export { Application } from './backend/Application';
export { Backend } from './backend/Backend';
export { PersistenceManager } from './backend/PersistenceManager';
export { ConnectionManager } from './backend/ConnectionManager';
export { ConnectionApi } from './mud/api/connection';
export { MixinApi, Mixins } from './mud/api/mixin';
export { default as Avatar } from './mud/platform/agent/Avatar';
export { default as Interactive } from './mud/platform/idea/Interactive';
export type { HasInteractive } from './mud/lib/connection/HasInteractive';
export { HasInteractiveMixin } from './mud/lib/connection/HasInteractive';
export { Agent } from './mud/lib/stuff/Agent';
export { Document } from './mud/lib/persistence/Document';
