import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { RbacGuard } from '../rbac/rbac.guard';
import { Roles } from '../rbac/roles.decorator';
import { AgentsService } from './agents.service';
import { CreateAgentDto } from './dto/create-agent.dto';
import { UpdateAgentDto } from './dto/update-agent.dto';

@ApiTags('agents')
@ApiBearerAuth()
@Controller('agents')
@UseGuards(FirebaseAuthGuard, RbacGuard)
export class AgentsController {
  constructor(private readonly agentsService: AgentsService) {}

  @Get()
  @Roles('viewer')
  @ApiOperation({ summary: 'List all agents for the organization' })
  async listAgents(@Req() req: any) {
    const orgId = req.user?.org_id ?? 'default-org';
    return this.agentsService.listAgents(orgId);
  }

  @Get(':id')
  @Roles('viewer')
  @ApiOperation({ summary: 'Get an agent by ID' })
  async getAgent(@Param('id') id: string) {
    return this.agentsService.getAgent(id);
  }

  @Post()
  @Roles('developer')
  @ApiOperation({ summary: 'Create a new agent' })
  async createAgent(@Body() dto: CreateAgentDto, @Req() req: any) {
    const orgId = req.user?.org_id ?? 'default-org';
    const userId = req.user?.uid ?? 'unknown';
    return this.agentsService.createAgent(dto, orgId, userId);
  }

  @Patch(':id')
  @Roles('developer')
  @ApiOperation({ summary: 'Update an existing agent' })
  async updateAgent(@Param('id') id: string, @Body() dto: UpdateAgentDto) {
    return this.agentsService.updateAgent(id, dto);
  }

  @Delete(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Delete an agent' })
  async deleteAgent(@Param('id') id: string) {
    return this.agentsService.deleteAgent(id);
  }
}
