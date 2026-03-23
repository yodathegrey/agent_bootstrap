import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam } from '@nestjs/swagger';
import { UsageService } from './usage.service';

@ApiTags('usage')
@Controller('usage')
export class UsageController {
  constructor(private readonly usageService: UsageService) {}

  @Get(':orgId')
  @ApiOperation({ summary: 'Get current usage for an organization' })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  getUsage(@Param('orgId') orgId: string) {
    const usage = this.usageService.getUsage(orgId);
    return {
      orgId,
      usage: {
        agentRuns: usage.agentRuns,
        llmTokens: usage.llmTokens,
        periodStart: usage.periodStart.toISOString(),
      },
    };
  }

  @Get(':orgId/alerts')
  @ApiOperation({ summary: 'Get usage threshold alerts for an organization' })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  getAlerts(@Param('orgId') orgId: string) {
    const alerts = this.usageService.checkThresholds(orgId);
    return {
      orgId,
      alerts,
    };
  }
}
