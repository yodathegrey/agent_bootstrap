import { Injectable } from '@nestjs/common';
import { CreateAgentDto } from './dto/create-agent.dto';
import { UpdateAgentDto } from './dto/update-agent.dto';

@Injectable()
export class AgentsService {
  // TODO: Replace with Firestore integration in Phase 2

  async listAgents(orgId: string) {
    // TODO: Query Firestore for agents belonging to orgId
    return [
      {
        id: 'agent-001',
        org_id: orgId,
        display_name: 'Code Review Agent',
        description: 'Automated code review assistant',
        model_preference: ['claude-sonnet-4-20250514'],
        skills: ['code-review', 'linting'],
        max_turns: 25,
        timeout_seconds: 300,
        memory_policy: 'summary',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];
  }

  async getAgent(id: string) {
    // TODO: Fetch agent from Firestore by ID
    return {
      id,
      org_id: 'org-placeholder',
      display_name: 'Code Review Agent',
      description: 'Automated code review assistant',
      model_preference: ['claude-sonnet-4-20250514'],
      skills: ['code-review', 'linting'],
      max_turns: 25,
      timeout_seconds: 300,
      memory_policy: 'summary',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  async createAgent(dto: CreateAgentDto, orgId: string, userId: string) {
    // TODO: Write new agent document to Firestore
    return {
      id: `agent-${Date.now()}`,
      org_id: orgId,
      created_by: userId,
      ...dto,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  async updateAgent(id: string, dto: UpdateAgentDto) {
    // TODO: Update agent document in Firestore
    return {
      id,
      ...dto,
      updated_at: new Date().toISOString(),
    };
  }

  async deleteAgent(id: string) {
    // TODO: Soft-delete agent document in Firestore
    return { id, deleted: true };
  }
}
