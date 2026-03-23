import { Router, Request, Response } from 'express';
import pino from 'pino';
import { RouterService } from '../router.service';
import { CostTrackerService } from '../cost-tracker.service';
import { CanonicalRequest } from '../types';

const logger = pino({ name: 'completions-route' });

export function createCompletionsRouter(
  routerService: RouterService,
  costTracker: CostTrackerService
): Router {
  const router = Router();

  router.post('/', async (req: Request, res: Response) => {
    try {
      const body = req.body as Partial<CanonicalRequest>;

      if (!body.messages || !Array.isArray(body.messages)) {
        res.status(400).json({ error: 'messages is required and must be an array' });
        return;
      }

      if (!body.model || typeof body.model !== 'string') {
        res.status(400).json({ error: 'model is required and must be a string' });
        return;
      }

      const request: CanonicalRequest = {
        messages: body.messages,
        model: body.model,
        max_tokens: body.max_tokens ?? 4096,
        temperature: body.temperature ?? 0.7,
        tools: body.tools,
      };

      res.setHeader('Content-Type', 'application/x-ndjson');
      res.setHeader('Transfer-Encoding', 'chunked');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const orgId = req.headers['x-org-id'] as string | undefined;

      for await (const chunk of routerService.route(request)) {
        res.write(JSON.stringify(chunk) + '\n');

        if (chunk.type === 'done' && chunk.usage) {
          costTracker
            .trackUsage(request.model, chunk.usage.input_tokens, chunk.usage.output_tokens, orgId)
            .catch((err) => {
              logger.error({ error: err }, 'Failed to track usage');
            });
        }
      }

      res.end();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error({ error: message }, 'Completions handler error');

      if (!res.headersSent) {
        res.status(500).json({ error: 'Internal server error' });
      } else {
        res.write(JSON.stringify({ type: 'error', error: message }) + '\n');
        res.end();
      }
    }
  });

  return router;
}
