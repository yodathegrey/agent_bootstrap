export type RBACRole = 'viewer' | 'operator' | 'developer' | 'admin' | 'owner';

export interface UserProfile {
  user_id: string;
  email: string;
  display_name: string;
  org_id: string;
  role: RBACRole;
  created_at: string;
  last_login: string;
}

export interface OrgConfig {
  org_id: string;
  name: string;
  created_at: string;
  settings: {
    default_model: string;
    allowed_providers: string[];
    data_classification_policy: string;
  };
}
