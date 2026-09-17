import express from 'express';
import config from './config/environment.js';
import errorHandler from './middleware/errorHandler.js';
import webhookRoutes from './routes/webhookRoutes.js';

const app = express();

app.use(
  express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  })
);

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

app.use('/webhook', webhookRoutes);

app.use(errorHandler);

if (process.env.NODE_ENV !== 'test') {
  app.listen(config.port, () => {
    console.log(`Server listening on port ${config.port}`);
  });
}

export default app;
