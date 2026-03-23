import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pino from 'pino';
import { loadConfig } from './config';
import { createDefaultRegistry } from './adapters';
import { RouterService } from './router.service';
import { CostTrackerService } from './cost-tracker.service';
import { createCompletionsRouter } from './routes/completions';

const logger = pino({
  name: 'llm-router',
  transport: {
    target: 'pino-pretty',
    options: { colorize: true },
  },
});

const config = loadConfig();
const registry = createDefaultRegistry(config);
const routerService = new RouterService(registry);
const costTracker = new CostTrackerService(config);

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'llm-router' });
});

app.use('/v1/chat/completions', createCompletionsRouter(routerService, costTracker));

const port = config.PORT;
app.listen(port, () => {
  logger.info({ port }, 'LLM Router service started');
});
