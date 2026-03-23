import { registerAs } from '@nestjs/config';
import Stripe from 'stripe';

export const stripeConfig = registerAs('stripe', () => ({
  secretKey: process.env.STRIPE_SECRET_KEY || '',
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
  publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
  priceIdStarter: process.env.STRIPE_PRICE_ID_STARTER || '',
  priceIdTeam: process.env.STRIPE_PRICE_ID_TEAM || '',
}));

export function createStripeClient(): Stripe | null {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    console.warn('STRIPE_SECRET_KEY not set — billing endpoints will return stubs');
    return null;
  }
  return new Stripe(secretKey, {
    apiVersion: '2023-10-16' as Stripe.LatestApiVersion,
    typescript: true,
  });
}
