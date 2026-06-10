/**
 * Server - Main server orchestrator
 *
 * Responsibilities:
 * - Coordinate all services (Express, WebSocket, Auth)
 * - Initialize Backend and Application
 * - Setup middleware
 * - Error handling
 * - Graceful shutdown
 */

import express, { type Express, type RequestHandler } from 'express';
import type { Server as HttpServer } from 'http';
import fs from 'node:fs';
import path from 'node:path';
import session from 'express-session';
import passport from 'passport';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { Backend } from '../backend/Backend';
import { Application } from '../backend/Application';
import { PassportConfig } from './auth/PassportConfig';
import { AuthRoutes } from './auth/AuthRoutes';
import { TestAuthRoutes } from './auth/TestAuthRoutes';
import { WebSocketService } from './websocket/WebSocketService';
import { AppBootstrap } from '../backend/AppBootstrap';
import { ConnectionApi } from '../mud/api/connection';
import { StuffApi } from '../mud/api/stuff';

/**
 * Server - Main application server.
 */
export class Server {
  private app: Express;
  private httpServer: HttpServer | null = null;
  private backend: Backend;
  private application: Application;
  private webSocketService: WebSocketService;
  private port: number;
  // Set in setupMiddleware(), consumed in start() for the WS upgrade.
  private sessionMiddleware!: RequestHandler;

  /**
   * Constructor.
   *
   * @param port - Server port (from env or default)
   */
  constructor(port: number = 2010) {
    this.port = port;
    this.app = express();

    // Initialize singletons
    this.backend = Backend.get();
    this.application = Application.get();

    // Initialize services
    this.webSocketService = new WebSocketService(this.backend);

    // Cross-link Backend and Application
    this.backend.initialize(this.application);
    this.application.initialize(this.backend);
  }

  /**
   * Setup all middleware.
   */
  private setupMiddleware(): void {
    // CORS
    this.app.use(
      cors({
        origin: process.env.CLIENT_URL || 'http://localhost:5173',
        credentials: true,
      })
    );

    // Body parsing
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));

    // Cookie parsing
    this.app.use(cookieParser());

    // Session middleware
    const sessionSecret = process.env.SESSION_SECRET;
    if (!sessionSecret) {
      throw new Error('Server: SESSION_SECRET environment variable not set');
    }

    const sessionMiddleware = session({
      secret: sessionSecret,
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
      },
    });

    this.app.use(sessionMiddleware);

    // Passport initialization
    this.app.use(passport.initialize());
    this.app.use(passport.session());

    // Configure Passport
    const passportConfig = new PassportConfig(this.backend);
    passportConfig.configure();

    // Setup authentication routes
    AuthRoutes.setup(this.app);

    // TEST-ONLY auth bypass for E2E. Mounted only in test mode, and
    // never alongside a production build. Production never sets
    // AUTH_MODE, so this branch is dead there.
    if (process.env.AUTH_MODE === 'test') {
      if (process.env.NODE_ENV === 'production') {
        throw new Error(
          'Server: refusing to boot — AUTH_MODE=test with NODE_ENV=production'
        );
      }
      console.warn(
        'Server: ⚠  AUTH_MODE=test — test-login auth bypass is ENABLED.'
      );
      TestAuthRoutes.setup(this.app, this.backend);
    }

    console.info('Server: Middleware configured');

    // Store session middleware for the WebSocket upgrade (see start()).
    this.sessionMiddleware = sessionMiddleware;
  }

  /**
   * Setup basic routes.
   */
  private setupRoutes(): void {
    // Liveness probe — always available, independent of whether the
    // client bundle is being served. Used by the container health check
    // and the reverse proxy.
    this.app.get('/healthz', (req, res) => {
      res.json({ status: 'ok', uptime: process.uptime() });
    });

    // Server stats (for development)
    this.app.get('/stats', (req, res) => {
      res.json({
        connections: ConnectionApi.getConnectionCount(),
        objects: StuffApi.getObjectCount(),
        uptime: process.uptime(),
      });
    });

    // In production the server serves the built client from its own
    // origin — set CLIENT_DIST to the client's `dist/`. When it's unset
    // (dev, tests, e2e) the client is served separately by Vite and `/`
    // returns a plain status payload (the e2e harness gates on it).
    const clientDist = process.env.CLIENT_DIST;
    if (clientDist && fs.existsSync(clientDist)) {
      this.app.use(express.static(clientDist));
      // SPA fallback: any unmatched GET returns index.html so client-
      // side routing survives deep links and reloads. Auth + API routes
      // are registered earlier and match first.
      this.app.get('*', (_req, res) => {
        res.sendFile(path.join(clientDist, 'index.html'));
      });
      console.info(`Server: serving client bundle from ${clientDist}`);
    } else {
      this.app.get('/', (req, res) => {
        res.json({
          message: 'Saxonberg 2.0 Server',
          status: 'running',
          version: '0.1.0',
          timestamp: new Date().toISOString(),
        });
      });
    }

    console.info('Server: Routes configured');
  }

  /**
   * Start the server.
   */
  public async start(): Promise<void> {
    try {
      // Setup middleware and routes
      this.setupMiddleware();
      this.setupRoutes();

      // Create HTTP server
      this.httpServer = this.app.listen(this.port, () => {
        console.info(`Server: HTTP server listening on port ${this.port}`);
        console.info(`Server: http://localhost:${this.port}`);
      });

      // Initialize WebSocket server
      this.webSocketService.initialize(this.httpServer, this.sessionMiddleware);

      console.info('Server: All services started successfully');
    } catch (error) {
      console.error('Server: Failed to start:', error);
      throw error;
    }
  }

  /**
   * Stop the server gracefully.
   */
  public async stop(): Promise<void> {
    console.info('Server: Shutting down gracefully...');

    try {
      // Backend-layer graceful teardown (persists world-clock state,
      // etc.) before transport shuts down. Engine concerns live behind
      // AppBootstrap, not in this transport class.
      await AppBootstrap.shutdown();

      // Close WebSocket connections
      this.backend.closeAllConnections();
      this.webSocketService.close();

      // Close HTTP server
      if (this.httpServer) {
        await new Promise<void>((resolve, reject) => {
          this.httpServer!.close((err) => {
            if (err) reject(err);
            else resolve();
          });
        });
      }

      console.info('Server: Shutdown complete');
    } catch (error) {
      console.error('Server: Error during shutdown:', error);
      throw error;
    }
  }

  /**
   * Setup graceful shutdown handlers.
   */
  public setupShutdownHandlers(): void {
    // Handle SIGTERM (e.g., from Kubernetes, Docker)
    process.on('SIGTERM', async () => {
      console.info('Server: SIGTERM received');
      await this.stop();
      process.exit(0);
    });

    // Handle SIGINT (Ctrl+C)
    process.on('SIGINT', async () => {
      console.info('Server: SIGINT received');
      await this.stop();
      process.exit(0);
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      console.error('Server: Uncaught exception:', error);
      process.exit(1);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      console.error('Server: Unhandled rejection at:', promise, 'reason:', reason);
      process.exit(1);
    });

    console.info('Server: Shutdown handlers configured');
  }

  /**
   * Get the Express app (for testing).
   */
  public getApp(): Express {
    return this.app;
  }
}
