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

app.use('/api/agent-chat', agentChatRouter);
app.use('/api/calculate-riasec', calculateRiasecRouter);
app.use('/api/recommend-paths', recommendPathsRouter);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'PathFinder API is running' });
});

app.listen(PORT, () => {
  console.log(`🚀 PathFinder API server running on http://localhost:${PORT}`);
  console.log(`📡 Health check available at http://localhost:${PORT}/health`);
});
