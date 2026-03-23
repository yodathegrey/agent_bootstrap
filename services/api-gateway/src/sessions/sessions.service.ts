import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface SessionInfo {
  session_id: string;
  agent_id: string;
  org_id: string;
  user_id: string;
  state: string;
  created_at: string;
}

interface AgentEvent {
  type: 'text_delta' | 'tool_use' | 'tool_result' | 'status_update' | 'done' | 'error';
  text?: string;
  tool_id?: string;
  tool_name?: string;
  input?: Record<string, unknown>;
  output?: string;
  state?: string;
  error?: string;
}

@Injectable()
export class SessionsService {
  private readonly logger = new Logger(SessionsService.name);
  private readonly orchestratorUrl: string;
  private sessions = new Map<string, SessionInfo>();
  private sessionCounter = 0;

  constructor(private readonly config: ConfigService) {
    this.orchestratorUrl =
      this.config.get<string>('ORCHESTRATOR_URL') || 'http://localhost:50051';
  }

  async createSession(
    agentId: string,
    orgId: string,
    userId: string,
    inputs?: Record<string, string>,
  ): Promise<SessionInfo> {
    const sessionId = `ses_${Date.now()}_${++this.sessionCounter}`;

    // TODO: In production, call Orchestrator gRPC CreateSession
    // For now, create session in-memory
    const session: SessionInfo = {
      session_id: sessionId,
      agent_id: agentId,
      org_id: orgId,
      user_id: userId,
      state: 'READY',
      created_at: new Date().toISOString(),
    };

    this.sessions.set(sessionId, session);
    this.logger.log(`Created session ${sessionId} for agent ${agentId}`);

    return session;
  }

  async *sendMessage(
    sessionId: string,
    content: string,
  ): AsyncGenerator<AgentEvent> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      yield { type: 'error', error: `Session ${sessionId} not found` };
      return;
    }

    session.state = 'RUNNING';
    yield { type: 'status_update', state: 'RUNNING' };

    // TODO: In production, call Orchestrator gRPC SendMessage (server-streaming)
    // and relay each AgentEvent. For now, return a stubbed response.
    const words = `I received your message: "${content}". This is a stubbed response from the Nexus orchestrator. In production, this would be streamed from the LLM via the Orchestrator service.`.split(
      ' ',
    );

    for (const word of words) {
      yield { type: 'text_delta', text: word + ' ' };
      // Simulate streaming delay
      await new Promise((r) => setTimeout(r, 50));
    }

    yield {
      type: 'done',
    };

    session.state = 'READY';
    yield { type: 'status_update', state: 'READY' };
  }

  async getSession(sessionId: string): Promise<SessionInfo | null> {
    return this.sessions.get(sessionId) || null;
  }

  async cancelSession(sessionId: string): Promise<SessionInfo | null> {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    session.state = 'CANCELLED';
    this.logger.log(`Cancelled session ${sessionId}`);
    return session;
  }
}
