import http from 'http';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { env } from './config/env.js';
import { SocketManager } from './sockets/socket.manager.js';
import apiRoutes from './routes/index.js';
import { errorHandler } from './middlewares/error.middleware.js';
import { prisma } from './lib/prisma.js';

const app = express();
const server = http.createServer(app);

// 1. Security Headers
app.use(
  helmet({
    contentSecurityPolicy: env.NODE_ENV === 'production' ? undefined : false,
    crossOriginEmbedderPolicy: false
  })
);

// 2. CORS Configuration
app.use(
  cors({
    origin: [env.FRONTEND_URL, 'http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);

// 3. Body & Cookie Parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser(env.COOKIE_SECRET));

// 4. Rate Limiting for Auth
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // 30 login attempts per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts, please try again later' }
});

app.use('/api/auth/login', authLimiter);

// 5. Mount API Routes
app.use('/api', apiRoutes);

// 6. Global Error Handling
app.use(errorHandler);

// 7. Initialize Real-Time WebSocket Server
SocketManager.initialize(server);

// 8. Server Listen
server.listen(env.PORT, env.HOST, () => {
  console.log(`🚀 NexCourt Server running on http://${env.HOST}:${env.PORT}`);
  console.log(`📡 WebSocket server listening with CORS origin: ${env.FRONTEND_URL}`);
  console.log(`⚡ Environment: ${env.NODE_ENV}`);
});

// 9. Graceful Shutdown (Cloud SaaS requirement)
const gracefulShutdown = async (signal: string) => {
  console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);
  server.close(async () => {
    console.log('🔌 HTTP & WebSocket servers closed.');
    await prisma.$disconnect();
    console.log('📦 Database connections terminated.');
    process.exit(0);
  });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
