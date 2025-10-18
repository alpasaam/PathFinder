import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import agentChatRouter from './routes/agent-chat';
import calculateRiasecRouter from './routes/calculate-riasec';
import recommendPathsRouter from './routes/recommend-paths';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({
    message: 'PathFinder API Server',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      agentChat: '/api/agent-chat',
      calculateRiasec: '/api/calculate-riasec',
      recommendPaths: '/api/recommend-paths'
    }
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'PathFinder API is running' });
});

app.use('/api/agent-chat', agentChatRouter);
app.use('/api/calculate-riasec', calculateRiasecRouter);
app.use('/api/recommend-paths', recommendPathsRouter);

app.listen(PORT, () => {
  console.log(`🚀 PathFinder API server running on http://localhost:${PORT}`);
  console.log(`📡 Health check available at http://localhost:${PORT}/health`);
  console.log(`🌐 Frontend should access: http://localhost:5173`);
});
