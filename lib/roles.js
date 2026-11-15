// the four account roles, shared by server and browser code
export const ROLES = ['superadmin', 'admin', 'member', 'partner'];
export const ROLE_LABEL = { superadmin: 'Superadmin', admin: 'Admin (engineer)', member: 'Member (sales)', partner: 'Partner' };
export const isAdminRole = r => r === 'admin' || r === 'superadmin';

// roles a signed-in admin may give: superadmin any, admin only member/partner
export const assignableRoles = actorRole => (actorRole === 'superadmin' ? ROLES : actorRole === 'admin' ? ['member', 'partner'] : []);

// may this admin change role, password or delete the target account?
export const canManageAccount = (actor, target) => !!actor && !!target && (actor.role === 'superadmin' || (actor.role === 'admin' && !isAdminRole(target.role)));
