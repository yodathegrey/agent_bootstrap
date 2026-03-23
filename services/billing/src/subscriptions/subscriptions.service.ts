import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { createStripeClient } from '../config/stripe.config';

@Injectable()
export class SubscriptionsService implements OnModuleInit {
  private readonly logger = new Logger(SubscriptionsService.name);
  private stripe: Stripe | null = null;

  // In-memory store: orgId -> Stripe customer ID
  private readonly customerMap = new Map<string, string>();
  // In-memory store: orgId -> subscription ID
  private readonly subscriptionMap = new Map<string, string>();

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    this.stripe = createStripeClient();
  }

  private requireStripe(): Stripe {
    if (!this.stripe) throw new Error('Stripe not configured');
    return this.stripe;
  }

  async createCustomer(orgId: string, email: string): Promise<Stripe.Customer> {
    this.logger.log(`Creating Stripe customer for org ${orgId}`);
    const customer = await this.requireStripe().customers.create({
      email,
      metadata: { orgId },
    });
    this.customerMap.set(orgId, customer.id);
    return customer;
  }

  async createSubscription(
    customerId: string,
    priceId: string,
  ): Promise<Stripe.Subscription> {
    this.logger.log(`Creating subscription for customer ${customerId}`);
    const subscription = await this.requireStripe().subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      expand: ['latest_invoice.payment_intent'],
    });
    return subscription;
  }

  async getSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    return this.requireStripe().subscriptions.retrieve(subscriptionId);
  }

  async updateSubscription(
    subscriptionId: string,
    priceId: string,
  ): Promise<Stripe.Subscription> {
    this.logger.log(`Updating subscription ${subscriptionId} to price ${priceId}`);
    const subscription = await this.requireStripe().subscriptions.retrieve(subscriptionId);
    return this.requireStripe().subscriptions.update(subscriptionId, {
      items: [
        {
          id: subscription.items.data[0].id,
          price: priceId,
        },
      ],
      proration_behavior: 'create_prorations',
    });
  }

  async cancelSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    this.logger.log(`Cancelling subscription ${subscriptionId}`);
    return this.requireStripe().subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });
  }

  async createCheckoutSession(
    customerId: string,
    priceId: string,
    successUrl: string,
    cancelUrl: string,
  ): Promise<Stripe.Checkout.Session> {
    this.logger.log(`Creating checkout session for customer ${customerId}`);
    return this.requireStripe().checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
    });
  }

  async createBillingPortalSession(
    customerId: string,
    returnUrl: string,
  ): Promise<Stripe.BillingPortal.Session> {
    this.logger.log(`Creating billing portal session for customer ${customerId}`);
    return this.requireStripe().billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });
  }

  getCustomerId(orgId: string): string | undefined {
    return this.customerMap.get(orgId);
  }

  setCustomerId(orgId: string, customerId: string): void {
    this.customerMap.set(orgId, customerId);
  }

  getSubscriptionId(orgId: string): string | undefined {
    return this.subscriptionMap.get(orgId);
  }

  setSubscriptionId(orgId: string, subscriptionId: string): void {
    this.subscriptionMap.set(orgId, subscriptionId);
  }
}
