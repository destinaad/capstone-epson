export function normalizeRole(role) {
  return String(role || '')
    .trim()
    .toLowerCase();
}

export function isManager(role) {
  return normalizeRole(role) === 'manager';
}

export function isSupervisor(role) {
  return normalizeRole(role) === 'supervisor';
}

export function isOperator(role) {
  return normalizeRole(role) === 'operator';
}

export function canEditInspection(user, row) {
  if (!user || !row) return false;
  if (isSupervisor(user.role)) return true;
  if (isOperator(user.role) && row.operator_id === user.id) return true;
  return false;
}

export function canValidateNg(user) {
  return isSupervisor(user?.role);
}

export function canLogInspection(user) {
  return isOperator(user?.role) || isSupervisor(user?.role);
}
