import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam } from '@nestjs/swagger';
import { SubscriptionsService } from './subscriptions.service';

@ApiTags('subscriptions')
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Post('checkout')
  @ApiOperation({ summary: 'Create a Stripe Checkout session' })
  async createCheckout(
    @Body()
    body: {
      orgId: string;
      email: string;
      priceId: string;
      successUrl: string;
      cancelUrl: string;
    },
  ) {
    let customerId = this.subscriptionsService.getCustomerId(body.orgId);
    if (!customerId) {
      const customer = await this.subscriptionsService.createCustomer(
        body.orgId,
        body.email,
      );
      customerId = customer.id;
    }

    const session = await this.subscriptionsService.createCheckoutSession(
      customerId,
      body.priceId,
      body.successUrl,
      body.cancelUrl,
    );

    return { sessionId: session.id, url: session.url };
  }

  @Get(':orgId')
  @ApiOperation({ summary: 'Get organization subscription status' })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  async getSubscription(@Param('orgId') orgId: string) {
    const subscriptionId = this.subscriptionsService.getSubscriptionId(orgId);
    if (!subscriptionId) {
      return { orgId, status: 'free', subscription: null };
    }

    const subscription =
      await this.subscriptionsService.getSubscription(subscriptionId);
    return {
      orgId,
      status: subscription.status,
      subscription: {
        id: subscription.id,
        currentPeriodEnd: subscription.current_period_end,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        items: subscription.items.data.map((item) => ({
          priceId: item.price.id,
          productId: item.price.product,
        })),
      },
    };
  }

  @Post(':orgId/portal')
  @ApiOperation({ summary: 'Create a Stripe Billing Portal session' })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  async createPortalSession(
    @Param('orgId') orgId: string,
    @Body() body: { returnUrl: string },
  ) {
    const customerId = this.subscriptionsService.getCustomerId(orgId);
    if (!customerId) {
      throw new HttpException(
        'No customer found for this organization',
        HttpStatus.NOT_FOUND,
      );
    }

    const session = await this.subscriptionsService.createBillingPortalSession(
      customerId,
      body.returnUrl,
    );

    return { url: session.url };
  }

  @Patch(':orgId')
  @ApiOperation({ summary: 'Update subscription (upgrade/downgrade)' })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  async updateSubscription(
    @Param('orgId') orgId: string,
    @Body() body: { priceId: string },
  ) {
    const subscriptionId = this.subscriptionsService.getSubscriptionId(orgId);
    if (!subscriptionId) {
      throw new HttpException(
        'No subscription found for this organization',
        HttpStatus.NOT_FOUND,
      );
    }

    const subscription = await this.subscriptionsService.updateSubscription(
      subscriptionId,
      body.priceId,
    );

    return {
      orgId,
      subscriptionId: subscription.id,
      status: subscription.status,
    };
  }

  @Delete(':orgId')
  @ApiOperation({ summary: 'Cancel subscription' })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  async cancelSubscription(@Param('orgId') orgId: string) {
    const subscriptionId = this.subscriptionsService.getSubscriptionId(orgId);
    if (!subscriptionId) {
      throw new HttpException(
        'No subscription found for this organization',
        HttpStatus.NOT_FOUND,
      );
    }

    const subscription =
      await this.subscriptionsService.cancelSubscription(subscriptionId);

    return {
      orgId,
      subscriptionId: subscription.id,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    };
  }
}
