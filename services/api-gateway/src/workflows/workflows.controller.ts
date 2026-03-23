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
  NotFoundException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { RbacGuard } from '../rbac/rbac.guard';
import { Roles } from '../rbac/roles.decorator';
import { WorkflowsService } from './workflows.service';
import { CreateWorkflowDto, RunWorkflowDto } from './dto/create-workflow.dto';

@ApiTags('workflows')
@ApiBearerAuth()
@Controller('workflows')
@UseGuards(FirebaseAuthGuard, RbacGuard)
export class WorkflowsController {
  constructor(private readonly workflowsService: WorkflowsService) {}

  @Get()
  @Roles('viewer')
  @ApiOperation({ summary: 'List all workflows' })
  async listWorkflows(@Req() req: any) {
    const orgId = req.user?.org_id ?? 'default-org';
    return this.workflowsService.listWorkflows(orgId);
  }

  @Get(':id')
  @Roles('viewer')
  @ApiOperation({ summary: 'Get a workflow by ID' })
  async getWorkflow(@Param('id') id: string) {
    const workflow = await this.workflowsService.getWorkflow(id);
    if (!workflow) throw new NotFoundException(`Workflow ${id} not found`);
    return workflow;
  }

  @Post()
  @Roles('developer')
  @ApiOperation({ summary: 'Create a new workflow' })
  async createWorkflow(@Body() dto: CreateWorkflowDto, @Req() req: any) {
    const orgId = req.user?.org_id ?? 'default-org';
    return this.workflowsService.createWorkflow(dto, orgId);
  }

  @Patch(':id')
  @Roles('developer')
  @ApiOperation({ summary: 'Update a workflow' })
  async updateWorkflow(@Param('id') id: string, @Body() dto: Partial<CreateWorkflowDto>) {
    const workflow = await this.workflowsService.updateWorkflow(id, dto);
    if (!workflow) throw new NotFoundException(`Workflow ${id} not found`);
    return workflow;
  }

  @Delete(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Delete a workflow' })
  async deleteWorkflow(@Param('id') id: string) {
    const deleted = await this.workflowsService.deleteWorkflow(id);
    if (!deleted) throw new NotFoundException(`Workflow ${id} not found`);
    return { deleted: true };
  }

  @Post(':id/runs')
  @Roles('operator')
  @ApiOperation({ summary: 'Run a workflow' })
  async runWorkflow(
    @Param('id') id: string,
    @Body() dto: RunWorkflowDto,
    @Req() req: any,
  ) {
    const orgId = req.user?.org_id ?? 'default-org';
    return this.workflowsService.runWorkflow(id, orgId, dto.inputs || {});
  }

  @Get(':id/runs')
  @Roles('viewer')
  @ApiOperation({ summary: 'List workflow runs' })
  async listRuns(@Param('id') id: string) {
    return this.workflowsService.listRuns(id);
  }
}
