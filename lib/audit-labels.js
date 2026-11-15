// how audit actions read in Admin > Audit trail (translated via lib/i18n.js)
const ACTION_KEYS = [
  'partner.approve', 'partner.reject', 'partner.revoke',
  'user.create', 'user.role', 'user.password', 'user.delete',
  'content.create', 'content.update', 'content.delete', 'content.import',
  'widget.upload', 'widget.replace', 'widget.update', 'widget.properties',
  'widget.hide', 'widget.show', 'widget.delete', 'widget.reset',
  'profile.update', 'profile.avatar', 'profile.avatar_remove', 'profile.password', 'profile.email',
];
const ENTITY_KEYS = ['user', 'news', 'packages', 'updates', 'widget', 'profile'];

export function actionLabel(t, action) {
  return ACTION_KEYS.includes(action) ? t('aa.' + action) : action;
}
export function entityLabel(t, entity) {
  return ENTITY_KEYS.includes(entity) ? t('ae.' + entity) : entity;
}
