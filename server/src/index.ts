import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { SimulationEngine } from './simulation/SimulationEngine';
import { createSimulationRouter } from './routes/simulationRoutes';
import { setupSimulationSockets } from './sockets/simulationSockets';

dotenv.config();

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 4000;
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
  : ['http://localhost:5173', 'http://127.0.0.1:5173'];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, server-to-server)
      if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
        return callback(null, true);
      }
      return callback(new Error('CORS policy: Not allowed by Access-Control-Allow-Origin'));
    },
    credentials: true,
  })
);

app.use(express.json());

// Initialize deterministic simulation engine
const engine = new SimulationEngine(Number(process.env.SIMULATION_TICK_MS) || 1000);

// Set up Socket.IO
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

setupSimulationSockets(io, engine);

// Mount API router
app.use('/api', createSimulationRouter(engine));

// Root welcome endpoint
app.get('/', (req, res) => {
  res.json({
    project: 'RegionGuard',
    subtitle: 'Multi-Region Active-Passive Failover Controller (PS No. 23)',
    status: 'ONLINE',
    documentation: '/api/simulation/state',
    healthCheck: '/api/health',
  });
});

if (process.env.NODE_ENV !== 'test') {
  server.listen(PORT, () => {
    console.log(`[RegionGuard Server] Running on http://localhost:${PORT}`);
    console.log(`[RegionGuard Server] Health check available at http://localhost:${PORT}/api/health`);
  });
}

export { app, server, engine };
