import {
  Controller,
  Post,
  Req,
  Headers,
  HttpException,
  HttpStatus,
  Logger,
  RawBodyRequest,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiExcludeEndpoint } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import Stripe from 'stripe';
import { createStripeClient } from '../config/stripe.config';
import { WebhooksService } from './webhooks.service';

@ApiTags('webhooks')
@Controller('stripe')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);
  private stripe: Stripe | null = null;
  private readonly processedEvents = new Set<string>();

  constructor(
    private readonly configService: ConfigService,
    private readonly webhooksService: WebhooksService,
  ) {
    this.stripe = createStripeClient();
  }

  @Post('webhooks')
  @ApiExcludeEndpoint()
  @ApiOperation({ summary: 'Handle Stripe webhook events' })
  async handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    const webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET');
    if (!webhookSecret) {
      throw new HttpException(
        'Webhook secret not configured',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    let event: Stripe.Event;
    try {
      const rawBody = req.rawBody;
      if (!rawBody) {
        throw new Error('Raw body not available');
      }
      event = this.stripe!.webhooks.constructEvent(
        rawBody,
        signature,
        webhookSecret,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      this.logger.error(`Webhook signature verification failed: ${message}`);
      throw new HttpException(
        `Webhook signature verification failed: ${message}`,
        HttpStatus.BAD_REQUEST,
      );
    }

    // Idempotency check
    if (this.processedEvents.has(event.id)) {
      this.logger.log(`Event ${event.id} already processed, skipping`);
      return { received: true, duplicate: true };
    }

    this.logger.log(`Processing webhook event: ${event.type} (${event.id})`);

    try {
      await this.webhooksService.handleEvent(event);
      this.processedEvents.add(event.id);

      // Prevent memory leak: cap the set size
      if (this.processedEvents.size > 10000) {
        const iterator = this.processedEvents.values();
        const first = iterator.next().value;
        if (first) {
          this.processedEvents.delete(first);
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      this.logger.error(`Error processing event ${event.id}: ${message}`);
      throw new HttpException(
        'Webhook processing failed',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    return { received: true };
  }
}
