import pino from 'pino';
import { AdapterRegistry } from './adapters';
import { CanonicalRequest, StreamChunk } from './types';

const logger = pino({ name: 'router-service' });

export class RouterService {
  constructor(private registry: AdapterRegistry) {}

  async *route(request: CanonicalRequest): AsyncIterable<StreamChunk> {
    try {
      const adapter = this.registry.resolve(request.model);
      logger.info({ model: request.model, provider: adapter.provider }, 'Routing request');

      for await (const chunk of adapter.sendMessage(request)) {
        yield chunk;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error({ error: message, model: request.model }, 'Router error');
      yield {
        type: 'error',
        error: message,
      };
    }
  }
}
