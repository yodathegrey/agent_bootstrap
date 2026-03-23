import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  Res,
  UseGuards,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { RbacGuard } from '../rbac/rbac.guard';
import { Roles } from '../rbac/roles.decorator';
import { SessionsService } from './sessions.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { SendMessageDto } from './dto/send-message.dto';

@ApiTags('sessions')
@ApiBearerAuth()
@Controller()
@UseGuards(FirebaseAuthGuard, RbacGuard)
export class SessionsController {
  private readonly logger = new Logger(SessionsController.name);

  constructor(private readonly sessionsService: SessionsService) {}

  @Post('agents/:agentId/sessions')
  @Roles('operator')
  @ApiOperation({ summary: 'Create a new agent session' })
  async createSession(
    @Param('agentId') agentId: string,
    @Body() dto: CreateSessionDto,
    @Req() req: any,
  ) {
    const orgId = req.user?.org_id ?? 'default-org';
    const userId = req.user?.uid ?? 'unknown';
    return this.sessionsService.createSession(agentId, orgId, userId, dto.inputs);
  }

  @Post('sessions/:id/messages')
  @Roles('operator')
  @ApiOperation({ summary: 'Send a message to an agent session (SSE streaming response)' })
  async sendMessage(
    @Param('id') sessionId: string,
    @Body() dto: SendMessageDto,
    @Res() res: Response,
  ) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    try {
      for await (const event of this.sessionsService.sendMessage(
        sessionId,
        dto.content,
      )) {
        res.write(`data: ${JSON.stringify(event)}\n\n`);
      }
    } catch (err) {
      this.logger.error(`Error streaming session ${sessionId}:`, err);
      res.write(`data: ${JSON.stringify({ type: 'error', error: 'Internal server error' })}\n\n`);
    }

    res.end();
  }

  @Get('sessions/:id/events')
  @Roles('operator')
  @ApiOperation({ summary: 'Subscribe to agent session events (SSE)' })
  async subscribeEvents(
    @Param('id') sessionId: string,
    @Res() res: Response,
  ) {
    const session = await this.sessionsService.getSession(sessionId);
    if (!session) {
      throw new NotFoundException(`Session ${sessionId} not found`);
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Send current state
    res.write(
      `data: ${JSON.stringify({ type: 'status_update', state: session.state })}\n\n`,
    );

    // TODO: In production, subscribe to Pub/Sub agent-events for this session
    // and relay them as SSE events. For now, keep connection open.
    const keepAlive = setInterval(() => {
      res.write(': keepalive\n\n');
    }, 15000);

    res.on('close', () => {
      clearInterval(keepAlive);
    });
  }

  @Get('sessions/:id')
  @Roles('viewer')
  @ApiOperation({ summary: 'Get session status' })
  async getSession(@Param('id') sessionId: string) {
    const session = await this.sessionsService.getSession(sessionId);
    if (!session) {
      throw new NotFoundException(`Session ${sessionId} not found`);
    }
    return session;
  }

  @Delete('sessions/:id')
  @Roles('operator')
  @ApiOperation({ summary: 'Cancel an agent session' })
  async cancelSession(@Param('id') sessionId: string) {
    const session = await this.sessionsService.cancelSession(sessionId);
    if (!session) {
      throw new NotFoundException(`Session ${sessionId} not found`);
    }
    return session;
  }
}
