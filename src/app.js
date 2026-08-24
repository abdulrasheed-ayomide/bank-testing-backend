import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import mongoSanitize from 'express-mongo-sanitize';

import env from './config/env.js';
import routes from './routes/index.js';
import notFound from './middleware/notFound.js';
import errorHandler from './middleware/errorHandler.js';
import { apiLimiter } from './middleware/rateLimiter.js';

const app = express();

// Behind Render's proxy in production, needed for correct client IPs (rate limiting).
app.set('trust proxy', 1);

app.use(helmet());
app.use(
  cors({
    origin: env.clientUrl,
    credentials: true,
  })
);
app.use(compression());
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());
app.use((req, _res, next) => {
  for (const key of ['body', 'params', 'headers']) {
    if (req[key]) req[key] = mongoSanitize.sanitize(req[key]);
  }

  if (req.query) {
    const sanitizedQuery = mongoSanitize.sanitize(req.query);
    for (const key of Object.keys(req.query)) delete req.query[key];
    Object.assign(req.query, sanitizedQuery);
  }

  next();
});

if (env.nodeEnv !== 'test') {
  app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'));
}

app.use(`/api/${env.apiVersion}`, apiLimiter, routes);

app.get('/health', (_req, res) => {
  res.json({ success: true, data: { status: 'ok', env: env.nodeEnv } });
});

app.use(notFound);
app.use(errorHandler);

export default app;
