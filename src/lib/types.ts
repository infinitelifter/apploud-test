export type AccessRef = {
  path: string;
  accessLevel: string;
};

export type AuditUser = {
  id: number;
  name: string;
  username: string;
  groups: AccessRef[];
  projects: AccessRef[];
};

export type AuditResult = {
  groupId: number;
  users: AuditUser[];
  totalUsers: number;
  stats: { groups: number; projects: number };
};
