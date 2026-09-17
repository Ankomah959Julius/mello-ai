import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import config from './config/environment.js';
import errorHandler from './middleware/errorHandler.js';
import webhookRoutes from './routes/webhookRoutes.js';
import chatRoutes from './routes/chatRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(
  express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  })
);

app.use(express.static(path.join(__dirname, '../public')));

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

app.use('/webhook', webhookRoutes);
app.use('/api/chat', chatRoutes);

app.use(errorHandler);

if (process.env.NODE_ENV !== 'test') {
  app.listen(config.port, () => {
    console.log(`Server listening on port ${config.port}`);
  });
}

export default app;
