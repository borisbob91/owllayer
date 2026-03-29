export type Role = 'OWNER' | 'ADMIN' | 'DEVELOPER' | 'VIEWER';

/**
 * Hiérarchie des rôles (du plus élevé au plus bas).
 */
const ROLE_HIERARCHY: Record<Role, number> = {
  OWNER: 40,
  ADMIN: 30,
  DEVELOPER: 20,
  VIEWER: 10,
};

export type Permission =
  | 'project.read'
  | 'project.write'
  | 'project.delete'
  | 'agent.read'
  | 'agent.write'
  | 'agent.delete'
  | 'line.read'
  | 'line.write'
  | 'line.delete'
  | 'session.connect'
  | 'session.read'
  | 'analytics.read'
  | 'billing.read'
  | 'billing.write'
  | 'member.read'
  | 'member.invite'
  | 'member.remove'
  | 'apikey.read'
  | 'apikey.write'
  | 'store.read'
  | 'store.connect'
  | 'store.disconnect'
  | 'audit.read';

const PERMISSION_MIN_ROLE: Record<Permission, Role> = {
  // Lecture — tout le monde
  'project.read': 'VIEWER',
  'agent.read': 'VIEWER',
  'line.read': 'VIEWER',
  'session.read': 'VIEWER',
  'analytics.read': 'VIEWER',
  'store.read': 'VIEWER',

  // Écriture — Developer
  'session.connect': 'DEVELOPER',
  'agent.write': 'DEVELOPER',
  'line.write': 'DEVELOPER',
  'apikey.read': 'DEVELOPER',

  // Admin
  'project.write': 'ADMIN',
  'member.read': 'ADMIN',
  'member.invite': 'ADMIN',
  'member.remove': 'ADMIN',
  'billing.read': 'ADMIN',
  'apikey.write': 'ADMIN',
  'store.connect': 'ADMIN',
  'store.disconnect': 'ADMIN',
  'audit.read': 'ADMIN',

  // Owner only
  'project.delete': 'OWNER',
  'agent.delete': 'OWNER',
  'line.delete': 'OWNER',
  'billing.write': 'OWNER',
};

export function hasPermission(userRole: Role, permission: Permission): boolean {
  const minRole = PERMISSION_MIN_ROLE[permission];
  if (!minRole) return false;
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[minRole];
}

export function requirePermission(userRole: Role, permission: Permission): void {
  if (!hasPermission(userRole, permission)) {
    const err = new Error(`Forbidden: requires permission "${permission}"`);
    (err as NodeJS.ErrnoException & { statusCode: number }).statusCode = 403;
    throw err;
  }
}
