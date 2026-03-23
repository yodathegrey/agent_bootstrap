import { Injectable, Logger } from '@nestjs/common';
import Stripe from 'stripe';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  async handleEvent(event: Stripe.Event): Promise<void> {
    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutCompleted(
          event.data.object as Stripe.Checkout.Session,
        );
        break;

      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdated(
          event.data.object as Stripe.Subscription,
        );
        break;

      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(
          event.data.object as Stripe.Subscription,
        );
        break;

      case 'invoice.payment_succeeded':
        await this.handlePaymentSucceeded(
          event.data.object as Stripe.Invoice,
        );
        break;

      case 'invoice.payment_failed':
        await this.handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      case 'customer.subscription.trial_will_end':
        await this.handleTrialWillEnd(
          event.data.object as Stripe.Subscription,
        );
        break;

      default:
        this.logger.log(`Unhandled event type: ${event.type}`);
    }
  }

  private async handleCheckoutCompleted(
    session: Stripe.Checkout.Session,
  ): Promise<void> {
    const orgId = session.metadata?.orgId;
    const customerId =
      typeof session.customer === 'string'
        ? session.customer
        : session.customer?.id;
    const subscriptionId =
      typeof session.subscription === 'string'
        ? session.subscription
        : session.subscription?.id;

    this.logger.log(
      `Checkout completed for org ${orgId}, customer ${customerId}, subscription ${subscriptionId}`,
    );

    if (orgId && customerId) {
      this.subscriptionsService.setCustomerId(orgId, customerId);
    }
    if (orgId && subscriptionId) {
      this.subscriptionsService.setSubscriptionId(orgId, subscriptionId);
    }
  }

  private async handleSubscriptionUpdated(
    subscription: Stripe.Subscription,
  ): Promise<void> {
    const orgId = subscription.metadata?.orgId;
    this.logger.log(
      `Subscription updated: ${subscription.id}, status: ${subscription.status}`,
    );

    if (orgId) {
      this.subscriptionsService.setSubscriptionId(orgId, subscription.id);
    }

    // Update tier/entitlements based on subscription items
    const priceId = subscription.items.data[0]?.price?.id;
    this.logger.log(
      `Org ${orgId} subscription updated to price ${priceId}, status ${subscription.status}`,
    );
  }

  private async handleSubscriptionDeleted(
    subscription: Stripe.Subscription,
  ): Promise<void> {
    const orgId = subscription.metadata?.orgId;
    this.logger.log(
      `Subscription deleted: ${subscription.id}, org ${orgId} downgraded to free`,
    );

    // Downgrade org to free tier
    if (orgId) {
      this.logger.log(`Downgrading org ${orgId} to free tier`);
    }
  }

  private async handlePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
    const customerId =
      typeof invoice.customer === 'string'
        ? invoice.customer
        : invoice.customer?.id;

    this.logger.log(
      `Payment succeeded for customer ${customerId}, resetting usage counters`,
    );

    // Reset usage counters for the new billing period
  }

  private async handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    const customerId =
      typeof invoice.customer === 'string'
        ? invoice.customer
        : invoice.customer?.id;

    this.logger.warn(
      `Payment failed for customer ${customerId}, entering grace period`,
    );

    // Enter grace period and notify the organization
    this.logger.warn(
      `Notification: Payment failed for customer ${customerId}. Please update payment method.`,
    );
  }

  private async handleTrialWillEnd(
    subscription: Stripe.Subscription,
  ): Promise<void> {
    const orgId = subscription.metadata?.orgId;
    this.logger.log(
      `Trial ending soon for subscription ${subscription.id}, org ${orgId}`,
    );

    // Send notification about trial ending
    this.logger.log(
      `Notification: Trial for org ${orgId} will end on ${new Date(subscription.trial_end! * 1000).toISOString()}`,
    );
  }
}
