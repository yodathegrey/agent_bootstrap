export type AuditAction =
  | 'user.login'
  | 'user.logout'
  | 'role.change'
  | 'agent.create'
  | 'agent.update'
  | 'agent.delete'
  | 'agent.run.start'
  | 'agent.run.complete'
  | 'skill.install'
  | 'skill.uninstall'
  | 'settings.update';

export interface AuditLogEntry {
  entry_id: string;
  org_id: string;
  actor_id: string;
  action: AuditAction;
  resource_type: string;
  resource_id: string;
  details: Record<string, unknown>;
  timestamp: string;
  previous_hash: string;
  hash: string;
}
